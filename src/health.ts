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
import express from 'express';

import { packageJSON } from './package.js';

import type { Express, Request, Response } from 'express';

const debugLogger = debug('pw:mcp:health');

/**
 * Free-form structured details attached to a health check.
 *
 * Values are constrained to JSON-serialisable primitives because the health
 * payload is rendered as JSON over HTTP and consumed by external monitors.
 */
export type HealthCheckDetails = Record<string, string | number | boolean | null | undefined>;

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  duration: number;
  details?: HealthCheckDetails;
}

export interface HealthCheckStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptimeSeconds: number;
  checks: HealthCheck[];
}

/** Subset of the bridge runtime status that the health service surfaces. */
export interface BridgeStatusSnapshot {
  extensionConnected: boolean;
  mcpConnected: boolean;
  extensionVersion: string | null;
  sessionId: string | null;
}

/** Minimal probe used to surface bridge state without coupling to CDPRelayServer. */
export type BridgeStatusProbe = () => BridgeStatusSnapshot;

export interface HealthCheckServiceOptions {
  /**
   * Optional probe that, when supplied, registers a "bridge" health check that
   * surfaces the CDP relay connection state in the readiness payload.
   */
  bridgeStatusProbe?: BridgeStatusProbe;
  /**
   * When `true`, register an "azure-config" check that validates required Entra
   * ID environment variables are present. Use this when running on Azure or
   * when OAuth is expected to be configured.
   */
  validateAzureConfig?: boolean;
}

type HealthCheckFn = () => Promise<HealthCheck>;

const REQUIRED_AZURE_ENV = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'] as const;

/**
 * Health check service for monitoring system status.
 *
 * Exposes liveness, readiness and full health probes shaped to be consumed by
 * Kubernetes, Azure App Service and Azure Container Apps.
 */
export class HealthCheckService {
  private readonly _checks: Map<string, HealthCheckFn> = new Map();

  constructor(options: HealthCheckServiceOptions = {}) {
    this._registerDefaultChecks();
    if (options.bridgeStatusProbe)
      this._registerBridgeCheck(options.bridgeStatusProbe);

    if (options.validateAzureConfig)
      this._registerAzureConfigCheck();
  }

  /**
   * Register a custom health check. Replaces any existing check with the same name.
   */
  registerCheck(name: string, checkFn: HealthCheckFn): void {
    this._checks.set(name, checkFn);
  }

  /**
   * Run all registered checks in parallel and aggregate their results.
   */
  async runChecks(): Promise<HealthCheckStatus> {
    const timestamp = new Date().toISOString();

    const checkEntries = Array.from(this._checks.entries());
    const checks = await Promise.all(checkEntries.map(async ([name, checkFn]) => {
      const startTime = Date.now();
      try {
        const result = await checkFn();
        result.duration = Date.now() - startTime;
        return result;
      } catch (error) {
        debugLogger('check %s threw: %O', name, error);
        return {
          name,
          status: 'fail' as const,
          duration: Date.now() - startTime,
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        } satisfies HealthCheck;
      }
    }));

    return {
      status: this._determineOverallStatus(checks),
      timestamp,
      version: packageJSON.version,
      uptimeSeconds: Math.round(process.uptime()),
      checks,
    };
  }

  /**
   * Express handler for the full `/health` (and `/healthz`) endpoint. Returns
   * 200 when healthy or degraded, 503 when unhealthy.
   */
  handleHealthCheck = async (_req: Request, res: Response): Promise<void> => {
    try {
      const health = await this.runChecks();
      const statusCode = health.status === 'unhealthy' ? 503 : 200;
      res.status(statusCode)
          .set('Cache-Control', 'no-store')
          .json(health);
    } catch (error) {
      debugLogger('handleHealthCheck failed: %O', error);
      res.status(500)
          .set('Cache-Control', 'no-store')
          .json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Health check failed',
          });
    }
  };

  /**
   * Express handler for the `/ready` (and `/readyz`) readiness probe.
   *
   * Returns 200 when the service is ready to receive traffic, 503 otherwise.
   * Differs from the liveness probe in that any failing check (e.g. missing
   * Azure config, bridge disconnected when extension mode is on) flips the
   * service to "not ready", letting the orchestrator drain traffic.
   */
  handleReadinessCheck = async (_req: Request, res: Response): Promise<void> => {
    try {
      const health = await this.runChecks();
      const ready = health.status !== 'unhealthy';
      res.status(ready ? 200 : 503)
          .set('Cache-Control', 'no-store')
          .json({
            status: ready ? 'ready' : 'not_ready',
            timestamp: health.timestamp,
            version: health.version,
            checks: health.checks.map(c => ({ name: c.name, status: c.status })),
          });
    } catch (error) {
      debugLogger('handleReadinessCheck failed: %O', error);
      res.status(503).set('Cache-Control', 'no-store').send('Service Unavailable');
    }
  };

  /**
   * Express handler for the `/live` (and `/livez`) liveness probe.
   *
   * Lightweight: only fails if the process itself is unresponsive. Does not
   * run health checks — those drive readiness, not liveness. Containers
   * should restart only when this probe fails.
   */
  handleLivenessCheck = (_req: Request, res: Response): void => {
    res.status(200)
        .set('Cache-Control', 'no-store')
        .json({
          status: 'alive',
          timestamp: new Date().toISOString(),
          uptimeSeconds: Math.round(process.uptime()),
          pid: process.pid,
        });
  };

  private _registerDefaultChecks(): void {
    // Memory usage
    this.registerCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const usagePercent = heapTotalMB > 0 ? (heapUsedMB / heapTotalMB) * 100 : 0;
      // Playwright workloads churn heap aggressively; only warn near saturation.
      const status: HealthCheck['status'] = usagePercent > 98 ? 'fail' : usagePercent > 95 ? 'warn' : 'pass';
      return {
        name: 'memory',
        status,
        duration: 0,
        details: { heapUsedMB, heapTotalMB, usagePercent: Math.round(usagePercent) },
      };
    });

    // Process uptime
    this.registerCheck('uptime', async () => {
      const uptimeSeconds = process.uptime();
      return {
        name: 'uptime',
        status: 'pass',
        duration: 0,
        details: {
          uptimeSeconds: Math.round(uptimeSeconds),
          uptimeHours: Math.round(uptimeSeconds / 3600 * 100) / 100,
        },
      };
    });

    // Runtime info
    this.registerCheck('runtime', async () => ({
      name: 'runtime',
      status: 'pass',
      duration: 0,
      details: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    }));
  }

  private _registerBridgeCheck(probe: BridgeStatusProbe): void {
    this.registerCheck('bridge', async () => {
      const status = probe();
      // When the extension is intended but disconnected, surface it as degraded
      // so deployments can react. MCP-side disconnection is informational.
      const checkStatus: HealthCheck['status'] = status.extensionConnected ? 'pass' : 'warn';
      return {
        name: 'bridge',
        status: checkStatus,
        duration: 0,
        details: {
          extensionConnected: status.extensionConnected,
          mcpConnected: status.mcpConnected,
          extensionVersion: status.extensionVersion ?? undefined,
          sessionId: status.sessionId ?? undefined,
        },
      };
    });
  }

  private _registerAzureConfigCheck(): void {
    this.registerCheck('azure-config', async () => {
      const missing = REQUIRED_AZURE_ENV.filter(name => !process.env[name]);
      if (missing.length === 0) {
        return {
          name: 'azure-config',
          status: 'pass',
          duration: 0,
          details: {
            tenantId: maskId(process.env.AZURE_TENANT_ID),
            clientId: maskId(process.env.AZURE_CLIENT_ID),
            clientSecretConfigured: true,
          },
        };
      }
      return {
        name: 'azure-config',
        status: 'fail',
        duration: 0,
        details: { missing: missing.join(',') },
      };
    });
  }

  private _determineOverallStatus(checks: HealthCheck[]): HealthCheckStatus['status'] {
    if (checks.some(c => c.status === 'fail'))
      return 'unhealthy';

    if (checks.some(c => c.status === 'warn'))
      return 'degraded';

    return 'healthy';
  }
}

/**
 * Mask a sensitive identifier for logging: keep the first 4 and last 4 chars.
 */
function maskId(value: string | undefined): string | undefined {
  if (!value)
    return undefined;
  if (value.length <= 8)
    return '***';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

/**
 * Create a health check service with default checks plus any optional
 * bridge / Azure validation hooks the caller wires in.
 */
export function createHealthCheckService(options: HealthCheckServiceOptions = {}): HealthCheckService {
  return new HealthCheckService(options);
}

/** Partial bridge snapshot accepted by {@link HealthAppOptions.getBridgeStatus}. */
export interface PartialBridgeStatus {
  extensionConnected: boolean;
  mcpConnected?: boolean;
  extensionVersion?: string | null;
  sessionId?: string | null;
}

/** Shape returned by either the env-driven `validateOAuthConfig` (`ok`) or
 *  test mocks that prefer the older `valid` field. */
export type OAuthValidationLike =
  | { ok: boolean; missing?: string[] }
  | { valid: boolean; missing?: string[] };

export interface HealthAppOptions {
  /**
   * When `true`, readiness fails (HTTP 503 on `/readyz`) if the bridge is not
   * connected. When `false` (default), bridge status is informational only.
   */
  bridgeRequired?: boolean;
  /** Probe returning the current bridge state. Required when `bridgeRequired` is true. */
  getBridgeStatus?: () => PartialBridgeStatus;
  /**
   * Optional OAuth validator. When supplied, `/healthz` includes an
   * `oauth: { valid }` block. Failures here do *not* flip the overall status,
   * since deployments may legitimately run without Entra-backed auth.
   */
  validateOAuthConfig?: () => OAuthValidationLike;
}

function normalizeOAuthValid(result: OAuthValidationLike): { valid: boolean; missing?: string[] } {
  const valid = 'valid' in result ? result.valid : result.ok;
  return result.missing && result.missing.length > 0
    ? { valid, missing: result.missing }
    : { valid };
}

/**
 * Express app exposing `/healthz`, `/readyz` and `/livez` (plus the alias
 * paths without the trailing `z`) suitable for Kubernetes-style orchestrators
 * and Azure App Service health probes.
 *
 * Health and readiness aggregate the underlying {@link HealthCheckService},
 * with two app-level concerns layered on top:
 *   - `bridgeRequired` gates readiness on extension connectivity
 *   - `validateOAuthConfig` decorates `/healthz` with an `oauth` block
 */
export function createHealthApp(options: HealthAppOptions = {}): Express {
  const bridgeRequired = options.bridgeRequired ?? false;
  const probe = options.getBridgeStatus;
  const validate = options.validateOAuthConfig;

  const service = createHealthCheckService({
    ...(probe
      ? {
        bridgeStatusProbe: (): BridgeStatusSnapshot => {
          const status = probe();
          return {
            extensionConnected: status.extensionConnected,
            mcpConnected: status.mcpConnected ?? false,
            extensionVersion: status.extensionVersion ?? null,
            sessionId: status.sessionId ?? null,
          };
        },
      }
      : {}),
  });

  const app = express();

  const computeBridgeOk = (): boolean => {
    if (!bridgeRequired)
      return true;
    if (!probe)
      return false;
    return probe().extensionConnected === true;
  };

  const handleHealth = async (_req: Request, res: Response): Promise<void> => {
    try {
      const health = await service.runChecks();
      const bridgeOk = computeBridgeOk();
      const checksOk = health.status !== 'unhealthy';
      const overallOk = bridgeOk && checksOk;

      const body: Record<string, unknown> = {
        status: overallOk ? 'ok' : 'degraded',
        timestamp: health.timestamp,
        version: health.version,
        uptimeSeconds: health.uptimeSeconds,
        checks: health.checks,
      };
      if (validate)
        body.oauth = normalizeOAuthValid(validate());

      res.status(overallOk ? 200 : 503)
          .set('Cache-Control', 'no-store')
          .json(body);
    } catch (error) {
      debugLogger('createHealthApp /healthz failed: %O', error);
      res.status(500)
          .set('Cache-Control', 'no-store')
          .json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Health check failed',
          });
    }
  };

  const handleReady = async (_req: Request, res: Response): Promise<void> => {
    try {
      const health = await service.runChecks();
      const bridgeOk = computeBridgeOk();
      const ready = bridgeOk && health.status !== 'unhealthy';
      res.status(ready ? 200 : 503)
          .set('Cache-Control', 'no-store')
          .json({
            status: ready ? 'ok' : 'not_ready',
            timestamp: health.timestamp,
            version: health.version,
            checks: health.checks.map(c => ({ name: c.name, status: c.status })),
          });
    } catch (error) {
      debugLogger('createHealthApp /readyz failed: %O', error);
      res.status(503).set('Cache-Control', 'no-store').send('Service Unavailable');
    }
  };

  app.get('/healthz', handleHealth);
  app.get('/health', handleHealth);
  app.get('/readyz', handleReady);
  app.get('/ready', handleReady);
  app.get('/livez', service.handleLivenessCheck);
  app.get('/live', service.handleLivenessCheck);

  return app;
}
