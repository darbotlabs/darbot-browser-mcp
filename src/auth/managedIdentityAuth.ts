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
 * Azure Managed Identity Authentication
 *
 * Enables automatic authentication for Azure services using Managed Identity.
 * This eliminates the need for API keys or secrets when running in Azure.
 *
 * Supports:
 * - System-assigned Managed Identity
 * - User-assigned Managed Identity
 * - Azure Key Vault secret retrieval
 */

import { DefaultAzureCredential, ManagedIdentityCredential, type TokenCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

export interface ManagedIdentityConfig {
  /** User-assigned managed identity client ID (optional) */
  userAssignedClientId?: string;
  /** Key Vault URL for retrieving secrets */
  keyVaultUrl?: string;
  /** Whether Managed Identity is enabled */
  enabled: boolean;
}

export interface ManagedIdentityAuthResult {
  /** Whether authentication was successful */
  authenticated: boolean;
  /** The identity type used */
  identityType: 'system' | 'user-assigned' | 'default' | 'none';
  /** The client ID (for user-assigned) */
  clientId?: string;
  /** Any error message */
  error?: string;
}

// Cached credential instance
let cachedCredential: TokenCredential | null = null;
let cachedSecretClient: SecretClient | null = null;

/**
 * Get Azure credential for Managed Identity
 */
export function getManagedIdentityCredential(config: ManagedIdentityConfig): TokenCredential {
  if (cachedCredential)
    return cachedCredential;

  if (config.userAssignedClientId) {
    // User-assigned managed identity
    cachedCredential = new ManagedIdentityCredential(config.userAssignedClientId);
  } else {
    // System-assigned or default credential chain
    cachedCredential = new DefaultAzureCredential();
  }

  return cachedCredential;
}

/**
 * Verify that Managed Identity is available and working
 */
export async function verifyManagedIdentity(config: ManagedIdentityConfig): Promise<ManagedIdentityAuthResult> {
  if (!config.enabled) {
    return {
      authenticated: false,
      identityType: 'none',
      error: 'Managed Identity is not enabled',
    };
  }

  try {
    const credential = getManagedIdentityCredential(config);

    // Try to get a token for Azure Resource Manager to verify identity works
    const token = await credential.getToken('https://management.azure.com/.default');

    if (token) {
      return {
        authenticated: true,
        identityType: config.userAssignedClientId ? 'user-assigned' : 'system',
        clientId: config.userAssignedClientId,
      };
    }

    return {
      authenticated: false,
      identityType: 'none',
      error: 'Failed to acquire token',
    };
  } catch (error: any) {
    return {
      authenticated: false,
      identityType: 'none',
      error: error.message || 'Managed Identity authentication failed',
    };
  }
}

/**
 * Get a secret from Azure Key Vault using Managed Identity
 */
export async function getKeyVaultSecret(secretName: string, config: ManagedIdentityConfig): Promise<string | null> {
  if (!config.keyVaultUrl) {
    // eslint-disable-next-line no-console
    console.error('[ManagedIdentity] Key Vault URL not configured');
    return null;
  }

  try {
    if (!cachedSecretClient) {
      const credential = getManagedIdentityCredential(config);
      cachedSecretClient = new SecretClient(config.keyVaultUrl, credential);
    }

    const secret = await cachedSecretClient.getSecret(secretName);
    return secret.value || null;
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error(`[ManagedIdentity] Failed to get secret '${secretName}':`, error.message);
    return null;
  }
}

/**
 * Load configuration from Key Vault secrets
 */
export async function loadSecretsFromKeyVault(config: ManagedIdentityConfig): Promise<Record<string, string>> {
  const secrets: Record<string, string> = {};

  if (!config.keyVaultUrl || !config.enabled)
    return secrets;

  // Standard secret names to load
  const secretNames = [
    'AZURE-TENANT-ID',
    'AZURE-CLIENT-ID',
    'AZURE-CLIENT-SECRET',
  ];

  for (const secretName of secretNames) {
    const value = await getKeyVaultSecret(secretName, config);
    if (value) {
      // Convert Key Vault naming (AZURE-TENANT-ID) to env var naming (AZURE_TENANT_ID)
      const envName = secretName.replace(/-/g, '_');
      secrets[envName] = value;
    }
  }

  return secrets;
}

/**
 * Create Managed Identity configuration from environment
 */
export function createManagedIdentityConfig(): ManagedIdentityConfig {
  return {
    enabled: process.env.MANAGED_IDENTITY_ENABLED === 'true' ||
             process.env.AZURE_USE_MANAGED_IDENTITY === 'true' ||
             // Auto-detect Azure environment
             !!process.env.IDENTITY_ENDPOINT,
    userAssignedClientId: process.env.AZURE_CLIENT_ID_MANAGED_IDENTITY,
    keyVaultUrl: process.env.AZURE_KEY_VAULT_URL || process.env.KEY_VAULT_URL,
  };
}

/**
 * Initialize authentication using Managed Identity
 * Loads secrets from Key Vault and sets environment variables
 */
export async function initializeManagedIdentityAuth(): Promise<boolean> {
  const config = createManagedIdentityConfig();

  if (!config.enabled) {
    // eslint-disable-next-line no-console
    console.error('[ManagedIdentity] Not enabled or not running in Azure');
    return false;
  }

  // Verify Managed Identity is working
  const verifyResult = await verifyManagedIdentity(config);
  if (!verifyResult.authenticated) {
    // eslint-disable-next-line no-console
    console.error('[ManagedIdentity] Verification failed:', verifyResult.error);
    return false;
  }

  // eslint-disable-next-line no-console
  console.error(`[ManagedIdentity] Authenticated using ${verifyResult.identityType} identity`);

  // Load secrets from Key Vault if configured
  if (config.keyVaultUrl) {
    const secrets = await loadSecretsFromKeyVault(config);
    for (const [key, value] of Object.entries(secrets)) {
      if (!process.env[key]) {
        process.env[key] = value;
        // eslint-disable-next-line no-console
        console.error(`[ManagedIdentity] Loaded ${key} from Key Vault`);
      }
    }
  }

  return true;
}
