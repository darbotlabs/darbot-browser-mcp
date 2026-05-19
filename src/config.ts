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

import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';

import debug from 'debug';
import { devices } from 'playwright';

import type { Config as PublicConfig, ToolCapability } from '../config.js';
import type { BrowserContextOptions, LaunchOptions } from 'playwright';
import { sanitizeForFilePath } from './tools/utils.js';

const configDebug = debug('pw:mcp:config');
const bridgeDebug = debug('pw:mcp:bridge');

type Config = PublicConfig & {
  /**
   * TODO: Move to PublicConfig once we are ready to release this feature.
   * Run server that is able to connect to the 'Darbot Browser MCP' Chrome extension.
   */
  extension?: boolean;
};

export type CLIOptions = {
  allowedOrigins?: string[];
  blockedOrigins?: string[];
  blockServiceWorkers?: boolean;
  browser?: string;
  browserAgent?: string;
  caps?: string;
  cdpEndpoint?: string;
  config?: string;
  device?: string;
  executablePath?: string;
  headless?: boolean;
  host?: string;
  ignoreHttpsErrors?: boolean;
  isolated?: boolean;
  imageResponses?: 'allow' | 'omit' | 'auto';
  sandbox: boolean;
  outputDir?: string;
  port?: number;
  proxyBypass?: string;
  proxyServer?: string;
  saveTrace?: boolean;
  storageState?: string;
  userAgent?: string;
  userDataDir?: string;
  viewportSize?: string;
  vision?: boolean;
  extension?: boolean;
  // Edge profile preference options
  edgeProfile?: string;
  edgeProfileEmail?: string;
  workspace?: string;
  autoSignIn?: boolean;
  profileSwitching?: boolean;
  intranetSwitch?: boolean;
  ieModeSwitch?: boolean;
  defaultProfile?: string;
};

const defaultConfig: FullConfig = {
  browser: {
    browserName: 'chromium',
    launchOptions: {
      channel: 'msedge',
      headless: os.platform() === 'linux' && !process.env.DISPLAY,
      chromiumSandbox: true,
      args: [
        '--disable-popup-blocking',
        '--allow-popups',
        '--disable-extensions', // Disable all extensions to prevent manifest errors
      ],
    },
    contextOptions: {
      viewport: null,
    },
  },
  network: {},
  server: {
    ...(process.env.SERVER_BASE_URL !== undefined && { baseUrl: process.env.SERVER_BASE_URL }),
    https: {
      enabled: false
    },
    rateLimit: {
      enabled: false,
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100
    }
  },
  copilotStudio: {
    enabled: process.env.COPILOT_STUDIO_ENABLED === 'true',
    ...(process.env.COPILOT_STUDIO_CALLBACK_URL !== undefined && { callbackUrl: process.env.COPILOT_STUDIO_CALLBACK_URL }),
    maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '10', 10),
    sessionTimeoutMs: parseInt(process.env.SESSION_TIMEOUT_MS || '1800000', 10), // 30 minutes
    auditLogging: process.env.AUDIT_LOGGING_ENABLED === 'true'
  },
  auth: {
    entraId: {
      enabled: process.env.ENTRA_AUTH_ENABLED === 'true',
      ...(process.env.AZURE_TENANT_ID !== undefined && { tenantId: process.env.AZURE_TENANT_ID }),
      ...(process.env.AZURE_CLIENT_ID !== undefined && { clientId: process.env.AZURE_CLIENT_ID }),
      ...(process.env.AZURE_CLIENT_SECRET !== undefined && { clientSecret: process.env.AZURE_CLIENT_SECRET })
    },
    apiKey: {
      enabled: process.env.API_KEY_AUTH_ENABLED === 'true',
      keys: process.env.API_KEYS?.split(',') || []
    }
  },
  outputDir: path.join(os.tmpdir(), 'darbot-browser-mcp-output', sanitizeForFilePath(new Date().toISOString())),
};

type BrowserUserConfig = NonNullable<Config['browser']>;

export type FullConfig = Config & {
  browser: Omit<BrowserUserConfig, 'browserName'> & {
    browserName: 'chromium' | 'firefox' | 'webkit';
    launchOptions: NonNullable<BrowserUserConfig['launchOptions']>;
    contextOptions: NonNullable<BrowserUserConfig['contextOptions']>;
  },
  network: NonNullable<Config['network']>,
  outputDir: string;
  server: NonNullable<Config['server']> & {
    https: NonNullable<NonNullable<Config['server']>['https']>;
    rateLimit: NonNullable<NonNullable<Config['server']>['rateLimit']>;
  };
  copilotStudio: NonNullable<Config['copilotStudio']>;
  auth: NonNullable<Config['auth']> & {
    entraId: NonNullable<NonNullable<Config['auth']>['entraId']>;
    apiKey: NonNullable<NonNullable<Config['auth']>['apiKey']>;
  };
};

/**
 * Merge a partial `Config` over the defaults. Used by callers that already
 * have a fully-formed override object (e.g. programmatic embedding).
 */
export async function resolveConfig(config: Config): Promise<FullConfig> {
  return mergeConfig(defaultConfig, config);
}

/**
 * Well-known ports for the Darbot Browser Bridge. The first responsive port
 * that reports an attached extension is used.
 */
const BRIDGE_PORTS = [9223, 9224, 9225] as const;

/**
 * Hard timeout (ms) for each bridge probe. Kept short so a cold startup does
 * not stall MCP server boot for users without the bridge installed.
 */
const BRIDGE_PROBE_TIMEOUT_MS = 1000;

/** Bridge status payload as returned by the `/bridge` endpoint. */
interface BridgeStatusResponse {
  bridge: string;
  version: string;
  extensionConnected: boolean;
  mcpConnected: boolean;
  targetInfo: {
    url: string;
    title: string;
    type: string;
  } | null;
  sessionId: string | null;
  extensionVersion: string | null;
}

/** Result of a successful bridge auto-detection. */
interface DetectedBridge {
  bridgeUrl: string;
  cdpEndpoint: string;
  targetInfo: BridgeStatusResponse['targetInfo'];
}

/**
 * Probe well-known local ports for a running Darbot Browser Bridge with an
 * attached extension. When found, callers can connect via CDP without
 * requiring the `--extension` flag.
 *
 * Returns `null` on no detection — never throws.
 */
async function detectBridge(): Promise<DetectedBridge | null> {
  for (const port of BRIDGE_PORTS) {
    try {
      const status = await fetchBridgeStatus(port);
      if (status?.extensionConnected && status.targetInfo) {
        return {
          bridgeUrl: `http://localhost:${port}`,
          cdpEndpoint: `ws://localhost:${port}/cdp`,
          targetInfo: status.targetInfo,
        };
      }
    } catch (error) {
      bridgeDebug('probe of port %d threw: %O', port, error);
    }
  }
  return null;
}

/**
 * GET `/bridge` on `localhost:<port>` with a strict timeout. Resolves to the
 * parsed status payload or `null` for any kind of failure (no server,
 * timeout, non-JSON response).
 */
function fetchBridgeStatus(port: number): Promise<BridgeStatusResponse | null> {
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      req.destroy();
      resolve(null);
    }, BRIDGE_PROBE_TIMEOUT_MS);

    const req = http.request({
      hostname: 'localhost',
      port,
      path: '/bridge',
      method: 'GET',
      timeout: BRIDGE_PROBE_TIMEOUT_MS,
    }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          resolve(JSON.parse(data) as BridgeStatusResponse);
        } catch (error) {
          bridgeDebug('failed to parse /bridge response from port %d: %O', port, error);
          resolve(null);
        }
      });
      res.on('error', error => {
        clearTimeout(timeout);
        bridgeDebug('response error from port %d: %O', port, error);
        resolve(null);
      });
    });

    req.on('error', error => {
      clearTimeout(timeout);
      bridgeDebug('request error on port %d: %O', port, error);
      resolve(null);
    });

    req.on('timeout', () => {
      req.destroy();
      clearTimeout(timeout);
      resolve(null);
    });

    req.end();
  });
}

/**
 * Resolve the merged runtime configuration from CLI options, a config file
 * (when supplied) and the default config. Performs bridge auto-detection
 * when no CDP endpoint is supplied and extension mode is off.
 */
export async function resolveCLIConfig(cliOptions: CLIOptions): Promise<FullConfig> {
  const configInFile = await loadConfig(cliOptions.config);
  const cliOverrides = await configFromCLIOptions(cliOptions);
  const result = mergeConfig(mergeConfig(defaultConfig, configInFile), cliOverrides);

  // Auto-detect bridge so MCP clients can attach to a shared browser tab
  // without explicit configuration.
  if (!result.browser.cdpEndpoint && !result.extension) {
    const bridge = await detectBridge();
    if (bridge) {
      configDebug('Darbot Bridge detected at %s', bridge.bridgeUrl);
      configDebug('  connected tab: %s', bridge.targetInfo?.title || 'Unknown');
      configDebug('  url:           %s', bridge.targetInfo?.url || 'Unknown');
      result.browser.cdpEndpoint = bridge.cdpEndpoint;
      result.browser.browserName = 'chromium'; // CDP requires chromium
    }
  }

  // Derive artifact output directory from config.outputDir
  if (result.saveTrace)
    result.browser.launchOptions.tracesDir = path.join(result.outputDir, 'traces');
  return result;
}

/**
 * Validate runtime invariants on a fully-resolved config. Currently enforces
 * that extension mode is only used with a Chromium-family browser.
 */
export function validateConfig(config: Config) {
  if (config.extension) {
    if (config.browser?.browserName !== 'chromium')
      throw new Error('Extension mode is only supported for Chromium browsers.');
  }
}

export async function configFromCLIOptions(cliOptions: CLIOptions): Promise<Config> {
  let browserName: 'chromium' | 'firefox' | 'webkit' | undefined;
  let channel: string | undefined;
  switch (cliOptions.browser) {
    case 'chrome':
    case 'chrome-beta':
    case 'chrome-canary':
    case 'chrome-dev':
    case 'chromium':
    case 'msedge':
    case 'msedge-beta':
    case 'msedge-canary':
    case 'msedge-dev':
      browserName = 'chromium';
      channel = cliOptions.browser;
      break;
    case 'firefox':
      browserName = 'firefox';
      break;
    case 'webkit':
      browserName = 'webkit';
      break;
  }

  // Launch options
  const launchOptions: LaunchOptions = {
    ...(channel !== undefined && { channel }),
    ...(cliOptions.executablePath !== undefined && { executablePath: cliOptions.executablePath }),
    ...(cliOptions.headless !== undefined && { headless: cliOptions.headless }),
  };

  // --no-sandbox was passed, disable the sandbox
  if (!cliOptions.sandbox)
    launchOptions.chromiumSandbox = false;

  if (cliOptions.proxyServer) {
    launchOptions.proxy = {
      server: cliOptions.proxyServer
    };
    if (cliOptions.proxyBypass)
      launchOptions.proxy.bypass = cliOptions.proxyBypass;
  }

  if (cliOptions.device && cliOptions.cdpEndpoint)
    throw new Error('Device emulation is not supported with cdpEndpoint.');
  if (cliOptions.device && cliOptions.extension)
    throw new Error('Device emulation is not supported with extension mode.');

  // Context options
  let contextOptions: BrowserContextOptions = {};
  if (cliOptions.device) {
    const device = devices[cliOptions.device];
    if (!device)
      throw new Error(`Unknown device: ${cliOptions.device}`);
    contextOptions = { ...device };
  }
  if (cliOptions.storageState)
    contextOptions.storageState = cliOptions.storageState;

  if (cliOptions.userAgent)
    contextOptions.userAgent = cliOptions.userAgent;

  if (cliOptions.viewportSize) {
    try {
      const [width, height] = cliOptions.viewportSize.split(',').map(n => +n);
      if (width === undefined || height === undefined || isNaN(width) || isNaN(height))
        throw new Error('bad values');
      contextOptions.viewport = { width, height };
    } catch (e) {
      throw new Error('Invalid viewport size format: use "width,height", for example --viewport-size="800,600"');
    }
  }

  if (cliOptions.ignoreHttpsErrors)
    contextOptions.ignoreHTTPSErrors = true;

  if (cliOptions.blockServiceWorkers)
    contextOptions.serviceWorkers = 'block';

  // Set Edge profile environment variables for session state tracking
  if (cliOptions.edgeProfile)
    process.env.DARBOT_EDGE_PROFILE = cliOptions.edgeProfile;
  if (cliOptions.edgeProfileEmail)
    process.env.DARBOT_EDGE_PROFILE_EMAIL = cliOptions.edgeProfileEmail;
  if (cliOptions.workspace)
    process.env.DARBOT_WORKSPACE = cliOptions.workspace;

  const browserAgent = cliOptions.browserAgent ?? process.env.PW_BROWSER_AGENT;
  const port = cliOptions.port ?? (process.env.PORT ? parseInt(process.env.PORT, 10) : undefined);
  const capabilities = cliOptions.caps?.split(',').map((c: string) => c.trim() as ToolCapability);
  const result: Config = {
    browser: {
      ...(browserAgent !== undefined && { browserAgent }),
      ...(browserName !== undefined && { browserName }),
      ...(cliOptions.isolated !== undefined && { isolated: cliOptions.isolated }),
      ...(cliOptions.userDataDir !== undefined && { userDataDir: cliOptions.userDataDir }),
      launchOptions,
      contextOptions,
      ...(cliOptions.cdpEndpoint !== undefined && { cdpEndpoint: cliOptions.cdpEndpoint }),
    },
    server: {
      // Support PORT environment variable (common in cloud deployments like Azure)
      ...(port !== undefined && { port }),
      ...(cliOptions.host !== undefined && { host: cliOptions.host }),
    },
    ...(capabilities !== undefined && { capabilities }),
    vision: !!cliOptions.vision,
    extension: !!cliOptions.extension,
    network: {
      ...(cliOptions.allowedOrigins !== undefined && { allowedOrigins: cliOptions.allowedOrigins }),
      ...(cliOptions.blockedOrigins !== undefined && { blockedOrigins: cliOptions.blockedOrigins }),
    },
    ...(cliOptions.saveTrace !== undefined && { saveTrace: cliOptions.saveTrace }),
    ...(cliOptions.outputDir !== undefined && { outputDir: cliOptions.outputDir }),
    ...(cliOptions.imageResponses !== undefined && { imageResponses: cliOptions.imageResponses }),
  };

  return result;
}

async function loadConfig(configFile: string | undefined): Promise<Config> {
  if (!configFile)
    return {};

  try {
    return JSON.parse(await fs.promises.readFile(configFile, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load config file: ${configFile}: ${message}`, { cause: error });
  }
}

/**
 * Build an absolute file path inside the configured output directory,
 * creating the directory if necessary. The filename is sanitised so callers
 * can pass arbitrary user input without worrying about path traversal.
 */
export async function outputFile(config: FullConfig, name: string): Promise<string> {
  await fs.promises.mkdir(config.outputDir, { recursive: true });
  const fileName = sanitizeForFilePath(name);
  return path.join(config.outputDir, fileName);
}

function pickDefined<T extends object>(obj: T | undefined): Partial<T> {
  return Object.fromEntries(
      Object.entries(obj ?? {}).filter(([_, v]) => v !== undefined)
  ) as Partial<T>;
}

function mergeConfig(base: FullConfig, overrides: Config): FullConfig {
  const browser: FullConfig['browser'] = {
    ...pickDefined(base.browser),
    ...pickDefined(overrides.browser),
    browserName: overrides.browser?.browserName ?? base.browser?.browserName ?? 'chromium',
    isolated: overrides.browser?.isolated ?? base.browser?.isolated ?? false,
    launchOptions: {
      ...pickDefined(base.browser?.launchOptions),
      ...pickDefined(overrides.browser?.launchOptions),
      ...{ assistantMode: true },
    },
    contextOptions: {
      ...pickDefined(base.browser?.contextOptions),
      ...pickDefined(overrides.browser?.contextOptions),
    },
  };

  if (browser.browserName !== 'chromium' && browser.launchOptions)
    delete browser.launchOptions.channel;

  return {
    ...pickDefined(base),
    ...pickDefined(overrides),
    browser,
    network: {
      ...pickDefined(base.network),
      ...pickDefined(overrides.network),
    },
    server: {
      ...pickDefined(base.server),
      ...pickDefined(overrides.server),
      https: {
        ...pickDefined(base.server?.https),
        ...pickDefined(overrides.server?.https),
      },
      rateLimit: {
        ...pickDefined(base.server?.rateLimit),
        ...pickDefined(overrides.server?.rateLimit),
      }
    },
    copilotStudio: {
      ...pickDefined(base.copilotStudio),
      ...pickDefined(overrides.copilotStudio),
    },
    auth: {
      ...pickDefined(base.auth),
      ...pickDefined(overrides.auth),
      entraId: {
        ...pickDefined(base.auth?.entraId),
        ...pickDefined(overrides.auth?.entraId),
      },
      apiKey: {
        ...pickDefined(base.auth?.apiKey),
        ...pickDefined(overrides.auth?.apiKey),
      }
    }
  } as FullConfig;
}
