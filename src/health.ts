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

import type { IncomingMessage, ServerResponse } from 'http';
import { packageJSON } from './package.js';

export interface HealthCheckStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  duration: number;
  details?: Record<string, any>;
}

/**
 * Health check service for monitoring system status
 */
export class HealthCheckService {
  private checks: Map<string, () => Promise<HealthCheck>> = new Map();

  constructor() {
    this.registerDefaultChecks();
  }

  /**
   * Registers a health check function
   */
  registerCheck(name: string, checkFn: () => Promise<HealthCheck>) {
    this.checks.set(name, checkFn);
  }

  /**
   * Runs all registered health checks
   */
  async runChecks(): Promise<HealthCheckStatus> {
    const timestamp = new Date().toISOString();
    const checks: HealthCheck[] = [];

    for (const [name, checkFn] of this.checks) {
      try {
        const startTime = Date.now();
        const result = await checkFn();
        result.duration = Date.now() - startTime;
        checks.push(result);
      } catch (error) {
        checks.push({
          name,
          status: 'fail',
          duration: 0,
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    }

    const overallStatus = this.determineOverallStatus(checks);

    return {
      status: overallStatus,
      timestamp,
      version: packageJSON.version,
      checks
    };
  }

  /**
   * HTTP handler for health check endpoint
   */
  async handleHealthCheck(req: IncomingMessage, res: ServerResponse) {
    try {
      const health = await this.runChecks();
      const statusCode = health.status === 'healthy' ? 200 :
        health.status === 'degraded' ? 200 : 503;

      res.statusCode = statusCode;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache');
      res.end(JSON.stringify(health, null, 2));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed'
      }));
    }
  }

  /**
   * Lightweight readiness probe for Kubernetes/Azure
   */
  async handleReadinessCheck(req: IncomingMessage, res: ServerResponse) {
    try {
      // Quick check - just verify service is responding
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end('OK');
    } catch (error) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Service Unavailable');
    }
  }

  /**
   * Liveness probe for Kubernetes/Azure
   */
  async handleLivenessCheck(req: IncomingMessage, res: ServerResponse) {
    try {
      // Basic liveness check
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Alive');
    } catch (error) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Dead');
    }
  }

  private registerDefaultChecks() {
    // Memory usage check
    this.registerCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

      // Warn if heap usage > 95%, fail if > 98% (relaxed for Playwright workloads)
      const usagePercent = (heapUsedMB / heapTotalMB) * 100;
      const status = usagePercent > 98 ? 'fail' : usagePercent > 95 ? 'warn' : 'pass';

      return {
        name: 'memory',
        status,
        duration: 0,
        details: {
          heapUsedMB,
          heapTotalMB,
          usagePercent: Math.round(usagePercent)
        }
      };
    });

    // Process uptime check
    this.registerCheck('uptime', async () => {
      const uptimeSeconds = process.uptime();
      return {
        name: 'uptime',
        status: 'pass',
        duration: 0,
        details: {
          uptimeSeconds: Math.round(uptimeSeconds),
          uptimeHours: Math.round(uptimeSeconds / 3600 * 100) / 100
        }
      };
    });

    // Node.js version check
    this.registerCheck('runtime', async () => {
      return {
        name: 'runtime',
        status: 'pass',
        duration: 0,
        details: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
      };
    });
  }

  private determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
    const hasFailures = checks.some(check => check.status === 'fail');
    const hasWarnings = checks.some(check => check.status === 'warn');

    if (hasFailures)
      return 'unhealthy';
    if (hasWarnings)
      return 'degraded';
    return 'healthy';
  }
}

/**
 * Creates a health check service with default checks
 */
export function createHealthCheckService(): HealthCheckService {
  return new HealthCheckService();
}
