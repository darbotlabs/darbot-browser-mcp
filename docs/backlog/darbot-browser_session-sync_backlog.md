# Darbot Browser MCP - Session State Sync Specification

**Created**: January 23, 2026  
**Status**: Draft  
**Priority**: P2 - Cross-Deployment Session Continuity  
**Depends On**: darbot-browser-hosted, darbot-browser-cloud

---

## Overview

Enable seamless session state synchronization between Darbot Browser MCP deployments (Cloud ↔ Hosted ↔ Multiple Hosted Nodes) using peer-to-peer directory-based sync without external cloud storage backends.

### Use Cases

1. **Cloud → Hosted Resume**: Start a browser session on Azure cloud, resume it on local Docker
2. **Hosted → Cloud Resume**: Start on local Docker, continue on Azure cloud  
3. **Hosted → Hosted Resume**: Transfer session between different on-premises servers
4. **Multi-Device Continuity**: Resume sessions across workstations

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Session Sync Protocol                         │
│                                                                   │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │  Cloud Node  │◄────►│  Sync Index  │◄────►│ Hosted Node  │    │
│  │   (Azure)    │     │   Service    │     │   (Docker)   │    │
│  └──────┬───────┘     └──────────────┘     └──────┬───────┘    │
│         │                                          │            │
│         ▼                                          ▼            │
│  ┌──────────────┐                         ┌──────────────┐     │
│  │ /data/sync/  │                         │ /data/sync/  │     │
│  │  sessions/   │◄─────── P2P Sync ──────►│  sessions/   │     │
│  │  index.json  │                         │  index.json  │     │
│  └──────────────┘                         └──────────────┘     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Session State** | Serialized browser state (cookies, localStorage, URL, viewport) |
| **Sync Index** | JSON manifest of available sessions with metadata |
| **Node Registry** | List of authenticated peer nodes |
| **Sync Protocol** | HTTP-based P2P transfer using MCP authentication |

---

## Data Structures

### Session State File Format

**Location**: `/data/sync/sessions/{session-id}.json`

```typescript
interface SyncableSessionState {
  // Identity
  id: string;                          // UUID
  name: string;                        // User-friendly name
  description?: string;                // Optional description
  
  // Origin
  origin: {
    nodeId: string;                    // Source node identifier
    nodeType: 'cloud' | 'hosted';      // Deployment type
    nodeUrl: string;                   // Base URL of origin node
    createdAt: string;                 // ISO timestamp
    createdBy: string;                 // User/account identifier
  };
  
  // Sync metadata
  sync: {
    version: number;                   // Incremental version for conflict resolution
    lastModified: string;              // ISO timestamp
    lastSyncedTo: string[];            // Node IDs that have this version
    checksum: string;                  // SHA-256 of state data
  };
  
  // Browser state
  state: {
    url: string;                       // Current page URL
    title: string;                     // Page title
    viewport: {
      width: number;
      height: number;
    };
    cookies: Cookie[];                 // Serialized cookies
    localStorage: Record<string, string>;
    sessionStorage: Record<string, string>;
    indexedDB?: string;                // Base64 encoded (optional)
  };
  
  // Tab state (if multi-tab)
  tabs?: Array<{
    id: string;
    url: string;
    title: string;
    active: boolean;
  }>;
  
  // Screenshots (optional, for preview)
  preview?: {
    thumbnail: string;                 // Base64 PNG (320x180)
    fullPage?: string;                 // Base64 PNG (optional)
  };
}

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}
```

### Node Registry Format

**Location**: `/data/sync/nodes.json`

```typescript
interface NodeRegistry {
  self: {
    nodeId: string;                    // This node's unique ID
    nodeType: 'cloud' | 'hosted';
    publicUrl?: string;                // External URL if accessible
    internalUrl: string;               // Internal network URL
  };
  
  peers: Array<{
    nodeId: string;
    nodeType: 'cloud' | 'hosted';
    url: string;
    name: string;                      // Friendly name
    lastSeen: string;                  // ISO timestamp
    lastSync: string;                  // Last successful sync
    status: 'online' | 'offline' | 'unknown';
    authMethod: 'msal' | 'apikey' | 'tunnel';
  }>;
  
  syncConfig: {
    autoSync: boolean;                 // Auto-sync on session save
    syncInterval: number;              // Polling interval (ms)
    conflictResolution: 'latest-wins' | 'manual' | 'merge';
  };
}
```

### Sync Index Format

**Location**: `/data/sync/index.json`

```typescript
interface SyncIndex {
  nodeId: string;
  lastUpdated: string;
  
  sessions: Array<{
    id: string;
    name: string;
    version: number;
    checksum: string;
    lastModified: string;
    originNodeId: string;
    size: number;                      // File size in bytes
  }>;
}
```

---

## Implementation Tasks

### Phase 1: Core Data Layer

#### Task 1.1: Create Session Sync Data Models
**Priority**: P1  
**Estimated Time**: 45 minutes  
**File**: `src/sync/models.ts`

```typescript
// Create TypeScript interfaces for all data structures
// Add Zod schemas for validation
// Export serialization/deserialization helpers
```

**Acceptance Criteria**:
- [ ] All interfaces defined with full type safety
- [ ] Zod schemas for runtime validation
- [ ] JSON serialization helpers
- [ ] Checksum calculation utility

---

#### Task 1.2: Create Sync Directory Manager
**Priority**: P1  
**Estimated Time**: 30 minutes  
**File**: `src/sync/directory.ts`

```typescript
export class SyncDirectoryManager {
  constructor(basePath: string);
  
  async initialize(): Promise<void>;
  async ensureDirectories(): Promise<void>;
  
  // Session operations
  async saveSession(session: SyncableSessionState): Promise<void>;
  async loadSession(sessionId: string): Promise<SyncableSessionState | null>;
  async deleteSession(sessionId: string): Promise<void>;
  async listSessions(): Promise<SyncIndex>;
  
  // Node registry
  async loadNodeRegistry(): Promise<NodeRegistry>;
  async saveNodeRegistry(registry: NodeRegistry): Promise<void>;
  
  // Index management
  async rebuildIndex(): Promise<SyncIndex>;
  async getIndex(): Promise<SyncIndex>;
}
```

**Acceptance Criteria**:
- [ ] Creates `/data/sync/sessions/` directory structure
- [ ] Atomic file writes (write to temp, rename)
- [ ] File locking for concurrent access
- [ ] Index auto-rebuild on corruption

---

#### Task 1.3: Create Session State Serializer
**Priority**: P1  
**Estimated Time**: 45 minutes  
**File**: `src/sync/serializer.ts`

```typescript
export class SessionStateSerializer {
  // Convert Playwright browser context to syncable state
  async captureState(context: BrowserContext, page: Page): Promise<SyncableSessionState>;
  
  // Restore state to a browser context
  async restoreState(context: BrowserContext, state: SyncableSessionState): Promise<void>;
  
  // Generate preview thumbnail
  async capturePreview(page: Page): Promise<string>;
  
  // Calculate state checksum
  calculateChecksum(state: SyncableSessionState): string;
}
```

**Acceptance Criteria**:
- [ ] Captures all cookies from context
- [ ] Captures localStorage and sessionStorage
- [ ] Generates 320x180 thumbnail
- [ ] Restores state with cookie domain validation
- [ ] SHA-256 checksum for integrity

---

### Phase 2: Node Discovery & Authentication

#### Task 2.1: Create Node Identity Manager
**Priority**: P1  
**Estimated Time**: 30 minutes  
**File**: `src/sync/identity.ts`

```typescript
export class NodeIdentityManager {
  constructor(config: FullConfig);
  
  // Generate or load node identity
  async getOrCreateNodeId(): Promise<string>;
  
  // Get node info
  getNodeInfo(): NodeInfo;
  
  // Sign data for peer verification
  signData(data: string): string;
  
  // Verify signature from peer
  verifySignature(data: string, signature: string, peerId: string): boolean;
}
```

**Acceptance Criteria**:
- [ ] Persistent node ID across restarts
- [ ] Node type detection (cloud vs hosted)
- [ ] HMAC signing for data integrity

---

#### Task 2.2: Create Peer Discovery Service
**Priority**: P1  
**Estimated Time**: 1 hour  
**File**: `src/sync/discovery.ts`

```typescript
export class PeerDiscoveryService {
  constructor(identity: NodeIdentityManager, registry: NodeRegistry);
  
  // Register a peer node manually
  async registerPeer(peerUrl: string, authMethod: string): Promise<PeerInfo>;
  
  // Remove a peer
  async unregisterPeer(nodeId: string): Promise<void>;
  
  // Check peer status
  async pingPeer(nodeId: string): Promise<PeerStatus>;
  
  // Refresh all peer statuses
  async refreshPeerStatuses(): Promise<void>;
  
  // Get authenticated peers
  async getAuthenticatedPeers(): Promise<PeerInfo[]>;
}
```

**Acceptance Criteria**:
- [ ] Manual peer registration via URL
- [ ] Health check via `/health` endpoint
- [ ] Authentication validation per peer
- [ ] Status caching with TTL

---

#### Task 2.3: Create Authentication Bridge
**Priority**: P1  
**Estimated Time**: 45 minutes  
**File**: `src/sync/auth-bridge.ts`

```typescript
export class SyncAuthBridge {
  constructor(config: FullConfig);
  
  // Get auth headers for peer request
  async getAuthHeaders(peer: PeerInfo): Promise<Record<string, string>>;
  
  // Validate incoming sync request
  async validateSyncRequest(request: Request): Promise<AuthResult>;
  
  // Support multiple auth methods
  private async getMsalToken(): Promise<string>;
  private async getApiKey(): Promise<string>;
  private async getTunnelAuth(): Promise<string>;
}
```

**Acceptance Criteria**:
- [ ] MSAL token acquisition for cloud peers
- [ ] API key support for hosted peers
- [ ] Tunnel authentication for dev tunnels
- [ ] Token caching and refresh

---

### Phase 3: Sync Protocol Implementation

#### Task 3.1: Create Sync HTTP Endpoints
**Priority**: P1  
**Estimated Time**: 1.5 hours  
**File**: `src/sync/routes.ts`

```typescript
// Add to HTTP server routes

// GET /sync/index - Get local sync index
// GET /sync/sessions/:id - Download session state
// POST /sync/sessions - Upload session state
// DELETE /sync/sessions/:id - Delete session
// GET /sync/peers - List registered peers
// POST /sync/peers - Register new peer
// DELETE /sync/peers/:nodeId - Unregister peer
// POST /sync/pull/:nodeId/:sessionId - Pull session from peer
// POST /sync/push/:nodeId/:sessionId - Push session to peer
```

**Acceptance Criteria**:
- [ ] All endpoints require authentication
- [ ] Rate limiting per peer
- [ ] Request/response logging
- [ ] Error handling with proper codes

---

#### Task 3.2: Create Sync Client
**Priority**: P1  
**Estimated Time**: 1 hour  
**File**: `src/sync/client.ts`

```typescript
export class SyncClient {
  constructor(authBridge: SyncAuthBridge);
  
  // Fetch remote index
  async fetchRemoteIndex(peer: PeerInfo): Promise<SyncIndex>;
  
  // Download session from peer
  async pullSession(peer: PeerInfo, sessionId: string): Promise<SyncableSessionState>;
  
  // Upload session to peer
  async pushSession(peer: PeerInfo, session: SyncableSessionState): Promise<void>;
  
  // Compare local and remote indexes
  async compareIndexes(local: SyncIndex, remote: SyncIndex): Promise<SyncDiff>;
  
  // Batch sync operations
  async syncWithPeer(peer: PeerInfo, direction: 'pull' | 'push' | 'bidirectional'): Promise<SyncResult>;
}
```

**Acceptance Criteria**:
- [ ] HTTP client with retry logic
- [ ] Checksum verification on download
- [ ] Progress reporting for large sessions
- [ ] Bandwidth throttling option

---

#### Task 3.3: Create Conflict Resolution Engine
**Priority**: P2  
**Estimated Time**: 45 minutes  
**File**: `src/sync/conflicts.ts`

```typescript
export class ConflictResolver {
  constructor(strategy: 'latest-wins' | 'manual' | 'merge');
  
  // Detect conflicts between versions
  detectConflict(local: SyncableSessionState, remote: SyncableSessionState): ConflictInfo | null;
  
  // Resolve conflict automatically
  autoResolve(local: SyncableSessionState, remote: SyncableSessionState): SyncableSessionState;
  
  // Generate merge of two states
  mergeStates(local: SyncableSessionState, remote: SyncableSessionState): SyncableSessionState;
}
```

**Acceptance Criteria**:
- [ ] Version comparison logic
- [ ] Latest-wins based on timestamp
- [ ] Cookie merge (union with latest value)
- [ ] localStorage merge (union with latest value)

---

### Phase 4: MCP Tool Integration

#### Task 4.1: Create Sync MCP Tools
**Priority**: P1  
**Estimated Time**: 2 hours  
**File**: `src/tools/sync.ts`

```typescript
// browser_sync_list_peers
// List all registered peer nodes with status
const listPeers = defineTool({
  name: 'browser_sync_list_peers',
  description: 'List all registered peer nodes for session sync',
  inputSchema: z.object({}),
  handle: async (context) => {
    // Return list of peers with online/offline status
  }
});

// browser_sync_register_peer
// Register a new peer node
const registerPeer = defineTool({
  name: 'browser_sync_register_peer',
  description: 'Register a peer node for session sync (cloud or hosted)',
  inputSchema: z.object({
    url: z.string().url(),
    name: z.string(),
    authMethod: z.enum(['msal', 'apikey', 'tunnel']),
  }),
  handle: async (context, params) => {
    // Validate peer, add to registry
  }
});

// browser_sync_list_remote_sessions
// List sessions available on a peer
const listRemoteSessions = defineTool({
  name: 'browser_sync_list_remote_sessions',
  description: 'List browser sessions available on a peer node',
  inputSchema: z.object({
    nodeId: z.string().optional(), // If omitted, list from all peers
  }),
  handle: async (context, params) => {
    // Fetch and aggregate remote indexes
  }
});

// browser_sync_import_session
// Import a session from a peer
const importSession = defineTool({
  name: 'browser_sync_import_session',
  description: 'Import a browser session from a peer node',
  inputSchema: z.object({
    nodeId: z.string(),
    sessionId: z.string(),
    resume: z.boolean().optional(), // Immediately resume after import
  }),
  handle: async (context, params) => {
    // Pull session, optionally restore to current browser
  }
});

// browser_sync_export_session
// Export current session to a peer
const exportSession = defineTool({
  name: 'browser_sync_export_session',
  description: 'Export current browser session to a peer node',
  inputSchema: z.object({
    nodeId: z.string(),
    name: z.string(),
    description: z.string().optional(),
  }),
  handle: async (context, params) => {
    // Capture state, push to peer
  }
});

// browser_sync_resume_session
// Resume a synced session (import + restore)
const resumeSession = defineTool({
  name: 'browser_sync_resume_session',
  description: 'Resume a browser session from any registered peer node',
  inputSchema: z.object({
    sessionId: z.string(),
    sourceNodeId: z.string().optional(), // Auto-detect if omitted
  }),
  handle: async (context, params) => {
    // Find session across peers, pull, restore
  }
});
```

**Acceptance Criteria**:
- [ ] All 6 tools implemented and tested
- [ ] Proper error messages for auth failures
- [ ] Progress indication for large transfers
- [ ] Integration with existing profile tools

---

#### Task 4.2: Update Existing Profile Tools
**Priority**: P2  
**Estimated Time**: 30 minutes  
**File**: `src/tools/profiles.ts`

```typescript
// Modify browser_save_profile to optionally sync
const browserSaveProfile = defineTool({
  name: 'browser_save_profile',
  inputSchema: z.object({
    name: z.string(),
    description: z.string().optional(),
    syncToPeers: z.boolean().optional(), // NEW: Auto-push to all peers
  }),
  // ...
});

// Modify browser_list_profiles to include sync info
// Add 'synced' flag and 'availableOn' node list
```

**Acceptance Criteria**:
- [ ] Backward compatible changes
- [ ] Optional sync flag (default false)
- [ ] Sync status in profile listing

---

### Phase 5: VS Code Extension Integration

#### Task 5.1: Add Sync Commands to Hosted Extension
**Priority**: P2  
**Estimated Time**: 1 hour  
**File**: `darbot-browser-hosted/vscode-extension-hosted/src/extension.ts`

```typescript
// Add commands:
// darbot-browser-mcp-hosted.syncRegisterPeer
// darbot-browser-mcp-hosted.syncListRemoteSessions  
// darbot-browser-mcp-hosted.syncImportSession
// darbot-browser-mcp-hosted.syncExportSession

// Add status bar indicator for sync status
// Add settings for auto-sync configuration
```

**Acceptance Criteria**:
- [ ] Command palette entries
- [ ] Quick pick for session selection
- [ ] Peer registration wizard
- [ ] Sync status indicator

---

#### Task 5.2: Add Sync Settings
**Priority**: P2  
**Estimated Time**: 30 minutes  
**File**: `darbot-browser-hosted/vscode-extension-hosted/package.json`

```json
{
  "configuration": {
    "properties": {
      "darbot-browser-mcp-hosted.syncEnabled": {
        "type": "boolean",
        "default": false
      },
      "darbot-browser-mcp-hosted.syncAutoRegisterCloud": {
        "type": "boolean",
        "default": true
      },
      "darbot-browser-mcp-hosted.syncCloudUrl": {
        "type": "string",
        "default": "",
        "description": "Cloud server URL - configure with your deployment URL"
      }
    }
  }
}
```

---

### Phase 6: Testing & Validation

#### Task 6.1: Unit Tests for Sync Components
**Priority**: P2  
**Estimated Time**: 2 hours  
**File**: `tests/sync/`

```typescript
// Test files:
// - models.test.ts
// - directory.test.ts
// - serializer.test.ts
// - client.test.ts
// - conflicts.test.ts
```

**Acceptance Criteria**:
- [ ] 80%+ code coverage for sync module
- [ ] Mock peer for network tests
- [ ] Conflict resolution scenarios

---

#### Task 6.2: Integration Test: Cloud ↔ Hosted Sync
**Priority**: P1  
**Estimated Time**: 1 hour  

**Test Scenario**:
1. Start session on cloud
2. Save profile on cloud
3. Register cloud as peer on hosted
4. Import session from cloud to hosted
5. Verify cookies and localStorage match
6. Continue browsing on hosted
7. Export back to cloud
8. Verify round-trip integrity

---

## API Reference

### Sync Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sync/index` | Get local session index |
| GET | `/sync/sessions/:id` | Download session state |
| POST | `/sync/sessions` | Upload session state |
| DELETE | `/sync/sessions/:id` | Delete session |
| GET | `/sync/peers` | List registered peers |
| POST | `/sync/peers` | Register new peer |
| DELETE | `/sync/peers/:nodeId` | Unregister peer |
| POST | `/sync/pull/:nodeId/:sessionId` | Pull from peer |
| POST | `/sync/push/:nodeId/:sessionId` | Push to peer |

### MCP Tools

| Tool | Description |
|------|-------------|
| `browser_sync_list_peers` | List registered peer nodes |
| `browser_sync_register_peer` | Register a new peer |
| `browser_sync_list_remote_sessions` | List sessions on peers |
| `browser_sync_import_session` | Import session from peer |
| `browser_sync_export_session` | Export session to peer |
| `browser_sync_resume_session` | Resume session from any peer |

---

## Estimated Total Effort

| Phase | Tasks | Time Estimate |
|-------|-------|---------------|
| Phase 1: Core Data Layer | 3 tasks | 2 hours |
| Phase 2: Discovery & Auth | 3 tasks | 2.25 hours |
| Phase 3: Sync Protocol | 3 tasks | 3.25 hours |
| Phase 4: MCP Tools | 2 tasks | 2.5 hours |
| Phase 5: Extension | 2 tasks | 1.5 hours |
| Phase 6: Testing | 2 tasks | 3 hours |
| **Total** | **15 tasks** | **~14.5 hours** |

---

## Security Considerations

1. **Authentication Required**: All sync endpoints require valid auth
2. **Checksum Verification**: SHA-256 integrity check on all transfers
3. **Cookie Security**: Sensitive cookies flagged, optional encryption
4. **Audit Logging**: All sync operations logged with user/node info
5. **Rate Limiting**: Prevent abuse of sync endpoints

---

## Future Enhancements

- **Encrypted State**: AES-256 encryption for sensitive sessions
- **Selective Sync**: Sync only cookies, not localStorage
- **Sync Webhooks**: Notify on new sessions from peers
- **Compression**: gzip for large session transfers
- **Delta Sync**: Only sync changed data, not full state

---

**Document Version**: 1.0  
**Last Updated**: January 23, 2026  
**Owner**: DarbotLabs Engineering
