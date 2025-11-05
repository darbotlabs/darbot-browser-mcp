#!/bin/bash
# Script to help with publishing all package formats

set -e

echo "🚀 Package Publishing Helper for Darbot Browser MCP"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the root directory."
    exit 1
fi

# Parse version from package.json
VERSION=$(node -p "require('./package.json').version")
echo "📦 Current version: $VERSION"

echo ""
echo "Available package formats:"
echo "1. NPM Package (@darbotlabs/darbot-browser-mcp)"
echo "2. VS Code Extension (darbotlabs.darbot-browser-mcp)"  
echo "3. NuGet Package (DarbotLabs.Browser.MCP)"
echo "4. Browser Extension (Browser MCP Bridge)"
echo ""

# Function to build NPM package
build_npm() {
    echo "🔨 Building NPM package..."
    npm run clean
    npm run build
    npm run lint
    npm run test
    echo "✅ NPM package ready for publishing"
    echo "   Run: npm publish --access public"
}

# Function to build VS Code extension
build_vscode() {
    echo "🔨 Building VS Code extension..."
    
    # Check if vsce is installed
    if ! command -v vsce &> /dev/null; then
        echo "📦 Installing vsce..."
        npm install -g vsce
    fi
    
    cd vscode-extension
    
    # Install dependencies
    npm install
    
    # Compile TypeScript
    npm run compile
    
    # Package the extension
    vsce package
    
    cd ..
    echo "✅ VS Code extension built: vscode-extension/*.vsix"
    echo "   Run: vsce publish"
}

# Function to build NuGet package
build_nuget() {
    echo "🔨 Building NuGet package..."
    
    # Check if dotnet is installed
    if ! command -v dotnet &> /dev/null; then
        echo "❌ Error: .NET SDK not found. Please install .NET SDK 8.0 or later."
        exit 1
    fi
    
    cd dotnet/DarbotLabs.Browser.MCP
    
    # Build the project
    dotnet build --configuration Release
    
    # Pack the project
    dotnet pack --configuration Release --output ../../
    
    cd ../..
    echo "✅ NuGet package built: *.nupkg"
    echo "   Run: dotnet nuget push *.nupkg --source https://api.nuget.org/v3/index.json --api-key <YOUR_API_KEY>"
}

# Function to build browser extension
build_browser_extension() {
    echo "🔨 Building browser extension..."
    
    # Create a zip file for the extension
    cd extension
    zip -r ../browser-mcp-bridge-$VERSION.zip .
    cd ..
    
    echo "✅ Browser extension built: browser-mcp-bridge-$VERSION.zip"
    echo "   Upload to Chrome Web Store Developer Dashboard"
}

# Function to build all packages
build_all() {
    build_npm
    echo ""
    build_vscode
    echo ""
    build_nuget
    echo ""
    build_browser_extension
    echo ""
    echo "🎉 All packages built successfully!"
}

# Main menu
case "${1:-}" in
    "npm")
        build_npm
        ;;
    "vscode")
        build_vscode
        ;;
    "nuget")
        build_nuget
        ;;
    "browser")
        build_browser_extension
        ;;
    "all")
        build_all
        ;;
    *)
        echo "Usage: $0 [npm|vscode|nuget|browser|all]"
        echo ""
        echo "Examples:"
        echo "  $0 npm     - Build NPM package only"
        echo "  $0 vscode  - Build VS Code extension only"
        echo "  $0 nuget   - Build NuGet package only"
        echo "  $0 browser - Build browser extension only"
        echo "  $0 all     - Build all packages"
        echo ""
        echo "Or run without arguments to see this help."
        ;;
esac