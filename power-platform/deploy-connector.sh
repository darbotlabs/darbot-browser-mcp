#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONNECTOR_DIR="${SCRIPT_DIR}/connector"
WORK_DIR="${SCRIPT_DIR}/.connector-build"
ENVIRONMENT_URL="${POWER_PLATFORM_ENVIRONMENT_URL:-}"
AZURE_CLIENT_ID="${AZURE_CLIENT_ID:-}"
DARBOT_INSTANCE_URL="${DARBOT_INSTANCE_URL:-}"
DRY_RUN=false
SKIP_CONNECTIVITY=false

usage() {
  cat <<'EOF'
Usage: power-platform/deploy-connector.sh [options]

Deploys or updates the Darbot Browser MCP custom connector with pac CLI.

Options:
  --environment-url <url>   Power Platform environment URL.
  --azure-client-id <id>    Microsoft Entra application client ID.
  --darbot-url <url>        Hosted Darbot Browser MCP HTTPS base URL.
  --dry-run                 Render connector files but do not deploy.
  --skip-connectivity       Skip /health connectivity check.
  -h, --help                Show this help.

Environment variables:
  POWER_PLATFORM_ENVIRONMENT_URL, AZURE_CLIENT_ID, DARBOT_INSTANCE_URL
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --environment-url) ENVIRONMENT_URL="${2:-}"; shift 2 ;;
    --azure-client-id) AZURE_CLIENT_ID="${2:-}"; shift 2 ;;
    --darbot-url) DARBOT_INSTANCE_URL="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --skip-connectivity) SKIP_CONNECTIVITY=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 2 ;;
  esac
done

[[ -n "$ENVIRONMENT_URL" ]] || { echo 'Missing --environment-url or POWER_PLATFORM_ENVIRONMENT_URL' >&2; exit 2; }
[[ -n "$AZURE_CLIENT_ID" ]] || { echo 'Missing --azure-client-id or AZURE_CLIENT_ID' >&2; exit 2; }
[[ -n "$DARBOT_INSTANCE_URL" ]] || { echo 'Missing --darbot-url or DARBOT_INSTANCE_URL' >&2; exit 2; }
[[ "$DARBOT_INSTANCE_URL" =~ ^https://[^/]+/?$ ]] || { echo '--darbot-url must be an https base URL without a path' >&2; exit 2; }

for file in apiDefinition.swagger.json apiProperties.json settings.json; do
  [[ -f "${CONNECTOR_DIR}/${file}" ]] || { echo "Missing connector/${file}" >&2; exit 1; }
done
command -v jq >/dev/null || { echo 'jq is required to render connector JSON' >&2; exit 1; }
if [[ "$DRY_RUN" != true ]]; then
  command -v pac >/dev/null || { echo 'Power Platform CLI (pac) is required' >&2; exit 1; }
fi

DARBOT_HOST="${DARBOT_INSTANCE_URL#https://}"
DARBOT_HOST="${DARBOT_HOST%%/*}"
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"
trap 'rm -rf "$WORK_DIR"' EXIT

jq --arg host "$DARBOT_HOST" \
   --arg read "https://${DARBOT_HOST}/browser.read" \
   --arg write "https://${DARBOT_HOST}/browser.write" \
   '.host=$host
    | .securityDefinitions.EntraID.scopes=($ARGS.named | {(.read): "Read browser state", (.write): "Control browser actions"})
    | .security[0].EntraID=[$read,$write]' \
   "${CONNECTOR_DIR}/apiDefinition.swagger.json" > "${WORK_DIR}/apiDefinition.swagger.json"

jq --arg clientId "$AZURE_CLIENT_ID" \
   --arg resource "https://${DARBOT_HOST}" \
   --arg read "https://${DARBOT_HOST}/browser.read" \
   --arg write "https://${DARBOT_HOST}/browser.write" \
   '.properties.connectionParameters.token.oAuthSettings.clientId=$clientId
    | .properties.connectionParameters.token.oAuthSettings.scopes=[$read,$write]
    | .properties.connectionParameters.token.oAuthSettings.properties.AzureActiveDirectoryResourceId=$resource' \
   "${CONNECTOR_DIR}/apiProperties.json" > "${WORK_DIR}/apiProperties.json"

cp "${CONNECTOR_DIR}/settings.json" "${WORK_DIR}/settings.json"
[[ -f "${CONNECTOR_DIR}/icon.png" ]] && cp "${CONNECTOR_DIR}/icon.png" "${WORK_DIR}/icon.png"
jq empty "${WORK_DIR}/apiDefinition.swagger.json"
jq empty "${WORK_DIR}/apiProperties.json"

if [[ "$SKIP_CONNECTIVITY" != true ]]; then
  if curl -fsS --max-time 10 "${DARBOT_INSTANCE_URL%/}/health" >/dev/null; then
    echo '[OK] Darbot Browser MCP health endpoint responded.'
  else
    echo '[WARN] Health endpoint did not respond; continuing.'
  fi
fi

if [[ "$DRY_RUN" == true ]]; then
  echo "[DRY-RUN] Rendered connector files in ${WORK_DIR}. Deployment skipped."
  exit 0
fi

if pac auth list | grep -Fq "$ENVIRONMENT_URL"; then
  pac auth select --url "$ENVIRONMENT_URL"
else
  pac auth create --url "$ENVIRONMENT_URL"
fi

CONNECTOR_NAME='Darbot Browser MCP'
CONNECTOR_ID="$(pac connector list --format json | jq -r --arg name "$CONNECTOR_NAME" '.[] | select(.displayName == $name) | .name' | head -n 1)"
if [[ -n "$CONNECTOR_ID" ]]; then
  pac connector update --connector-id "$CONNECTOR_ID" --api-definition-file "${WORK_DIR}/apiDefinition.swagger.json" --api-properties-file "${WORK_DIR}/apiProperties.json" --icon "${WORK_DIR}/icon.png"
  echo "[OK] Updated connector ${CONNECTOR_ID}."
else
  pac connector create --api-definition-file "${WORK_DIR}/apiDefinition.swagger.json" --api-properties-file "${WORK_DIR}/apiProperties.json" --icon "${WORK_DIR}/icon.png"
  echo "[OK] Created connector ${CONNECTOR_NAME}."
fi
