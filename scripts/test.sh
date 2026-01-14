#!/bin/bash

# Exit on any failure
set -e

# ANSI color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting DataCert Test Suite...${NC}"

# 1. Rust Core Tests
echo -e "\n${BLUE}1. Running Rust unit tests...${NC}"
cd src/wasm
cargo test
cd ../..
echo -e "${GREEN}Rust tests passed!${NC}"

# 2. TypeScript Unit Tests
echo -e "\n${BLUE}2. Running TypeScript unit tests...${NC}"
npm run test:unit
echo -e "${GREEN}TypeScript unit tests passed!${NC}"

# 3. Integration Tests
echo -e "\n${BLUE}3. Running integration tests...${NC}"
npm run test:integration
echo -e "${GREEN}Integration tests passed!${NC}"

# 4. Accuracy Tests
echo -e "\n${BLUE}4. Running accuracy (baseline) tests...${NC}"
npm run test:accuracy
echo -e "${GREEN}Accuracy tests passed!${NC}"

echo -e "\n${GREEN}✓ All test suites completed successfully!${NC}"
