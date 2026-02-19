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

import { Option, program } from 'commander';
// @ts-ignore
import { startTraceViewerServer } from 'playwright-core/lib/server';

import { startHttpServer, startHttpTransport, startStdioTransport } from './transport.js';
import { resolveCLIConfig } from './config.js';
import { Server } from './server.js';
import { packageJSON } from './package.js';
import { startCDPRelayServer } from './cdpRelay.js';

program
    .version('Version ' + packageJSON.version)
    .name(packageJSON.name)
    .option('--allowed-origins <origins>', 'semicolon-separated list of origins to allow the browser to request. Default is to allow all.', semicolonSeparatedList)
    .option('--blocked-origins <origins>', 'semicolon-separated list of origins to block the browser from requesting. Blocklist is evaluated before allowlist. If used without the allowlist, requests not matching the blocklist are still allowed.', semicolonSeparatedList)
    .option('--block-service-workers', 'block service workers')
    .option('--browser <browser>', 'browser or chrome channel to use, possible values: msedge, chrome, firefox, webkit.')
    .option('--browser-agent <endpoint>', 'Use browser agent (experimental).')
    .option('--caps <caps>', 'comma-separated list of capabilities to enable, possible values: tabs, pdf, history, wait, files, install, testing. Default is all. Omit this flag to enable all capabilities.')
    .option('--cdp-endpoint <endpoint>', 'CDP endpoint to connect to.')
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
      let cdpRelayServer: Awaited<ReturnType<typeof startCDPRelayServer>>['relayServer'] | undefined;
      
      if (config.extension) {
        if (!httpServer)
          throw new Error('--port parameter is required for extension mode');
        // Point CDP endpoint to the relay server.
        const relayResult = await startCDPRelayServer(httpServer);
        config.browser.cdpEndpoint = relayResult.cdpEndpoint;
        cdpRelayServer = relayResult.relayServer;
        
        // Add bridge status endpoint
        if (expressApp) {
          expressApp.get('/bridge', (req, res) => {
            const status = cdpRelayServer?.getStatus() ?? {
              extensionConnected: false,
              mcpConnected: false,
              targetInfo: null,
              sessionId: null,
              extensionVersion: null,
            };
            res.json({
              bridge: 'cdp-relay',
              version: '1.3.0',
              ...status,
            });
          });
        }
      }

      const server = new Server(config);
      // Use http mode when port is specified to prevent exit on stdin close
      server.setupExitWatchdog(httpServer ? 'http' : 'stdio');

      if (httpServer && expressApp)
        await startHttpTransport(httpServer, server, expressApp);
      else if (httpServer)
        throw new Error('Express app not initialized');
      else
        await startStdioTransport(server);

      if (config.saveTrace) {
        const server = await startTraceViewerServer();
        const urlPrefix = server.urlPrefix('human-readable');
        const url = urlPrefix + '/trace/index.html?trace=' + config.browser.launchOptions.tracesDir + '/trace.json';
        // eslint-disable-next-line no-console
        console.error('\nTrace viewer listening on ' + url);
      }
    });

function semicolonSeparatedList(value: string): string[] {
  return value.split(';').map(v => v.trim());
}

void program.parseAsync(process.argv);
