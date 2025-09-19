const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('Checking database content...');
    
    // Check for cities
    const cityCount = await prisma.city.count();
    console.log(`City count: ${cityCount}`);
    
    // Check for hotels
    const hotelCount = await prisma.hotel.count();
    console.log(`Hotel count: ${hotelCount}`);
    
    // Check for rooms
    const roomCount = await prisma.room.count();
    console.log(`Room count: ${roomCount}`);
    
    if (hotelCount === 0) {
      console.log('Database is empty. Seeding might have failed.');
    } else {
      console.log('Database has content. Seeding appears successful.');
      
      // Get sample hotel data
      const sampleHotel = await prisma.hotel.findFirst({
        include: { rooms: true }
      });
      
      console.log('Sample hotel:');
      console.log(JSON.stringify(sampleHotel, null, 2));
    }
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();