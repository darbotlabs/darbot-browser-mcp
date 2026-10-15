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

export interface EndpointUrls {
  baseUrl: string;
  health: string;
  ready: string;
  live: string;
  mcp: string;
  restTools: string;
  openApi: string;
  powerPlatformBase: string;
}

const KNOWN_ENDPOINT_SUFFIXES = [
  '/api/v1/openapi.json',
  '/api/v1/openapi.yaml',
  '/api/v1/tools',
  '/api/v1/health',
  '/api/v1/ready',
  '/api/v1/live',
  '/api/v1',
  '/openapi.json',
  '/openapi.yaml',
  '/swagger.json',
  '/swagger.yaml',
  '/health',
  '/ready',
  '/live',
  '/mcp',
];

export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed)
    throw new Error('URL is required.');

  const url = new URL(trimmed);
  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    throw new Error('URL must use http or https.');
  if (url.username || url.password)
    throw new Error('URL must not include credentials.');
  if (url.search || url.hash)
    throw new Error('URL must not include a query string or fragment.');

  let path = url.pathname.replace(/\/+$/, '');
  const lowerPath = path.toLowerCase();
  for (const suffix of KNOWN_ENDPOINT_SUFFIXES) {
    if (lowerPath.endsWith(suffix)) {
      path = path.slice(0, path.length - suffix.length);
      break;
    }
  }

  url.pathname = path || '/';
  return url.toString().replace(/\/$/, '');
}

export function createEndpointUrls(baseUrl: string): EndpointUrls {
  const base = normalizeBaseUrl(baseUrl);
  return {
    baseUrl: base,
    health: `${base}/health`,
    ready: `${base}/ready`,
    live: `${base}/live`,
    mcp: `${base}/mcp`,
    restTools: `${base}/api/v1/tools`,
    openApi: `${base}/openapi.json`,
    powerPlatformBase: `${base}/api/v1`,
  };
}

export function createLocalBaseUrl(host: string, port: number): string {
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(`HTTP port must be an integer between 1 and 65535; received ${port}.`);

  let urlHost = host.trim();
  if (!urlHost)
    throw new Error('HTTP host is required.');
  if (urlHost === '0.0.0.0')
    urlHost = '127.0.0.1';
  else if (urlHost === '::' || urlHost === '[::]')
    urlHost = '::1';
  if (urlHost.includes(':') && !urlHost.startsWith('['))
    urlHost = `[${urlHost}]`;

  return `http://${urlHost}:${port}`;
}
