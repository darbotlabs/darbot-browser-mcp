# Tool catalog

This reference catalogs every registered v2.1.4 MCP tool and its source schema surface.

You'll learn:

- Which tools are available in default accessibility mode.
- Which coordinate-based screen tools are always available as core tools.
- What parameters each tool accepts at a schema level.

## Counts

- Accessibility-first and management tools: **63 tools**.
- Coordinate-based screen tools: **5 core tools**, always registered.
- Total unique names in source catalog: **68 tools**, all available by default.

## Default accessibility-mode tools

| Tool | Category | Type | Purpose |
| --- | --- | --- | --- |
| `browser_analyze_context` | AI-native | `readOnly` | Analyze current page context and suggest intelligent next actions based on user patterns |
| `browser_execute_intent` | AI-native | `destructive` | Execute browser automation using natural language descriptions with intelligent fallback strategies |
| `browser_execute_workflow` | AI-native | `destructive` | Execute predefined workflows for common automation patterns like GitHub issue management |
| `browser_click` | Accessibility interaction | `destructive` | Autonomously perform click interactions on web page elements |
| `browser_drag` | Accessibility interaction | `destructive` | Autonomously perform drag and drop operations between web page elements |
| `browser_hover` | Accessibility interaction | `readOnly` | Autonomously hover over specific elements on the web page |
| `browser_select_option` | Accessibility interaction | `destructive` | Autonomously select options in dropdown menus on the web page |
| `browser_snapshot` | Accessibility interaction | `readOnly` | Autonomously capture a detailed accessibility snapshot of the current page for analysis. This provides structured page content better than a screenshot. |
| `browser_type` | Accessibility interaction | `destructive` | Autonomously type text into editable elements on the web page |
| `browser_configure_memory` | Autonomous crawling | `destructive` | Configure memory system for autonomous crawling (local or darbot-memory-mcp) |
| `browser_start_autonomous_crawl` | Autonomous crawling | `destructive` | Start autonomous crawling session with BFS strategy, memory, and reporting |
| `browser_clock_fast_forward` | Clock | `destructive` | Autonomously advance the fake clock time by a specified duration. Timers and animations will fire as if that time had passed. |
| `browser_clock_install` | Clock | `destructive` | Autonomously install fake clock to control time in the browser. Useful for testing time-dependent behavior like animations, timeouts, and scheduled tasks. |
| `browser_clock_pause` | Clock | `destructive` | Autonomously pause the clock at a specific time. Time will stop until resumed. |
| `browser_clock_resume` | Clock | `destructive` | Autonomously resume the paused clock. Time will continue flowing from where it was paused. |
| `browser_clock_set_fixed_time` | Clock | `destructive` | Autonomously set a fixed time that will be returned by Date.now() and new Date(). Time will not advance automatically. |
| `browser_close` | Common browser | `readOnly` | Autonomously close the browser session and terminate all operations |
| `browser_resize` | Common browser | `readOnly` | Autonomously resize the browser window to specific dimensions for optimal viewing |
| `browser_console_messages` | Console | `readOnly` | Autonomously retrieve all browser console messages for debugging and analysis |
| `browser_clear_cookies` | Cookies and storage | `destructive` | Autonomously clear browser cookies, optionally filtered by name, domain, or path. |
| `browser_get_cookies` | Cookies and storage | `readOnly` | Autonomously retrieve browser cookies, optionally filtered by URL or domain. |
| `browser_get_local_storage` | Cookies and storage | `readOnly` | Autonomously retrieve all localStorage items for the current page. |
| `browser_save_storage_state` | Cookies and storage | `readOnly` | Autonomously save browser storage state (cookies, localStorage, and optionally IndexedDB) to a file. Useful for persisting authentication and session state. |
| `browser_set_cookie` | Cookies and storage | `destructive` | Autonomously set a browser cookie. |
| `browser_set_local_storage` | Cookies and storage | `destructive` | Autonomously set a localStorage item for the current page. |
| `browser_console_filtered` | Diagnostics | `readOnly` | Autonomously retrieve console messages filtered by type (log, error, warning, info, debug). Useful for focused debugging. |
| `browser_performance_metrics` | Diagnostics | `readOnly` | Autonomously retrieve performance metrics including page load times, DOM content loaded, and other timing data. |
| `browser_handle_dialog` | Dialogs | `destructive` | Autonomously handle browser dialog boxes (alerts, confirmations, prompts) |
| `browser_emulate_geolocation` | Emulation | `destructive` | Autonomously emulate a geographic location for location-based testing. |
| `browser_emulate_media` | Emulation | `readOnly` | Autonomously emulate media features like color scheme, reduced motion, contrast preference, and media type for accessibility and responsive testing. |
| `browser_emulate_timezone` | Emulation | `destructive` | Autonomously change the browser timezone for testing time-sensitive features. |
| `browser_evaluate` | Evaluation | `destructive` | Execute JavaScript code in the browser page context and return the result. Useful for reading DOM state, querying values, or running custom scripts. |
| `browser_file_upload` | Files | `destructive` | Autonomously upload one or multiple files when a file chooser dialog appears |
| `browser_install` | Install | `destructive` | Autonomously install the required browser engine specified in configuration. Use this to resolve browser installation errors. |
| `browser_press_key` | Keyboard | `destructive` | Autonomously press keys on the keyboard to interact with the web page |
| `browser_navigate` | Navigation | `destructive` | Autonomously navigate the browser to any URL. Use this command to launch and direct the browser to websites. |
| `browser_navigate_back` | Navigation | `readOnly` | Autonomously navigate back to the previous page in browser history |
| `browser_navigate_forward` | Navigation | `readOnly` | Autonomously navigate forward to the next page in browser history |
| `browser_network_requests` | Network | `readOnly` | Autonomously capture and analyze all network requests made since page load for debugging |
| `browser_pdf_save` | PDF | `readOnly` | Autonomously save the current web page as a PDF document for archival or sharing |
| `browser_delete_profile` | Profiles and session states | `destructive` | Permanently delete a saved session state snapshot from storage |
| `browser_discover_profiles` | Profiles and session states | `readOnly` | List real Microsoft Edge browser profiles installed on this machine, showing each profile's folder path, display name, and associated email address. Use the folder name with --edge-profile and the data directory with --user-data-dir when starting the MCP server. These are actual Edge browser profiles, not session state snapshots. |
| `browser_export_session_state` | Profiles and session states | `readOnly` | Export a saved Darbot session state and its Playwright storage state as one portable JSON bundle in the configured output directory. The bundle can contain authentication cookies and must be protected as sensitive data. |
| `browser_import_session_state` | Profiles and session states | `destructive` | Import a portable Darbot session-state bundle from a filename inside the configured output directory. Arbitrary filesystem paths are rejected. |
| `browser_import_workspace_metadata` | Profiles and session states | `destructive` | Import folder and configuration metadata from a JSON or VS Code `.code-workspace` file in the configured output directory. The import is scoped to the current MCP session; settings, tasks, and extensions are not executed or applied. |
| `browser_list_profiles` | Profiles and session states | `readOnly` | List all saved Darbot session state snapshots with their Edge profile context and workspace information. These are session snapshots (cookies, localStorage, URL), not actual Edge browser profiles. Use browser_discover_profiles to list real Edge browser profiles. |
| `browser_save_profile` | Profiles and session states | `destructive` | Save a snapshot of the current browser session state (cookies, localStorage, current URL) to disk for later restoration. This saves a session snapshot — not an actual Edge browser profile. Use browser_discover_profiles to list real Edge browser profiles on this machine. |
| `browser_switch_profile` | Profiles and session states | `destructive` | Restore a previously saved session state snapshot, including cookies, localStorage, and navigate to the saved URL. This restores a session snapshot — not an actual Edge browser profile. Use browser_discover_profiles to list real Edge browser profiles on this machine. |
| `browser_take_screenshot` | Screenshots | `readOnly` | Autonomous screenshot capture |
| `browser_scroll` | Scrolling | `readOnly` | Autonomously scroll the page using mouse wheel. Positive deltaY scrolls down, negative scrolls up. Positive deltaX scrolls right, negative scrolls left. |
| `browser_scroll_to_element` | Scrolling | `readOnly` | Autonomously scroll an element into view. Useful for revealing elements before interacting with them. |
| `browser_tab_close` | Tabs | `destructive` | Autonomously close a browser tab by index, or close the current tab if no index specified |
| `browser_tab_list` | Tabs | `readOnly` | Autonomously list all open browser tabs and their current status |
| `browser_tab_new` | Tabs | `readOnly` | Autonomously open a new browser tab, optionally navigating to a specified URL |
| `browser_tab_select` | Tabs | `readOnly` | Autonomously select and switch to a specific browser tab by index |
| `browser_generate_playwright_test` | Testing | `readOnly` | Autonomously generate Playwright test code for browser automation scenarios and user workflows |
| `browser_wait_for` | Waiting | `readOnly` | Autonomously wait for specific conditions: text appearance, text disappearance, or time duration |

## Coordinate-based screen tools

These five `browser_screen_*` tools use viewport coordinates rather than
accessibility references. They are core tools and require no mode flag.

| Tool | Type | Purpose |
| --- | --- | --- |
| `browser_screen_capture` | `readOnly` | Take a screenshot of the current page |
| `browser_screen_click` | `destructive` | Click left mouse button |
| `browser_screen_drag` | `destructive` | Drag left mouse button |
| `browser_screen_move_mouse` | `readOnly` | Move mouse to a given position |
| `browser_screen_type` | `destructive` | Type text |

## Workflow and crawl-memory management

| Tool | Type | Purpose |
| --- | --- | --- |
| `browser_workflow_list` | `readOnly` | List registered workflow templates |
| `browser_workflow_active` | `readOnly` | List running or paused workflow executions |
| `browser_workflow_cancel` | `destructive` | Cancel a running workflow by execution ID |
| `browser_workflow_register` | `destructive` | Register or replace a serializable workflow template |
| `browser_memory_list` | `readOnly` | List autonomous crawl states in local memory |
| `browser_memory_clear` | `destructive` | Delete autonomous crawl states from local memory |

## Schemas

Schemas are shown as the Zod declarations used by the server source. Generated OpenAPI JSON is available from `/openapi.json` in HTTP mode.

### `browser_analyze_context`

- Category: AI-native
- Type: `readOnly`
- Source: `src/tools/ai-native.ts`
- Purpose: Analyze current page context and suggest intelligent next actions based on user patterns

```typescript
inputSchema: z.object({ include_suggestions: z.boolean().optional().default(true).describe('Whether to include action suggestions'), analyze_patterns: z.boolean().optional().default(true).describe('Whether to analyze user behavior patterns'), })
```

### `browser_clear_cookies`

- Category: Cookies and storage
- Type: `destructive`
- Source: `src/tools/storage.ts`
- Purpose: Autonomously clear browser cookies, optionally filtered by name, domain, or path.

```typescript
inputSchema: z.object({ name: z.string().optional().describe('Only clear cookies with this name'), domain: z.string().optional().describe('Only clear cookies for this domain'), path: z.string().optional().describe('Only clear cookies with this path'), })
```

### `browser_click`

- Category: Accessibility interaction
- Type: `destructive`
- Source: `src/tools/snapshot.ts`
- Purpose: Autonomously perform click interactions on web page elements

```typescript
inputSchema: clickSchema
```

### `browser_clock_fast_forward`

- Category: Clock
- Type: `destructive`
- Source: `src/tools/clock.ts`
- Purpose: Autonomously advance the fake clock time by a specified duration. Timers and animations will fire as if that time had passed.

```typescript
inputSchema: z.object({ milliseconds: z.number().describe('Number of milliseconds to fast forward'), })
```

### `browser_clock_install`

- Category: Clock
- Type: `destructive`
- Source: `src/tools/clock.ts`
- Purpose: Autonomously install fake clock to control time in the browser. Useful for testing time-dependent behavior like animations, timeouts, and scheduled tasks.

```typescript
inputSchema: z.object({ time: z.string().optional().describe('Initial time to set in ISO 8601 format (e.g., "2024-02-02T08:00:00"). Defaults to current time if not specified.'), })
```

### `browser_clock_pause`

- Category: Clock
- Type: `destructive`
- Source: `src/tools/clock.ts`
- Purpose: Autonomously pause the clock at a specific time. Time will stop until resumed.

```typescript
inputSchema: z.object({ time: z.string().optional().describe('Time to pause at in ISO 8601 format. If not specified, pauses at current fake time.'), })
```

### `browser_clock_resume`

- Category: Clock
- Type: `destructive`
- Source: `src/tools/clock.ts`
- Purpose: Autonomously resume the paused clock. Time will continue flowing from where it was paused.

```typescript
inputSchema: z.object({})
```

### `browser_clock_set_fixed_time`

- Category: Clock
- Type: `destructive`
- Source: `src/tools/clock.ts`
- Purpose: Autonomously set a fixed time that will be returned by Date.now() and new Date(). Time will not advance automatically.

```typescript
inputSchema: z.object({ time: z.string().describe('Fixed time to set in ISO 8601 format (e.g., "2024-12-25T00:00:00")'), })
```

### `browser_close`

- Category: Common browser
- Type: `readOnly`
- Source: `src/tools/common.ts`
- Purpose: Autonomously close the browser session and terminate all operations

```typescript
inputSchema: z.object({})
```

### `browser_configure_memory`

- Category: Autonomous crawling
- Type: `destructive`
- Source: `src/tools/autonomous.ts`
- Purpose: Configure memory system for autonomous crawling (local or darbot-memory-mcp)

```typescript
inputSchema: z.object({ enabled: z.boolean().default(true).describe('Enable or disable memory system'), connector: z.enum(['local', 'darbot-memory-mcp']).default('local').describe('Memory connector type'), storagePath: z.string().optional().describe('Local storage path (for local connector)'), maxStates: z.number().int().min(10).max(10000).default(1000).describe('Maximum states to store'), endpoint: z.string().url().optional().describe('Darbot Memory MCP endpoint URL') })
```

### `browser_console_filtered`

- Category: Diagnostics
- Type: `readOnly`
- Source: `src/tools/diagnostics.ts`
- Purpose: Autonomously retrieve console messages filtered by type (log, error, warning, info, debug). Useful for focused debugging.

```typescript
inputSchema: z.object({ type: z.enum(['log', 'error', 'warning', 'info', 'debug', 'all']).optional().default('all').describe('Type of console messages to retrieve'), limit: z.number().optional().default(100).describe('Maximum number of messages to return'), })
```

### `browser_console_messages`

- Category: Console
- Type: `readOnly`
- Source: `src/tools/console.ts`
- Purpose: Autonomously retrieve all browser console messages for debugging and analysis

```typescript
inputSchema: z.object({})
```

### `browser_delete_profile`

- Category: Profiles and session states
- Type: `destructive`
- Source: `src/tools/profiles.ts`
- Purpose: Permanently delete a saved session state snapshot from storage

```typescript
inputSchema: deleteProfileSchema
```

### `browser_discover_profiles`

- Category: Profiles and session states
- Type: `readOnly`
- Source: `src/tools/profiles.ts`
- Purpose: List real Microsoft Edge browser profiles installed on this machine, showing each profile's folder path, display name, and associated email address. Use the folder name with --edge-profile and the data directory with --user-data-dir when starting the MCP server. These are actual Edge browser profiles, not session state snapshots.

```typescript
inputSchema: z.object({ userDataDir: z.string().optional().describe('Path to Edge user data directory. Defaults to the standard platform location.'), })
```

### `browser_drag`

- Category: Accessibility interaction
- Type: `destructive`
- Source: `src/tools/snapshot.ts`
- Purpose: Autonomously perform drag and drop operations between web page elements

```typescript
inputSchema: z.object({ startElement: z.string().describe('Human-readable source element description used to obtain the permission to interact with the element'), startRef: z.string().describe('Exact source element reference from the page snapshot'), endElement: z.string().describe('Human-readable target element description used to obtain the permission to interact with the element'), endRef: z.string().describe('Exact target element reference from the page snapshot'), })
```

### `browser_emulate_geolocation`

- Category: Emulation
- Type: `destructive`
- Source: `src/tools/emulation.ts`
- Purpose: Autonomously emulate a geographic location for location-based testing.

```typescript
inputSchema: z.object({ latitude: z.number().min(-90).max(90).describe('Latitude between -90 and 90'), longitude: z.number().min(-180).max(180).describe('Longitude between -180 and 180'), accuracy: z.number().optional().describe('Accuracy in meters. Defaults to 0.'), })
```

### `browser_emulate_media`

- Category: Emulation
- Type: `readOnly`
- Source: `src/tools/emulation.ts`
- Purpose: Autonomously emulate media features like color scheme, reduced motion, contrast preference, and media type for accessibility and responsive testing.

```typescript
inputSchema: z.object({ colorScheme: z.enum(['light', 'dark', 'no-preference', 'null']).optional().describe('Emulate color scheme preference: light, dark, no-preference, or null to reset'), reducedMotion: z.enum(['reduce', 'no-preference', 'null']).optional().describe('Emulate prefers-reduced-motion: reduce, no-preference, or null to reset'), contrast: z.enum(['more', 'less', 'no-preference', 'null']).optional().describe('Emulate prefers-contrast: more, less, no-preference, or null to reset'), media: z.enum(['screen', 'print', 'null']).optional().describe('Emulate media type: screen, print, or null to reset'), forcedColors: z.enum(['active', 'none', 'null']).optional().describe('Emulate forced-colors: active, none, or null to reset'), })
```

### `browser_emulate_timezone`

- Category: Emulation
- Type: `destructive`
- Source: `src/tools/emulation.ts`
- Purpose: Autonomously change the browser timezone for testing time-sensitive features.

```typescript
inputSchema: z.object({ timezoneId: z.string().describe('Timezone ID (e.g., "America/New_York", "Europe/London", "Asia/Tokyo")'), })
```

### `browser_evaluate`

- Category: Evaluation
- Type: `destructive`
- Source: `src/tools/evaluate.ts`
- Purpose: Execute JavaScript code in the browser page context and return the result. Useful for reading DOM state, querying values, or running custom scripts.

```typescript
inputSchema: z.object({ expression: z.string().describe('JavaScript expression or function body to evaluate in the page context'), })
```

### `browser_execute_intent`

- Category: AI-native
- Type: `destructive`
- Source: `src/tools/ai-native.ts`
- Purpose: Execute browser automation using natural language descriptions with intelligent fallback strategies

```typescript
inputSchema: z.object({ description: z.string().describe('Natural language description of what you want to accomplish'), context: z.string().optional().describe('Additional context about the current task or goal'), fallback_strategy: z.enum(['auto_detect_elements', 'search_for_targets', 'analyze_page_context', 'use_accessibility_tree']).optional().describe('Strategy to use if primary action fails'), auto_recover: z.boolean().optional().default(true).describe('Whether to automatically recover from errors'), })
```

### `browser_execute_workflow`

- Category: AI-native
- Type: `destructive`
- Source: `src/tools/ai-native.ts`
- Purpose: Execute predefined workflows for common automation patterns like GitHub issue management

```typescript
inputSchema: z.object({ intent: z.string().describe('The workflow type (e.g., "github_issue_management", "code_review_workflow")'), parameters: z.record(z.any()).describe('Parameters for the workflow execution'), auto_recover: z.boolean().optional().default(true).describe('Whether to automatically recover from step failures'), validate_completion: z.boolean().optional().default(true).describe('Whether to validate successful completion'), })
```

### `browser_export_session_state`

- Category: Profiles and session states
- Type: `readOnly`
- Source: `src/tools/profiles.ts`
- Purpose: Export a saved Darbot session state and its Playwright storage state as one portable JSON bundle in the configured output directory. The bundle can contain authentication cookies and must be protected as sensitive data.

```typescript
inputSchema: exportSessionStateSchema
```

### `browser_file_upload`

- Category: Files
- Type: `destructive`
- Source: `src/tools/files.ts`
- Purpose: Autonomously upload one or multiple files when a file chooser dialog appears

```typescript
inputSchema: z.object({ paths: z.array(z.string()).describe('The absolute paths to the files to upload. Can be a single file or multiple files.'), })
```

### `browser_generate_playwright_test`

- Category: Testing
- Type: `readOnly`
- Source: `src/tools/testing.ts`
- Purpose: Autonomously generate Playwright test code for browser automation scenarios and user workflows

```typescript
inputSchema: generateTestSchema
```

### `browser_get_cookies`

- Category: Cookies and storage
- Type: `readOnly`
- Source: `src/tools/storage.ts`
- Purpose: Autonomously retrieve browser cookies, optionally filtered by URL or domain.

```typescript
inputSchema: z.object({ urls: z.array(z.string()).optional().describe('URLs to get cookies for. If not specified, returns all cookies.'), })
```

### `browser_get_local_storage`

- Category: Cookies and storage
- Type: `readOnly`
- Source: `src/tools/storage.ts`
- Purpose: Autonomously retrieve all localStorage items for the current page.

```typescript
inputSchema: z.object({})
```

### `browser_handle_dialog`

- Category: Dialogs
- Type: `destructive`
- Source: `src/tools/dialogs.ts`
- Purpose: Autonomously handle browser dialog boxes (alerts, confirmations, prompts)

```typescript
inputSchema: z.object({ accept: z.boolean().describe('Whether to accept the dialog.'), promptText: z.string().optional().describe('The text of the prompt in case of a prompt dialog.'), })
```

### `browser_hover`

- Category: Accessibility interaction
- Type: `readOnly`
- Source: `src/tools/snapshot.ts`
- Purpose: Autonomously hover over specific elements on the web page

```typescript
inputSchema: elementSchema
```

### `browser_import_session_state`

- Category: Profiles and session states
- Type: `destructive`
- Source: `src/tools/profiles.ts`
- Purpose: Import a portable Darbot session-state bundle from a filename inside the configured output directory. Arbitrary filesystem paths are rejected.

```typescript
inputSchema: importSessionStateSchema
```

### `browser_import_workspace_metadata`

- Category: Profiles and session states
- Type: `destructive`
- Source: `src/tools/profiles.ts`
- Purpose: Import folder and configuration metadata from a JSON or VS Code `.code-workspace` file in the configured output directory. The import is scoped to the current MCP session; settings, tasks, and extensions are not executed or applied.

```typescript
inputSchema: importWorkspaceMetadataSchema
```

### `browser_install`

- Category: Install
- Type: `destructive`
- Source: `src/tools/install.ts`
- Purpose: Autonomously install the required browser engine specified in configuration. Use this to resolve browser installation errors.

```typescript
inputSchema: z.object({})
```

### `browser_list_profiles`

- Category: Profiles and session states
- Type: `readOnly`
- Source: `src/tools/profiles.ts`
- Purpose: List all saved Darbot session state snapshots with their Edge profile context and workspace information. These are session snapshots (cookies, localStorage, URL), not actual Edge browser profiles. Use browser_discover_profiles to list real Edge browser profiles.

```typescript
inputSchema: listProfilesSchema
```

### `browser_navigate`

- Category: Navigation
- Type: `destructive`
- Source: `src/tools/navigate.ts`
- Purpose: Autonomously navigate the browser to any URL. Use this command to launch and direct the browser to websites.

```typescript
inputSchema: z.object({ url: z.string().describe('The URL to navigate to'), })
```

### `browser_navigate_back`

- Category: Navigation
- Type: `readOnly`
- Source: `src/tools/navigate.ts`
- Purpose: Autonomously navigate back to the previous page in browser history

```typescript
inputSchema: z.object({})
```

### `browser_navigate_forward`

- Category: Navigation
- Type: `readOnly`
- Source: `src/tools/navigate.ts`
- Purpose: Autonomously navigate forward to the next page in browser history

```typescript
inputSchema: z.object({})
```

### `browser_network_requests`

- Category: Network
- Type: `readOnly`
- Source: `src/tools/network.ts`
- Purpose: Autonomously capture and analyze all network requests made since page load for debugging

```typescript
inputSchema: z.object({})
```

### `browser_pdf_save`

- Category: PDF
- Type: `readOnly`
- Source: `src/tools/pdf.ts`
- Purpose: Autonomously save the current web page as a PDF document for archival or sharing

```typescript
inputSchema: pdfSchema
```

### `browser_performance_metrics`

- Category: Diagnostics
- Type: `readOnly`
- Source: `src/tools/diagnostics.ts`
- Purpose: Autonomously retrieve performance metrics including page load times, DOM content loaded, and other timing data.

```typescript
inputSchema: z.object({})
```

### `browser_press_key`

- Category: Keyboard
- Type: `destructive`
- Source: `src/tools/keyboard.ts`
- Purpose: Autonomously press keys on the keyboard to interact with the web page

```typescript
inputSchema: z.object({ key: z.string().describe('Name of the key to press or a character to generate, such as `ArrowLeft` or `a`'), })
```

### `browser_resize`

- Category: Common browser
- Type: `readOnly`
- Source: `src/tools/common.ts`
- Purpose: Autonomously resize the browser window to specific dimensions for optimal viewing

```typescript
inputSchema: z.object({ width: z.number().describe('Width of the browser window'), height: z.number().describe('Height of the browser window'), })
```

### `browser_save_profile`

- Category: Profiles and session states
- Type: `destructive`
- Source: `src/tools/profiles.ts`
- Purpose: Save a snapshot of the current browser session state (cookies, localStorage, current URL) to disk for later restoration. This saves a session snapshot — not an actual Edge browser profile. Use browser_discover_profiles to list real Edge browser profiles on this machine.

```typescript
inputSchema: saveProfileSchema
```

### `browser_save_storage_state`

- Category: Cookies and storage
- Type: `readOnly`
- Source: `src/tools/storage.ts`
- Purpose: Autonomously save browser storage state (cookies, localStorage, and optionally IndexedDB) to a file. Useful for persisting authentication and session state.

```typescript
inputSchema: z.object({ filename: z.string().optional().describe('File name to save storage state to. Defaults to storage-state-{timestamp}.json'), includeIndexedDB: z.boolean().optional().default(false).describe('Whether to include IndexedDB contents (useful for Firebase Auth and similar apps)'), })
```

### `browser_screen_capture`

- Category: Core (coordinate-based)
- Type: `readOnly`
- Source: `src/tools/vision.ts`
- Purpose: Take a screenshot of the current page

```typescript
inputSchema: z.object({})
```

### `browser_screen_click`

- Category: Core (coordinate-based)
- Type: `destructive`
- Source: `src/tools/vision.ts`
- Purpose: Click left mouse button

```typescript
inputSchema: elementSchema.extend({ x: z.number().describe('X coordinate'), y: z.number().describe('Y coordinate'), })
```

### `browser_screen_drag`

- Category: Core (coordinate-based)
- Type: `destructive`
- Source: `src/tools/vision.ts`
- Purpose: Drag left mouse button

```typescript
inputSchema: elementSchema.extend({ startX: z.number().describe('Start X coordinate'), startY: z.number().describe('Start Y coordinate'), endX: z.number().describe('End X coordinate'), endY: z.number().describe('End Y coordinate'), })
```

### `browser_screen_move_mouse`

- Category: Core (coordinate-based)
- Type: `readOnly`
- Source: `src/tools/vision.ts`
- Purpose: Move mouse to a given position

```typescript
inputSchema: elementSchema.extend({ x: z.number().describe('X coordinate'), y: z.number().describe('Y coordinate'), })
```

### `browser_screen_type`

- Category: Core (coordinate-based)
- Type: `destructive`
- Source: `src/tools/vision.ts`
- Purpose: Type text

```typescript
inputSchema: z.object({ text: z.string().describe('Text to type into the element'), submit: z.boolean().optional().describe('Whether to submit entered text (press Enter after)'), })
```

### `browser_scroll`

- Category: Scrolling
- Type: `readOnly`
- Source: `src/tools/scroll.ts`
- Purpose: Autonomously scroll the page using mouse wheel. Positive deltaY scrolls down, negative scrolls up. Positive deltaX scrolls right, negative scrolls left.

```typescript
inputSchema: z.object({ deltaX: z.number().optional().default(0).describe('Horizontal scroll amount in pixels. Positive scrolls right, negative scrolls left.'), deltaY: z.number().optional().default(0).describe('Vertical scroll amount in pixels. Positive scrolls down, negative scrolls up.'), })
```

### `browser_scroll_to_element`

- Category: Scrolling
- Type: `readOnly`
- Source: `src/tools/scroll.ts`
- Purpose: Autonomously scroll an element into view. Useful for revealing elements before interacting with them.

```typescript
inputSchema: z.object({ element: z.string().describe('Human-readable element description for permission'), ref: z.string().describe('Exact target element reference from the page snapshot'), })
```

### `browser_select_option`

- Category: Accessibility interaction
- Type: `destructive`
- Source: `src/tools/snapshot.ts`
- Purpose: Autonomously select options in dropdown menus on the web page

```typescript
inputSchema: selectOptionSchema
```

### `browser_set_cookie`

- Category: Cookies and storage
- Type: `destructive`
- Source: `src/tools/storage.ts`
- Purpose: Autonomously set a browser cookie.

```typescript
inputSchema: z.object({ name: z.string().describe('Cookie name'), value: z.string().describe('Cookie value'), url: z.string().optional().describe('URL to associate the cookie with (either url or domain+path required)'), domain: z.string().optional().describe('Cookie domain'), path: z.string().optional().default('/').describe('Cookie path'), expires: z.number().optional().describe('Unix timestamp when the cookie expires'), httpOnly: z.boolean().optional().default(false).describe('Whether the cookie is HTTP-only'), secure: z.boolean().optional().default(false).describe('Whether the cookie requires HTTPS'), sameSite: z.enum(['Strict', 'Lax', 'None']).optional().describe('SameSite attribute'), })
```

### `browser_set_local_storage`

- Category: Cookies and storage
- Type: `destructive`
- Source: `src/tools/storage.ts`
- Purpose: Autonomously set a localStorage item for the current page.

```typescript
inputSchema: z.object({ key: z.string().describe('Storage key'), value: z.string().describe('Storage value'), })
```

### `browser_snapshot`

- Category: Accessibility interaction
- Type: `readOnly`
- Source: `src/tools/snapshot.ts`
- Purpose: Autonomously capture a detailed accessibility snapshot of the current page for analysis. This provides structured page content better than a screenshot.

```typescript
inputSchema: z.object({})
```

### `browser_start_autonomous_crawl`

- Category: Autonomous crawling
- Type: `destructive`
- Source: `src/tools/autonomous.ts`
- Purpose: Start autonomous crawling session with BFS strategy, memory, and reporting

```typescript
inputSchema: z.object({ startUrl: z.string().url().describe('Starting URL for autonomous crawling'), goal: z.string().optional().describe('Goal description for the crawling session'), maxDepth: z.number().int().min(1).max(10).default(3).describe('Maximum crawl depth'), maxPages: z.number().int().min(1).max(100).default(50).describe('Maximum pages to visit'), timeoutMs: z.number().int().min(30000).max(600000).default(300000).describe('Session timeout in milliseconds'), allowedDomains: z.array(z.string()).optional().describe('List of allowed domains (restricts crawling)'), generateReport: z.boolean().default(true).describe('Generate HTML report at the end'), takeScreenshots: z.boolean().default(true).describe('Take screenshots during crawling'), memoryEnabled: z.boolean().default(true).describe('Enable memory system for state tracking'), verbose: z.boolean().default(false).describe('Enable verbose logging') })
```

### `browser_switch_profile`

- Category: Profiles and session states
- Type: `destructive`
- Source: `src/tools/profiles.ts`
- Purpose: Restore a previously saved session state snapshot, including cookies, localStorage, and navigate to the saved URL. This restores a session snapshot — not an actual Edge browser profile. Use browser_discover_profiles to list real Edge browser profiles on this machine.

```typescript
inputSchema: switchProfileSchema
```

### `browser_tab_close`

- Category: Tabs
- Type: `destructive`
- Source: `src/tools/tabs.ts`
- Purpose: Autonomously close a browser tab by index, or close the current tab if no index specified

```typescript
inputSchema: z.object({ index: z.number().optional().describe('The index of the tab to close. Closes current tab if not provided.'), })
```

### `browser_tab_list`

- Category: Tabs
- Type: `readOnly`
- Source: `src/tools/tabs.ts`
- Purpose: Autonomously list all open browser tabs and their current status

```typescript
inputSchema: z.object({})
```

### `browser_tab_new`

- Category: Tabs
- Type: `readOnly`
- Source: `src/tools/tabs.ts`
- Purpose: Autonomously open a new browser tab, optionally navigating to a specified URL

```typescript
inputSchema: z.object({ url: z.string().optional().describe('The URL to navigate to in the new tab. If not provided, the new tab will be blank.'), })
```

### `browser_tab_select`

- Category: Tabs
- Type: `readOnly`
- Source: `src/tools/tabs.ts`
- Purpose: Autonomously select and switch to a specific browser tab by index

```typescript
inputSchema: z.object({ index: z.number().describe('The index of the tab to select'), })
```

### `browser_take_screenshot`

- Category: Screenshots
- Type: `readOnly`
- Source: `src/tools/screenshot.ts`
- Purpose: Autonomous screenshot capture

```typescript
inputSchema: screenshotSchema
```

### `browser_type`

- Category: Accessibility interaction
- Type: `destructive`
- Source: `src/tools/snapshot.ts`
- Purpose: Autonomously type text into editable elements on the web page

```typescript
inputSchema: typeSchema
```

### `browser_wait_for`

- Category: Waiting
- Type: `readOnly`
- Source: `src/tools/wait.ts`
- Purpose: Autonomously wait for specific conditions: text appearance, text disappearance, or time duration

```typescript
inputSchema: z.object({ time: z.number().optional().describe('The time to wait in seconds'), text: z.string().optional().describe('The text to wait for'), textGone: z.string().optional().describe('The text to wait for to disappear'), })
```

---

_Last updated: 2026-08-10 (v2.1.4)_
