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
    const lmApi = (vscode as any).lm;
    if (lmApi && typeof lmApi.registerMcpServerDefinitionProvider === 'function') {
      const mcpProviderDisposable = lmApi.registerMcpServerDefinitionProvider('darbot-browser-mcp', mcpProvider);
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
    // Check if MCP Gallery is enabled in VS Code settings (newer VS Code versions)
    // The MCP Server Definition Provider (registered in activate()) is the primary integration method
    // This configuration code handles enabling the MCP feature if not already enabled
    
    const mcpGalleryConfig = vscode.workspace.getConfiguration('chat.mcp.gallery');
    const isGalleryEnabled = mcpGalleryConfig.get('enabled', false);

    if (!isGalleryEnabled) {
      // Check if user wants to enable MCP
      const enableResult = await vscode.window.showInformationMessage(
          'Darbot Browser MCP works best with the MCP Gallery enabled. Would you like to enable it now?',
          'Enable MCP Gallery',
          'Open Settings',
          'Skip'
      );

      if (enableResult === 'Enable MCP Gallery') {
        try {
          await mcpGalleryConfig.update('enabled', true, vscode.ConfigurationTarget.Global);
          mcpOutputChannel.appendLine('MCP Gallery enabled in VS Code settings (chat.mcp.gallery.enabled).');
          
          const reloadResult = await vscode.window.showInformationMessage(
            'MCP Gallery enabled! Reload VS Code to activate the Darbot Browser MCP server.',
            'Reload Now',
            'Later'
          );
          
          if (reloadResult === 'Reload Now') {
            await vscode.commands.executeCommand('workbench.action.reloadWindow');
          }
        } catch (error) {
          mcpOutputChannel.appendLine(`Could not auto-enable MCP Gallery: ${error}`);
          mcpOutputChannel.appendLine('Please manually enable: Settings → search "chat.mcp.gallery.enabled" → check the box');
          void vscode.window.showWarningMessage(
            'Could not auto-enable MCP Gallery. Please enable it manually in Settings.',
            'Open Settings'
          ).then(selection => {
            if (selection === 'Open Settings') {
              void vscode.commands.executeCommand('workbench.action.openSettings', 'chat.mcp.gallery.enabled');
            }
          });
        }
      } else if (enableResult === 'Open Settings') {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'chat.mcp.gallery.enabled');
      } else {
        mcpOutputChannel.appendLine('MCP Gallery not enabled. The extension will still work via the MCP Server Definition Provider if available.');
      }
    } else {
      mcpOutputChannel.appendLine('MCP Gallery is already enabled. Darbot Browser MCP server is available via the MCP Server Definition Provider.');
    }
  } catch (error) {
    // Non-fatal error - the MCP Server Definition Provider should still work
    mcpOutputChannel.appendLine(`Note: Could not check/configure MCP Gallery settings: ${error}`);
    mcpOutputChannel.appendLine('The Darbot Browser MCP server is still available via the MCP Server Definition Provider.');
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

    // Track if we intentionally stopped the server
    let intentionallyStopped = false;
    const originalKill = mcpServerProcess.kill.bind(mcpServerProcess);
    mcpServerProcess.kill = (...args: Parameters<typeof originalKill>) => {
      intentionallyStopped = true;
      return originalKill(...args);
    };

    mcpServerProcess.on('exit', (code, signal) => {
      // Only show error if server crashed unexpectedly (not killed intentionally)
      if (!intentionallyStopped && code !== 0 && code !== null) {
        void vscode.window.showErrorMessage(`Browser MCP Server exited unexpectedly with code ${code}`);
      } else if (!intentionallyStopped && signal) {
        // Process was killed by a signal (not by us)
        void vscode.window.showWarningMessage(`Browser MCP Server was terminated by signal ${signal}`);
      }
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

  // Clean, multi-line status message
  const statusMessage = [
    `Darbot Browser Status: ${status}`,
    serverPath,
    `Browser: ${browser}`,
    `Headless: ${headless}`,
    `No Sandbox: ${noSandbox}`,
  ].join('\n');

  vscode.window.showInformationMessage(
      statusMessage,
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
