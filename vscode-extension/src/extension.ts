/**
 * Copyright (c) DarbotLabs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { execFile, spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as http from 'node:http';
import * as https from 'node:https';
import * as path from 'node:path';
import * as vscode from 'vscode';

import { createEndpointUrls, createLocalBaseUrl, normalizeBaseUrl, type EndpointUrls } from './endpoints';

const EXTENSION_ID = 'darbot-browser-mcp';
const CONFIG_SECTION = 'darbot-browser-mcp';
const OUTPUT_CHANNEL_NAME = 'Darbot Browser MCP';
const CONNECTIONS_VIEW_ID = 'darbot-browser-mcp.connections';
const SERVER_VERSION = '2.1.4';

export interface ServerConfig {
  serverPath: string;
  autoStart: boolean;
  autoConfigureMCP: boolean;
  transport: 'http' | 'stdio';
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  browser: 'msedge' | 'chrome' | 'firefox' | 'webkit';
  headless: boolean;
  noSandbox: boolean;
  httpHost: string;
  httpPort: number;
  httpStartupTimeout: number;
  devTunnelUrl: string;
  devTunnelPromptOnStart: boolean;
  bridgeStatusUrl: string;
}

interface ManagedServer {
  process: ChildProcess;
  transport: ServerConfig['transport'];
  intentionallyStopped: boolean;
  starting: boolean;
}

interface ProbeResult {
  url: string;
  status?: number;
  body?: string;
  error?: string;
}

interface StartServerOptions {
  notify?: boolean;
}

type ServerState = 'stopped' | 'starting' | 'running' | 'external' | 'error';

let managedServer: ManagedServer | null = null;
let serverStartPromise: Promise<void> | null = null;
let externalHttpServer = false;
let serverState: ServerState = 'stopped';
let lastServerError: string | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
let mcpOutputChannel: vscode.OutputChannel;
let connectionsTreeProvider: ConnectionsTreeProvider | undefined;
let mcpProvider: DarbotBrowserMCPProvider | undefined;

function readConfig(): ServerConfig {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return {
    serverPath: cfg.get<string>('serverPath', 'npx @darbotlabs/darbot-browser-mcp@2.1.4'),
    autoStart: cfg.get<boolean>('autoStart', false),
    autoConfigureMCP: cfg.get<boolean>('autoConfigureMCP', true),
    transport: cfg.get<'http' | 'stdio'>('transport', 'http'),
    logLevel: cfg.get<'error' | 'warn' | 'info' | 'debug'>('logLevel', 'info'),
    browser: cfg.get<'msedge' | 'chrome' | 'firefox' | 'webkit'>('browser', 'msedge'),
    headless: cfg.get<boolean>('headless', false),
    noSandbox: cfg.get<boolean>('noSandbox', true),
    httpHost: cfg.get<string>('http.host', '127.0.0.1').trim(),
    httpPort: cfg.get<number>('http.port', 3000),
    httpStartupTimeout: cfg.get<number>('http.startupTimeout', 15_000),
    devTunnelUrl: cfg.get<string>('devTunnel.url', '').trim(),
    devTunnelPromptOnStart: cfg.get<boolean>('devTunnel.promptOnStart', false),
    bridgeStatusUrl: cfg.get<string>('bridgeStatusUrl', 'http://localhost:9223/health'),
  };
}

export function buildServerArgs(config: ServerConfig, transport = config.transport): string[] {
  const args: string[] = [];
  if (config.browser !== 'msedge')
    args.push('--browser', config.browser);
  if (config.headless)
    args.push('--headless');
  if (config.noSandbox)
    args.push('--no-sandbox');
  if (transport === 'http')
    args.push('--host', config.httpHost, '--port', String(config.httpPort));
  return args;
}

function buildServerEnvironment(config: ServerConfig): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? 'production',
    DARBOT_LOG_LEVEL: config.logLevel,
  };
  if (config.logLevel === 'debug' && !env.DEBUG)
    env.DEBUG = 'pw:mcp:*,darbot:*';
  return env;
}

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

async function resolveServerCommand(config: ServerConfig): Promise<{ command: string; args: string[]; shell: boolean }> {
  const localCli = await findLocalCli();
  if (localCli)
    return { command: 'node', args: [localCli], shell: false };

  const parts = config.serverPath.trim().split(/\s+/);
  if (!parts[0])
    throw new Error('darbot-browser-mcp.serverPath must specify a command.');
  if (process.platform === 'win32' && parts[0].toLowerCase() === 'npx') {
    const npxCli = await findWindowsNpxCli();
    if (npxCli)
      return { command: 'node', args: [npxCli, ...parts.slice(1)], shell: false };
  }
  return {
    command: parts[0],
    args: parts.slice(1),
    shell: process.platform === 'win32',
  };
}

async function findWindowsNpxCli(): Promise<string | undefined> {
  const candidates = [
    process.env.ProgramFiles
      ? path.join(process.env.ProgramFiles, 'nodejs', 'node_modules', 'npm', 'bin', 'npx-cli.js')
      : undefined,
    process.env.APPDATA
      ? path.join(process.env.APPDATA, 'npm', 'node_modules', 'npm', 'bin', 'npx-cli.js')
      : undefined,
  ].filter((candidate): candidate is string => candidate !== undefined);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next standard Node.js installation location.
    }
  }
  return undefined;
}

function localEndpoints(config = readConfig()): EndpointUrls {
  return createEndpointUrls(createLocalBaseUrl(config.httpHost, config.httpPort));
}

function configuredTunnelEndpoints(config = readConfig()): EndpointUrls | undefined {
  if (!config.devTunnelUrl)
    return undefined;
  try {
    return createEndpointUrls(config.devTunnelUrl);
  } catch {
    return undefined;
  }
}

function integrationEndpoints(config = readConfig()): EndpointUrls {
  return configuredTunnelEndpoints(config) ?? localEndpoints(config);
}

class DarbotBrowserMCPProvider implements vscode.McpServerDefinitionProvider, vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeMcpServerDefinitions = this.changeEmitter.event;

  constructor(private readonly output: vscode.OutputChannel) {}

  refresh(): void {
    this.changeEmitter.fire();
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }

  async provideMcpServerDefinitions(): Promise<vscode.McpServerDefinition[]> {
    const config = readConfig();
    if (config.transport === 'http') {
      await startServer({ notify: false });
      const endpoint = localEndpoints(config).mcp;
      this.output.appendLine(`MCP provider: using Streamable HTTP at ${endpoint}`);
      return [
        new vscode.McpHttpServerDefinition(
            'Darbot Browser MCP',
            vscode.Uri.parse(endpoint),
            undefined,
            SERVER_VERSION,
        ),
      ];
    }

    const resolved = await resolveServerCommand(config);
    resolved.args.push(...buildServerArgs(config, 'stdio'));
    this.output.appendLine(`MCP provider: using stdio command ${resolved.command} ${resolved.args.join(' ')}`);
    return [
      new vscode.McpStdioServerDefinition(
          'Darbot Browser MCP',
          resolved.command,
          resolved.args,
          {
            NODE_ENV: process.env.NODE_ENV ?? 'production',
            DARBOT_LOG_LEVEL: config.logLevel,
          },
          SERVER_VERSION,
      ),
    ];
  }
}

class ConnectionTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    description: string,
    icon: string,
    command: string,
    tooltip: string,
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.iconPath = new vscode.ThemeIcon(icon);
    this.tooltip = tooltip;
    this.command = {
      command,
      title: label,
    };
  }
}

class ConnectionsTreeProvider implements vscode.TreeDataProvider<ConnectionTreeItem> {
  private readonly changeEmitter = new vscode.EventEmitter<ConnectionTreeItem | undefined>();
  readonly onDidChangeTreeData = this.changeEmitter.event;

  refresh(): void {
    this.changeEmitter.fire(undefined);
  }

  getTreeItem(element: ConnectionTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): ConnectionTreeItem[] {
    const config = readConfig();
    const local = localEndpoints(config);
    const tunnel = configuredTunnelEndpoints(config);
    const serverDescription = serverState === 'running'
      ? `${config.transport.toUpperCase()} :${config.httpPort}`
      : serverState === 'external'
        ? `External HTTP :${config.httpPort}`
        : capitalize(serverState);

    return [
      new ConnectionTreeItem(
          'Server',
          serverDescription,
          serverState === 'running' || serverState === 'external' ? 'server-process' : 'debug-stop',
          `${EXTENSION_ID}.showStatus`,
          `Darbot Browser MCP server is ${serverDescription}.`,
      ),
      new ConnectionTreeItem(
          'Local REST API',
          local.restTools,
          'json',
          `${EXTENSION_ID}.openRestTools`,
          'Open the local registration-truth tool list.',
      ),
      new ConnectionTreeItem(
          'MCP Endpoint',
          (tunnel ?? local).mcp,
          'plug',
          `${EXTENSION_ID}.copyMcpEndpoint`,
          'Copy the MCP Streamable HTTP endpoint.',
      ),
      new ConnectionTreeItem(
          'Power Platform API',
          (tunnel ?? local).powerPlatformBase,
          'cloud',
          `${EXTENSION_ID}.copyPowerPlatformEndpoint`,
          'Copy the REST base URL used by Power Platform and Copilot Studio.',
      ),
      new ConnectionTreeItem(
          'Dev Tunnel',
          tunnel?.baseUrl ?? 'Not configured',
          tunnel ? 'remote-explorer' : 'warning',
          tunnel ? `${EXTENSION_ID}.testEndpoints` : `${EXTENSION_ID}.forwardDevTunnel`,
          tunnel
            ? 'Test the configured development tunnel.'
            : 'Forward the configured HTTP port with the native VS Code Ports view.',
      ),
      new ConnectionTreeItem(
          'OpenAPI',
          (tunnel ?? local).openApi,
          'symbol-interface',
          `${EXTENSION_ID}.openOpenApi`,
          'Open the runtime OpenAPI document.',
      ),
    ];
  }
}

export function activate(context: vscode.ExtensionContext): void {
  mcpOutputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  context.subscriptions.push(mcpOutputChannel);

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = `${EXTENSION_ID}.showStatus`;
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  connectionsTreeProvider = new ConnectionsTreeProvider();
  context.subscriptions.push(vscode.window.registerTreeDataProvider(CONNECTIONS_VIEW_ID, connectionsTreeProvider));

  registerMcpProvider(context);
  registerCommands(context);
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
    if (!event.affectsConfiguration(CONFIG_SECTION))
      return;
    mcpProvider?.refresh();
    refreshUi();
    if (managedServer)
      mcpOutputChannel.appendLine('Configuration changed. Restart the managed server to apply launch-setting changes.');
  }));

  refreshUi();
  void maybePromptForMcpGallery();

  const config = readConfig();
  if (config.autoStart)
    void startServer();
}

export async function deactivate(): Promise<void> {
  await stopServer(false);
  statusBarItem?.dispose();
  mcpOutputChannel?.dispose();
}

function registerMcpProvider(context: vscode.ExtensionContext): void {
  try {
    mcpProvider = new DarbotBrowserMCPProvider(mcpOutputChannel);
    const disposable = vscode.lm.registerMcpServerDefinitionProvider(EXTENSION_ID, mcpProvider);
    context.subscriptions.push(disposable, mcpProvider);
    mcpOutputChannel.appendLine('Registered MCP Server Definition Provider via vscode.lm.');
  } catch (error) {
    mcpOutputChannel.appendLine(`Failed to register MCP Server Definition Provider: ${formatError(error)}`);
  }
}

function registerCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
      vscode.commands.registerCommand(`${EXTENSION_ID}.startServer`, () => startServer()),
      vscode.commands.registerCommand(`${EXTENSION_ID}.stopServer`, () => stopServer()),
      vscode.commands.registerCommand(`${EXTENSION_ID}.restartServer`, restartServer),
      vscode.commands.registerCommand(`${EXTENSION_ID}.showStatus`, showStatus),
      vscode.commands.registerCommand(`${EXTENSION_ID}.openBridgeStatus`, openBridgeStatus),
      vscode.commands.registerCommand(`${EXTENSION_ID}.openHealth`, () => openEndpoint(integrationEndpoints().health)),
      vscode.commands.registerCommand(`${EXTENSION_ID}.openRestTools`, () => openEndpoint(integrationEndpoints().restTools)),
      vscode.commands.registerCommand(`${EXTENSION_ID}.openOpenApi`, () => openEndpoint(integrationEndpoints().openApi)),
      vscode.commands.registerCommand(`${EXTENSION_ID}.copyMcpEndpoint`, copyMcpEndpoint),
      vscode.commands.registerCommand(`${EXTENSION_ID}.copyPowerPlatformEndpoint`, copyPowerPlatformEndpoint),
      vscode.commands.registerCommand(`${EXTENSION_ID}.forwardDevTunnel`, forwardDevTunnel),
      vscode.commands.registerCommand(`${EXTENSION_ID}.setDevTunnelUrl`, setDevTunnelUrl),
      vscode.commands.registerCommand(`${EXTENSION_ID}.testEndpoints`, testEndpoints),
      vscode.commands.registerCommand(`${EXTENSION_ID}.openSettings`, () =>
        vscode.commands.executeCommand('workbench.action.openSettings', CONFIG_SECTION)),
  );
}

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

async function startServer(options: StartServerOptions = {}): Promise<void> {
  const notify = options.notify ?? true;
  if (managedServer || externalHttpServer) {
    if (notify)
      void vscode.window.showInformationMessage('Darbot Browser MCP is already available.');
    return;
  }
  if (serverStartPromise) {
    await serverStartPromise;
    return;
  }

  serverStartPromise = startServerInternal(notify);
  try {
    await serverStartPromise;
  } finally {
    serverStartPromise = null;
  }
}

async function startServerInternal(notify: boolean): Promise<void> {
  const config = readConfig();
  if (config.transport === 'http') {
    const existing = await detectExistingHttpServer(config);
    if (existing === 'darbot') {
      externalHttpServer = true;
      serverState = 'external';
      lastServerError = undefined;
      mcpOutputChannel.appendLine(`Using existing Darbot Browser MCP HTTP server at ${localEndpoints(config).baseUrl}.`);
      refreshUi();
      if (notify)
        void vscode.window.showInformationMessage(`Using existing Darbot Browser MCP server on port ${config.httpPort}.`);
      return;
    }
    if (existing === 'other')
      throw new Error(`Port ${config.httpPort} is already occupied by a non-Darbot service.`);
  }

  const resolved = await resolveServerCommand(config);
  resolved.args.push(...buildServerArgs(config));
  const details = `transport=${config.transport} browser=${config.browser} headless=${config.headless} noSandbox=${config.noSandbox}`;
  mcpOutputChannel.appendLine(`Starting Browser MCP Server: ${resolved.command} ${resolved.args.join(' ')} (${details})`);

  serverState = 'starting';
  lastServerError = undefined;
  refreshUi();

  const child = spawn(resolved.command, resolved.args, {
    stdio: 'pipe',
    shell: resolved.shell,
    windowsHide: true,
    env: buildServerEnvironment(config),
  });
  const server: ManagedServer = {
    process: child,
    transport: config.transport,
    intentionallyStopped: false,
    starting: true,
  };
  managedServer = server;

  child.stdout?.on('data', chunk => mcpOutputChannel.append(chunk.toString()));
  child.stderr?.on('data', chunk => mcpOutputChannel.append(chunk.toString()));
  child.on('error', error => {
    lastServerError = error.message;
  });
  child.on('exit', (code, signal) => {
    const wasCurrent = managedServer?.process === child;
    if (wasCurrent)
      managedServer = null;
    if (!wasCurrent)
      return;

    if (server.intentionallyStopped) {
      serverState = 'stopped';
      lastServerError = undefined;
    } else {
      serverState = 'error';
      lastServerError = code !== null
        ? `Server exited with code ${code}.`
        : `Server was terminated by signal ${signal ?? 'unknown'}.`;
      if (!server.starting)
        void vscode.window.showErrorMessage(`Darbot Browser MCP stopped unexpectedly: ${lastServerError}`);
    }
    refreshUi();
  });

  try {
    if (config.transport === 'http')
      await waitForHttpServer(localEndpoints(config).live, config.httpStartupTimeout, child);
    else
      await waitForProcessStartup(child);

    server.starting = false;
    serverState = 'running';
    lastServerError = undefined;
    refreshUi();
    mcpOutputChannel.show(true);
    if (notify) {
      const message = config.transport === 'http'
        ? `Darbot Browser MCP started at ${localEndpoints(config).baseUrl}.`
        : 'Darbot Browser MCP started over stdio.';
      void vscode.window.showInformationMessage(message);
    }
    if (config.transport === 'http' && config.devTunnelPromptOnStart)
      void forwardDevTunnel();
  } catch (error) {
    server.intentionallyStopped = true;
    await terminateChild(child);
    if (managedServer?.process === child)
      managedServer = null;
    serverState = 'error';
    lastServerError = formatError(error);
    refreshUi();
    void vscode.window.showErrorMessage(`Failed to start Darbot Browser MCP: ${lastServerError}`);
    throw error;
  }
}

async function stopServer(notify = true): Promise<void> {
  if (externalHttpServer) {
    externalHttpServer = false;
    serverState = 'stopped';
    refreshUi();
    if (notify) {
      void vscode.window.showInformationMessage(
          'The HTTP server is owned by another process and was not terminated. The extension stopped tracking it.',
      );
    }
    return;
  }
  if (!managedServer) {
    if (notify)
      void vscode.window.showInformationMessage('Darbot Browser MCP is not running.');
    return;
  }

  const server = managedServer;
  server.intentionallyStopped = true;
  try {
    await terminateChild(server.process);
    if (managedServer?.process === server.process)
      managedServer = null;
    serverState = 'stopped';
    lastServerError = undefined;
    refreshUi();
    if (notify)
      void vscode.window.showInformationMessage('Darbot Browser MCP stopped.');
  } catch (error) {
    serverState = 'error';
    lastServerError = `Could not stop server: ${formatError(error)}`;
    refreshUi();
    if (notify)
      void vscode.window.showErrorMessage(lastServerError);
  }
}

async function restartServer(): Promise<void> {
  await stopServer(false);
  await startServer();
}

async function terminateChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null)
    return;
  if (!child.pid)
    throw new Error('Server process does not have a process ID.');

  if (process.platform === 'win32') {
    await new Promise<void>((resolve, reject) => {
      execFile('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], error => {
        if (error && child.exitCode === null && child.signalCode === null)
          reject(error);
        else
          resolve();
      });
    });
    return;
  }

  const exited = new Promise<void>(resolve => child.once('exit', () => resolve()));
  child.kill('SIGTERM');
  await Promise.race([
    exited,
    delay(3_000).then(() => {
      if (child.exitCode === null && child.signalCode === null)
        child.kill('SIGKILL');
    }),
  ]);
}

async function detectExistingHttpServer(config: ServerConfig): Promise<'none' | 'darbot' | 'other'> {
  const endpoints = localEndpoints(config);
  const live = await probeEndpoint(endpoints.live, 1_000);
  if (live.status === undefined)
    return 'none';
  if (live.status !== 200)
    return 'other';

  const openApi = await probeEndpoint(endpoints.openApi, 2_000);
  return openApi.status === 200 && openApi.body?.includes('Darbot Browser MCP')
    ? 'darbot'
    : 'other';
}

async function waitForProcessStartup(child: ChildProcess): Promise<void> {
  await delay(300);
  if (child.exitCode !== null)
    throw new Error(`Server exited with code ${child.exitCode} during startup.`);
}

async function waitForHttpServer(url: string, timeoutMs: number, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastProbe: ProbeResult | undefined;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error(`Server exited with code ${child.exitCode} during HTTP startup.`);
    lastProbe = await probeEndpoint(url, Math.min(1_000, Math.max(250, deadline - Date.now())));
    if (lastProbe.status === 200)
      return;
    await delay(250);
  }
  throw new Error(
      `HTTP server did not become live within ${timeoutMs}ms${lastProbe?.error ? `: ${lastProbe.error}` : ''}.`,
  );
}

function probeEndpoint(urlValue: string, timeoutMs: number): Promise<ProbeResult> {
  return new Promise(resolve => {
    let url: URL;
    try {
      url = new URL(urlValue);
    } catch (error) {
      resolve({ url: urlValue, error: formatError(error) });
      return;
    }

    const client = url.protocol === 'https:' ? https : http;
    const headers: Record<string, string> = {};
    if (url.hostname.endsWith('.devtunnels.ms'))
      headers['X-Tunnel-Skip-AntiPhishing-Page'] = 'true';

    const req = client.get(url, { headers, timeout: timeoutMs }, response => {
      const chunks: Buffer[] = [];
      let length = 0;
      response.on('data', chunk => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        if (length < 65_536)
          chunks.push(buffer.subarray(0, Math.max(0, 65_536 - length)));
        length += buffer.length;
      });
      response.on('end', () => {
        resolve({
          url: urlValue,
          status: response.statusCode,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    req.on('timeout', () => req.destroy(new Error(`Timeout after ${timeoutMs}ms`)));
    req.on('error', error => resolve({ url: urlValue, error: error.message }));
  });
}

async function testEndpoints(): Promise<void> {
  const config = readConfig();
  const local = localEndpoints(config);
  const tunnel = configuredTunnelEndpoints(config);
  const targets = [
    ['Local health', local.health],
    ['Local REST tools', local.restTools],
    ...(tunnel
      ? [
          ['Dev Tunnel health', tunnel.health],
          ['Dev Tunnel REST tools', tunnel.restTools],
        ]
      : []),
  ] as Array<[string, string]>;

  mcpOutputChannel.appendLine('--- Endpoint test ---');
  const results = await Promise.all(targets.map(async ([label, url]) => {
    const result = await probeEndpoint(url, 10_000);
    const status = result.status !== undefined ? `HTTP ${result.status}` : result.error ?? 'Unknown error';
    mcpOutputChannel.appendLine(`${label}: ${status} (${url})`);
    return { label, result };
  }));
  mcpOutputChannel.show(true);

  const failures = results.filter(({ result }) => result.status === undefined || result.status >= 500);
  if (failures.length === 0) {
    void vscode.window.showInformationMessage('Darbot Browser MCP local and tunnel endpoints are reachable.');
  } else {
    const summary = failures.map(({ label, result }) =>
      `${label}: ${result.status !== undefined ? `HTTP ${result.status}` : result.error}`).join('; ');
    void vscode.window.showErrorMessage(
        `${summary}. A Dev Tunnel 502 means the tunnel is active but no HTTP server is listening on the forwarded port.`,
    );
  }
}

async function forwardDevTunnel(): Promise<void> {
  const config = readConfig();
  if (config.transport !== 'http') {
    void vscode.window.showWarningMessage('Set darbot-browser-mcp.transport to "http" before forwarding a port.');
    return;
  }

  await startServer({ notify: false });
  await vscode.env.clipboard.writeText(String(config.httpPort));
  const commands = await vscode.commands.getCommands(true);
  if (!commands.includes('remote.tunnel.forwardCommandPalette')) {
    void vscode.window.showErrorMessage('This VS Code build does not expose the native Forward a Port command.');
    return;
  }

  mcpOutputChannel.appendLine(`Opening VS Code's native Forward a Port flow for port ${config.httpPort}.`);
  await vscode.commands.executeCommand('remote.tunnel.forwardCommandPalette');
  await delay(1_000);

  const detected = await detectExternalBaseUrl(config);
  if (detected) {
    await saveDevTunnelUrl(detected);
    void vscode.window.showInformationMessage(
        `Dev Tunnel detected at ${detected}. Set its Port Visibility to Public before using Power Platform.`,
    );
  } else {
    void vscode.window.showInformationMessage(
        `Port ${config.httpPort} was copied to the clipboard. After forwarding it, set Port Visibility to Public and run "Set Dev Tunnel URL".`,
    );
  }
}

async function detectExternalBaseUrl(config: ServerConfig): Promise<string | undefined> {
  const local = localEndpoints(config).baseUrl;
  try {
    const external = await vscode.env.asExternalUri(vscode.Uri.parse(local));
    const normalized = normalizeBaseUrl(external.toString());
    return normalized === normalizeBaseUrl(local) ? undefined : normalized;
  } catch (error) {
    mcpOutputChannel.appendLine(`Could not detect an external URI: ${formatError(error)}`);
    return undefined;
  }
}

async function setDevTunnelUrl(): Promise<void> {
  const config = readConfig();
  const value = await vscode.window.showInputBox({
    title: 'Darbot Browser MCP Dev Tunnel',
    prompt: 'Paste the public Dev Tunnel URL. Endpoint suffixes such as /mcp/ or /api/v1 are removed automatically.',
    value: config.devTunnelUrl,
    placeHolder: 'https://example-3000.usw2.devtunnels.ms',
    validateInput: input => {
      if (!input.trim())
        return undefined;
      try {
        normalizeBaseUrl(input);
        return undefined;
      } catch (error) {
        return formatError(error);
      }
    },
  });
  if (value === undefined)
    return;
  if (!value.trim()) {
    await saveDevTunnelUrl('');
    void vscode.window.showInformationMessage('Cleared the Darbot Browser MCP Dev Tunnel URL.');
    return;
  }

  const normalized = normalizeBaseUrl(value);
  await saveDevTunnelUrl(normalized);
  void vscode.window.showInformationMessage(`Dev Tunnel URL set to ${normalized}.`);
}

async function saveDevTunnelUrl(value: string): Promise<void> {
  const target = vscode.workspace.workspaceFolders
    ? vscode.ConfigurationTarget.Workspace
    : vscode.ConfigurationTarget.Global;
  await vscode.workspace.getConfiguration(CONFIG_SECTION).update('devTunnel.url', value, target);
  refreshUi();
}

async function copyMcpEndpoint(): Promise<void> {
  const url = integrationEndpoints().mcp;
  await vscode.env.clipboard.writeText(url);
  void vscode.window.showInformationMessage(`Copied MCP endpoint: ${url}`);
}

async function copyPowerPlatformEndpoint(): Promise<void> {
  const url = integrationEndpoints().powerPlatformBase;
  await vscode.env.clipboard.writeText(url);
  void vscode.window.showInformationMessage(`Copied Power Platform REST base URL: ${url}`);
}

async function openEndpoint(url: string): Promise<void> {
  try {
    await vscode.env.openExternal(vscode.Uri.parse(url));
  } catch (error) {
    void vscode.window.showErrorMessage(`Could not open ${url}: ${formatError(error)}`);
  }
}

async function openBridgeStatus(): Promise<void> {
  await openEndpoint(readConfig().bridgeStatusUrl);
}

async function showStatus(): Promise<void> {
  const config = readConfig();
  const local = localEndpoints(config);
  const tunnel = configuredTunnelEndpoints(config);
  const statusLines = [
    `State: ${serverState}`,
    `Transport: ${config.transport}`,
    `Local base URL: ${local.baseUrl}`,
    `MCP: ${local.mcp}`,
    `REST tools: ${local.restTools}`,
    `Dev Tunnel: ${tunnel?.baseUrl ?? 'not configured'}`,
    ...(lastServerError ? [`Last error: ${lastServerError}`] : []),
  ];
  mcpOutputChannel.appendLine('--- Status ---');
  statusLines.forEach(line => mcpOutputChannel.appendLine(line));

  const actions: Array<vscode.QuickPickItem & { command: string }> = [];
  if (serverState === 'stopped' || serverState === 'error') {
    actions.push({
      label: '$(play) Start Server',
      description: `${config.transport.toUpperCase()} on ${local.baseUrl}`,
      command: `${EXTENSION_ID}.startServer`,
    });
  } else {
    actions.push(
        { label: '$(debug-stop) Stop Server', command: `${EXTENSION_ID}.stopServer` },
        { label: '$(debug-restart) Restart Server', command: `${EXTENSION_ID}.restartServer` },
    );
  }
  actions.push(
      { label: '$(pulse) Test Endpoints', command: `${EXTENSION_ID}.testEndpoints` },
      { label: '$(remote) Forward Port with VS Code', description: String(config.httpPort), command: `${EXTENSION_ID}.forwardDevTunnel` },
      { label: '$(link) Set Dev Tunnel URL', description: tunnel?.baseUrl, command: `${EXTENSION_ID}.setDevTunnelUrl` },
      { label: '$(copy) Copy MCP Endpoint', description: (tunnel ?? local).mcp, command: `${EXTENSION_ID}.copyMcpEndpoint` },
      { label: '$(cloud) Copy Power Platform URL', description: (tunnel ?? local).powerPlatformBase, command: `${EXTENSION_ID}.copyPowerPlatformEndpoint` },
      { label: '$(json) Open REST Tools', description: (tunnel ?? local).restTools, command: `${EXTENSION_ID}.openRestTools` },
      { label: '$(symbol-interface) Open OpenAPI', description: (tunnel ?? local).openApi, command: `${EXTENSION_ID}.openOpenApi` },
      { label: '$(settings-gear) Open Settings', command: `${EXTENSION_ID}.openSettings` },
  );

  const choice = await vscode.window.showQuickPick(actions, {
    title: 'Darbot Browser MCP',
    placeHolder: statusLines.join(' • '),
    matchOnDescription: true,
  });
  if (choice)
    await vscode.commands.executeCommand(choice.command);
}

function refreshUi(): void {
  updateStatusBarItem();
  connectionsTreeProvider?.refresh();
}

function updateStatusBarItem(): void {
  if (!statusBarItem)
    return;
  const config = readConfig();
  switch (serverState) {
    case 'running':
      statusBarItem.text = config.transport === 'http'
        ? `$(broadcast) MCP: :${config.httpPort}`
        : '$(browser) MCP: stdio';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
      break;
    case 'external':
      statusBarItem.text = `$(radio-tower) MCP: :${config.httpPort}`;
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
      break;
    case 'starting':
      statusBarItem.text = '$(sync~spin) MCP: Starting';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      break;
    case 'error':
      statusBarItem.text = '$(error) MCP: Error';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      break;
    default:
      statusBarItem.text = '$(browser) MCP: Stopped';
      statusBarItem.backgroundColor = undefined;
  }
  const local = localEndpoints(config);
  const tunnel = configuredTunnelEndpoints(config);
  statusBarItem.tooltip = [
    `Darbot Browser MCP: ${capitalize(serverState)}`,
    `Local: ${local.baseUrl}`,
    `MCP: ${local.mcp}`,
    `REST: ${local.powerPlatformBase}`,
    `Dev Tunnel: ${tunnel?.baseUrl ?? 'not configured'}`,
    ...(lastServerError ? [`Error: ${lastServerError}`] : []),
  ].join('\n');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatError(error: unknown): string {
  if (error instanceof Error)
    return error.message;
  return String(error);
}
