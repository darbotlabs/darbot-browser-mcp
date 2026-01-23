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
/**
 * MCP Server Definition Provider for GitHub Copilot agent mode
 * This class provides the server configuration for VS Code's MCP infrastructure
 * For cloud servers, we use McpHttpServerDefinition with the Streamable HTTP endpoint
 * VS Code's MCP uses POST-based initialization, so we use /mcp instead of /sse
 */
class DarbotBrowserMCPProvider {
    async provideMcpServerDefinitions() {
        const config = vscode.workspace.getConfiguration('darbot-browser-mcp-cloud');
        // Use /mcp endpoint for Streamable HTTP transport (VS Code uses POST initialization)
        const sseEndpoint = config.get('sseEndpoint', 'https://darbot-browser-mcp.azurewebsites.net/mcp');
        const authToken = config.get('authToken', '');
        const apiKey = config.get('apiKey', '');
        // Build headers for authentication if configured
        // Prefer API key over Bearer token if both are configured
        const headers = {};
        if (apiKey) {
            headers['X-API-Key'] = apiKey;
        }
        else if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        // Use McpHttpServerDefinition for remote cloud server connection
        // This is the proper VS Code API for HTTP/SSE-based MCP servers
        try {
            const McpHttpServerDefinition = vscode.McpHttpServerDefinition;
            if (McpHttpServerDefinition) {
                const serverDef = new McpHttpServerDefinition('Darbot Browser MCP Cloud', vscode.Uri.parse(sseEndpoint), Object.keys(headers).length > 0 ? headers : undefined, '1.3.0');
                mcpOutputChannel?.appendLine(`MCP HTTP Server Definition created: ${sseEndpoint}`);
                return [serverDef];
            }
        }
        catch (e) {
            mcpOutputChannel?.appendLine(`McpHttpServerDefinition not available: ${e}`);
        }
        // Fallback: Return a plain object that VS Code may accept
        mcpOutputChannel?.appendLine('Using fallback MCP server definition format');
        return [{
                label: 'Darbot Browser MCP Cloud',
                uri: vscode.Uri.parse(sseEndpoint),
                headers: Object.keys(headers).length > 0 ? headers : undefined,
                version: '1.3.0'
            }];
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
    // Check if auto-configuration is enabled
    const config = vscode.workspace.getConfiguration('darbot-browser-mcp-cloud');
    const autoConfigureMCP = config.get('autoConfigureMCP', true);
    if (!autoConfigureMCP) {
        mcpOutputChannel.appendLine('Auto-configuration disabled. Please manually configure MCP settings.');
        return;
    }
    try {
        // Get MCP configuration - note: chat.mcp.enabled may not be a registered setting in all VS Code versions
        const mcpConfig = vscode.workspace.getConfiguration('chat.mcp');
        // Skip the enabled check - VS Code automatically enables MCP when servers are configured
        // The chat.mcp.enabled setting may not exist in all VS Code versions
        mcpOutputChannel.appendLine('Configuring Darbot Browser MCP Cloud server...');
        // Check if this MCP server is already configured
        const servers = mcpConfig.get('servers', {});
        const serverName = 'darbot-browser-mcp-cloud';
        if (!servers[serverName]) {
            // Auto-configure the MCP server with cloud Streamable HTTP connection
            const darbotConfig = vscode.workspace.getConfiguration('darbot-browser-mcp-cloud');
            // Use /mcp endpoint for Streamable HTTP transport (VS Code uses POST initialization)
            const mcpEndpoint = darbotConfig.get('sseEndpoint', 'https://darbot-browser-mcp.azurewebsites.net/mcp');
            const authToken = darbotConfig.get('authToken', '');
            const apiKey = darbotConfig.get('apiKey', '');
            // Use URL-based HTTP transport for remote cloud server
            // VS Code MCP uses Streamable HTTP (POST-based) rather than SSE (GET-based)
            const serverConfig = {
                url: mcpEndpoint,
                transport: 'http' // Use http transport for Streamable HTTP /mcp endpoint
            };
            // Add authentication headers if configured
            // Prefer API key over Bearer token if both are configured
            if (apiKey) {
                serverConfig.headers = {
                    'X-API-Key': apiKey
                };
            }
            else if (authToken) {
                serverConfig.headers = {
                    'Authorization': `Bearer ${authToken}`
                };
            }
            servers[serverName] = serverConfig;
            await mcpConfig.update('servers', servers, vscode.ConfigurationTarget.Global);
            mcpOutputChannel.appendLine('Darbot Browser MCP Cloud server configured automatically for GitHub Copilot agent mode.');
            mcpOutputChannel.appendLine(`Server name: ${serverName}`);
            mcpOutputChannel.appendLine(`MCP Endpoint: ${mcpEndpoint}`);
            mcpOutputChannel.appendLine('This server will be available as a selectable tool in GitHub Copilot agent mode.');
            // Also try to configure the GitHub Copilot Chat MCP settings if available
            try {
                const copilotConfig = vscode.workspace.getConfiguration('github.copilot.chat.mcp');
                if (copilotConfig) {
                    const copilotServers = copilotConfig.get('servers', {});
                    if (!copilotServers[serverName]) {
                        copilotServers[serverName] = serverConfig;
                        await copilotConfig.update('servers', copilotServers, vscode.ConfigurationTarget.Global);
                        mcpOutputChannel.appendLine('Darbot Browser MCP also configured for GitHub Copilot Chat MCP integration.');
                    }
                }
            }
            catch (copilotError) {
                mcpOutputChannel.appendLine(`GitHub Copilot Chat MCP configuration not available: ${copilotError}`);
            }
            const restartResult = await vscode.window.showInformationMessage('Darbot Browser MCP Cloud has been configured for GitHub Copilot agent mode! Please restart VS Code to complete the setup, or use the Command Palette to test the connection.', 'Restart VS Code', 'Test Connection', 'Show Configuration');
            if (restartResult === 'Restart VS Code') {
                await vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
            else if (restartResult === 'Test Connection') {
                await testConnection();
            }
            else if (restartResult === 'Show Configuration') {
                mcpOutputChannel.show();
                await vscode.commands.executeCommand('workbench.action.openSettings', 'chat.mcp');
            }
        }
        else {
            mcpOutputChannel.appendLine('Darbot Browser MCP Cloud server already configured.');
            mcpOutputChannel.appendLine('Server is available as a selectable tool in GitHub Copilot agent mode.');
        }
    }
    catch (error) {
        mcpOutputChannel.appendLine(`Error configuring MCP server: ${error}`);
        void vscode.window.showErrorMessage(`Failed to configure Darbot Browser MCP: ${error}`);
    }
}
async function connectToCloud() {
    if (isCloudConnected) {
        void vscode.window.showInformationMessage('Already connected to Browser MCP Cloud Server');
        return;
    }
    const config = vscode.workspace.getConfiguration('darbot-browser-mcp-cloud');
    const serverUrl = config.get('serverUrl', 'https://darbot-browser-mcp.azurewebsites.net');
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
    const serverUrl = config.get('serverUrl', 'https://darbot-browser-mcp.azurewebsites.net');
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
    const serverUrl = config.get('serverUrl', 'https://darbot-browser-mcp.azurewebsites.net');
    const mcpEndpoint = config.get('sseEndpoint', 'https://darbot-browser-mcp.azurewebsites.net/mcp');
    const hasApiKey = config.get('apiKey', '') !== '';
    const hasAuthToken = config.get('authToken', '') !== '';
    const hasAuth = hasApiKey || hasAuthToken;
    mcpOutputChannel.appendLine(`--- Status Check ---`);
    mcpOutputChannel.appendLine(`Connection: ${status}`);
    mcpOutputChannel.appendLine(`Server URL: ${serverUrl}`);
    mcpOutputChannel.appendLine(`MCP Endpoint: ${mcpEndpoint}`);
    mcpOutputChannel.appendLine(`Authentication: ${hasAuth ? (hasApiKey ? 'API Key' : 'Bearer Token') : 'None'}`);
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