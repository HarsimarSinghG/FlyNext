# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Add necessary build dependencies for bcrypt
RUN apk add --no-cache python3 make g++

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy prisma schema
COPY prisma ./prisma/

# Copy the rest of the application
COPY . .

# Update the schema.prisma file to use PostgreSQL
RUN sed -i 's|provider = "sqlite"|provider = "postgresql"|g' ./prisma/schema.prisma
RUN sed -i 's|url      = "file:./database.sqlite"|url      = env("DATABASE_URL")|g' ./prisma/schema.prisma

# Generate Prisma client
RUN npx prisma generate

# Rebuild bcrypt for Alpine
RUN npm rebuild bcrypt --build-from-source

# Build the Next.js application
RUN npm run build

# Stage 2: Runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install production-only dependencies
RUN apk add --no-cache bash

# Install wait-on utility
RUN npm install -g wait-on

# Copy package.json files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy prisma from builder stage
COPY --from=builder /app/prisma ./prisma/

# Copy .next directory, public directory, and necessary files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create required directories with proper permissions
RUN mkdir -p ./public/uploads/profile ./public/uploads/hotels ./public/invoices
RUN chmod -R 777 ./public/uploads ./public/invoices

# Create startup script
RUN echo '#!/bin/sh' > /app/startup.sh \
    && echo 'echo "Running migrations..."' >> /app/startup.sh \
    && echo 'npx prisma migrate deploy' >> /app/startup.sh \
    && echo 'echo "Migration completed. Now seeding database..."' >> /app/startup.sh \
    && echo 'npx prisma db seed || { echo "Seeding failed"; cat /app/prisma/seed-error.log; }' >> /app/startup.sh \
    && echo 'echo "Starting the application..."' >> /app/startup.sh \
    && echo 'npm start' >> /app/startup.sh \
    && chmod +x /app/startup.sh

EXPOSE 3000

CMD ["/app/startup.sh"]