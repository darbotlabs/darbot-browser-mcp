# Darbot Browser MCP

![Darbot Banner](./assets/darbot_logo_icon_pack/darbot-horizontal-banner-1500x500.png)

**🤖 Your Autonomous Browser Companion - Powered by AI**

A Model Context Protocol (MCP) server that provides intelligent autonomous browser capabilities. This server enables AI models to interact with web pages through structured accessibility snapshots, delivering autonomous browsing without requiring vision models. Optimized for Microsoft Edge with comprehensive work profile support.

[![NPM Version](https://img.shields.io/npm/v/@darbotlabs/darbot-browser-mcp?style=flat-square&color=0098FF)](https://www.npmjs.com/package/@darbotlabs/darbot-browser-mcp)
[![Downloads](https://img.shields.io/npm/dm/@darbotlabs/darbot-browser-mcp?style=flat-square&color=0098FF)](https://www.npmjs.com/package/@darbotlabs/darbot-browser-mcp)
[![VS Code Extension](https://img.shields.io/visual-studio-marketplace/v/darbotlabs.darbot-browser-mcp?style=flat-square&color=24bfa5&label=VS%20Code)](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)](./LICENSE)

## ✨ Key Features

- **🚀 Fast and lightweight** - Uses accessibility tree, not pixel-based input
- **🧠 AI-friendly** - No vision models needed, operates purely on structured data  
- **🎯 Deterministic** - Avoids ambiguity common with screenshot-based approaches
- **🔄 Work Profiles** - Save and restore complete browser sessions
- **🛠️ 31 Autonomous Tools** - Comprehensive autonomous browser capabilities
- **🤖 Autonomous Crawling** - BFS strategy with memory, guardrails, and reporting
- **🧠 Memory System** - State tracking and deduplication with darbot-memory-mcp integration
- **📊 HTML Reports** - Comprehensive crawl reports with screenshots and statistics
- **⚡ Multi-Platform** - Available as NPM package, VS Code extension, NuGet package, and browser extension

## 📋 Requirements
- **Node.js** 18 or newer
- **VS Code, Cursor, Windsurf, Claude Desktop** or any other MCP client
- **Microsoft Edge** (recommended) or Chrome/Firefox/WebKit

## 📦 Installation Options

Darbot Browser MCP is available in multiple package formats:

### 🔧 NPM Package
```bash
# Install globally
npm install -g @darbotlabs/darbot-browser-mcp

# Or use with npx (recommended)
npx @darbotlabs/darbot-browser-mcp@latest
```

### 🔌 VS Code Extension
Install the **"Darbot Browser MCP"** extension from the VS Code marketplace or search for `darbotlabs.darbot-browser-mcp`.

The extension **automatically configures the MCP server** when installed - just enable MCP in VS Code settings and start the server!

[**📥 Install VS Code Extension**](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp)

**Quick Setup:**
1. Install the extension from VS Code marketplace
2. The extension will automatically prompt you to enable MCP and configure the server
3. Use Command Palette: "Darbot Browser MCP: Start Server" 
4. Start chatting with GitHub Copilot using browser automation tools!

### 📚 NuGet Package (.NET)
```bash
# Install for .NET projects
dotnet add package DarbotLabs.Browser.MCP
```

### 🌐 Browser Extension
Install the **Browser MCP Bridge** extension from the Chrome Web Store to share browser tabs with the MCP server.

---

## 🎯 Why Choose Darbot Browser MCP?

| Traditional Browser Automation | 🤖 Darbot Browser MCP |
|--------------------------------|------------------------|
| ❌ Pixel-based, brittle selectors | ✅ AI-friendly accessibility snapshots |
| ❌ Requires vision models | ✅ Pure structured data approach |
| ❌ Complex setup and maintenance | ✅ Simple NPM install, ready in seconds |
| ❌ Browser-specific code | ✅ Universal MCP protocol |
| ❌ No session management | ✅ Advanced autonomous work profiles |

### 🛠️ Complete Autonomous Toolkit (31 Tools)

<details>
<summary><b>🔧 Core Autonomous Operations</b></summary>

- `browser_navigate` - Autonomously navigate to any URL
- `browser_click` - Autonomous intelligent element clicking  
- `browser_type` - Autonomous smart text input with submit options
- `browser_snapshot` - AI-optimized autonomous accessibility snapshots
- `browser_wait_for` - Autonomous intelligent waiting conditions

</details>

<details>
<summary><b>🤖 Autonomous Crawling & Intelligence</b></summary>

- `browser_start_autonomous_crawl` - Start intelligent BFS crawling with memory and reporting
- `browser_configure_memory` - Configure memory system with darbot-memory-mcp integration
- Built-in guardrail system for safe autonomous operation
- Comprehensive HTML reporting with screenshots and statistics

</details>

<details>
<summary><b>📁 Autonomous Work Profile Management</b></summary>

- `browser_save_profile` - Autonomously save complete browser sessions
- `browser_switch_profile` - Autonomously load saved profiles  
- `browser_list_profiles` - Autonomously manage all your profiles
- `browser_delete_profile` - Autonomous clean profile management

</details>

<details>
<summary><b>🖼️ Autonomous Media & Resources</b></summary>

- `browser_take_screenshot` - Autonomous high-quality screenshots
- `browser_pdf_save` - Autonomous PDF generation from pages
- `browser_file_upload` - Autonomous file upload handling

</details>

<details>
<summary><b>🗂️ Autonomous Tab Management</b></summary>

- `browser_tab_new` - Autonomously open new tabs
- `browser_tab_list` - Autonomously get all open tabs
- `browser_tab_select` - Autonomously switch between tabs
- `browser_tab_close` - Autonomous clean tab management

</details>

<details>
<summary><b>🧪 Autonomous Testing & Development</b></summary>

- `browser_generate_playwright_test` - Autonomously auto-generate test code
- `browser_console_messages` - Autonomous debug with console access
- `browser_network_requests` - Autonomous network activity monitoring

</details>

[**📖 View All 29 Tools**](#tools)

<!--
// Generate using:
node utils/generate-links.js
-->

## 🚀 Getting Started

The fastest way to get started is with the VS Code extension, which automatically configures everything for you. For other clients, you'll need to manually configure the MCP server.

### **🔌 VS Code (Automatic Setup)**
1. Install the [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp)
2. Extension auto-configures MCP settings
3. Start the server via Command Palette
4. Use with GitHub Copilot Chat!

### **⚙️ Manual Configuration (Other Clients)**
For Claude Desktop, Cursor, Windsurf, etc., add this configuration:

```js
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": [
        "@darbotlabs/darbot-browser-mcp@latest"
      ]
    }
  }
}
```

### 📱 Quick Install Buttons

**🔌 VS Code (Automatic):**
[<img src="https://img.shields.io/badge/VS_Code-Auto_Install_Extension-0098FF?style=for-the-badge&logo=visual-studio-code" alt="Install VS Code Extension">](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp)

**⚙️ Manual Configuration:**
[<img src="https://img.shields.io/badge/VS_Code-Manual_Server_Config-0098FF?style=for-the-badge&logo=visual-studio-code" alt="Install in VS Code">](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522browser%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540darbotlabs%252Fdarbot-browser-mcp%2540latest%2522%255D%257D) [<img src="https://img.shields.io/badge/VS_Code_Insiders-Manual_Server_Config-24bfa5?style=for-the-badge&logo=visual-studio-code" alt="Install in VS Code Insiders">](https://insiders.vscode.dev/redirect?url=vscode-insiders%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522browser%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540darbotlabs%252Fdarbot-browser-mcp%2540latest%2522%255D%257D)


<details><summary><b>Install in VS Code (Automatic Setup)</b></summary>

**🚀 Recommended: Use the VS Code Extension for automatic setup!**

The [Darbot Browser MCP Extension](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp) automatically handles all configuration:

1. **Install from marketplace**: Search "Darbot Browser MCP" in VS Code extensions
2. **Auto-configuration**: Extension prompts to enable MCP and configures the server
3. **Start & Use**: Use Command Palette → "Darbot Browser MCP: Start Server"
4. **Chat with Copilot**: Ask GitHub Copilot to "browse to example.com"

**Manual CLI installation (if you prefer):**
```bash
# For VS Code
code --add-mcp '{"name":"browser","command":"npx","args":["@darbotlabs/darbot-browser-mcp@latest"]}'
```

After installation, the Browser MCP server will be available for use with your GitHub Copilot agent in VS Code.
</details>

<details>
<summary><b>Install in Cursor</b></summary>

#### Click the button to install:

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=browser&config=eyJjb21tYW5kIjogIm5weCBAZGFyYm90bGFicy9kYXJib3QtYnJvd3Nlci1tY3BAbGF0ZXN0In0K)

#### Or install manually:

Go to `Cursor Settings` -> `MCP` -> `Add new MCP Server`. Name to your liking, use `command` type with the command `npx @darbotlabs/darbot-browser-mcp`. You can also verify config or add command like arguments via clicking `Edit`.

```js
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": [
        "@darbotlabs/darbot-browser-mcp@latest"
      ]
    }
  }
}
```
</details>

<details>
<summary><b>Install in Windsurf</b></summary>

Follow Windsuff MCP [documentation](https://docs.windsurf.com/windsurf/cascade/mcp). Use following configuration:

```js
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": [
        "@darbotlabs/darbot-browser-mcp@latest"
      ]
    }
  }
}
```
</details>

<details>
<summary><b>Install in Claude Desktop</b></summary>

Follow the MCP install [guide](https://modelcontextprotocol.io/quickstart/user), use following configuration:

```js
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": [
        "@darbotlabs/darbot-browser-mcp@latest"
      ]
    }
  }
}
```
</details>

<details>
<summary><b>Install in Claude Code</b></summary>

Use the Claude Code CLI to add the Browser MCP server:

```bash
claude mcp add browser npx @darbotlabs/darbot-browser-mcp@latest
```
</details>

<details>
<summary><b>Install in Qodo Gen</b></summary>

Open [Qodo Gen](https://docs.qodo.ai/qodo-documentation/qodo-gen) chat panel in VSCode or IntelliJ → Connect more tools → + Add new MCP → Paste the following configuration:

```js
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": [
        "@darbotlabs/darbot-browser-mcp@latest"
      ]
    }
  }
}
```

Click <code>Save</code>.
</details>

### Configuration

Browser MCP server supports following arguments. They can be provided in the JSON configuration above, as a part of the `"args"` list:

<!--- Options generated by update-readme.js -->

```
> npx darbot-browser-mcp@latest --help
  --allowed-origins <origins>  semicolon-separated list of origins to allow the
                               browser to request. Default is to allow all.
  --blocked-origins <origins>  semicolon-separated list of origins to block the
                               browser from requesting. Blocklist is evaluated
                               before allowlist. If used without the allowlist,
                               requests not matching the blocklist are still
                               allowed.
  --block-service-workers      block service workers
  --browser <browser>          browser or chrome channel to use, possible
                               values: msedge, chrome, firefox, webkit.
  --browser-agent <endpoint>   Use browser agent (experimental).
  --caps <caps>                comma-separated list of capabilities to enable,
                               possible values: tabs, pdf, history, wait, files,
                               install. Default is all.
  --cdp-endpoint <endpoint>    CDP endpoint to connect to.
  --config <path>              path to the configuration file.
  --device <device>            device to emulate, for example: "iPhone 15"
  --executable-path <path>     path to the browser executable.
  --headless                   run browser in headless mode, headed by default
  --host <host>                host to bind server to. Default is localhost. Use
                               0.0.0.0 to bind to all interfaces.
  --ignore-https-errors        ignore https errors
  --isolated                   keep the browser profile in memory, do not save
                               it to disk.
  --image-responses <mode>     whether to send image responses to the client.
                               Can be "allow", "omit", or "auto". Defaults to
                               "auto", which sends images if the client can
                               display them.
  --no-sandbox                 disable the sandbox for all process types that
                               are normally sandboxed.
  --output-dir <path>          path to the directory for output files.
  --port <port>                port to listen on for SSE transport.
  --proxy-bypass <bypass>      comma-separated domains to bypass proxy, for
                               example ".com,chromium.org,.domain.com"
  --proxy-server <proxy>       specify proxy server, for example
                               "http://myproxy:3128" or "socks5://myproxy:8080"
  --save-trace                 Whether to save the Playwright Trace of the
                               session into the output directory.
  --storage-state <path>       path to the storage state file for isolated
                               sessions.
  --user-agent <ua string>     specify user agent string
  --user-data-dir <path>       path to the user data directory. If not
                               specified, a temporary directory will be created.
  --viewport-size <size>       specify browser viewport size in pixels, for
                               example "1280, 720"
  --vision                     Run server that uses screenshots (Aria snapshots
                               are used by default)
```

<!--- End of options generated section -->

### User profile

You can run Browser MCP with persistent profile like a regular browser (default), or in the isolated contexts for the testing sessions.

**Persistent profile**

All the logged in information will be stored in the persistent profile, you can delete it between sessions if you'd like to clear the offline state.
Persistent profile is located at the following locations and you can override it with the `--user-data-dir` argument.

```bash
# Windows
%USERPROFILE%\AppData\Local\ms-playwright\mcp-{channel}-profile

# macOS
- ~/Library/Caches/ms-playwright/mcp-{channel}-profile

# Linux
- ~/.cache/ms-playwright/mcp-{channel}-profile
```

**Isolated**

In the isolated mode, each session is started in the isolated profile. Every time you ask MCP to close the browser,
the session is closed and all the storage state for this session is lost. You can provide initial storage state
to the browser via the config's `contextOptions` or via the `--storage-state` argument. Learn more about the storage
state [here](https://playwright.dev/docs/auth).

```js
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": [
        "@darbotlabs/darbot-browser-mcp@latest",
        "--isolated",
        "--storage-state={path/to/storage.json}"
      ]
    }
  }
}
```

### Configuration file

The Browser MCP server can be configured using a JSON configuration file. You can specify the configuration file
using the `--config` command line option:

```bash
npx @darbotlabs/darbot-browser-mcp@latest --config path/to/config.json
```

<details>
<summary>Configuration file schema</summary>

```typescript
{
  // Browser configuration
  browser?: {
    // Browser type to use (chromium, firefox, or webkit)
    browserName?: 'chromium' | 'firefox' | 'webkit';

    // Keep the browser profile in memory, do not save it to disk.
    isolated?: boolean;

    // Path to user data directory for browser profile persistence
    userDataDir?: string;

    // Browser launch options (see Playwright docs)
    // @see https://playwright.dev/docs/api/class-browsertype#browser-type-launch
    launchOptions?: {
      channel?: string;        // Browser channel (e.g. 'msedge')
      headless?: boolean;      // Run in headless mode
      executablePath?: string; // Path to browser executable
      // ... other Playwright launch options
    };

    // Browser context options
    // @see https://playwright.dev/docs/api/class-browser#browser-new-context
    contextOptions?: {
      viewport?: { width: number, height: number };
      // ... other Playwright context options
    };

    // CDP endpoint for connecting to existing browser
    cdpEndpoint?: string;

    // Remote Playwright server endpoint
    remoteEndpoint?: string;
  },

  // Server configuration
  server?: {
    port?: number;  // Port to listen on
    host?: string;  // Host to bind to (default: localhost)
  },

  // List of enabled capabilities
  capabilities?: Array<
    'core' |    // Core browser automation
    'tabs' |    // Tab management
    'pdf' |     // PDF generation
    'history' | // Browser history
    'wait' |    // Wait utilities
    'files' |   // File handling
    'install' | // Browser installation
    'testing'   // Testing
  >;

  // Enable vision mode (screenshots instead of accessibility snapshots)
  vision?: boolean;

  // Directory for output files
  outputDir?: string;

  // Network configuration
  network?: {
    // List of origins to allow the browser to request. Default is to allow all. Origins matching both `allowedOrigins` and `blockedOrigins` will be blocked.
    allowedOrigins?: string[];

    // List of origins to block the browser to request. Origins matching both `allowedOrigins` and `blockedOrigins` will be blocked.
    blockedOrigins?: string[];
  };
 
  /**
   * Do not send image responses to the client.
   */
  noImageResponses?: boolean;
}
```
</details>

### Standalone MCP server

When running headed browser on system w/o display or from worker processes of the IDEs,
run the MCP server from environment with the DISPLAY and pass the `--port` flag to enable SSE transport.

```bash
npx @darbotlabs/darbot-browser-mcp@latest --port 8931
```

And then in MCP client config, set the `url` to the SSE endpoint:

```js
{
  "mcpServers": {
    "playwright": {
      "url": "http://localhost:8931/sse"
    }
  }
}
```

<details>
<summary><b>Docker</b></summary>

**NOTE:** The Docker implementation only supports headless chromium at the moment.

```js
{
  "mcpServers": {
    "playwright": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "--init", "--pull=always", "mcr.microsoft.com/playwright/mcp"]
    }
  }
}
```

You can build the Docker image yourself.

```
docker build -t mcr.microsoft.com/playwright/mcp .
```
</details>

<details>
<summary><b>Programmatic usage</b></summary>

```js
import http from 'http';

import { createConnection } from '@darbotlabs/darbot-browser-mcp';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

http.createServer(async (req, res) => {
  // ...

  // Creates a headless Browser MCP server with SSE transport
  const connection = await createConnection({ browser: { launchOptions: { headless: true } } });
  const transport = new SSEServerTransport('/messages', res);
  await connection.sever.connect(transport);

  // ...
});
```
</details>

### Tools

The tools are available in two modes:

1. **Snapshot Mode** (default): Uses accessibility snapshots for better performance and reliability
2. **Vision Mode**: Uses screenshots for visual-based interactions

To use Vision Mode, add the `--vision` flag when starting the server:

```js
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": [
        "@darbotlabs/darbot-browser-mcp@latest",
        "--vision"
      ]
    }
  }
}
```

Vision Mode works best with the computer use models that are able to interact with elements using
X Y coordinate space, based on the provided screenshot.

<!--- Tools generated by update-readme.js -->

<details>
<summary><b>Interactions</b></summary>

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_snapshot**
  - Title: Autonomous page snapshot
  - Description: Autonomously capture a detailed accessibility snapshot of the current page for analysis. This provides structured page content better than a screenshot.
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_click**
  - Title: Autonomous click
  - Description: Autonomously perform click interactions on web page elements
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
    - `doubleClick` (boolean, optional): Whether to perform a double click instead of a single click
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_drag**
  - Title: Autonomous drag & drop
  - Description: Autonomously perform drag and drop operations between web page elements
  - Parameters:
    - `startElement` (string): Human-readable source element description used to obtain the permission to interact with the element
    - `startRef` (string): Exact source element reference from the page snapshot
    - `endElement` (string): Human-readable target element description used to obtain the permission to interact with the element
    - `endRef` (string): Exact target element reference from the page snapshot
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_hover**
  - Title: Autonomous hover
  - Description: Autonomously hover over specific elements on the web page
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_type**
  - Title: Autonomous text input
  - Description: Autonomously type text into editable elements on the web page
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
    - `text` (string): Text to type into the element
    - `submit` (boolean, optional): Whether to submit entered text (press Enter after)
    - `slowly` (boolean, optional): Whether to type one character at a time. Useful for triggering key handlers in the page. By default entire text is filled in at once.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_select_option**
  - Title: Autonomous dropdown selection
  - Description: Autonomously select options in dropdown menus on the web page
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
    - `values` (array): Array of values to select in the dropdown. This can be a single value or multiple values.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_press_key**
  - Title: Autonomous keyboard input
  - Description: Autonomously press keys on the keyboard to interact with the web page
  - Parameters:
    - `key` (string): Name of the key to press or a character to generate, such as `ArrowLeft` or `a`
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_wait_for**
  - Title: Autonomous wait conditions
  - Description: Autonomously wait for specific conditions: text appearance, text disappearance, or time duration
  - Parameters:
    - `time` (number, optional): The time to wait in seconds
    - `text` (string, optional): The text to wait for
    - `textGone` (string, optional): The text to wait for to disappear
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_file_upload**
  - Title: Autonomous file upload
  - Description: Autonomously upload one or multiple files when a file chooser dialog appears
  - Parameters:
    - `paths` (array): The absolute paths to the files to upload. Can be a single file or multiple files.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_handle_dialog**
  - Title: Autonomous dialog handling
  - Description: Autonomously handle browser dialog boxes (alerts, confirmations, prompts)
  - Parameters:
    - `accept` (boolean): Whether to accept the dialog.
    - `promptText` (string, optional): The text of the prompt in case of a prompt dialog.
  - Read-only: **false**

</details>

<details>
<summary><b>Navigation</b></summary>

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_navigate**
  - Title: Navigate to a URL
  - Description: Autonomously navigate the browser to any URL. Use this command to launch and direct the browser to websites.
  - Parameters:
    - `url` (string): The URL to navigate to
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_navigate_back**
  - Title: Go back
  - Description: Autonomously navigate back to the previous page in browser history
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_navigate_forward**
  - Title: Go forward
  - Description: Autonomously navigate forward to the next page in browser history
  - Parameters: None
  - Read-only: **true**

</details>

<details>
<summary><b>Resources</b></summary>

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_take_screenshot**
  - Title: Autonomous screenshot capture
  - Description: Autonomously take visual screenshots of the current page or specific elements. Use browser_snapshot for structured page data instead of visual screenshots.
  - Parameters:
    - `raw` (boolean, optional): Whether to return without compression (in PNG format). Default is false, which returns a JPEG image.
    - `filename` (string, optional): File name to save the screenshot to. Defaults to `page-{timestamp}.{png|jpeg}` if not specified.
    - `element` (string, optional): Human-readable element description used to obtain permission to screenshot the element. If not provided, the screenshot will be taken of viewport. If element is provided, ref must be provided too.
    - `ref` (string, optional): Exact target element reference from the page snapshot. If not provided, the screenshot will be taken of viewport. If ref is provided, element must be provided too.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_pdf_save**
  - Title: Autonomous PDF generation
  - Description: Autonomously save the current web page as a PDF document for archival or sharing
  - Parameters:
    - `filename` (string, optional): File name to save the pdf to. Defaults to `page-{timestamp}.pdf` if not specified.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_network_requests**
  - Title: Autonomous network monitoring
  - Description: Autonomously capture and analyze all network requests made since page load for debugging
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_console_messages**
  - Title: Autonomous console monitoring
  - Description: Autonomously retrieve all browser console messages for debugging and analysis
  - Parameters: None
  - Read-only: **true**

</details>

<details>
<summary><b>Utilities</b></summary>

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_install**
  - Title: Autonomous browser installation
  - Description: Autonomously install the required browser engine specified in configuration. Use this to resolve browser installation errors.
  - Parameters: None
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_close**
  - Title: Autonomous browser closure
  - Description: Autonomously close the browser session and terminate all operations
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_resize**
  - Title: Autonomous window resizing
  - Description: Autonomously resize the browser window to specific dimensions for optimal viewing
  - Parameters:
    - `width` (number): Width of the browser window
    - `height` (number): Height of the browser window
  - Read-only: **true**

</details>

<details>
<summary><b>Tabs</b></summary>

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_tab_list**
  - Title: Autonomous tab listing
  - Description: Autonomously list all open browser tabs and their current status
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_tab_new**
  - Title: Autonomous new tab creation
  - Description: Autonomously open a new browser tab, optionally navigating to a specified URL
  - Parameters:
    - `url` (string, optional): The URL to navigate to in the new tab. If not provided, the new tab will be blank.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_tab_select**
  - Title: Autonomous tab selection
  - Description: Autonomously select and switch to a specific browser tab by index
  - Parameters:
    - `index` (number): The index of the tab to select
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_tab_close**
  - Title: Autonomous tab closure
  - Description: Autonomously close a browser tab by index, or close the current tab if no index specified
  - Parameters:
    - `index` (number, optional): The index of the tab to close. Closes current tab if not provided.
  - Read-only: **false**

</details>

<details>
<summary><b>Work Profiles</b></summary>

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_save_profile**
  - Title: Autonomous profile saving
  - Description: Autonomously save the current browser state as a reusable work profile for later restoration
  - Parameters:
    - `name` (string): Name for the work profile
    - `description` (string, optional): Optional description for the work profile
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_switch_profile**
  - Title: Autonomous profile switching
  - Description: Autonomously switch to a previously saved work profile, restoring browser state and session
  - Parameters:
    - `name` (string): Name of the work profile to switch to
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_list_profiles**
  - Title: Autonomous profile listing
  - Description: Autonomously list all saved work profiles with their details and creation information
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_delete_profile**
  - Title: Autonomous profile deletion
  - Description: Autonomously delete a saved work profile permanently from storage
  - Parameters:
    - `name` (string): Name of the work profile to delete
  - Read-only: **false**

</details>

<details>
<summary><b>Testing</b></summary>

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_generate_playwright_test**
  - Title: Autonomous test generation
  - Description: Autonomously generate Playwright test code for browser automation scenarios and user workflows
  - Parameters:
    - `name` (string): The name of the test
    - `description` (string): The description of the test
    - `steps` (array): The steps of the test
  - Read-only: **true**

</details>

<details>
<summary><b>Vision mode</b></summary>

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_screen_capture**
  - Title: Take a screenshot
  - Description: Take a screenshot of the current page
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_screen_move_mouse**
  - Title: Move mouse
  - Description: Move mouse to a given position
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `x` (number): X coordinate
    - `y` (number): Y coordinate
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_screen_click**
  - Title: Click
  - Description: Click left mouse button
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `x` (number): X coordinate
    - `y` (number): Y coordinate
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_screen_drag**
  - Title: Drag mouse
  - Description: Drag left mouse button
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `startX` (number): Start X coordinate
    - `startY` (number): Start Y coordinate
    - `endX` (number): End X coordinate
    - `endY` (number): End Y coordinate
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_screen_type**
  - Title: Type text
  - Description: Type text
  - Parameters:
    - `text` (string): Text to type into the element
    - `submit` (boolean, optional): Whether to submit entered text (press Enter after)
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_press_key**
  - Title: Autonomous keyboard input
  - Description: Autonomously press keys on the keyboard to interact with the web page
  - Parameters:
    - `key` (string): Name of the key to press or a character to generate, such as `ArrowLeft` or `a`
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_wait_for**
  - Title: Autonomous wait conditions
  - Description: Autonomously wait for specific conditions: text appearance, text disappearance, or time duration
  - Parameters:
    - `time` (number, optional): The time to wait in seconds
    - `text` (string, optional): The text to wait for
    - `textGone` (string, optional): The text to wait for to disappear
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_file_upload**
  - Title: Autonomous file upload
  - Description: Autonomously upload one or multiple files when a file chooser dialog appears
  - Parameters:
    - `paths` (array): The absolute paths to the files to upload. Can be a single file or multiple files.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.js -->

- **browser_handle_dialog**
  - Title: Autonomous dialog handling
  - Description: Autonomously handle browser dialog boxes (alerts, confirmations, prompts)
  - Parameters:
    - `accept` (boolean): Whether to accept the dialog.
    - `promptText` (string, optional): The text of the prompt in case of a prompt dialog.
  - Read-only: **false**

</details>


<!--- End of tools generated section -->

## Package Formats

### NPM Package
- **Name**: `@darbotlabs/darbot-browser-mcp`
- **Installation**: `npm install -g @darbotlabs/darbot-browser-mcp`
- **Usage**: `npx @darbotlabs/darbot-browser-mcp@latest`

### VS Code Extension
- **Name**: Darbot Browser MCP
- **Publisher**: darbotlabs
- **Installation**: Search for "Darbot Browser MCP" in VS Code Extensions marketplace
- **Features**: Start/stop MCP server, status monitoring, configuration management

### NuGet Package (.NET)
- **Name**: `DarbotLabs.Browser.MCP`
- **Installation**: `dotnet add package DarbotLabs.Browser.MCP`
- **Usage**: Host the Browser MCP server in .NET applications

### Browser Extension
- **Name**: Browser MCP Bridge
- **Installation**: Available in Chrome Web Store (coming soon)
- **Features**: Share browser tabs with MCP server via CDP bridge

## Repository Structure
- `/vscode-extension/` - VS Code extension source
- `/dotnet/` - .NET NuGet package source
- `/extension/` - Browser extension source
- `/src/` - Main MCP server source code
- `/tests/` - Test suite

## 🤖 Autonomous Features

For detailed information about the autonomous crawling capabilities, including memory system, BFS planner, guardrails, and reporting, see [AUTONOMOUS_FEATURES.md](./AUTONOMOUS_FEATURES.md).

**Key Autonomous Capabilities:**
- Intelligent BFS crawling with memory and state tracking
- Darbot-memory-mcp integration for persistent memory  
- Comprehensive guardrail system for safe operation
- HTML report generation with screenshots and statistics
- Configurable domain filtering and safety policies

## Contributing

Contributions are welcome! Please see our contributing guidelines and code of conduct.
