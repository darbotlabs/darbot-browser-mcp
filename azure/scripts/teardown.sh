#!/usr/bin/env bash
set -euo pipefail

CONFIRM=false
DELETE_RESOURCE_GROUP=false
log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }
fail() { log "ERROR: $*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --confirm) CONFIRM=true ;;
    --delete-resource-group) DELETE_RESOURCE_GROUP=true ;;
    -h|--help) echo "Usage: AZURE_RESOURCE_GROUP=<rg> $0 [--confirm] [--delete-resource-group]"; exit 0 ;;
    *) fail "Unknown argument: $1" ;;
  esac
  shift
done

: "${AZURE_RESOURCE_GROUP:?Set AZURE_RESOURCE_GROUP.}"
command -v az >/dev/null 2>&1 || fail "Azure CLI is required."
az account show >/dev/null 2>&1 || fail "Run az login first."

log "Resources tagged project=darbot-browser-mcp in ${AZURE_RESOURCE_GROUP}:"
az resource list --resource-group "${AZURE_RESOURCE_GROUP}" --tag project=darbot-browser-mcp --query '[].{name:name,type:type,location:location}' --output table

if [[ "${CONFIRM}" != true ]]; then
  log "Dry run only. Re-run with --confirm to delete the listed resources, or add --delete-resource-group to delete the whole group."
  exit 0
fi

if [[ "${DELETE_RESOURCE_GROUP}" == true ]]; then
  log "Deleting resource group ${AZURE_RESOURCE_GROUP}."
  az group delete --name "${AZURE_RESOURCE_GROUP}" --yes
else
  ids="$(az resource list --resource-group "${AZURE_RESOURCE_GROUP}" --tag project=darbot-browser-mcp --query '[].id' -o tsv)"
  if [[ -z "${ids}" ]]; then
    log "No tagged resources found."
    exit 0
  fi
  while IFS= read -r id; do
    [[ -z "${id}" ]] && continue
    log "Deleting ${id}."
    az resource delete --ids "${id}"
  done <<< "${ids}"
fi

log "Teardown requested. Verify Key Vault soft-deleted state and retained logs before recreating production names."
