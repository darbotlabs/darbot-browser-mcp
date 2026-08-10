#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DRY_RUN=false
SKIP_TESTS=false
TARGET=""
usage(){ cat <<EOF
Usage: scripts/build-packages.sh [--dry-run] [--skip-tests] <npm|vscode|nuget|browser|all>

Builds publishable package artifacts that are present in this checkout.
EOF
}
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift;;
    --skip-tests) SKIP_TESTS=true; shift;;
    -h|--help) usage; exit 0;;
    npm|vscode|nuget|browser|all) TARGET="$1"; shift;;
    *) echo "Unknown argument: $1" >&2; usage; exit 2;;
  esac
done
[[ -n "$TARGET" ]] || { usage; exit 2; }
[[ -f "$PROJECT_ROOT/package.json" ]] || { echo "package.json not found" >&2; exit 1; }
run(){ printf '+ '; printf '%q ' "$@"; printf '\n'; [[ "$DRY_RUN" == true ]] || "$@"; }
version(){ node -p "JSON.parse(require('fs').readFileSync('package.json','utf8')).version"; }
build_npm(){
  run npm ci
  run npm run clean
  run npm run build
  run npm run atlas
  run npm run lint
  [[ "$SKIP_TESTS" == true ]] || run npm test
  run npm pack --ignore-scripts
  run npm pack --dry-run --ignore-scripts
}
build_vscode(){
  [[ -d vscode-extension ]] || { echo "Skipping vscode-extension/"; return 0; }
  pushd vscode-extension >/dev/null
  run npm ci
  run npm run compile
  [[ "$SKIP_TESTS" == true ]] || run npm test
  run npm run package
  popd >/dev/null
}
build_nuget(){ [[ -d dotnet ]] || { echo "Skipping dotnet/"; return 0; }; command -v dotnet >/dev/null || { echo ".NET SDK is required" >&2; return 1; }; run dotnet build dotnet --configuration Release; run dotnet pack dotnet --configuration Release --no-build; }
build_browser(){ [[ -d extension ]] || { echo "Skipping extension/"; return 0; }; local zip_name="browser-mcp-bridge-$(version).zip"; if command -v zip >/dev/null; then (cd extension && run zip -r "../$zip_name" .); elif command -v powershell.exe >/dev/null; then run powershell.exe -NoProfile -Command "Compress-Archive -Path extension\\* -DestinationPath $zip_name -Force"; else echo "zip or PowerShell is required" >&2; return 1; fi; }
cd "$PROJECT_ROOT"
case "$TARGET" in
  npm) build_npm ;;
  vscode) build_vscode ;;
  nuget) build_nuget ;;
  browser) build_browser ;;
  all) build_npm; build_vscode; build_nuget; build_browser ;;
esac
