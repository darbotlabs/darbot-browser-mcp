/**
 * Copyright (c) Microsoft Corporation.
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

import debug from 'debug';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import type { AddressInfo } from 'node:net';
import type { Server } from './server.js';

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

export async function startHttpServer(config: { host?: string, port?: number }): Promise<http.Server> {
  const { host, port } = config;
  const httpServer = http.createServer();
  await new Promise<void>((resolve, reject) => {
    httpServer.on('error', reject);
    httpServer.listen(port, host, () => {
      resolve();
      httpServer.removeListener('error', reject);
    });
  });
  return httpServer;
}

export function startHttpTransport(httpServer: http.Server, mcpServer: Server) {
  const sseSessions = new Map<string, SSEServerTransport>();
  const streamableSessions = new Map<string, StreamableHTTPServerTransport>();

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
      // TODO: Add authentication middleware here when needed
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
          'url': `${url}/sse`
        }
      }
    }, undefined, 2),
    '',
    'Copilot Studio integration ready! 🚀',
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
