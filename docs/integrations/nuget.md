# NuGet integration

This guide explains how .NET projects consume Darbot Browser MCP through the NuGet package and hosted service patterns.

You'll learn:

- How to install the package.
- When to call a hosted MCP endpoint instead of embedding process control.
- How .NET teams should align versions with npm and VS Code releases.

## Install

```bash
dotnet add package DarbotLabs.Browser.MCP
```

## Usage model

Use the NuGet package when a .NET service or test harness needs a typed integration point for Darbot Browser MCP. For enterprise agent scenarios, prefer calling a hosted `/mcp` or connector endpoint so authentication, browser capacity, and observability remain centralized.

## Version alignment

v2.0.0 aligns npm, VS Code, hosted extension, and NuGet release tracks. Treat the npm package as the runtime authority and the NuGet package as the .NET integration surface.

## Operational guidance

- Keep browser automation out of request threads; enqueue long-running browser tasks.
- Use the [HTTP API](../reference/api.md) for service boundaries.
- Use [authentication](../architecture/auth.md) even on internal networks.
- Capture screenshots and traces as artifacts, not application logs.
---

_Last updated: 2026-05-18 (v2.0.0)_
