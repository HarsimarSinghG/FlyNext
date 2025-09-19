import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import axios from 'axios';

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

// Function to cancel flight booking with AFS API
async function cancelWithAFS(lastName, bookingReference) {
    try {
        console.log('Cancelling flight with AFS API:', { lastName, bookingReference });
        
        // Make API request to AFS
        const response = await axios.post('https://advanced-flights-system.replit.app/api/bookings/cancel', {
            lastName: lastName,
            bookingReference: bookingReference
        }, {
            headers: {
                'x-api-key': process.env.AFS_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('AFS cancellation response:', response.data);
        return response.data;
    } catch (error) {
        console.error('AFS API Cancellation Error:', error.response?.data || error.message);
        throw new Error('Failed to cancel flight with AFS: ' + (error.response?.data?.error || error.message));
    }
}

export async function GET(request, { params }) {
    const { bookingId } = params;
    
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Get booking with related entities - using schema fields
        const booking = await prisma.booking.findUnique({
            where: {
                id: bookingId,
                userId: userId // Ensure the booking belongs to the user
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
        
        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }
        
        return NextResponse.json(booking);
    } catch (error) {
        console.error('Error fetching booking:', error);
        return NextResponse.json({ error: 'Error fetching booking details' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    const { bookingId } = params;
    
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Get the booking first to check if it belongs to the user
        const existingBooking = await prisma.booking.findUnique({
            where: {
                id: bookingId,
                userId: userId
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
                        roomType: true
                    }
                }
            }
        });
        
        if (!existingBooking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }
        
        // Only allow cancellation if the booking is currently confirmed
        if (existingBooking.status !== 'confirmed') {
            return NextResponse.json(
                { error: `Cannot cancel a booking with status: ${existingBooking.status}` }, 
                { status: 400 }
            );
        }
        
        // Parse the request body to get the updates
        const body = await request.json();
        
        // Only allow status change for now
        if (body.status !== 'cancelled') {
            return NextResponse.json(
                { error: 'Only cancellation is supported' }, 
                { status: 400 }
            );
        }
        
        // Start a transaction for all cancellation operations
        const updatedBooking = await prisma.$transaction(async (tx) => {
            // 1. First try to cancel AFS bookings if present
            const afsResults = [];
            
            if (existingBooking.flightBookings && existingBooking.flightBookings.length > 0) {
                // Look for a booking reference to cancel
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
            
            // 2. Update room availability for all hotel bookings
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
                    const hotel = await tx.hotel.findUnique({
                        where: { id: hotelBooking.hotelId },
                        select: { ownerId: true, name: true }
                    });
                    
                    if (hotel) {
                        await tx.notification.create({
                            data: {
                                userId: hotel.ownerId,
                                message: `Booking at ${hotel.name} from ${checkInDate.toISOString().split('T')[0]} to ${checkOutDate.toISOString().split('T')[0]} has been cancelled by the guest.`,
                                type: 'booking_cancelled',
                                relatedBookingId: bookingId
                            }
                        });
                    }
                }
            }
            
            // 3. Update the main booking status
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
            
            // 4. Create notification for the user
            await tx.notification.create({
                data: {
                    userId,
                    message: 'Your booking has been cancelled successfully',
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
        
        return NextResponse.json(updatedBooking);
    } catch (error) {
        console.error('Error updating booking:', error);
        return NextResponse.json({ 
            error: 'Error updating booking: ' + error.message 
        }, { status: 500 });
    }
}