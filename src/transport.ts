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

import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { z } from 'zod';

import type { AddressInfo } from 'node:net';
import type { UnifiedAuthResult } from './auth/index.js';
import type { Connection } from './connection.js';
import type { Server } from './server.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

import { createUnifiedAuthenticator } from './auth/index.js';
import { createMcpOAuthProvider, getOAuthConfig, isOAuthConfigured } from './auth/mcpOAuthProvider.js';
import { createHealthCheckService, type HealthCheckService } from './health.js';

export async function startStdioTransport(server: Server) {
  await server.createConnection(new StdioServerTransport());
}

type StreamableSession = {
  transport: StreamableHTTPServerTransport;
  storageNamespace: string;
};

type RestToolSession = {
  id: string;
  storageNamespace: string;
  connection: Connection;
  lastUsedAt: number;
};

async function handleStreamable(
  server: Server,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  sessions: Map<string, StreamableSession>,
  storageNamespace: string,
) {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  // If session ID provided, try to use existing session
  if (sessionId) {
    const existingSession = sessions.get(sessionId);
    if (existingSession) {
      if (existingSession.storageNamespace !== storageNamespace) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: 'forbidden',
          message: 'This MCP session belongs to a different authenticated principal.',
        }));
        return;
      }
      return await existingSession.transport.handleRequest(req, res);
    }

    // Session not found (server may have restarted) - create new session for POST requests
    // eslint-disable-next-line no-console
    console.error(`[MCP] Session ${sessionId} not found, will create new session if POST request`);
  }

  // Handle POST requests - create new session (or recreate if old session expired)
  if (req.method === 'POST') {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: newSessionId => {
        sessions.set(newSessionId, { transport, storageNamespace });
        // eslint-disable-next-line no-console
        console.error(`[MCP] New session created: ${newSessionId}`);
      }
    });
    const connection = await server.createConnection(transport as Transport, { storageNamespace });
    transport.onclose = () => {
      if (transport.sessionId) {
        sessions.delete(transport.sessionId);
        // eslint-disable-next-line no-console
        console.error(`[MCP] Session closed: ${transport.sessionId}`);
      }
      void server.closeConnection(connection).catch(error => {
        // eslint-disable-next-line no-console
        console.error('[MCP] Failed to close connection:', error);
      });
    };
    await transport.handleRequest(req, res);
    return;
  }

  // GET requests without valid session
  if (req.method === 'GET') {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'invalid_request',
      message: 'GET requests require a valid session. Send a POST to /mcp first to initialize.',
    }));
    return;
  }

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    error: 'method_not_allowed',
    message: 'Use POST to send MCP messages',
  }));
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

  // CORS middleware - must come before body parsers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Darbot-Session-Id, Mcp-Session-Id, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'X-Darbot-Session-Id, Mcp-Session-Id');
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    next();
  });

  // MCP transports handle their own request bodies.
  app.use((req, res, next) => {
    if (req.path === '/mcp')
      return next();

    return express.json()(req, res, next);
  });

  // Setup OAuth router if configured
  const oauthConfig = getOAuthConfig();
  if (isOAuthConfigured() && oauthConfig) {
    try {
      const provider = createMcpOAuthProvider(oauthConfig);
      const serverUrl = oauthConfig.serverBaseUrl;

      const authRouter = mcpAuthRouter({
        provider,
        issuerUrl: serverUrl,
        baseUrl: serverUrl,
        serviceDocumentationUrl: new URL('https://github.com/darbotlabs/darbot-browser-mcp'),
        scopesSupported: ['openid', 'profile', 'email', 'User.Read'],
        resourceName: 'Darbot Browser MCP',
      });

      // Mount OAuth router at root (handles /.well-known/*, /authorize, /token, /register)
      app.use(authRouter);
      // eslint-disable-next-line no-console
      console.error('[OAuth] MCP OAuth router configured with Entra ID proxy');
    } catch (error) {
      throw new Error(`OAuth is configured but the MCP OAuth router failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
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

export interface HttpTransportOptions {
  /**
   * Optional pre-configured health service. Allows the caller (e.g. `program.ts`)
   * to inject bridge status / Azure validation probes before the server starts
   * accepting traffic. When omitted, a default health service is created.
   */
  healthService?: HealthCheckService;
}

export function startHttpTransport(httpServer: http.Server, mcpServer: Server, app: express.Express, options: HttpTransportOptions = {}) {
  const streamableSessions = new Map<string, StreamableSession>();
  const restToolSessions = new Map<string, RestToolSession>();
  const defaultRestSessionIds = new Map<string, string>();
  const healthService = options.healthService ?? createHealthCheckService();

  const authenticator = createUnifiedAuthenticator();

  let authInitializationError: Error | undefined;
  const authInitialization = authenticator.initialize().catch(error => {
    authInitializationError = error instanceof Error ? error : new Error(String(error));
    // eslint-disable-next-line no-console
    console.error('[Auth] Failed to initialize async auth providers:', authInitializationError);
  });

  const enforceAuthIfEnabled = async (req: express.Request, res: express.Response): Promise<boolean> => {
    await authInitialization;
    if (authInitializationError) {
      res.status(503).json({
        error: 'authentication_unavailable',
        message: 'Authentication providers failed to initialize.',
      });
      return false;
    }

    const result = await authenticator.authenticate(req);

    if (result.authenticated) {
      (req as any).auth = result;
      (req as any).user = result.user;
      return true;
    }

    res.status(401).json({
      error: 'unauthorized',
      message: result.error || 'Valid authentication required.',
      hint: 'Use Entra ID OAuth, VS Code tunnel, or Azure Managed Identity.',
    });
    return false;
  };

  const storageNamespaceForRequest = (req: express.Request): string => {
    const auth = (req as express.Request & { auth?: UnifiedAuthResult }).auth;
    if (!auth || auth.method === 'anonymous')
      return 'anonymous';

    if (auth.method === 'api-key') {
      const rawHeader = req.headers['x-api-key'];
      const apiKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
      if (apiKey)
        return `api-key:${crypto.createHash('sha256').update(apiKey).digest('hex')}`;
    }

    if (auth.user) {
      const principal = `${auth.method}\0${auth.user.tenantId}\0${auth.user.userId}`;
      return `principal:${crypto.createHash('sha256').update(principal).digest('hex')}`;
    }

    return `auth:${auth.method}`;
  };

  const closeRestSession = async (session: RestToolSession): Promise<void> => {
    restToolSessions.delete(session.id);
    if (defaultRestSessionIds.get(session.storageNamespace) === session.id)
      defaultRestSessionIds.delete(session.storageNamespace);
    await mcpServer.closeConnection(session.connection);
  };

  const cleanupExpiredRestSessions = async (): Promise<void> => {
    const now = Date.now();
    const timeoutMs = mcpServer.config.copilotStudio.sessionTimeoutMs ?? 1_800_000;
    const expired = Array.from(restToolSessions.values())
        .filter(session => now - session.lastUsedAt >= timeoutMs);
    await Promise.all(expired.map(closeRestSession));
  };

  const getRestToolSession = async (
    req: express.Request,
    res: express.Response,
    storageNamespace: string,
  ): Promise<RestToolSession | undefined> => {
    await cleanupExpiredRestSessions();
    const requestedHeader = req.headers['x-darbot-session-id'];
    const requestedId = Array.isArray(requestedHeader) ? requestedHeader[0] : requestedHeader;
    const defaultSessionId = defaultRestSessionIds.get(storageNamespace);
    let session = requestedId
      ? restToolSessions.get(requestedId)
      : defaultSessionId
        ? restToolSessions.get(defaultSessionId)
        : undefined;

    if (requestedId && !session) {
      res.status(404).json({
        error: 'session_not_found',
        message: 'The requested REST tool session does not exist or has expired.',
      });
      return undefined;
    }

    if (session && session.storageNamespace !== storageNamespace) {
      res.status(403).json({
        error: 'forbidden',
        message: 'This REST tool session belongs to a different authenticated principal.',
      });
      return undefined;
    }

    if (!session) {
      const activeSessionCount = streamableSessions.size + restToolSessions.size;
      const maxConcurrentSessions = mcpServer.config.copilotStudio.maxConcurrentSessions ?? 10;
      if (activeSessionCount >= maxConcurrentSessions) {
        res.status(429).json({
          error: 'session_limit_reached',
          message: 'The maximum number of concurrent browser sessions has been reached.',
        });
        return undefined;
      }

      const id = crypto.randomUUID();
      session = {
        id,
        storageNamespace,
        connection: mcpServer.createDetachedConnection({ storageNamespace }),
        lastUsedAt: Date.now(),
      };
      restToolSessions.set(id, session);
      defaultRestSessionIds.set(storageNamespace, id);
    }

    session.lastUsedAt = Date.now();
    res.setHeader('X-Darbot-Session-Id', session.id);
    return session;
  };

  app.all('/mcp', async (req, res) => {
    if (!(await enforceAuthIfEnabled(req, res)))
      return;
    await handleStreamable(
        mcpServer,
        req as http.IncomingMessage,
        res as http.ServerResponse,
        streamableSessions,
        storageNamespaceForRequest(req),
    );
  });

  app.get(['/health', '/api/v1/health'], healthService.handleHealthCheck);
  app.get(['/ready', '/api/v1/ready'], healthService.handleReadinessCheck);
  app.get(['/live', '/api/v1/live'], healthService.handleLivenessCheck);

  app.get(['/mcp/tools', '/api/v1/tools'], async (req, res) => {
    if (!(await enforceAuthIfEnabled(req, res)))
      return;
    const connection = mcpServer.createDetachedConnection({
      storageNamespace: storageNamespaceForRequest(req),
    });
    try {
      const tools = connection.context.tools.map(tool => ({
        name: tool.schema.name,
        title: tool.schema.title,
        description: tool.schema.description,
        inputSchema: z.toJSONSchema(tool.schema.inputSchema, { target: 'draft-7' }),
        annotations: {
          readOnlyHint: tool.schema.type === 'readOnly',
          destructiveHint: tool.schema.type === 'destructive',
        },
      }));
      res.status(200).json({ tools, count: tools.length });
    } finally {
      await mcpServer.closeConnection(connection);
    }
  });

  app.post('/api/v1/tools/:toolName', async (req, res) => {
    if (!(await enforceAuthIfEnabled(req, res)))
      return;
    const session = await getRestToolSession(req, res, storageNamespaceForRequest(req));
    if (!session)
      return;

    const tool = session.connection.context.tools.find(candidate => candidate.schema.name === req.params.toolName);
    if (!tool) {
      res.status(404).json({
        error: 'tool_not_found',
        message: `Tool "${req.params.toolName}" was not found.`,
      });
      return;
    }

    try {
      const result = await session.connection.context.run(tool, req.body ?? {});
      res.status(200).json({
        ...result,
        metadata: {
          sessionId: session.id,
          tool: tool.schema.name,
        },
      });
    } catch (error) {
      res.status(400).json({
        error: 'tool_execution_failed',
        message: error instanceof Error ? error.message : String(error),
        metadata: {
          sessionId: session.id,
          tool: tool.schema.name,
        },
      });
    }
  });

  // OpenAPI specification endpoints (JSON + YAML for Copilot Studio / Power Platform connectors).
  app.get(['/openapi.json', '/swagger.json', '/api/v1/openapi.json'], async (req, res) => {
    try {
      const { createOpenAPIGenerator } = await import('./openapi.js');
      const { allTools } = await import('./tools.js');
      const openApiGenerator = createOpenAPIGenerator(allTools);
      openApiGenerator.handleOpenAPISpec(req, res);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Failed to generate OpenAPI spec', message: errorMessage });
    }
  });

  app.get(['/openapi.yaml', '/swagger.yaml', '/api/v1/openapi.yaml'], async (req, res) => {
    try {
      const { createOpenAPIGenerator } = await import('./openapi.js');
      const { allTools } = await import('./tools.js');
      const openApiGenerator = createOpenAPIGenerator(allTools);
      openApiGenerator.handleOpenAPISpecYaml(req, res);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'Failed to generate OpenAPI YAML', message: errorMessage });
    }
  });

  // Log server info
  const url = httpAddressToString(httpServer.address());
  const message = [
    `Darbot Browser MCP Server listening on ${url}`,
    '',
    'Available endpoints:',
    `  Health Check: ${url}/health`,
    `  Readiness:    ${url}/ready`,
    `  Liveness:     ${url}/live`,
    `  OpenAPI:      ${url}/openapi.json (also: /openapi.yaml)`,
    `  REST Tools:   ${url}/api/v1/tools`,
    `  MCP:          ${url}/mcp`,
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
