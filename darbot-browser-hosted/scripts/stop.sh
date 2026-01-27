#!/bin/bash
#
# Stop Darbot Browser MCP Hosted Edition
#

echo "Stopping Darbot Browser MCP - Hosted Edition"

# Stop Docker container
if [ "$(docker ps -q -f name=darbot-browser-hosted)" ]; then
    echo "Stopping Docker container..."
    docker stop darbot-browser-hosted
    docker rm darbot-browser-hosted
    echo "✓ Container stopped"
fi

# Stop dev tunnel
if pgrep -f "code tunnel" > /dev/null; then
    echo "Stopping dev tunnel..."
    pkill -f "code tunnel"
    echo "✓ Tunnel stopped"
fi

echo ""
echo "✓ All services stopped"
