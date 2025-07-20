/**
 * Copyright (c) Microsoft Corporation.
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

import fs from 'node:fs';
import path from 'node:path';
import debug from 'debug';
import type { CrawlState } from './memory.js';

const log = debug('darbot:reporter');

export interface CrawlReport {
  sessionId: string;
  startTime: number;
  endTime: number;
  startUrl: string;
  goal?: string;
  stats: {
    pagesVisited: number;
    totalLinks: number;
    maxDepth: number;
    duration: number;
    screenshots: number;
    errors: number;
  };
  states: CrawlState[];
  errors: Array<{ url: string; error: string; timestamp: number }>;
  graph: {
    nodes: Array<{ id: string; label: string; url: string; depth: number; visited: boolean }>;
    edges: Array<{ from: string; to: string; label?: string }>;
  };
}

export interface ReporterConfig {
  outputDir: string;
  generateHTML: boolean;
  generateJSON: boolean;
  includeScreenshots: boolean;
  templatePath?: string;
}

/**
 * Report generator for autonomous crawling sessions
 */
export class CrawlReporter {
  private readonly config: ReporterConfig;
  private readonly report: CrawlReport;
  private readonly errors: Array<{ url: string; error: string; timestamp: number }> = [];

  constructor(
    sessionId: string,
    startUrl: string,
    goal: string | undefined,
    config: Partial<ReporterConfig> = {}
  ) {
    this.config = {
      outputDir: path.join(process.cwd(), '.darbot', 'reports'),
      generateHTML: true,
      generateJSON: true,
      includeScreenshots: true,
      ...config
    };

    this.report = {
      sessionId,
      startTime: Date.now(),
      endTime: 0,
      startUrl,
      goal,
      stats: {
        pagesVisited: 0,
        totalLinks: 0,
        maxDepth: 0,
        duration: 0,
        screenshots: 0,
        errors: 0
      },
      states: [],
      errors: [],
      graph: {
        nodes: [],
        edges: []
      }
    };

    this.ensureOutputDirectory();
  }

  /**
   * Add a crawled state to the report
   */
  addState(state: CrawlState): void {
    this.report.states.push(state);
    this.updateStats();
    this.updateGraph(state);
  }

  /**
   * Add an error to the report
   */
  addError(url: string, error: string): void {
    const errorEntry = { url, error, timestamp: Date.now() };
    this.errors.push(errorEntry);
    this.report.errors.push(errorEntry);
    this.report.stats.errors++;
  }

  /**
   * Finalize and generate the report
   */
  async generateReport(): Promise<string> {
    this.report.endTime = Date.now();
    this.report.stats.duration = this.report.endTime - this.report.startTime;

    const reportDir = path.join(this.config.outputDir, this.report.sessionId);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    let reportPath = '';

    // Generate JSON report
    if (this.config.generateJSON) {
      const jsonPath = path.join(reportDir, 'report.json');
      await fs.promises.writeFile(jsonPath, JSON.stringify(this.report, null, 2));
      log('Generated JSON report:', jsonPath);
    }

    // Generate HTML report
    if (this.config.generateHTML) {
      reportPath = path.join(reportDir, 'report.html');
      const htmlContent = this.generateHTML();
      await fs.promises.writeFile(reportPath, htmlContent);
      log('Generated HTML report:', reportPath);
    }

    // Copy screenshots to report directory if enabled
    if (this.config.includeScreenshots) {
      await this.copyScreenshots(reportDir);
    }

    return reportPath;
  }

  /**
   * Update statistics based on current states
   */
  private updateStats(): void {
    const stats = this.report.stats;
    stats.pagesVisited = this.report.states.filter(s => s.visited).length;
    stats.totalLinks = this.report.states.reduce((sum, state) => sum + state.links.length, 0);
    stats.maxDepth = Math.max(...this.report.states.map(s => this.getDepthFromUrl(s.url)));
    stats.screenshots = this.report.states.filter(s => s.screenshot).length;
  }

  /**
   * Update the graph representation
   */
  private updateGraph(state: CrawlState): void {
    const { nodes, edges } = this.report.graph;

    // Add node if not exists
    if (!nodes.find(n => n.url === state.url)) {
      nodes.push({
        id: state.stateHash,
        label: state.title || state.url,
        url: state.url,
        depth: this.getDepthFromUrl(state.url),
        visited: state.visited
      });
    }

    // Add edges for links
    state.links.forEach(link => {
      const linkHash = this.hashUrl(link);
      if (!edges.find(e => e.from === state.stateHash && e.to === linkHash)) {
        edges.push({
          from: state.stateHash,
          to: linkHash
        });
      }
    });
  }

  /**
   * Generate HTML report content
   */
  private generateHTML(): string {
    const template = this.config.templatePath ? 
      this.loadTemplate() : 
      this.getDefaultTemplate();

    return template
      .replace('{{SESSION_ID}}', this.report.sessionId)
      .replace('{{START_URL}}', this.report.startUrl)
      .replace('{{GOAL}}', this.report.goal || 'Autonomous exploration')
      .replace('{{START_TIME}}', new Date(this.report.startTime).toISOString())
      .replace('{{END_TIME}}', new Date(this.report.endTime).toISOString())
      .replace('{{DURATION}}', this.formatDuration(this.report.stats.duration))
      .replace('{{PAGES_VISITED}}', this.report.stats.pagesVisited.toString())
      .replace('{{TOTAL_LINKS}}', this.report.stats.totalLinks.toString())
      .replace('{{MAX_DEPTH}}', this.report.stats.maxDepth.toString())
      .replace('{{SCREENSHOTS}}', this.report.stats.screenshots.toString())
      .replace('{{ERRORS}}', this.report.stats.errors.toString())
      .replace('{{STATES_TABLE}}', this.generateStatesTable())
      .replace('{{ERRORS_TABLE}}', this.generateErrorsTable())
      .replace('{{GRAPH_DATA}}', JSON.stringify(this.report.graph))
      .replace('{{SCREENSHOT_GALLERY}}', this.generateScreenshotGallery());
  }

  /**
   * Load custom template
   */
  private loadTemplate(): string {
    try {
      return fs.readFileSync(this.config.templatePath!, 'utf-8');
    } catch (error) {
      log('Failed to load template, using default:', error);
      return this.getDefaultTemplate();
    }
  }

  /**
   * Get default HTML template
   */
  private getDefaultTemplate(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Darbot Crawl Report - {{SESSION_ID}}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        .section {
            background: white;
            margin: 20px 0;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        .url {
            color: #667eea;
            text-decoration: none;
            word-break: break-all;
        }
        .url:hover {
            text-decoration: underline;
        }
        .error {
            color: #e74c3c;
        }
        .screenshot-gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .screenshot-item {
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
        }
        .screenshot-item img {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }
        .screenshot-info {
            padding: 15px;
            background: #f8f9fa;
        }
        .graph-container {
            height: 400px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 Darbot Crawl Report</h1>
        <p><strong>Session:</strong> {{SESSION_ID}}</p>
        <p><strong>Start URL:</strong> <a href="{{START_URL}}" class="url" style="color: white;">{{START_URL}}</a></p>
        <p><strong>Goal:</strong> {{GOAL}}</p>
        <p><strong>Duration:</strong> {{DURATION}} ({{START_TIME}} - {{END_TIME}})</p>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-number">{{PAGES_VISITED}}</div>
            <div>Pages Visited</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">{{TOTAL_LINKS}}</div>
            <div>Total Links</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">{{MAX_DEPTH}}</div>
            <div>Max Depth</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">{{SCREENSHOTS}}</div>
            <div>Screenshots</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">{{ERRORS}}</div>
            <div>Errors</div>
        </div>
    </div>

    <div class="section">
        <h2>📋 Crawled Pages</h2>
        {{STATES_TABLE}}
    </div>

    <div class="section">
        <h2>❌ Errors</h2>
        {{ERRORS_TABLE}}
    </div>

    <div class="section">
        <h2>🕸️ Site Graph</h2>
        <div class="graph-container">
            Graph visualization would be rendered here with a library like D3.js or vis.js
            <br>
            Graph data: {{GRAPH_DATA}}
        </div>
    </div>

    <div class="section">
        <h2>📸 Screenshot Gallery</h2>
        {{SCREENSHOT_GALLERY}}
    </div>
</body>
</html>`;
  }

  /**
   * Generate states table HTML
   */
  private generateStatesTable(): string {
    if (this.report.states.length === 0) {
      return '<p>No pages visited.</p>';
    }

    let html = `<table>
      <thead>
        <tr>
          <th>URL</th>
          <th>Title</th>
          <th>Timestamp</th>
          <th>Links</th>
          <th>Screenshot</th>
        </tr>
      </thead>
      <tbody>`;

    this.report.states.forEach(state => {
      html += `
        <tr>
          <td><a href="${state.url}" class="url" target="_blank">${state.url}</a></td>
          <td>${state.title || 'Untitled'}</td>
          <td>${new Date(state.timestamp).toLocaleString()}</td>
          <td>${state.links.length}</td>
          <td>${state.screenshot ? '✅' : '❌'}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    return html;
  }

  /**
   * Generate errors table HTML
   */
  private generateErrorsTable(): string {
    if (this.report.errors.length === 0) {
      return '<p>No errors encountered during crawling.</p>';
    }

    let html = `<table>
      <thead>
        <tr>
          <th>URL</th>
          <th>Error</th>
          <th>Timestamp</th>
        </tr>
      </thead>
      <tbody>`;

    this.report.errors.forEach(error => {
      html += `
        <tr>
          <td><a href="${error.url}" class="url" target="_blank">${error.url}</a></td>
          <td class="error">${error.error}</td>
          <td>${new Date(error.timestamp).toLocaleString()}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    return html;
  }

  /**
   * Generate screenshot gallery HTML
   */
  private generateScreenshotGallery(): string {
    const statesWithScreenshots = this.report.states.filter(s => s.screenshot);
    
    if (statesWithScreenshots.length === 0) {
      return '<p>No screenshots available.</p>';
    }

    let html = '<div class="screenshot-gallery">';
    
    statesWithScreenshots.forEach(state => {
      const screenshotName = path.basename(state.screenshot!);
      html += `
        <div class="screenshot-item">
          <img src="screenshots/${screenshotName}" alt="Screenshot of ${state.title || state.url}">
          <div class="screenshot-info">
            <strong>${state.title || 'Untitled'}</strong><br>
            <a href="${state.url}" class="url" target="_blank">${state.url}</a><br>
            <small>${new Date(state.timestamp).toLocaleString()}</small>
          </div>
        </div>`;
    });
    
    html += '</div>';
    return html;
  }

  /**
   * Copy screenshots to report directory
   */
  private async copyScreenshots(reportDir: string): Promise<void> {
    const screenshotsDir = path.join(reportDir, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    for (const state of this.report.states) {
      if (state.screenshot && fs.existsSync(state.screenshot)) {
        const fileName = path.basename(state.screenshot);
        const destPath = path.join(screenshotsDir, fileName);
        try {
          await fs.promises.copyFile(state.screenshot, destPath);
        } catch (error) {
          log('Failed to copy screenshot:', error);
        }
      }
    }
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get depth from URL (simple heuristic)
   */
  private getDepthFromUrl(url: string): number {
    try {
      return new URL(url).pathname.split('/').filter(segment => segment.length > 0).length;
    } catch {
      return 0;
    }
  }

  /**
   * Simple hash function for URLs
   */
  private hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}