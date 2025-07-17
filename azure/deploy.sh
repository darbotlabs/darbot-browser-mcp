#!/bin/bash
# Deploy Darbot Browser MCP to Azure App Service
# Usage: ./deploy.sh <resource-group> <app-name> <location> [additional-params]

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
    print_error "Usage: $0 <resource-group> <app-name> <location> [tenant-id] [client-id] [callback-url]"
    exit 1
fi

RESOURCE_GROUP=$1
APP_NAME=$2
LOCATION=$3
TENANT_ID=${4:-$(az account show --query tenantId -o tsv)}
CLIENT_ID=${5:-""}
CALLBACK_URL=${6:-"https://${APP_NAME}.azurewebsites.net/auth/callback"}

print_status "Starting deployment of Darbot Browser MCP to Azure..."
print_status "Resource Group: $RESOURCE_GROUP"
print_status "App Name: $APP_NAME"
print_status "Location: $LOCATION"
print_status "Tenant ID: $TENANT_ID"

# Check if Azure CLI is installed and user is logged in
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

if ! az account show &> /dev/null; then
    print_error "Please log in to Azure CLI first: az login"
    exit 1
fi

# Check if resource group exists, create if not
print_status "Checking resource group..."
if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    print_status "Creating resource group: $RESOURCE_GROUP"
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
else
    print_status "Resource group $RESOURCE_GROUP already exists"
fi

# Create Azure AD application if CLIENT_ID is not provided
if [ -z "$CLIENT_ID" ]; then
    print_status "Creating Azure AD application..."
    APP_REGISTRATION=$(az ad app create \
        --display-name "$APP_NAME-auth" \
        --web-redirect-uris "$CALLBACK_URL" \
        --query "appId" -o tsv)
    CLIENT_ID=$APP_REGISTRATION
    print_status "Created Azure AD application with Client ID: $CLIENT_ID"
    
    # Create a client secret
    print_status "Creating client secret..."
    CLIENT_SECRET=$(az ad app credential reset \
        --id "$CLIENT_ID" \
        --query "password" -o tsv)
else
    print_warning "Using provided Client ID: $CLIENT_ID"
    print_warning "Please ensure client secret is available for deployment"
    CLIENT_SECRET="PLACEHOLDER_SECRET"
fi

# Deploy using Bicep template
print_status "Deploying infrastructure using Bicep template..."
DEPLOYMENT_NAME="darbot-mcp-$(date +%Y%m%d-%H%M%S)"

az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file "./azure/templates/main.bicep" \
    --name "$DEPLOYMENT_NAME" \
    --parameters \
        appName="$APP_NAME" \
        location="$LOCATION" \
        azureTenantId="$TENANT_ID" \
        azureClientId="$CLIENT_ID" \
        azureClientSecret="$CLIENT_SECRET" \
        copilotStudioCallbackUrl="$CALLBACK_URL"

# Get deployment outputs
print_status "Retrieving deployment outputs..."
APP_URL=$(az deployment group show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$DEPLOYMENT_NAME" \
    --query "properties.outputs.appServiceUrl.value" -o tsv)

HEALTH_URL=$(az deployment group show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$DEPLOYMENT_NAME" \
    --query "properties.outputs.healthCheckUrl.value" -o tsv)

OPENAPI_URL=$(az deployment group show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$DEPLOYMENT_NAME" \
    --query "properties.outputs.openApiUrl.value" -o tsv)

# Wait for deployment to be ready
print_status "Waiting for application to be ready..."
for i in {1..30}; do
    if curl -s "$HEALTH_URL" > /dev/null 2>&1; then
        print_status "Application is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        print_warning "Application may still be starting. Check the health endpoint manually."
    fi
    echo -n "."
    sleep 10
done

# Display deployment information
print_status "Deployment completed successfully!"
echo ""
echo "=== Deployment Information ==="
echo "Application URL: $APP_URL"
echo "Health Check: $HEALTH_URL"
echo "OpenAPI Spec: $OPENAPI_URL"
echo "Azure AD App ID: $CLIENT_ID"
echo ""
echo "=== Configuration for Copilot Studio ==="
echo "MCP Endpoint: ${APP_URL}/mcp"
echo "SSE Endpoint: ${APP_URL}/sse"
echo "Auth Endpoint: ${APP_URL}/auth"
echo ""
echo "=== Next Steps ==="
echo "1. Configure Copilot Studio to use the MCP endpoint"
echo "2. Set up authentication in your Copilot Studio connector"
echo "3. Test the health endpoint: curl $HEALTH_URL"
echo "4. View OpenAPI specification: curl $OPENAPI_URL"
echo ""
print_status "Darbot Browser MCP is now ready for Copilot Studio integration!"