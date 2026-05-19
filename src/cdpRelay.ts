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

/**
 * Bridge Server - Standalone WebSocket server that bridges Darbot Browser MCP and Browser Extension
 *
 * Endpoints:
 * - /cdp - Full CDP interface for Darbot Browser MCP
 * - /extension - Extension connection for chrome.debugger forwarding
 */

import http from 'node:http';
import { EventEmitter } from 'node:events';

import debug from 'debug';
import { WebSocket, WebSocketServer } from 'ws';

import { packageJSON } from './package.js';
import { httpAddressToString } from './transport.js';

const debugLogger = debug('pw:mcp:relay');

const CDP_PATH = '/cdp';
const EXTENSION_PATH = '/extension';

/**
 * CDP target metadata as supplied by the browser extension. The extension
 * may forward additional Chromium-defined fields; this interface captures
 * the ones the relay actually reads.
 */
export interface CDPTargetInfo {
  targetId?: string;
  type?: string;
  title?: string;
  url?: string;
  attached?: boolean;
  browserContextId?: string;
  openerId?: string;
  [extra: string]: unknown;
}

/**
 * A loosely-typed JSON-RPC message exchanged over the CDP transport.
 *
 * CDP messages are heterogeneous (commands, events, responses) so this is
 * intentionally permissive; downstream handlers narrow per-method.
 */
export interface CDPMessage {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { message: string; code?: number };
  sessionId?: string;
}

interface ConnectionInfoMessage {
  type: 'connection_info';
  targetInfo: CDPTargetInfo;
  sessionId: string;
  extensionVersion?: string;
}

interface ConnectionInfo {
  targetInfo: CDPTargetInfo;
  sessionId: string;
  extensionVersion?: string;
}

export interface BridgeStatus {
  extensionConnected: boolean;
  mcpConnected: boolean;
  targetInfo: CDPTargetInfo | null;
  sessionId: string | null;
  extensionVersion: string | null;
}

export class CDPRelayServer extends EventEmitter {
  private readonly _wss: WebSocketServer;
  private _playwrightSocket: WebSocket | null = null;
  private _extensionSocket: WebSocket | null = null;
  private _connectionInfo: ConnectionInfo | undefined;

  constructor(server: http.Server) {
    super();
    this._wss = new WebSocketServer({ server });
    this._wss.on('connection', this._onConnection.bind(this));
  }

  /**
   * Get the current bridge status for debugging, monitoring and the
   * /bridge endpoint exposed by the MCP HTTP transport.
   */
  getStatus(): BridgeStatus {
    return {
      extensionConnected: this._extensionSocket?.readyState === WebSocket.OPEN,
      mcpConnected: this._playwrightSocket?.readyState === WebSocket.OPEN,
      targetInfo: this._connectionInfo?.targetInfo ?? null,
      sessionId: this._connectionInfo?.sessionId ?? null,
      extensionVersion: this._connectionInfo?.extensionVersion ?? null,
    };
  }

  stop(): void {
    this._playwrightSocket?.close();
    this._extensionSocket?.close();
  }

  private _onConnection(ws: WebSocket, request: http.IncomingMessage): void {
    const url = new URL(`http://localhost${request.url ?? '/'}`);
    debugLogger(`New connection to ${url.pathname}`);

    if (url.pathname === CDP_PATH)
      this._handlePlaywrightConnection(ws);
    else if (url.pathname === EXTENSION_PATH)
      this._handleExtensionConnection(ws);
    else {
      debugLogger(`Invalid path: ${url.pathname}`);
      ws.close(4004, 'Invalid path');
    }
  }

  /**
   * Handle Darbot Browser MCP connection - provides full CDP interface.
   */
  private _handlePlaywrightConnection(ws: WebSocket): void {
    if (this._playwrightSocket?.readyState === WebSocket.OPEN) {
      debugLogger('Closing previous Playwright connection');
      this._playwrightSocket.close(1000, 'New connection established');
    }

    this._playwrightSocket = ws;
    debugLogger('Darbot Browser MCP connected');

    ws.on('message', data => {
      try {
        const message = JSON.parse(data.toString()) as CDPMessage;
        this._handlePlaywrightMessage(message);
      } catch (error) {
        debugLogger('Error parsing Playwright message: %O', error);
      }
    });

    ws.on('close', () => {
      if (this._playwrightSocket === ws)
        this._playwrightSocket = null;
      debugLogger('Darbot Browser MCP disconnected');
    });

    ws.on('error', error => {
      debugLogger('Playwright WebSocket error: %O', error);
    });
  }

  /**
   * Handle Extension connection - forwards to browser debugger.
   */
  private _handleExtensionConnection(ws: WebSocket): void {
    if (this._extensionSocket?.readyState === WebSocket.OPEN) {
      debugLogger('Closing previous extension connection');
      this._extensionSocket.close(1000, 'New connection established');
    }

    this._extensionSocket = ws;
    debugLogger('Extension connected');

    ws.on('message', data => {
      try {
        const message = JSON.parse(data.toString()) as CDPMessage | ConnectionInfoMessage;
        this._handleExtensionMessage(message);
      } catch (error) {
        debugLogger('Error parsing extension message: %O', error);
      }
    });

    ws.on('close', () => {
      if (this._extensionSocket === ws)
        this._extensionSocket = null;
      debugLogger('Extension disconnected');
    });

    ws.on('error', error => {
      debugLogger('Extension WebSocket error: %O', error);
    });
  }

  /** Handle messages from Darbot Browser MCP. */
  private _handlePlaywrightMessage(message: CDPMessage): void {
    debugLogger('← Playwright: %s', message.method || `response(${message.id})`);

    if (message.method?.startsWith('Browser.'))
      return this._handleBrowserDomainMethod(message);

    if (message.method?.startsWith('Target.'))
      return this._handleTargetDomainMethod(message);

    if (message.method)
      this._forwardToExtension(message);
  }

  /** Handle messages from Extension. */
  private _handleExtensionMessage(message: CDPMessage | ConnectionInfoMessage): void {
    if ('type' in message && message.type === 'connection_info') {
      debugLogger('← Extension connected to tab: %O', message);
      this._connectionInfo = {
        targetInfo: message.targetInfo,
        // Page sessionId that should be used by this connection.
        sessionId: message.sessionId,
        ...(message.extensionVersion !== undefined && { extensionVersion: message.extensionVersion }),
      };
      return;
    }

    const cdp = message as CDPMessage;
    debugLogger(`← Extension message: ${cdp.method ?? (cdp.id && `response(id=${cdp.id})`) ?? 'unknown'}`);
    this._sendToPlaywright(cdp);
  }

  /** Handle Browser domain methods locally. */
  private _handleBrowserDomainMethod(message: CDPMessage): void {
    switch (message.method) {
      case 'Browser.getVersion':
        this._sendToPlaywright({
          ...(message.id !== undefined && { id: message.id }),
          result: {
            protocolVersion: '1.3',
            product: 'Browser/Extension-Bridge',
            userAgent: `CDP-Bridge-Server/${packageJSON.version}`,
          },
        });
        break;

      case 'Browser.setDownloadBehavior':
        this._sendToPlaywright({ ...(message.id !== undefined && { id: message.id }), result: {} });
        break;

      default:
        this._forwardToExtension(message);
    }
  }

  /** Handle Target domain methods. */
  private _handleTargetDomainMethod(message: CDPMessage): void {
    switch (message.method) {
      case 'Target.setAutoAttach': {
        // Simulate auto-attach behavior with real target info
        if (this._connectionInfo && !message.sessionId) {
          debugLogger('Simulating auto-attach for target: %O', message);
          this._sendToPlaywright({
            method: 'Target.attachedToTarget',
            params: {
              sessionId: this._connectionInfo.sessionId,
              targetInfo: { ...this._connectionInfo.targetInfo, attached: true },
              waitingForDebugger: false,
            },
          });
          this._sendToPlaywright({ ...(message.id !== undefined && { id: message.id }), result: {} });
        } else {
          this._forwardToExtension(message);
        }
        break;
      }

      case 'Target.getTargets': {
        const targetInfos: CDPTargetInfo[] = [];
        if (this._connectionInfo)
          targetInfos.push({ ...this._connectionInfo.targetInfo, attached: true });

        this._sendToPlaywright({ ...(message.id !== undefined && { id: message.id }), result: { targetInfos } });
        break;
      }

      default:
        this._forwardToExtension(message);
    }
  }

  /** Forward message to extension. */
  private _forwardToExtension(message: CDPMessage): void {
    if (this._extensionSocket?.readyState === WebSocket.OPEN) {
      debugLogger('→ Extension: %s', message.method || `command(${message.id})`);
      this._extensionSocket.send(JSON.stringify(message));
      return;
    }

    debugLogger('Extension not connected, cannot forward message');
    if (message.id !== undefined) {
      this._sendToPlaywright({
        id: message.id,
        error: { message: 'Extension not connected' },
      });
    }
  }

  /** Forward message to Playwright. */
  private _sendToPlaywright(message: CDPMessage): void {
    if (this._playwrightSocket?.readyState !== WebSocket.OPEN)
      return;
    debugLogger('→ Playwright: %s', JSON.stringify(message));
    this._playwrightSocket.send(JSON.stringify(message));
  }
}

export interface StartCDPRelayResult {
  cdpEndpoint: string;
  relayServer: CDPRelayServer;
}

/**
 * Attach a CDP relay to an existing HTTP server and return its endpoints.
 *
 * The relay registers a `process.on('exit')` handler to close its sockets
 * cleanly on shutdown.
 */
export async function startCDPRelayServer(httpServer: http.Server): Promise<StartCDPRelayResult> {
  const wsAddress = httpAddressToString(httpServer.address()).replace(/^http/, 'ws');
  const cdpRelayServer = new CDPRelayServer(httpServer);
  process.on('exit', () => cdpRelayServer.stop());
  debugLogger(`CDP relay server started on ${wsAddress}${EXTENSION_PATH} - Connect to it using the browser extension.`);
  return {
    cdpEndpoint: `${wsAddress}${CDP_PATH}`,
    relayServer: cdpRelayServer,
  };
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.argv[2] ?? '', 10) || 9223;
  const httpServer = http.createServer();
  await new Promise<void>(resolve => httpServer.listen(port, resolve));
  const server = new CDPRelayServer(httpServer);

  debugLogger(`CDP Bridge Server listening on ws://localhost:${port}`);
  debugLogger(`- Darbot Browser MCP: ws://localhost:${port}${CDP_PATH}`);
  debugLogger(`- Extension: ws://localhost:${port}${EXTENSION_PATH}`);

  process.on('SIGINT', () => {
    debugLogger('Shutting down bridge server...');
    server.stop();
    process.exit(0);
  });
}
