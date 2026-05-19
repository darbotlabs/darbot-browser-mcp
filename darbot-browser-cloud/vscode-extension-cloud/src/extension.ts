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
import * as http from 'http';
import * as https from 'https';

const EXTENSION_ID = 'darbot-browser-mcp-cloud';
const CONFIG_SECTION = 'darbot-browser-mcp-cloud';
const EXTENSION_VERSION = '2.0.0';
const AUTH_PROVIDER = 'microsoft';

interface CloudConfig {
  serverUrl: string;
  mcpEndpoint: string;
  autoConnect: boolean;
  connectionTimeoutMs: number;
  enableHealthChecks: boolean;
  healthCheckIntervalMs: number;
  scopes: string[];
}

function readConfig(): CloudConfig {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const envOverride = process.env.SERVER_BASE_URL?.trim();
  const baseFromSetting = cfg.get<string>('serverUrl', '').trim();
  const serverUrl = envOverride || baseFromSetting;

  let mcpEndpoint = cfg.get<string>('sseEndpoint', '').trim();
  if (!mcpEndpoint && serverUrl)
    mcpEndpoint = stripTrailingSlash(serverUrl) + '/mcp';

  const scopes = cfg.get<string[]>('scopes', ['openid', 'profile', 'email', 'User.Read']);

  return {
    serverUrl,
    mcpEndpoint,
    autoConnect: cfg.get<boolean>('autoConnect', true),
    connectionTimeoutMs: cfg.get<number>('connectionTimeout', 30000),
    enableHealthChecks: cfg.get<boolean>('enableHealthChecks', true),
    healthCheckIntervalMs: cfg.get<number>('healthCheckInterval', 60000),
    scopes,
  };
}

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

let isCloudConnected = false;
let statusBarItem: vscode.StatusBarItem | undefined;
let output: vscode.OutputChannel;
let healthCheckTimer: NodeJS.Timeout | null = null;
let cachedSession: vscode.AuthenticationSession | null = null;

/**
 * Resolve an Entra ID access token using VS Code's built-in Microsoft
 * authentication provider. Tries a silent fetch first and only falls back
 * to an interactive prompt when explicitly requested.
 */
async function getMicrosoftAccessToken(opts: { interactive: boolean } = { interactive: false }): Promise<string | null> {
  const { scopes } = readConfig();
  try {
    if (cachedSession)
      return cachedSession.accessToken;

    let session = await vscode.authentication.getSession(AUTH_PROVIDER, scopes, {
      createIfNone: false,
      silent: true,
    });

    if (!session && opts.interactive) {
      output.appendLine('Requesting interactive Microsoft sign-in...');
      session = await vscode.authentication.getSession(AUTH_PROVIDER, scopes, { createIfNone: true });
    }

    if (session) {
      cachedSession = session;
      output.appendLine(`Authenticated as ${session.account.label}.`);
      return session.accessToken;
    }
    return null;
  } catch (error) {
    output.appendLine(`Authentication error: ${formatError(error)}`);
    return null;
  }
}

/**
 * MCP Server Definition Provider for VS Code's chat / agent mode. Uses
 * `McpHttpServerDefinition` when available and adds the bearer token only
 * at `resolveMcpServerDefinition` time so we don't trigger sign-in prompts
 * eagerly.
 */
class DarbotBrowserMCPCloudProvider implements vscode.McpServerDefinitionProvider {
  async provideMcpServerDefinitions(): Promise<vscode.McpServerDefinition[]> {
    const { mcpEndpoint } = readConfig();
    if (!mcpEndpoint) {
      output.appendLine('Cloud MCP endpoint not configured — set darbot-browser-mcp-cloud.serverUrl or SERVER_BASE_URL.');
      return [];
    }

    const HttpDef = (vscode as unknown as { McpHttpServerDefinition?: new (label: string, uri: vscode.Uri, headers?: Record<string, string>, version?: string) => vscode.McpServerDefinition }).McpHttpServerDefinition;
    if (HttpDef) {
      output.appendLine(`Advertising MCP endpoint: ${mcpEndpoint}`);
      return [new HttpDef('Darbot Browser MCP Cloud', vscode.Uri.parse(mcpEndpoint), undefined, EXTENSION_VERSION)];
    }

    output.appendLine('McpHttpServerDefinition unavailable — using legacy literal shape.');
    return [{
      label: 'Darbot Browser MCP Cloud',
      uri: vscode.Uri.parse(mcpEndpoint),
      version: EXTENSION_VERSION,
    } as unknown as vscode.McpServerDefinition];
  }

  async resolveMcpServerDefinition(
      server: vscode.McpServerDefinition,
      _token: vscode.CancellationToken,
  ): Promise<vscode.McpServerDefinition | undefined> {
    const accessToken = await getMicrosoftAccessToken();
    if (!accessToken) {
      output.appendLine('No Entra ID token available; passing server definition through without Authorization header.');
      return server;
    }
    const withAuth = server as unknown as { headers?: Record<string, string> };
    withAuth.headers = { ...withAuth.headers, Authorization: `Bearer ${accessToken}` };
    output.appendLine('Attached Entra ID bearer token to MCP server definition.');
    return server;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  output = vscode.window.createOutputChannel('Darbot Browser MCP Cloud');
  context.subscriptions.push(output);

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(cloud) MCP Cloud: Disconnected';
  statusBarItem.tooltip = 'Darbot Browser MCP Cloud — click for actions';
  statusBarItem.command = `${EXTENSION_ID}.showStatus`;
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  registerMcpProvider(context);
  registerCommands(context);

  const config = readConfig();
  if (!config.serverUrl) {
    output.appendLine('No cloud server URL configured. Set darbot-browser-mcp-cloud.serverUrl or the SERVER_BASE_URL environment variable.');
    return;
  }

  output.appendLine(`Configured cloud server: ${config.serverUrl}`);
  output.appendLine(`MCP endpoint: ${config.mcpEndpoint}`);
  output.appendLine('Authentication: VS Code Microsoft account (built-in provider).');

  if (config.autoConnect)
    void connectToCloud();
}

export function deactivate(): void {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  statusBarItem?.dispose();
  output?.dispose();
  cachedSession = null;
}

function registerMcpProvider(context: vscode.ExtensionContext): void {
  try {
    const provider = new DarbotBrowserMCPCloudProvider();
    const lmApi = vscode.lm as unknown as { registerMcpServerDefinitionProvider?: typeof vscode.lm.registerMcpServerDefinitionProvider } | undefined;
    if (lmApi && typeof lmApi.registerMcpServerDefinitionProvider === 'function') {
      const disposable = lmApi.registerMcpServerDefinitionProvider(EXTENSION_ID, provider);
      context.subscriptions.push(disposable);
      output.appendLine('Registered MCP Server Definition Provider via vscode.lm.');
    } else {
      output.appendLine('vscode.lm.registerMcpServerDefinitionProvider unavailable — rely on user-managed MCP configuration.');
    }
  } catch (error) {
    output.appendLine(`Failed to register MCP provider: ${formatError(error)}`);
  }
}

function registerCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
      vscode.commands.registerCommand(`${EXTENSION_ID}.connectServer`, connectToCloud),
      vscode.commands.registerCommand(`${EXTENSION_ID}.disconnectServer`, disconnectFromCloud),
      vscode.commands.registerCommand(`${EXTENSION_ID}.showStatus`, showStatus),
      vscode.commands.registerCommand(`${EXTENSION_ID}.testConnection`, testConnection),
      vscode.commands.registerCommand(`${EXTENSION_ID}.signIn`, () => getMicrosoftAccessToken({ interactive: true })),
  );
}

async function connectToCloud(): Promise<void> {
  if (isCloudConnected) {
    void vscode.window.showInformationMessage('Already connected to Browser MCP Cloud Server.');
    return;
  }
  const config = readConfig();
  if (!config.serverUrl) {
    void vscode.window.showWarningMessage('Set darbot-browser-mcp-cloud.serverUrl (or SERVER_BASE_URL) before connecting.');
    return;
  }

  output.appendLine(`Connecting to ${config.serverUrl} ...`);

  const result = await performHealthCheck(config.serverUrl, config.connectionTimeoutMs);
  if (!result.success) {
    output.appendLine(`Connection failed: ${result.error}`);
    void vscode.window.showErrorMessage(`Failed to connect to cloud server: ${result.error}`);
    updateStatusBarItem(false);
    return;
  }

  isCloudConnected = true;
  updateStatusBarItem(true);
  output.appendLine(`Connected. Server version: ${result.version ?? 'unknown'} (status: ${result.status ?? 'unknown'})`);
  void vscode.window.showInformationMessage(`Connected to Browser MCP Cloud (v${result.version ?? '?'}).`);

  if (config.enableHealthChecks) {
    if (healthCheckTimer)
      clearInterval(healthCheckTimer);
    healthCheckTimer = setInterval(async () => {
      const check = await performHealthCheck(config.serverUrl, config.connectionTimeoutMs);
      if (!check.success)
        output.appendLine(`Periodic health check failed: ${check.error}`);
    }, config.healthCheckIntervalMs);
  }
}

function disconnectFromCloud(): void {
  if (!isCloudConnected) {
    void vscode.window.showInformationMessage('Not connected to Browser MCP Cloud Server.');
    return;
  }
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  isCloudConnected = false;
  updateStatusBarItem(false);
  output.appendLine('Disconnected from Browser MCP Cloud.');
  void vscode.window.showInformationMessage('Disconnected from Browser MCP Cloud.');
}

async function testConnection(): Promise<void> {
  const config = readConfig();
  if (!config.serverUrl) {
    void vscode.window.showWarningMessage('Configure darbot-browser-mcp-cloud.serverUrl (or set SERVER_BASE_URL) first.');
    return;
  }
  output.appendLine(`Testing ${config.serverUrl}/health ...`);
  const result = await performHealthCheck(config.serverUrl, config.connectionTimeoutMs);
  if (result.success) {
    output.appendLine(`Healthy. version=${result.version ?? 'unknown'} status=${result.status ?? 'unknown'}`);
    void vscode.window.showInformationMessage(`Cloud server is reachable (v${result.version ?? '?'}).`);
  } else {
    output.appendLine(`Health check failed: ${result.error}`);
    void vscode.window.showErrorMessage(`Cloud server health check failed: ${result.error}`);
  }
}

function showStatus(): void {
  const config = readConfig();
  const lines = [
    `Darbot Browser MCP Cloud: ${isCloudConnected ? 'Connected' : 'Disconnected'}`,
    `serverUrl: ${config.serverUrl || '(unset)'}`,
    `mcpEndpoint: ${config.mcpEndpoint || '(unset)'}`,
    `authenticated as: ${cachedSession?.account.label ?? '(not signed in)'}`,
  ];
  output.appendLine('--- Status ---');
  lines.forEach(line => output.appendLine(line));

  const actions = isCloudConnected ? ['Disconnect', 'Test Connection', 'Sign in'] : ['Connect', 'Test Connection', 'Sign in'];
  void vscode.window.showInformationMessage(lines.join('\n'), ...actions).then(choice => {
    if (choice === 'Connect') void connectToCloud();
    else if (choice === 'Disconnect') disconnectFromCloud();
    else if (choice === 'Test Connection') void testConnection();
    else if (choice === 'Sign in') void getMicrosoftAccessToken({ interactive: true });
  });
}

interface HealthResult {
  success: boolean;
  status?: string;
  version?: string;
  error?: string;
}

async function performHealthCheck(serverUrl: string, timeoutMs: number): Promise<HealthResult> {
  const url = `${stripTrailingSlash(serverUrl)}/health`;
  const protocol = serverUrl.startsWith('https') ? https : http;

  return new Promise<HealthResult>(resolve => {
    const req = protocol.get(url, { timeout: timeoutMs }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 503) {
          try {
            const json = JSON.parse(data) as { status?: string; version?: string };
            resolve({ success: true, status: json.status, version: json.version });
          } catch {
            resolve({ success: true, status: 'unknown', version: 'unknown' });
          }
        } else {
          resolve({ success: false, error: `HTTP ${res.statusCode}` });
        }
      });
    });
    req.on('error', err => resolve({ success: false, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: `Timeout after ${timeoutMs}ms` });
    });
  });
}

function updateStatusBarItem(connected: boolean): void {
  if (!statusBarItem)
    return;
  statusBarItem.text = connected ? '$(cloud) MCP Cloud: Connected' : '$(cloud) MCP Cloud: Disconnected';
  statusBarItem.backgroundColor = connected
    ? new vscode.ThemeColor('statusBarItem.prominentBackground')
    : undefined;
}

function formatError(error: unknown): string {
  if (error instanceof Error)
    return error.message;
  return String(error);
}
