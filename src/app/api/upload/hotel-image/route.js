import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { writeFile } from 'fs/promises';
import path from 'path';
import { mkdir } from 'fs/promises';

// Helper function to get user ID from token
async function getUserFromToken(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;
    
    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.userId;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expired');
        }
        return null;
    }
}

export async function POST(request) {
    try {
        // Verify authentication token and get user ID
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

        // Parse the multipart form data
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json({ 
                error: 'Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP).' 
            }, { status: 400 });
        }

        // Validate file size (limit to 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json({ 
                error: 'File too large. Maximum size is 5MB.' 
            }, { status: 400 });
        }

        // Create unique filename with user ID and timestamp
        const timestamp = Date.now();
        const fileExtension = file.type.split('/')[1];
        const fileName = `hotel_${userId}_${timestamp}.${fileExtension}`;
        
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'hotels');
        await mkdir(uploadsDir, { recursive: true });
        
        // Write file to disk
        const filePath = path.join(uploadsDir, fileName);
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);
        
        // Generate URL for the uploaded file
        const fileUrl = `/uploads/hotels/${fileName}`;
        
        // Return the file URL
        return NextResponse.json({ 
            url: fileUrl,
            message: 'Hotel image uploaded successfully'
        }, { status: 201 });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ 
            error: 'An error occurred while uploading the file' 
        }, { status: 500 });
    }
}