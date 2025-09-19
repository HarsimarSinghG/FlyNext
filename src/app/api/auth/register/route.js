import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password, firstName, lastName } = body;

        if (!email || !password || !firstName || !lastName) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 400 }
            );
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                firstName,
                lastName,
            },
        });

        // // Create access token - short lived
        // const accessToken = jwt.sign(
        //     { userId: user.id, type: 'access' },
        //     process.env.JWT_SECRET,
        //     { expiresIn: '15m' }
        // );

        // // Create refresh token - longer lived
        // const refreshToken = jwt.sign(
        //     { userId: user.id, type: 'refresh' },
        //     process.env.JWT_REFRESH_SECRET,
        //     { expiresIn: '7d' }
        // );

        // Return tokens and user information
        // return NextResponse.json(
        //     {
        //         accessToken,
        //         refreshToken,
        //         user: {
        //             id: user.id,
        //             email: user.email,
        //             firstName: user.firstName,
        //             lastName: user.lastName
        //         }
        //     },
        //     { status: 201 }
        // );
        return NextResponse.json(
            {
                
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName
                }
            },
            { status: 201 }
        );
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}