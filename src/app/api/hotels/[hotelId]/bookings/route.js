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

        // Parse filter parameters
        const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')) : undefined;
        const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')) : undefined;
        const roomTypeId = searchParams.get('roomTypeId');
        const status = searchParams.get('status');

        // Build where clause
        let whereClause = {
            hotelId,
        };

        // Add date filters if provided
        if (startDate || endDate) {
            whereClause.OR = [
                // Check-in date within range
                {
                    ...(startDate && endDate ? {
                        checkInDate: {
                            gte: startDate,
                            lte: endDate,
                        }
                    } : startDate ? {
                        checkInDate: {
                            gte: startDate,
                        }
                    } : {
                        checkInDate: {
                            lte: endDate,
                        }
                    })
                },
                // Check-out date within range
                {
                    ...(startDate && endDate ? {
                        checkOutDate: {
                            gte: startDate,
                            lte: endDate,
                        }
                    } : startDate ? {
                        checkOutDate: {
                            gte: startDate,
                        }
                    } : {
                        checkOutDate: {
                            lte: endDate,
                        }
                    })
                }
            ];
        }

        // Add room type filter if provided
        if (roomTypeId) {
            whereClause.roomTypeId = roomTypeId;
        }

        // Add status filter if provided
        if (status) {
            whereClause.status = status;
        }

        // Query bookings with filters
        const bookings = await prisma.hotelBooking.findMany({
            where: whereClause,
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
                roomType: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(bookings);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error fetching hotel bookings' }, { status: 500 });
    }
}