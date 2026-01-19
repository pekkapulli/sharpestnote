#!/bin/bash

# Onset Detection Model Training Script
# This script runs the complete training pipeline:
# 1. Preprocess raw data
# 2. Train the model

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Onset Detection Training Pipeline ===${NC}"
echo ""

# Step 1: Preprocess data
echo -e "${YELLOW}Step 1: Preprocessing raw data...${NC}"
python scripts/preprocess.py

echo ""

# Step 2: Train model
echo -e "${YELLOW}Step 2: Training model...${NC}"
python scripts/train.py

echo ""
echo -e "${GREEN}=== Training Pipeline Complete ===${NC}"
