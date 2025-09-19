#!/bin/bash
# Container startup script

set -e  # Exit immediately if a command exits with a non-zero status

echo "🚀 Starting FlyNext initialization..."
echo "======================================"

# Create upload directories and set permissions
echo "📂 Ensuring upload directories exist..."
mkdir -p ./public/uploads/profile
mkdir -p ./public/uploads/hotels
chmod -R 777 ./public/uploads

# Run Prisma migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy
npx prisma generate

# Wait for postgres to be ready
echo "⏳ Waiting for database connection..."
npx wait-on tcp:postgres:5432 -t 60000

# Run database seeding (but don't fail if it errors)
echo "🌱 Seeding database..."
npx prisma db seed || echo "⚠️ Seeding may have encountered non-critical errors"

echo "✅ Initialization complete! Starting server..."
npm start