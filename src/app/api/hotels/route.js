import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

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

// GET: List or search hotels
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const city = searchParams.get('city');
        const name = searchParams.get('name');
        const minRating = searchParams.get('minRating');
        const maxRating = searchParams.get('maxRating');
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        const checkInDate = searchParams.get('checkInDate');
        const checkOutDate = searchParams.get('checkOutDate');

        // Log the search parameters for debugging
        console.log('Search params:', { city, name, minRating, maxRating, minPrice, maxPrice, checkInDate, checkOutDate });

        // Build the where clause for the query
        let whereClause = {};
        
        // Search by hotel name (case insensitive)
        if (name) {
            whereClause.name = { 
                contains: name,
                mode: 'insensitive' // Case-insensitive search for PostgreSQL
            };
        }
        
        // For city search, use case-insensitive search in the address field
        if (city) {
            whereClause.address = { 
                contains: city,
                mode: 'insensitive' // Case-insensitive search for PostgreSQL
            };
        }
        
        // Filter by star rating
        if (minRating || maxRating) {
            whereClause.starRating = {};
            if (minRating) whereClause.starRating.gte = parseInt(minRating);
            if (maxRating) whereClause.starRating.lte = parseInt(maxRating);
        }

        // Log the constructed where clause
        console.log('Where clause:', JSON.stringify(whereClause));

        // Get hotels that match the basic criteria
        const hotels = await prisma.hotel.findMany({
            where: whereClause,
            include: {
                roomTypes: {
                    include: {
                        availability: checkInDate && checkOutDate ? {
                            where: {
                                date: {
                                    gte: new Date(checkInDate),
                                    lte: new Date(checkOutDate)
                                },
                                availableRooms: { gt: 0 }
                            }
                        } : false // Set to false when dates not provided to reduce query size
                    }
                }
            },
        });

        console.log(`Found ${hotels.length} hotels matching basic criteria`);

        // Further filter results if date range is provided
        let filteredHotels = hotels;
        if (checkInDate && checkOutDate) {
            const startDate = new Date(checkInDate);
            const endDate = new Date(checkOutDate);
            
            // Filter hotels that have at least one room type with availability
            filteredHotels = hotels.filter(hotel => {
                return hotel.roomTypes.some(roomType => {
                    // If we have availability records for all dates and they all show available rooms
                    if (roomType.availability && roomType.availability.length > 0) {
                        // Count how many days the room type is available
                        let availableDays = 0;
                        const requiredDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                        
                        // Check each availability record
                        for (const record of roomType.availability) {
                            if (record.availableRooms > 0) {
                                availableDays++;
                            }
                        }
                        
                        return availableDays >= requiredDays;
                    } else {
                        // If no specific availability records but baseAvailability > 0
                        return roomType.baseAvailability > 0;
                    }
                });
            });
            
            console.log(`Filtered to ${filteredHotels.length} hotels with availability`);
            
            // Add starting price based on the lowest room price for those dates
            filteredHotels = filteredHotels.map(hotel => {
                let startingPrice = null;
                
                // Find the lowest priced available room
                hotel.roomTypes.forEach(roomType => {
                    // If room type is available and price is lower than current startingPrice (or startingPrice is not set)
                    if ((roomType.availability?.length > 0 || roomType.baseAvailability > 0) && 
                        (!startingPrice || roomType.pricePerNight < startingPrice)) {
                        startingPrice = roomType.pricePerNight;
                    }
                });
                
                // Return the hotel with the starting price
                return {
                    ...hotel,
                    roomTypes: undefined, // Remove the room types to clean the response
                    startingPrice
                };
            });
        } else {
            // If no date range, just set the starting price to the lowest room price
            filteredHotels = filteredHotels.map(hotel => {
                let startingPrice = null;
                
                hotel.roomTypes.forEach(roomType => {
                    if (!startingPrice || roomType.pricePerNight < startingPrice) {
                        startingPrice = roomType.pricePerNight;
                    }
                });
                
                return {
                    ...hotel,
                    roomTypes: undefined, // Remove the room types to clean the response
                    startingPrice
                };
            });
        }
        
        // Apply price filters if provided
        if (minPrice || maxPrice) {
            filteredHotels = filteredHotels.filter(hotel => {
                // If no starting price, filter it out when price filters are applied
                if (!hotel.startingPrice) return false;
                
                // Apply min and max price filters
                return (!minPrice || hotel.startingPrice >= parseFloat(minPrice)) && 
                       (!maxPrice || hotel.startingPrice <= parseFloat(maxPrice));
            });
            
            console.log(`Filtered to ${filteredHotels.length} hotels within price range`);
        }

        // Return the filtered hotels
        return NextResponse.json(filteredHotels);
    } catch (error) {
        console.error('Error in GET /api/hotels:', error);
        return NextResponse.json({ error: 'Error fetching hotels' }, { status: 500 });
    }
}

// POST: Create a new hotel (Hotel Owner role ideally)
export async function POST(request) {
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        // e.g. { name, address, latitude, longitude, starRating, logoUrl, images }

        const newHotel = await prisma.hotel.create({
            data: {
                ownerId: userId,
                ...body,
            },
        });

        return NextResponse.json(newHotel, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error creating hotel' }, { status: 500 });
    }
}