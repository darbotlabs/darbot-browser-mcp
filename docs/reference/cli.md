# CLI reference

This reference documents the `darbot-browser-mcp` command-line interface for v2.1.4.

You'll learn:

- Which flags control browser launch, transport, profiles, traces, and network policy.
- Which flags are incompatible.
- How to compose common startup commands.

## Syntax

```bash
darbot-browser-mcp [options]
```

Use with npm without installation:

```bash
npx @darbotlabs/darbot-browser-mcp@2.1.4 [options]
```

## Options

| Option | Description |
| --- | --- |
| `--allowed-origins <origins>` | Semicolon-separated list of origins the browser may request. |
| `--blocked-origins <origins>` | Semicolon-separated list of origins to block; evaluated before allowlist. |
| `--block-service-workers` | Block service workers in the browser context. |
| `--browser <browser>` | Browser or channel: `msedge`, `chrome`, `firefox`, `webkit`, `chromium`, and channel variants. |
| `--browser-agent <endpoint>` | Experimental browser-agent endpoint. |
| `--caps <caps>` | Comma-separated capabilities such as `core`, `tabs`, `pdf`, `history`, `wait`, `files`, `install`, `testing`. |
| `--cdp-endpoint <endpoint>` | Connect to an existing Chromium CDP endpoint. |
| `--config <path>` | Load JSON configuration. |
| `--device <device>` | Playwright device profile, for example `iPhone 15`. |
| `--executable-path <path>` | Browser executable path. |
| `--headless` | Run browser headless. |
| `--host <host>` | Host for HTTP mode; defaults to localhost. |
| `--ignore-https-errors` | Ignore TLS certificate errors in the browser context. |
| `--isolated` | Keep profile in memory and discard state on close. |
| `--image-responses <mode>` | `allow`, `omit`, or `auto`. |
| `--no-sandbox` | Disable Chromium sandbox where required by the host. |
| `--output-dir <path>` | Directory for traces, screenshots, PDFs, portable session bundles, workspace metadata files, and generated files. |
| `--port <port>` | Enable HTTP transport on a port. |
| `--proxy-bypass <bypass>` | Comma-separated proxy bypass domains. |
| `--proxy-server <proxy>` | HTTP or SOCKS proxy server. |
| `--save-trace` | Save Playwright trace data. |
| `--storage-state <path>` | Load initial Playwright storage state. |
| `--user-agent <ua>` | Override browser user agent. |
| `--user-data-dir <path>` | Persist browser data in a specific directory. |
| `--viewport-size <size>` | Viewport as `width,height`. |
| `--edge-profile <name>` | Record Edge profile name in session-state metadata. |
| `--edge-profile-email <email>` | Record Edge profile email in session-state metadata. |
| `--workspace <name>` | Record workspace context in session-state metadata. |
| `--auto-sign-in` | Record an Edge auto sign-in preference. |
| `--profile-switching` | Record automatic profile switching preference. |
| `--intranet-switch` | Record intranet profile switching preference. |
| `--ie-mode-switch` | Record IE mode profile switching preference. |
| `--default-profile <name>` | Record default Edge profile preference. |
| `--extension` | Hidden flag that starts the browser extension CDP relay. Requires `--port`. |

## Incompatibilities

- `--device` is not supported with `--cdp-endpoint`.
- `--device` is not supported with `--extension`.
- `--extension` requires `--port` and Chromium-based browsers.

## Examples

Local stdio with Edge:

```bash
npx @darbotlabs/darbot-browser-mcp@2.1.4 --browser msedge
```

HTTP mode for a remote MCP client:

```bash
npx @darbotlabs/darbot-browser-mcp@2.1.4 --port 8931 --host localhost --browser msedge
```

Extension bridge relay:

```bash
npx @darbotlabs/darbot-browser-mcp@2.1.4 --port 9223 --extension --browser msedge
```

Trace-producing test session:

```bash
npx @darbotlabs/darbot-browser-mcp@2.1.4 --isolated --save-trace --output-dir .darbot/output
```
---

_Last updated: 2026-08-10 (v2.1.4)_
