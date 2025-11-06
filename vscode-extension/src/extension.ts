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
  async provideMcpServerDefinitions(): Promise<vscode.McpStdioServerDefinition[]> {
    const config = vscode.workspace.getConfiguration('darbot-browser-mcp');
    const serverPath = config.get<string>('serverPath', 'npx github:pantelisbischitzis/darbot-browser-mcp');
    const browser = config.get<string>('browser', 'msedge');
    const browserExecutablePath = config.get<string>('browserExecutablePath', '');
    const headless = config.get<boolean>('headless', false);
    const noSandbox = config.get<boolean>('noSandbox', true);
    const logLevel = config.get<string>('logLevel', 'info');

    // Parse the command
    const parts = serverPath.split(' ');
    const command = parts[0];
    const args = [...parts.slice(1)];

    // Add browser channel configuration
    const browserChannel = this.getBrowserChannel(browser);
    if (browserChannel !== 'msedge')
      args.push('--browser', browserChannel);

    // Add custom browser executable path if specified
    if (browserExecutablePath && browserExecutablePath.trim())
      args.push('--executable-path', browserExecutablePath.trim());


    if (headless)
      args.push('--headless');

    if (noSandbox)
      args.push('--no-sandbox');

    if (logLevel !== 'info')
      args.push('--log-level', logLevel);

    const env = {
      // Ensure NODE_ENV is set for proper operation
      NODE_ENV: process.env.NODE_ENV || 'production'
    };

    return [
      new vscode.McpStdioServerDefinition(
          'Darbot Browser MCP',
          command,
          args,
          env
      )
    ];
  }

  /**
   * Get the Playwright browser channel name from the VS Code setting value
   * Maps VS Code-friendly names to Playwright channel identifiers
   */
  private getBrowserChannel(browser: string): string {
    // Map browser channels to Playwright format
    const channelMap: Record<string, string> = {
      'msedge': 'msedge',
      'msedge-beta': 'msedge-beta',
      'msedge-dev': 'msedge-dev',
      'msedge-canary': 'msedge-canary',
      'chrome': 'chrome',
      'chrome-beta': 'chrome-beta',
      'chrome-dev': 'chrome-dev',
      'chrome-canary': 'chrome-canary',
      'firefox': 'firefox',
      'firefox-developer': 'firefox', // Firefox Developer Edition uses same browser name
      'firefox-nightly': 'firefox', // Firefox Nightly uses same browser name
      'webkit': 'webkit'
    };

    return channelMap[browser] || browser;
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

  // Register MCP Server Definition Provider for GitHub Copilot agent mode (VS Code 1.96.0+)
  // This is the new, preferred method for MCP server registration
  const hasLmApi = !!(vscode.lm && typeof vscode.lm.registerMcpServerDefinitionProvider === 'function');
  let shouldUseLegacyConfig = !hasLmApi;
  try {
    const mcpProvider = new DarbotBrowserMCPProvider();
    // Register using the proper VS Code LM API
    if (hasLmApi) {
      const mcpProviderDisposable = vscode.lm.registerMcpServerDefinitionProvider('darbot-browser-mcp', mcpProvider);
      context.subscriptions.push(mcpProviderDisposable);
      mcpOutputChannel.appendLine('✓ MCP Server Definition Provider registered successfully.');
      mcpOutputChannel.appendLine('The server will appear in the MCP servers list in VS Code.');
      shouldUseLegacyConfig = false; // New API available, skip legacy configuration
    } else {
      mcpOutputChannel.appendLine('⚠ MCP Server Definition Provider API not available in this VS Code version.');
      mcpOutputChannel.appendLine('Falling back to legacy configuration method.');
    }
  } catch (error) {
    mcpOutputChannel.appendLine(`✗ Failed to register MCP Server Definition Provider: ${error}`);
    mcpOutputChannel.appendLine('Falling back to legacy configuration method.');
  }

  // Register commands
  const startServerCommand = vscode.commands.registerCommand('darbot-browser-mcp.startServer', startServer);
  const stopServerCommand = vscode.commands.registerCommand('darbot-browser-mcp.stopServer', stopServer);
  const restartServerCommand = vscode.commands.registerCommand('darbot-browser-mcp.restartServer', restartServer);
  const showStatusCommand = vscode.commands.registerCommand('darbot-browser-mcp.showStatus', showStatus);

  context.subscriptions.push(startServerCommand, stopServerCommand, restartServerCommand, showStatusCommand);

  // Use legacy configuration for older VS Code versions, new API for 1.96.0+
  if (shouldUseLegacyConfig)
    void configureMCPServer();
  else
    void showWelcomeMessage(context);


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

/**
 * Get the Playwright browser channel name from the VS Code setting value
 * Standalone helper function for use outside the class
 */
function getBrowserChannel(browser: string): string {
  // Map browser channels to Playwright format
  const channelMap: Record<string, string> = {
    'msedge': 'msedge',
    'msedge-beta': 'msedge-beta',
    'msedge-dev': 'msedge-dev',
    'msedge-canary': 'msedge-canary',
    'chrome': 'chrome',
    'chrome-beta': 'chrome-beta',
    'chrome-dev': 'chrome-dev',
    'chrome-canary': 'chrome-canary',
    'firefox': 'firefox',
    'firefox-developer': 'firefox', // Firefox Developer Edition uses same browser name
    'firefox-nightly': 'firefox', // Firefox Nightly uses same browser name
    'webkit': 'webkit'
  };

  return channelMap[browser] || browser;
}

// Legacy configuration function for VS Code versions < 1.96.0
// This writes directly to the chat.mcp configuration namespace
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

      const browserExecutablePath = darbotConfig.get<string>('browserExecutablePath', '');
      const args = ['github:pantelisbischitzis/darbot-browser-mcp'];

      // Add browser channel configuration
      const browserChannel = getBrowserChannel(browser);
      if (browserChannel !== 'msedge')
        args.push('--browser', browserChannel);

      // Add custom browser executable path if specified
      if (browserExecutablePath && browserExecutablePath.trim())
        args.push('--executable-path', browserExecutablePath.trim());

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

// New welcome message for VS Code 1.96.0+ using McpServerDefinitionProvider
async function showWelcomeMessage(context: vscode.ExtensionContext) {
  // Check if this is the first activation (use extension global state)
  const hasShownWelcome = context.globalState.get<boolean>('darbot-browser-mcp.hasShownWelcome', false);

  if (!hasShownWelcome) {
    mcpOutputChannel.appendLine('🤖 Welcome to Darbot Browser MCP!');
    mcpOutputChannel.appendLine('');
    mcpOutputChannel.appendLine('The MCP server has been automatically registered with VS Code.');
    mcpOutputChannel.appendLine('You can now use it with GitHub Copilot by selecting it from the MCP servers list.');
    mcpOutputChannel.appendLine('');
    mcpOutputChannel.appendLine('To get started:');
    mcpOutputChannel.appendLine('1. Open GitHub Copilot Chat');
    mcpOutputChannel.appendLine('2. Look for "Darbot Browser MCP" in the MCP servers');
    mcpOutputChannel.appendLine('3. Try asking: "Take a screenshot of example.com"');
    mcpOutputChannel.appendLine('');
    mcpOutputChannel.appendLine('Need help? Check the README or visit:');
    mcpOutputChannel.appendLine('https://github.com/darbotlabs/darbot-browser-mcp');
    mcpOutputChannel.show(true);

    const result = await vscode.window.showInformationMessage(
        '🤖 Darbot Browser MCP is ready! The server is now available in your MCP servers list.',
        'Show Output',
        'Open Settings',
        'Got It'
    );

    if (result === 'Show Output')
      mcpOutputChannel.show();
    else if (result === 'Open Settings')
      await vscode.commands.executeCommand('workbench.action.openSettings', 'darbot-browser-mcp');


    // Mark that we've shown the welcome message
    await context.globalState.update('darbot-browser-mcp.hasShownWelcome', true);
  }
}

async function startServer() {
  if (mcpServerProcess) {
    void vscode.window.showInformationMessage('Browser MCP Server is already running');
    return;
  }

  const config = vscode.workspace.getConfiguration('darbot-browser-mcp');
  const serverPath = config.get<string>('serverPath', 'npx github:pantelisbischitzis/darbot-browser-mcp');
  const logLevel = config.get<string>('logLevel', 'info');
  const browser = config.get<string>('browser', 'msedge');
  const browserExecutablePath = config.get<string>('browserExecutablePath', '');
  const headless = config.get<boolean>('headless', false);
  const noSandbox = config.get<boolean>('noSandbox', true);

  try {
    // Parse the command
    const parts = serverPath.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    // Add browser channel configuration
    const browserChannel = getBrowserChannel(browser);
    if (browserChannel !== 'msedge')
      args.push('--browser', browserChannel);

    // Add custom browser executable path if specified
    if (browserExecutablePath && browserExecutablePath.trim())
      args.push('--executable-path', browserExecutablePath.trim());

    if (headless)
      args.push('--headless');
    if (noSandbox)
      args.push('--no-sandbox');

    // Add log level if specified
    if (logLevel !== 'info')
      args.push('--log-level', logLevel);

    // Display configuration to user
    const executableInfo = browserExecutablePath ? ` (${browserExecutablePath})` : '';
    const configDetails = `Browser: ${browser}${executableInfo}, Headless: ${headless}, No Sandbox: ${noSandbox}`;
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
  const serverPath = config.get<string>('serverPath', 'npx github:pantelisbischitzis/darbot-browser-mcp');
  const browser = config.get<string>('browser', 'msedge');
  const browserExecutablePath = config.get<string>('browserExecutablePath', '');
  const headless = config.get<boolean>('headless', false);
  const noSandbox = config.get<boolean>('noSandbox', true);

  const executableInfo = browserExecutablePath ? ` (Custom: ${browserExecutablePath})` : '';
  const configInfo = `Browser: ${browser}${executableInfo}, Headless: ${headless}, No Sandbox: ${noSandbox}`;

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
