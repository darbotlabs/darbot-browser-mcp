# Darbot Browser MCP - On-Premises Hosted Edition

## Setup and Usage Guide

This directory contains the on-premises hosted edition of Darbot Browser MCP with:
- **MSAL Authentication** for enterprise security
- **VS Code Dev Tunnels** for secure remote access
- **Docker containerization** for easy deployment

## Quick Start

### 1. Prerequisites

Install required tools:
```powershell
# Windows
winget install Microsoft.VisualStudioCode
winget install Docker.DockerDesktop

# Verify installations
code --version
docker --version
```

### 2. Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** -> **App registrations**
3. Click **New registration**
4. Configure:
   - Name: `Darbot Browser MCP On-Prem`
   - Redirect URI: `http://localhost:8080/auth/callback`
5. Note: **Application (client) ID**, **Directory (tenant) ID**
6. Create **Client Secret** under **Certificates & secrets**

### 3. Configuration

Create `.env` file from template:
```powershell
Copy-Item .env.example .env
```

Edit `.env` with your Azure credentials:
```env
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

### 4. Build and Run

```powershell
# Navigate to project root (not darbot-browser-hosted)
cd darbot-browser-mcp

# Build Docker image (context must be root)
docker build -t darbot-browser-hosted -f darbot-browser-hosted/Dockerfile .

# Run container (anonymous access for testing)
docker run -d --name darbot-browser-hosted -p 8080:8080 -e ALLOW_ANONYMOUS_ACCESS=true darbot-browser-hosted

# Or run with Docker Compose
docker-compose -f darbot-browser-hosted/docker-compose.yml up -d

# View logs
docker logs -f darbot-browser-hosted
```

### 5. Set Up Dev Tunnel (Optional)

For secure remote access:
```powershell
# Windows
.\scripts\setup-tunnel.ps1

# Linux/macOS
bash scripts/setup-tunnel.sh
```

## Authentication Flow

1. Navigate to: `http://localhost:8080/auth/login`
2. Login with Microsoft credentials
3. Receive access token
4. Use token for MCP requests:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/mcp
   ```

## Remote Access via Dev Tunnel

After tunnel setup:
```
https://darbot-browser-mcp-xxx.devtunnels.ms/health
https://darbot-browser-mcp-xxx.devtunnels.ms/auth/login
https://darbot-browser-mcp-xxx.devtunnels.ms/mcp
```

## Health Check

```powershell
# Local
curl http://localhost:8080/health

# Remote (tunnel)
curl https://your-tunnel.devtunnels.ms/health
```

## Management Commands

```powershell
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Health check
bash scripts/health-check.sh
```

## Data Persistence

Data is stored in `./data/`:
- `sessions/` - Browser session state
- `logs/` - Application logs
- `screenshots/` - Screenshot storage
- `tunnel/` - Tunnel configuration

## Security Features

- [PENDING VALIDATION] MSAL enterprise authentication
  <!-- Note: Code exists in src/auth/ but is not active. Container runs with ALLOW_ANONYMOUS_ACCESS=true and no AZURE_* env vars configured. Requires Azure AD app registration and proper env vars to activate. -->
- [PENDING VALIDATION] Multi-factor authentication support
- [PENDING VALIDATION] Dev tunnel with GitHub authentication
- [PENDING VALIDATION] Audit logging enabled
- [PENDING VALIDATION] Rate limiting configured
  <!-- Note: express-rate-limit package installed but NOT applied to endpoints. Rapid requests test shows no throttling. -->
- Non-root container user (validated: runs as uid=1001 'app')

## Additional Resources

- [Full README](README.md) - Complete documentation
- [Main Project](../README.md) - Darbot Browser MCP
- [Azure AD Docs](https://learn.microsoft.com/en-us/azure/active-directory/)
- [Dev Tunnels](https://code.visualstudio.com/docs/remote/tunnels)

## Troubleshooting

**Authentication issues?**
- Verify Azure credentials in `.env`
- Check redirect URI matches Azure app registration
- Ensure client secret hasn't expired

**Tunnel not working?**
- Login to GitHub: `code tunnel user login`
- Check tunnel logs: `cat tunnel.log`
- Verify VS Code CLI installed: `code --version`

**Container won't start?**
- Check logs: `docker logs darbot-browser-hosted`
- Verify port 8080 is available
- Ensure Docker has sufficient memory (4GB+)

## Tips

1. Use **private** tunnel access for production
2. Store secrets in Azure Key Vault for production
3. Enable **Conditional Access** in Azure AD
4. Regularly rotate client secrets (90 days)
5. Monitor logs for security events

---

**Version**: 1.3.0  
**License**: Apache 2.0  

