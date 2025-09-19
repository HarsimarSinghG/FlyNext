// This script can be executed manually inside the Docker container
const { exec } = require('child_process');

console.log('Running manual database seeding...');

// Execute the Prisma seed command
exec('npx prisma db seed', (error, stdout, stderr) => {
  if (error) {
    console.error(`Seed execution error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Seed stderr: ${stderr}`);
    return;
  }
  console.log(`Seed stdout: ${stdout}`);
});