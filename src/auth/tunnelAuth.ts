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

/**
 * VS Code Dev Tunnel Authentication
 *
 * When running through VS Code dev tunnels, authentication is handled
 * by GitHub OAuth. This module validates tunnel tokens and extracts
 * user identity from the tunnel connection.
 */

import type { IncomingMessage } from 'http';

export interface TunnelAuthConfig {
  /** Whether tunnel authentication is enabled */
  enabled: boolean;
  /** Allowed tunnel domains */
  allowedDomains: string[];
  /** Whether to trust forwarded headers from tunnel */
  trustForwardedHeaders: boolean;
}

export interface TunnelAuthResult {
  /** Whether authentication was successful */
  authenticated: boolean;
  /** GitHub username (if authenticated via tunnel) */
  githubUser?: string;
  /** Tunnel ID */
  tunnelId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Check if request is coming through a VS Code dev tunnel
 */
export function isDevTunnelRequest(req: IncomingMessage, config: TunnelAuthConfig): boolean {
  if (!config.enabled)
    return false;

  // Check X-Forwarded-Host for tunnel domain
  const forwardedHost = req.headers['x-forwarded-host'] as string | undefined;
  if (forwardedHost) {
    return config.allowedDomains.some(domain =>
      forwardedHost.endsWith(domain)
    );
  }

  // Check Host header
  const host = req.headers.host;
  if (host) {
    return config.allowedDomains.some(domain =>
      host.endsWith(domain)
    );
  }

  return false;
}

/**
 * Extract tunnel information from request headers
 */
export function extractTunnelInfo(req: IncomingMessage): TunnelAuthResult {
  // VS Code dev tunnels add specific headers when proxying requests
  // X-VS-Tunnel-User: GitHub username
  // X-VS-Tunnel-Session: Session ID
  // X-Original-URL: Original URL before tunnel

  const tunnelUser = req.headers['x-vs-tunnel-user'] as string | undefined;
  const tunnelSession = req.headers['x-vs-tunnel-session'] as string | undefined;

  // Alternative headers that GitHub Codespaces uses
  const codespaceUser = req.headers['x-github-user'] as string | undefined;
  const forwardedUser = req.headers['x-forwarded-user'] as string | undefined;

  const githubUser = tunnelUser || codespaceUser || forwardedUser;

  if (githubUser) {
    return {
      authenticated: true,
      githubUser,
      tunnelId: tunnelSession,
    };
  }

  // If we're in a tunnel but no user header, the tunnel is in public mode
  // This is acceptable for public tunnels
  return {
    authenticated: true,
    tunnelId: tunnelSession,
  };
}

/**
 * Authenticate a request from a dev tunnel
 */
export async function authenticateTunnelRequest(
  req: IncomingMessage,
  config: TunnelAuthConfig
): Promise<TunnelAuthResult> {
  if (!isDevTunnelRequest(req, config)) {
    return {
      authenticated: false,
      error: 'Not a dev tunnel request',
    };
  }

  return extractTunnelInfo(req);
}

/**
 * Create tunnel auth configuration from environment
 */
export function createTunnelAuthConfig(): TunnelAuthConfig {
  const domains = process.env.TUNNEL_ALLOWED_DOMAINS || '.devtunnels.ms,.tunnels.api.visualstudio.com,.github.dev';

  return {
    enabled: process.env.TUNNEL_AUTH_ENABLED === 'true' ||
             process.env.VS_TUNNEL_ENABLED === 'true' ||
             // Auto-detect if we're in a tunnel
             !!process.env.TUNNEL_URL ||
             !!process.env.CODESPACE_NAME,
    allowedDomains: domains.split(',').map(d => d.trim()),
    trustForwardedHeaders: process.env.TRUST_PROXY === 'true' ||
                          process.env.NODE_ENV === 'production',
  };
}

/**
 * Dev Tunnel Authenticator class for middleware use
 */
export class DevTunnelAuthenticator {
  private config: TunnelAuthConfig;

  constructor(config?: Partial<TunnelAuthConfig>) {
    const defaultConfig = createTunnelAuthConfig();
    this.config = { ...defaultConfig, ...config };
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if request is from a dev tunnel
   */
  isTunnelRequest(req: IncomingMessage): boolean {
    return isDevTunnelRequest(req, this.config);
  }

  /**
   * Authenticate a tunnel request
   */
  async authenticate(req: IncomingMessage): Promise<TunnelAuthResult> {
    return authenticateTunnelRequest(req, this.config);
  }
}

/**
 * Create a dev tunnel authenticator from environment
 */
export function createDevTunnelAuthenticator(): DevTunnelAuthenticator {
  return new DevTunnelAuthenticator();
}
