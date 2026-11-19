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

import { z } from 'zod';
import { defineTool } from './tool.js';
import { outputFile } from '../config.js';

/**
 * Storage state tools - IndexedDB support from Playwright 1.51+
 * Allows saving and restoring browser state including:
 * - Cookies
 * - Local storage
 * - IndexedDB (for apps like Firebase Auth)
 */

const saveStorageState = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_save_storage_state',
    title: 'Autonomous storage state saving',
    description: 'Autonomously save browser storage state (cookies, localStorage, and optionally IndexedDB) to a file. Useful for persisting authentication and session state.',
    inputSchema: z.object({
      filename: z.string().optional().describe('File name to save storage state to. Defaults to storage-state-{timestamp}.json'),
      includeIndexedDB: z.boolean().optional().default(false).describe('Whether to include IndexedDB contents (useful for Firebase Auth and similar apps)'),
    }),
    type: 'readOnly',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const browserContext = tab.page.context();
    const fileName = await outputFile(context.config, params.filename ?? `storage-state-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

    const code = [
      `// Save storage state${params.includeIndexedDB ? ' (including IndexedDB)' : ''} to ${fileName}`,
      `await context.storageState({ path: '${fileName}'${params.includeIndexedDB ? ', indexedDB: true' : ''} });`,
    ];

    const action = async () => {
      const options: any = { path: fileName };
      if (params.includeIndexedDB) {
        options.indexedDB = true;
      }
      await browserContext.storageState(options);
      return {
        content: [{ type: 'text' as const, text: `Storage state saved to: ${fileName}` }]
      };
    };

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

/**
 * Get cookies with filtering
 */
const getCookies = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_get_cookies',
    title: 'Autonomous cookie retrieval',
    description: 'Autonomously retrieve browser cookies, optionally filtered by URL or domain.',
    inputSchema: z.object({
      urls: z.array(z.string()).optional().describe('URLs to get cookies for. If not specified, returns all cookies.'),
    }),
    type: 'readOnly',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const browserContext = tab.page.context();

    const code = params.urls 
      ? [
          `// Get cookies for specified URLs`,
          `const cookies = await context.cookies(${JSON.stringify(params.urls)});`,
        ]
      : [
          `// Get all cookies`,
          `const cookies = await context.cookies();`,
        ];

    const action = async () => {
      const cookies = params.urls 
        ? await browserContext.cookies(params.urls)
        : await browserContext.cookies();
      
      if (cookies.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No cookies found.' }]
        };
      }

      const output = cookies.map(cookie => {
        return [
          `🍪 ${cookie.name}`,
          `   Value: ${cookie.value.substring(0, 50)}${cookie.value.length > 50 ? '...' : ''}`,
          `   Domain: ${cookie.domain}`,
          `   Path: ${cookie.path}`,
          `   Expires: ${cookie.expires === -1 ? 'Session' : new Date(cookie.expires * 1000).toISOString()}`,
          `   Secure: ${cookie.secure}, HttpOnly: ${cookie.httpOnly}`,
        ].join('\n');
      }).join('\n\n');

      return {
        content: [{ type: 'text' as const, text: `Found ${cookies.length} cookies:\n\n${output}` }]
      };
    };

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

/**
 * Set cookies
 */
const setCookie = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_set_cookie',
    title: 'Autonomous cookie setting',
    description: 'Autonomously set a browser cookie.',
    inputSchema: z.object({
      name: z.string().describe('Cookie name'),
      value: z.string().describe('Cookie value'),
      url: z.string().optional().describe('URL to associate the cookie with (either url or domain+path required)'),
      domain: z.string().optional().describe('Cookie domain'),
      path: z.string().optional().default('/').describe('Cookie path'),
      expires: z.number().optional().describe('Unix timestamp when the cookie expires'),
      httpOnly: z.boolean().optional().default(false).describe('Whether the cookie is HTTP-only'),
      secure: z.boolean().optional().default(false).describe('Whether the cookie requires HTTPS'),
      sameSite: z.enum(['Strict', 'Lax', 'None']).optional().describe('SameSite attribute'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const browserContext = tab.page.context();

    const cookie: any = {
      name: params.name,
      value: params.value,
    };
    
    if (params.url) cookie.url = params.url;
    if (params.domain) cookie.domain = params.domain;
    if (params.path) cookie.path = params.path;
    if (params.expires) cookie.expires = params.expires;
    if (params.httpOnly) cookie.httpOnly = params.httpOnly;
    if (params.secure) cookie.secure = params.secure;
    if (params.sameSite) cookie.sameSite = params.sameSite;

    const code = [
      `// Set cookie: ${params.name}`,
      `await context.addCookies([${JSON.stringify(cookie)}]);`,
    ];

    const action = async () => {
      await browserContext.addCookies([cookie]);
      return {
        content: [{ type: 'text' as const, text: `Cookie '${params.name}' has been set.` }]
      };
    };

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

/**
 * Clear cookies with optional filtering
 */
const clearCookies = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_clear_cookies',
    title: 'Autonomous cookie clearing',
    description: 'Autonomously clear browser cookies, optionally filtered by name, domain, or path.',
    inputSchema: z.object({
      name: z.string().optional().describe('Only clear cookies with this name'),
      domain: z.string().optional().describe('Only clear cookies for this domain'),
      path: z.string().optional().describe('Only clear cookies with this path'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const browserContext = tab.page.context();

    const hasFilter = params.name || params.domain || params.path;
    const filterDesc = hasFilter 
      ? `(${[
          params.name ? `name: ${params.name}` : '',
          params.domain ? `domain: ${params.domain}` : '',
          params.path ? `path: ${params.path}` : '',
        ].filter(Boolean).join(', ')})`
      : '(all)';

    const code = [
      `// Clear cookies ${filterDesc}`,
      `await context.clearCookies(${hasFilter ? JSON.stringify(params) : ''});`,
    ];

    const action = async () => {
      if (hasFilter) {
        await browserContext.clearCookies(params as any);
      } else {
        await browserContext.clearCookies();
      }
      return {
        content: [{ type: 'text' as const, text: `Cookies cleared ${filterDesc}` }]
      };
    };

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

/**
 * Local storage operations
 */
const getLocalStorage = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_get_local_storage',
    title: 'Autonomous localStorage retrieval',
    description: 'Autonomously retrieve all localStorage items for the current page.',
    inputSchema: z.object({}),
    type: 'readOnly',
  },

  handle: async context => {
    const tab = context.currentTabOrDie();

    const code = [
      `// Get all localStorage items`,
      `const storage = await page.evaluate(() => JSON.stringify(localStorage));`,
    ];

    const action = async () => {
      const storage = await tab.page.evaluate(() => {
        const items: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            items[key] = localStorage.getItem(key) || '';
          }
        }
        return items;
      });

      const keys = Object.keys(storage);
      if (keys.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'localStorage is empty.' }]
        };
      }

      const output = keys.map(key => {
        const value = storage[key];
        const displayValue = value.length > 100 ? value.substring(0, 100) + '...' : value;
        return `${key}\n   ${displayValue}`;
      }).join('\n\n');

      return {
        content: [{ type: 'text' as const, text: `Found ${keys.length} localStorage items:\n\n${output}` }]
      };
    };

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

/**
 * Set localStorage item
 */
const setLocalStorage = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_set_local_storage',
    title: 'Autonomous localStorage setting',
    description: 'Autonomously set a localStorage item for the current page.',
    inputSchema: z.object({
      key: z.string().describe('Storage key'),
      value: z.string().describe('Storage value'),
    }),
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();

    const code = [
      `// Set localStorage item: ${params.key}`,
      `await page.evaluate(([key, value]) => localStorage.setItem(key, value), [${JSON.stringify(params.key)}, ${JSON.stringify(params.value)}]);`,
    ];

    const action = async () => {
      await tab.page.evaluate(([key, value]) => {
        localStorage.setItem(key, value);
      }, [params.key, params.value]);
      return {
        content: [{ type: 'text' as const, text: `localStorage['${params.key}'] has been set.` }]
      };
    };

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

export default [
  saveStorageState,
  getCookies,
  setCookie,
  clearCookies,
  getLocalStorage,
  setLocalStorage,
];
