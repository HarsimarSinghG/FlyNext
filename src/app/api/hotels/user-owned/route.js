import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function GET(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log("No auth header or invalid format");
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            const token = authHeader.replace('Bearer ', '');
            // Make sure your JWT_SECRET is the same used when creating the accessToken
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.userId || decoded.id; // Handle both formats
            
            console.log("User authenticated:", userId);

            // Fetch only hotels owned by the current user
            const hotels = await prisma.hotel.findMany({
                where: {
                    ownerId: userId
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            console.log(`Found ${hotels.length} hotels for user ${userId}`);
            return NextResponse.json(hotels);
        } catch (jwtError) {
            console.error("JWT verification failed:", jwtError);
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
    } catch (error) {
        console.error("Server error:", error);
        return NextResponse.json({ error: 'Error fetching hotels' }, { status: 500 });
    }
}