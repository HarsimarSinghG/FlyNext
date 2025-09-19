const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const hotelOwnerEmail = 'hotelowner@example.com'; // Replace with your actual hotel owner email

const hotelNames = [
  'Grand Hotel Plaza', 'Oceanview Resort', 'City Center Suites', 'Mountain Retreat', 
  'Harbourfront Hotel', 'Royal Palace Hotel', 'Sunset Bay Resort', 'The Metropolitan',
  'Park View Inn', 'Skyline Tower Hotel', 'Golden Sands Resort', 'Heritage Mansion Hotel',
  'The Ritz Plaza', 'Evergreen Resort', 'Lakeside Hotel', 'Marina Bay Hotel',
  'Valley View Lodge', 'Diamond Hotel', 'Windsor Castle Hotel', 'Tropical Paradise Resort',
  'The Landmark Hotel', 'Riverside Inn', 'Harmony Resort', 'Blue Horizon Hotel',
  'The Peninsula Hotel', 'Silver Moon Resort', 'Grand Millennium Hotel', 'Oasis Hotel & Spa',
  'Emerald Palace Hotel', 'Crystal Springs Resort', 'The Majestic Hotel', 'Alpine Lodge',
  'Garden Court Hotel', 'Seaside Resort', 'Urban Luxury Suites', 'The Grand Legacy',
  'Waterfront Hotel', 'Sunshine Resort', 'Cosmopolitan Hotel', 'The Regency Hotel',
  'Palm Beach Resort', 'The Excelsior', 'Ivy Hotel & Spa', 'Harbor View Hotel',
  'The Ambassador', 'Continental Resort', 'Four Seasons Hotel', 'The Royale',
  'Hilltop Retreat', 'Beachcomber Resort'
];

const roomTypes = [
  {
    name: 'Standard Room',
    amenities: ['Wi-Fi', 'TV', 'Air conditioning', 'Mini-bar'],
    pricePerNight: 99.99,
    baseAvailability: 10
  },
  {
    name: 'Deluxe Room',
    amenities: ['Wi-Fi', 'TV', 'Air conditioning', 'Mini-bar', 'Coffee maker', 'Bathtub'],
    pricePerNight: 149.99,
    baseAvailability: 7
  },
  {
    name: 'Suite',
    amenities: ['Wi-Fi', 'TV', 'Air conditioning', 'Mini-bar', 'Coffee maker', 'Bathtub', 'Separate living area', 'Kitchenette'],
    pricePerNight: 249.99,
    baseAvailability: 5
  },
  {
    name: 'Executive Suite',
    amenities: ['Wi-Fi', 'TV', 'Air conditioning', 'Mini-bar', 'Coffee maker', 'Bathtub', 'Separate living area', 'Kitchenette', 'Jacuzzi', 'City view'],
    pricePerNight: 349.99,
    baseAvailability: 3
  }
];

const cities = [
  { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.0060 },
  { name: 'Los Angeles', country: 'United States', lat: 34.0522, lng: -118.2437 },
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018 }
];

const getUnsplashImage = (category, width = 1200, height = 800, index) => {
  return `https://images.unsplash.com/photo-${index % 5 === 0 ? '1566073771259-6a8506099945' : 
    index % 4 === 0 ? '1551882547-ff40c63fe5fa' : 
    index % 3 === 0 ? '1564501049412-61c2a3898a55' : 
    index % 2 === 0 ? '1578683010236-d716f9a3f461' : 
    '1571003123894-1f0594d2b5d9'}?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=${width}&h=${height}&q=80`;
};

const getRandomRoomImages = (index) => {
  return [
    getUnsplashImage('room', 800, 600, index),
    getUnsplashImage('room', 800, 600, index + 5),
    getUnsplashImage('bathroom', 800, 600, index + 10)
  ];
};

const getRandomHotelImages = (index) => {
  return [
    getUnsplashImage('hotel', 1200, 800, index),
    getUnsplashImage('lobby', 1200, 800, index + 20),
    getUnsplashImage('hotel-exterior', 1200, 800, index + 30),
    getUnsplashImage('hotel-pool', 1200, 800, index + 40),
    getUnsplashImage('hotel-restaurant', 1200, 800, index + 50)
  ];
};

async function seedHotels() {
  try {
    // First find the hotel owner user
    const owner = await prisma.user.findUnique({
      where: { email: hotelOwnerEmail }
    });

    if (!owner) {
      console.log(`User with email ${hotelOwnerEmail} not found. Creating one...`);
      
      // Create a hotel owner user if not exists
      const newOwner = await prisma.user.create({
        data: {
          email: hotelOwnerEmail,
          passwordHash: '$2a$10$uQnUWf8YaZrj.4XZd6UBPOoAjaiMRMZOfWRnYA3RYcPvMsJX6RM0y', // hashed password for 'password123'
          firstName: 'Hotel',
          lastName: 'Owner',
          role: 'hotel_owner'
        }
      });
      
      console.log('Created new hotel owner:', newOwner.id);
      ownerId = newOwner.id;
    } else {
      console.log('Using existing hotel owner:', owner.id);
      ownerId = owner.id;
    }

    for (let i = 0; i < 50; i++) {
      const cityIndex = i % cities.length;
      const city = cities[cityIndex];
      
      // Add some randomness to latitude and longitude within the city
      const latOffset = (Math.random() - 0.5) * 0.1;
      const lngOffset = (Math.random() - 0.5) * 0.1;
      
      // Create hotel
      const hotel = await prisma.hotel.create({
        data: {
          ownerId: ownerId,
          name: hotelNames[i],
          address: `${Math.floor(Math.random() * 999) + 1} ${['Main St', 'Park Ave', 'Broadway', 'Ocean Dr', 'Market St'][i % 5]}, ${city.name}, ${city.country}`,
          latitude: city.lat + latOffset,
          longitude: city.lng + lngOffset,
          starRating: Math.floor(Math.random() * 3) + 3, // 3-5 stars
          logoUrl: getUnsplashImage('logo', 200, 200, i),
          images: getRandomHotelImages(i),
        }
      });
      
      console.log(`Created hotel: ${hotel.name}`);
      
      // Create room types for this hotel
      for (const roomType of roomTypes) {
        await prisma.roomType.create({
          data: {
            hotelId: hotel.id,
            name: roomType.name,
            amenities: roomType.amenities,
            pricePerNight: roomType.pricePerNight * (hotel.starRating / 3), // Price scales with star rating
            images: getRandomRoomImages(i * 4 + roomTypes.indexOf(roomType)),
            baseAvailability: roomType.baseAvailability
          }
        });
      }
      
      console.log(`Created room types for hotel: ${hotel.name}`);
    }
    
    console.log('Hotel seeding completed successfully');
  } catch (error) {
    console.error('Error seeding hotels:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedHotels()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
