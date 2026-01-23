#!/bin/bash
#
# Start Darbot Browser MCP Hosted Edition
#

set -e

echo "Starting Darbot Browser MCP - Hosted Edition"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✓ Environment variables loaded"
fi

# Validate MSAL configuration
if [ -z "$AZURE_TENANT_ID" ] || [ -z "$AZURE_CLIENT_ID" ] || [ -z "$AZURE_CLIENT_SECRET" ]; then
    echo "ERROR: Missing MSAL configuration"
    echo "Please set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET"
    exit 1
fi

echo "✓ MSAL configuration validated"

# Create data directories
mkdir -p data/sessions data/logs data/screenshots data/tunnel
echo "✓ Data directories created"

# Start server
echo ""
echo "Starting MCP server on port ${PORT:-8080}..."
exec node ../cli.js \
    --headless \
    --browser chromium \
    --no-sandbox \
    --host 0.0.0.0 \
    --port ${PORT:-8080} \
    --output-dir ./data
