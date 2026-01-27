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
 * Darbot Browser MCP Bridge Extension - Service Worker
 * Version: 1.3.0
 * 
 * Chrome/Edge Extension that bridges CDP messages between chrome.debugger and 
 * Darbot Browser MCP server through WebSocket connection.
 */

// @ts-check

/** @constant {string} */
const EXTENSION_VERSION = '1.3.0';

/** @constant {number} Connection timeout in milliseconds */
const CONNECTION_TIMEOUT_MS = 10000;

/** @constant {number} Maximum reconnection attempts */
const MAX_RECONNECT_ATTEMPTS = 3;

/** @constant {number} Reconnection delay in milliseconds */
const RECONNECT_DELAY_MS = 1000;

/**
 * Extended Debuggee type that includes optional sessionId from CDP
 * @typedef {chrome.debugger.Debuggee & {sessionId?: string}} DebuggeeWithSession
 */

/**
 * @typedef {Object} Connection
 * @property {chrome.debugger.Debuggee} debuggee
 * @property {WebSocket} socket
 * @property {number} tabId
 * @property {string} sessionId
 * @property {string} bridgeUrl
 * @property {number} reconnectAttempts
 * @property {((source: DebuggeeWithSession, method: string, params?: Object) => void)|undefined} [eventListener]
 * @property {((source: chrome.debugger.Debuggee, reason: string) => void)|undefined} [detachListener]
 */

/**
 * Debug logging utility - enabled via storage setting
 * @param {...any} args
 */
function debugLog(...args) {
  // Enable debug logging by setting debugEnabled in chrome.storage.local
  chrome.storage.local.get(['debugEnabled'], (result) => {
    if (result.debugEnabled) {
      console.log(`[Darbot MCP Bridge v${EXTENSION_VERSION}]`, ...args);
    }
  });
}

class TabShareExtension {
  constructor() {
    /** @type {Map<number, Connection>} */
    this.activeConnections = new Map(); // tabId -> connection info

    // Remove page action click handler since we now use popup
    chrome.tabs.onRemoved.addListener(this.onTabRemoved.bind(this));

    // Handle messages from popup
    chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
    
    // Log extension startup
    debugLog('Extension initialized');
  }

  /**
   * Handle messages from popup
   * @param {any} message
   * @param {chrome.runtime.MessageSender} sender
   * @param {Function} sendResponse
   */
  onMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'getStatus':
        this.getStatus(message.tabId, sendResponse);
        return true; // Will respond asynchronously

      case 'connect':
        this.connectTab(message.tabId, message.bridgeUrl).then(
          () => sendResponse({ success: true }),
          (error) => sendResponse({ success: false, error: error.message })
        );
        return true; // Will respond asynchronously

      case 'disconnect':
        this.disconnectTab(message.tabId).then(
          () => sendResponse({ success: true }),
          (error) => sendResponse({ success: false, error: error.message })
        );
        return true; // Will respond asynchronously
    }
    return false;
  }

  /**
   * Get connection status for popup
   * @param {number} requestedTabId
   * @param {Function} sendResponse
   */
  getStatus(requestedTabId, sendResponse) {
    const isConnected = this.activeConnections.size > 0;
    /** @type {number|null} */
    let activeTabId = null;
    /** @type {{title: string|undefined, url: string|undefined}|null} */
    let activeTabInfo = null;

    if (isConnected) {
      const entry = this.activeConnections.entries().next().value;
      if (!entry) {
        sendResponse({ isConnected: false, error: 'No active connection found' });
        return;
      }
      const [tabId, connection] = /** @type {[number, Connection]} */ (entry);
      activeTabId = tabId;

      // Get tab info
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            isConnected: false,
            error: 'Active tab not found'
          });
        } else {
          sendResponse({
            isConnected: true,
            activeTabId,
            activeTabInfo: {
              title: tab.title,
              url: tab.url
            }
          });
        }
      });
    } else {
      sendResponse({
        isConnected: false,
        activeTabId: null,
        activeTabInfo: null
      });
    }
  }

  /**
   * Connect a tab to the bridge server
   * @param {number} tabId
   * @param {string} bridgeUrl
   * @param {number} [reconnectAttempt=0]
   */
  async connectTab(tabId, bridgeUrl, reconnectAttempt = 0) {
    try {
      debugLog(`Connecting tab ${tabId} to bridge at ${bridgeUrl} (attempt ${reconnectAttempt + 1})`);

      // Attach chrome debugger
      const debuggee = { tabId };
      await chrome.debugger.attach(debuggee, '1.3');

      if (chrome.runtime.lastError)
        throw new Error(chrome.runtime.lastError.message);
      const targetInfo = /** @type {any} */ (await chrome.debugger.sendCommand(debuggee, 'Target.getTargetInfo'));
      debugLog('Target info:', targetInfo);

      // Connect to bridge server with increased timeout
      const socket = new WebSocket(bridgeUrl);

      /** @type {Connection} */
      const connection = {
        debuggee,
        socket,
        tabId,
        sessionId: `pw-tab-${tabId}`,
        bridgeUrl,
        reconnectAttempts: reconnectAttempt
      };

      await new Promise((resolve, reject) => {
        socket.onopen = () => {
          debugLog(`WebSocket connected for tab ${tabId}`);
          // Send initial connection info to bridge with version
          socket.send(JSON.stringify({
            type: 'connection_info',
            sessionId: connection.sessionId,
            targetInfo: targetInfo?.targetInfo,
            extensionVersion: EXTENSION_VERSION
          }));
          resolve(undefined);
        };
        socket.onerror = (error) => {
          debugLog('WebSocket error during connect:', error);
          reject(new Error('WebSocket connection failed'));
        };
        setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT_MS);
      });

      // Set up message handling
      this.setupMessageHandling(connection);

      // Store connection
      this.activeConnections.set(tabId, connection);

      // Update UI
      chrome.action.setBadgeText({ tabId, text: '●' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#4CAF50' });
      chrome.action.setTitle({ tabId, title: 'Disconnect from Browser MCP' });

      debugLog(`Tab ${tabId} connected successfully`);

    } catch (err) {
      const error = /** @type {Error} */ (err);
      debugLog(`Failed to connect tab ${tabId}:`, error.message);
      await this.cleanupConnection(tabId);

      // Show error to user
      chrome.action.setBadgeText({ tabId, text: '!' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#F44336' });
      chrome.action.setTitle({ tabId, title: `Connection failed: ${error.message}` });

      throw error; // Re-throw for popup to handle
    }
  }

  /**
   * Set up bidirectional message handling between debugger and WebSocket
   * @param {Connection} connection
   */
  setupMessageHandling(connection) {
    const { debuggee, socket, tabId, sessionId: rootSessionId } = connection;

    // WebSocket -> chrome.debugger
    socket.onmessage = async (/** @type {MessageEvent} */ event) => {
      /** @type {any} */
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (err) {
        const error = /** @type {Error} */ (err);
        debugLog('Error parsing message:', error);
        socket.send(JSON.stringify({
          error: {
            code: -32700,
            message: `Error parsing message: ${error.message}`
          }
        }));
        return;
      }

      try {
        debugLog('Received from bridge:', message);

        /** @type {DebuggeeWithSession} */
        const debuggerSession = { ...debuggee };
        const sessionId = message.sessionId;
        // Pass session id, unless it's the root session.
        if (sessionId && sessionId !== rootSessionId)
          debuggerSession.sessionId = sessionId;

        // Forward CDP command to chrome.debugger
        const result = await chrome.debugger.sendCommand(
          debuggerSession,
          message.method,
          message.params || {}
        );

        // Send response back to bridge
        /** @type {{id: any, sessionId: any, result: Object|undefined, error?: {code: number, message: string|undefined}}} */
        const response = {
          id: message.id,
          sessionId,
          result
        };

        if (chrome.runtime.lastError) {
          response.error = {
            code: -32000,
            message: chrome.runtime.lastError.message,
          };
        }

        socket.send(JSON.stringify(response));
      } catch (err) {
        const error = /** @type {Error} */ (err);
        debugLog('Error processing WebSocket message:', error);
        const response = {
          id: message.id,
          sessionId: message.sessionId,
          error: {
            code: -32000,
            message: error.message,
          },
        };
        socket.send(JSON.stringify(response));
      }
    };

    // chrome.debugger events -> WebSocket
    /** @type {(source: DebuggeeWithSession, method: string, params?: Object) => void} */
    const eventListener = (source, method, params) => {
      if (source.tabId === tabId && socket.readyState === WebSocket.OPEN) {
        // If the sessionId is not provided, use the root sessionId.
        const event = {
          sessionId: source.sessionId || rootSessionId,
          method,
          params,
        };
        debugLog('Forwarding CDP event:', event);
        socket.send(JSON.stringify(event));
      }
    };

    /** @type {(source: chrome.debugger.Debuggee, reason: string) => void} */
    const detachListener = (source, reason) => {
      if (source.tabId === tabId) {
        debugLog(`Debugger detached from tab ${tabId}, reason: ${reason}`);
        this.disconnectTab(tabId);
      }
    };

    // Store listeners for cleanup
    connection.eventListener = eventListener;
    connection.detachListener = detachListener;

    chrome.debugger.onEvent.addListener(eventListener);
    chrome.debugger.onDetach.addListener(detachListener);

    // Handle WebSocket close - with reconnection logic
    socket.onclose = (/** @type {CloseEvent} */ event) => {
      debugLog(`WebSocket closed for tab ${tabId}, code: ${event.code}, reason: ${event.reason}`);
      
      // Attempt reconnection if not a clean close and under max attempts
      const conn = this.activeConnections.get(tabId);
      if (conn && event.code !== 1000 && conn.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        debugLog(`Attempting reconnection (${conn.reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => {
          this.connectTab(tabId, conn.bridgeUrl, conn.reconnectAttempts + 1).catch((err) => {
            debugLog('Reconnection failed:', err.message);
            this.disconnectTab(tabId);
          });
        }, RECONNECT_DELAY_MS);
      } else {
        this.disconnectTab(tabId);
      }
    };

    socket.onerror = (/** @type {Event} */ error) => {
      debugLog(`WebSocket error for tab ${tabId}:`, error);
      // Error handling is done in onclose
    };
  }

  /**
   * Disconnect a tab from the bridge
   * @param {number} tabId
   */
  async disconnectTab(tabId) {
    await this.cleanupConnection(tabId);

    // Update UI
    chrome.action.setBadgeText({ tabId, text: '' });
    chrome.action.setTitle({ tabId, title: 'Share tab with Browser MCP' });

    debugLog(`Tab ${tabId} disconnected`);
  }

  /**
   * Clean up connection resources
   * @param {number} tabId
   */
  async cleanupConnection(tabId) {
    const connection = this.activeConnections.get(tabId);
    if (!connection) return;

    // Remove listeners
    if (connection.eventListener) {
      chrome.debugger.onEvent.removeListener(connection.eventListener);
    }
    if (connection.detachListener) {
      chrome.debugger.onDetach.removeListener(connection.detachListener);
    }

    // Close WebSocket
    if (connection.socket && connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.close();
    }

    // Detach debugger
    try {
      await chrome.debugger.detach(connection.debuggee);
    } catch (error) {
      // Ignore detach errors - might already be detached
    }

    this.activeConnections.delete(tabId);
  }

  /**
   * Handle tab removal
   * @param {number} tabId
   */
  async onTabRemoved(tabId) {
    if (this.activeConnections.has(tabId)) {
      await this.cleanupConnection(tabId);
    }
  }
}

new TabShareExtension();
