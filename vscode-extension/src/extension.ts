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
import { spawn, ChildProcess } from 'child_process';

let mcpServerProcess: ChildProcess | null = null;
let statusBarItem: vscode.StatusBarItem;
let mcpOutputChannel: vscode.OutputChannel;

/**
 * MCP Server Definition Provider for GitHub Copilot agent mode
 * This class provides the server configuration for VS Code's MCP infrastructure
 */
class DarbotBrowserMCPProvider implements vscode.McpServerDefinitionProvider {
  async provideMcpServerDefinitions(): Promise<vscode.McpServerDefinition[]> {
    const config = vscode.workspace.getConfiguration('darbot-browser-mcp');
    const deploymentMode = config.get('deploymentMode', 'local') as string;
    const browser = config.get('browser', 'msedge');
    const headless = config.get('headless', false);
    const noSandbox = config.get('noSandbox', true);
    const logLevel = config.get('logLevel', 'info');

    // For hosted and cloud modes, we only support command-based execution in the provider
    // URL-based connections must be configured manually in chat.mcp.servers settings
    if (deploymentMode === 'hosted' || deploymentMode === 'cloud') {
      // Return empty array - these modes use URL configuration in settings
      return [];
    }

    // Local mode: Use NPX
    const serverPath = config.get('serverPath', 'npx @darbotlabs/darbot-browser-mcp@latest');
    const parts = serverPath.split(' ');
    const command = parts[0];
    const args = [...parts.slice(1)];

    // Add browser configuration options
    if (browser !== 'msedge')
      args.push('--browser', browser);

    if (headless)
      args.push('--headless');

    if (noSandbox)
      args.push('--no-sandbox');

    if (logLevel !== 'info')
      args.push('--log-level', logLevel);

    return [{
      label: 'Darbot Browser MCP',
      command,
      args,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production'
      }
    }];
  }
}

export function activate(context: vscode.ExtensionContext) {
  // Create output channel for logging
  mcpOutputChannel = vscode.window.createOutputChannel('Darbot Browser MCP');
  context.subscriptions.push(mcpOutputChannel);

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(browser) MCP: Stopped';
  statusBarItem.tooltip = 'Browser MCP Server Status';
  statusBarItem.command = 'darbot-browser-mcp.showStatus';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Prompt for deployment mode on first activation if not configured
  void promptForDeploymentMode(context);

  // Register MCP Server Definition Provider for GitHub Copilot agent mode
  try {
    const mcpProvider = new DarbotBrowserMCPProvider();
    // Try to register the MCP provider - this may not be available in all VS Code versions
    const mcpApi = (vscode as any).mcp;
    if (mcpApi && typeof mcpApi.registerMcpServerDefinitionProvider === 'function') {
      const mcpProviderDisposable = mcpApi.registerMcpServerDefinitionProvider('darbot-browser-mcp', mcpProvider);
      context.subscriptions.push(mcpProviderDisposable);
      mcpOutputChannel.appendLine('MCP Server Definition Provider registered for GitHub Copilot agent mode.');
    } else {
      mcpOutputChannel.appendLine('MCP Server Definition Provider API not available in this VS Code version. Using fallback configuration.');
    }
  } catch (error) {
    mcpOutputChannel.appendLine(`Failed to register MCP Server Definition Provider: ${error}. Using fallback configuration.`);
  }

  // Register commands
  const startServerCommand = vscode.commands.registerCommand('darbot-browser-mcp.startServer', startServer);
  const stopServerCommand = vscode.commands.registerCommand('darbot-browser-mcp.stopServer', stopServer);
  const restartServerCommand = vscode.commands.registerCommand('darbot-browser-mcp.restartServer', restartServer);
  const showStatusCommand = vscode.commands.registerCommand('darbot-browser-mcp.showStatus', showStatus);
  const configureDeploymentCommand = vscode.commands.registerCommand('darbot-browser-mcp.configureDeploymentMode', () => promptForDeploymentMode(context));

  context.subscriptions.push(startServerCommand, stopServerCommand, restartServerCommand, showStatusCommand, configureDeploymentCommand);

  // Auto-configure MCP server on first activation
  void configureMCPServer();

  // Auto-start if configured
  const config = vscode.workspace.getConfiguration('darbot-browser-mcp');
  if (config.get('autoStart', false))
    void startServer();
}

export function deactivate() {
  if (mcpServerProcess) {
    mcpServerProcess.kill();
    mcpServerProcess = null;
  }
  if (statusBarItem)
    statusBarItem.dispose();
  if (mcpOutputChannel)
    mcpOutputChannel.dispose();
}

async function promptForDeploymentMode(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('darbot-browser-mcp');
  const hasBeenPrompted = context.globalState.get('deploymentModePrompted', false);

  if (hasBeenPrompted) {
    return;
  }

  const deploymentMode = await vscode.window.showQuickPick(
    [
      {
        label: '$(desktop-download) Local',
        description: 'Run via NPX - Quick setup, no Docker required',
        detail: 'Best for: Quick testing, local development',
        value: 'local'
      },
      {
        label: '$(server) Hosted (Docker)',
        description: 'On-premises with MSAL auth and Dev Tunnels',
        detail: 'Best for: Enterprise on-premises with secure remote access',
        value: 'hosted'
      },
      {
        label: '$(cloud) Cloud (Azure)',
        description: 'Azure App Service with enterprise features',
        detail: 'Best for: Production deployments, scalability, Microsoft Copilot Studio integration',
        value: 'cloud'
      }
    ],
    {
      placeHolder: 'Choose how you want to deploy Darbot Browser MCP',
      title: 'Darbot Browser MCP - Deployment Mode'
    }
  );

  if (!deploymentMode) {
    return;
  }

  await config.update('deploymentMode', deploymentMode.value, vscode.ConfigurationTarget.Global);
  await context.globalState.update('deploymentModePrompted', true);

  mcpOutputChannel.appendLine(`Deployment mode set to: ${deploymentMode.value}`);

  if (deploymentMode.value === 'hosted') {
    const hostedUrl = await vscode.window.showInputBox({
      prompt: 'Enter the URL for your hosted Docker instance',
      value: 'http://localhost:8080',
      placeHolder: 'http://localhost:8080 or https://your-tunnel.devtunnels.ms'
    });

    if (hostedUrl) {
      await config.update('hostedUrl', hostedUrl, vscode.ConfigurationTarget.Global);
    }
  } else if (deploymentMode.value === 'cloud') {
    const cloudUrl = await vscode.window.showInputBox({
      prompt: 'Enter your Azure App Service URL',
      placeHolder: 'https://your-app.azurewebsites.net'
    });

    if (cloudUrl) {
      await config.update('cloudUrl', cloudUrl, vscode.ConfigurationTarget.Global);
    }
  }

  await vscode.window.showInformationMessage(
    `Deployment mode configured: ${deploymentMode.label}. You can change this in settings.`,
    'Configure Now'
  ).then(selection => {
    if (selection === 'Configure Now') {
      void configureMCPServer();
    }
  });
}

async function configureMCPServer() {
  // Check if auto-configuration is enabled
  const config = vscode.workspace.getConfiguration('darbot-browser-mcp');
  const autoConfigureMCP = config.get('autoConfigureMCP', true);
  const deploymentMode = config.get('deploymentMode', 'local');

  if (!autoConfigureMCP) {
    mcpOutputChannel.appendLine('Auto-configuration disabled. Please manually configure MCP settings.');
    return;
  }

  try {
    // MCP configuration is stored in mcp.json, not settings.json
    // We'll use VS Code's workspace configuration API which should handle the file location
    const mcpConfig = vscode.workspace.getConfiguration('mcp');
    let isMcpEnabled = false;
    
    // Try to check if MCP is enabled, but handle if the setting doesn't exist
    try {
      isMcpEnabled = mcpConfig.get('enabled', false);
    } catch (error) {
      mcpOutputChannel.appendLine('Note: chat.mcp.enabled setting not available in this VS Code version.');
      // MCP might be enabled by default or not supported - we'll try to configure anyway
    }

    if (!isMcpEnabled) {
      try {
        const enableResult = await vscode.window.showInformationMessage(
            'Darbot Browser MCP works with the Model Context Protocol (MCP). Would you like to enable MCP support?',
            'Enable MCP',
            'Skip',
            'Continue Anyway'
        );

        if (enableResult === 'Enable MCP') {
          try {
            await mcpConfig.update('enabled', true, vscode.ConfigurationTarget.Global);
            mcpOutputChannel.appendLine('MCP enabled in VS Code settings.');
          } catch (updateError) {
            mcpOutputChannel.appendLine(`Unable to enable MCP automatically: ${updateError}. You may need to enable it manually in settings.`);
          }
        } else if (enableResult === 'Skip') {
          mcpOutputChannel.appendLine('Skipping MCP configuration. You can configure manually later.');
          return;
        } else {
          mcpOutputChannel.appendLine('Continuing with MCP server configuration...');
        }
      } catch (error) {
        mcpOutputChannel.appendLine(`MCP enable prompt error: ${error}. Continuing with configuration...`);
      }
    }

    // Check if this MCP server is already configured
    let servers: Record<string, any> = {};
    try {
      servers = mcpConfig.get('servers', {}) as Record<string, any>;
    } catch (error) {
      mcpOutputChannel.appendLine(`Unable to read MCP servers configuration: ${error}`);
      servers = {};
    }
    
    const serverName = 'darbot-browser-mcp';

    if (!servers[serverName]) {
      // Auto-configure the MCP server based on deployment mode
      const darbotConfig = vscode.workspace.getConfiguration('darbot-browser-mcp');
      const browser = darbotConfig.get('browser', 'msedge');
      const headless = darbotConfig.get('headless', false);
      const noSandbox = darbotConfig.get('noSandbox', true);
      const logLevel = darbotConfig.get('logLevel', 'info');

      let serverConfig: any;

      if (deploymentMode === 'local') {
        // Local mode: Use NPX with stdio transport
        const args = ['@darbotlabs/darbot-browser-mcp@latest'];

        // Add browser configuration options
        if (browser !== 'msedge')
          args.push('--browser', browser);

        if (headless)
          args.push('--headless');

        if (noSandbox)
          args.push('--no-sandbox');

        if (logLevel !== 'info')
          args.push('--log-level', logLevel);

        serverConfig = {
          command: 'npx',
          args: args,
          type: 'stdio'
        };
      } else if (deploymentMode === 'hosted') {
        // Hosted mode: Connect to Docker instance via HTTP
        const hostedUrl = darbotConfig.get('hostedUrl', 'http://localhost:8080');
        serverConfig = {
          url: `${hostedUrl}/mcp`,
          type: 'http'
        };
      } else if (deploymentMode === 'cloud') {
        // Cloud mode: Connect to Azure App Service via HTTP
        const cloudUrl = darbotConfig.get('cloudUrl', '');
        if (!cloudUrl) {
          void vscode.window.showErrorMessage('Cloud mode selected but no Azure URL configured. Please set darbot-browser-mcp.cloudUrl in settings.');
          return;
        }
        serverConfig = {
          url: `${cloudUrl}/mcp`,
          type: 'http'
        };
      } else {
        // Default fallback to local mode
        serverConfig = {
          command: 'npx',
          args: ['@darbotlabs/darbot-browser-mcp@latest'],
          type: 'stdio'
        };
      }

      servers[serverName] = serverConfig;
      
      try {
        // Try using VS Code's MCP configuration API
        await mcpConfig.update('servers', servers, vscode.ConfigurationTarget.Global);
        mcpOutputChannel.appendLine('Darbot Browser MCP server configured automatically for GitHub Copilot agent mode.');
      } catch (updateError) {
        mcpOutputChannel.appendLine(`Configuration method 1 failed: ${updateError}`);
        
        // Try alternative: Direct file manipulation via VS Code's file system API
        try {
          const mcpJsonPath = vscode.Uri.file(
            process.platform === 'win32'
              ? `${process.env.APPDATA}\\Code - Insiders\\User\\mcp.json`
              : process.platform === 'darwin'
              ? `${process.env.HOME}/Library/Application Support/Code - Insiders/User/mcp.json`
              : `${process.env.HOME}/.config/Code - Insiders/User/mcp.json`
          );
          
          const fileContent = await vscode.workspace.fs.readFile(mcpJsonPath);
          const mcpData = JSON.parse(Buffer.from(fileContent).toString('utf8'));
          
          if (!mcpData.servers) {
            mcpData.servers = {};
          }
          
          mcpData.servers[serverName] = serverConfig;
          
          await vscode.workspace.fs.writeFile(
            mcpJsonPath,
            Buffer.from(JSON.stringify(mcpData, null, 2), 'utf8')
          );
          
          mcpOutputChannel.appendLine('Darbot Browser MCP server configured successfully via direct file write.');
        } catch (fileError) {
          mcpOutputChannel.appendLine(`Configuration method 2 failed: ${fileError}`);
          mcpOutputChannel.appendLine('You may need to manually add the server configuration to your MCP settings.');
          mcpOutputChannel.appendLine('\nManual configuration for mcp.json:');
          mcpOutputChannel.appendLine(JSON.stringify({ servers: { [serverName]: serverConfig } }, null, 2));
        }
      }
      
      mcpOutputChannel.appendLine(`Server name: ${serverName}`);
      mcpOutputChannel.appendLine(`Deployment mode: ${deploymentMode}`);
      
      if (deploymentMode === 'local') {
        mcpOutputChannel.appendLine(`Command: ${serverConfig.command} ${serverConfig.args.join(' ')}`);
      } else {
        mcpOutputChannel.appendLine(`URL: ${serverConfig.url}`);
      }
      
      mcpOutputChannel.appendLine('This server will be available as a selectable tool in GitHub Copilot agent mode.');

      // Also try to configure the GitHub Copilot Chat MCP settings if available
      try {
        const copilotConfig = vscode.workspace.getConfiguration('github.copilot.chat.mcp');
        if (copilotConfig) {
          const copilotServers = copilotConfig.get('servers', {}) as Record<string, any>;
          if (!copilotServers[serverName]) {
            copilotServers[serverName] = serverConfig;
            await copilotConfig.update('servers', copilotServers, vscode.ConfigurationTarget.Global);
            mcpOutputChannel.appendLine('Darbot Browser MCP also configured for GitHub Copilot Chat MCP integration.');
          }
        }
      } catch (copilotError) {
        mcpOutputChannel.appendLine(`GitHub Copilot Chat MCP configuration not available: ${copilotError}`);
      }

      const restartResult = await vscode.window.showInformationMessage(
          'Darbot Browser MCP has been configured for GitHub Copilot agent mode! Please restart VS Code to complete the setup, or use the Command Palette to start the server.',
          'Restart VS Code',
          'Start Server Now',
          'Show Configuration'
      );

      if (restartResult === 'Restart VS Code') {
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
      } else if (restartResult === 'Start Server Now') {
        await startServer();
      } else if (restartResult === 'Show Configuration') {
        mcpOutputChannel.show();
        await vscode.commands.executeCommand('workbench.action.openSettings', 'chat.mcp');
      }
    } else {
      mcpOutputChannel.appendLine('Darbot Browser MCP server already configured.');
      mcpOutputChannel.appendLine('Server is available as a selectable tool in GitHub Copilot agent mode.');
    }
  } catch (error) {
    mcpOutputChannel.appendLine(`Error configuring MCP server: ${error}`);
    void vscode.window.showErrorMessage(`Failed to configure Darbot Browser MCP: ${error}`);
  }
}

async function startServer() {
  if (mcpServerProcess) {
    void vscode.window.showInformationMessage('Browser MCP Server is already running');
    return;
  }

  const config = vscode.workspace.getConfiguration('darbot-browser-mcp');
  const serverPath = config.get('serverPath', 'npx @darbotlabs/darbot-browser-mcp@latest');
  const logLevel = config.get('logLevel', 'info');
  const browser = config.get('browser', 'msedge');
  const headless = config.get('headless', false);
  const noSandbox = config.get('noSandbox', true);

  try {
    // Parse the command
    const parts = serverPath.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    // Add browser configuration options
    if (browser !== 'msedge')
      args.push('--browser', browser);
    if (headless)
      args.push('--headless');
    if (noSandbox)
      args.push('--no-sandbox');

    // Add log level if specified
    if (logLevel !== 'info')
      args.push('--log-level', logLevel);

    // Display configuration to user
    const configDetails = `Browser: ${browser}, Headless: ${headless}, No Sandbox: ${noSandbox}`;
    // Log configuration for debugging
    // eslint-disable-next-line no-console
    console.debug(configDetails); // Log to debugging output

    mcpServerProcess = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
    });

    mcpServerProcess.on('error', error => {
      void vscode.window.showErrorMessage(`Failed to start Browser MCP Server: ${error.message}`);
      mcpServerProcess = null;
      updateStatusBarItem(false);
    });

    mcpServerProcess.on('exit', code => {
      if (code !== 0)
        void vscode.window.showErrorMessage(`Browser MCP Server exited with code ${code}`);
      mcpServerProcess = null;
      updateStatusBarItem(false);
    });

    mcpServerProcess.stdout?.on('data', data => {
      // Log server output for debugging
      void data; // Suppress unused variable warning
    });

    mcpServerProcess.stderr?.on('data', data => {
      // Log server errors for debugging
      void data; // Suppress unused variable warning
    });

    updateStatusBarItem(true);
    mcpOutputChannel.appendLine('Browser MCP Server started successfully.');
    mcpOutputChannel.appendLine(`Configuration Details: ${configDetails}`);
    mcpOutputChannel.show(true);
    void vscode.window.showInformationMessage('Browser MCP Server started successfully. Check the "Browser MCP" output channel for details.');
  } catch (error) {
    void vscode.window.showErrorMessage(`Failed to start Browser MCP Server: ${error}`);
    updateStatusBarItem(false);
  }
}

function stopServer() {
  if (!mcpServerProcess) {
    void vscode.window.showInformationMessage('Browser MCP Server is not running');
    return;
  }

  mcpServerProcess.kill();
  mcpServerProcess = null;
  updateStatusBarItem(false);
  void vscode.window.showInformationMessage('Browser MCP Server stopped');
}

async function restartServer() {
  if (mcpServerProcess) {
    stopServer();
    // Wait a moment for the process to fully stop
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  await startServer();
}

function showStatus() {
  const isRunning = mcpServerProcess !== null;
  const status = isRunning ? 'Running' : 'Stopped';
  const config = vscode.workspace.getConfiguration('darbot-browser-mcp');
  const deploymentMode = config.get('deploymentMode', 'local');
  const serverPath = config.get('serverPath', 'npx @darbotlabs/darbot-browser-mcp@latest');
  const browser = config.get('browser', 'msedge');
  const headless = config.get('headless', false);
  const noSandbox = config.get('noSandbox', true);

  let modeInfo = '';
  if (deploymentMode === 'local') {
    const configInfo = `Browser: ${browser}, Headless: ${headless}, No Sandbox: ${noSandbox}`;
    modeInfo = `Mode: Local (NPX)\nCommand: ${serverPath}\nConfig: ${configInfo}`;
  } else if (deploymentMode === 'hosted') {
    const hostedUrl = config.get('hostedUrl', 'http://localhost:8080');
    modeInfo = `Mode: Hosted (Docker)\nURL: ${hostedUrl}`;
  } else if (deploymentMode === 'cloud') {
    const cloudUrl = config.get('cloudUrl', '');
    modeInfo = `Mode: Cloud (Azure)\nURL: ${cloudUrl}`;
  }

  vscode.window.showInformationMessage(
      `Browser MCP Server Status: ${status}\n${modeInfo}`,
      ...(isRunning ? ['Stop Server', 'Restart Server'] : ['Start Server']),
      'Change Mode'
  ).then(selection => {
    if (selection === 'Start Server')
      void startServer();
    else if (selection === 'Stop Server')
      stopServer();
    else if (selection === 'Restart Server')
      void restartServer();
    else if (selection === 'Change Mode')
      void vscode.commands.executeCommand('workbench.action.openSettings', 'darbot-browser-mcp.deploymentMode');
  });
}

function updateStatusBarItem(isRunning: boolean) {
  if (statusBarItem) {
    statusBarItem.text = isRunning ? '$(browser) MCP: Running' : '$(browser) MCP: Stopped';
    statusBarItem.backgroundColor = isRunning
      ? new vscode.ThemeColor('statusBarItem.prominentBackground')
      : undefined;
  }
}
