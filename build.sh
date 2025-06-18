#!/bin/bash

# GAIT Build Script
# Builds the optimized version with all performance improvements

echo "🔨 Building Optimized GAIT"
echo "==============================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Build the optimized version
echo -e "${BLUE}Building gait with optimizations...${NC}"
if go build -o gait .; then
    echo -e "${GREEN}✓ Build successful!${NC}"
    
    # Show binary info
    echo ""
    echo -e "${BLUE}Binary info:${NC}"
    ls -lh gait
    
    echo ""
    echo -e "${BLUE}Optimizations included:${NC}"
    echo "  ✓ Server-side rendering for commits"
    echo "  ✓ Batch API endpoints (/api/all)"
    echo "  ✓ Intelligent caching (30s TTL)"
    echo "  ✓ Command timeouts"
    echo "  ✓ Concurrent data fetching"
    echo "  ✓ Backward compatibility"
    
    echo ""
    echo -e "${GREEN}🚀 Ready to launch!${NC}"
    echo ""
    echo -e "${YELLOW}To start the server:${NC}"
    echo "  ./gait -port 8080"
    echo ""
    echo -e "${YELLOW}To test performance:${NC}"
    echo "  ./debug.sh"
    echo "  ./benchmark.sh"
    echo ""
    echo -e "${YELLOW}To open in browser:${NC}"
    echo "  open http://localhost:8080"
    
else
    echo -e "${RED}✗ Build failed!${NC}"
    echo ""
    echo "Check for errors above and try again."
    exit 1
fi 