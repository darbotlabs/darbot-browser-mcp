#!/bin/bash
#
# Setup Dev Tunnel for Darbot Browser MCP
# Automated setup script for VS Code dev tunnels
#

set -e

echo "=================================================="
echo "Darbot Browser MCP - Dev Tunnel Setup"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TUNNEL_NAME="${TUNNEL_NAME:-darbot-browser-mcp}"
TUNNEL_ACCESS="${TUNNEL_ACCESS:-private}"
PORT="${PORT:-8080}"

# Check if code CLI is installed
echo "Checking VS Code CLI installation..."
if ! command -v code &> /dev/null; then
    echo -e "${RED}VS Code CLI not found!${NC}"
    echo ""
    echo "Install instructions:"
    echo "  Windows: winget install Microsoft.VisualStudioCode"
    echo "  macOS:   brew install --cask visual-studio-code"
    echo "  Linux:   sudo snap install code --classic"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ VS Code CLI installed${NC}"
code --version

# Check if user is logged in
echo ""
echo "Checking GitHub authentication..."
if ! code tunnel user show &> /dev/null; then
    echo -e "${YELLOW}Not logged in to GitHub${NC}"
    echo ""
    echo "Opening GitHub login..."
    code tunnel user login --provider github
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}GitHub login failed${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Logged in to GitHub${NC}"
    code tunnel user show
fi

# Create tunnel
echo ""
echo "Creating dev tunnel..."
echo "  Name: $TUNNEL_NAME"
echo "  Access: $TUNNEL_ACCESS"
echo "  Port: $PORT"
echo ""

# Kill existing tunnel if running
if pgrep -f "code tunnel" > /dev/null; then
    echo "Stopping existing tunnel..."
    pkill -f "code tunnel"
    sleep 2
fi

# Start tunnel in background
echo "Starting tunnel..."
nohup code tunnel \
    --name "$TUNNEL_NAME" \
    --accept-server-license-terms \
    --access "$TUNNEL_ACCESS" \
    > tunnel.log 2>&1 &

TUNNEL_PID=$!
echo "Tunnel process started (PID: $TUNNEL_PID)"

# Wait for tunnel URL
echo ""
echo "Waiting for tunnel URL..."
COUNTER=0
MAX_WAIT=60

while [ $COUNTER -lt $MAX_WAIT ]; do
    if [ -f tunnel.log ]; then
        TUNNEL_URL=$(grep -oP 'https://[a-z0-9-]+\.devtunnels\.ms' tunnel.log | head -1)
        if [ ! -z "$TUNNEL_URL" ]; then
            break
        fi
    fi
    
    sleep 1
    COUNTER=$((COUNTER + 1))
    echo -n "."
done

echo ""

if [ -z "$TUNNEL_URL" ]; then
    echo -e "${RED}Failed to get tunnel URL${NC}"
    echo ""
    echo "Check tunnel.log for errors:"
    cat tunnel.log
    exit 1
fi

# Success
echo ""
echo -e "${GREEN}=================================================="
echo "✓ Dev Tunnel Created Successfully!"
echo "==================================================${NC}"
echo ""
echo "Tunnel URL:    $TUNNEL_URL"
echo "Tunnel Name:   $TUNNEL_NAME"
echo "Local Port:    $PORT"
echo "Access Mode:   $TUNNEL_ACCESS"
echo ""
echo "Endpoints:"
echo "  Health:  $TUNNEL_URL/health"
echo "  MCP:     $TUNNEL_URL/mcp"
echo "  Auth:    $TUNNEL_URL/auth/login"
echo ""
echo "To stop tunnel:"
echo "  pkill -f 'code tunnel'"
echo ""
echo "To view logs:"
echo "  tail -f tunnel.log"
echo ""

# Save tunnel info
cat > tunnel-info.json <<EOF
{
  "name": "$TUNNEL_NAME",
  "url": "$TUNNEL_URL",
  "port": $PORT,
  "access": "$TUNNEL_ACCESS",
  "createdAt": "$(date -Iseconds)",
  "pid": $TUNNEL_PID
}
EOF

echo -e "${GREEN}Tunnel information saved to tunnel-info.json${NC}"

# Test tunnel
echo ""
echo "Testing tunnel connection..."
sleep 2

if curl -s -f "$TUNNEL_URL/health" > /dev/null; then
    echo -e "${GREEN}✓ Tunnel is responding${NC}"
else
    echo -e "${YELLOW}⚠ Tunnel created but service not responding yet${NC}"
    echo "  Make sure Darbot Browser MCP is running on port $PORT"
fi

echo ""
echo -e "${GREEN}Setup complete!${NC}"
