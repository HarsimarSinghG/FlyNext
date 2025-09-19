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
    try {
        const roomType = await prisma.roomType.findUnique({
            where: { id: roomTypeId },
            include: { availability: true },
        });
        if (!roomType || roomType.hotelId !== hotelId) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        return NextResponse.json(roomType);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error fetching room type' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    const { hotelId, roomTypeId } = params;
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is the hotel owner
        const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
        if (!hotel || hotel.ownerId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const updatedRoomType = await prisma.roomType.update({
            where: { id: roomTypeId },
            data: { ...body },
        });

        return NextResponse.json(updatedRoomType);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error updating room type' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const { hotelId, roomTypeId } = params;
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

        await prisma.roomType.delete({
            where: { id: roomTypeId },
        });

        return NextResponse.json({ message: 'Room type deleted' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error deleting room type' }, { status: 500 });
    }
}
