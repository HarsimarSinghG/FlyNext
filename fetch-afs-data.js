const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');

const prisma = new PrismaClient();

// Get student ID from env or use a default for development
const apiKey = process.env.AFS_API_KEY;

console.log(`Using API Key: ${apiKey.substring(0, 10)}...`);

async function fetchCities() {
  try {
    console.log('🌎 Fetching cities from AFS...');
    const response = await axios.get('https://advanced-flights-system.replit.app/api/cities', {
      headers: {
        'x-api-key': apiKey
      }
    });
    
    console.log(`Found ${response.data.length} cities`);
    
    // Save cities to the database - SQLite compatible (no upsert)
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const city of response.data) {
      try {
        // Check if city already exists
        const existingCity = await prisma.city.findFirst({
          where: { 
            AND: [
              { name: city.city },
              { country: city.country }
            ]
          }
        });
        
        if (existingCity) {
          // Update existing city
          await prisma.city.update({
            where: { id: existingCity.id },
            data: { updatedAt: new Date() }
          });
          updatedCount++;
        } else {
          // Create new city
          await prisma.city.create({
            data: {
              name: city.city,
              country: city.country,
              updatedAt: new Date()
            }
          });
          createdCount++;
        }
      } catch (error) {
        console.log(`⚠️ Could not process city ${city.city}: ${error.message}`);
      }
    }
    
    console.log(`✅ Cities: ${createdCount} created, ${updatedCount} updated`);
    
    // Save raw data for debugging
    fs.writeFileSync('cities-data.json', JSON.stringify(response.data, null, 2));
    console.log('📄 Raw city data saved to cities-data.json');
    
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching cities:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

async function fetchAirports() {
  try {
    console.log('✈️ Fetching airports from AFS...');
    const response = await axios.get('https://advanced-flights-system.replit.app/api/airports', {
      headers: {
        'x-api-key': apiKey
      }
    });
    
    console.log(`Found ${response.data.length} airports`);
    
    // First get all cities from our database for lookup
    const cities = await prisma.city.findMany();
    const cityMap = new Map();
    
    cities.forEach(city => {
      cityMap.set(`${city.name}-${city.country}`, city.id);
    });
    
    // Save airports to the database - SQLite compatible (no upsert)
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const airport of response.data) {
      try {
        // Look up the city ID
        const cityKey = `${airport.city}-${airport.country}`;
        const cityId = cityMap.get(cityKey);
        
        // Check if airport already exists
        const existingAirport = await prisma.airport.findUnique({
          where: { code: airport.code }
        });
        
        if (existingAirport) {
          // Update existing airport
          await prisma.airport.update({
            where: { code: airport.code },
            data: {
              name: airport.name,
              city: airport.city,
              country: airport.country,
              cityId: cityId || null,
              afsId: airport.id,
              updatedAt: new Date()
            }
          });
          updatedCount++;
        } else {
          // Create new airport
          await prisma.airport.create({
            data: {
              code: airport.code,
              name: airport.name,
              city: airport.city,
              country: airport.country,
              cityId: cityId || null,
              afsId: airport.id,
              updatedAt: new Date()
            }
          });
          createdCount++;
        }
      } catch (error) {
        console.log(`⚠️ Could not process airport ${airport.code}: ${error.message}`);
      }
    }
    
    console.log(`✅ Airports: ${createdCount} created, ${updatedCount} updated`);
    
    // Save raw data for debugging
    fs.writeFileSync('airports-data.json', JSON.stringify(response.data, null, 2));
    console.log('📄 Raw airport data saved to airports-data.json');
    
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching airports:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}


async function main() {
  try {
    await fetchCities();
    await fetchAirports();
    console.log('🎉 All data fetched successfully!');
  } catch (error) {
    console.error('Failed to complete data fetching:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
