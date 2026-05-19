#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
PACKAGE_NAME="@darbotlabs/darbot-browser-mcp"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${LOG_DIR:-${PROJECT_ROOT}/.logs}"
LOG_FILE="${LOG_FILE:-${LOG_DIR}/bug-bash-installation-$(date +%Y%m%d_%H%M%S).log}"
RUN_NETWORK_TESTS=false
RUN_SERVER_TESTS=false
PORT=8933
usage(){ cat <<EOF
Usage: scripts/bug-bash-installation.sh [--network] [--server] [--port <port>] [--log-file <path>]

Runs local installation readiness checks. Network and server checks are opt-in.

Options:
  --network          Test npm/npx package access.
  --server           Start a short-lived HTTP server and test /health.
  --port <port>      Port for --server checks (default: 8933).
  --log-file <path>  Write log output to a specific file.
  -h, --help         Show this help.
EOF
}
while [[ $# -gt 0 ]]; do
  case "$1" in
    --network) RUN_NETWORK_TESTS=true; shift;;
    --server) RUN_SERVER_TESTS=true; shift;;
    --port) PORT="${2:-}"; [[ -n "$PORT" ]] || { usage; exit 2; }; shift 2;;
    --log-file) LOG_FILE="${2:-}"; [[ -n "$LOG_FILE" ]] || { usage; exit 2; }; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown option: $1" >&2; usage; exit 2;;
  esac
done
mkdir -p "$(dirname "$LOG_FILE")"
log(){ printf '%s\n' "$*" | tee -a "$LOG_FILE"; }
pass(){ log "[PASS] $*"; }
info(){ log "[INFO] $*"; }
warn(){ log "[WARN] $*"; }
fail(){ log "[FAIL] $*"; return 1; }
have(){ command -v "$1" >/dev/null 2>&1; }
run_timeout(){ if have timeout; then timeout "$@"; else shift; "$@"; fi; }
check_node(){
  have node || fail "node is not installed"
  local version major; version="$(node --version)"; major="${version#v}"; major="${major%%.*}"
  [[ "$major" =~ ^[0-9]+$ ]] || fail "cannot parse Node.js version: $version"
  (( major >= 18 )) || fail "Node.js $version is too old"
  pass "Node.js $version"
  have npm || fail "npm is not installed"
  pass "npm $(npm --version)"
}
check_browsers(){
  local found=()
  for bin in microsoft-edge msedge google-chrome chrome chromium chromium-browser firefox; do have "$bin" && found+=("$bin"); done
  [[ ${#found[@]} -gt 0 ]] && pass "Browsers found: ${found[*]}" || warn "No system browser found; Playwright may install browsers."
}
check_package(){
  [[ "$RUN_NETWORK_TESTS" == true ]] || { info "Skipping npm/npx checks; pass --network to enable."; return 0; }
  run_timeout 60 npx -y "${PACKAGE_NAME}@latest" --version >/dev/null || fail "npx package execution failed"
  pass "npx can run ${PACKAGE_NAME}@latest"
}
check_server(){
  [[ "$RUN_SERVER_TESTS" == true ]] || { info "Skipping server checks; pass --server to enable."; return 0; }
  have curl || fail "curl is required"
  npx -y "${PACKAGE_NAME}@latest" --headless --no-sandbox --port "$PORT" >/dev/null 2>&1 &
  local pid=$!; trap 'kill "$pid" >/dev/null 2>&1 || true' EXIT
  for _ in {1..20}; do curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1 && { pass "Server health endpoint responded"; kill "$pid" >/dev/null 2>&1 || true; trap - EXIT; return 0; }; sleep 1; done
  fail "Server did not respond on /health"
}
main(){ info "Darbot Browser MCP installation bug bash"; info "Log: $LOG_FILE"; check_node; check_browsers; info "OS: $(uname -s 2>/dev/null || echo unknown) $(uname -m 2>/dev/null || echo unknown)"; check_package; check_server; pass "Selected checks completed"; }
main "$@"

