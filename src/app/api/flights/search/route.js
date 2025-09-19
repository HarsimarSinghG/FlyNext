import { NextResponse } from 'next/server';

/**
 * Flight search endpoint
 * Searches for flights based on origin, destination, and dates
 * Supports both one-way and round-trip searches
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const departureDate = searchParams.get('departureDate');
    const returnDate = searchParams.get('returnDate'); // Optional for round-trip

    // Validate required parameters
    if (!origin || !destination || !departureDate) {
      return NextResponse.json(
        { error: 'Origin, destination, and departure date are required' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(departureDate) || (returnDate && !dateRegex.test(returnDate))) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Search for outbound flights
    const outboundResponse = await fetch(
      `https://advanced-flights-system.replit.app/api/flights?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${departureDate}`,
      {
        headers: {
          'x-api-key': process.env.AFS_API_KEY
        }
      }
    );

    if (!outboundResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch flight data from AFS' },
        { status: 500 }
      );
    }

    const outboundData = await outboundResponse.json();
    
    // If it's a one-way trip
    if (!returnDate) {
      return NextResponse.json({
        tripType: 'one-way',
        outbound: processFlightResults(outboundData.results)
      });
    }

    // For round trips, search for return flights
    const returnResponse = await fetch(
      `https://advanced-flights-system.replit.app/api/flights?origin=${encodeURIComponent(destination)}&destination=${encodeURIComponent(origin)}&date=${returnDate}`,
      {
        headers: {
          'x-api-key': process.env.AFS_API_KEY
        }
      }
    );

    if (!returnResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch return flight data from AFS' },
        { status: 500 }
      );
    }

    const returnData = await returnResponse.json();

    return NextResponse.json({
      tripType: 'round-trip',
      outbound: processFlightResults(outboundData.results),
      return: processFlightResults(returnData.results)
    });

  } catch (error) {
    console.error('Error in flight search:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Process and enhance flight results
 * @param {Array} results - Flight results from AFS
 * @returns {Array} - Processed flight results with additional data
 */
function processFlightResults(results) {
  if (!results || results.length === 0) {
    return [];
  }

  return results.map(result => {
    // Calculate total price for multi-leg flights
    const totalPrice = result.flights.reduce((sum, flight) => sum + flight.price, 0);
    
    // Calculate total duration including layovers
    const firstFlight = result.flights[0];
    const lastFlight = result.flights[result.flights.length - 1];
    const totalDuration = calculateTotalDuration(firstFlight.departureTime, lastFlight.arrivalTime);
    
    // Calculate layover info
    const layovers = calculateLayovers(result.flights);

    return {
      id: result.id,
      itineraryId: generateItineraryId(result),
      flights: result.flights,
      legs: result.legs,
      totalPrice: totalPrice,
      currency: result.flights[0].currency,
      totalDuration: totalDuration, // in minutes
      layovers: layovers,
      departureTime: firstFlight.departureTime,
      arrivalTime: lastFlight.arrivalTime,
      origin: firstFlight.origin,
      destination: lastFlight.destination
    };
  });
}

/**
 * Calculate total duration between departure and arrival in minutes
 */
function calculateTotalDuration(departureTime, arrivalTime) {
  const departure = new Date(departureTime);
  const arrival = new Date(arrivalTime);
  return Math.round((arrival - departure) / (1000 * 60));
}

/**
 * Calculate layover information
 */
function calculateLayovers(flights) {
  if (flights.length <= 1) {
    return [];
  }
  
  const layovers = [];
  for (let i = 0; i < flights.length - 1; i++) {
    const currentFlight = flights[i];
    const nextFlight = flights[i + 1];
    
    const arrivalTime = new Date(currentFlight.arrivalTime);
    const departureTime = new Date(nextFlight.departureTime);
    const duration = Math.round((departureTime - arrivalTime) / (1000 * 60)); // in minutes
    
    layovers.push({
      airport: currentFlight.destination,
      duration: duration, // in minutes
      arrivalTime: currentFlight.arrivalTime,
      departureTime: nextFlight.departureTime
    });
  }
  
  return layovers;
}

/**
 * Generate a unique ID for the itinerary
 */
function generateItineraryId(result) {
  return result.flights.map(flight => flight.id).join('-');
}