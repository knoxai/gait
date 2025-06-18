#!/bin/bash

# GAIT Debug Script
# Helps test and monitor the optimized application

echo "🔧 GAIT Debug Helper"
echo "========================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PORT=${1:-8080}

echo -e "${BLUE}Server Status:${NC}"
if ps aux | grep -v grep | grep "gait" > /dev/null; then
    echo -e "${GREEN}✓ GAIT server is running${NC}"
    ps aux | grep -v grep | grep "gait" | while read line; do
        echo "  $line"
    done
else
    echo -e "${RED}✗ No GAIT server running${NC}"
    echo ""
    echo "To start the optimized server:"
    echo "  ./gait-optimized -port $PORT"
    exit 1
fi

echo ""
echo -e "${BLUE}Quick Health Check:${NC}"

# Test main endpoints
echo -n "Main page: "
if curl -s -f "http://localhost:$PORT/" > /dev/null; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

echo -n "Batch API: "
if curl -s -f "http://localhost:$PORT/api/all?limit=1" > /dev/null; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

echo -n "Server-side rendering: "
if curl -s -f "http://localhost:$PORT/api/commits/html?limit=1" > /dev/null; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

echo -n "Original API compatibility: "
if curl -s -f "http://localhost:$PORT/api/commits?limit=1" > /dev/null; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

echo ""
echo -e "${BLUE}Performance Test:${NC}"

echo "Testing response times..."
echo -n "Batch API (50 commits): "
batch_time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:$PORT/api/all?limit=50")
echo "${batch_time}s"

echo -n "Server-side rendering: "
ssr_time=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:$PORT/api/commits/html?limit=50")
echo "${ssr_time}s"

echo -n "Caching test (branches): "
cache_time1=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:$PORT/api/branches")
cache_time2=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:$PORT/api/branches")
echo "First: ${cache_time1}s, Second: ${cache_time2}s"

echo ""
echo -e "${BLUE}Repository Info:${NC}"
repo_info=$(curl -s "http://localhost:$PORT/api/all?limit=1" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'Commits: {len(data.get(\"commits\", []))}')
    print(f'Branches: {len(data.get(\"branches\", []))}')
    print(f'Tags: {len(data.get(\"tags\", []))}')
    print(f'Stashes: {len(data.get(\"stashes\", []))}')
    print(f'Remotes: {len(data.get(\"remotes\", []))}')
except:
    print('Could not parse repository info')
" 2>/dev/null)

if [ -n "$repo_info" ]; then
    echo "$repo_info"
else
    echo "Repository info not available"
fi

echo ""
echo -e "${BLUE}Useful URLs:${NC}"
echo "Main application: http://localhost:$PORT"
echo "Performance tests: http://localhost:$PORT/performance-test.html"
echo "Batch API: http://localhost:$PORT/api/all"
echo "Server-side rendering: http://localhost:$PORT/api/commits/html"

echo ""
echo -e "${YELLOW}Debug Commands:${NC}"
echo "# View server logs:"
echo "tail -f /tmp/gait.log"
echo ""
echo "# Test specific endpoints:"
echo "curl -s 'http://localhost:$PORT/api/all?limit=5' | python3 -m json.tool"
echo "curl -s 'http://localhost:$PORT/api/commits/html?limit=3'"
echo ""
echo "# Monitor performance:"
echo "watch -n 1 'curl -s -w \"Response time: %{time_total}s\\n\" -o /dev/null http://localhost:$PORT/api/all'"
echo ""
echo "# Stop server:"
echo "pkill -f gait"

echo ""
echo -e "${GREEN}🎉 Debug complete! Open http://localhost:$PORT in your browser${NC}" 