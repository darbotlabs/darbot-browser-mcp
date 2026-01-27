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

import * as vscode from 'vscode';

let isHostedConnected = false;
let statusBarItem: vscode.StatusBarItem;
let mcpOutputChannel: vscode.OutputChannel;
let healthCheckInterval: NodeJS.Timeout | null = null;

// Cached authentication session (for optional MSAL auth)
let cachedAuthSession: vscode.AuthenticationSession | null = null;

/**
 * Get Microsoft/Entra ID authentication token using VS Code's built-in auth
 * This is optional for hosted deployments - only used if MSAL auth is enabled
 */
async function getMicrosoftAuthToken(forceNew: boolean = false): Promise<string | null> {
  const config = vscode.workspace.getConfiguration('darbot-browser-mcp-hosted');
  const useMsalAuth = config.get('useMsalAuth', false);
  
  if (!useMsalAuth) {
    mcpOutputChannel?.appendLine('MSAL authentication disabled - using anonymous access');
    return null;
  }

  try {
    if (cachedAuthSession && !forceNew) {
      mcpOutputChannel?.appendLine('Using cached Microsoft auth session');
      return cachedAuthSession.accessToken;
    }

    const scopes = ['openid', 'profile', 'email', 'User.Read'];
    
    mcpOutputChannel?.appendLine('Requesting Microsoft authentication session...');
    
    let session = await vscode.authentication.getSession('microsoft', scopes, { 
      createIfNone: false,
      silent: true 
    });

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
  } catch (error) {
    mcpOutputChannel?.appendLine(`Microsoft authentication error: ${error}`);
    return null;
  }
}

/**
 * MCP Server Definition Provider for GitHub Copilot agent mode
 * This class provides the server configuration for VS Code's MCP infrastructure
 * For hosted servers, we use McpHttpServerDefinition with the local Docker endpoint
 */
class DarbotBrowserMCPHostedProvider implements vscode.McpServerDefinitionProvider {
  
  /**
   * Provides available MCP servers. Called eagerly by VS Code.
   */
  async provideMcpServerDefinitions(): Promise<vscode.McpServerDefinition[]> {
    const config = vscode.workspace.getConfiguration('darbot-browser-mcp-hosted');
    const mcpEndpoint = config.get('mcpEndpoint', 'http://localhost:8080/mcp');

    try {
      const McpHttpServerDefinition = (vscode as any).McpHttpServerDefinition;
      if (McpHttpServerDefinition) {
        const serverDef = new McpHttpServerDefinition(
          'Darbot Browser MCP Hosted',
          vscode.Uri.parse(mcpEndpoint),
          undefined, // Headers added in resolve
          '1.3.0'
        );
        mcpOutputChannel?.appendLine(`MCP Server Definition created: ${mcpEndpoint}`);
        return [serverDef];
      }
    } catch (e) {
      mcpOutputChannel?.appendLine(`McpHttpServerDefinition not available: ${e}`);
    }

    // Fallback for older VS Code versions
    mcpOutputChannel?.appendLine('Using fallback MCP server definition format');
    return [{
      label: 'Darbot Browser MCP Hosted',
      uri: vscode.Uri.parse(mcpEndpoint),
      version: '1.3.0'
    } as any];
  }

  /**
   * Resolves the MCP server definition before starting.
   * Optionally adds MSAL authentication if enabled.
   */
  async resolveMcpServerDefinition(
    server: vscode.McpServerDefinition, 
    token: vscode.CancellationToken
  ): Promise<vscode.McpServerDefinition | undefined> {
    mcpOutputChannel?.appendLine('Resolving MCP server definition...');

    try {
      const config = vscode.workspace.getConfiguration('darbot-browser-mcp-hosted');
      const useMsalAuth = config.get('useMsalAuth', false);

      if (useMsalAuth) {
        const authToken = await getMicrosoftAuthToken();
        
        if (authToken) {
          const serverWithAuth = server as any;
          serverWithAuth.headers = {
            ...serverWithAuth.headers,
            'Authorization': `Bearer ${authToken}`
          };
          mcpOutputChannel?.appendLine('MSAL authentication token added to server headers');
          return serverWithAuth;
        }
      }

      mcpOutputChannel?.appendLine('Using server without authentication headers');
      return server;
    } catch (error) {
      mcpOutputChannel?.appendLine(`Error resolving server: ${error}`);
      return server;
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  // Create output channel for logging
  mcpOutputChannel = vscode.window.createOutputChannel('Darbot Browser MCP Hosted');
  context.subscriptions.push(mcpOutputChannel);

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
  statusBarItem.text = '$(server) MCP Hosted: Disconnected';
  statusBarItem.tooltip = 'Browser MCP Hosted Server Status';
  statusBarItem.command = 'darbot-browser-mcp-hosted.showStatus';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Register MCP Server Definition Provider for GitHub Copilot agent mode
  try {
    const mcpProvider = new DarbotBrowserMCPHostedProvider();
    if (vscode.lm && typeof (vscode.lm as any).registerMcpServerDefinitionProvider === 'function') {
      const mcpProviderDisposable = (vscode.lm as any).registerMcpServerDefinitionProvider('darbot-browser-mcp-hosted', mcpProvider);
      context.subscriptions.push(mcpProviderDisposable);
      mcpOutputChannel.appendLine('MCP Server Definition Provider registered via vscode.lm API.');
    } else {
      const mcpApi = (vscode as any).mcp;
      if (mcpApi && typeof mcpApi.registerMcpServerDefinitionProvider === 'function') {
        const mcpProviderDisposable = mcpApi.registerMcpServerDefinitionProvider('darbot-browser-mcp-hosted', mcpProvider);
        context.subscriptions.push(mcpProviderDisposable);
        mcpOutputChannel.appendLine('MCP Server Definition Provider registered via vscode.mcp API.');
      } else {
        mcpOutputChannel.appendLine('MCP Server Definition Provider API not available. Will use settings-based configuration.');
      }
    }
  } catch (error) {
    mcpOutputChannel.appendLine(`Failed to register MCP Server Definition Provider: ${error}. Using settings-based configuration.`);
  }

  // Register commands
  const connectServerCommand = vscode.commands.registerCommand('darbot-browser-mcp-hosted.connectServer', connectToHosted);
  const disconnectServerCommand = vscode.commands.registerCommand('darbot-browser-mcp-hosted.disconnectServer', disconnectFromHosted);
  const showStatusCommand = vscode.commands.registerCommand('darbot-browser-mcp-hosted.showStatus', showStatus);
  const testConnectionCommand = vscode.commands.registerCommand('darbot-browser-mcp-hosted.testConnection', testConnection);

  context.subscriptions.push(connectServerCommand, disconnectServerCommand, showStatusCommand, testConnectionCommand);

  // Log configuration
  void configureMCPServer();

  // Auto-connect if configured
  const config = vscode.workspace.getConfiguration('darbot-browser-mcp-hosted');
  if (config.get('autoConnect', true)) {
    void connectToHosted();
  }
}

export function deactivate() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
  isHostedConnected = false;
  if (statusBarItem) {
    statusBarItem.dispose();
  }
  if (mcpOutputChannel) {
    mcpOutputChannel.dispose();
  }
}

async function configureMCPServer() {
  const config = vscode.workspace.getConfiguration('darbot-browser-mcp-hosted');
  const mcpEndpoint = config.get('mcpEndpoint', 'http://localhost:8080/mcp');
  const useMsalAuth = config.get('useMsalAuth', false);

  mcpOutputChannel.appendLine('Darbot Browser MCP Hosted server registered via McpServerDefinitionProvider.');
  mcpOutputChannel.appendLine(`MCP Endpoint: ${mcpEndpoint}`);
  mcpOutputChannel.appendLine(`Authentication: ${useMsalAuth ? 'MSAL (Microsoft Entra ID)' : 'Anonymous/None'}`);
  mcpOutputChannel.appendLine('The server will appear in GitHub Copilot agent mode tools list.');
}

async function connectToHosted() {
  if (isHostedConnected) {
    void vscode.window.showInformationMessage('Already connected to Browser MCP Hosted Server');
    return;
  }

  const config = vscode.workspace.getConfiguration('darbot-browser-mcp-hosted');
  const serverUrl = config.get('serverUrl', 'http://localhost:8080');
  const enableHealthChecks = config.get('enableHealthChecks', true);
  const healthCheckIntervalMs = config.get('healthCheckInterval', 30000);
  const autoStartContainer = config.get('autoStartContainer', true);
  const containerName = config.get('containerName', 'darbot-browser-hosted');

  mcpOutputChannel.appendLine(`Connecting to hosted server: ${serverUrl}`);

  try {
    let healthResult = await performHealthCheck(serverUrl);
    
    // If health check fails and auto-start is enabled, try to start the container
    if (!healthResult.success && autoStartContainer) {
      mcpOutputChannel.appendLine(`Server not responding. Attempting to start Docker container '${containerName}'...`);
      updateStatusBarItem(false, 'Starting...');
      
      const startResult = await startDockerContainer(containerName);
      if (startResult.success) {
        mcpOutputChannel.appendLine(`Container started. Waiting for server to be ready...`);
        // Wait a bit for the server to initialize
        await new Promise(resolve => setTimeout(resolve, 3000));
        healthResult = await performHealthCheck(serverUrl);
        
        // Retry a few times if still not ready
        let retries = 5;
        while (!healthResult.success && retries > 0) {
          mcpOutputChannel.appendLine(`Server not ready yet, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          healthResult = await performHealthCheck(serverUrl);
          retries--;
        }
      } else {
        mcpOutputChannel.appendLine(`Failed to start container: ${startResult.error}`);
      }
    }
    
    if (healthResult.success) {
      isHostedConnected = true;
      updateStatusBarItem(true);
      mcpOutputChannel.appendLine('Connected to Browser MCP Hosted Server successfully.');
      mcpOutputChannel.appendLine(`Server URL: ${serverUrl}`);
      mcpOutputChannel.appendLine(`Server Version: ${healthResult.version}`);
      mcpOutputChannel.appendLine(`Server Status: ${healthResult.status}`);
      mcpOutputChannel.show(true);

      if (enableHealthChecks) {
        healthCheckInterval = setInterval(async () => {
          const check = await performHealthCheck(serverUrl);
          if (!check.success) {
            mcpOutputChannel.appendLine(`Health check failed: ${check.error}`);
          }
        }, healthCheckIntervalMs);
      }

      void vscode.window.showInformationMessage(`Connected to Browser MCP Hosted Server (v${healthResult.version})`);
    } else {
      throw new Error(healthResult.error);
    }
  } catch (error) {
    mcpOutputChannel.appendLine(`Connection failed: ${error}`);
    void vscode.window.showErrorMessage(`Failed to connect to hosted server: ${error}`);
    updateStatusBarItem(false);
  }
}

async function performHealthCheck(serverUrl: string): Promise<{success: boolean; status?: string; version?: string; error?: string}> {
  try {
    const https = await import('https');
    const http = await import('http');
    const protocol = serverUrl.startsWith('https') ? https : http;

    return new Promise((resolve) => {
      const req = protocol.get(`${serverUrl}/health`, { timeout: 10000 }, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 503) {
            try {
              const json = JSON.parse(data);
              resolve({ success: true, status: json.status, version: json.version });
            } catch {
              resolve({ success: true, status: 'unknown', version: 'unknown' });
            }
          } else {
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
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Start a Docker container by name
 */
async function startDockerContainer(containerName: string): Promise<{success: boolean; error?: string}> {
  const { exec } = await import('child_process');
  
  return new Promise((resolve) => {
    // First try to start existing container
    exec(`docker start ${containerName}`, (error, stdout, stderr) => {
      if (error) {
        // Container might not exist, check if we should create it
        mcpOutputChannel.appendLine(`docker start failed: ${stderr || error.message}`);
        
        // Try to check if container exists but is in a bad state
        exec(`docker ps -a --filter "name=${containerName}" --format "{{.Status}}"`, (checkError, checkStdout) => {
          if (checkStdout && checkStdout.trim()) {
            // Container exists but couldn't start
            resolve({ success: false, error: `Container exists but failed to start: ${stderr || error.message}` });
          } else {
            // Container doesn't exist - provide helpful message
            resolve({ success: false, error: `Container '${containerName}' not found. Run: docker run -d --name ${containerName} -p 8080:8080 -e ALLOW_ANONYMOUS_ACCESS=true darbot-browser-hosted` });
          }
        });
      } else {
        mcpOutputChannel.appendLine(`Container '${containerName}' started successfully`);
        resolve({ success: true });
      }
    });
  });
}

function disconnectFromHosted() {
  if (!isHostedConnected) {
    void vscode.window.showInformationMessage('Not connected to Browser MCP Hosted Server');
    return;
  }

  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }

  isHostedConnected = false;
  updateStatusBarItem(false);
  mcpOutputChannel.appendLine('Disconnected from Browser MCP Hosted Server');
  void vscode.window.showInformationMessage('Disconnected from Browser MCP Hosted Server');
}

async function testConnection() {
  const config = vscode.workspace.getConfiguration('darbot-browser-mcp-hosted');
  const serverUrl = config.get('serverUrl', 'http://localhost:8080');

  mcpOutputChannel.appendLine(`Testing connection to: ${serverUrl}/health`);
  
  const result = await performHealthCheck(serverUrl);
  
  if (result.success) {
    mcpOutputChannel.appendLine(`Connection test successful!`);
    mcpOutputChannel.appendLine(`  Status: ${result.status}`);
    mcpOutputChannel.appendLine(`  Version: ${result.version}`);
    void vscode.window.showInformationMessage(`Hosted server is healthy (v${result.version}) at ${serverUrl}`);
  } else {
    mcpOutputChannel.appendLine(`Connection test failed: ${result.error}`);
    void vscode.window.showErrorMessage(`Failed to connect to hosted server: ${result.error}`);
  }
}

function showStatus() {
  const status = isHostedConnected ? 'Connected' : 'Disconnected';
  const config = vscode.workspace.getConfiguration('darbot-browser-mcp-hosted');
  const serverUrl = config.get('serverUrl', 'http://localhost:8080');
  const mcpEndpoint = config.get('mcpEndpoint', 'http://localhost:8080/mcp');
  const useMsalAuth = config.get('useMsalAuth', false);
  const hasSession = cachedAuthSession !== null;

  mcpOutputChannel.appendLine(`--- Status Check ---`);
  mcpOutputChannel.appendLine(`Connection: ${status}`);
  mcpOutputChannel.appendLine(`Server URL: ${serverUrl}`);
  mcpOutputChannel.appendLine(`MCP Endpoint: ${mcpEndpoint}`);
  mcpOutputChannel.appendLine(`Authentication: ${useMsalAuth ? (hasSession ? `MSAL (${cachedAuthSession?.account.label})` : 'MSAL (not authenticated)') : 'Anonymous'}`);
  mcpOutputChannel.show();

  vscode.window.showInformationMessage(
      `Browser MCP Hosted: ${status}`,
      ...(isHostedConnected ? ['Disconnect', 'Test Connection'] : ['Connect', 'Test Connection']),
  ).then((selection: string | undefined) => {
    if (selection === 'Connect') {
      void connectToHosted();
    } else if (selection === 'Disconnect') {
      disconnectFromHosted();
    } else if (selection === 'Test Connection') {
      void testConnection();
    }
  });
}

function updateStatusBarItem(isConnected: boolean, customStatus?: string) {
  if (statusBarItem) {
    if (customStatus) {
      statusBarItem.text = `$(server) MCP Hosted: ${customStatus}`;
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      statusBarItem.text = isConnected ? '$(server) MCP Hosted: Connected' : '$(server) MCP Hosted: Disconnected';
      statusBarItem.backgroundColor = isConnected
        ? new vscode.ThemeColor('statusBarItem.prominentBackground')
        : undefined;
    }
  }
}
