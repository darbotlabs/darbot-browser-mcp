#!/bin/bash
# Deploy Darbot Browser MCP Custom Connector to Power Platform
# Usage: ./deploy-connector.sh <environment-url> <azure-client-id> <darbot-instance-url>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required parameters are provided
if [ $# -lt 3 ]; then
    print_error "Usage: $0 <environment-url> <azure-client-id> <darbot-instance-url>"
    print_error "Example: $0 https://myorg.crm.dynamics.com 12345678-1234-1234-1234-123456789012 https://darbot-mcp.azurewebsites.net"
    exit 1
fi

ENVIRONMENT_URL=$1
AZURE_CLIENT_ID=$2
DARBOT_INSTANCE_URL=$3

print_status "Starting Power Platform connector deployment..."
print_status "Environment: $ENVIRONMENT_URL"
print_status "Azure Client ID: $AZURE_CLIENT_ID"
print_status "Darbot Instance: $DARBOT_INSTANCE_URL"

# Check if Power Platform CLI is installed
if ! command -v pac &> /dev/null; then
    print_error "Power Platform CLI is not installed. Please install it first:"
    print_error "https://docs.microsoft.com/en-us/powerapps/developer/data-platform/powerapps-cli"
    exit 1
fi

# Extract hostname from Darbot instance URL
DARBOT_HOST=$(echo "$DARBOT_INSTANCE_URL" | sed 's|https\?://||' | sed 's|/.*||')

print_status "Updating connector configuration files..."

# Create temporary directory for modified files
TEMP_DIR=$(mktemp -d)
print_status "Using temporary directory: $TEMP_DIR"

# Update API definition with actual values
print_status "Updating API definition..."
sed "s|your-darbot-instance.azurewebsites.net|$DARBOT_HOST|g" \
    connector/apiDefinition.swagger.json > "$TEMP_DIR/apiDefinition.swagger.json"

# Update API properties with actual values
print_status "Updating API properties..."
sed -e "s|YOUR_AZURE_CLIENT_ID|$AZURE_CLIENT_ID|g" \
    -e "s|your-darbot-instance.azurewebsites.net|$DARBOT_HOST|g" \
    connector/apiProperties.json > "$TEMP_DIR/apiProperties.json"

# Copy other files
cp connector/settings.json "$TEMP_DIR/"
if [ -f connector/icon.png ]; then
    cp connector/icon.png "$TEMP_DIR/"
else
    print_warning "Icon file not found. Using default."
fi

# Test connectivity to Darbot instance
print_status "Testing connectivity to Darbot instance..."
if curl -s --max-time 10 "$DARBOT_INSTANCE_URL/health" > /dev/null; then
    print_status "✓ Darbot instance is accessible"
else
    print_warning "⚠ Could not reach Darbot instance. Proceeding anyway..."
fi

# Authenticate with Power Platform
print_status "Authenticating with Power Platform..."
if ! pac auth list | grep -q "$ENVIRONMENT_URL"; then
    print_status "Creating new authentication profile..."
    pac auth create --url "$ENVIRONMENT_URL"
else
    print_status "Using existing authentication profile..."
    pac auth select --url "$ENVIRONMENT_URL"
fi

# Deploy the connector
print_status "Deploying custom connector..."
cd "$TEMP_DIR"

# Check if connector already exists
CONNECTOR_NAME="Darbot Browser MCP"
if pac connector list | grep -q "$CONNECTOR_NAME"; then
    print_status "Connector already exists. Updating..."
    CONNECTOR_ID=$(pac connector list --format json | jq -r ".[] | select(.displayName == \"$CONNECTOR_NAME\") | .name")
    
    if [ -n "$CONNECTOR_ID" ]; then
        pac connector update \
            --connector-id "$CONNECTOR_ID" \
            --api-definition-file apiDefinition.swagger.json \
            --api-properties-file apiProperties.json \
            --icon icon.png 2>/dev/null || true
        print_status "✓ Connector updated successfully"
    else
        print_warning "Could not find existing connector. Creating new one..."
        pac connector create \
            --api-definition-file apiDefinition.swagger.json \
            --api-properties-file apiProperties.json \
            --icon icon.png 2>/dev/null || true
        print_status "✓ Connector created successfully"
    fi
else
    print_status "Creating new connector..."
    pac connector create \
        --api-definition-file apiDefinition.swagger.json \
        --api-properties-file apiProperties.json \
        --icon icon.png 2>/dev/null || true
    print_status "✓ Connector created successfully"
fi

# Clean up temporary directory
cd - > /dev/null
rm -rf "$TEMP_DIR"

# Get connector information
print_status "Retrieving connector information..."
CONNECTOR_INFO=$(pac connector list --format json | jq -r ".[] | select(.displayName == \"$CONNECTOR_NAME\")")

if [ -n "$CONNECTOR_INFO" ]; then
    CONNECTOR_ID=$(echo "$CONNECTOR_INFO" | jq -r '.name')
    CONNECTOR_STATUS=$(echo "$CONNECTOR_INFO" | jq -r '.connectionParameterSet // "Not available"')
    
    print_status "✓ Deployment completed successfully!"
    echo ""
    echo "=== Connector Information ==="
    echo "Name: $CONNECTOR_NAME"
    echo "ID: $CONNECTOR_ID"
    echo "Environment: $ENVIRONMENT_URL"
    echo ""
    echo "=== Next Steps ==="
    echo "1. Test the connector in Power Platform:"
    echo "   - Go to Power Platform Admin Center"
    echo "   - Navigate to your environment"
    echo "   - Select 'Custom Connectors'"
    echo "   - Find '$CONNECTOR_NAME' and test the connection"
    echo ""
    echo "2. Use in Copilot Studio:"
    echo "   - Create a new topic or edit existing one"
    echo "   - Add an action"
    echo "   - Select '$CONNECTOR_NAME' connector"
    echo "   - Choose from available actions:"
    echo "     • Navigate to URL"
    echo "     • Click Element"
    echo "     • Type Text"
    echo "     • Take Screenshot"
    echo "     • Save/Switch Work Profiles"
    echo "     • Get Page Snapshot"
    echo ""
    echo "3. Configure authentication:"
    echo "   - When prompted, sign in with your Azure AD credentials"
    echo "   - Grant the requested permissions for browser automation"
    echo ""
    echo "=== Documentation ==="
    echo "Connector Documentation: Available in Power Platform maker portal"
    echo "API Documentation: $DARBOT_INSTANCE_URL/openapi.json"
    echo "Health Check: $DARBOT_INSTANCE_URL/health"
    echo ""
    print_status "Darbot Browser MCP connector is ready for use! 🚀"
else
    print_error "Failed to retrieve connector information. Check Power Platform CLI output above."
    exit 1
fi