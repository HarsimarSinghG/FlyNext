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
    try {
        const roomTypes = await prisma.roomType.findMany({
            where: { hotelId },
            include: {
                availability: true,
            },
        });
        return NextResponse.json(roomTypes);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error fetching room types' }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    const { hotelId } = params;
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is the owner of the hotel
        const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
        if (!hotel || hotel.ownerId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        // e.g. { name, amenities, pricePerNight, images, baseAvailability }

        const newRoomType = await prisma.roomType.create({
            data: {
                hotelId,
                ...body,
            },
        });

        return NextResponse.json(newRoomType, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error creating room type' }, { status: 500 });
    }
}
