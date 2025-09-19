#!/bin/bash
# Stop script for FlyNext application

# Terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Stopping FlyNext Application ===${NC}"

# Stop the containers
echo -e "${YELLOW}Stopping Docker containers...${NC}"
docker-compose down

echo -e "${GREEN}FlyNext has been stopped successfully.${NC}"