/**
 * Copyright (c) 2024-2026 DarbotLabs
 * Licensed under the Apache License, Version 2.0 (the "License").
 */

import * as vscode from 'vscode';
import { exec } from 'node:child_process';
import * as http from 'node:http';
import * as https from 'node:https';

const EXTENSION_VERSION = '2.1.4';
const CONFIG_NAMESPACE = 'darbot-browser-mcp-hosted';

interface HostedConfig {
  serverUrl: string;
  mcpEndpoint: string;
  autoConnect: boolean;
  connectionTimeout: number;
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  useMsalAuth: boolean;
  scopes: string[];
  autoStartContainer: boolean;
  containerName: string;
}

interface HealthResult {
  success: boolean;
  status?: string;
  version?: string;
  error?: string;
}

interface McpHttpServerDefinitionLike {
  label: string;
  uri: vscode.Uri;
  version?: string;
  headers?: Record<string, string>;
}

/**
 * Narrow shim for `vscode.McpHttpServerDefinition`, which is not present in the
 * `@types/vscode@1.96.0` ambient definitions used by this extension. The shape
 * matches the proposed VS Code MCP API; if the runtime constructor is missing
 * we fall back to a plain object literal that satisfies the same interface.
 */
type McpHttpServerDefinitionCtor = new (
  label: string,
  uri: vscode.Uri,
  headers?: Record<string, string>,
  version?: string,
) => McpHttpServerDefinitionLike;

let isHostedConnected = false;
let statusBarItem: vscode.StatusBarItem;
let mcpOutputChannel: vscode.OutputChannel;
let healthCheckTimer: NodeJS.Timeout | null = null;
let cachedAuthSession: vscode.AuthenticationSession | null = null;

function readConfig(): HostedConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
  const envOverride = process.env.SERVER_BASE_URL?.trim();
  const serverUrl = (envOverride && envOverride.length > 0)
    ? envOverride
    : (config.get<string>('serverUrl') ?? 'http://localhost:8080').trim();
  const explicitEndpoint = (config.get<string>('mcpEndpoint') ?? '').trim();
  const mcpEndpoint = explicitEndpoint.length > 0
    ? explicitEndpoint
    : `${serverUrl.replace(/\/+$/, '')}/mcp`;

  return {
    serverUrl,
    mcpEndpoint,
    autoConnect: config.get<boolean>('autoConnect', true),
    connectionTimeout: config.get<number>('connectionTimeout', 10_000),
    enableHealthChecks: config.get<boolean>('enableHealthChecks', true),
    healthCheckInterval: config.get<number>('healthCheckInterval', 30_000),
    useMsalAuth: config.get<boolean>('useMsalAuth', false),
    scopes: config.get<string[]>('scopes', ['openid', 'profile', 'email', 'User.Read']),
    autoStartContainer: config.get<boolean>('autoStartContainer', true),
    containerName: (config.get<string>('containerName') ?? 'darbot-browser-hosted').trim(),
  };
}

function formatError(err: unknown): string {
  if (err instanceof Error)
    return err.message;
  if (typeof err === 'string')
    return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function getMicrosoftAuthToken(forceInteractive: boolean): Promise<string | null> {
  const { useMsalAuth, scopes } = readConfig();
  if (!useMsalAuth) {
    mcpOutputChannel?.appendLine('MSAL authentication disabled — using anonymous access.');
    return null;
  }
  try {
    if (cachedAuthSession && !forceInteractive) {
      mcpOutputChannel?.appendLine('Reusing cached Microsoft auth session.');
      return cachedAuthSession.accessToken;
    }
    let session = await vscode.authentication.getSession('microsoft', scopes, {
      createIfNone: false,
      silent: true,
    });
    if (!session && forceInteractive) {
      session = await vscode.authentication.getSession('microsoft', scopes, {
        createIfNone: true,
      });
    }
    if (session) {
      cachedAuthSession = session;
      mcpOutputChannel?.appendLine(`Authenticated as ${session.account.label}.`);
      return session.accessToken;
    }
    mcpOutputChannel?.appendLine('No Microsoft authentication session available.');
    return null;
  } catch (err) {
    mcpOutputChannel?.appendLine(`Microsoft authentication error: ${formatError(err)}`);
    return null;
  }
}

class DarbotBrowserMCPHostedProvider implements vscode.McpServerDefinitionProvider {
  async provideMcpServerDefinitions(): Promise<vscode.McpServerDefinition[]> {
    const { mcpEndpoint } = readConfig();
    const McpHttpServerDefinition = (vscode as unknown as { McpHttpServerDefinition?: McpHttpServerDefinitionCtor }).McpHttpServerDefinition;
    if (McpHttpServerDefinition) {
      const def = new McpHttpServerDefinition(
        'Darbot Browser MCP Hosted',
        vscode.Uri.parse(mcpEndpoint),
        undefined,
        EXTENSION_VERSION,
      );
      mcpOutputChannel?.appendLine(`MCP server definition created at ${mcpEndpoint}.`);
      return [def as unknown as vscode.McpServerDefinition];
    }
    mcpOutputChannel?.appendLine('McpHttpServerDefinition constructor not available — emitting plain definition.');
    const fallback: McpHttpServerDefinitionLike = {
      label: 'Darbot Browser MCP Hosted',
      uri: vscode.Uri.parse(mcpEndpoint),
      version: EXTENSION_VERSION,
    };
    return [fallback as unknown as vscode.McpServerDefinition];
  }

  async resolveMcpServerDefinition(
    server: vscode.McpServerDefinition,
    _token: vscode.CancellationToken,
  ): Promise<vscode.McpServerDefinition | undefined> {
    const { useMsalAuth } = readConfig();
    if (!useMsalAuth)
      return server;

    const token = await getMicrosoftAuthToken(false);
    if (!token) {
      mcpOutputChannel?.appendLine('Resolving server without authentication header — silent token fetch returned nothing.');
      return server;
    }
    const headerHolder = server as unknown as McpHttpServerDefinitionLike;
    headerHolder.headers = {
      ...(headerHolder.headers ?? {}),
      Authorization: `Bearer ${token}`,
    };
    mcpOutputChannel?.appendLine('Attached bearer token to MCP server definition.');
    return server;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  mcpOutputChannel = vscode.window.createOutputChannel('Darbot Browser MCP Hosted');
  context.subscriptions.push(mcpOutputChannel);

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
  statusBarItem.text = '$(server) MCP Hosted: Disconnected';
  statusBarItem.tooltip = 'Darbot Browser MCP Hosted Server';
  statusBarItem.command = `${CONFIG_NAMESPACE}.showStatus`;
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  try {
    const lm = vscode.lm as unknown as {
      registerMcpServerDefinitionProvider?: (id: string, provider: vscode.McpServerDefinitionProvider) => vscode.Disposable;
    };
    if (lm && typeof lm.registerMcpServerDefinitionProvider === 'function') {
      const provider = new DarbotBrowserMCPHostedProvider();
      const disposable = lm.registerMcpServerDefinitionProvider(CONFIG_NAMESPACE, provider);
      context.subscriptions.push(disposable);
      mcpOutputChannel.appendLine('MCP server-definition provider registered via vscode.lm.');
    } else {
      mcpOutputChannel.appendLine('vscode.lm.registerMcpServerDefinitionProvider unavailable; relying on settings-based MCP configuration.');
    }
  } catch (err) {
    mcpOutputChannel.appendLine(`Failed to register MCP server-definition provider: ${formatError(err)}`);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(`${CONFIG_NAMESPACE}.signIn`, () => signIn()),
    vscode.commands.registerCommand(`${CONFIG_NAMESPACE}.connectServer`, () => connectToHosted()),
    vscode.commands.registerCommand(`${CONFIG_NAMESPACE}.disconnectServer`, () => disconnectFromHosted()),
    vscode.commands.registerCommand(`${CONFIG_NAMESPACE}.showStatus`, () => showStatus()),
    vscode.commands.registerCommand(`${CONFIG_NAMESPACE}.testConnection`, () => testConnection()),
  );

  logConfiguration();

  const { autoConnect } = readConfig();
  if (autoConnect)
    void connectToHosted();
}

export function deactivate(): void {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  isHostedConnected = false;
  statusBarItem?.dispose();
  mcpOutputChannel?.dispose();
}

function logConfiguration(): void {
  const cfg = readConfig();
  mcpOutputChannel.appendLine('--- Darbot Browser MCP Hosted ---');
  mcpOutputChannel.appendLine(`Extension version : ${EXTENSION_VERSION}`);
  mcpOutputChannel.appendLine(`Server URL        : ${cfg.serverUrl}`);
  mcpOutputChannel.appendLine(`MCP endpoint      : ${cfg.mcpEndpoint}`);
  mcpOutputChannel.appendLine(`Authentication    : ${cfg.useMsalAuth ? 'MSAL (Microsoft Entra ID)' : 'Anonymous'}`);
  mcpOutputChannel.appendLine(`Auto-start container: ${cfg.autoStartContainer} (name=${cfg.containerName})`);
  if (process.env.SERVER_BASE_URL?.trim())
    mcpOutputChannel.appendLine(`(SERVER_BASE_URL env override active)`);
}

async function signIn(): Promise<void> {
  const cfg = readConfig();
  if (!cfg.useMsalAuth) {
    await vscode.window.showWarningMessage('useMsalAuth is disabled. Enable it in settings to sign in.');
    return;
  }
  const token = await getMicrosoftAuthToken(true);
  if (token)
    await vscode.window.showInformationMessage(`Signed in as ${cachedAuthSession?.account.label ?? 'unknown'}.`);
  else
    await vscode.window.showErrorMessage('Microsoft sign-in failed. See the output channel for details.');
}

async function connectToHosted(): Promise<void> {
  if (isHostedConnected) {
    await vscode.window.showInformationMessage('Already connected to Darbot Browser MCP Hosted.');
    return;
  }
  const cfg = readConfig();
  mcpOutputChannel.appendLine(`Connecting to hosted server at ${cfg.serverUrl}…`);

  try {
    let health = await performHealthCheck(cfg);

    if (!health.success && cfg.autoStartContainer) {
      mcpOutputChannel.appendLine(`Server unreachable. Attempting to start Docker container "${cfg.containerName}".`);
      updateStatusBarItem(false, 'Starting…');
      const startResult = await startDockerContainer(cfg.containerName);
      if (startResult.success) {
        await waitFor(3000);
        health = await performHealthCheck(cfg);
        let retries = 5;
        while (!health.success && retries > 0) {
          mcpOutputChannel.appendLine(`Server not ready yet, retrying (${retries} left)…`);
          await waitFor(2000);
          health = await performHealthCheck(cfg);
          retries--;
        }
      } else {
        mcpOutputChannel.appendLine(`Container start failed: ${startResult.error}`);
      }
    }

    if (!health.success)
      throw new Error(health.error ?? 'Health check failed');

    isHostedConnected = true;
    updateStatusBarItem(true);
    mcpOutputChannel.appendLine(`Connected. Server version ${health.version ?? 'unknown'}, status ${health.status ?? 'unknown'}.`);
    mcpOutputChannel.show(true);

    if (cfg.enableHealthChecks) {
      healthCheckTimer = setInterval(async () => {
        const check = await performHealthCheck(cfg);
        if (!check.success)
          mcpOutputChannel.appendLine(`Health check failed: ${check.error}`);
      }, cfg.healthCheckInterval);
    }

    await vscode.window.showInformationMessage(`Connected to Darbot Browser MCP Hosted (v${health.version ?? '?'}).`);
  } catch (err) {
    const message = formatError(err);
    mcpOutputChannel.appendLine(`Connection failed: ${message}`);
    await vscode.window.showErrorMessage(`Failed to connect to hosted server: ${message}`);
    updateStatusBarItem(false);
  }
}

function disconnectFromHosted(): void {
  if (!isHostedConnected) {
    void vscode.window.showInformationMessage('Not connected to Darbot Browser MCP Hosted.');
    return;
  }
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  isHostedConnected = false;
  updateStatusBarItem(false);
  mcpOutputChannel.appendLine('Disconnected from hosted server.');
  void vscode.window.showInformationMessage('Disconnected from Darbot Browser MCP Hosted.');
}

async function testConnection(): Promise<void> {
  const cfg = readConfig();
  mcpOutputChannel.appendLine(`Testing connection to ${cfg.serverUrl}/health…`);
  const result = await performHealthCheck(cfg);
  if (result.success) {
    mcpOutputChannel.appendLine(`OK — status ${result.status ?? 'unknown'}, version ${result.version ?? 'unknown'}.`);
    await vscode.window.showInformationMessage(`Hosted server healthy (v${result.version ?? '?'}) at ${cfg.serverUrl}`);
  } else {
    mcpOutputChannel.appendLine(`FAIL — ${result.error}`);
    await vscode.window.showErrorMessage(`Hosted server probe failed: ${result.error}`);
  }
}

function showStatus(): void {
  const cfg = readConfig();
  const hasSession = cachedAuthSession !== null;
  mcpOutputChannel.appendLine('--- Status ---');
  mcpOutputChannel.appendLine(`Connection      : ${isHostedConnected ? 'Connected' : 'Disconnected'}`);
  mcpOutputChannel.appendLine(`Server URL      : ${cfg.serverUrl}`);
  mcpOutputChannel.appendLine(`MCP endpoint    : ${cfg.mcpEndpoint}`);
  mcpOutputChannel.appendLine(`Authentication  : ${cfg.useMsalAuth ? (hasSession ? `MSAL (${cachedAuthSession?.account.label})` : 'MSAL (not signed in)') : 'Anonymous'}`);
  mcpOutputChannel.show();

  const actions = isHostedConnected ? ['Disconnect', 'Test Connection'] : ['Connect', 'Test Connection'];
  void vscode.window.showInformationMessage(
    `Darbot Browser MCP Hosted: ${isHostedConnected ? 'Connected' : 'Disconnected'}`,
    ...actions,
  ).then(selection => {
    if (selection === 'Connect')
      void connectToHosted();
    else if (selection === 'Disconnect')
      disconnectFromHosted();
    else if (selection === 'Test Connection')
      void testConnection();
  });
}

function updateStatusBarItem(isConnected: boolean, customStatus?: string): void {
  if (!statusBarItem) return;
  if (customStatus) {
    statusBarItem.text = `$(server) MCP Hosted: ${customStatus}`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  } else {
    statusBarItem.text = isConnected
      ? '$(server) MCP Hosted: Connected'
      : '$(server) MCP Hosted: Disconnected';
    statusBarItem.backgroundColor = isConnected
      ? new vscode.ThemeColor('statusBarItem.prominentBackground')
      : undefined;
  }
}

function performHealthCheck(cfg: HostedConfig): Promise<HealthResult> {
  const protocol = cfg.serverUrl.startsWith('https') ? https : http;
  return new Promise(resolve => {
    const req = protocol.get(`${cfg.serverUrl.replace(/\/+$/, '')}/health`, { timeout: cfg.connectionTimeout }, res => {
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
      resolve({ success: false, error: `Timeout after ${cfg.connectionTimeout}ms` });
    });
  });
}

function startDockerContainer(containerName: string): Promise<{ success: boolean; error?: string }> {
  return new Promise(resolve => {
    exec(`docker start ${containerName}`, (error, _stdout, stderr) => {
      if (!error) {
        mcpOutputChannel.appendLine(`Container "${containerName}" started.`);
        resolve({ success: true });
        return;
      }
      mcpOutputChannel.appendLine(`docker start failed: ${stderr.trim() || error.message}`);
      exec(`docker ps -a --filter "name=${containerName}" --format "{{.Status}}"`, (checkErr, checkStdout) => {
        if (checkErr) {
          resolve({ success: false, error: `Failed to inspect Docker: ${checkErr.message}` });
          return;
        }
        if (checkStdout && checkStdout.trim()) {
          resolve({ success: false, error: `Container exists but failed to start: ${stderr.trim() || error.message}` });
        } else {
          resolve({
            success: false,
            error: `Container "${containerName}" not found. Run: docker run -d --name ${containerName} -p 8080:8080 -e ALLOW_ANONYMOUS_ACCESS=true darbot-browser-hosted`,
          });
        }
      });
    });
  });
}

function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
