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
    const { hotelId } = params;
    const { searchParams } = new URL(request.url);
    const checkInDate = searchParams.get('checkInDate');
    const checkOutDate = searchParams.get('checkOutDate');

    try {
        const hotel = await prisma.hotel.findUnique({
            where: { id: hotelId },
            include: {
                roomTypes: {
                    include: {
                        availability: checkInDate && checkOutDate ? {
                            where: {
                                date: {
                                    gte: new Date(checkInDate),
                                    lt: new Date(checkOutDate)
                                }
                            }
                        } : true
                    }
                },
            },
        });
        
        if (!hotel) {
            return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
        }
        
        // If dates are provided, calculate availability for each room type
        if (checkInDate && checkOutDate) {
            const startDate = new Date(checkInDate);
            const endDate = new Date(checkOutDate);
            const nights = (endDate - startDate) / (1000 * 60 * 60 * 24);
            
            hotel.roomTypes = hotel.roomTypes.map(roomType => {
                // Check availability for each day in the range
                let minAvailability = roomType.baseAvailability;
                const dateAvailability = {};
                
                for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0];
                    const recordForDate = roomType.availability.find(a => 
                        a.date.toISOString().split('T')[0] === dateStr
                    );
                    
                    const availableRooms = recordForDate ? 
                        recordForDate.availableRooms : 
                        roomType.baseAvailability;
                        
                    dateAvailability[dateStr] = availableRooms;
                    minAvailability = Math.min(minAvailability, availableRooms);
                }
                
                return {
                    ...roomType,
                    available: minAvailability > 0,
                    availableRooms: minAvailability,
                    dateAvailability,
                    totalPrice: roomType.pricePerNight * nights
                };
            });
        }
        
        return NextResponse.json(hotel);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error fetching hotel' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    const { hotelId } = params;
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Optionally check if user is the owner or has permission
        const existingHotel = await prisma.hotel.findUnique({
            where: { id: hotelId },
        });
        if (!existingHotel || existingHotel.ownerId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const updatedHotel = await prisma.hotel.update({
            where: { id: hotelId },
            data: { ...body },
        });

        return NextResponse.json(updatedHotel);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error updating hotel' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const { hotelId } = params;
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is hotel owner
        const existingHotel = await prisma.hotel.findUnique({
            where: { id: hotelId },
        });
        if (!existingHotel || existingHotel.ownerId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.hotel.delete({
            where: { id: hotelId },
        });

        return NextResponse.json({ message: 'Hotel deleted' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error deleting hotel' }, { status: 500 });
    }
}
