import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';

const prisma = new PrismaClient();

async function getUserId(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;
    try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.userId;
    } catch {
        return null;
    }
}

// Function to count bookings for a specific date and room type
async function countBookingsForDate(roomTypeId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Count the total number of rooms booked for this date
    const bookings = await prisma.hotelBooking.findMany({
        where: {
            roomTypeId: roomTypeId,
            status: { in: ['confirmed', 'pending'] },
            OR: [
                {
                    checkInDate: { lte: endOfDay },
                    checkOutDate: { gte: startOfDay }
                }
            ]
        },
        select: {
            numberOfRooms: true
        }
    });
    
    // Sum up the total number of rooms booked
    const totalRoomsBooked = bookings.reduce((sum, booking) => sum + (booking.numberOfRooms || 1), 0);
    return totalRoomsBooked;
}

// Get affected bookings that would need to be cancelled
async function getAffectedBookings(roomTypeId, date, newAvailability) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log(`Looking for bookings for room type ${roomTypeId} on date ${date.toISOString()} (${startOfDay.toISOString()} to ${endOfDay.toISOString()})`);
    
    const bookings = await prisma.hotelBooking.findMany({
        where: {
            roomTypeId: roomTypeId,
            status: { in: ['confirmed', 'pending'] },
            OR: [
                {
                    checkInDate: { lte: endOfDay },
                    checkOutDate: { gte: startOfDay }
                }
            ]
        },
        include: {
            booking: {
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        }
                    }
                }
            },
            hotel: true
        },
        orderBy: {
            createdAt: 'desc' // Cancel most recent bookings first
        }
    });
    
    console.log(`Found ${bookings.length} bookings that overlap with the date`);
    
    // Calculate how many rooms we need to free up
    let roomsToFree = 0;
    let runningSum = 0;
    const bookingsToCancel = [];
    
    // Sum up all the booked rooms
    const totalRoomsBooked = bookings.reduce((sum, booking) => sum + (booking.numberOfRooms || 1), 0);
    console.log(`Total rooms booked for this date: ${totalRoomsBooked}, new availability: ${newAvailability}`);
    
    // If we need to cancel any bookings
    if (totalRoomsBooked > newAvailability) {
        roomsToFree = totalRoomsBooked - newAvailability;
        console.log(`Need to free up ${roomsToFree} rooms`);
        
        // Add bookings to the cancel list until we've freed enough rooms
        for (const booking of bookings) {
            const roomCount = booking.numberOfRooms || 1;
            console.log(`Considering booking ${booking.bookingId} with ${roomCount} room(s)`);
            bookingsToCancel.push(booking);
            runningSum += roomCount;
            
            console.log(`Running sum: ${runningSum} / ${roomsToFree} needed`);
            if (runningSum >= roomsToFree) {
                console.log(`Have enough bookings to cancel (${bookingsToCancel.length} bookings)`);
                break;
            }
        }
    }
    
    return bookingsToCancel;
}

// Function to cancel a booking with all related records
async function cancelBooking(bookingId, userId, reason = "Cancelled because of availability changes.") {
  try {
    // Start a transaction for all cancellation operations
    const updatedBooking = await prisma.$transaction(async (tx) => {
      // 1. Get the booking details with related entities
      const existingBooking = await tx.booking.findUnique({
        where: {
          id: bookingId,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          flightBookings: true,
          hotelBookings: {
            include: {
              roomType: true,
              hotel: true
            }
          }
        }
      });
      
      if (!existingBooking) {
        throw new Error('Booking not found');
      }
      
      // Only allow cancellation if the booking is currently confirmed or pending
      if (!['confirmed', 'pending'].includes(existingBooking.status)) {
        throw new Error(`Cannot cancel a booking with status: ${existingBooking.status}`);
      }
      
      // 2. Cancel AFS bookings if present
      const afsResults = [];
      
      if (existingBooking.flightBookings && existingBooking.flightBookings.length > 0) {
        // Look for unique booking references to cancel
        const uniqueReferences = new Set();
        
        for (const flightBooking of existingBooking.flightBookings) {
          if (flightBooking.afsBookingReference) {
            uniqueReferences.add(flightBooking.afsBookingReference);
          }
        }
        
        // Cancel each unique booking reference with AFS
        for (const bookingReference of uniqueReferences) {
          try {
            const afsResult = await cancelWithAFS(
              existingBooking.user.lastName,
              bookingReference
            );
            
            afsResults.push({
              bookingReference,
              success: true,
              message: 'Cancelled successfully with AFS'
            });
          } catch (afsError) {
            console.error('Error cancelling with AFS:', afsError);
            afsResults.push({
              bookingReference,
              success: false,
              error: afsError.message
            });
          }
        }
      }
      
      // 3. Update room availability for all hotel bookings
      if (existingBooking.hotelBookings && existingBooking.hotelBookings.length > 0) {
        for (const hotelBooking of existingBooking.hotelBookings) {
          // Skip if already cancelled
          if (hotelBooking.status === 'cancelled') continue;
          
          // Update each day's availability
          const checkInDate = new Date(hotelBooking.checkInDate);
          const checkOutDate = new Date(hotelBooking.checkOutDate);
          const roomsToFree = hotelBooking.numberOfRooms || 1;
          
          // For each day between check-in and check-out
          for (let currentDate = new Date(checkInDate); 
               currentDate < checkOutDate; 
               currentDate.setDate(currentDate.getDate() + 1)) {
              
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);
            
            // Find existing availability record
            const availability = await tx.roomAvailability.findFirst({
              where: {
                roomTypeId: hotelBooking.roomTypeId,
                date: {
                  gte: dayStart,
                  lte: dayEnd
                }
              }
            });
            
            if (availability) {
              // Update existing availability record
              await tx.roomAvailability.update({
                where: { id: availability.id },
                data: { 
                  availableRooms: availability.availableRooms + roomsToFree 
                }
              });
            } else {
              // Create new availability record based on base availability
              const roomType = await tx.roomType.findUnique({
                where: { id: hotelBooking.roomTypeId }
              });
              
              if (roomType) {
                await tx.roomAvailability.create({
                  data: {
                    roomTypeId: hotelBooking.roomTypeId,
                    date: new Date(currentDate),
                    availableRooms: roomType.baseAvailability + roomsToFree
                  }
                });
              }
            }
          }
          
          // Update hotel booking status
          await tx.hotelBooking.update({
            where: { id: hotelBooking.id },
            data: { status: 'cancelled' }
          });
          
          // Notify hotel owner about cancellation
          if (hotelBooking.hotel) {
            await tx.notification.create({
              data: {
                userId: hotelBooking.hotel.ownerId,
                message: `Booking at ${hotelBooking.hotel.name} from ${checkInDate.toISOString().split('T')[0]} to ${checkOutDate.toISOString().split('T')[0]} has been cancelled. Reason: ${reason}`,
                type: 'booking_cancelled',
                relatedBookingId: bookingId
              }
            });
          }
        }
      }
      
      // 4. Update the main booking status
      const updated = await tx.booking.update({
        where: {
          id: bookingId
      },
      data: {
          status: 'cancelled',
      },
        include: {
          flightBookings: true,
          hotelBookings: {
            include: {
              hotel: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  latitude: true,
                  longitude: true,
                  starRating: true
                }
              },
              roomType: {
                select: {
                  id: true,
                  name: true,
                  pricePerNight: true
                }
              }
            }
          },
          invoice: true
        }
      });
      
      // 5. Create notification for the user
      await tx.notification.create({
        data: {
          userId: existingBooking.userId,
          message: `Your booking has been cancelled. Reason: ${reason}`,
          type: 'booking_cancelled',
          relatedBookingId: bookingId
        }
      });
      
      // Return the updated booking with AFS results
      return {
        ...updated,
        afsResults
      };
    });
    
    return { success: true, data: updatedBooking };
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return { 
      success: false, 
      error: error.message || 'Error cancelling booking'
    };
  }
}

export async function POST(request, { params }) {
    const { hotelId, roomTypeId } = params;
    const url = new URL(request.url);
    const forceCancellation = url.searchParams.get('forceCancellation') === 'true';
    
    try {
        console.log(`Processing availability update for hotel ${hotelId}, room type ${roomTypeId}, forceCancellation=${forceCancellation}`);
        
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is hotel owner
        const hotel = await prisma.hotel.findUnique({ 
            where: { id: hotelId },
            select: { ownerId: true, name: true }
        });
        
        if (!hotel || hotel.ownerId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const results = [];
        
        console.log(`Processing ${body.length} date entries`);
        
        for (const { date, availableRooms } of body) {
            // Ensure availableRooms is a number
            const numAvailableRooms = parseInt(availableRooms);
            if (isNaN(numAvailableRooms)) {
                return NextResponse.json({ 
                    error: 'Available rooms must be a number' 
                }, { status: 400 });
            }
            
            console.log(`Processing date ${date} with ${numAvailableRooms} rooms`);
            
            // Get the date as a JavaScript Date object
            const jsDate = new Date(date);
            
            // Check if there are existing bookings for this date
            const bookedRoomsCount = await countBookingsForDate(roomTypeId, jsDate);
            console.log(`Found ${bookedRoomsCount} booked rooms for date ${date}`);
            
            // If reducing availability below existing bookings
            if (numAvailableRooms < bookedRoomsCount) {
                console.log(`Requested availability (${numAvailableRooms}) is less than booked rooms (${bookedRoomsCount})`);
                
                // If force cancellation is not enabled, return an error with booking details
                if (!forceCancellation) {
                    console.log(`Force cancellation not enabled, returning error`);
                    return NextResponse.json({ 
                        error: 'Cannot reduce availability below number of existing bookings',
                        date,
                        existingBookings: bookedRoomsCount,
                        requestedAvailability: numAvailableRooms,
                        affectedBookings: await getAffectedBookings(roomTypeId, jsDate, numAvailableRooms)
                    }, { status: 409 });
                }
                
                console.log(`Force cancellation enabled, proceeding with cancellations`);
                
                // If force cancellation is enabled, cancel the excess bookings
                const bookingsToCancel = await getAffectedBookings(roomTypeId, jsDate, numAvailableRooms);
                console.log(`Found ${bookingsToCancel.length} bookings to cancel`);
                
                const cancelledBookingIds = [];
                const cancelResults = [];
                
                // Cancel each booking 
                for (const booking of bookingsToCancel) {
                    console.log(`Cancelling booking ${booking.bookingId}`);
                    const cancelResult = await cancelBooking(booking.bookingId, userId);
                    
                    if (cancelResult.success) {
                        cancelledBookingIds.push(booking.bookingId);
                        cancelResults.push(cancelResult);
                        console.log(`Successfully cancelled booking ${booking.bookingId}`);
                    } else {
                        console.error(`Failed to cancel booking ${booking.bookingId}:`, cancelResult.error);
                        cancelResults.push({
                            bookingId: booking.bookingId,
                            error: cancelResult.error || 'Unknown error'
                        });
                    }
                }
                
                console.log(`Cancelled ${cancelledBookingIds.length} bookings, updating availability record`);
                
                // Update the room availability for this date
                const startOfDay = new Date(jsDate);
                startOfDay.setHours(0, 0, 0, 0);
                
                const endOfDay = new Date(jsDate);
                endOfDay.setHours(23, 59, 59, 999);
                
                // Delete ANY existing records for this date and room type
                await prisma.roomAvailability.deleteMany({
                    where: {
                        roomTypeId,
                        date: {
                            gte: startOfDay,
                            lte: endOfDay
                        },
                    },
                });
                
                // Create a new availability record with the exact user-specified value
                await prisma.roomAvailability.create({
                    data: {
                        roomTypeId,
                        date: new Date(jsDate),
                        availableRooms: numAvailableRooms
                    }
                });
                
                results.push({
                    date,
                    availableRooms: numAvailableRooms,
                    cancelledBookings: cancelledBookingIds.length,
                    cancelledBookingIds,
                    cancelResults: cancelResults
                });
                
                console.log(`Finished processing date ${date}`);
            } else {
                // No bookings to cancel, just update availability
                console.log(`No need to cancel bookings for date ${date}`);
                
                const startOfDay = new Date(jsDate);
                startOfDay.setHours(0, 0, 0, 0);
                
                const endOfDay = new Date(jsDate);
                endOfDay.setHours(23, 59, 59, 999);
                
                // Delete ANY existing records for this date and room type
                await prisma.roomAvailability.deleteMany({
                    where: {
                        roomTypeId,
                        date: {
                            gte: startOfDay,
                            lte: endOfDay
                        },
                    },
                });
                
                // Create a new record with the exact user-specified value
                await prisma.roomAvailability.create({
                    data: {
                        roomTypeId,
                        date: new Date(jsDate),
                        availableRooms: numAvailableRooms,
                    },
                });
                
                results.push({
                    date,
                    availableRooms: numAvailableRooms,
                    updatedSuccessfully: true
                });
                
                console.log(`Finished updating availability for date ${date}`);
            }
        }

        console.log(`All dates processed successfully`);
        return NextResponse.json({
            message: 'Availability updated successfully',
            results
        }, { status: 200 });
    } catch (error) {
        console.error('Error setting availability:', error);
        return NextResponse.json({ 
            error: 'Error setting availability',
            details: error.message
        }, { status: 500 });
    }
}
