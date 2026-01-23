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

import type { IncomingMessage } from 'http';

export interface ApiKeyConfig {
  enabled?: boolean;
  keys?: string[];
}

export class ApiKeyAuthenticator {
  private readonly _enabled: boolean;
  private readonly _keys: Set<string>;

  constructor(config: ApiKeyConfig) {
    this._enabled = !!config.enabled;
    this._keys = new Set((config.keys || []).map(k => k.trim()).filter(Boolean));
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Returns true when a provided X-API-Key matches one of the configured keys.
   *
   * If auth is disabled, returns true.
   */
  authenticate(req: IncomingMessage): boolean {
    if (!this._enabled)
      return true;

    const apiKeyHeader = req.headers['x-api-key'];
    const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
    if (!apiKey)
      return false;

    return this._keys.has(apiKey);
  }
}

export function createApiKeyAuthenticatorFromEnv(): ApiKeyAuthenticator {
  return new ApiKeyAuthenticator({
    enabled: process.env.API_KEY_AUTH_ENABLED === 'true',
    keys: (process.env.API_KEYS || '').split(',').map(s => s.trim()).filter(Boolean),
  });
}
