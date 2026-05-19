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
import { Option, program } from 'commander';
// @ts-expect-error - playwright-core internal entrypoint, no shipped types.
import { startTraceViewerServer } from 'playwright-core/lib/server';

import { resolveCLIConfig } from './config.js';
import { startCDPRelayServer, type CDPRelayServer } from './cdpRelay.js';
import { createHealthCheckService } from './health.js';
import { packageJSON } from './package.js';
import { Server } from './server.js';
import { startHttpServer, startHttpTransport, startStdioTransport } from './transport.js';

const programDebug = debug('pw:mcp:program');

program
    .version('Version ' + packageJSON.version)
    .name(packageJSON.name)
    .option('--allowed-origins <origins>', 'semicolon-separated list of origins to allow the browser to request. Default is to allow all.', semicolonSeparatedList)
    .option('--blocked-origins <origins>', 'semicolon-separated list of origins to block the browser from requesting. Blocklist is evaluated before allowlist. If used without the allowlist, requests not matching the blocklist are still allowed.', semicolonSeparatedList)
    .option('--block-service-workers', 'block service workers')
    .option('--browser <browser>', 'browser or chrome channel to use, possible values: msedge, chrome, firefox, webkit.')
    .option('--browser-agent <endpoint>', 'Use browser agent (experimental).')
    .option('--caps <caps>', 'comma-separated list of capabilities to enable, possible values: tabs, pdf, history, wait, files, install, testing. Omit this flag to enable all capabilities (default).')
    .option('--cdp-endpoint <endpoint>', 'CDP endpoint to connect to. Note: connecting via CDP opens an isolated context and cannot see existing tabs or cookies in a running browser.')
    .option('--config <path>', 'path to the configuration file.')
    .option('--device <device>', 'device to emulate, for example: "iPhone 15"')
    .option('--executable-path <path>', 'path to the browser executable.')
    .option('--headless', 'run browser in headless mode, headed by default')
    .option('--host <host>', 'host to bind server to. Default is localhost. Use 0.0.0.0 to bind to all interfaces.')
    .option('--ignore-https-errors', 'ignore https errors')
    .option('--isolated', 'keep the browser profile in memory, do not save it to disk.')
    .option('--image-responses <mode>', 'whether to send image responses to the client. Can be "allow", "omit", or "auto". Defaults to "auto", which sends images if the client can display them.')
    .option('--no-sandbox', 'disable the sandbox for all process types that are normally sandboxed.')
    .option('--output-dir <path>', 'path to the directory for output files.')
    .option('--port <port>', 'port to listen on for SSE transport.')
    .option('--proxy-bypass <bypass>', 'comma-separated domains to bypass proxy, for example ".com,chromium.org,.domain.com"')
    .option('--proxy-server <proxy>', 'specify proxy server, for example "http://myproxy:3128" or "socks5://myproxy:8080"')
    .option('--save-trace', 'Whether to save the Playwright Trace of the session into the output directory.')
    .option('--storage-state <path>', 'path to the storage state file for isolated sessions.')
    .option('--user-agent <ua string>', 'specify user agent string')
    .option('--user-data-dir <path>', 'path to the user data directory. If not specified, a temporary directory will be created.')
    .option('--viewport-size <size>', 'specify browser viewport size in pixels, for example "1280, 720"')
    .option('--vision', 'Run server that uses screenshots (Aria snapshots are used by default)')
    .option('--edge-profile <name>', 'Edge profile name to use (e.g., "Profile 1", "Default"). This is recorded in saved session states.')
    .option('--edge-profile-email <email>', 'Email associated with the Edge profile. This is recorded in saved session states for context.')
    .option('--workspace <name>', 'Workspace name to record in saved session states.')
    .option('--auto-sign-in', 'Auto sign in with work/school account (Edge profile preference)')
    .option('--profile-switching', 'Enable automatic profile switching based on site (Edge profile preference)')
    .option('--intranet-switch', 'Automatically switch to work profile for intranet sites (Edge profile preference)')
    .option('--ie-mode-switch', 'Automatically switch profile for IE mode sites (Edge profile preference)')
    .option('--default-profile <name>', 'Default Edge profile for external links (Edge profile preference)')
    .addOption(new Option('--extension', 'Allow connecting to a running browser instance (Edge/Chrome only). Requires the \'Darbot Browser MCP\' browser extension to be installed.').hideHelp())
    .action(async options => {
      const config = await resolveCLIConfig(options);
      const httpResult = config.server.port !== undefined ? await startHttpServer(config.server) : undefined;
      const httpServer = httpResult?.httpServer;
      const expressApp = httpResult?.app;

      let cdpRelayServer: CDPRelayServer | undefined;
      if (config.extension) {
        if (!httpServer)
          throw new Error('--port parameter is required for extension mode');

        const relayResult = await startCDPRelayServer(httpServer);
        config.browser.cdpEndpoint = relayResult.cdpEndpoint;
        cdpRelayServer = relayResult.relayServer;

        // /bridge: status payload consumed by IDE clients and the auto-detect
        // probe in `resolveCLIConfig`. Version is pulled from package.json so
        // there is no second source of truth to keep in sync at release.
        if (expressApp) {
          expressApp.get('/bridge', (_req, res) => {
            const status = cdpRelayServer?.getStatus() ?? {
              extensionConnected: false,
              mcpConnected: false,
              targetInfo: null,
              sessionId: null,
              extensionVersion: null,
            };
            res.json({
              bridge: 'cdp-relay',
              version: packageJSON.version,
              ...status,
            });
          });
        }
      }

      // Build a single health service before transport startup so /health and
      // /ready can surface bridge state and Azure config validation status
      // (when configured via environment).
      const relayForProbe = cdpRelayServer;
      const healthService = createHealthCheckService({
        bridgeStatusProbe: relayForProbe ? () => relayForProbe.getStatus() : undefined,
        validateAzureConfig: shouldValidateAzureConfig(),
      });

      const server = new Server(config);
      // Use http mode when port is specified to prevent exit on stdin close.
      server.setupExitWatchdog(httpServer ? 'http' : 'stdio');

      if (httpServer && expressApp) {
        startHttpTransport(httpServer, server, expressApp, { healthService });
      } else if (httpServer) {
        throw new Error('Express app not initialized');
      } else {
        await startStdioTransport(server);
      }

      if (config.saveTrace) {
        const traceServer = await startTraceViewerServer();
        const urlPrefix = traceServer.urlPrefix('human-readable');
        const url = urlPrefix + '/trace/index.html?trace=' + config.browser.launchOptions.tracesDir + '/trace.json';
        programDebug('Trace viewer listening on %s', url);
      }
    });

function semicolonSeparatedList(value: string): string[] {
  return value.split(';').map(v => v.trim());
}

/**
 * Decide whether to register the Azure config validator. We opt-in when
 * either an explicit Azure mode env hint is set OR Entra ID / API key auth is
 * enabled in the environment. This avoids spurious failures on local stdio
 * runs while still surfacing missing config in cloud deployments.
 */
function shouldValidateAzureConfig(): boolean {
  if (process.env.WEBSITE_SITE_NAME) // Azure App Service
    return true;
  if (process.env.CONTAINER_APP_NAME) // Azure Container Apps
    return true;
  if (process.env.AZURE_DEPLOYMENT === 'true')
    return true;
  if (process.env.ENTRA_AUTH_ENABLED === 'true')
    return true;
  return false;
}

void program.parseAsync(process.argv);
