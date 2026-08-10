# Darbot Browser MCP Bridge — Chromium Extension

A Chrome/Edge **Manifest V3** extension that pipes Chrome DevTools Protocol
(CDP) traffic between a real browser tab and the Darbot Browser MCP server,
so an AI agent (GitHub Copilot, Copilot Studio, Claude Desktop, …) can drive
the *user's own logged-in browser*.

- **Version:** 2.0.0
- **Manifest:** v3 (service worker background)
- **Minimum Chrome:** 116
- **License:** Apache-2.0

## When to use it

The MCP server can already launch its own headless or headed browser through
Playwright. Reach for this extension only when you specifically need:

- An AI agent to operate inside the **user's signed-in browser session**
  (cookies, MFA tokens, work-profile state).
- To attach to an **existing tab** rather than spawn a fresh browser.
- To bridge a **remote** MCP server to a local user browser via a WebSocket
  (e.g. cloud-hosted MCP, local CDP).

For pure server-side automation, use the MCP server directly with
`--isolated` or `--browser msedge`; you don't need this extension.

## Architecture

```
┌────────────────────┐    chrome.debugger    ┌──────────────────────┐
│  Browser tab       │  ◄──────────────────► │  Extension service   │
│  (active page)     │       CDP             │  worker (background) │
└────────────────────┘                       └──────────┬───────────┘
                                                        │  WebSocket
                                                        │  ws://host:9223/extension
                                                        ▼
                                              ┌────────────────────┐
                                              │  MCP CDP relay     │
                                              │  (src/cdpRelay.ts) │
                                              └──────────┬─────────┘
                                                         │  CDP over WS
                                                         ▼
                                              ┌────────────────────┐
                                              │  Darbot Browser    │
                                              │  MCP server        │
                                              │  (cli.js --extension) │
                                              └────────────────────┘
```

The relay exposes two WebSocket paths:

| Path         | Speaker     | Purpose                                          |
| ------------ | ----------- | ------------------------------------------------ |
| `/extension` | Extension   | Streams CDP events and accepts CDP commands.     |
| `/cdp`       | MCP server  | Speaks CDP exactly as Playwright would.          |

## Install

### From source (recommended during v2.0.0)

1. Clone the repo and check out the v2 branch.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Toggle **Developer mode**.
4. Click **Load unpacked** and select the `extension/` directory.

### From the web stores

Chrome Web Store and Edge Add-ons listings are published per release. See
the project README for the current store links.

## Run it

1. Start the MCP server with the bridge listener:

   ```bash
   npx @darbotlabs/darbot-browser-mcp@2.1.4 --extension --port 9223
   ```

2. Click the **Darbot Browser MCP Bridge** toolbar icon and press
   **Share This Tab**. The badge turns green (`●`) once attached.

3. Point your MCP client at `http://localhost:9223/mcp`. Tools that touch a page
   will now operate against your shared tab.

4. Stop sharing from the popup at any time, or close the tab.

The bridge URL is persisted in `chrome.storage.sync`; change it in the
popup if you are connecting to a remote relay (e.g.
`wss://your-tunnel.devtunnels.ms/extension`).

## Permissions

The extension requests the **minimum** permissions required to operate:

| Permission         | Why it is needed                                            |
| ------------------ | ----------------------------------------------------------- |
| `debugger`         | Attach to a tab via the Chrome DevTools Protocol.           |
| `tabs`             | Resolve the active tab, watch for tab removals.             |
| `storage`          | Persist the user's bridge URL preference.                   |
| `<all_urls>` host  | Required by `chrome.debugger.attach` for any user-chosen page. |

The extension does **not** ship any content scripts, does not read page
content directly, and never makes outbound network calls other than the
single WebSocket to the user-configured bridge URL.

## Protected URLs

Chromium forbids debugger attachment to `chrome://`, `edge://`,
`chrome-extension://`, `view-source:`, `devtools://`, and `about:` pages.
The popup detects these and disables sharing with a friendly notice.

## Reliability

- Connection attempts time out after **10 s**.
- Lost WebSocket sessions auto-reconnect up to **3** times with 1 s
  backoff (clean close codes `1000` are respected).
- Debugger detach (e.g. browser DevTools opened by the user, tab navigated
  to a protected URL) is treated as a clean disconnect.

## Debugging

Enable verbose logging from the service worker console:

```js
chrome.storage.local.set({ debugEnabled: true });
```

Then open the service-worker DevTools from `chrome://extensions` →
*Inspect views: service worker*. All bridge traffic is logged with the
`[Darbot MCP Bridge v2.0.0]` prefix.

## Layout

```
extension/
├── background.js   Service worker: chrome.debugger ↔ WebSocket pump
├── popup.html      Popup UI
├── popup.js        Popup controller
├── manifest.json   MV3 manifest
└── icons/          16/32/48/128 px icons
```

## License

Apache License 2.0 — see [`LICENSE`](../LICENSE) at the repo root.
