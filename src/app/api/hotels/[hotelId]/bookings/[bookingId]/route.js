import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

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

export async function GET(request, { params }) {
    const { hotelId, bookingId } = params;
    
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is hotel owner
        const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
        if (!hotel || hotel.ownerId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // First find the booking by bookingId
        const booking = await prisma.hotelBooking.findFirst({
            where: { bookingId: bookingId },
            include: {
                booking: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                                phoneNumber: true,
                            }
                        }
                    }
                },
                roomType: true,
                hotel: true
            }
        });

        if (!booking || booking.hotelId !== hotelId) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        return NextResponse.json(booking);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error fetching booking details' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    const { hotelId, bookingId } = params;
    
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is hotel owner
        const hotel = await prisma.hotel.findUnique({ 
            where: { id: hotelId } 
        });
        
        if (!hotel || hotel.ownerId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // First find the booking by bookingId to get its internal ID
        const booking = await prisma.hotelBooking.findFirst({
            where: { bookingId: bookingId },
            include: {
                booking: true,
                roomType: true,
            }
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }
        
        if (booking.hotelId !== hotelId) {
            return NextResponse.json({ error: 'Booking does not belong to this hotel' }, { status: 403 });
        }

        // Check if booking is already cancelled
        if (booking.status === 'cancelled') {
            return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
        }

        // Get the number of rooms to be freed (default to 1 if not specified)
        const roomsToFree = booking.numberOfRooms || 1;

        // Start a transaction for updating multiple records
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update the hotel booking status using the internal ID
            const updatedHotelBooking = await tx.hotelBooking.update({
                where: { id: booking.id }, // Use the internal ID from the found booking
                data: { status: 'cancelled' }
            });

            // 2. Check if parent booking has any active bookings left
            const otherActiveBookings = await tx.hotelBooking.findMany({
                where: {
                    bookingId: booking.bookingId,
                    id: { not: booking.id }, // Use internal ID for filtering
                    status: { in: ['confirmed', 'pending'] }
                }
            });



            // If no other active bookings, also cancel the parent booking
            if (otherActiveBookings.length === 0) {
                await tx.booking.update({
                    where: { id: booking.bookingId },
                    data: { 
                        status: 'cancelled',
                    }
                });
            }

            // 3. Create notification for the user
            await tx.notification.create({
                data: {
                    userId: booking.booking.userId,
                    message: `Your booking at ${hotel.name} for ${booking.checkInDate.toISOString().split('T')[0]} to ${booking.checkOutDate.toISOString().split('T')[0]} has been cancelled by the hotel.`,
                    type: 'hotel_booking_cancelled',
                    relatedBookingId: booking.bookingId
                }
            });

            // 4. Update room availability for each day of the stay
            const checkInDate = new Date(booking.checkInDate);
            const checkOutDate = new Date(booking.checkOutDate);
            
            // Create array of dates for the booking
            const dates = [];
            const currentDate = new Date(checkInDate);
            
            while (currentDate < checkOutDate) {
                dates.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // Update availability for each date
            for (const date of dates) {
                const dayStart = new Date(date);
                dayStart.setHours(0, 0, 0, 0);
                
                const dayEnd = new Date(date);
                dayEnd.setHours(23, 59, 59, 999);
                
                // Find availability record for this date
                const availabilityRecord = await tx.roomAvailability.findFirst({
                    where: {
                        roomTypeId: booking.roomTypeId,
                        date: {
                            gte: dayStart,
                            lte: dayEnd
                        }
                    }
                });
                
                if (availabilityRecord) {
                    // Increase availability by the number of rooms in the booking
                    await tx.roomAvailability.update({
                        where: { id: availabilityRecord.id },
                        data: {
                            availableRooms: availabilityRecord.availableRooms + roomsToFree
                        }
                    });
                } else {
                    // If no record exists, create one with base availability + the freed rooms
                    const roomType = await tx.roomType.findUnique({
                        where: { id: booking.roomTypeId }
                    });
                    
                    const baseAvailability = roomType?.baseAvailability || 0;
                    
                    await tx.roomAvailability.create({
                        data: {
                            roomTypeId: booking.roomTypeId,
                            date: new Date(date),
                            availableRooms: baseAvailability + roomsToFree
                        }
                    });
                }
            }

            return {
                ...updatedHotelBooking,
                message: `Booking cancelled successfully. ${roomsToFree} room(s) freed up for the dates from ${checkInDate.toISOString().split('T')[0]} to ${checkOutDate.toISOString().split('T')[0]}.`
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error cancelling booking', details: error.message }, { status: 500 });
    }
}