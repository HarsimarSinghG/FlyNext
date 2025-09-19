#!/bin/bash
# Import data script for FlyNext application

# Terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Importing Data for FlyNext Application ===${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running or not accessible${NC}"
  exit 1
fi

# Check if containers are running
if ! docker-compose ps | grep -q "flynext-app.*Up"; then
  echo -e "${YELLOW}FlyNext containers are not running. Starting them first...${NC}"
  ./start.sh
fi

echo -e "${YELLOW}Importing database data...${NC}"
docker-compose exec app npx prisma migrate reset --force
docker-compose exec app npx prisma generate

# Run the AFS data fetch script
echo -e "${YELLOW}Fetching AFS data...${NC}"
docker-compose exec app node fetch-afs-data.js

echo -e "${GREEN}Data import completed successfully!${NC}"