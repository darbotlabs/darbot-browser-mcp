# DarbotLabs.Browser.MCP NuGet package

`DarbotLabs.Browser.MCP` is the .NET hosting wrapper for Darbot Browser MCP, a Model Context Protocol server that exposes 52 browser automation tools with session state support and VS Code GitHub Copilot agent mode integration.

## Install

```powershell
dotnet add package DarbotLabs.Browser.MCP --version 2.0.0
```

The wrapper launches the pinned npm server package `@darbotlabs/darbot-browser-mcp@2.0.0` through `npx` by default.

## Minimal usage

```csharp
using DarbotLabs.Browser.MCP;
using Microsoft.Extensions.Hosting;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddBrowserMcpServer(options =>
{
    options.Environment["BROWSER"] = "msedge";
    options.Environment["VIEWPORT_SIZE"] = "1920,1080";
});

await builder.Build().RunAsync();
```
