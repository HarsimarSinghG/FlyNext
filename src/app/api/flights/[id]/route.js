import { NextResponse } from 'next/server';

/**
 * Get flight details by ID
 * 
 * This API endpoint retrieves detailed information about a specific flight 
 * from the Advanced Flight System (AFS) API.
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    console.log('Received ID:', id);
    
    // Check for our special separator
    const SEPARATOR = "splitting_here";
    
    // First check if it's a compound ID with our special separator
    if (id.includes(SEPARATOR)) {
      console.log('Detected compound ID with special separator');
      const ids = id.split(SEPARATOR);
      console.log('Split into IDs:', ids);
      
      const flights = [];
      
      // Fetch each flight individually
      for (const flightId of ids) {
        if (!flightId) continue;
        
        console.log(`Fetching individual flight ID: ${flightId}`);
        const response = await fetch(
          `https://advanced-flights-system.replit.app/api/flights/${flightId}`,
          {
            headers: {
              'x-api-key': process.env.AFS_API_KEY,
            },
            cache: 'no-store',
          }
        );
        
        if (!response.ok) {
          console.error(`Failed to fetch flight ${flightId}: ${response.status}`);
          continue;
        }
        
        const flight = await response.json();
        flights.push(flight);
      }
      
      // If we found at least one valid flight, return an itinerary
      if (flights.length > 0) {
        console.log(`Found ${flights.length} flights for itinerary`);
        const itinerary = processItinerary(flights, id);
        return NextResponse.json(itinerary);
      }
    }
    
    // If not a compound ID or no flights found, try to fetch as a single ID
    console.log('Fetching as single flight ID');
    const response = await fetch(
      `https://advanced-flights-system.replit.app/api/flights/${id}`,
      {
        headers: {
          'x-api-key': process.env.AFS_API_KEY,
        },
        cache: 'no-store',
      }
    );
    
    // If successful, return the single flight with enhanced details
    if (response.ok) {
      const flight = await response.json();
      console.log('Successfully fetched single flight');
      
      // Process the single flight with calculated layovers, duration, etc.
      const enhancedFlight = {
        ...flight,
        totalPrice: flight.price,
        totalDuration: flight.duration,
        layovers: [], // Direct flight, no layovers
        class: flight.class || 'ECONOMY',
        baggage: flight.baggage || 'Standard baggage allowance',
        meal: flight.meal !== false,
        wifi: flight.wifi || false,
        power: flight.power || true,
        aircraft: flight.aircraft || 'Commercial Aircraft',
        // Add additional properties for UI display
        isDirectFlight: true,
        flightType: 'Direct Flight'
      };
      
      return NextResponse.json(enhancedFlight);
    }
    
    // If we got here, check if it's a compound ID with '-' or '%' for backward compatibility
    if (id.includes('-') || id.includes('%')) {
      console.log('Detected compound ID with alternate separator (backward compatibility)');
      const ids = id.includes('%') ? id.split('%') : id.split('-');
      const flights = [];
      
      // Fetch each flight individually
      for (const flightId of ids) {
        if (!flightId) continue;
        
        const response = await fetch(
          `https://advanced-flights-system.replit.app/api/flights/${flightId}`,
          {
            headers: {
              'x-api-key': process.env.AFS_API_KEY,
            },
            cache: 'no-store',
          }
        );
        
        if (!response.ok) {
          console.error(`Failed to fetch flight ${flightId}: ${response.status}`);
          continue;
        }
        
        const flight = await response.json();
        flights.push(flight);
      }
      
      // If we found at least one valid flight, return an itinerary
      if (flights.length > 0) {
        console.log(`Found ${flights.length} flights for itinerary`);
        const itinerary = processItinerary(flights, id);
        return NextResponse.json(itinerary);
      }
    }
    
    // If we got here, we couldn't find the flight(s)
    console.log('Flight(s) not found');
    return NextResponse.json({ error: 'Flight(s) not found' }, { status: 404 });
    
  } catch (error) {
    console.error('Error fetching flight details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Process multiple flights into a consistent itinerary format
 */
function processItinerary(flights, itineraryId) {
  // Filter out any invalid flights
  const validFlights = flights.filter(flight => 
    flight && typeof flight === 'object'
  );
  
  if (validFlights.length === 0) {
    return {
      itineraryId,
      flights: [],
      totalPrice: 0,
      currency: 'CAD',
      totalDuration: 0,
      layovers: [],
      departureTime: null,
      arrivalTime: null,
      origin: null,
      destination: null
    };
  }
  
  // Sort flights by departure time if departureTime exists on all flights
  let sortedFlights = [...validFlights];
  
  const allHaveDepartureTime = validFlights.every(flight => flight.departureTime);
  
  if (allHaveDepartureTime) {
    sortedFlights.sort((a, b) => {
      return new Date(a.departureTime) - new Date(b.departureTime);
    });
  }
  
  const firstFlight = sortedFlights[0];
  const lastFlight = sortedFlights[sortedFlights.length - 1];
  
  // Calculate total duration
  let totalDuration = 0;
  if (firstFlight.departureTime && lastFlight.arrivalTime) {
    totalDuration = calculateTotalDuration(
      firstFlight.departureTime,
      lastFlight.arrivalTime
    );
  } else {
    // If we can't calculate total duration, sum individual durations
    totalDuration = sortedFlights.reduce((sum, flight) => sum + (flight.duration || 0), 0);
  }
  
  // Calculate layovers
  const layovers = calculateLayovers(sortedFlights);
  
  // Calculate total price
  const totalPrice = sortedFlights.reduce((sum, flight) => sum + (flight.price || 0), 0);
  
  return {
    id: itineraryId, // Keep both id and itineraryId for consistency 
    itineraryId,
    flights: sortedFlights,
    totalPrice,
    currency: firstFlight.currency || 'CAD',
    totalDuration,
    layovers,
    departureTime: firstFlight.departureTime || null,
    arrivalTime: lastFlight.arrivalTime || null,
    origin: firstFlight.origin || null,
    destination: lastFlight.destination || null,
    class: firstFlight.class || 'ECONOMY',
    baggage: firstFlight.baggage || null,
    isDirectFlight: layovers.length === 0,
    flightType: layovers.length === 0 ? 'Direct Flight' : `${layovers.length} ${layovers.length === 1 ? 'Stop' : 'Stops'}`
  };
}

/**
 * Calculate total duration between departure and arrival in minutes
 */
function calculateTotalDuration(departureTime, arrivalTime) {
  try {
    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);
    
    if (isNaN(departure.getTime()) || isNaN(arrival.getTime())) {
      return 0;
    }
    
    return Math.round((arrival - departure) / (1000 * 60));
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 0;
  }
}

/**
 * Calculate layover information
 */
function calculateLayovers(flights) {
  if (!flights || flights.length <= 1) {
    return [];
  }
  
  const layovers = [];
  
  for (let i = 0; i < flights.length - 1; i++) {
    const currentFlight = flights[i];
    const nextFlight = flights[i + 1];
    
    // Skip if necessary data is missing
    if (!currentFlight || !nextFlight || 
        !currentFlight.arrivalTime || !nextFlight.departureTime || 
        !currentFlight.destination) {
      continue;
    }
    
    try {
      const arrivalTime = new Date(currentFlight.arrivalTime);
      const departureTime = new Date(nextFlight.departureTime);
      
      if (isNaN(arrivalTime.getTime()) || isNaN(departureTime.getTime())) {
        continue;
      }
      
      const duration = Math.round((departureTime - arrivalTime) / (1000 * 60));
      
      layovers.push({
        airport: currentFlight.destination,
        duration, // in minutes
        arrivalTime: currentFlight.arrivalTime,
        departureTime: nextFlight.departureTime
      });
    } catch (error) {
      console.error('Error calculating layover:', error);
    }
  }
  
  return layovers;
}