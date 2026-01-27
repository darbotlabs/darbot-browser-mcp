# Darbot Browser MCP - Development Backlog

**Created**: January 23, 2026  
**Status**: Active  
**Priority**: P1 - Application Insights Full Telemetry

---

## Backlog Item: Implement Application Insights Node.js SDK

### Current State
The Azure App Service auto-instrumentation agent (`ApplicationInsightsAgent_EXTENSION_VERSION=~3`) is active but only captures HTTP requests. The following telemetry types are NOT being collected:

| Telemetry Type | Current Status | Target |
|----------------|----------------|--------|
| Requests | Collecting (148) | Maintain |
| Exceptions | Not collecting | Implement |
| Dependencies | Not collecting | Implement |
| Traces | Not collecting | Implement |
| Custom Events | Not collecting | Implement |

### Root Cause
The `applicationinsights` Node.js SDK is not installed. Only HTTP request auto-instrumentation from Azure agent works without it.

---

## Implementation Tasks

### Phase 1: SDK Installation & Configuration

#### Task 1.1: Install Application Insights SDK
**Priority**: P1  
**Estimated Time**: 15 minutes  
**File**: `package.json`

```bash
npm install applicationinsights --save
```

**Verification**:
```bash
npm list applicationinsights
```

---

#### Task 1.2: Create Telemetry Configuration Module
**Priority**: P1  
**Estimated Time**: 30 minutes  
**File**: `src/telemetry.ts`

Create a new telemetry module with the following structure:

```typescript
/**
 * Application Insights Telemetry Configuration
 * Must be imported BEFORE any other modules to enable auto-collection
 */

import appInsights from 'applicationinsights';

export function initializeTelemetry(): void {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  
  if (!connectionString) {
    console.error('[Telemetry] APPLICATIONINSIGHTS_CONNECTION_STRING not set, telemetry disabled');
    return;
  }

  appInsights.setup(connectionString)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(true)
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
    .start();

  console.error('[Telemetry] Application Insights initialized');
}

export function trackEvent(name: string, properties?: Record<string, string>): void {
  const client = appInsights.defaultClient;
  if (client) {
    client.trackEvent({ name, properties });
  }
}

export function trackException(error: Error, properties?: Record<string, string>): void {
  const client = appInsights.defaultClient;
  if (client) {
    client.trackException({ exception: error, properties });
  }
}

export function trackDependency(
  name: string, 
  duration: number, 
  success: boolean, 
  dependencyTypeName: string
): void {
  const client = appInsights.defaultClient;
  if (client) {
    client.trackDependency({
      name,
      duration,
      success,
      dependencyTypeName,
      data: name,
      resultCode: success ? 200 : 500,
    });
  }
}

export function trackTrace(message: string, severity?: number): void {
  const client = appInsights.defaultClient;
  if (client) {
    client.trackTrace({ message, severity });
  }
}

export function flush(): Promise<void> {
  return new Promise((resolve) => {
    const client = appInsights.defaultClient;
    if (client) {
      client.flush({ callback: () => resolve() });
    } else {
      resolve();
    }
  });
}
```

---

#### Task 1.3: Initialize Telemetry at Application Startup
**Priority**: P1  
**Estimated Time**: 15 minutes  
**File**: `src/program.ts`

Add telemetry initialization as the FIRST import:

```typescript
// MUST be first import to enable auto-collection
import { initializeTelemetry } from './telemetry.js';
initializeTelemetry();

// ... rest of imports
```

**Critical**: The telemetry module must be imported before any other modules (Express, Playwright, etc.) for auto-instrumentation to work.

---

### Phase 2: Custom Telemetry Integration

#### Task 2.1: Track MCP Tool Executions
**Priority**: P2  
**Estimated Time**: 45 minutes  
**File**: `src/tools.ts` or `lib/tools.js`

Add custom event tracking for each MCP tool call:

```typescript
import { trackEvent, trackException } from './telemetry.js';

// In tool execution handler
async function executeTool(toolName: string, params: unknown): Promise<unknown> {
  const startTime = Date.now();
  
  try {
    const result = await actualToolExecution(toolName, params);
    
    trackEvent('MCP_Tool_Execution', {
      toolName,
      duration: String(Date.now() - startTime),
      success: 'true',
    });
    
    return result;
  } catch (error) {
    trackEvent('MCP_Tool_Execution', {
      toolName,
      duration: String(Date.now() - startTime),
      success: 'false',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    trackException(error instanceof Error ? error : new Error(String(error)), {
      toolName,
      operation: 'MCP_Tool_Execution',
    });
    
    throw error;
  }
}
```

---

#### Task 2.2: Track Browser Session Lifecycle
**Priority**: P2  
**Estimated Time**: 30 minutes  
**File**: `src/context.ts` or `lib/context.js`

Track browser session events:

```typescript
import { trackEvent } from './telemetry.js';

// On session start
trackEvent('Browser_Session_Start', {
  sessionId: session.id,
  browser: config.browser,
  headless: String(config.headless),
});

// On session end
trackEvent('Browser_Session_End', {
  sessionId: session.id,
  duration: String(sessionDuration),
  pagesVisited: String(pageCount),
});
```

---

#### Task 2.3: Track MCP Connection Events
**Priority**: P2  
**Estimated Time**: 30 minutes  
**File**: `src/transport.ts`

Track connection lifecycle:

```typescript
import { trackEvent } from './telemetry.js';

// On new MCP session
trackEvent('MCP_Session_Created', {
  sessionId: newSessionId,
  transport: 'streamable-http',
});

// On session close
trackEvent('MCP_Session_Closed', {
  sessionId: transport.sessionId,
  reason: closeReason,
});
```

---

#### Task 2.4: Track External Dependencies
**Priority**: P2  
**Estimated Time**: 30 minutes  
**Files**: Various

Track calls to external services:

```typescript
import { trackDependency } from './telemetry.js';

// Azure Key Vault access
const startTime = Date.now();
try {
  const secret = await keyVaultClient.getSecret(secretName);
  trackDependency('KeyVault_GetSecret', Date.now() - startTime, true, 'Azure Key Vault');
} catch (error) {
  trackDependency('KeyVault_GetSecret', Date.now() - startTime, false, 'Azure Key Vault');
  throw error;
}

// Azure Blob Storage access
const startTime = Date.now();
try {
  await blobClient.upload(data);
  trackDependency('BlobStorage_Upload', Date.now() - startTime, true, 'Azure Blob Storage');
} catch (error) {
  trackDependency('BlobStorage_Upload', Date.now() - startTime, false, 'Azure Blob Storage');
  throw error;
}
```

---

### Phase 3: Build & Deploy

#### Task 3.1: Update TypeScript Build
**Priority**: P1  
**Estimated Time**: 10 minutes  

Ensure telemetry module is included in build:
```bash
npm run build
```

Verify no TypeScript errors with `applicationinsights` types.

---

#### Task 3.2: Build New Docker Image
**Priority**: P1  
**Estimated Time**: 5 minutes  

```powershell
chcp 65001
az acr build --registry darbotbrowsermcp --image darbot-browser-mcp:ca19 --file azure/Dockerfile.acr . --no-logs
```

---

#### Task 3.3: Deploy to Azure App Service
**Priority**: P1  
**Estimated Time**: 5 minutes  

```powershell
az webapp config container set --name darbot-browser-mcp --resource-group darbot-browser-mcp --container-image-name darbotbrowsermcp.azurecr.io/darbot-browser-mcp:ca19
az webapp restart --name darbot-browser-mcp --resource-group darbot-browser-mcp
```

---

### Phase 4: Validation

#### Task 4.1: Verify Telemetry Collection
**Priority**: P1  
**Estimated Time**: 15 minutes  

Wait 5 minutes after deployment, then run:

```powershell
# Check all telemetry types
az monitor app-insights query --app darbot-browser-mcp-insights --resource-group darbot-browser-mcp --analytics-query "union requests, dependencies, exceptions, traces, customEvents | summarize count() by itemType | order by count_ desc"

# Check custom events
az monitor app-insights query --app darbot-browser-mcp-insights --resource-group darbot-browser-mcp --analytics-query "customEvents | summarize count() by name | order by count_ desc | take 20"

# Check exceptions
az monitor app-insights query --app darbot-browser-mcp-insights --resource-group darbot-browser-mcp --analytics-query "exceptions | project timestamp, problemId, outerMessage | order by timestamp desc | take 10"

# Check dependencies
az monitor app-insights query --app darbot-browser-mcp-insights --resource-group darbot-browser-mcp --analytics-query "dependencies | summarize count() by name, type | order by count_ desc | take 10"
```

---

#### Task 4.2: Update CLOUD_CONFIG_SUMMARY.md
**Priority**: P1  
**Estimated Time**: 10 minutes  

Update the Monitoring & Diagnostics section with:
- Confirmed telemetry types
- Sample queries for each telemetry type
- Custom event names reference

---

## Acceptance Criteria

- [ ] `applicationinsights` package installed and in package.json
- [ ] Telemetry initialized before other modules in program.ts
- [ ] Custom events tracked for MCP tool executions
- [ ] Exceptions auto-collected and visible in App Insights
- [ ] Dependencies tracked (Key Vault, Blob Storage)
- [ ] Traces visible from console.log statements
- [ ] New Docker image deployed (ca19+)
- [ ] All telemetry types visible in Azure Portal queries

---

## Estimated Total Effort

| Phase | Tasks | Time Estimate |
|-------|-------|---------------|
| Phase 1: SDK Setup | 3 tasks | 1 hour |
| Phase 2: Custom Telemetry | 4 tasks | 2.5 hours |
| Phase 3: Build & Deploy | 3 tasks | 20 minutes |
| Phase 4: Validation | 2 tasks | 25 minutes |
| **Total** | **12 tasks** | **~4.5 hours** |

---

## References

- [Application Insights Node.js SDK](https://docs.microsoft.com/en-us/azure/azure-monitor/app/nodejs)
- [Custom Events and Metrics](https://docs.microsoft.com/en-us/azure/azure-monitor/app/api-custom-events-metrics)
- [Distributed Tracing](https://docs.microsoft.com/en-us/azure/azure-monitor/app/distributed-tracing)
- [Live Metrics Stream](https://docs.microsoft.com/en-us/azure/azure-monitor/app/live-stream)

---

## Additional Backlog Items (Future)

### P3: Implement Custom Metrics Dashboard
- Create Azure Dashboard with key metrics
- Add MCP tool usage charts
- Session duration histograms
- Error rate trends

### P3: Implement Alerting
- Alert on high error rate (>5%)
- Alert on slow response time (>5s avg)
- Alert on memory pressure (>90%)
- Alert on session failures

### P4: Implement Sampling
- Configure adaptive sampling for high-volume scenarios
- Exclude health check telemetry from sampling
- Set sampling rate for tool executions

---

**Document Version**: 1.0  
**Last Updated**: January 23, 2026  
**Owner**: DarbotLabs DevOps
