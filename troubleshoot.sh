#!/bin/bash

# Darbot Browser MCP - Automated Troubleshooting & Diagnostics
# This script diagnoses and attempts to fix common installation and runtime issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/tmp/mcp-troubleshoot-$(date +%Y%m%d_%H%M%S).log"

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

error() {
    log "${RED}❌ ERROR: $1${NC}"
}

success() {
    log "${GREEN}✅ SUCCESS: $1${NC}"
}

warning() {
    log "${YELLOW}⚠️  WARNING: $1${NC}"
}

info() {
    log "${BLUE}ℹ️  INFO: $1${NC}"
}

fix() {
    log "${GREEN}🔧 FIX: $1${NC}"
}

# System diagnostics
diagnose_system() {
    log "\n=== System Diagnostics ==="
    
    # Operating system
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="Linux"
        if [ -f /etc/os-release ]; then
            DISTRO=$(grep '^NAME=' /etc/os-release | cut -d'"' -f2)
            info "OS: $OS ($DISTRO)"
        else
            info "OS: $OS"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macOS"
        VERSION=$(sw_vers -productVersion 2>/dev/null || echo "unknown")
        info "OS: $OS $VERSION"
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        OS="Windows"
        info "OS: $OS"
    else
        OS="Unknown"
        info "OS: $OS ($OSTYPE)"
    fi
    
    # Architecture
    ARCH=$(uname -m 2>/dev/null || echo "unknown")
    info "Architecture: $ARCH"
    
    # Memory
    if command -v free >/dev/null 2>&1; then
        MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')
        info "Memory: ${MEMORY_GB}GB total"
        if [ "$MEMORY_GB" -lt 2 ]; then
            warning "Low memory detected. MCP server needs at least 1GB available"
        fi
    fi
    
    # Disk space
    if command -v df >/dev/null 2>&1; then
        DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
        info "Root disk usage: ${DISK_USAGE}%"
        if [ "$DISK_USAGE" -gt 90 ]; then
            warning "Low disk space (${DISK_USAGE}% used)"
        fi
    fi
}

# Node.js diagnostics
diagnose_nodejs() {
    log "\n=== Node.js Diagnostics ==="
    
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        NODE_PATH=$(which node)
        info "Node.js version: $NODE_VERSION"
        info "Node.js path: $NODE_PATH"
        
        # Check version compatibility
        MAJOR_VERSION=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            error "Node.js version too old (need ≥18, have $NODE_VERSION)"
            fix "Update Node.js: https://nodejs.org/ or use nvm/fnm"
            
            # Suggest version managers
            if command -v nvm >/dev/null 2>&1; then
                fix "With nvm: nvm install 18 && nvm use 18"
            elif command -v fnm >/dev/null 2>&1; then
                fix "With fnm: fnm install 18 && fnm use 18"
            fi
        else
            success "Node.js version compatible"
        fi
        
        # Check architecture compatibility
        NODE_ARCH=$(node -p "process.arch")
        info "Node.js architecture: $NODE_ARCH"
        
        if [[ "$OSTYPE" == "darwin"* ]] && [[ "$ARCH" == "arm64" ]] && [[ "$NODE_ARCH" != "arm64" ]]; then
            warning "Running x64 Node.js on Apple Silicon (may impact performance)"
            fix "Install native ARM64 Node.js for better performance"
        fi
    else
        error "Node.js not found"
        fix "Install Node.js from https://nodejs.org/"
        return 1
    fi
    
    # NPM diagnostics
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        NPM_CONFIG_PREFIX=$(npm config get prefix)
        info "NPM version: $NPM_VERSION"
        info "NPM prefix: $NPM_CONFIG_PREFIX"
        
        # Check npm permissions
        if [[ "$NPM_CONFIG_PREFIX" == "/usr"* ]] && [[ "$OS" != "Windows" ]]; then
            warning "NPM prefix points to system directory (may cause permission issues)"
            fix "Configure user-local npm prefix:"
            fix "  mkdir ~/.npm-global"
            fix "  npm config set prefix '~/.npm-global'"
            fix "  export PATH=~/.npm-global/bin:\$PATH"
        fi
        
        success "NPM available"
    else
        error "NPM not found"
        fix "NPM should come with Node.js - reinstall Node.js"
        return 1
    fi
}

# Network diagnostics
diagnose_network() {
    log "\n=== Network Diagnostics ==="
    
    # Test internet connectivity
    if curl -s --connect-timeout 10 https://registry.npmjs.org >/dev/null 2>&1; then
        success "NPM registry accessible"
    else
        error "Cannot reach NPM registry"
        fix "Check internet connection and firewall settings"
        
        # Check proxy settings
        if [ -n "$HTTP_PROXY" ] || [ -n "$HTTPS_PROXY" ]; then
            info "Proxy detected: HTTP_PROXY=$HTTP_PROXY, HTTPS_PROXY=$HTTPS_PROXY"
            fix "Configure npm proxy:"
            fix "  npm config set proxy $HTTP_PROXY"
            fix "  npm config set https-proxy $HTTPS_PROXY"
        fi
    fi
    
    # Test package availability
    if curl -s https://registry.npmjs.org/@darbotlabs/darbot-browser-mcp/latest >/dev/null 2>&1; then
        success "Darbot Browser MCP package accessible"
    else
        error "Cannot access Darbot Browser MCP package"
        fix "Check network connectivity and npm registry settings"
    fi
    
    # Test port availability (for server mode)
    if command -v netstat >/dev/null 2>&1; then
        USED_PORTS=$(netstat -tuln 2>/dev/null | grep -E ':893[0-9]' || echo "")
        if [ -n "$USED_PORTS" ]; then
            warning "MCP server ports (8930-8939) may be in use:"
            echo "$USED_PORTS" | while read line; do
                warning "  $line"
            done
            fix "Try different port: --port 9000"
        fi
    fi
}

# Browser diagnostics
diagnose_browsers() {
    log "\n=== Browser Diagnostics ==="
    
    BROWSERS_FOUND=0
    
    # Check for Microsoft Edge
    if command -v microsoft-edge >/dev/null 2>&1 || command -v msedge >/dev/null 2>&1; then
        success "Microsoft Edge found"
        ((BROWSERS_FOUND++))
    fi
    
    # Check for Chrome
    if command -v google-chrome >/dev/null 2>&1 || command -v chromium >/dev/null 2>&1 || command -v chrome >/dev/null 2>&1; then
        success "Chrome/Chromium found" 
        ((BROWSERS_FOUND++))
    fi
    
    # Check for Firefox
    if command -v firefox >/dev/null 2>&1; then
        success "Firefox found"
        ((BROWSERS_FOUND++))
    fi
    
    if [ $BROWSERS_FOUND -eq 0 ]; then
        warning "No browsers found - Playwright will install browser binaries"
        fix "Install a supported browser or let Playwright handle it automatically"
    else
        info "Found $BROWSERS_FOUND browser(s)"
    fi
    
    # Check for display (needed for headed mode)
    if [ -z "$DISPLAY" ] && [[ "$OS" != "Windows" ]] && [[ "$OS" != "macOS" ]]; then
        info "No DISPLAY set - headless mode will be used"
        fix "For headed mode, set up X11 forwarding or virtual display"
    fi
}

# Playwright diagnostics
diagnose_playwright() {
    log "\n=== Playwright Diagnostics ==="
    
    # Check if Playwright browsers are installed
    PLAYWRIGHT_CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/ms-playwright"
    if [[ "$OS" == "Windows" ]]; then
        PLAYWRIGHT_CACHE_DIR="$USERPROFILE\\AppData\\Local\\ms-playwright"
    elif [[ "$OS" == "macOS" ]]; then
        PLAYWRIGHT_CACHE_DIR="$HOME/Library/Caches/ms-playwright"
    fi
    
    if [ -d "$PLAYWRIGHT_CACHE_DIR" ]; then
        BROWSER_COUNT=$(find "$PLAYWRIGHT_CACHE_DIR" -maxdepth 1 -type d -name "*-*" 2>/dev/null | wc -l || echo "0")
        if [ "$BROWSER_COUNT" -gt 0 ]; then
            success "Playwright browsers installed ($BROWSER_COUNT found)"
        else
            info "Playwright cache exists but no browsers found"
        fi
    else
        info "Playwright browsers not yet installed"
        fix "Browsers will be installed automatically on first run"
    fi
}

# Test package access
test_package_access() {
    log "\n=== Testing Package Access ==="
    
    # Test NPX access
    info "Testing npx package access..."
    if timeout 30 npx @darbotlabs/darbot-browser-mcp@latest --version >/dev/null 2>&1; then
        success "NPX can access package"
    else
        error "NPX package access failed"
        fix "Try: npm cache clean --force"
        fix "Or: npm config set registry https://registry.npmjs.org/"
        return 1
    fi
    
    # Test specific functionality
    info "Testing headless mode..."
    if timeout 20 npx @darbotlabs/darbot-browser-mcp@latest --headless --no-sandbox --version >/dev/null 2>&1; then
        success "Headless mode works"
    else
        error "Headless mode failed"
        fix "Container environments: add --no-sandbox --disable-dev-shm-usage"
        fix "Linux: install required dependencies (libgtk-3, libnss3, etc.)"
    fi
}

# Test server functionality
test_server_mode() {
    log "\n=== Testing Server Mode ==="
    
    # Find available port
    PORT=8935
    while netstat -tuln 2>/dev/null | grep -q ":$PORT "; do
        ((PORT++))
        if [ $PORT -gt 8999 ]; then
            error "No available ports found"
            return 1
        fi
    done
    
    info "Testing server mode on port $PORT..."
    
    # Start server in background
    npx @darbotlabs/darbot-browser-mcp@latest --headless --no-sandbox --port $PORT >/dev/null 2>&1 &
    SERVER_PID=$!
    
    # Wait for startup
    sleep 15
    
    # Test endpoints
    if curl -s "http://localhost:$PORT/ready" | grep -q "OK"; then
        success "Server mode works"
        
        # Test health endpoint
        if curl -s "http://localhost:$PORT/health" >/dev/null 2>&1; then
            success "Health endpoint responsive"
        fi
        
        # Test OpenAPI
        if curl -s "http://localhost:$PORT/openapi.json" | grep -q "Darbot Browser MCP"; then
            success "OpenAPI schema available"
        fi
        
    else
        error "Server mode failed"
        fix "Check logs for specific error messages"
        fix "Ensure port $PORT is not blocked by firewall"
    fi
    
    # Cleanup
    kill $SERVER_PID 2>/dev/null || true
    sleep 2
}

# Generate diagnostic report
generate_report() {
    log "\n=== Diagnostic Report ==="
    
    REPORT_FILE="/tmp/mcp-diagnostic-report-$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$REPORT_FILE" << EOF
Darbot Browser MCP - Diagnostic Report
Generated: $(date)

SYSTEM INFORMATION
- OS: $OS
- Architecture: $ARCH  
- Node.js: $(node --version 2>/dev/null || echo "Not found")
- NPM: $(npm --version 2>/dev/null || echo "Not found")

NETWORK CONFIGURATION
- HTTP Proxy: ${HTTP_PROXY:-"Not set"}
- HTTPS Proxy: ${HTTPS_PROXY:-"Not set"}
- NPM Registry: $(npm config get registry 2>/dev/null || echo "Unknown")

BROWSER AVAILABILITY
$(command -v microsoft-edge >/dev/null 2>&1 && echo "- Microsoft Edge: Available" || echo "- Microsoft Edge: Not found")
$(command -v google-chrome >/dev/null 2>&1 && echo "- Chrome: Available" || echo "- Chrome: Not found") 
$(command -v firefox >/dev/null 2>&1 && echo "- Firefox: Available" || echo "- Firefox: Not found")

PACKAGE ACCESS
$(timeout 10 npx @darbotlabs/darbot-browser-mcp@latest --version >/dev/null 2>&1 && echo "- NPX Access: Working" || echo "- NPX Access: Failed")

FULL LOG
$(cat "$LOG_FILE")
EOF

    success "Diagnostic report saved: $REPORT_FILE"
    info "Share this report when seeking support"
}

# Automated fixes
apply_common_fixes() {
    log "\n=== Applying Common Fixes ==="
    
    # Clear npm cache
    info "Clearing NPM cache..."
    npm cache clean --force >/dev/null 2>&1 && success "NPM cache cleared" || warning "Could not clear NPM cache"
    
    # Set npm registry
    info "Setting NPM registry..."
    npm config set registry https://registry.npmjs.org/ >/dev/null 2>&1 && success "NPM registry set" || warning "Could not set NPM registry"
    
    # Install Playwright browsers if needed
    if ! timeout 30 npx @darbotlabs/darbot-browser-mcp@latest --headless --version >/dev/null 2>&1; then
        info "Installing Playwright browsers..."
        npx playwright install chromium >/dev/null 2>&1 && success "Playwright browsers installed" || warning "Could not install Playwright browsers"
    fi
}

# Main execution
main() {
    log "=== Darbot Browser MCP - Troubleshooting & Diagnostics ==="
    log "Started: $(date)"
    log "Log: $LOG_FILE"
    
    diagnose_system
    diagnose_nodejs
    diagnose_network  
    diagnose_browsers
    diagnose_playwright
    test_package_access
    test_server_mode
    apply_common_fixes
    generate_report
    
    log "\n=== Troubleshooting Complete ==="
    success "Diagnostics completed successfully"
    info "Review the full log and diagnostic report for details"
    
    if [ -f "$REPORT_FILE" ]; then
        info "Diagnostic report: $REPORT_FILE"
    fi
}

# Handle command line arguments
case "${1:-}" in
    --quick)
        test_package_access
        ;;
    --fix)
        apply_common_fixes
        ;;
    --report)
        diagnose_system
        diagnose_nodejs
        generate_report
        ;;
    *)
        main
        ;;
esac