"use strict";
/**
 * Copyright (c) 2024 DarbotLabs
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
let isCloudConnected = false;
let statusBarItem;
let mcpOutputChannel;
let healthCheckInterval = null;
// Cached authentication session
let cachedAuthSession = null;
/**
 * Get Microsoft/Entra ID authentication token using VS Code's built-in auth
 * This uses the 'microsoft' authentication provider that's built into VS Code
 * The token is obtained silently if the user is already signed in
 */
async function getMicrosoftAuthToken(forceNew = false) {
    try {
        // If we have a cached session and don't need to force refresh, use it
        if (cachedAuthSession && !forceNew) {
            mcpOutputChannel?.appendLine('Using cached Microsoft auth session');
            return cachedAuthSession.accessToken;
        }
        // Request a Microsoft authentication session
        // Scopes: openid, profile, email are standard OIDC scopes
        // User.Read is for Microsoft Graph (validates the user is authenticated)
        const scopes = ['openid', 'profile', 'email', 'User.Read'];
        mcpOutputChannel?.appendLine('Requesting Microsoft authentication session...');
        // First try to get session silently (without prompting)
        let session = await vscode.authentication.getSession('microsoft', scopes, {
            createIfNone: false,
            silent: true
        });
        // If no silent session, create one (this may show a one-time sign-in prompt)
        if (!session) {
            mcpOutputChannel?.appendLine('No existing session, requesting new authentication...');
            session = await vscode.authentication.getSession('microsoft', scopes, {
                createIfNone: true
            });
        }
        if (session) {
            cachedAuthSession = session;
            mcpOutputChannel?.appendLine(`Authenticated as: ${session.account.label}`);
            return session.accessToken;
        }
        mcpOutputChannel?.appendLine('Failed to obtain Microsoft authentication session');
        return null;
    }
    catch (error) {
        mcpOutputChannel?.appendLine(`Microsoft authentication error: ${error}`);
        return null;
    }
}
/**
 * MCP Server Definition Provider for GitHub Copilot agent mode
 * This class provides the server configuration for VS Code's MCP infrastructure
 * For cloud servers, we use McpHttpServerDefinition with the Streamable HTTP endpoint
 *
 * Authentication is handled automatically using VS Code's built-in Microsoft auth:
 * - provideMcpServerDefinitions: Returns server definition without auth (called eagerly)
 * - resolveMcpServerDefinition: Gets Microsoft token and adds auth headers (called when starting)
 */
class DarbotBrowserMCPProvider {
    /**
     * Provides available MCP servers. Called eagerly by VS Code.
     * We don't do authentication here - that happens in resolveMcpServerDefinition
     */
    async provideMcpServerDefinitions() {
        const config = vscode.workspace.getConfiguration('darbot-browser-mcp-cloud');
        const sseEndpoint = config.get('sseEndpoint', '');
        // Return server definition without auth headers - auth is added in resolve
        try {
            const McpHttpServerDefinition = vscode.McpHttpServerDefinition;
            if (McpHttpServerDefinition) {
                const serverDef = new McpHttpServerDefinition('Darbot Browser MCP Cloud', vscode.Uri.parse(sseEndpoint), undefined, // No headers yet - will be added in resolveMcpServerDefinition
                '1.3.0');
                mcpOutputChannel?.appendLine(`MCP Server Definition created: ${sseEndpoint}`);
                return [serverDef];
            }
        }
        catch (e) {
            mcpOutputChannel?.appendLine(`McpHttpServerDefinition not available: ${e}`);
        }
        // Fallback for older VS Code versions
        mcpOutputChannel?.appendLine('Using fallback MCP server definition format');
        return [{
                label: 'Darbot Browser MCP Cloud',
                uri: vscode.Uri.parse(sseEndpoint),
                version: '1.3.0'
            }];
    }
    /**
     * Resolves the MCP server definition before starting.
     * This is where we do authentication - VS Code calls this when the server is about to be used.
     * We get a Microsoft token silently and add it to the headers.
     */
    async resolveMcpServerDefinition(server, token) {
        mcpOutputChannel?.appendLine('Resolving MCP server definition with authentication...');
        try {
            // Get Microsoft auth token automatically (no user interaction needed if already signed in)
            const authToken = await getMicrosoftAuthToken();
            if (!authToken) {
                mcpOutputChannel?.appendLine('Warning: No Microsoft auth token available. Server may require authentication.');
                // Return the server as-is, it might work without auth or handle it differently
                return server;
            }
            // Add the Bearer token to headers
            const serverWithAuth = server;
            serverWithAuth.headers = {
                ...serverWithAuth.headers,
                'Authorization': `Bearer ${authToken}`
            };
            mcpOutputChannel?.appendLine('Authentication token added to server headers');
            return serverWithAuth;
        }
        catch (error) {
            mcpOutputChannel?.appendLine(`Error resolving server with auth: ${error}`);
            // Return server without auth as fallback
            return server;
        }
    }
}
function activate(context) {
    // Create output channel for logging
    mcpOutputChannel = vscode.window.createOutputChannel('Darbot Browser MCP Cloud');
    context.subscriptions.push(mcpOutputChannel);
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(cloud) MCP Cloud: Disconnected';
    statusBarItem.tooltip = 'Browser MCP Cloud Server Status';
    statusBarItem.command = 'darbot-browser-mcp-cloud.showStatus';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Register MCP Server Definition Provider for GitHub Copilot agent mode
    try {
        const mcpProvider = new DarbotBrowserMCPProvider();
        // The correct API is vscode.lm.registerMcpServerDefinitionProvider (language model namespace)
        if (vscode.lm && typeof vscode.lm.registerMcpServerDefinitionProvider === 'function') {
            const mcpProviderDisposable = vscode.lm.registerMcpServerDefinitionProvider('darbot-browser-mcp-cloud', mcpProvider);
            context.subscriptions.push(mcpProviderDisposable);
            mcpOutputChannel.appendLine('MCP Server Definition Provider registered via vscode.lm API.');
        }
        else {
            // Fallback: try the older vscode.mcp API
            const mcpApi = vscode.mcp;
            if (mcpApi && typeof mcpApi.registerMcpServerDefinitionProvider === 'function') {
                const mcpProviderDisposable = mcpApi.registerMcpServerDefinitionProvider('darbot-browser-mcp-cloud', mcpProvider);
                context.subscriptions.push(mcpProviderDisposable);
                mcpOutputChannel.appendLine('MCP Server Definition Provider registered via vscode.mcp API.');
            }
            else {
                mcpOutputChannel.appendLine('MCP Server Definition Provider API not available. Will use settings-based configuration.');
            }
        }
    }
    catch (error) {
        mcpOutputChannel.appendLine(`Failed to register MCP Server Definition Provider: ${error}. Using settings-based configuration.`);
    }
    // Register commands
    const connectServerCommand = vscode.commands.registerCommand('darbot-browser-mcp-cloud.connectServer', connectToCloud);
    const disconnectServerCommand = vscode.commands.registerCommand('darbot-browser-mcp-cloud.disconnectServer', disconnectFromCloud);
    const showStatusCommand = vscode.commands.registerCommand('darbot-browser-mcp-cloud.showStatus', showStatus);
    const testConnectionCommand = vscode.commands.registerCommand('darbot-browser-mcp-cloud.testConnection', testConnection);
    context.subscriptions.push(connectServerCommand, disconnectServerCommand, showStatusCommand, testConnectionCommand);
    // Auto-configure MCP server on first activation
    void configureMCPServer();
    // Auto-connect if configured
    const config = vscode.workspace.getConfiguration('darbot-browser-mcp-cloud');
    if (config.get('autoConnect', true))
        void connectToCloud();
}
function deactivate() {
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
    }
    isCloudConnected = false;
    if (statusBarItem)
        statusBarItem.dispose();
    if (mcpOutputChannel)
        mcpOutputChannel.dispose();
}
async function configureMCPServer() {
    // The MCP server is registered via McpServerDefinitionProvider API
    // No need to write to chat.mcp.servers settings - VS Code handles this automatically
    // when the provider is registered in activate()
    const config = vscode.workspace.getConfiguration('darbot-browser-mcp-cloud');
    const mcpEndpoint = config.get('sseEndpoint', '');
    mcpOutputChannel.appendLine('Darbot Browser MCP Cloud server registered via McpServerDefinitionProvider.');
    mcpOutputChannel.appendLine(`MCP Endpoint: ${mcpEndpoint}`);
    mcpOutputChannel.appendLine('Authentication: Automatic via VS Code Microsoft account');
    mcpOutputChannel.appendLine('The server will appear in GitHub Copilot agent mode tools list.');
}
async function connectToCloud() {
    if (isCloudConnected) {
        void vscode.window.showInformationMessage('Already connected to Browser MCP Cloud Server');
        return;
    }
    const config = vscode.workspace.getConfiguration('darbot-browser-mcp-cloud');
    const serverUrl = config.get('serverUrl', '');
    const enableHealthChecks = config.get('enableHealthChecks', true);
    const healthCheckIntervalMs = config.get('healthCheckInterval', 60000);
    mcpOutputChannel.appendLine(`Connecting to cloud server: ${serverUrl}`);
    try {
        // Test connection first
        const healthResult = await performHealthCheck(serverUrl);
        if (healthResult.success) {
            isCloudConnected = true;
            updateStatusBarItem(true);
            mcpOutputChannel.appendLine('Connected to Browser MCP Cloud Server successfully.');
            mcpOutputChannel.appendLine(`Server URL: ${serverUrl}`);
            mcpOutputChannel.appendLine(`Server Version: ${healthResult.version}`);
            mcpOutputChannel.appendLine(`Server Status: ${healthResult.status}`);
            mcpOutputChannel.show(true);
            // Start periodic health checks if enabled
            if (enableHealthChecks) {
                healthCheckInterval = setInterval(async () => {
                    const check = await performHealthCheck(serverUrl);
                    if (!check.success) {
                        mcpOutputChannel.appendLine(`Health check failed: ${check.error}`);
                        // Don't disconnect automatically, just log
                    }
                }, healthCheckIntervalMs);
            }
            void vscode.window.showInformationMessage(`Connected to Browser MCP Cloud Server (v${healthResult.version})`);
        }
        else {
            throw new Error(healthResult.error);
        }
    }
    catch (error) {
        mcpOutputChannel.appendLine(`Connection failed: ${error}`);
        void vscode.window.showErrorMessage(`Failed to connect to cloud server: ${error}`);
        updateStatusBarItem(false);
    }
}
async function performHealthCheck(serverUrl) {
    try {
        const https = await import('https');
        const http = await import('http');
        const protocol = serverUrl.startsWith('https') ? https : http;
        return new Promise((resolve) => {
            const req = protocol.get(`${serverUrl}/health`, { timeout: 10000 }, res => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    // Accept 200 (healthy) and 503 (unhealthy but reachable) as valid responses
                    if (res.statusCode === 200 || res.statusCode === 503) {
                        try {
                            const json = JSON.parse(data);
                            resolve({ success: true, status: json.status, version: json.version });
                        }
                        catch {
                            resolve({ success: true, status: 'unknown', version: 'unknown' });
                        }
                    }
                    else {
                        resolve({ success: false, error: `HTTP ${res.statusCode}` });
                    }
                });
            });
            req.on('error', err => {
                resolve({ success: false, error: err.message });
            });
            req.on('timeout', () => {
                req.destroy();
                resolve({ success: false, error: 'Connection timeout' });
            });
        });
    }
    catch (error) {
        return { success: false, error: String(error) };
    }
}
function disconnectFromCloud() {
    if (!isCloudConnected) {
        void vscode.window.showInformationMessage('Not connected to Browser MCP Cloud Server');
        return;
    }
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
    }
    isCloudConnected = false;
    updateStatusBarItem(false);
    mcpOutputChannel.appendLine('Disconnected from Browser MCP Cloud Server');
    void vscode.window.showInformationMessage('Disconnected from Browser MCP Cloud Server');
}
async function testConnection() {
    const config = vscode.workspace.getConfiguration('darbot-browser-mcp-cloud');
    const serverUrl = config.get('serverUrl', '');
    mcpOutputChannel.appendLine(`Testing connection to: ${serverUrl}/health`);
    const result = await performHealthCheck(serverUrl);
    if (result.success) {
        mcpOutputChannel.appendLine(`Connection test successful!`);
        mcpOutputChannel.appendLine(`  Status: ${result.status}`);
        mcpOutputChannel.appendLine(`  Version: ${result.version}`);
        void vscode.window.showInformationMessage(`Cloud server is healthy (v${result.version}) at ${serverUrl}`);
    }
    else {
        mcpOutputChannel.appendLine(`Connection test failed: ${result.error}`);
        void vscode.window.showErrorMessage(`Failed to connect to cloud server: ${result.error}`);
    }
}
function showStatus() {
    const status = isCloudConnected ? 'Connected' : 'Disconnected';
    const config = vscode.workspace.getConfiguration('darbot-browser-mcp-cloud');
    const serverUrl = config.get('serverUrl', '');
    const mcpEndpoint = config.get('sseEndpoint', '');
    const hasSession = cachedAuthSession !== null;
    mcpOutputChannel.appendLine(`--- Status Check ---`);
    mcpOutputChannel.appendLine(`Connection: ${status}`);
    mcpOutputChannel.appendLine(`Server URL: ${serverUrl}`);
    mcpOutputChannel.appendLine(`MCP Endpoint: ${mcpEndpoint}`);
    mcpOutputChannel.appendLine(`Authentication: ${hasSession ? `Microsoft (${cachedAuthSession?.account.label})` : 'Automatic via VS Code'}`);
    mcpOutputChannel.show();
    vscode.window.showInformationMessage(`Browser MCP Cloud: ${status}`, ...(isCloudConnected ? ['Disconnect', 'Test Connection'] : ['Connect', 'Test Connection'])).then((selection) => {
        if (selection === 'Connect')
            void connectToCloud();
        else if (selection === 'Disconnect')
            disconnectFromCloud();
        else if (selection === 'Test Connection')
            void testConnection();
    });
}
function updateStatusBarItem(isConnected) {
    if (statusBarItem) {
        statusBarItem.text = isConnected ? '$(cloud) MCP Cloud: Connected' : '$(cloud) MCP Cloud: Disconnected';
        statusBarItem.backgroundColor = isConnected
            ? new vscode.ThemeColor('statusBarItem.prominentBackground')
            : undefined;
    }
}
//# sourceMappingURL=extension.js.map