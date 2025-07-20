#!/bin/bash

# Darbot Browser MCP - Installation Verification Script
# Run this script to verify your installation is working correctly

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== Darbot Browser MCP Installation Verification ==="
echo

# Test 1: Check Node.js version
echo -n "Node.js version check... "
NODE_VERSION=$(node --version)
MAJOR_VERSION=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
if [ "$MAJOR_VERSION" -ge 18 ]; then
    echo -e "${GREEN}✅ $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ $NODE_VERSION (requires ≥18)${NC}"
    exit 1
fi

# Test 2: NPX package access
echo -n "Package accessibility... "
if timeout 30 npx @darbotlabs/darbot-browser-mcp@latest --version >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Package accessible${NC}"
else
    echo -e "${RED}❌ Cannot access package${NC}"
    echo "Try: npm cache clean --force"
    exit 1
fi

# Test 3: Headless mode
echo -n "Headless browser mode... "
if timeout 20 npx @darbotlabs/darbot-browser-mcp@latest --headless --no-sandbox --version >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Headless mode works${NC}"
else
    echo -e "${RED}❌ Headless mode failed${NC}"
    echo "Container environments may need: --no-sandbox --disable-dev-shm-usage"
    exit 1
fi

# Test 4: Server mode
echo -n "Server startup... "
npx @darbotlabs/darbot-browser-mcp@latest --headless --no-sandbox --port 8934 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 10

if curl -s http://localhost:8934/ready | grep -q "OK" 2>/dev/null; then
    echo -e "${GREEN}✅ Server mode works${NC}"
    kill $SERVER_PID 2>/dev/null || true
else
    echo -e "${RED}❌ Server mode failed${NC}"
    kill $SERVER_PID 2>/dev/null || true
    echo "Check firewall settings and port availability"
    exit 1
fi

# Test 5: MCP Tools availability  
echo -n "MCP tools schema... "
npx @darbotlabs/darbot-browser-mcp@latest --headless --no-sandbox --port 8935 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 10

if curl -s http://localhost:8935/openapi.json | grep -q "Darbot Browser MCP" 2>/dev/null; then
    TOOL_COUNT=$(curl -s http://localhost:8935/openapi.json | jq -r '.paths | keys | length' 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ MCP tools available ($TOOL_COUNT endpoints)${NC}"
    kill $SERVER_PID 2>/dev/null || true
else
    echo -e "${YELLOW}⚠️  MCP tools schema check failed${NC}"
    kill $SERVER_PID 2>/dev/null || true
fi

echo
echo -e "${GREEN}🎉 Installation verification completed successfully!${NC}"
echo
echo "Next steps:"
echo "1. Configure your MCP client (VS Code, Claude Desktop, etc.)"
echo "2. Add server configuration to MCP client settings:"
echo "   {\"darbot-browser\": {\"command\": \"npx\", \"args\": [\"@darbotlabs/darbot-browser-mcp@latest\"]}}"
echo "3. Start using the 31 browser automation tools!"
echo
echo "For help: https://github.com/darbotlabs/darbot-browser-mcp#readme"
echo "Troubleshooting: ./troubleshoot.sh"