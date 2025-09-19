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
    const { hotelId, roomTypeId } = params;
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is hotel owner
        const hotel = await prisma.hotel.findUnique({ 
            where: { id: hotelId },
            select: { ownerId: true }
        });
        
        if (!hotel || hotel.ownerId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        
        // Validate and parse date parameters
        if (!startDateParam || !endDateParam) {
            return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
        }
        
        const startDate = new Date(startDateParam);
        const endDate = new Date(endDateParam);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
        }
        
        // Get room type details for base availability
        const roomType = await prisma.roomType.findUnique({
            where: { id: roomTypeId }
        });
        
        if (!roomType || roomType.hotelId !== hotelId) {
            return NextResponse.json({ error: 'Room type not found' }, { status: 404 });
        }
        
        // Get custom availability records
        const availabilityRecords = await prisma.roomAvailability.findMany({
            where: {
                roomTypeId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });
        
        // Create date range array
        const dateRange = [];
        const currentDate = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        while (currentDate <= endDateObj) {
            dateRange.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Calculate availability for each date
        const availability = await Promise.all(dateRange.map(async (date) => {
            const dateString = date.toISOString().split('T')[0];
            
            // Check if there's a custom availability record for this date
            const customAvailability = availabilityRecords.find(record => 
                new Date(record.date).toISOString().split('T')[0] === dateString
            );
            
            // Get booked rooms count for this date
            const bookedCount = await getBookedRoomsCount(roomTypeId, date);
            
            // Use custom availability if available, otherwise use base availability
            const totalAvailable = customAvailability ? customAvailability.availableRooms : roomType.baseAvailability;
            
            return {
                date: dateString,
                availableRooms: totalAvailable,
                bookedRooms: bookedCount,
                remaining: Math.max(0, totalAvailable - bookedCount),
                isManuallySet: !!customAvailability
            };
        }));
        
        return NextResponse.json({
            roomTypeName: roomType.name,
            baseAvailability: roomType.baseAvailability,
            availability
        });
    } catch (error) {
        console.error('Error checking availability:', error);
        return NextResponse.json({ 
            error: 'Error checking availability',
            details: error.message 
        }, { status: 500 });
    }
}

// Helper function to count booked rooms for a specific date
async function getBookedRoomsCount(roomTypeId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const bookings = await prisma.hotelBooking.findMany({
        where: {
            roomTypeId,
            status: { in: ['confirmed', 'pending'] },
            OR: [
                {
                    checkInDate: { lte: endOfDay },
                    checkOutDate: { gt: startOfDay }
                }
            ]
        },
        select: {
            numberOfRooms: true
        }
    });
    
    // Make sure to account for bookings without numberOfRooms set
    return bookings.reduce((sum, booking) => sum + (booking.numberOfRooms || 1), 0);
}