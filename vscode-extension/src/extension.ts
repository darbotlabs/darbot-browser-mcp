/**
 * Copyright (c) DarbotLabs.
 *
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
import * as path from 'path';
import * as fs from 'fs/promises';

const EXTENSION_ID = 'darbot-browser-mcp';
const CONFIG_SECTION = 'darbot-browser-mcp';
const OUTPUT_CHANNEL_NAME = 'Darbot Browser MCP';

interface ServerConfig {
  serverPath: string;
  autoStart: boolean;
  autoConfigureMCP: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  browser: 'msedge' | 'chrome' | 'firefox' | 'webkit';
  headless: boolean;
  noSandbox: boolean;
  bridgeStatusUrl: string;
}

function readConfig(): ServerConfig {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return {
    serverPath: cfg.get<string>('serverPath', 'npx @darbotlabs/darbot-browser-mcp@latest'),
    autoStart: cfg.get<boolean>('autoStart', false),
    autoConfigureMCP: cfg.get<boolean>('autoConfigureMCP', true),
    logLevel: cfg.get<'error' | 'warn' | 'info' | 'debug'>('logLevel', 'info'),
    browser: cfg.get<'msedge' | 'chrome' | 'firefox' | 'webkit'>('browser', 'msedge'),
    headless: cfg.get<boolean>('headless', false),
    noSandbox: cfg.get<boolean>('noSandbox', true),
    bridgeStatusUrl: cfg.get<string>('bridgeStatusUrl', 'http://localhost:9223/health'),
  };
}

function buildServerArgs(config: ServerConfig): string[] {
  const args: string[] = [];
  if (config.browser !== 'msedge')
    args.push('--browser', config.browser);
  if (config.headless)
    args.push('--headless');
  if (config.noSandbox)
    args.push('--no-sandbox');
  if (config.logLevel !== 'info')
    args.push('--log-level', config.logLevel);
  return args;
}

/**
 * Locate a workspace-local `cli.js` so contributors hacking on the MCP server
 * itself can drive the extension against their checked-out copy without
 * shipping a new package version. Returns `null` when not found.
 */
async function findLocalCli(): Promise<string | null> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder)
    return null;
  const candidate = path.join(workspaceFolder, 'cli.js');
  try {
    await fs.access(candidate);
    return candidate;
  } catch {
    return null;
  }
}

/**
 * MCP Server Definition Provider for VS Code's chat / agent mode.
 *
 * The provider returns a server definition that VS Code itself will spawn
 * and own — we don't need a separate child process for the agent mode path.
 */
class DarbotBrowserMCPProvider implements vscode.McpServerDefinitionProvider {
  constructor(private readonly output: vscode.OutputChannel) {}

  async provideMcpServerDefinitions(): Promise<vscode.McpServerDefinition[]> {
    const config = readConfig();
    const localCli = await findLocalCli();

    let command: string;
    let args: string[];

    if (localCli) {
      command = 'node';
      args = [localCli];
      this.output.appendLine(`MCP provider: using local cli.js at ${localCli}`);
    } else {
      const parts = config.serverPath.trim().split(/\s+/);
      command = parts[0];
      args = parts.slice(1);
      this.output.appendLine(`MCP provider: using configured serverPath '${config.serverPath}'`);
    }

    args.push(...buildServerArgs(config));

    return [{
      label: 'Darbot Browser MCP',
      command,
      args,
      env: {
        NODE_ENV: process.env.NODE_ENV ?? 'production',
      },
    } as vscode.McpServerDefinition];
  }
}

let mcpServerProcess: ChildProcess | null = null;
let statusBarItem: vscode.StatusBarItem | undefined;
let mcpOutputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  mcpOutputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  context.subscriptions.push(mcpOutputChannel);

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(browser) MCP: Stopped';
  statusBarItem.tooltip = 'Darbot Browser MCP server status — click for actions';
  statusBarItem.command = `${EXTENSION_ID}.showStatus`;
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  registerMcpProvider(context);
  registerCommands(context);

  void maybePromptForMcpGallery();

  const config = readConfig();
  if (config.autoStart)
    void startServer();
}

export function deactivate(): void {
  if (mcpServerProcess) {
    mcpServerProcess.kill();
    mcpServerProcess = null;
  }
  statusBarItem?.dispose();
  mcpOutputChannel?.dispose();
}

function registerMcpProvider(context: vscode.ExtensionContext): void {
  try {
    const provider = new DarbotBrowserMCPProvider(mcpOutputChannel);
    const lmApi = (vscode as unknown as { lm?: { registerMcpServerDefinitionProvider?: typeof vscode.lm.registerMcpServerDefinitionProvider } }).lm;
    if (lmApi && typeof lmApi.registerMcpServerDefinitionProvider === 'function') {
      const disposable = lmApi.registerMcpServerDefinitionProvider(EXTENSION_ID, provider);
      context.subscriptions.push(disposable);
      mcpOutputChannel.appendLine('Registered MCP Server Definition Provider via vscode.lm.');
    } else {
      mcpOutputChannel.appendLine('vscode.lm.registerMcpServerDefinitionProvider is unavailable; relying on the user-managed MCP configuration.');
    }
  } catch (error) {
    mcpOutputChannel.appendLine(`Failed to register MCP Server Definition Provider: ${formatError(error)}`);
  }
}

function registerCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
      vscode.commands.registerCommand(`${EXTENSION_ID}.startServer`, startServer),
      vscode.commands.registerCommand(`${EXTENSION_ID}.stopServer`, stopServer),
      vscode.commands.registerCommand(`${EXTENSION_ID}.restartServer`, restartServer),
      vscode.commands.registerCommand(`${EXTENSION_ID}.showStatus`, showStatus),
      vscode.commands.registerCommand(`${EXTENSION_ID}.openBridgeStatus`, openBridgeStatus),
  );
}

/**
 * On first activation, check whether VS Code's MCP Gallery is enabled. If
 * not, offer to flip the setting so the user gets the server in agent-mode
 * without manual configuration. Respects the autoConfigureMCP opt-out.
 */
async function maybePromptForMcpGallery(): Promise<void> {
  const config = readConfig();
  if (!config.autoConfigureMCP) {
    mcpOutputChannel.appendLine('Auto-configuration disabled (darbot-browser-mcp.autoConfigureMCP=false).');
    return;
  }

  try {
    const galleryConfig = vscode.workspace.getConfiguration('chat.mcp.gallery');
    if (galleryConfig.get<boolean>('enabled', false)) {
      mcpOutputChannel.appendLine('VS Code MCP Gallery already enabled.');
      return;
    }

    const choice = await vscode.window.showInformationMessage(
        'Darbot Browser MCP works best with the VS Code MCP Gallery enabled. Enable it now?',
        'Enable',
        'Open Settings',
        'Not now',
    );

    if (choice === 'Enable') {
      await galleryConfig.update('enabled', true, vscode.ConfigurationTarget.Global);
      mcpOutputChannel.appendLine('Enabled chat.mcp.gallery.enabled. A VS Code reload is required.');
      const reload = await vscode.window.showInformationMessage(
          'MCP Gallery enabled. Reload VS Code now to activate Darbot Browser MCP?',
          'Reload',
          'Later',
      );
      if (reload === 'Reload')
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
    } else if (choice === 'Open Settings') {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'chat.mcp.gallery.enabled');
    }
  } catch (error) {
    mcpOutputChannel.appendLine(`MCP Gallery check skipped: ${formatError(error)}`);
  }
}

async function startServer(): Promise<void> {
  if (mcpServerProcess) {
    void vscode.window.showInformationMessage('Browser MCP Server is already running.');
    return;
  }

  const config = readConfig();
  const localCli = await findLocalCli();

  let command: string;
  let args: string[];
  if (localCli) {
    command = 'node';
    args = [localCli];
  } else {
    const parts = config.serverPath.trim().split(/\s+/);
    command = parts[0];
    args = parts.slice(1);
  }
  args.push(...buildServerArgs(config));

  const configDetails = `browser=${config.browser} headless=${config.headless} noSandbox=${config.noSandbox} logLevel=${config.logLevel}`;
  mcpOutputChannel.appendLine(`Starting Browser MCP Server: ${command} ${args.join(' ')} (${configDetails})`);

  try {
    const child = spawn(command, args, { stdio: 'pipe', shell: true });

    let intentionallyStopped = false;
    const originalKill = child.kill.bind(child);
    child.kill = (...killArgs: Parameters<typeof originalKill>) => {
      intentionallyStopped = true;
      return originalKill(...killArgs);
    };

    child.on('error', (error: Error) => {
      void vscode.window.showErrorMessage(`Failed to start Browser MCP Server: ${error.message}`);
      mcpServerProcess = null;
      updateStatusBarItem(false);
    });

    child.on('exit', (code, signal) => {
      if (!intentionallyStopped && code !== 0 && code !== null)
        void vscode.window.showErrorMessage(`Browser MCP Server exited unexpectedly with code ${code}.`);
      else if (!intentionallyStopped && signal)
        void vscode.window.showWarningMessage(`Browser MCP Server was terminated by signal ${signal}.`);
      mcpServerProcess = null;
      updateStatusBarItem(false);
    });

    child.stdout?.on('data', chunk => mcpOutputChannel.append(chunk.toString()));
    child.stderr?.on('data', chunk => mcpOutputChannel.append(chunk.toString()));

    mcpServerProcess = child;
    updateStatusBarItem(true);
    mcpOutputChannel.show(true);
    void vscode.window.showInformationMessage('Browser MCP Server started.');
  } catch (error) {
    void vscode.window.showErrorMessage(`Failed to start Browser MCP Server: ${formatError(error)}`);
    updateStatusBarItem(false);
  }
}

function stopServer(): void {
  if (!mcpServerProcess) {
    void vscode.window.showInformationMessage('Browser MCP Server is not running.');
    return;
  }
  mcpServerProcess.kill();
  mcpServerProcess = null;
  updateStatusBarItem(false);
  void vscode.window.showInformationMessage('Browser MCP Server stopped.');
}

async function restartServer(): Promise<void> {
  if (mcpServerProcess) {
    stopServer();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  await startServer();
}

function showStatus(): void {
  const isRunning = mcpServerProcess !== null;
  const config = readConfig();
  const lines = [
    `Darbot Browser MCP: ${isRunning ? 'Running' : 'Stopped'}`,
    `serverPath: ${config.serverPath}`,
    `browser: ${config.browser}`,
    `headless: ${config.headless}`,
    `noSandbox: ${config.noSandbox}`,
    `logLevel: ${config.logLevel}`,
  ];
  const actions = isRunning ? ['Stop', 'Restart', 'Open Bridge'] : ['Start', 'Open Bridge'];
  void vscode.window.showInformationMessage(lines.join('\n'), ...actions).then(choice => {
    if (choice === 'Start') void startServer();
    else if (choice === 'Stop') stopServer();
    else if (choice === 'Restart') void restartServer();
    else if (choice === 'Open Bridge') void openBridgeStatus();
  });
}

async function openBridgeStatus(): Promise<void> {
  const { bridgeStatusUrl } = readConfig();
  try {
    await vscode.env.openExternal(vscode.Uri.parse(bridgeStatusUrl));
  } catch (error) {
    void vscode.window.showErrorMessage(`Could not open bridge status URL ${bridgeStatusUrl}: ${formatError(error)}`);
  }
}

function updateStatusBarItem(isRunning: boolean): void {
  if (!statusBarItem)
    return;
  statusBarItem.text = isRunning ? '$(browser) MCP: Running' : '$(browser) MCP: Stopped';
  statusBarItem.backgroundColor = isRunning
    ? new vscode.ThemeColor('statusBarItem.prominentBackground')
    : undefined;
}

function formatError(error: unknown): string {
  if (error instanceof Error)
    return error.message;
  return String(error);
}
