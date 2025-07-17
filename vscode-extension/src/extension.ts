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

export function activate(context: vscode.ExtensionContext) {
  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(browser) MCP: Stopped';
  statusBarItem.tooltip = 'Browser MCP Server Status';
  statusBarItem.command = 'darbot-browser-mcp.showStatus';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Register commands
  const startServerCommand = vscode.commands.registerCommand('darbot-browser-mcp.startServer', startServer);
  const stopServerCommand = vscode.commands.registerCommand('darbot-browser-mcp.stopServer', stopServer);
  const restartServerCommand = vscode.commands.registerCommand('darbot-browser-mcp.restartServer', restartServer);
  const showStatusCommand = vscode.commands.registerCommand('darbot-browser-mcp.showStatus', showStatus);

  context.subscriptions.push(startServerCommand, stopServerCommand, restartServerCommand, showStatusCommand);

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
