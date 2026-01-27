# Darbot Browser MCP - On-Premises Hosted Edition

**Version**: 1.3.0  
**Date**: January 22, 2026  
**Deployment Target**: On-premises Docker with secure remote access  
**Tools Available**: 52 autonomous tools (with optional vision-mode companions)

---

## Overview

The **On-Premises Hosted Edition** combines the enterprise features of the cloud version with the control and security of local hosting. This edition uses:

- **MSAL (Microsoft Authentication Library)** for enterprise authentication
- **VS Code Dev Tunnels** for secure remote access without exposing ports
- **Docker containerization** for easy deployment
- **Local data storage** with enterprise security

This is ideal for organizations that want cloud-like features but need to keep data and browser automation on-premises.

---

## Key Features

### Enterprise Authentication
- [STUB - NOT INTEGRATED] **MSAL Authentication** - Microsoft Entra ID (Azure AD) integration (code exists in `src/auth/entraAuth.ts` but not wired into HTTP server)
- [STUB - NOT INTEGRATED] **Multi-tenant Support** - Support multiple organizations (requires MSAL integration)
- [STUB - NOT INTEGRATED] **Conditional Access** - Honor organizational policies (requires MSAL integration)
- [STUB - NOT INTEGRATED] **MFA Support** - Multi-factor authentication enabled (requires MSAL integration)

### Secure Remote Access
- [READY TO TEST] **VS Code Dev Tunnels** - Secure HTTPS tunnels without port forwarding
- [READY TO TEST] **Automatic SSL/TLS** - Microsoft-managed certificates
- [READY TO TEST] **GitHub Authentication** - Tunnel access via GitHub account
- [READY TO TEST] **No Firewall Configuration** - Works behind corporate firewalls

### On-Premises Benefits
- **Data Sovereignty** - All data stays on your infrastructure
- **Network Isolation** - Browser automation on internal network
- **Custom Policies** - Implement organizational security policies
- **Cost Control** - No cloud hosting fees

### Browser Automation Capabilities
- [VALIDATED] **52 MCP Tools** - Full autonomous browser toolkit
- [VALIDATED] **Scroll Tools** - Pixel-based scrolling works; scroll_to_element has snapshot ref serialization issue
- [VALIDATED] **Clock Tools** - Time manipulation for testing animations and timeouts
- [VALIDATED] **Emulation Tools** - Geolocation, media, and timezone emulation
- [VALIDATED] **Storage Tools** - Cookie and localStorage management
- [VALIDATED] **AI-Native Features** - Intent execution and workflow automation
- [VALIDATED] **Autonomous Crawling** - BFS planner with memory configuration
- [VALIDATED] **Work Profiles** - Save, list, switch, and delete browser sessions
- [VALIDATED] **Tab Management** - New, list, select, and close tabs
- [VALIDATED] **Diagnostics** - Console messages (filtered), network requests
- [PENDING] **Vision Mode** - Optional screen-based tools with `--vision` flag (requires separate test)
- [PENDING] **Multi-Browser** - Chrome, Edge, Firefox, WebKit support (requires Docker test)

---

## [ARCH] Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     On-Premises Server                       │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Docker Container                           │ │
│  │                                                          │ │
│  │  ┌──────────────┐         ┌────────────────┐          │ │
│  │  │   Node.js    │         │   Chromium     │          │ │
│  │  │  MCP Server  │────────▶│    Browser     │          │ │
│  │  │              │         │                │          │ │
│  │  └──────┬───────┘         └────────────────┘          │ │
│  │         │                                               │ │
│  │         ▼                                               │ │
│  │  ┌──────────────┐         ┌────────────────┐          │ │
│  │  │     MSAL     │         │  VS Code Dev   │          │ │
│  │  │     Auth     │         │     Tunnel     │          │ │
│  │  └──────────────┘         └────────┬───────┘          │ │
│  │                                     │                   │ │
│  └─────────────────────────────────────┼───────────────────┘ │
│                                        │                     │
└────────────────────────────────────────┼─────────────────────┘
                                         │
                                         │ HTTPS (Secure)
                                         ▼
                            ┌────────────────────────┐
                            │  Microsoft Tunnel      │
                            │  Service (Global)      │
                            └────────┬───────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
            ┌───────▼────────┐              ┌────────▼────────┐
            │  Remote Client │              │  Remote Client  │
            │   (VS Code)    │              │    (Browser)    │
            └────────────────┘              └─────────────────┘
```

---

## Prerequisites

### System Requirements
- **Docker**: Version 20.10 or later
- **Docker Compose**: Version 2.0 or later (optional)
- **Operating System**: Windows 10/11, Linux, or macOS
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Disk Space**: 2GB for container + browser
- **Network**: Internet connection for tunnel setup

### Required Accounts
1. **Microsoft Entra ID (Azure AD)** tenant access
2. **Azure App Registration** for MSAL authentication
3. **GitHub Account** for dev tunnel authentication
4. **VS Code** with dev tunnel CLI installed

### Tools Installation

#### 1. Install VS Code CLI (includes dev tunnel)
```bash
# Windows (PowerShell)
winget install Microsoft.VisualStudioCode

# macOS
brew install --cask visual-studio-code

# Linux
sudo snap install code --classic
```

#### 2. Install Dev Tunnel CLI
```bash
# Windows/macOS/Linux
code tunnel --install
```

#### 3. Verify Docker
```bash
docker --version
docker compose --version
```

---

## Quick Start

### Step 1: Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** -> **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: `Darbot Browser MCP On-Prem`
   - **Supported account types**: Choose based on needs
   - **Redirect URI**: `http://localhost:8080/auth/callback`
5. Note the following:
   - **Application (client) ID**
   - **Directory (tenant) ID**
6. Create a **Client Secret**:
   - Go to **Certificates & secrets**
   - Click **New client secret**
   - Note the **Value** (shown only once)

### Step 2: Configure Environment

Create `.env` file in `darbot-browser-hosted/`:

```env
# MSAL Authentication
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_REDIRECT_URI=http://localhost:8080/auth/callback

# Server Configuration
PORT=8080
NODE_ENV=production
SERVER_BASE_URL=http://localhost:8080

# MCP Configuration
MAX_CONCURRENT_SESSIONS=10
SESSION_TIMEOUT_MS=1800000

# Browser Configuration
BROWSER=chromium
HEADLESS=true
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Security
REQUIRE_AUTH=true
ALLOW_LOCALHOST=true

# Dev Tunnel (optional - will be set up automatically)
TUNNEL_NAME=darbot-browser-mcp
TUNNEL_ACCESS=private
```

### Step 3: Build and Run

```bash
# Navigate to PROJECT ROOT (not darbot-browser-hosted)
cd darbot-browser-mcp

# Build Docker image (context must be root)
docker build -t darbot-browser-hosted -f darbot-browser-hosted/Dockerfile .

# Run container
docker run -d \
  --name darbot-browser-hosted \
  -p 8080:8080 \
  -e ALLOW_ANONYMOUS_ACCESS=true \
  darbot-browser-hosted

# Or with .env file for MSAL auth
docker run -d \
  --name darbot-browser-hosted \
  -p 8080:8080 \
  --env-file darbot-browser-hosted/.env \
  darbot-browser-hosted

# Check logs
docker logs -f darbot-browser-hosted
```

### Step 4: Set Up Dev Tunnel

```bash
# Login to GitHub (first time only)
code tunnel user login

# Create and start tunnel
code tunnel --name darbot-browser-mcp --accept-server-license-terms

# Get tunnel URL (will be displayed in output)
# Example: https://darbot-browser-mcp-xxx.devtunnels.ms
```

### Step 5: Access the Service

**Local Access:**
```
http://localhost:8080/health
http://localhost:8080/mcp
```

**Remote Access (via tunnel):**
```
https://darbot-browser-mcp-xxx.devtunnels.ms/health
https://darbot-browser-mcp-xxx.devtunnels.ms/mcp
```

### Step 6: Configure VS Code Extension

1. Install the **Darbot Browser MCP** VS Code extension
2. When prompted, select **"Hosted (Docker)"** deployment mode
3. Enter your hosted URL:
   - Local: `http://localhost:8080`
   - Remote: `https://darbot-browser-mcp-xxx.devtunnels.ms`
4. The extension will configure your `mcp.json` automatically:

```json
{
  "servers": {
    "darbot-browser-mcp": {
      "url": "http://localhost:8080/mcp",
      "type": "http"
    }
  }
}
```

1. Reload VS Code and start using with GitHub Copilot!

---

## Authentication Flow

### MSAL Authentication Flow

```
1. Client -> Request MCP endpoint
2. Server -> Check for valid token
3. No token? -> Redirect to /auth/login
4. User -> Microsoft login page
5. User -> Enters credentials + MFA
6. Microsoft -> Returns authorization code
7. Server -> Exchanges code for access token
8. Server -> Validates token with Microsoft
9. Server -> Creates session
10. Client -> Access granted to MCP tools
```

### Dev Tunnel Security

```
1. Client -> Connects to tunnel URL
2. Tunnel -> Authenticates via GitHub
3. Tunnel -> Establishes encrypted connection
4. Server -> Receives forwarded request
5. Server -> MSAL authentication required
6. Client -> Double authentication (GitHub + MSAL)
```

---

## Directory Structure

```
darbot-browser-hosted/
├── README.md                 # This file
├── Dockerfile                # Multi-stage Docker build
├── docker-compose.yml        # Compose configuration
├── .env.example              # Environment template
├── .dockerignore             # Docker ignore rules
├── package.json              # Node.js dependencies
├── tsconfig.json             # TypeScript configuration
├── setup-tunnel.sh           # Tunnel setup script
├── setup-tunnel.ps1          # Tunnel setup (Windows)
├── src/
│   ├── server.ts             # Main MCP server
│   ├── auth/
│   │   ├── msal-config.ts    # MSAL configuration
│   │   ├── auth-middleware.ts # Auth middleware
│   │   └── token-validator.ts # Token validation
│   ├── tunnel/
│   │   ├── tunnel-manager.ts  # Dev tunnel management
│   │   └── tunnel-health.ts   # Tunnel health checks
│   └── config/
│       ├── security.ts        # Security policies
│       └── logging.ts         # Audit logging
├── scripts/
│   ├── start.sh              # Start script
│   ├── stop.sh               # Stop script
│   └── health-check.sh       # Health check
└── data/                     # Local data storage
    ├── sessions/             # Browser sessions
    ├── logs/                 # Application logs
    └── screenshots/          # Screenshot storage
```

---

## Configuration Options

### MSAL Configuration

```typescript
// src/auth/msal-config.ts
export const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        console.log(message);
      },
      logLevel: LogLevel.Verbose,
    },
  },
};
```

### Dev Tunnel Configuration

```json
{
  "tunnel": {
    "name": "darbot-browser-mcp",
    "access": "private",
    "protocol": "https",
    "portForwarding": "8080:8080",
    "authentication": "github"
  }
}
```

---

## [DOCKER] Docker Configuration

### Build Arguments

```dockerfile
ARG NODE_VERSION=23
ARG PLAYWRIGHT_VERSION=1.55.0-alpha
ARG CHROMIUM_BUILD=1182
```

### Runtime Configuration

```yaml
# docker-compose.yml
services:
  darbot-browser-hosted:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - AZURE_TENANT_ID=${AZURE_TENANT_ID}
      - AZURE_CLIENT_ID=${AZURE_CLIENT_ID}
      - AZURE_CLIENT_SECRET=${AZURE_CLIENT_SECRET}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Monitoring & Logging

### Health Checks

```bash
# Local health check
curl http://localhost:8080/health

# Tunnel health check  
curl https://your-tunnel.devtunnels.ms/health
```

### Log Locations

```bash
# Docker logs
docker logs darbot-browser-hosted

# Application logs
docker exec darbot-browser-hosted cat /app/data/logs/app.log

# Audit logs
docker exec darbot-browser-hosted cat /app/data/logs/audit.log
```

### Metrics

```bash
# Container stats
docker stats darbot-browser-hosted

# Disk usage
docker exec darbot-browser-hosted du -sh /app/data/*
```

---

## Security Best Practices

### 1. MSAL Configuration
- [PENDING VALIDATION] Store client secrets in environment variables or secret management
- [PENDING VALIDATION] Use certificate-based authentication for production
- [PENDING VALIDATION] Implement token caching with encryption
- [PENDING VALIDATION] Enable Conditional Access policies

### 2. Dev Tunnel Security
- [PENDING VALIDATION] Use `private` access mode for production
- [PENDING VALIDATION] Regularly rotate GitHub access tokens
- [PENDING VALIDATION] Monitor tunnel connection logs
- [PENDING VALIDATION] Implement IP allowlists if needed

### 3. Container Security
- Run as non-root user (UID 1001) ✓ Validated
- [PENDING VALIDATION] Mount data volumes with appropriate permissions
- [PENDING VALIDATION] Use secrets for sensitive configuration
- [PENDING VALIDATION] Regularly update base images

### 4. Network Security
- [PENDING VALIDATION] Use HTTPS for all external connections
- [PENDING VALIDATION] Implement rate limiting
  <!-- Note: express-rate-limit package is installed but NOT applied to endpoints. Rapid request testing shows no throttling. -->
- [PENDING VALIDATION] Enable audit logging
- [PENDING VALIDATION] Monitor for suspicious activity

---

## Troubleshooting

### MSAL Authentication Issues

**Problem**: "Invalid client secret"
```bash
# Verify environment variables
docker exec darbot-browser-hosted env | grep AZURE

# Solution: Regenerate client secret in Azure Portal
```

**Problem**: "Redirect URI mismatch"
```bash
# Check Azure App Registration redirect URIs
# Ensure tunnel URL is added if using remote access
```

### Dev Tunnel Issues

**Problem**: "Tunnel not starting"
```bash
# Check if code CLI is installed
code --version

# Reinstall tunnel
code tunnel --uninstall
code tunnel --install
```

**Problem**: "GitHub authentication failed"
```bash
# Re-login to GitHub
code tunnel user logout
code tunnel user login
```

### Container Issues

**Problem**: "Container exits immediately"
```bash
# Check logs
docker logs darbot-browser-hosted

# Common issues:
# - Missing environment variables
# - Port 8080 already in use
# - Insufficient memory
```

**Problem**: "Browser won't start"
```bash
# Check browser installation
docker exec darbot-browser-hosted npx playwright install chromium

# Verify browser path
docker exec darbot-browser-hosted ls -la /ms-playwright
```

---

## [CHART-UP] Scaling & Performance

### Single Host Optimization
```yaml
# docker-compose.yml
services:
  darbot-browser-hosted:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          cpus: '2'
          memory: 4G
    environment:
      - MAX_CONCURRENT_SESSIONS=20
```

### Multi-Host Setup
```bash
# Use Docker Swarm or Kubernetes for multi-host
docker swarm init
docker stack deploy -c docker-compose.yml darbot
```

---

## Cost Comparison

| Deployment | Monthly Cost | Pros | Cons |
|------------|--------------|------|------|
| **Azure Cloud** | $235-280 | Fully managed, auto-scaling | Ongoing costs, data in cloud |
| **On-Prem Hosted** | $0* | Data sovereignty, no recurring fees | Self-managed, hardware required |
| **Local Development** | $0 | Simple setup | No remote access, single user |

*Assumes existing server infrastructure. Add hardware/power costs if procuring new servers.

---

## (reload) Updates & Maintenance

### Updating the Container

```bash
# Pull latest code
git pull origin main

# Rebuild image
docker build -t darbot-browser-hosted -f darbot-browser-hosted/Dockerfile .

# Restart with new image
docker stop darbot-browser-hosted
docker rm darbot-browser-hosted
docker run -d --name darbot-browser-hosted ...
```

### Backing Up Data

```bash
# Backup data directory
tar -czf darbot-backup-$(date +%Y%m%d).tar.gz ./data/

# Restore from backup
tar -xzf darbot-backup-20251111.tar.gz
```

---

## Additional Resources

### Documentation
- [MSAL Node Documentation](https://learn.microsoft.com/en-us/azure/active-directory/develop/msal-node-migration)
- [VS Code Dev Tunnels](https://code.visualstudio.com/docs/remote/tunnels)
- [Docker Documentation](https://docs.docker.com/)
- [Main Darbot README](../README.md)

### Support
- GitHub Issues: https://github.com/darbotlabs/darbot-browser-mcp/issues
- Microsoft Q&A: https://learn.microsoft.com/en-us/answers/
- Stack Overflow: Tag `darbot-browser-mcp`

---

**Version**: 1.3.0  
**Last Updated**: January 22, 2026  
**License**: Apache 2.0  
**Status**: [VALIDATED] Pending rollout
**Tools Validated**: 52 tools tested locally, all endpoints responding
