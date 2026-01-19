#!/bin/bash

# Onset Detection Model Training Script
# This script runs the complete training pipeline:
# 1. Activate virtual environment
# 2. Preprocess raw data
# 3. Train the model
# 4. Evaluate the model

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Onset Detection Training Pipeline ===${NC}"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Install/update requirements
echo -e "${YELLOW}Installing dependencies...${NC}"
pip install -q -r requirements.txt

echo ""
echo -e "${GREEN}✓ Environment ready${NC}"
echo ""

# Step 1: Preprocess data
echo -e "${YELLOW}Step 1: Preprocessing raw data...${NC}"
if python3 scripts/preprocess.py; then
    echo -e "${GREEN}✓ Preprocessing complete${NC}"
else
    echo -e "${RED}✗ Preprocessing failed${NC}"
    exit 1
fi

echo ""

# Step 2: Train model
echo -e "${YELLOW}Step 2: Training model...${NC}"
if python3 scripts/train.py; then
    echo -e "${GREEN}✓ Training complete${NC}"
else
    echo -e "${RED}✗ Training failed${NC}"
    exit 1
fi

echo ""

# Step 3: Evaluate model
echo -e "${YELLOW}Step 3: Evaluating model...${NC}"
if python3 scripts/evaluate.py; then
    echo -e "${GREEN}✓ Evaluation complete${NC}"
else
    echo -e "${RED}✗ Evaluation failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Training Pipeline Complete ===${NC}"
echo ""
echo "Model saved to: models/saved/"
echo "Training plots saved to: models/saved/training_history.png"
