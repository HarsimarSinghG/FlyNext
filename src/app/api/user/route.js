import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function getUserFromToken(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.userId;
    } catch (error) {
        // Check if token is expired
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expired');
        }
        return null;
    }
}

export async function GET(request) {
    try {
        // Get user ID from token, handling token expiration
        let userId;
        try {
            userId = await getUserFromToken(request);
        } catch (error) {
            if (error.message === 'Token expired') {
                return NextResponse.json({ error: 'Token expired' }, { status: 401 });
            }
            throw error;
        }
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                profilePictureUrl: true,
                phoneNumber: true,
                passportNumber: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ user }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        // Get user ID from token, handling token expiration
        let userId;
        try {
            userId = await getUserFromToken(request);
        } catch (error) {
            if (error.message === 'Token expired') {
                return NextResponse.json({ error: 'Token expired' }, { status: 401 });
            }
            throw error;
        }
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();
        
        // Validate data
        const allowedFields = ['firstName', 'lastName', 'profilePictureUrl', 'phoneNumber', 'passportNumber'];
        const sanitizedData = Object.keys(data)
            .filter(key => allowedFields.includes(key))
            .reduce((obj, key) => {
                obj[key] = data[key];
                return obj;
            }, {});

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: sanitizedData,
        });

        return NextResponse.json({ 
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                profilePictureUrl: updatedUser.profilePictureUrl,
                phoneNumber: updatedUser.phoneNumber,
                passportNumber: updatedUser.passportNumber,
            } 
        }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
