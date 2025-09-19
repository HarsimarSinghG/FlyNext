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

export async function GET(request) {
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Optionally allow query param for isRead or not
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(notifications);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error fetching notifications' }, { status: 500 });
    }
}

// Mark notifications as read
export async function PATCH(request) {
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        // e.g. { notificationIds: [...] }
        const { notificationIds } = body;

        await prisma.notification.updateMany({
            where: {
                userId,
                id: { in: notificationIds || [] },
            },
            data: {
                isRead: true,
            },
        });

        return NextResponse.json({ message: 'Notifications marked as read' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error marking notifications' }, { status: 500 });
    }
}
