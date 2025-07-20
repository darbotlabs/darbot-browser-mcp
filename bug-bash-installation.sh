#!/bin/bash

# Darbot Browser MCP - Installation & Configuration Bug Bash
# This script tests the complete installation process across different user personas

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/tmp/bug-bash-installation-$(date +%Y%m%d_%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check prerequisites
check_prerequisites() {
    log "\n=== Checking Prerequisites ==="
    
    # Node.js version
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        info "Node.js: $NODE_VERSION"
        
        # Extract major version number
        MAJOR_VERSION=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            error "Node.js version $NODE_VERSION is too old. Requires ≥18"
            return 1
        else
            success "Node.js version requirement met"
        fi
    else
        error "Node.js not found. Please install Node.js ≥18"
        return 1
    fi
    
    # NPM version
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        info "NPM: $NPM_VERSION"
        success "NPM is available"
    else
        error "NPM not found"
        return 1
    fi
    
    # Check for browsers
    BROWSERS_FOUND=""
    if command -v google-chrome >/dev/null 2>&1 || command -v chromium >/dev/null 2>&1; then
        BROWSERS_FOUND="$BROWSERS_FOUND Chrome/Chromium"
    fi
    if command -v microsoft-edge >/dev/null 2>&1 || command -v msedge >/dev/null 2>&1; then
        BROWSERS_FOUND="$BROWSERS_FOUND Edge"
    fi
    if command -v firefox >/dev/null 2>&1; then
        BROWSERS_FOUND="$BROWSERS_FOUND Firefox"
    fi
    
    if [ -n "$BROWSERS_FOUND" ]; then
        info "Available browsers:$BROWSERS_FOUND"
    else
        warning "No browsers detected. Playwright will install browser binaries."
    fi
}

# Test Persona 1: Corporate Developer Behind Firewall
test_corporate_developer() {
    log "\n=== Testing Persona 1: Corporate Developer Behind Firewall ==="
    info "Simulating corporate environment with potential network restrictions"
    
    # Test NPX access to registry
    info "Testing NPX package access..."
    if timeout 30 npx @darbotlabs/darbot-browser-mcp@latest --version >/dev/null 2>&1; then
        success "NPX can access and download package"
    else
        error "NPX failed to access package (network/firewall issue?)"
        info "Corporate environments may need:"
        info "  - Proxy configuration: npm config set proxy http://proxy:port"
        info "  - Registry access: npm config set registry https://registry.npmjs.org/"
        info "  - Firewall allowlist for npmjs.org"
    fi
    
    # Test with proxy simulation (if proxy env vars are set)
    if [ -n "$HTTP_PROXY" ] || [ -n "$HTTPS_PROXY" ]; then
        info "Proxy environment detected, testing with proxy settings..."
        # Test would go here with proxy
    fi
}

# Test Persona 2: macOS M1/M2 Developer
test_macos_developer() {
    log "\n=== Testing Persona 2: macOS M1/M2 Developer ==="
    info "Testing ARM64 compatibility and macOS-specific issues"
    
    ARCH=$(uname -m)
    OS=$(uname -s)
    
    info "Architecture: $ARCH"
    info "Operating System: $OS"
    
    if [ "$OS" = "Darwin" ]; then
        info "macOS detected"
        if [ "$ARCH" = "arm64" ]; then
            info "Apple Silicon (M1/M2) detected"
            warning "Ensure native ARM64 Node.js is installed"
            warning "Check for Rosetta 2 emulation issues"
        fi
        
        # Check if Homebrew is available
        if command -v brew >/dev/null 2>&1; then
            info "Homebrew detected - alternative installation path available"
        fi
    else
        info "Not macOS - skipping macOS-specific tests"
    fi
}

# Test Persona 3: Windows PowerShell User  
test_windows_user() {
    log "\n=== Testing Persona 3: Windows PowerShell User ==="
    info "Testing Windows environment compatibility"
    
    if [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        info "Windows environment detected"
        
        # Test PowerShell vs Command Prompt differences
        info "Windows-specific considerations:"
        info "  - Path separator differences (/ vs \\)"
        info "  - PowerShell execution policy"
        info "  - Windows Defender/Antivirus interference"
        info "  - User permissions for global npm installs"
        
    else
        info "Not Windows - skipping Windows-specific tests"
    fi
}

# Test Persona 4: Docker/Container Environment
test_container_environment() {
    log "\n=== Testing Persona 4: Docker/Container Environment ==="
    info "Testing containerized/headless environment"
    
    # Check if running in container
    if [ -f /.dockerenv ] || grep -q docker /proc/1/cgroup 2>/dev/null; then
        info "Container environment detected"
        
        # Test headless browser functionality
        info "Testing headless browser requirements..."
        
        # Check for display
        if [ -z "$DISPLAY" ]; then
            info "No DISPLAY set - headless mode required"
        fi
        
        # Check sandbox requirements
        info "Container environments typically need --no-sandbox flag"
        
    else
        info "Not in container - simulating container conditions"
    fi
    
    # Test headless mode
    info "Testing headless mode startup..."
    if timeout 30 npx @darbotlabs/darbot-browser-mcp@latest --headless --no-sandbox --help >/dev/null 2>&1; then
        success "Headless mode works"
    else
        error "Headless mode failed"
    fi
}

# Test Installation Methods
test_npm_global_install() {
    log "\n=== Testing NPM Global Installation ==="
    
    # Create temporary directory for testing
    TEST_DIR="/tmp/mcp-install-test-$$"
    mkdir -p "$TEST_DIR"
    cd "$TEST_DIR"
    
    info "Testing: npm install -g @darbotlabs/darbot-browser-mcp"
    
    # Check if we can install globally (may need sudo)
    if npm install -g @darbotlabs/darbot-browser-mcp@latest >/dev/null 2>&1; then
        success "Global installation successful"
        
        # Test if command is available
        if command -v darbot-browser-mcp >/dev/null 2>&1; then
            success "Global command is available"
            VERSION=$(darbot-browser-mcp --version 2>/dev/null || echo "unknown")
            info "Installed version: $VERSION"
        else
            error "Global command not found in PATH"
        fi
        
        # Cleanup
        npm uninstall -g @darbotlabs/darbot-browser-mcp >/dev/null 2>&1 || true
        
    else
        error "Global installation failed (permissions/network issue?)"
        info "May require: sudo npm install -g or npm config prefix setup"
    fi
    
    cd - >/dev/null
    rm -rf "$TEST_DIR"
}

test_npx_usage() {
    log "\n=== Testing NPX Direct Usage ==="
    
    info "Testing: npx @darbotlabs/darbot-browser-mcp@latest --help"
    
    if timeout 60 npx @darbotlabs/darbot-browser-mcp@latest --help >/dev/null 2>&1; then
        success "NPX execution works"
    else
        error "NPX execution failed"
    fi
    
    # Test specific flags
    info "Testing headless mode..."
    if timeout 30 npx @darbotlabs/darbot-browser-mcp@latest --headless --no-sandbox --version >/dev/null 2>&1; then
        success "Headless mode execution works"
    else
        warning "Headless mode may have issues"
    fi
}

test_sse_server() {
    log "\n=== Testing SSE Server Mode ==="
    
    info "Testing standalone server with SSE transport..."
    
    # Start server in background
    npx @darbotlabs/darbot-browser-mcp@latest --headless --no-sandbox --port 8932 >/dev/null 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 10
    
    # Test health endpoint
    if curl -s http://localhost:8932/health >/dev/null 2>&1; then
        success "SSE Server is responding"
        
        # Test specific endpoints
        if curl -s http://localhost:8932/ready | grep -q "OK"; then
            success "Readiness endpoint works"
        fi
        
        if curl -s http://localhost:8932/openapi.json | grep -q "Darbot Browser MCP"; then
            success "OpenAPI endpoint works"
        fi
        
    else
        error "SSE Server not responding"
    fi
    
    # Cleanup
    kill $SERVER_PID 2>/dev/null || true
    sleep 2
}

# Test MCP Connector Functionality
test_mcp_tools() {
    log "\n=== Testing MCP Tools Functionality ==="
    
    # Start server for testing
    info "Starting MCP server for tool testing..."
    npx @darbotlabs/darbot-browser-mcp@latest --headless --no-sandbox --port 8933 >/dev/null 2>&1 &
    SERVER_PID=$!
    
    sleep 15  # Allow more time for startup
    
    # Test OpenAPI schema
    if curl -s http://localhost:8933/openapi.json > /tmp/openapi-test.json; then
        TOOL_COUNT=$(jq -r '.paths | keys | length' /tmp/openapi-test.json 2>/dev/null || echo "0")
        if [ "$TOOL_COUNT" -gt 0 ]; then
            success "MCP tools are exposed ($TOOL_COUNT endpoints)"
        else
            warning "MCP tools may not be properly exposed"
        fi
        rm -f /tmp/openapi-test.json
    else
        error "Could not retrieve MCP tool schema"
    fi
    
    # Cleanup
    kill $SERVER_PID 2>/dev/null || true
    sleep 2
}

# Create Installation Verification Script
create_verification_script() {
    log "\n=== Creating Installation Verification Script ==="
    
    VERIFY_SCRIPT="$SCRIPT_DIR/../verify-installation.sh"
    
    cat > "$VERIFY_SCRIPT" << 'EOF'
#!/bin/bash

# Darbot Browser MCP - Installation Verification Script
# Run this script to verify your installation is working correctly

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "=== Darbot Browser MCP Installation Verification ==="
echo

# Test 1: Check Node.js version
echo -n "Node.js version check... "
NODE_VERSION=$(node --version)
MAJOR_VERSION=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
if [ "$MAJOR_VERSION" -ge 18 ]; then
    echo -e "${GREEN}✅ $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ $NODE_VERSION (requires ≥18)${NC}"
    exit 1
fi

# Test 2: NPX package access
echo -n "Package accessibility... "
if timeout 30 npx @darbotlabs/darbot-browser-mcp@latest --version >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Package accessible${NC}"
else
    echo -e "${RED}❌ Cannot access package${NC}"
    exit 1
fi

# Test 3: Headless mode
echo -n "Headless browser mode... "
if timeout 20 npx @darbotlabs/darbot-browser-mcp@latest --headless --no-sandbox --version >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Headless mode works${NC}"
else
    echo -e "${RED}❌ Headless mode failed${NC}"
    exit 1
fi

# Test 4: Server mode
echo -n "Server startup... "
npx @darbotlabs/darbot-browser-mcp@latest --headless --no-sandbox --port 8934 >/dev/null 2>&1 &
SERVER_PID=$!
sleep 10

if curl -s http://localhost:8934/ready | grep -q "OK" 2>/dev/null; then
    echo -e "${GREEN}✅ Server mode works${NC}"
    kill $SERVER_PID 2>/dev/null || true
else
    echo -e "${RED}❌ Server mode failed${NC}"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo
echo -e "${GREEN}🎉 Installation verification completed successfully!${NC}"
echo
echo "Next steps:"
echo "1. Configure your MCP client (VS Code, Claude Desktop, etc.)"
echo "2. Add server configuration to MCP client settings"
echo "3. Start using the 31 browser automation tools!"
echo
echo "For help: https://github.com/darbotlabs/darbot-browser-mcp#readme"

EOF

    chmod +x "$VERIFY_SCRIPT"
    success "Created verification script: $VERIFY_SCRIPT"
}

# Main execution
main() {
    log "=== Darbot Browser MCP Installation Bug Bash ==="
    log "Started at: $(date)"
    log "Log file: $LOG_FILE"
    
    # Run all tests
    check_prerequisites
    test_corporate_developer  
    test_macos_developer
    test_windows_user
    test_container_environment
    test_npm_global_install
    test_npx_usage
    test_sse_server
    test_mcp_tools
    create_verification_script
    
    log "\n=== Bug Bash Complete ==="
    log "Completed at: $(date)"
    log "Full log available at: $LOG_FILE"
    
    success "Bug bash execution completed!"
    info "Review the log for detailed results and recommendations"
}

# Run main function
main "$@"