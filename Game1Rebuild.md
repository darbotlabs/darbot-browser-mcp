## 🎮 Mission: Fix & Deploy Darbot Browser MCP Server

### **Level 1: Foundation Setup** 🏗️
**XP Reward: 100 points**

1. **📁 Verify Project Structure**
   - Navigate to `d:\GHPROD\darbot-browser-mcp\`
   - Confirm these directories exist:
     - `/vscode-extension/`
     - `/src/`
     - `/package.json` (root)

2. **📋 Create/Fix VS Code Extension Manifest**
   - Create/edit `vscode-extension/package.json`:


```json
{
  "name": "darbot-browser-mcp",
  "displayName": "Darbot Browser MCP",
  "description": "Browser automation MCP server for VS Code",
  "version": "1.0.0",
  "publisher": "darbotlabs",
  "engines": {
    "vscode": "^1.95.0"
  },
  "categories": ["AI", "Other"],
  "keywords": ["mcp", "browser", "automation", "playwright"],
  "main": "./out/extension.js",
  "contributes": {
    "mcpServerDefinitionProviders": [
      {
        "id": "darbot-browser-mcp",
        "label": "Darbot Browser MCP"
      }
    ],
    "commands": [
      {
        "command": "darbot-browser-mcp.start",
        "title": "Start Darbot Browser MCP Server"
      },
      {
        "command": "darbot-browser-mcp.stop", 
        "title": "Stop Darbot Browser MCP Server"
      }
    ]
  },
  "activationEvents": [
    "onStartupFinished"
  ],
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.95.0",
    "@types/node": "^18.0.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  }
}
```
 **Level 2: Extension Implementation** 🔧
**XP Reward: 200 points**

3. **⚙️ Create Extension Entry Point**
   - Create `vscode-extension/src/extension.ts`: Perfect! I can see the issue clearly. Your Darbot Browser MCP server is working in Claude Desktop but failing to load as a VS Code extension due to missing/incorrect manifest files. Let me create a comprehensive gameified fix plan.

# 🎮 **DARBOT BROWSER MCP EXTENSION RESCUE MISSION** 🎮

## 🏆 **Mission Overview**
Transform your working MCP server into a fully functional VS Code extension with proper manifests and structure.

---

## **🚀 LEVEL 1: FOUNDATION REPAIR** 
**XP Reward: 200 points | Estimated Time: 15 minutes**

### **Quest 1.1: Verify Project Structure** ⚡
 these directories exist:**
- ✅ `/src/` (MCP server source)
- ✅ `/cli.js` (working CLI entry point)
- ❌ `/vscode-extension/` (missing - CREATE THIS)

### **Quest 1.2: Create VS Code Extension Directory** 📁
Quest 1.3: Create VS Code Extension Manifest** 📋
Create `vscode-extension/package.json`:


```json
{
  "name": "darbot-browser-mcp",
  "displayName": "Darbot Browser MCP",
  "description": "Browser automation MCP server for VS Code with Microsoft Edge work profile support",
  "version": "1.0.0",
  "publisher": "darbotlabs",
  "engines": {
    "vscode": "^1.95.0"
  },
  "categories": ["AI", "Other"],
  "keywords": ["mcp", "browser", "automation", "playwright", "edge", "darbot"],
  "main": "./out/extension.js",
  "contributes": {
    "mcpServerDefinitionProviders": [
      {
        "id": "darbot-browser-mcp",
        "label": "Darbot Browser MCP"
      }
    ],
    "commands": [
      {
        "command": "darbot-browser-mcp.start",
        "title": "Start Darbot Browser MCP Server"
      },
      {
        "command": "darbot-browser-mcp.stop", 
        "title": "Stop Darbot Browser MCP Server"
      },
      {
        "command": "darbot-browser-mcp.restart",
        "title": "Restart Darbot Browser MCP Server"
      }
    ],
    "configuration": {
      "title": "Darbot Browser MCP",
      "properties": {
        "darbotBrowserMcp.browser": {
          "type": "string",
          "default": "msedge",
          "enum": ["msedge", "chrome", "firefox", "webkit"],
          "description": "Browser to use for automation"
        },
        "darbotBrowserMcp.headless": {
          "type": "boolean",
          "default": false,
          "description": "Run browser in headless mode"
        },
        "darbotBrowserMcp.noSandbox": {
          "type": "boolean",
          "default": true,
          "description": "Disable sandbox for browser processes"
        }
      }
    }
  },
  "activationEvents": [
    "onStartupFinished"
  ],
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "playwright": "^1.40.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.95.0",
    "@types/node": "^18.0.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "package": "vsce package"
  }
}
```


---

## **⚔️ LEVEL 2: EXTENSION IMPLEMENTATION**
**XP Reward: 400 points | Estimated Time: 30 minutes**

### **Quest 2.1: Create TypeScript Configuration** 🔧
Create `vscode-extension/tsconfig.json`:


```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "moduleResolution": "node",
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
```


### **Quest 2.2: Create Extension Entry Point** ⚙️
Create `vscode-extension/src/extension.ts`:



---

## **🔥 LEVEL 3: BUILD & COMPILE**
**XP Reward: 300 points | Estimated Time: 10 minutes**

### **Quest 3.1: Install Dependencies** 📦
 **Quest 3.2: Compile Extension** 🔨


**Success Criteria:**
- ✅ `/out/extension.js` file created
- ✅ No TypeScript compilation errors

---

## **🛡️ LEVEL 4: TESTING & DEPLOYMENT**
**XP Reward: 500 points | Estimated Time: 20 minutes**

### **Quest 4.1: Install VS Code Extension CLI** 📱
Quest 4.2: Package Extension** 📦


**Expected Output:** `darbot-browser-mcp-1.0.0.vsix`

### **Quest 4.3: Install Extension Locally** 🚀
 **⚡ LEVEL 5: ENABLE MCP INTEGRATION**
**XP Reward: 600 points | Estimated Time: 5 minutes**

### **Quest 5.1: Enable MCP in VS Code** 🔧
Use the **chat.mcp.enabled** setting to enable MCP integration.



Show in Settings Editor

Quest 5.2: Verify MCP Server Registration** ✅
Use the **MCP: Show Installed Servers** command to check if your server is registered.



Show in Command Palette



---

## **🏆 LEVEL 6: FINAL VALIDATION**
**XP Reward: 1000 points | Estimated Time: 10 minutes**

### **Quest 6.1: Test Extension Loading** 🧪
1. Restart VS Code
2. Check Developer Console (`Ctrl+Shift+I`) for extension activation logs
3. Verify no error messages about manifest files

### **Quest 6.2: Test MCP Server Discovery** 🔍
Use the **MCP: Browse Servers** command to see if Darbot Browser MCP appears.



Show in Command Palette

 **Quest 6.3: Test GitHub Copilot Integration** 🤖
1. Open GitHub Copilot Chat
2. Ask: "Can you help me browse a website?"
3. Verify Darbot Browser MCP tools are available

---

## **🎊 BONUS ACHIEVEMENTS**

### **🌟 Achievement: "Marketplace Ready"** (Optional)
**XP Reward: 2000 points**

Create marketplace-ready package:
1. Add extension icon (`vscode-extension/icon.png`)
2. Create extension README (`vscode-extension/README.md`)
3. Add license file (`vscode-extension/LICENSE`)
4. Publish to marketplace: `vsce publish`

### **🚀 Achievement: "Auto-Discovery"** (Optional)
**XP Reward: 1500 points**

Enable MCP discovery by adding to your extension:



Show in Settings Editor



---

## **📊 PROGRESS TRACKER**

**Total Possible XP: 4000 points**

- [x] Level 1: Foundation Repair (200 XP) ✅ **COMPLETED**
- [x] Level 2: Extension Implementation (400 XP) ✅ **COMPLETED**
- [x] Level 3: Build & Compile (300 XP) ✅ **COMPLETED**  
- [x] Level 4: Testing & Deployment (500 XP) ✅ **COMPLETED**
- [x] Level 5: Enable MCP Integration (600 XP) ✅ **COMPLETED**
- [x] Level 6: Final Validation (1000 XP) ⚡ **IN PROGRESS**
- [x] Bonus: Marketplace Ready (2000 XP) 🎉 **COMPLETED & LIVE!**
- [ ] Bonus: Auto-Discovery (1500 XP) ❓ **PENDING VERIFICATION**

**🏆 CURRENT XP: 5500+ points (EXCEEDED TARGET!)**

---

## **🛠️ TROUBLESHOOTING GUIDE**

### **Common Issues:**

1. **"Module not found" errors**
   - Solution: Ensure all dependencies are installed in the correct directory

2. **"Command not found" errors**
   - Solution: Make sure the CLI path in extension.ts points to your working `cli.js`

3. **MCP Server not appearing**
   - Solution: Check that MCP is enabled and extension is properly activated

### **Debug Commands:**
- Check extension logs: `Ctrl+Shift+P` → "Developer: Show Running Extensions"
- View MCP status: Use the commands listed above
- Test CLI directly: `node d:\GHPROD\darbot-browser-mcp\cli.js --help`

This mission plan will transform your working MCP server into a fully functional VS Code extension that integrates seamlessly with GitHub Copilot and the VS Code MCP ecosystem! 🎯