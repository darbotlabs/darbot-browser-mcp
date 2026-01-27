# Quick Start Guide

## Option 1: MCP Server Integration (Recommended)

### 1. Deploy to Azure
```bash
git clone https://github.com/darbotlabs/darbot-browser-mcp.git
cd darbot-browser-mcp
./azure/deploy.sh my-resource-group darbot-mcp-prod eastus
```

### 2. Configure Copilot Studio
Use the MCP endpoints provided by the deployment:
- **MCP Endpoint**: `https://your-app.azurewebsites.net/mcp`
- **Health Check**: `https://your-app.azurewebsites.net/health`
- **OpenAPI Spec**: `https://your-app.azurewebsites.net/openapi.json`

### 3. Test Integration
```bash
curl https://your-app.azurewebsites.net/health
curl https://your-app.azurewebsites.net/openapi.json
```

## Option 2: Power Platform Connector

### 1. Deploy MCP Server (same as above)
```bash
./azure/deploy.sh my-resource-group darbot-mcp-prod eastus
```

### 2. Deploy Custom Connector
```bash
cd power-platform
./deploy-connector.sh https://myorg.crm.dynamics.com your-client-id https://your-app.azurewebsites.net
```

### 3. Use in Copilot Studio
- Create new topic
- Add action → Select "Darbot Browser MCP" connector
- Choose from 9 core actions (Navigate, Click, Type, Screenshot, etc.)

## Enterprise Features Implemented

### Security & Authentication
- **Microsoft Entra ID Integration**: Full OAuth 2.0 with JWT validation
- **HTTPS Enforcement**: SSL/TLS required for all communications
- **Request Validation**: Input sanitization and schema validation
- **Rate Limiting**: Configurable limits for enterprise workloads
- **Audit Logging**: Comprehensive logging for compliance

### Monitoring & Observability
- **Health Endpoints**: `/health`, `/ready`, `/live` for monitoring
- **Application Insights**: Performance metrics and error tracking
- **Azure Monitor**: Centralized logging and alerting
- **OpenAPI Specification**: Auto-generated API documentation

### Performance & Scalability
- **Horizontal Scaling**: Azure App Service scaling support
- **Connection Pooling**: Efficient browser instance management
- **Session Management**: Configurable timeouts and limits
- **Memory Optimization**: Efficient resource utilization

###  Enterprise Deployment
- **Azure App Service**: Production-ready hosting
- **Key Vault Integration**: Secure secret management
- **Infrastructure as Code**: Bicep and ARM templates
- **CI/CD Ready**: Deployment automation scripts

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Copilot Studio  │    │   Power Platform │    │  Azure App      │
│                 │◄──►│   Connector     │◄──►│  Service        │
│ - Topics        │    │                 │    │                 │
│ - Actions       │    │ - Authentication│    │ - MCP Server    │
│ - Workflows     │    │ - Action Mapping│    │ - Browser Pool  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                               │
                       ┌─────────────────┐    │
                       │   Azure         │    │
                       │   Resources     │◄───┘
                       │                 │
                       │ - Key Vault     │
                       │ - App Insights  │
                       │ - Storage       │
                       └─────────────────┘
```

## Available Tools (52 Total)

### Navigation (5 tools)
- `browser_navigate` - Navigate to URLs
- `browser_go_back` - Navigate backwards  
- `browser_go_forward` - Navigate forwards
- `browser_reload` - Reload current page
- `browser_wait_for` - Wait for navigation/conditions

### Core Interaction (8 tools)
- `browser_click` - Click elements
- `browser_type` - Type text into inputs
- `browser_drag` - Drag and drop elements
- `browser_hover` - Hover over elements
- `browser_select_option` - Select dropdown options
- `browser_press_key` - Press keyboard keys
- `browser_handle_dialog` - Handle browser dialogs
- `browser_file_upload` - Upload files

### Capture & Analysis (4 tools)
- `browser_take_screenshot` - Capture screenshots
- `browser_snapshot` - Get accessibility snapshots
- `browser_pdf_save` - Generate PDFs
- `browser_analyze_context` - AI context analysis

### Profile Management (4 tools)
- `browser_save_profile` - Save browser sessions
- `browser_switch_profile` - Switch between profiles
- `browser_list_profiles` - List available profiles
- `browser_delete_profile` - Delete profiles

### Tab Management (4 tools)
- `browser_tab_list` - List open tabs
- `browser_tab_new` - Open new tab
- `browser_tab_select` - Select tab by index
- `browser_tab_close` - Close tabs

### Debug & Monitor (6 tools)
- `browser_console_messages` - Access console logs
- `browser_console_filtered` - Filter console by type
- `browser_network_requests` - Monitor network
- `browser_performance_metrics` - Performance data
- `browser_clear_cookies` - Clear cookies
- `browser_get_cookies` - Get cookies

### AI-Native (4 tools)
- `browser_execute_intent` - Natural language actions
- `browser_execute_workflow` - Multi-step workflows
- `browser_generate_playwright_test` - Generate test scripts
- `browser_emulate_media` - Media feature emulation

### Autonomous (3 tools)
- `browser_start_autonomous_crawl` - Start BFS crawling
- `browser_configure_memory` - Memory system setup
- `browser_get_crawl_report` - Get crawl reports

### Session & Environment (5 tools)
- `browser_save_session` - Save session state
- `browser_restore_session` - Restore session
- `browser_emulate_geolocation` - Location emulation
- `browser_emulate_timezone` - Timezone emulation
- `browser_scroll` - Page scrolling

### Setup & Install (5 tools)
- `browser_install` - Install browsers
- `browser_install_fake_clock` - Fake clock setup
- `browser_get_local_storage` - Local storage access
- `browser_resize` - Resize browser window
- `browser_close` - Close browser

### Time Control (4 tools)
- `browser_clock_fast_forward` - Fast forward time
- `browser_clock_pause` - Pause clock
- `browser_clock_resume` - Resume clock
- `browser_clock_set_fixed_time` - Set fixed time

## Configuration Reference

### Environment Variables

#### Authentication
```bash
ENTRA_AUTH_ENABLED=true
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

#### Copilot Studio
```bash
COPILOT_STUDIO_ENABLED=true
COPILOT_STUDIO_CALLBACK_URL=https://your-callback-url
MAX_CONCURRENT_SESSIONS=20
SESSION_TIMEOUT_MS=1800000
AUDIT_LOGGING_ENABLED=true
```

#### Performance
```bash
BROWSER_POOL_SIZE=10
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Azure Resources Created

#### Core Services
- **App Service**: Hosts the MCP server
- **App Service Plan**: Provides compute resources
- **Application Insights**: Monitoring and analytics
- **Log Analytics Workspace**: Centralized logging

#### Security & Storage
- **Key Vault**: Secure secret storage
- **Storage Account**: Session data and artifacts
- **Managed Identity**: Secure Azure resource access

## Use Cases & Examples

### 1. Automated Data Entry
```javascript
// Navigate to form
await connector.BrowserNavigate({ url: "https://forms.office.com/..." });

// Take snapshot to understand form structure
const snapshot = await connector.BrowserSnapshot();

// Fill form fields
await connector.BrowserClick({ element: "First name field", ref: "input#fname" });
await connector.BrowserType({ 
  element: "First name field", 
  ref: "input#fname", 
  text: "John" 
});

// Submit form
await connector.BrowserClick({ element: "Submit button", ref: "button[type=submit]" });
```

### 2. Work Profile Management
```javascript
// Save current state
await connector.BrowserSaveProfile({
  name: "crm-logged-in",
  description: "CRM system with user authenticated"
});

// Later, restore the session
await connector.BrowserSwitchProfile({ name: "crm-logged-in" });
```

### 3. Monitoring & Reporting
```javascript
// Check service health
const health = await connector.HealthCheck();

// Generate report screenshot
const screenshot = await connector.BrowserTakeScreenshot({
  filename: "daily-report.png"
});
```

## Security Considerations

### Data Protection
- All browser data encrypted in transit and at rest
- Session isolation between users
- No persistent storage of sensitive data
- Configurable data retention policies

### Access Control
- Azure AD integration for authentication
- Role-based access control (RBAC)
- API key authentication for service accounts
- Request signing and validation

### Compliance
- Audit logging for all actions
- Data loss prevention (DLP) support
- GDPR and SOC2 compliance ready
- Industry-standard security practices

## Performance Optimization

### Browser Pool Management
- Pre-warmed browser instances
- Intelligent session reuse
- Memory monitoring and cleanup
- Resource limits enforcement

### Network Optimization
- CDN for static assets
- Response compression
- Connection pooling
- Request deduplication

### Monitoring & Alerting
- Performance metrics collection
- Error rate monitoring
- Capacity planning dashboards
- Proactive alerting

## Troubleshooting

### Common Issues

#### 1. Authentication Failures
**Symptoms**: 401 Unauthorized errors
**Solutions**:
- Verify Azure AD app registration
- Check client secret expiration
- Confirm redirect URLs
- Validate token scopes

#### 2. Performance Issues
**Symptoms**: Slow response times, timeouts
**Solutions**:
- Scale up App Service plan
- Increase concurrent session limits
- Monitor memory usage
- Optimize browser configurations

#### 3. Browser Session Errors
**Symptoms**: Browser crashes, session loss
**Solutions**:
- Check browser installation
- Monitor resource usage
- Adjust session timeouts
- Review error logs

### Diagnostic Tools
- Health check endpoints
- Application Insights dashboards
- Azure Monitor alerts
- Browser console logs

## Support & Maintenance

### Regular Maintenance
- Monitor health check endpoints
- Review performance metrics
- Update security certificates
- Scale resources as needed

### Updates & Patches
- Follow semantic versioning
- Test in staging environment
- Monitor deployment health
- Rollback procedures ready

### Support Channels
- GitHub Issues for bugs and features
- Application Insights for diagnostics
- Azure Support for infrastructure
- Community forums for guidance

## Next Steps

### Immediate Actions
1. **Deploy to Development**: Test the integration in dev environment
2. **Configure Authentication**: Set up Azure AD and test login flow
3. **Create Test Workflows**: Build simple Copilot Studio topics
4. **Monitor Performance**: Set up dashboards and alerts

### Advanced Configuration
1. **Custom Tool Development**: Add organization-specific tools
2. **Integration Testing**: End-to-end workflow validation
3. **Performance Tuning**: Optimize for production workloads
4. **Security Hardening**: Apply additional security measures

### Production Readiness
1. **Capacity Planning**: Size resources for expected load
2. **Disaster Recovery**: Set up backup and recovery procedures
3. **Monitoring**: Comprehensive observability setup
4. **Documentation**: Create user guides and runbooks

## Conclusion

This implementation provides a comprehensive, enterprise-ready solution for integrating Darbot Browser MCP with Microsoft Copilot Studio. Both the MCP server enhancement and Power Platform connector approaches are production-ready and can be deployed immediately.

The solution includes all required enterprise features:
- Microsoft Entra ID authentication
- Enterprise security standards
- Azure deployment templates
- Health monitoring
- OpenAPI specifications
- Power Platform connector
- Comprehensive documentation

Organizations can choose the integration approach that best fits their architecture and requirements, with the confidence that both options provide enterprise-grade security, performance, and reliability.

# Implementation

### 1. Memory System (`src/memory.ts`)

- **Local Storage**: File-based state persistence with screenshot organization
- **State Hashing**: SHA-256 DOM snapshot hashing for deduplication
- **Darbot-Memory-MCP Integration**: Placeholder connector for future integration
- **Configurable Storage**: Support for different backend storage systems

### 2. Planner (`src/planner.ts`)

- **Breadth-First Search**: Systematic exploration by depth level
- **Intelligent Scoring**: URL and element prioritization algorithms
- **Domain Filtering**: Configurable allowed/blocked domain support
- **Loop Detection**: Infinite navigation pattern prevention

### 3. Guardrail System (`src/guardrails.ts`)

- **Rate Limiting**: Token bucket algorithm with configurable limits
- **Safety Validation**: Pattern-based URL and action blocking
- **Loop Prevention**: Detects repetitive navigation cycles
- **Destructive Action Prevention**: Blocks harmful clicks and inputs

### 4. Report Generator (`src/reporter.ts`)

- **HTML Reports**: Comprehensive crawl reports with statistics
- **Screenshot Galleries**: Organized visual documentation
- **Site Graphs**: Link structure visualization
- **Multiple Formats**: JSON and HTML output support

### 5. Main Orchestrator (`src/orchestrator.ts`)

- **Component Integration**: Coordinates memory, planner, guardrails, and reporter
- **Session Management**: Tracks crawling progress and statistics
- **Error Handling**: Robust error recovery and cleanup
- **Configurable Parameters**: Full control over crawling behavior

### 6. MCP Tools (`src/tools/autonomous.ts`)

- **`browser_start_autonomous_crawl`**: Complete crawling configuration
- **`browser_configure_memory`**: Memory system setup and management
- **Parameter Validation**: Comprehensive input validation with Zod
- **Demo Mode**: Safe testing without uncontrolled browsing



### Integration Points

- [LINK] Prepared for darbot-memory-mcp connector integration
- [LINK] VS Code extension compatibility maintained
- [LINK] MCP protocol compliance ensured
- [LINK] Multi-platform support preserved

