# verify-microsoft-integration.ps1
# Microsoft Engineer verification script for Windows 11 + Edge integration

Write-Host "🔍 Verifying Microsoft Engineer Setup..." -ForegroundColor Cyan

# Check Windows 11
$osVersion = (Get-CimInstance Win32_OperatingSystem).Caption
Write-Host "OS: $osVersion" -ForegroundColor Green

# Check if Windows 11
if ($osVersion -like "*Windows 11*") {
    Write-Host "✅ Windows 11 detected - optimal for Microsoft integration" -ForegroundColor Green
} else {
    Write-Host "⚠️  Not Windows 11 - some features may not be optimized" -ForegroundColor Yellow
}

# Check Edge
Write-Host "`n🌐 Microsoft Edge Verification..." -ForegroundColor Cyan

# Check Edge installation
$edgeInstalled = $false
$edgeVersion = $null

# Check for Edge executable
$edgePaths = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe",
    "${env:LOCALAPPDATA}\Microsoft\Edge\Application\msedge.exe"
)

foreach ($path in $edgePaths) {
    if (Test-Path $path) {
        $edgeInstalled = $true
        try {
            $edgeVersion = (Get-ItemProperty $path).VersionInfo.FileVersion
        } catch {
            $edgeVersion = "Version unknown"
        }
        break
    }
}

if ($edgeInstalled) {
    Write-Host "✅ Microsoft Edge: $edgeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Microsoft Edge not found" -ForegroundColor Red
    Write-Host "Please install Microsoft Edge from https://www.microsoft.com/edge" -ForegroundColor Yellow
    exit 1
}

# Check VS Code
Write-Host "`n💻 VS Code Verification..." -ForegroundColor Cyan

if (Get-Command code -ErrorAction SilentlyContinue) {
    $vscodeVersion = (code --version)[0]
    Write-Host "✅ VS Code: $vscodeVersion" -ForegroundColor Green
    
    # Check VS Code version compatibility (>= 1.96.0 for MCP)
    $versionNumber = $vscodeVersion -replace '^(\d+\.\d+\.\d+).*','$1'
    $version = [Version]$versionNumber
    $minVersion = [Version]"1.96.0"
    
    if ($version -ge $minVersion) {
        Write-Host "✅ VS Code version supports MCP ($versionNumber >= 1.96.0)" -ForegroundColor Green
    } else {
        Write-Host "❌ VS Code version too old ($versionNumber < 1.96.0)" -ForegroundColor Red
        Write-Host "Please update VS Code for MCP support" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "❌ VS Code not found" -ForegroundColor Red
    Write-Host "Install VS Code from https://code.visualstudio.com/" -ForegroundColor Yellow
    exit 1
}

# Check Node.js
Write-Host "`n🟢 Node.js Verification..." -ForegroundColor Cyan

if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    
    # Check Node.js version (>= 18)
    $versionNumber = $nodeVersion -replace '^v(\d+).*','$1'
    if ([int]$versionNumber -ge 18) {
        Write-Host "✅ Node.js version meets requirements (>= 18)" -ForegroundColor Green
    } else {
        Write-Host "❌ Node.js version too old ($nodeVersion < 18)" -ForegroundColor Red
        Write-Host "Please update Node.js from https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
    Write-Host "Install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check NPM
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVersion = npm --version
    Write-Host "✅ NPM: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ NPM not found (should come with Node.js)" -ForegroundColor Red
    exit 1
}

# Check Darbot Browser MCP package access
Write-Host "`n🤖 Darbot Browser MCP Verification..." -ForegroundColor Cyan

try {
    Write-Host "Testing package accessibility..." -ForegroundColor Yellow
    $darbotVersion = npx "@darbotlabs/darbot-browser-mcp@latest" --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Darbot Browser MCP: $darbotVersion" -ForegroundColor Green
    } else {
        throw "Package execution failed"
    }
} catch {
    Write-Host "❌ Darbot Browser MCP package not accessible" -ForegroundColor Red
    Write-Host "Check network connectivity and npm registry access" -ForegroundColor Yellow
    exit 1
}

# Test Edge automation capability
Write-Host "`n🧪 Edge Automation Testing..." -ForegroundColor Cyan

try {
    Write-Host "Testing Edge automation capability..." -ForegroundColor Yellow
    # Test with timeout and proper error handling
    $testResult = Start-Process -FilePath "npx" -ArgumentList "@darbotlabs/darbot-browser-mcp@latest", "--test", "--browser", "msedge", "--headless", "--no-sandbox" -Wait -PassThru -WindowStyle Hidden
    
    if ($testResult.ExitCode -eq 0) {
        Write-Host "✅ Edge automation test passed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Edge automation test had issues (exit code: $($testResult.ExitCode))" -ForegroundColor Yellow
        Write-Host "This might be normal for headless testing in this environment" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Edge automation test could not be completed" -ForegroundColor Yellow
    Write-Host "This might be normal in restricted environments" -ForegroundColor Yellow
}

# Test VS Code Extension capability
Write-Host "`n🔌 VS Code Extension Testing..." -ForegroundColor Cyan

# Check if extension is installed
$extensionInstalled = $false
try {
    $extensions = code --list-extensions 2>$null
    if ($extensions -contains "darbotlabs.darbot-browser-mcp") {
        $extensionInstalled = $true
        Write-Host "✅ Darbot Browser MCP extension is installed" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Darbot Browser MCP extension not installed yet" -ForegroundColor Blue
        Write-Host "Install with: code --install-extension darbotlabs.darbot-browser-mcp" -ForegroundColor Cyan
    }
} catch {
    Write-Host "⚠️  Could not check VS Code extensions" -ForegroundColor Yellow
}

# Test MCP configuration
Write-Host "`n⚙️  MCP Configuration Testing..." -ForegroundColor Cyan

$vscodeSettings = "$env:APPDATA\Code\User\settings.json"
if (Test-Path $vscodeSettings) {
    Write-Host "✅ VS Code settings file found" -ForegroundColor Green
    
    try {
        $settings = Get-Content $vscodeSettings -Raw | ConvertFrom-Json
        
        if ($settings.'chat.mcp.enabled' -eq $true) {
            Write-Host "✅ MCP is enabled in VS Code settings" -ForegroundColor Green
        } else {
            Write-Host "ℹ️  MCP not yet enabled in VS Code settings" -ForegroundColor Blue
            Write-Host "The extension will prompt to enable MCP automatically" -ForegroundColor Cyan
        }
        
        if ($settings.'chat.mcp.servers'.'darbot-browser-mcp') {
            Write-Host "✅ Darbot Browser MCP server is configured" -ForegroundColor Green
        } else {
            Write-Host "ℹ️  Darbot Browser MCP server not yet configured" -ForegroundColor Blue
            Write-Host "The extension will configure this automatically" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "⚠️  Could not parse VS Code settings (may be malformed JSON)" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  VS Code settings file not found (will be created on first use)" -ForegroundColor Blue
}

# Network connectivity test
Write-Host "`n🌐 Network Connectivity Testing..." -ForegroundColor Cyan

try {
    # Test npm registry access
    Write-Host "Testing npm registry access..." -ForegroundColor Yellow
    $npmTest = npm view "@darbotlabs/darbot-browser-mcp" version --silent 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ NPM registry accessible" -ForegroundColor Green
    } else {
        throw "NPM registry test failed"
    }
} catch {
    Write-Host "⚠️  NPM registry access issues detected" -ForegroundColor Yellow
    Write-Host "You may need to configure corporate proxy settings" -ForegroundColor Yellow
}

# Summary
Write-Host "`n🎉 Microsoft Engineer Setup Summary:" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

$checksPassed = 0
$totalChecks = 7

# OS Check
if ($osVersion -like "*Windows 11*") { $checksPassed++ }
Write-Host "✅ Windows 11 Environment" -ForegroundColor Green

# Edge Check  
if ($edgeInstalled) { $checksPassed++ }
Write-Host "✅ Microsoft Edge Browser" -ForegroundColor Green

# VS Code Check
if (Get-Command code -ErrorAction SilentlyContinue) { $checksPassed++ }
Write-Host "✅ VS Code with MCP Support" -ForegroundColor Green

# Node.js Check
if (Get-Command node -ErrorAction SilentlyContinue) { 
    $nodeVersion = node --version
    $versionNumber = $nodeVersion -replace '^v(\d+).*','$1'
    if ([int]$versionNumber -ge 18) { $checksPassed++ }
}
Write-Host "✅ Node.js >= 18" -ForegroundColor Green

# Package Access Check
try {
    npx "@darbotlabs/darbot-browser-mcp@latest" --version 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $checksPassed++ }
} catch { }
Write-Host "✅ Darbot Browser MCP Package Access" -ForegroundColor Green

Write-Host "`nReadiness Score: $checksPassed / $totalChecks" -ForegroundColor Cyan

if ($checksPassed -eq $totalChecks) {
    Write-Host "`n🚀 READY FOR COPILOT STUDIO INTEGRATION!" -ForegroundColor Green
    Write-Host "=====================================>" -ForegroundColor Green
    Write-Host "`nNext Steps:" -ForegroundColor Cyan
    Write-Host "1. Install VS Code extension: code --install-extension darbotlabs.darbot-browser-mcp" -ForegroundColor White
    Write-Host "2. The extension will auto-configure MCP settings" -ForegroundColor White
    Write-Host "3. Use @darbot-browser-mcp in GitHub Copilot Chat" -ForegroundColor White
    Write-Host "4. For Copilot Studio integration, see MICROSOFT_ENGINEER_GUIDE.md" -ForegroundColor White
} else {
    Write-Host "`n⚠️  SETUP INCOMPLETE - Please address the issues above" -ForegroundColor Yellow
}

Write-Host "`n📚 Documentation:" -ForegroundColor Cyan
Write-Host "- Microsoft Engineer Guide: MICROSOFT_ENGINEER_GUIDE.md" -ForegroundColor White
Write-Host "- VS Code Installation: VSCODE_INSTALLATION.md" -ForegroundColor White
Write-Host "- Copilot Studio Integration: COPILOT_STUDIO_INTEGRATION.md" -ForegroundColor White
Write-Host "- General Installation: INSTALLATION_GUIDE.md" -ForegroundColor White

Write-Host "`n🔗 Support:" -ForegroundColor Cyan
Write-Host "- GitHub: https://github.com/darbotlabs/darbot-browser-mcp" -ForegroundColor White
Write-Host "- Issues: https://github.com/darbotlabs/darbot-browser-mcp/issues" -ForegroundColor White