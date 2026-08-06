#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TEMPLATE_FILE="${REPO_ROOT}/azure/bicep/main.bicep"
PARAMETERS_FILE="${PARAMETERS_FILE:-}"
CONFIRM=false
BUILD_IMAGE=false

log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }
fail() { log "ERROR: $*" >&2; exit 1; }

usage() {
  cat <<USAGE
Usage: AZURE_RESOURCE_GROUP=<rg> AZURE_LOCATION=<region> AZURE_PREFIX=<prefix> AZURE_ENVIRONMENT=<env> AZURE_REGION_CODE=<code> $0 [--confirm] [--build-image]

Default action runs az deployment group what-if only. Add --confirm to deploy.
Optional env: PARAMETERS_FILE, CONTAINER_REPOSITORY, CONTAINER_TAG, APP_SERVICE_SKU, CONTAINER_REGISTRY_SKU,
ENTRA_CLIENT_ID, AUTH_CLIENT_SECRET_NAME, SERVER_BASE_URL, ALLOWED_ORIGINS_CSV.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --confirm) CONFIRM=true ;;
    --build-image) BUILD_IMAGE=true ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown argument: $1" ;;
  esac
  shift
done

command -v az >/dev/null 2>&1 || fail "Azure CLI is required. Install it and run az login."
az account show >/dev/null 2>&1 || fail "Azure CLI is not authenticated. Run az login."

: "${AZURE_RESOURCE_GROUP:?Set AZURE_RESOURCE_GROUP.}"
: "${AZURE_LOCATION:?Set AZURE_LOCATION, for example eastus.}"
: "${AZURE_PREFIX:?Set AZURE_PREFIX, for example darbot.}"
: "${AZURE_ENVIRONMENT:?Set AZURE_ENVIRONMENT: dev, test, stage, or prod.}"
: "${AZURE_REGION_CODE:?Set AZURE_REGION_CODE, for example eus.}"

CONTAINER_REPOSITORY="${CONTAINER_REPOSITORY:-darbot-browser-mcp}"
CONTAINER_TAG="${CONTAINER_TAG:-2.1.1}"
APP_SERVICE_SKU="${APP_SERVICE_SKU:-B1}"
CONTAINER_REGISTRY_SKU="${CONTAINER_REGISTRY_SKU:-Basic}"
ENTRA_CLIENT_ID="${ENTRA_CLIENT_ID:-}"
AUTH_CLIENT_SECRET_NAME="${AUTH_CLIENT_SECRET_NAME:-}"
SERVER_BASE_URL="${SERVER_BASE_URL:-}"
ALLOWED_ORIGINS_CSV="${ALLOWED_ORIGINS_CSV:-}"
DEPLOYMENT_NAME="darbot-browser-mcp-${AZURE_ENVIRONMENT}-$(date -u '+%Y%m%d%H%M%S')"

log "Ensuring resource group ${AZURE_RESOURCE_GROUP} exists in ${AZURE_LOCATION}."
az group create --name "${AZURE_RESOURCE_GROUP}" --location "${AZURE_LOCATION}" --only-show-errors --output none

PARAM_ARGS=(
  prefix="${AZURE_PREFIX}"
  environment="${AZURE_ENVIRONMENT}"
  location="${AZURE_LOCATION}"
  regionCode="${AZURE_REGION_CODE}"
  appServiceSku="${APP_SERVICE_SKU}"
  containerRegistrySku="${CONTAINER_REGISTRY_SKU}"
  containerImage="{\"repository\":\"${CONTAINER_REPOSITORY}\",\"tag\":\"${CONTAINER_TAG}\"}"
  entraClientId="${ENTRA_CLIENT_ID}"
  authClientSecretName="${AUTH_CLIENT_SECRET_NAME}"
  serverBaseUrl="${SERVER_BASE_URL}"
)

if [[ -n "${ALLOWED_ORIGINS_CSV}" ]]; then
  IFS=',' read -r -a origins <<< "${ALLOWED_ORIGINS_CSV}"
  origins_json="$(printf '%s\n' "${origins[@]}" | python -c 'import json,sys; print(json.dumps([line.strip() for line in sys.stdin if line.strip()]))')"
  PARAM_ARGS+=(allowedOrigins="${origins_json}")
fi

if [[ -n "${PARAMETERS_FILE}" ]]; then
  PARAM_ARGS+=("@${PARAMETERS_FILE}")
fi

log "Running what-if for ${DEPLOYMENT_NAME}."
az deployment group what-if \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --name "${DEPLOYMENT_NAME}" \
  --template-file "${TEMPLATE_FILE}" \
  --parameters "${PARAM_ARGS[@]}"

if [[ "${CONFIRM}" != true ]]; then
  log "What-if complete. Re-run with --confirm to apply changes."
  exit 0
fi

log "Applying deployment ${DEPLOYMENT_NAME}."
az deployment group create \
  --resource-group "${AZURE_RESOURCE_GROUP}" \
  --name "${DEPLOYMENT_NAME}" \
  --template-file "${TEMPLATE_FILE}" \
  --parameters "${PARAM_ARGS[@]}" \
  --output table

outputs_json="$(az deployment group show --resource-group "${AZURE_RESOURCE_GROUP}" --name "${DEPLOYMENT_NAME}" --query properties.outputs -o json)"
app_url="$(python -c 'import json,sys; print(json.load(sys.stdin)["appUrl"]["value"])' <<< "${outputs_json}")"
acr_login_server="$(python -c 'import json,sys; print(json.load(sys.stdin)["acrLoginServer"]["value"])' <<< "${outputs_json}")"

if [[ "${BUILD_IMAGE}" == true ]]; then
  log "Building ${acr_login_server}/${CONTAINER_REPOSITORY}:${CONTAINER_TAG} with Azure Container Registry."
  acr_name="${acr_login_server%%.*}"
  az acr build \
    --registry "${acr_name}" \
    --image "${CONTAINER_REPOSITORY}:${CONTAINER_TAG}" \
    --file "${REPO_ROOT}/azure/docker/Dockerfile.acr" \
    "${REPO_ROOT}"
fi

log "Deployment complete."
log "App URL: ${app_url}"
log "ACR login server: ${acr_login_server}"
log "Health check: ${app_url}/healthz"
