import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { generateInvoicePDF } from '@/utils/invoiceGenerator';

export const runtime = 'nodejs';

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
    const { bookingId } = params;
    
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if the booking exists and belongs to the user
        const booking = await prisma.booking.findUnique({
            where: {
                id: bookingId,
                userId: userId
            },
            include: {
                flightBookings: true,
                hotelBookings: {
                    include: {
                        hotel: {
                            select: {
                                name: true,
                                address: true
                            }
                        },
                        roomType: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                invoice: true
            }
        });
        
        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }
        
        // If an invoice already exists, return its URL
        if (booking.invoice) {
            return NextResponse.json({ 
                invoiceUrl: booking.invoice.pdfUrl,
                message: 'Invoice already exists'
            });
        }
        
        // Generate a new invoice
        const invoiceUrl = await generateInvoicePDF(booking);
        
        // Create a new invoice record
        const invoice = await prisma.invoice.create({
            data: {
                bookingId: booking.id,
                invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                pdfUrl: invoiceUrl
            }
        });
        
        return NextResponse.json({
            invoiceUrl: invoice.pdfUrl,
            invoiceNumber: invoice.invoiceNumber
        });
    } catch (error) {
        console.error('Error generating invoice:', error);
        return NextResponse.json({ error: 'Error generating invoice' }, { status: 500 });
    }
}