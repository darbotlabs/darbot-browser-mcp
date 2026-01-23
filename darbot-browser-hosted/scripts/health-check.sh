#!/bin/bash
#
# Health Check for Darbot Browser MCP
#

PORT="${PORT:-8080}"
HEALTH_URL="http://localhost:$PORT/health"

# Check if service is responding
response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$response" -eq 200 ]; then
    echo "✓ Service is healthy"
    curl -s "$HEALTH_URL" | jq '.'
    exit 0
else
    echo "✗ Service is unhealthy (HTTP $response)"
    exit 1
fi
