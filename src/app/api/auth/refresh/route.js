import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(request) {
    try {
        const { refreshToken } = await request.json();
        
        if (!refreshToken) {
            return NextResponse.json(
                { error: 'Refresh token not provided' },
                { status: 401 }
            );
        }
        
        // Verify the refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (error) {
            return NextResponse.json(
                { error: 'Invalid refresh token' },
                { status: 401 }
            );
        }
        
        // Check if token type is refresh
        if (decoded.type !== 'refresh') {
            return NextResponse.json(
                { error: 'Invalid token type' },
                { status: 401 }
            );
        }
        
        // Fetch the user to ensure they exist
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });
        
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 401 }
            );
        }
        
        // Generate new access token
        const accessToken = jwt.sign(
            { userId: user.id, type: 'access' },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        
        // Generate new refresh token (token rotation for security)
        const newRefreshToken = jwt.sign(
            { userId: user.id, type: 'refresh' },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );
        
        return NextResponse.json({
            accessToken,
            refreshToken: newRefreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}