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

import debug from 'debug';
import { z } from 'zod';

import { packageJSON } from './package.js';

import type { Request, Response } from 'express';
import type { Tool } from './tools/tool.js';

const openapiDebug = debug('pw:mcp:openapi');

/**
 * JSON-compatible value tree. The OpenAPI document is intentionally loose
 * because the spec accepts a wide range of extension fields.
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue | undefined };

export interface OpenAPIInfo {
  title: string;
  description: string;
  version: string;
  contact?: { name: string; url: string; email: string };
  license?: { name: string; url: string };
}

export interface OpenAPISpec {
  openapi: string;
  info: OpenAPIInfo;
  servers: Array<{ url: string; description: string }>;
  paths: Record<string, JsonValue>;
  components: {
    schemas: Record<string, JsonValue>;
    securitySchemes: Record<string, JsonValue>;
  };
  security: Array<Record<string, string[]>>;
  tags: Array<{ name: string; description: string }>;
}

const TOOL_CATEGORIES: Array<{ name: string; description: string; matchers: RegExp[] }> = [
  { name: 'Navigation', description: 'Page navigation and URL manipulation tools', matchers: [/navigate/, /goto/, /url/] },
  { name: 'Interaction', description: 'Page interaction tools (clicks, typing, drag & drop)', matchers: [/click/, /type/, /drag/, /hover/] },
  { name: 'Capture', description: 'Screenshot, snapshot, and PDF generation tools', matchers: [/screenshot/, /snapshot/, /pdf/] },
  { name: 'Tabs', description: 'Browser tab and window management tools', matchers: [/tab/, /window/] },
  { name: 'Profiles', description: 'Work profile and session management tools', matchers: [/profile/, /session/] },
  { name: 'Wait', description: 'Waiting and synchronization tools', matchers: [/wait/, /expect/] },
  { name: 'Testing', description: 'Testing and assertion tools', matchers: [/\btest\b/, /assert/] },
  { name: 'Network', description: 'Network monitoring and request tools', matchers: [/network/, /request/] },
  { name: 'Console', description: 'Browser console and logging tools', matchers: [/console/, /\blog\b/] },
  { name: 'Files', description: 'File upload, download, and management tools', matchers: [/\bfile\b/, /upload/, /download/] },
];
const FALLBACK_CATEGORY = 'General';
const FALLBACK_CATEGORY_DESCRIPTION = 'General browser automation tools';

/**
 * Generates OpenAPI 3.0.3 specifications for the MCP tool surface so that
 * Microsoft Copilot Studio, Power Platform connectors and other consumers
 * can auto-discover and call the tools as REST endpoints.
 */
export class OpenAPIGenerator {
  private readonly _tools: Tool[];
  private readonly _baseUrl: string;

  constructor(tools: Tool[], baseUrl: string = '') {
    this._tools = tools;
    this._baseUrl = baseUrl;
  }

  /**
   * Build the full OpenAPI specification. Description and tag counts are
   * derived from the live tool list so the document never drifts from the
   * runtime surface.
   */
  generateSpec(): OpenAPISpec {
    return {
      openapi: '3.0.3',
      info: {
        title: 'Darbot Browser MCP API',
        description: `Autonomous browser automation tools for Microsoft Copilot Studio integration. ` +
          `Provides ${this._tools.length} AI-driven browser capabilities including navigation, ` +
          `interaction, testing, and work profile management.`,
        version: packageJSON.version,
        contact: {
          name: 'Darbot Labs',
          url: 'https://github.com/darbotlabs/darbot-browser-mcp',
          email: 'support@darbotlabs.com',
        },
        license: {
          name: 'Apache 2.0',
          url: 'https://www.apache.org/licenses/LICENSE-2.0',
        },
      },
      servers: [{
        url: this._baseUrl || '{protocol}://{host}:{port}',
        description: 'Darbot Browser MCP Server',
      }],
      paths: this._generatePaths(),
      components: {
        schemas: this._generateSchemas(),
        securitySchemes: {
          EntraID: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Microsoft Entra ID (Azure AD) authentication',
          },
          ApiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API Key authentication for service-to-service calls',
          },
        },
      },
      security: [
        { EntraID: [] },
        { ApiKey: [] },
      ],
      tags: this._generateTags(),
    };
  }

  /** Express handler that serves the OpenAPI spec as JSON. */
  handleOpenAPISpec = (_req: Request, res: Response): void => {
    try {
      const spec = this.generateSpec();
      res.status(200)
          .set('Content-Type', 'application/json')
          .set('Access-Control-Allow-Origin', '*')
          .set('Cache-Control', 'public, max-age=3600')
          .send(JSON.stringify(spec, null, 2));
    } catch (error) {
      openapiDebug('handleOpenAPISpec failed: %O', error);
      res.status(500).json({
        error: 'Failed to generate OpenAPI specification',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /** Express handler that serves the OpenAPI spec as YAML. */
  handleOpenAPISpecYaml = (_req: Request, res: Response): void => {
    try {
      const spec = this.generateSpec();
      const yaml = jsonToYaml(spec as unknown as JsonValue);
      res.status(200)
          .set('Content-Type', 'application/yaml; charset=utf-8')
          .set('Access-Control-Allow-Origin', '*')
          .set('Cache-Control', 'public, max-age=3600')
          .send(yaml);
    } catch (error) {
      openapiDebug('handleOpenAPISpecYaml failed: %O', error);
      res.status(500).json({
        error: 'Failed to generate OpenAPI YAML',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  private _generatePaths(): Record<string, JsonValue> {
    const paths: Record<string, JsonValue> = {};

    paths['/health'] = {
      get: {
        summary: 'Health Check',
        description: 'Returns the health status of the service',
        tags: ['Health'],
        responses: {
          '200': healthResponse('Service is healthy'),
          '503': healthResponse('Service is unhealthy'),
        },
      },
    };

    paths['/ready'] = {
      get: {
        summary: 'Readiness Check',
        description: 'Returns readiness status for the load balancer',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service is ready',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ReadinessStatus' } } },
          },
          '503': {
            description: 'Service is not ready',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ReadinessStatus' } } },
          },
        },
      },
    };

    paths['/live'] = {
      get: {
        summary: 'Liveness Check',
        description: 'Returns process liveness — used by container orchestrators',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Process is alive',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    };

    paths['/openapi.json'] = {
      get: {
        summary: 'OpenAPI specification (JSON)',
        description: 'Returns the OpenAPI 3.0.3 specification for this server.',
        tags: ['Discovery'],
        responses: {
          '200': {
            description: 'OpenAPI document',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    };

    paths['/openapi.yaml'] = {
      get: {
        summary: 'OpenAPI specification (YAML)',
        description: 'Returns the OpenAPI 3.0.3 specification for this server in YAML.',
        tags: ['Discovery'],
        responses: {
          '200': {
            description: 'OpenAPI document',
            content: { 'application/yaml': { schema: { type: 'string' } } },
          },
        },
      },
    };

    paths['/mcp/tools'] = {
      get: {
        summary: 'List Available Tools',
        description: 'Returns a list of all available browser automation tools',
        tags: ['MCP'],
        responses: {
          '200': {
            description: 'List of tools',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tools: { type: 'array', items: { $ref: '#/components/schemas/Tool' } },
                  },
                },
              },
            },
          },
        },
      },
    };

    for (const tool of this._tools) {
      const toolPath = `/api/v1/tools/${tool.schema.name}`;
      paths[toolPath] = {
        post: {
          summary: tool.schema.title || tool.schema.name,
          description: tool.schema.description,
          tags: [getToolCategory(tool)],
          operationId: `execute_${tool.schema.name}`,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: z.toJSONSchema(tool.schema.inputSchema, {
                  target: 'draft-7',
                }) as JsonValue,
              },
            },
          },
          responses: {
            '200': {
              description: 'Tool executed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      result: { type: 'object' },
                      metadata: { type: 'object' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request parameters',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
            },
            '401': { description: 'Authentication required' },
            '500': {
              description: 'Internal server error',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
            },
          },
        },
      };
    }

    return paths;
  }

  private _generateSchemas(): Record<string, JsonValue> {
    const schemas: Record<string, JsonValue> = {};

    schemas.Error = {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
        details: { type: 'object' },
      },
      required: ['error', 'message'],
    };

    schemas.HealthStatus = {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string' },
        uptimeSeconds: { type: 'integer' },
        checks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              status: { type: 'string', enum: ['pass', 'warn', 'fail'] },
              duration: { type: 'number' },
              details: { type: 'object' },
            },
          },
        },
      },
    };

    schemas.ReadinessStatus = {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ready', 'not_ready'] },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string' },
        checks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              status: { type: 'string', enum: ['pass', 'warn', 'fail'] },
            },
          },
        },
      },
    };

    schemas.Tool = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        inputSchema: { type: 'object' },
        annotations: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            readOnlyHint: { type: 'boolean' },
            destructiveHint: { type: 'boolean' },
          },
        },
      },
    };

    for (const tool of this._tools) {
      const schemaName = `${tool.schema.name}Input`;
      schemas[schemaName] = z.toJSONSchema(tool.schema.inputSchema, {
        target: 'draft-7',
      }) as JsonValue;
    }

    return schemas;
  }

  private _generateTags(): Array<{ name: string; description: string }> {
    const categories = new Set<string>();
    for (const tool of this._tools)
      categories.add(getToolCategory(tool));

    const tags: Array<{ name: string; description: string }> = [
      { name: 'Health', description: 'Health check and monitoring endpoints' },
      { name: 'Discovery', description: 'OpenAPI / capability discovery endpoints' },
      { name: 'MCP', description: 'Model Context Protocol endpoints' },
    ];
    for (const category of categories)
      tags.push({ name: category, description: getCategoryDescription(category) });

    return tags;
  }
}

function healthResponse(description: string): JsonValue {
  return {
    description,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthStatus' } } },
  };
}

function getToolCategory(tool: Tool): string {
  const name = tool.schema.name.toLowerCase();
  for (const category of TOOL_CATEGORIES) {
    if (category.matchers.some(rx => rx.test(name)))
      return category.name;
  }
  return FALLBACK_CATEGORY;
}

function getCategoryDescription(category: string): string {
  const known = TOOL_CATEGORIES.find(c => c.name === category);
  return known?.description ?? FALLBACK_CATEGORY_DESCRIPTION;
}

/**
 * Create an OpenAPI generator for the given tools.
 */
export function createOpenAPIGenerator(tools: Tool[], baseUrl?: string): OpenAPIGenerator {
  return new OpenAPIGenerator(tools, baseUrl);
}

/**
 * Minimal JSON-to-YAML serializer scoped to the shape of an OpenAPI document.
 *
 * Supports the value subset OpenAPI uses: strings, numbers, booleans, null,
 * arrays and objects. Strings are quoted whenever they contain characters
 * that would otherwise produce an ambiguous YAML scalar.
 */
function jsonToYaml(value: JsonValue, indent: number = 0): string {
  if (value === null)
    return 'null';

  const pad = '  '.repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0)
      return '[]';
    return value.map(item => {
      if (isContainer(item))
        return `${pad}-\n${jsonToYaml(item, indent + 1)}`;
      return `${pad}- ${formatScalar(item)}`;
    }).join('\n');
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined) as Array<[string, JsonValue]>;
    if (entries.length === 0)
      return '{}';
    return entries.map(([key, v]) => {
      const safeKey = needsQuoting(key) ? `"${escapeYamlString(key)}"` : key;
      if (isContainer(v))
        return `${pad}${safeKey}:\n${jsonToYaml(v, indent + 1)}`;
      return `${pad}${safeKey}: ${formatScalar(v)}`;
    }).join('\n');
  }

  return formatScalar(value);
}

function isContainer(value: JsonValue | undefined): boolean {
  return Array.isArray(value) || (typeof value === 'object' && value !== null);
}

function formatScalar(value: JsonValue): string {
  if (value === null)
    return 'null';
  if (typeof value === 'boolean')
    return value ? 'true' : 'false';
  if (typeof value === 'number')
    return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'string')
    return needsQuoting(value) ? `"${escapeYamlString(value)}"` : value;
  return JSON.stringify(value);
}

function needsQuoting(value: string): boolean {
  if (value.length === 0)
    return true;
  // Reserved boolean / null literals
  if (/^(true|false|null|yes|no|on|off|~)$/i.test(value))
    return true;
  // Numbers / special floats / dates
  if (/^[-+]?\d/.test(value))
    return true;
  // Anything containing YAML-significant punctuation, whitespace edges, or non-printables
  if (/[:#&*!|>'"%@`{}[\],?\\]/.test(value))
    return true;
  if (/^\s|\s$/.test(value))
    return true;
  // eslint-disable-next-line no-control-regex -- intentionally matches C0 control characters to flag non-printable YAML values
  if (/[\x00-\x1f]/.test(value))
    return true;
  return false;
}

function escapeYamlString(value: string): string {
  return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
}
