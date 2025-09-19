import { NextResponse } from 'next/server';

/**
 * Location search endpoint for autocomplete functionality
 * Searches both cities and airports from AFS API based on the provided query
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.toLowerCase();
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    // Fetch cities and airports from AFS
    const [citiesResponse, airportsResponse] = await Promise.all([
      fetch('https://advanced-flights-system.replit.app/api/cities', {
        headers: {
          'x-api-key': process.env.AFS_API_KEY
        }
      }),
      fetch('https://advanced-flights-system.replit.app/api/airports', {
        headers: {
          'x-api-key': process.env.AFS_API_KEY
        }
      })
    ]);

    if (!citiesResponse.ok || !airportsResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch location data from AFS' }, 
        { status: 500 }
      );
    }

    const cities = await citiesResponse.json();
    const airports = await airportsResponse.json();

    // Filter cities based on query
    const filteredCities = cities
      .filter(city => 
        city.city.toLowerCase().includes(query) || 
        city.country.toLowerCase().includes(query)
      )
      .map(city => ({
        id: `city-${city.city}`,
        name: city.city,
        country: city.country,
        type: 'city'
      }));

    // Filter airports based on query
    const filteredAirports = airports
      .filter(airport => 
        airport.name.toLowerCase().includes(query) || 
        airport.city.toLowerCase().includes(query) || 
        airport.code.toLowerCase().includes(query) || 
        airport.country.toLowerCase().includes(query)
      )
      .map(airport => ({
        id: airport.id,
        name: airport.name,
        code: airport.code,
        city: airport.city,
        country: airport.country,
        type: 'airport'
      }));

    // Combine and sort results
    // Prioritize exact matches, then sort alphabetically
    const results = [...filteredCities, ...filteredAirports]
      .sort((a, b) => {
        // Exact matches first
        const aExact = a.name.toLowerCase() === query;
        const bExact = b.name.toLowerCase() === query;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then sort by if it starts with the query
        const aStarts = a.name.toLowerCase().startsWith(query);
        const bStarts = b.name.toLowerCase().startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Finally sort alphabetically
        return a.name.localeCompare(b.name);
      })
      .slice(0, 10); // Limit results to avoid overwhelming the user

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in location search:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
}