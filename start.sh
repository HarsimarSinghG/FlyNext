#!/bin/bash
# Start script for FlyNext application

# Terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting FlyNext Application ===${NC}"

# Create necessary upload directories if they don't exist
echo -e "${YELLOW}Creating upload directories...${NC}"
mkdir -p ./public/uploads/profile
mkdir -p ./public/uploads/hotels

# Fix permissions
echo -e "${YELLOW}Setting correct permissions...${NC}"
chmod -R 777 ./public/uploads

# Build and start the containers
echo -e "${GREEN}Building and starting Docker containers...${NC}"
docker-compose up -d --build

echo -e "${BLUE}=== FlyNext is starting... ===${NC}"
echo -e "${GREEN}You can access the application at http://localhost:3000${NC}"

# Show logs
echo -e "${YELLOW}Showing application logs (Ctrl+C to exit logs, app will continue running)${NC}"
docker-compose logs -f app