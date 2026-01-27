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

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import debug from 'debug';

const log = debug('darbot:memory');

export interface CrawlState {
  url: string;
  title: string;
  stateHash: string;
  timestamp: number;
  screenshot?: string;
  links: string[];
  visited: boolean;
}

export interface MemoryConfig {
  enabled: boolean;
  connector?: 'darbot-memory-mcp' | 'local';
  storagePath?: string;
  maxStates?: number;
}

export interface MemoryStorage {
  storeState(state: CrawlState): Promise<void>;
  getState(stateHash: string): Promise<CrawlState | null>;
  hasState(stateHash: string): Promise<boolean>;
  getAllStates(): Promise<CrawlState[]>;
  getUnvisitedLinks(): Promise<string[]>;
  clear(): Promise<void>;
}

/**
 * Local file-based memory storage implementation
 */
export class LocalMemoryStorage implements MemoryStorage {
  private readonly storagePath: string;
  private readonly maxStates: number;

  constructor(config: { storagePath?: string; maxStates?: number } = {}) {
    this.storagePath = config.storagePath || path.join(process.cwd(), '.darbot', 'memory');
    this.maxStates = config.maxStates || 1000;
    this.ensureStorageDirectory();
  }

  private ensureStorageDirectory() {
    if (!fs.existsSync(this.storagePath))
      fs.mkdirSync(this.storagePath, { recursive: true });

  }

  private getStatePath(stateHash: string): string {
    return path.join(this.storagePath, `${stateHash}.json`);
  }

  async storeState(state: CrawlState): Promise<void> {
    try {
      const statePath = this.getStatePath(state.stateHash);
      await fs.promises.writeFile(statePath, JSON.stringify(state, null, 2));
      log('Stored state:', state.stateHash, state.url);

      // Clean up old states if we exceed the limit
      await this.cleanupOldStates();
    } catch (error) {
      log('Error storing state:', error);
      throw error;
    }
  }

  async getState(stateHash: string): Promise<CrawlState | null> {
    try {
      const statePath = this.getStatePath(stateHash);
      if (!fs.existsSync(statePath))
        return null;

      const data = await fs.promises.readFile(statePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      log('Error reading state:', error);
      return null;
    }
  }

  async hasState(stateHash: string): Promise<boolean> {
    const statePath = this.getStatePath(stateHash);
    return fs.existsSync(statePath);
  }

  async getAllStates(): Promise<CrawlState[]> {
    try {
      const files = await fs.promises.readdir(this.storagePath);
      const states: CrawlState[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.storagePath, file);
          try {
            const data = await fs.promises.readFile(filePath, 'utf-8');
            states.push(JSON.parse(data));
          } catch (error) {
            log('Error reading state file:', file, error);
          }
        }
      }

      return states.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      log('Error reading states:', error);
      return [];
    }
  }

  async getUnvisitedLinks(): Promise<string[]> {
    const states = await this.getAllStates();
    const visited = new Set(states.filter(s => s.visited).map(s => s.url));
    const allLinks = new Set<string>();

    states.forEach(state => {
      state.links.forEach(link => {
        if (!visited.has(link))
          allLinks.add(link);

      });
    });

    return Array.from(allLinks);
  }

  async clear(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.storagePath);
      await Promise.all(
          files.map(file =>
            fs.promises.unlink(path.join(this.storagePath, file))
          )
      );
      log('Cleared memory storage');
    } catch (error) {
      log('Error clearing storage:', error);
      throw error;
    }
  }

  private async cleanupOldStates(): Promise<void> {
    const states = await this.getAllStates();
    if (states.length <= this.maxStates)
      return;


    // Remove oldest states
    const toRemove = states.slice(0, states.length - this.maxStates);
    await Promise.all(
        toRemove.map(state =>
          fs.promises.unlink(this.getStatePath(state.stateHash)).catch(() => {})
        )
    );
    log(`Cleaned up ${toRemove.length} old states`);
  }
}

/**
 * Darbot Memory MCP connector (placeholder for future implementation)
 */
export class DarbotMemoryStorage implements MemoryStorage {
  constructor(config: { endpoint?: string } = {}) {
    // TODO: Implement darbot-memory-mcp integration
    log('Darbot Memory MCP connector not yet implemented, falling back to local storage');
  }

  async storeState(state: CrawlState): Promise<void> {
    // TODO: Send to darbot-memory-mcp server
    throw new Error('Darbot Memory MCP connector not yet implemented');
  }

  async getState(stateHash: string): Promise<CrawlState | null> {
    // TODO: Query darbot-memory-mcp server
    throw new Error('Darbot Memory MCP connector not yet implemented');
  }

  async hasState(stateHash: string): Promise<boolean> {
    // TODO: Check darbot-memory-mcp server
    throw new Error('Darbot Memory MCP connector not yet implemented');
  }

  async getAllStates(): Promise<CrawlState[]> {
    // TODO: Fetch from darbot-memory-mcp server
    throw new Error('Darbot Memory MCP connector not yet implemented');
  }

  async getUnvisitedLinks(): Promise<string[]> {
    // TODO: Query darbot-memory-mcp server
    throw new Error('Darbot Memory MCP connector not yet implemented');
  }

  async clear(): Promise<void> {
    // TODO: Clear darbot-memory-mcp storage
    throw new Error('Darbot Memory MCP connector not yet implemented');
  }
}

/**
 * Memory manager with optional darbot-memory-mcp integration
 */
export class MemoryManager {
  private storage: MemoryStorage;
  private readonly config: MemoryConfig;

  constructor(config: MemoryConfig = { enabled: true }) {
    this.config = config;

    if (!config.enabled) {
      this.storage = new LocalMemoryStorage(); // Dummy storage that won't be used
      return;
    }

    switch (config.connector) {
      case 'darbot-memory-mcp':
        try {
          this.storage = new DarbotMemoryStorage();
        } catch (error) {
          log('Failed to initialize darbot-memory-mcp connector, falling back to local storage:', error);
          this.storage = new LocalMemoryStorage({
            storagePath: config.storagePath,
            maxStates: config.maxStates
          });
        }
        break;
      case 'local':
      default:
        this.storage = new LocalMemoryStorage({
          storagePath: config.storagePath,
          maxStates: config.maxStates
        });
        break;
    }
  }

  /**
   * Generate a hash for the current page state
   */
  static stateHash(domSnapshot: string): string {
    return crypto.createHash('sha256').update(domSnapshot).digest('hex').substring(0, 16);
  }

  /**
   * Store a crawl state with screenshot
   */
  async storeState(
    url: string,
    title: string,
    domSnapshot: string,
    screenshot?: Buffer,
    links: string[] = []
  ): Promise<string> {
    if (!this.config.enabled)
      return '';


    const stateHash = MemoryManager.stateHash(domSnapshot);
    let screenshotPath: string | undefined;

    // Save screenshot if provided
    if (screenshot) {
      const screenshotDir = path.join(process.cwd(), '.darbot', 'screenshots');
      if (!fs.existsSync(screenshotDir))
        fs.mkdirSync(screenshotDir, { recursive: true });

      screenshotPath = path.join(screenshotDir, `${stateHash}.png`);
      await fs.promises.writeFile(screenshotPath, screenshot);
    }

    const state: CrawlState = {
      url,
      title,
      stateHash,
      timestamp: Date.now(),
      screenshot: screenshotPath,
      links,
      visited: true
    };

    await this.storage.storeState(state);
    return stateHash;
  }

  /**
   * Check if we've seen this state before
   */
  async hasState(domSnapshot: string): Promise<boolean> {
    if (!this.config.enabled)
      return false;


    const stateHash = MemoryManager.stateHash(domSnapshot);
    return await this.storage.hasState(stateHash);
  }

  /**
   * Get a stored state by hash
   */
  async getState(stateHash: string): Promise<CrawlState | null> {
    if (!this.config.enabled)
      return null;


    return await this.storage.getState(stateHash);
  }

  /**
   * Get all stored states
   */
  async getAllStates(): Promise<CrawlState[]> {
    if (!this.config.enabled)
      return [];


    return await this.storage.getAllStates();
  }

  /**
   * Get unvisited links for BFS crawling
   */
  async getUnvisitedLinks(): Promise<string[]> {
    if (!this.config.enabled)
      return [];


    return await this.storage.getUnvisitedLinks();
  }

  /**
   * Clear all stored states
   */
  async clear(): Promise<void> {
    if (!this.config.enabled)
      return;


    await this.storage.clear();
  }

  /**
   * Check if memory is enabled
   */
  get enabled(): boolean {
    return this.config.enabled;
  }
}
