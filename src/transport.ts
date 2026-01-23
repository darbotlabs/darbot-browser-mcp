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

import http from 'node:http';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

import debug from 'debug';
import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';

import type { AddressInfo } from 'node:net';
import type { Server } from './server.js';

import { createUnifiedAuthenticator, type UnifiedAuthenticator } from './auth/index.js';
import { createMcpOAuthProvider, getOAuthConfig, isOAuthConfigured } from './auth/mcpOAuthProvider.js';

export async function startStdioTransport(server: Server) {
  await server.createConnection(new StdioServerTransport());
}

const testDebug = debug('pw:mcp:test');

async function handleSSE(server: Server, req: http.IncomingMessage, res: http.ServerResponse, url: URL, sessions: Map<string, SSEServerTransport>) {
  if (req.method === 'POST') {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) {
      res.statusCode = 400;
      return res.end('Missing sessionId');
    }

    const transport = sessions.get(sessionId);
    if (!transport) {
      res.statusCode = 404;
      return res.end('Session not found');
    }

    return await transport.handlePostMessage(req, res);
  } else if (req.method === 'GET') {
    const transport = new SSEServerTransport('/sse', res);
    sessions.set(transport.sessionId, transport);
    testDebug(`create SSE session: ${transport.sessionId}`);
    const connection = await server.createConnection(transport);
    res.on('close', () => {
      testDebug(`delete SSE session: ${transport.sessionId}`);
      sessions.delete(transport.sessionId);
      // eslint-disable-next-line no-console
      void connection.close().catch(e => console.error(e));
    });
    return;
  }

  res.statusCode = 405;
  res.end('Method not allowed');
}

async function handleStreamable(server: Server, req: http.IncomingMessage, res: http.ServerResponse, sessions: Map<string, StreamableHTTPServerTransport>) {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (sessionId) {
    const transport = sessions.get(sessionId);
    if (!transport) {
      res.statusCode = 404;
      res.end('Session not found');
      return;
    }
    return await transport.handleRequest(req, res);
  }

  if (req.method === 'POST') {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: sessionId => {
        sessions.set(sessionId, transport);
      }
    });
    transport.onclose = () => {
      if (transport.sessionId)
        sessions.delete(transport.sessionId);
    };
    await server.createConnection(transport);
    await transport.handleRequest(req, res);
    return;
  }

  res.statusCode = 400;
  res.end('Invalid request');
}

async function killProcessOnPort(port: number): Promise<boolean> {
  const isWindows = process.platform === 'win32';
  try {
    if (isWindows) {
      // Find and kill process on Windows
      const result = execSync(`netstat -ano | findstr ":${port}"`, { encoding: 'utf8' });
      const lines = result.split('\n').filter(line => line.includes('LISTENING'));
      const pidsToKill = new Set<string>();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== '0')
          pidsToKill.add(pid);
      }
      for (const pid of pidsToKill) {
        // eslint-disable-next-line no-console
        console.error(`Killing process ${pid} using port ${port}...`);
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
        } catch (e: any) {
          // Process may have already exited
          if (!e.message?.includes('not found'))
            throw e;
        }
      }
    } else {
      // Find and kill process on Unix-like systems
      const result = execSync(`lsof -ti:${port}`, { encoding: 'utf8' });
      const pids = result.trim().split('\n').filter(Boolean);
      for (const pid of pids) {
        // eslint-disable-next-line no-console
        console.error(`Killing process ${pid} using port ${port}...`);
        try {
          execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
        } catch {
          // Process may have already exited
        }
      }
    }
    // Wait for port to be released
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  } catch {
    return false;
  }
}

export interface HttpServerResult {
  httpServer: http.Server;
  app: express.Express;
}

export async function startHttpServer(config: { host?: string, port?: number }): Promise<HttpServerResult> {
  const { host, port } = config;

  // Create Express app
  const app = express();

  // Trust proxy for Azure App Service
  app.set('trust proxy', 1);

  // Parse JSON bodies
  app.use(express.json());

  // CORS middleware
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, Mcp-Session-Id');
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    next();
  });

  // Setup OAuth router if configured
  const oauthConfig = getOAuthConfig();
  if (isOAuthConfigured() && oauthConfig) {
    try {
      const provider = createMcpOAuthProvider(oauthConfig);
      const serverUrl = new URL(oauthConfig.serverBaseUrl);

      const authRouter = mcpAuthRouter({
        provider,
        issuerUrl: serverUrl,
        baseUrl: serverUrl,
        serviceDocumentationUrl: new URL('https://github.com/AugustinMauworworworwy/darbot-browser-mcp'),
        scopesSupported: ['openid', 'profile', 'email', 'User.Read'],
        resourceName: 'Darbot Browser MCP',
      });

      // Mount OAuth router at root (handles /.well-known/*, /authorize, /token, /register)
      app.use(authRouter);
      // eslint-disable-next-line no-console
      console.error('[OAuth] MCP OAuth router configured with Entra ID proxy');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[OAuth] Failed to setup OAuth router:', error);
    }
  }

  // Create HTTP server from Express app
  const httpServer = http.createServer(app);

  const tryListen = () => new Promise<void>((resolve, reject) => {
    httpServer.on('error', reject);
    httpServer.listen(port, host, () => {
      resolve();
      httpServer.removeListener('error', reject);
    });
  });

  try {
    await tryListen();
  } catch (error: any) {
    if (error.code === 'EADDRINUSE' && port !== undefined) {
      // eslint-disable-next-line no-console
      console.error(`Port ${port} is in use. Attempting to terminate conflicting service...`);
      const killed = await killProcessOnPort(port);
      if (killed) {
        // Retry after killing
        await tryListen();
      } else {
        throw new Error(`Port ${port} is already in use and could not terminate the conflicting process. Please free the port manually or use a different port.`);
      }
    } else {
      throw error;
    }
  }

  return { httpServer, app };
}

export function startHttpTransport(httpServer: http.Server, mcpServer: Server, app?: express.Express) {
  const sseSessions = new Map<string, SSEServerTransport>();
  const streamableSessions = new Map<string, StreamableHTTPServerTransport>();

  // Use unified authenticator that supports multiple auth methods
  const authenticator = createUnifiedAuthenticator();
  
  // Initialize async auth providers (Managed Identity, Key Vault)
  void authenticator.initialize().catch(err => {
    // eslint-disable-next-line no-console
    console.error('[Auth] Failed to initialize async auth providers:', err);
  });

  const sendJson = (res: http.ServerResponse, statusCode: number, body: unknown) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  };

  const enforceAuthIfEnabled = async (req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> => {
    // Check if any auth method is configured
    if (!authenticator.isAuthEnabled())
      return true;

    const result = await authenticator.authenticate(req);
    
    if (result.authenticated) {
      // Attach user info to request
      (req as any).auth = result;
      (req as any).user = result.user;
      return true;
    }

    // Return 401 with helpful error message
    sendJson(res, 401, {
      error: 'unauthorized',
      message: result.error || 'Valid authentication required.',
      hint: 'Use Entra ID OAuth, VS Code tunnel, or Azure Managed Identity.',
    });
    return false;
  };

  httpServer.on('request', async (req, res) => {
    const url = new URL(`http://localhost${req.url}`);

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
      res.statusCode = 200;
      res.end();
      return;
    }

    // Add CORS headers to all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    // Health check endpoints
    if (url.pathname === '/health') {
      try {
        const { createHealthCheckService } = await import('./health.js');
        const healthService = createHealthCheckService();
        await healthService.handleHealthCheck(req, res);
      } catch (error) {
        res.statusCode = 500;
        res.end('Health check service unavailable');
      }
      return;
    }

    if (url.pathname === '/ready') {
      try {
        const { createHealthCheckService } = await import('./health.js');
        const healthService = createHealthCheckService();
        await healthService.handleReadinessCheck(req, res);
      } catch (error) {
        res.statusCode = 503;
        res.end('Service unavailable');
      }
      return;
    }

    if (url.pathname === '/live') {
      try {
        const { createHealthCheckService } = await import('./health.js');
        const healthService = createHealthCheckService();
        await healthService.handleLivenessCheck(req, res);
      } catch (error) {
        res.statusCode = 503;
        res.end('Service unavailable');
      }
      return;
    }

    // OpenAPI specification endpoint
    if (url.pathname === '/openapi.json' || url.pathname === '/swagger.json') {
      try {
        const { createOpenAPIGenerator } = await import('./openapi.js');
        const { snapshotTools } = await import('./tools.js');
        // Use the static tools list
        const tools = snapshotTools;
        const openApiGenerator = createOpenAPIGenerator(tools);
        openApiGenerator.handleOpenAPISpec(req, res);
      } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.end(JSON.stringify({ error: 'Failed to generate OpenAPI spec', message: errorMessage }));
      }
      return;
    }

    // MCP endpoints with authentication
    if (url.pathname.startsWith('/mcp')) {
      if (!(await enforceAuthIfEnabled(req, res)))
        return;
      await handleStreamable(mcpServer, req, res, streamableSessions);
      return;
    }

    // API endpoints for tools (REST-style access)
    if (url.pathname.startsWith('/api/v1/')) {
      // TODO: Implement REST API endpoints for individual tools
      res.statusCode = 501;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'REST API endpoints not yet implemented',
        message: 'These endpoints are placeholders for future functionality. Planned features include tool-specific operations and data retrieval. Refer to the API documentation for updates.',
        documentation_url: 'https://example.com/api-docs'
      }));
      return;
    }

    // Default SSE endpoint
    if (!(await enforceAuthIfEnabled(req, res)))
      return;
    await handleSSE(mcpServer, req, res, url, sseSessions);
  });

  const url = httpAddressToString(httpServer.address());
  const message = [
    `Darbot Browser MCP Server listening on ${url}`,
    '',
    'Available endpoints:',
    `  Health Check: ${url}/health`,
    `  Readiness:    ${url}/ready`,
    `  Liveness:     ${url}/live`,
    `  OpenAPI:      ${url}/openapi.json`,
    `  MCP:          ${url}/mcp`,
    `  SSE:          ${url}/sse`,
    '',
    'Client configuration (MCP):',
    JSON.stringify({
      'mcpServers': {
        'darbot-browser': {
          'url': `${url}/mcp`
        }
      }
    }, undefined, 2),
    '',
    'Copilot Studio integration ready! ',
  ].join('\n');
    // eslint-disable-next-line no-console
  console.error(message);
}

export function httpAddressToString(address: string | AddressInfo | null): string {
  assert(address, 'Could not bind server socket');
  if (typeof address === 'string')
    return address;
  const resolvedPort = address.port;
  let resolvedHost = address.family === 'IPv4' ? address.address : `[${address.address}]`;
  if (resolvedHost === '0.0.0.0' || resolvedHost === '[::]')
    resolvedHost = 'localhost';
  return `http://${resolvedHost}:${resolvedPort}`;
}
