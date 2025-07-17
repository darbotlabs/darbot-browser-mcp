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

import { zodToJsonSchema } from 'zod-to-json-schema';
import { packageJSON } from './package.js';
import type { Tool } from './tools/tool.js';
import type { IncomingMessage, ServerResponse } from 'http';

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact?: {
      name: string;
      url: string;
      email: string;
    };
    license?: {
      name: string;
      url: string;
    };
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, any>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
  security: Array<Record<string, any>>;
  tags: Array<{
    name: string;
    description: string;
  }>;
}

/**
 * Generates OpenAPI specifications for MCP tools
 * Enables discovery and integration with Copilot Studio
 */
export class OpenAPIGenerator {
  private tools: Tool<any>[];
  private baseUrl: string;

  constructor(tools: Tool<any>[], baseUrl: string = '') {
    this.tools = tools;
    this.baseUrl = baseUrl;
  }

  /**
   * Generates complete OpenAPI specification
   */
  generateSpec(): OpenAPISpec {
    const paths = this.generatePaths();
    const schemas = this.generateSchemas();
    const tags = this.generateTags();

    return {
      openapi: '3.0.3',
      info: {
        title: 'Darbot Browser MCP API',
        description: 'Autonomous browser automation tools for Microsoft Copilot Studio integration. Provides 29+ AI-driven browser capabilities including navigation, interaction, testing, and work profile management.',
        version: packageJSON.version,
        contact: {
          name: 'Darbot Labs',
          url: 'https://github.com/darbotlabs/darbot-browser-mcp',
          email: 'support@darbotlabs.com'
        },
        license: {
          name: 'Apache 2.0',
          url: 'https://www.apache.org/licenses/LICENSE-2.0'
        }
      },
      servers: [
        {
          url: this.baseUrl || '{protocol}://{host}:{port}',
          description: 'Darbot Browser MCP Server'
        }
      ],
      paths,
      components: {
        schemas,
        securitySchemes: {
          EntraID: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Microsoft Entra ID (Azure AD) authentication'
          },
          ApiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API Key authentication for service-to-service calls'
          }
        }
      },
      security: [
        { EntraID: [] },
        { ApiKey: [] }
      ],
      tags
    };
  }

  /**
   * HTTP handler for OpenAPI specification endpoint
   */
  handleOpenAPISpec(req: IncomingMessage, res: ServerResponse) {
    try {
      const spec = this.generateSpec();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.end(JSON.stringify(spec, null, 2));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Failed to generate OpenAPI specification',
        message: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }

  private generatePaths(): Record<string, any> {
    const paths: Record<string, any> = {};

    // Add health endpoints
    paths['/health'] = {
      get: {
        summary: 'Health Check',
        description: 'Returns the health status of the service',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthStatus'
                }
              }
            }
          },
          '503': {
            description: 'Service is unhealthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthStatus'
                }
              }
            }
          }
        }
      }
    };

    paths['/ready'] = {
      get: {
        summary: 'Readiness Check',
        description: 'Returns readiness status for load balancer',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service is ready',
            content: {
              'text/plain': {
                schema: { type: 'string', example: 'OK' }
              }
            }
          }
        }
      }
    };

    // Add MCP endpoints
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
                    tools: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Tool'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    // Add tool-specific endpoints
    for (const tool of this.tools) {
      const toolPath = `/api/v1/tools/${tool.schema.name}`;
      paths[toolPath] = {
        post: {
          summary: tool.schema.title || tool.schema.name,
          description: tool.schema.description,
          tags: [this.getToolCategory(tool)],
          operationId: `execute_${tool.schema.name}`,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: zodToJsonSchema(tool.schema.inputSchema, {
                  name: `${tool.schema.name}Input`,
                  $refStrategy: 'none'
                })
              }
            }
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
                      metadata: { type: 'object' }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Invalid request parameters',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            },
            '401': {
              description: 'Authentication required'
            },
            '500': {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      };
    }

    return paths;
  }

  private generateSchemas(): Record<string, any> {
    const schemas: Record<string, any> = {};

    // Common schemas
    schemas.Error = {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
        details: { type: 'object' }
      },
      required: ['error', 'message']
    };

    schemas.HealthStatus = {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['healthy', 'degraded', 'unhealthy']
        },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string' },
        checks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              status: {
                type: 'string',
                enum: ['pass', 'warn', 'fail']
              },
              duration: { type: 'number' },
              details: { type: 'object' }
            }
          }
        }
      }
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
            destructiveHint: { type: 'boolean' }
          }
        }
      }
    };

    // Add tool-specific schemas
    for (const tool of this.tools) {
      const schemaName = `${tool.schema.name}Input`;
      schemas[schemaName] = zodToJsonSchema(tool.schema.inputSchema, {
        name: schemaName,
        $refStrategy: 'none'
      });
    }

    return schemas;
  }

  private generateTags(): Array<{ name: string; description: string }> {
    const categories = new Set<string>();
    
    for (const tool of this.tools) {
      categories.add(this.getToolCategory(tool));
    }

    const tags = [
      { name: 'Health', description: 'Health check and monitoring endpoints' },
      { name: 'MCP', description: 'Model Context Protocol endpoints' }
    ];

    for (const category of categories) {
      tags.push({
        name: category,
        description: this.getCategoryDescription(category)
      });
    }

    return tags;
  }

  private getToolCategory(tool: Tool<any>): string {
    // Categorize tools based on their names
    const name = tool.schema.name.toLowerCase();
    
    if (name.includes('navigate') || name.includes('goto') || name.includes('url')) {
      return 'Navigation';
    }
    if (name.includes('click') || name.includes('type') || name.includes('drag') || name.includes('hover')) {
      return 'Interaction';
    }
    if (name.includes('screenshot') || name.includes('snapshot') || name.includes('pdf')) {
      return 'Capture';
    }
    if (name.includes('tab') || name.includes('window')) {
      return 'Tabs';
    }
    if (name.includes('profile') || name.includes('session')) {
      return 'Profiles';
    }
    if (name.includes('wait') || name.includes('expect')) {
      return 'Wait';
    }
    if (name.includes('test') || name.includes('assert')) {
      return 'Testing';
    }
    if (name.includes('network') || name.includes('request')) {
      return 'Network';
    }
    if (name.includes('console') || name.includes('log')) {
      return 'Console';
    }
    if (name.includes('file') || name.includes('upload') || name.includes('download')) {
      return 'Files';
    }
    
    return 'General';
  }

  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'Navigation': 'Page navigation and URL manipulation tools',
      'Interaction': 'Page interaction tools (clicks, typing, drag & drop)',
      'Capture': 'Screenshot, snapshot, and PDF generation tools',
      'Tabs': 'Browser tab and window management tools',
      'Profiles': 'Work profile and session management tools',
      'Wait': 'Waiting and synchronization tools',
      'Testing': 'Testing and assertion tools',
      'Network': 'Network monitoring and request tools',
      'Console': 'Browser console and logging tools',
      'Files': 'File upload, download, and management tools',
      'General': 'General browser automation tools'
    };

    return descriptions[category] || 'Browser automation tools';
  }
}

/**
 * Creates an OpenAPI generator for the given tools
 */
export function createOpenAPIGenerator(tools: Tool<any>[], baseUrl?: string): OpenAPIGenerator {
  return new OpenAPIGenerator(tools, baseUrl);
}