import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

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
  const { id } = params;
  
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the flight booking using the id parameter
    const flightBooking = await prisma.flightBooking.findUnique({
      where: { id: id },
      include: { 
        booking: {
          include: {
            user: {
              select: {
                lastName: true,
                firstName: true,
                email: true,
                passportNumber: true
              }
            }
          }
        }
      }
    });

    // Verify the booking exists and belongs to the user
    if (!flightBooking) {
      return NextResponse.json({ error: 'Flight booking not found' }, { status: 404 });
    }
    
    if (flightBooking.booking.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use the AFS booking reference to verify the flight with the AFS booking retrieval API
    if (!flightBooking.afsBookingReference) {
      return NextResponse.json({ error: 'No AFS booking reference found for this flight' }, { status: 400 });
    }

    // Build query parameters for the booking retrieval
    const queryParams = new URLSearchParams({
      bookingReference: flightBooking.afsBookingReference,
      lastName: flightBooking.booking.user.lastName
    });

    // Call the AFS booking retrieve API
    const retrieveResponse = await fetch(
      `https://advanced-flights-system.replit.app/api/bookings/retrieve?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': process.env.AFS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!retrieveResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to verify booking with AFS', statusCode: retrieveResponse.status },
        { status: 500 }
      );
    }

    const afsBooking = await retrieveResponse.json();

    // Find the specific flight in the AFS booking that matches our flight ID
    const matchingFlight = afsBooking.flights.find(flight => flight.id === flightBooking.afsFlightId);
    
    if (!matchingFlight) {
      return NextResponse.json(
        { error: 'Flight not found in the AFS booking' },
        { status: 404 }
      );
    }

    // Extract flight status from AFS booking
    const flightStatus = matchingFlight.status || 'UNKNOWN';
    
    // Check if the flight is still confirmed/scheduled
    const isFlightConfirmed = flightStatus === 'SCHEDULED' || flightStatus === 'CONFIRMED';

    // Return the verification data with information from AFS
    return NextResponse.json({
      flightId: flightBooking.id,
      bookingReference: afsBooking.bookingReference,
      ticketNumber: afsBooking.ticketNumber,
      status: flightStatus,
      verified: isFlightConfirmed,
      departureTime: matchingFlight.departureTime,
      arrivalTime: matchingFlight.arrivalTime,
      origin: matchingFlight.origin.code,
      destination: matchingFlight.destination.code,
      airline: matchingFlight.airline,
      flightNumber: matchingFlight.flightNumber,
      message: isFlightConfirmed 
        ? 'Flight schedule is confirmed.' 
        : `Flight status is ${flightStatus}. Please check with the airline.`,
      lastVerified: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error verifying flight:', error);
    return NextResponse.json({ error: 'Error verifying flight', details: error.message }, { status: 500 });
  }
}