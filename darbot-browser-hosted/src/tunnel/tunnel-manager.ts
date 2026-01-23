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
 * Dev Tunnel Manager
 *
 * Manages VS Code dev tunnels for secure remote access
 */

import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import debug from 'debug';

const log = debug('darbot:tunnel');
const logError = debug('darbot:tunnel:error');

const execAsync = promisify(exec);

export interface TunnelConfig {
  name: string;
  access: 'public' | 'private' | 'org';
  protocol: 'http' | 'https' | 'auto';
  port: number;
}

export interface TunnelInfo {
  name: string;
  url: string;
  status: 'running' | 'stopped' | 'error';
  port: number;
  createdAt: Date;
}

export class DevTunnelManager {
  private config: TunnelConfig;
  private tunnelProcess?: ChildProcess;
  private tunnelUrl?: string;
  private dataDir: string;

  constructor(config: Partial<TunnelConfig> = {}) {
    this.config = {
      name: config.name || process.env.TUNNEL_NAME || 'darbot-browser-mcp',
      access: (config.access as any) || process.env.TUNNEL_ACCESS || 'private',
      protocol: (config.protocol as any) || 'https',
      port: config.port || parseInt(process.env.PORT || '8080', 10),
    };

    this.dataDir = process.env.DATA_DIR || '/app/data/tunnel';
  }

  /**
   * Check if VS Code CLI is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('code --version');
      return stdout.includes('.');
    } catch {
      return false;
    }
  }

  /**
   * Check if user is logged in to GitHub (required for tunnels)
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('code tunnel user show');
      return stdout.includes('github.com');
    } catch {
      return false;
    }
  }

  /**
   * Login to GitHub for tunnel authentication
   */
  async login(token?: string): Promise<void> {
    if (token)
      process.env.GITHUB_TOKEN = token;


    try {
      await execAsync('code tunnel user login --provider github');
      log('GitHub authentication successful');
    } catch (error) {
      throw new Error(`GitHub login failed: ${error}`);
    }
  }

  /**
   * Start dev tunnel
   */
  async start(): Promise<TunnelInfo> {
    // Check prerequisites
    if (!(await this.isInstalled()))
      throw new Error('VS Code CLI not installed. Run: curl -Lk https://code.visualstudio.com/sha/download?build=stable&os=cli-alpine-x64');


    if (!(await this.isLoggedIn())) {
      log('Not logged in to GitHub, attempting login...');
      if (process.env.GITHUB_TOKEN)
        await this.login(process.env.GITHUB_TOKEN);
      else
        throw new Error('Not logged in to GitHub. Set GITHUB_TOKEN or run: code tunnel user login');

    }

    // Start tunnel process
    const args = [
      'tunnel',
      '--name', this.config.name,
      '--accept-server-license-terms',
    ];

    if (this.config.access !== 'public')
      args.push('--access', this.config.access);


    log('Starting dev tunnel:', args.join(' '));

    this.tunnelProcess = spawn('code', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    // Capture tunnel URL from output
    const urlPromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Tunnel startup timeout'));
      }, 60000);

      this.tunnelProcess!.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        log(text.trim());

        // Look for tunnel URL in output
        const urlMatch = text.match(/https:\/\/[a-z0-9-]+\.devtunnels\.ms/i);
        if (urlMatch) {
          clearTimeout(timeout);
          resolve(urlMatch[0]);
        }
      });

      this.tunnelProcess!.stderr?.on('data', (data: Buffer) => {
        logError(data.toString().trim());
      });

      this.tunnelProcess!.on('error', error => {
        clearTimeout(timeout);
        reject(error);
      });

      this.tunnelProcess!.on('exit', code => {
        if (code !== 0) {
          clearTimeout(timeout);
          reject(new Error(`Tunnel process exited with code ${code}`));
        }
      });
    });

    try {
      this.tunnelUrl = await urlPromise;
      log('Tunnel URL:', this.tunnelUrl);

      // Save tunnel info
      await this.saveTunnelInfo();

      // Update environment variable
      process.env.TUNNEL_URL = this.tunnelUrl;

      return {
        name: this.config.name,
        url: this.tunnelUrl,
        status: 'running',
        port: this.config.port,
        createdAt: new Date(),
      };
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  /**
   * Stop dev tunnel
   */
  stop(): void {
    if (this.tunnelProcess) {
      log('Stopping dev tunnel');
      this.tunnelProcess.kill();
      this.tunnelProcess = undefined;
      this.tunnelUrl = undefined;
    }
  }

  /**
   * Get current tunnel status
   */
  async getStatus(): Promise<TunnelInfo | null> {
    try {
      const { stdout } = await execAsync(`code tunnel status --name ${this.config.name}`);
      const urlMatch = stdout.match(/https:\/\/[a-z0-9-]+\.devtunnels\.ms/i);

      if (urlMatch) {
        return {
          name: this.config.name,
          url: urlMatch[0],
          status: 'running',
          port: this.config.port,
          createdAt: new Date(),
        };
      }
    } catch {
      // Tunnel not running or error
    }

    return null;
  }

  /**
   * Get tunnel URL
   */
  getUrl(): string | undefined {
    return this.tunnelUrl;
  }

  /**
   * Save tunnel information to file
   */
  private async saveTunnelInfo(): Promise<void> {
    try {
      const info: TunnelInfo = {
        name: this.config.name,
        url: this.tunnelUrl!,
        status: 'running',
        port: this.config.port,
        createdAt: new Date(),
      };

      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.writeFile(
          path.join(this.dataDir, 'tunnel-info.json'),
          JSON.stringify(info, null, 2)
      );
    } catch (error) {
      logError('Failed to save tunnel info:', error);
    }
  }

  /**
   * Load saved tunnel information
   */
  async loadTunnelInfo(): Promise<TunnelInfo | null> {
    try {
      const data = await fs.readFile(
          path.join(this.dataDir, 'tunnel-info.json'),
          'utf-8'
      );
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}

/**
 * Create and manage a singleton tunnel instance
 */
let tunnelManager: DevTunnelManager | undefined;

export function getTunnelManager(): DevTunnelManager {
  if (!tunnelManager)
    tunnelManager = new DevTunnelManager();

  return tunnelManager;
}

/**
 * Automatically start tunnel on module load if configured
 */
if (process.env.TUNNEL_NAME && process.env.NODE_ENV === 'production') {
  log('Auto-starting dev tunnel...');
  getTunnelManager().start().catch(error => {
    logError('Auto-start failed:', error);
  });
}
