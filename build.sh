#!/bin/bash

# Vercel build script for FlyNext
echo "Starting Vercel build process..."

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Build Next.js application
echo "Building Next.js application..."
npm run build

echo "Build completed successfully!"
