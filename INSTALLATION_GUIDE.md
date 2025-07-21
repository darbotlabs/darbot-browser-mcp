# 🚀 Darbot Browser MCP - Complete Installation & Setup Guide

This comprehensive guide covers all installation methods with step-by-step verification for every user type.

## 🎯 Quick Start (Recommended)

For most users, the fastest path is:

1. **Install the VS Code Extension** (automatic setup)
2. **Or use NPX directly** (no installation needed)

## 📋 Prerequisites

### Required
- **Node.js 18 or newer** ([Download here](https://nodejs.org/))
- **One of these browsers**:
  - Microsoft Edge (recommended)
  - Chrome/Chromium
  - Firefox
- **MCP Client**: VS Code, Claude Desktop, Cursor, or Windsurf

### Optional
- **Docker** (for containerized deployments)
- **Proxy configuration** (for corporate environments)

## 📦 Installation Methods

### Method 1: VS Code Extension (Automatic Setup) ⭐

**Best for**: First-time users, easy setup

1. **Install Extension**:
   ```bash
   # Via VS Code Marketplace
   code --install-extension darbotlabs.darbot-browser-mcp
   ```

2. **Auto-Configuration**:
   - Extension prompts to enable MCP
   - Automatically configures server settings
   - No manual configuration needed!

3. **Verification**:
   - Open VS Code Command Palette (`Ctrl+Shift+P`)
   - Run: `Darbot Browser MCP: Start Server`
   - Check status bar shows "MCP: Running"

### Method 2: NPX Direct Usage (Zero Install) ⭐

**Best for**: Quick testing, CI/CD, temporary usage

```bash
# Test the installation
npx @darbotlabs/darbot-browser-mcp@latest --version

# Run with custom options
npx @darbotlabs/darbot-browser-mcp@latest --headless --no-sandbox

# Start SSE server
npx @darbotlabs/darbot-browser-mcp@latest --port 8931
```

**MCP Client Configuration**:
```json
{
  "mcpServers": {
    "darbot-browser": {
      "command": "npx",
      "args": ["@darbotlabs/darbot-browser-mcp@latest"]
    }
  }
}
```

### Method 3: Global NPM Installation

**Best for**: Regular usage, development environments

```bash
# Install globally
npm install -g @darbotlabs/darbot-browser-mcp

# Verify installation
darbot-browser-mcp --version

# Use directly
darbot-browser-mcp --headless --port 8931
```

**MCP Client Configuration**:
```json
{
  "mcpServers": {
    "darbot-browser": {
      "command": "darbot-browser-mcp"
    }
  }
}
```

### Method 4: Docker Container

**Best for**: Production deployments, isolated environments

```bash
# Run with Docker
docker run -i --rm --init --pull=always mcr.microsoft.com/playwright/mcp

# Or build locally
docker build -t darbot-browser-mcp .
docker run -i --rm darbot-browser-mcp
```

**MCP Client Configuration**:
```json
{
  "mcpServers": {
    "darbot-browser": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "--init", "--pull=always", "mcr.microsoft.com/playwright/mcp"]
    }
  }
}
```

## 👥 Installation by User Profile

### 🏢 Corporate Developer (Firewall/Proxy)

**Common Issues**: Network restrictions, proxy settings

**Solutions**:
```bash
# Configure npm proxy
npm config set proxy http://your-proxy:port
npm config set https-proxy http://your-proxy:port

# Alternative: Use company npm registry
npm config set registry http://your-company-registry.com

# Test network access
curl -I https://registry.npmjs.org/@darbotlabs/darbot-browser-mcp
```

**MCP Configuration with Proxy**:
```json
{
  "mcpServers": {
    "darbot-browser": {
      "command": "npx",
      "args": ["@darbotlabs/darbot-browser-mcp@latest", "--proxy-server", "http://proxy:port"],
      "env": {
        "HTTP_PROXY": "http://proxy:port",
        "HTTPS_PROXY": "http://proxy:port"
      }
    }
  }
}
```

### 🍎 macOS M1/M2 Developer

**Common Issues**: ARM64 compatibility, Rosetta emulation

**Solutions**:
```bash
# Verify native ARM64 Node.js
node -p "process.arch"  # Should show "arm64"

# If using Rosetta, install ARM64 Node.js:
# Download from nodejs.org or use:
brew install node

# Alternative browser if Edge unavailable
npx @darbotlabs/darbot-browser-mcp@latest --browser chrome
```

### 🪟 Windows PowerShell User

**Common Issues**: Execution policy, path separators

**Solutions**:
```powershell
# Set execution policy (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Use PowerShell-friendly paths
npx @darbotlabs/darbot-browser-mcp@latest --user-data-dir "$env:TEMP\mcp-profile"

# Global install with proper permissions
npm install -g @darbotlabs/darbot-browser-mcp
```

### 🐳 Docker/Container Environment

**Common Issues**: Headless mode, sandbox restrictions

**Solutions**:
```bash
# Essential flags for containers
npx @darbotlabs/darbot-browser-mcp@latest \
  --headless \
  --no-sandbox \
  --disable-dev-shm-usage

# With resource limits
docker run --memory=1g --cpus=1 \
  mcr.microsoft.com/playwright/mcp
```

### 🆕 VS Code/MCP Newcomer

**Step-by-Step Guide**:

1. **Install VS Code** (if not already installed)
2. **Enable MCP**:
   - Open VS Code Settings (`Ctrl+,`)
   - Search "mcp"
   - Enable "Chat: MCP Enabled"
3. **Install Extension**:
   - Go to Extensions panel
   - Search "Darbot Browser MCP"
   - Click Install
4. **Let Extension Configure**:
   - Extension will prompt for configuration
   - Accept the default settings
5. **Test**:
   - Open Command Palette
   - Run "Darbot Browser MCP: Start Server"
   - Open GitHub Copilot Chat
   - Type: `@darbot-browser-mcp navigate to https://example.com`

### ⚙️ Advanced Configuration Expert

**Custom Configuration Example**:
```json
{
  "mcpServers": {
    "darbot-browser-custom": {
      "command": "npx",
      "args": [
        "@darbotlabs/darbot-browser-mcp@latest",
        "--config", "/path/to/config.json",
        "--browser", "firefox",
        "--viewport-size", "1920,1080",
        "--user-agent", "CustomBot/1.0",
        "--proxy-server", "socks5://localhost:1080",
        "--save-trace",
        "--vision"
      ],
      "env": {
        "DEBUG": "darbot:*",
        "NODE_ENV": "development"
      }
    }
  }
}
```

**Config File Example** (`config.json`):
```json
{
  "browser": {
    "browserName": "firefox",
    "isolated": false,
    "launchOptions": {
      "headless": false,
      "slowMo": 100
    },
    "contextOptions": {
      "viewport": { "width": 1920, "height": 1080 },
      "locale": "en-US"
    }
  },
  "capabilities": ["core", "tabs", "pdf", "files"],
  "network": {
    "blockedOrigins": ["*.ads.com", "*.analytics.com"]
  }
}
```

## ✅ Verification & Testing

### Automated Verification

Run our verification script:
```bash
# Download and run verification
curl -fsSL https://raw.githubusercontent.com/darbotlabs/darbot-browser-mcp/main/verify-installation.sh | bash

# Or run locally (after installation)
./verify-installation.sh
```

### Manual Verification

1. **Test Command Access**:
   ```bash
   npx @darbotlabs/darbot-browser-mcp@latest --help
   ```

2. **Test Server Mode**:
   ```bash
   npx @darbotlabs/darbot-browser-mcp@latest --port 8931 &
   curl http://localhost:8931/health
   ```

3. **Test MCP Client Integration**:
   - Start your MCP client
   - Verify server appears in tools list
   - Test basic command: `navigate to https://example.com`

## 🚨 Troubleshooting

### Common Issues & Solutions

#### "Package not found"
```bash
# Clear npm cache
npm cache clean --force

# Try with specific version
npx @darbotlabs/darbot-browser-mcp@0.2.0
```

#### "Browser launch failed"
```bash
# Install Playwright browsers
npx playwright install

# Try different browser
npx @darbotlabs/darbot-browser-mcp@latest --browser chrome

# Container environments
npx @darbotlabs/darbot-browser-mcp@latest --headless --no-sandbox
```

#### "Permission denied"
```bash
# Fix npm permissions (Unix)
sudo chown -R $USER ~/.npm

# Use different npm prefix
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

#### "MCP server not responding"
```bash
# Check server status
curl http://localhost:8931/health

# View server logs
DEBUG=darbot:* npx @darbotlabs/darbot-browser-mcp@latest

# Restart server
pkill -f "darbot-browser-mcp"
```

### Environment-Specific Issues

#### Corporate Networks
- Configure npm proxy settings
- Add npmjs.org to firewall allowlist  
- Use internal package registry if available

#### Containerized Environments
- Ensure sufficient memory (≥1GB)
- Use `--no-sandbox --disable-dev-shm-usage`
- Mount /tmp with sufficient space

#### ARM64 (Apple Silicon)
- Use native ARM64 Node.js installation
- Avoid Rosetta 2 emulation for better performance
- Some browsers may require additional setup

## 📞 Support & Resources

- **Documentation**: [GitHub README](https://github.com/darbotlabs/darbot-browser-mcp#readme)
- **Issues**: [GitHub Issues](https://github.com/darbotlabs/darbot-browser-mcp/issues)
- **Examples**: [Example configurations](https://github.com/darbotlabs/darbot-browser-mcp/tree/main/examples)

## 📈 Performance Tuning

### Memory Optimization
```bash
# Limit memory usage
node --max-old-space-size=1024 /path/to/server

# Use isolated profiles
npx @darbotlabs/darbot-browser-mcp@latest --isolated
```

### Network Optimization
```bash
# Block unnecessary requests
npx @darbotlabs/darbot-browser-mcp@latest \
  --blocked-origins "*.ads.com;*.analytics.com"

# Use proxy for caching
npx @darbotlabs/darbot-browser-mcp@latest \
  --proxy-server "http://cache-proxy:3128"
```

---

🎉 **You're all set!** Start automating your browser tasks with 31 powerful AI-driven tools.