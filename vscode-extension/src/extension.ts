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
    const serverPath = config.get('serverPath', 'npx @darbotlabs/darbot-browser-mcp@latest');
    const browser = config.get('browser', 'msedge');
    const headless = config.get('headless', false);
    const noSandbox = config.get('noSandbox', true);
    const logLevel = config.get('logLevel', 'info');

    // Parse the command
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
        // Ensure NODE_ENV is set for proper operation
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

  context.subscriptions.push(startServerCommand, stopServerCommand, restartServerCommand, showStatusCommand);

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

async function configureMCPServer() {
  // Check if auto-configuration is enabled
  const config = vscode.workspace.getConfiguration('darbot-browser-mcp');
  const autoConfigureMCP = config.get('autoConfigureMCP', true);

  if (!autoConfigureMCP) {
    mcpOutputChannel.appendLine('Auto-configuration disabled. Please manually configure MCP settings.');
    return;
  }

  try {
    // Check if MCP is enabled in VS Code settings
    const mcpConfig = vscode.workspace.getConfiguration('chat.mcp');
    const isMcpEnabled = mcpConfig.get('enabled', false);

    if (!isMcpEnabled) {
      const enableResult = await vscode.window.showInformationMessage(
          'Darbot Browser MCP requires the Model Context Protocol (MCP) to be enabled in VS Code. Would you like to enable it now?',
          'Enable MCP',
          'Not Now'
      );

      if (enableResult === 'Enable MCP') {
        await mcpConfig.update('enabled', true, vscode.ConfigurationTarget.Global);
        mcpOutputChannel.appendLine('MCP enabled in VS Code settings.');
      } else {
        mcpOutputChannel.appendLine('MCP not enabled. Extension will not function fully until MCP is enabled.');
        return;
      }
    }

    // Check if this MCP server is already configured
    const servers = mcpConfig.get('servers', {}) as Record<string, any>;
    const serverName = 'darbot-browser-mcp';

    if (!servers[serverName]) {
      // Auto-configure the MCP server with enhanced configuration
      const darbotConfig = vscode.workspace.getConfiguration('darbot-browser-mcp');
      const browser = darbotConfig.get('browser', 'msedge');
      const headless = darbotConfig.get('headless', false);
      const noSandbox = darbotConfig.get('noSandbox', true);
      const logLevel = darbotConfig.get('logLevel', 'info');

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


      const serverConfig = {
        command: 'npx',
        args: args,
        env: {
          NODE_ENV: 'production'
        }
      };

      servers[serverName] = serverConfig;
      await mcpConfig.update('servers', servers, vscode.ConfigurationTarget.Global);

      mcpOutputChannel.appendLine('Darbot Browser MCP server configured automatically for GitHub Copilot agent mode.');
      mcpOutputChannel.appendLine(`Server name: ${serverName}`);
      mcpOutputChannel.appendLine(`Command: ${serverConfig.command} ${serverConfig.args.join(' ')}`);
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
  const serverPath = config.get('serverPath', 'npx @darbotlabs/darbot-browser-mcp@latest');
  const browser = config.get('browser', 'msedge');
  const headless = config.get('headless', false);
  const noSandbox = config.get('noSandbox', true);

  const configInfo = `Browser: ${browser}, Headless: ${headless}, No Sandbox: ${noSandbox}`;

  vscode.window.showInformationMessage(
      `Browser MCP Server Status: ${status}\nCommand: ${serverPath}\nConfig: ${configInfo}`,
      ...(isRunning ? ['Stop Server', 'Restart Server'] : ['Start Server']),
  ).then(selection => {
    if (selection === 'Start Server')
      void startServer();
    else if (selection === 'Stop Server')
      stopServer();
    else if (selection === 'Restart Server')
      void restartServer();
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
