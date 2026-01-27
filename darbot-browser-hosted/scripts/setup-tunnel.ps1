# Setup Dev Tunnel for Darbot Browser MCP (Windows)
# Automated setup script for VS Code dev tunnels
#

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Darbot Browser MCP - Dev Tunnel Setup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$TUNNEL_NAME = if ($env:TUNNEL_NAME) { $env:TUNNEL_NAME } else { "darbot-browser-mcp" }
$TUNNEL_ACCESS = if ($env:TUNNEL_ACCESS) { $env:TUNNEL_ACCESS } else { "private" }
$PORT = if ($env:PORT) { $env:PORT } else { "8080" }

# Check if code CLI is installed
Write-Host "Checking VS Code CLI installation..."
try {
    $version = code --version 2>&1
    Write-Host "✓ VS Code CLI installed" -ForegroundColor Green
    Write-Host $version
} catch {
    Write-Host "✗ VS Code CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install with: winget install Microsoft.VisualStudioCode"
    Write-Host ""
    exit 1
}

# Check if user is logged in
Write-Host ""
Write-Host "Checking GitHub authentication..."
try {
    $userInfo = code tunnel user show 2>&1
    Write-Host "✓ Logged in to GitHub" -ForegroundColor Green
    Write-Host $userInfo
} catch {
    Write-Host "⚠ Not logged in to GitHub" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opening GitHub login..."
    code tunnel user login --provider github
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ GitHub login failed" -ForegroundColor Red
        exit 1
    }
}

# Create tunnel
Write-Host ""
Write-Host "Creating dev tunnel..."
Write-Host "  Name: $TUNNEL_NAME"
Write-Host "  Access: $TUNNEL_ACCESS"
Write-Host "  Port: $PORT"
Write-Host ""

# Kill existing tunnel if running
$existingProcess = Get-Process | Where-Object { $_.CommandLine -like "*code tunnel*" } -ErrorAction SilentlyContinue
if ($existingProcess) {
    Write-Host "Stopping existing tunnel..."
    Stop-Process -Name "code" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Start tunnel in background
Write-Host "Starting tunnel..."
$tunnelArgs = @(
    "tunnel",
    "--name", $TUNNEL_NAME,
    "--accept-server-license-terms",
    "--access", $TUNNEL_ACCESS
)

$process = Start-Process -FilePath "code" -ArgumentList $tunnelArgs -NoNewWindow -PassThru -RedirectStandardOutput "tunnel.log" -RedirectStandardError "tunnel-error.log"

Write-Host "Tunnel process started (PID: $($process.Id))"

# Wait for tunnel URL
Write-Host ""
Write-Host "Waiting for tunnel URL..."
$counter = 0
$maxWait = 60
$tunnelUrl = $null

while ($counter -lt $maxWait) {
    if (Test-Path "tunnel.log") {
        $logContent = Get-Content "tunnel.log" -Raw
        if ($logContent -match 'https://[a-z0-9-]+\.devtunnels\.ms') {
            $tunnelUrl = $matches[0]
            break
        }
    }
    
    Start-Sleep -Seconds 1
    $counter++
    Write-Host "." -NoNewline
}

Write-Host ""

if (-not $tunnelUrl) {
    Write-Host "✗ Failed to get tunnel URL" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check tunnel.log for errors:"
    if (Test-Path "tunnel.log") {
        Get-Content "tunnel.log"
    }
    exit 1
}

# Success
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "✓ Dev Tunnel Created Successfully!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tunnel URL:    $tunnelUrl"
Write-Host "Tunnel Name:   $TUNNEL_NAME"
Write-Host "Local Port:    $PORT"
Write-Host "Access Mode:   $TUNNEL_ACCESS"
Write-Host ""
Write-Host "Endpoints:"
Write-Host "  Health:  $tunnelUrl/health"
Write-Host "  MCP:     $tunnelUrl/mcp"
Write-Host "  Auth:    $tunnelUrl/auth/login"
Write-Host ""
Write-Host "To stop tunnel:"
Write-Host "  Stop-Process -Name code -Force"
Write-Host ""
Write-Host "To view logs:"
Write-Host "  Get-Content tunnel.log -Wait"
Write-Host ""

# Save tunnel info
$tunnelInfo = @{
    name = $TUNNEL_NAME
    url = $tunnelUrl
    port = [int]$PORT
    access = $TUNNEL_ACCESS
    createdAt = (Get-Date -Format "o")
    pid = $process.Id
} | ConvertTo-Json

$tunnelInfo | Out-File -FilePath "tunnel-info.json" -Encoding UTF8

Write-Host "✓ Tunnel information saved to tunnel-info.json" -ForegroundColor Green

# Test tunnel
Write-Host ""
Write-Host "Testing tunnel connection..."
Start-Sleep -Seconds 2

try {
    $response = Invoke-WebRequest -Uri "$tunnelUrl/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "✓ Tunnel is responding" -ForegroundColor Green
} catch {
    Write-Host "⚠ Tunnel created but service not responding yet" -ForegroundColor Yellow
    Write-Host "  Make sure Darbot Browser MCP is running on port $PORT"
}

Write-Host ""
Write-Host "✓ Setup complete!" -ForegroundColor Green
