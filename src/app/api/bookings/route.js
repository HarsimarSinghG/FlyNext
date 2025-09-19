import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { validateCardDetails } from '@/utils/cardValidation';
import { generateInvoicePDF } from '@/utils/invoiceGenerator';
import crypto from 'crypto';
import axios from 'axios';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

// Function to get user ID from JWT token
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

// Function to book flight with AFS API
async function bookWithAFS(user, flightIds) {
    try {
        console.log('Booking flights with AFS API:', { user, flightIds });
        
        // Map compound IDs if needed
        const processedFlightIds = flightIds.flatMap(id => {
            // Handle special separators in IDs
            if (id.includes('splitting_here')) {
                return id.split('splitting_here');
            }
            if (id.includes('%')) {
                return id.split('%');
            }
            if (id.includes('-') && id.length > 36) {
                return id.split('-');
            }
            return id;
        }).filter(id => id && id.trim() !== '');
        
        console.log('Processed flight IDs for AFS:', processedFlightIds);
        
        if (processedFlightIds.length === 0) {
            throw new Error('No valid flight IDs found');
        }

        // Make API request to AFS
        const response = await axios.post('https://advanced-flights-system.replit.app/api/bookings', {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            passportNumber: user.passportNumber || '000000000', // Use user's passport number if available
            flightIds: processedFlightIds
        }, {
            headers: {
                'x-api-key': process.env.AFS_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('AFS API Error:', error.response?.data || error.message);
        throw new Error('Failed to book flights with AFS: ' + (error.response?.data?.error || error.message));
    }
}

export async function POST(request) {
    try {
        // Log the request headers for debugging
        const headers = {};
        request.headers.forEach((value, key) => {
            headers[key] = value;
        });
        console.log('Request headers:', headers);
        
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user details for AFS booking
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                firstName: true,
                lastName: true,
                passportNumber: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await request.json();
        console.log('Request body:', JSON.stringify(body).substring(0, 500) + '...');
        
        const { 
            paymentDetails, 
            flightBookings = [], 
            hotelBookings = []
        } = body;

        // Validate payment details
        if (!paymentDetails) {
            return NextResponse.json({ error: 'Payment details are required' }, { status: 400 });
        }

        // Extract card details for validation
        const cardDetails = {
            cardNumber: paymentDetails.cardNumber,
            cardExpiry: paymentDetails.cardExpiry,
            cardCvc: paymentDetails.cardCvc
        };

        // Validate card details
        const cardValidation = validateCardDetails(cardDetails);
        
        if (!cardValidation.isValid) {
            return NextResponse.json({ 
                error: 'Invalid payment information', 
                validationErrors: cardValidation.errors 
            }, { status: 400 });
        }

        // Use the detected card type
        const cardType = cardValidation.cardType;
        
        // Get the last 4 digits of the card number
        const cardLast4 = paymentDetails.cardNumber.replace(/\D/g, '').slice(-4);

        // Ensure at least one booking type is provided
        if (flightBookings.length === 0 && hotelBookings.length === 0) {
            return NextResponse.json({ error: 'At least one flight or hotel booking is required' }, { status: 400 });
        }

        // Calculate total price
        let totalPrice = 0;

        // Process hotel bookings to verify availability and calculate prices
        for (const hotelBooking of hotelBookings) {
            const { hotelId, roomTypeId, checkInDate, checkOutDate, numberOfRooms } = hotelBooking;
            
            // Validate hotel booking data
            if (!hotelId || !roomTypeId || !checkInDate || !checkOutDate || !numberOfRooms) {
                return NextResponse.json({ error: 'Invalid hotel booking data' }, { status: 400 });
            }
            
            // Verify the hotel and room type exist
            const roomType = await prisma.roomType.findFirst({
                where: {
                    id: roomTypeId,
                    hotelId: hotelId
                }
            });
            
            if (!roomType) {
                return NextResponse.json({ error: `Room type not found for hotel ${hotelId}` }, { status: 404 });
            }
            
            // Check room availability for each day in the range
            const startDate = new Date(checkInDate);
            const endDate = new Date(checkOutDate);
            const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            
            if (nights <= 0) {
                return NextResponse.json({ error: 'Check-out date must be after check-in date' }, { status: 400 });
            }
            
            // Check availability for each day
            for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
                const currentDate = new Date(d);
                const availability = await prisma.roomAvailability.findFirst({
                    where: {
                        roomTypeId,
                        date: {
                            gte: new Date(currentDate.setHours(0, 0, 0, 0)),
                            lte: new Date(currentDate.setHours(23, 59, 59, 999))
                        }
                    }
                });
                
                const availableRooms = availability ? availability.availableRooms : roomType.baseAvailability;
                
                if (availableRooms < numberOfRooms) {
                    return NextResponse.json({ 
                        error: `Not enough rooms available for ${currentDate.toISOString().split('T')[0]}` 
                    }, { status: 400 });
                }
            }
            
            // Calculate hotel booking price
            hotelBooking.totalPrice = roomType.pricePerNight * nights * numberOfRooms;
            totalPrice += hotelBooking.totalPrice;
        }
        
        // Process flight bookings
        let afsBookingResponse = null;
        if (flightBookings.length > 0) {
            // Extract flight IDs for AFS booking
            console.log('Flight bookings received:', flightBookings);
            
            // Get flight IDs from the itineraries
            const flightIds = flightBookings
                .map(booking => booking.itineraryId || 
                              (booking.flights && booking.flights.length > 0 ? 
                                booking.flights.map(f => f.id).join('splitting_here') : null))
                .filter(id => id !== null);
                
            console.log('Flight IDs extracted for AFS booking:', flightIds);
            
            if (flightIds.length === 0) {
                return NextResponse.json({ 
                    error: 'No valid flight IDs found in the booking request'
                }, { status: 400 });
            }
            
            // Book flights with AFS API
            try {
                afsBookingResponse = await bookWithAFS(user, flightIds);
                console.log('AFS booking response:', afsBookingResponse);
                
                // Add AFS booking details to flight bookings
                for (const flightData of flightBookings) {
                    // Handle complex IDs
                    let flightId = flightData.itineraryId;
                    
                    // If we have a flights array, find the matching flight
                    let afsFlightDetails;
                    
                    if (flightData.flights && flightData.flights.length > 0) {
                        // For multi-flight itineraries, look for each component flight
                        for (const flight of flightData.flights) {
                            const matchingFlight = afsBookingResponse.flights.find(f => f.id === flight.id);
                            if (matchingFlight) {
                                // If we don't have details yet, use this one
                                if (!afsFlightDetails) {
                                    afsFlightDetails = matchingFlight;
                                }
                                // Add to the total price
                                totalPrice += parseFloat(matchingFlight.price);
                            }
                        }
                    } else {
                        // For single flights, just look for the main ID
                        afsFlightDetails = afsBookingResponse.flights.find(f => f.id === flightId);
                        if (afsFlightDetails) {
                            totalPrice += parseFloat(afsFlightDetails.price);
                        }
                    }
                    
                    if (afsFlightDetails) {
                        flightData.price = afsFlightDetails.price;
                        flightData.bookingReference = afsBookingResponse.bookingReference;
                        flightData.ticketNumber = afsBookingResponse.ticketNumber;
                        
                        // Set the AFS flight ID for database storage
                        flightData.afsFlightId = afsFlightDetails.id;
                    }
                }
            } catch (error) {
                console.error('AFS booking error:', error);
                return NextResponse.json({ error: error.message }, { status: 400 });
            }
        }

        // Start a transaction to create the booking
        const booking = await prisma.$transaction(async (tx) => {
            // Create the main booking record
            const newBooking = await tx.booking.create({
                data: {
                    userId,
                    totalPrice,
                    paymentCardLast4: cardLast4,
                    paymentCardType: cardType,
                    paymentCardExpiry: paymentDetails.cardExpiry,
                    status: 'confirmed',
                }
            });
            
            // Create flight bookings if any
            if (flightBookings.length > 0 && afsBookingResponse) {
                for (const flightData of flightBookings) {
                    if (!flightData.afsFlightId && flightData.flights && flightData.flights.length > 0) {
                        // Use the first flight ID if afsFlightId wasn't set
                        flightData.afsFlightId = flightData.flights[0].id;
                    }
                    
                    // Determine airport codes
                    const departureAirportCode = 
                        (flightData.origin && typeof flightData.origin === 'object') 
                            ? flightData.origin.code 
                            : flightData.origin || 'N/A';
                            
                    const arrivalAirportCode = 
                        (flightData.destination && typeof flightData.destination === 'object')
                            ? flightData.destination.code
                            : flightData.destination || 'N/A';
                            
                    // Determine departure/arrival times
                    const departureTime = flightData.departureTime 
                        ? new Date(flightData.departureTime)
                        : new Date(flightData.departureDate);
                        
                    const arrivalTime = flightData.arrivalTime
                        ? new Date(flightData.arrivalTime)
                        : new Date(flightData.departureDate);
                    
                    await tx.flightBooking.create({
                        data: {
                            bookingId: newBooking.id,
                            afsFlightId: flightData.afsFlightId,
                            departureAirportCode,
                            arrivalAirportCode,
                            departureTime,
                            arrivalTime,
                            passengers: flightData.passengers || 1,
                            // Add AFS specific fields
                            afsBookingReference: afsBookingResponse.bookingReference,
                            afsTicketNumber: afsBookingResponse.ticketNumber
                        }
                    });
                }
            }
            
            // Create hotel bookings if any
            if (hotelBookings.length > 0) {
                for (const hotelData of hotelBookings) {
                    const hotelBooking = await tx.hotelBooking.create({
                        data: {
                            bookingId: newBooking.id,
                            hotelId: hotelData.hotelId,
                            roomTypeId: hotelData.roomTypeId,
                            checkInDate: new Date(hotelData.checkInDate),
                            checkOutDate: new Date(hotelData.checkOutDate),
                            numberOfRooms: hotelData.numberOfRooms,
                            totalPrice: hotelData.totalPrice,
                            status: 'confirmed'
                        }
                    });
                    
                    // Update room availability for each date in range
                    const startDate = new Date(hotelData.checkInDate);
                    const endDate = new Date(hotelData.checkOutDate);
                    
                    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
                        const currentDate = new Date(d);
                        const availability = await tx.roomAvailability.findFirst({
                            where: {
                                roomTypeId: hotelData.roomTypeId,
                                date: {
                                    gte: new Date(currentDate.setHours(0, 0, 0, 0)),
                                    lte: new Date(currentDate.setHours(23, 59, 59, 999))
                                }
                            }
                        });
                        
                        if (availability) {
                            if(availability.availableRooms < hotelData.numberOfRooms) {
                                throw new Error(`Not enough rooms available for ${currentDate.toISOString().split('T')[0]}`);
                            }
                            // Update existing availability
                            await tx.roomAvailability.update({
                                where: { id: availability.id },
                                data: { availableRooms: availability.availableRooms - hotelData.numberOfRooms }
                            });}
                        else {
                            // Create new availability record
                            const roomType = await tx.roomType.findUnique({
                                where: { id: hotelData.roomTypeId }
                            });
                            
                            await tx.roomAvailability.create({
                                data: {
                                    roomTypeId: hotelData.roomTypeId,
                                    date: new Date(currentDate),
                                    availableRooms: roomType.baseAvailability - hotelData.numberOfRooms
                                }
                            });
                        }
                    }
                    
                    // Notify hotel owner about new reservation
                    const hotel = await tx.hotel.findUnique({
                        where: { id: hotelData.hotelId },
                        include: { owner: true }
                    });
                    
                    if (hotel) {
                        await tx.notification.create({
                            data: {
                                userId: hotel.ownerId,
                                message: `New reservation at ${hotel.name} from ${new Date(hotelData.checkInDate).toISOString().split('T')[0]} to ${new Date(hotelData.checkOutDate).toISOString().split('T')[0]}`,
                                type: 'new_reservation',
                                relatedBookingId: newBooking.id
                            }
                        });
                    }
                }
            }
            
            // Create notification for user
            await tx.notification.create({
                data: {
                    userId,
                    message: 'Your booking has been confirmed!',
                    type: 'booking_created',
                    relatedBookingId: newBooking.id
                }
            });
            
            return newBooking;
        });

        // Get the complete booking with all related entities for PDF generation
        const completeBooking = await prisma.booking.findUnique({
            where: { id: booking.id },
            include: {
                flightBookings: true,
                hotelBookings: {
                    include: {
                        hotel: {
                            select: {
                                name: true,
                                address: true,
                            }
                        },
                        roomType: {
                            select: {
                                name: true,
                            }
                        }
                    }
                }
            }
        });

        // Generate the PDF invoice
        const invoiceUrl = await generateInvoicePDF(completeBooking);
        
        // Store the invoice URL in the database
        const invoice = await prisma.invoice.create({
            data: {
                bookingId: booking.id,
                invoiceNumber: `INV-${Date.now().toString().slice(-6)}`, // Generate a simple invoice number
                pdfUrl: invoiceUrl,
            }
        });

        // Return the created booking with the invoice URL
        return NextResponse.json({
            ...completeBooking,
            afsBooking: afsBookingResponse, // Include AFS booking details in response
            invoice: {
                fileUrl: invoiceUrl
            }
        }, { status: 201 });
    } catch (error) {
        console.error('Booking creation error:', error);
        
        // Check if it's our custom availability error
        if (error.message && error.message.includes('Not enough rooms available')) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        // Check if it's an AFS API error
        if (error.message && error.message.includes('Failed to book flights with AFS')) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        // General error handler
        return NextResponse.json({ error: 'Error creating booking: ' + error.message }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Get all bookings for the user - FIXED: using correct schema fields
        const bookings = await prisma.booking.findMany({
            where: {
                userId: userId
            },
            include: {
                flightBookings: true,
                hotelBookings: {
                    include: {
                        hotel: {
                            select: {
                                id: true,
                                name: true,
                                address: true,
                                latitude: true,
                                longitude: true,
                                starRating: true
                            }
                        },
                        roomType: {
                            select: {
                                id: true,
                                name: true,
                                pricePerNight: true
                            }
                        }
                    }
                },
                invoice: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        return NextResponse.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return NextResponse.json({ error: 'Error fetching bookings' }, { status: 500 });
    }
}