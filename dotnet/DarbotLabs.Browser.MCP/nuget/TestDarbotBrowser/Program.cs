using DarbotLabs.Browser.MCP;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

Console.WriteLine("Starting Darbot Browser MCP Server...");

var builder = Host.CreateApplicationBuilder(args);

// Configure logging
builder.Services.AddLogging(logging =>
{
    logging.AddConsole();
    logging.SetMinimumLevel(LogLevel.Information);
});

// Add Browser MCP Server
builder.Services.AddBrowserMcpServer(options =>
{
    options.LogLevel = "info";
    options.Environment["BROWSER"] = "msedge";
    options.Environment["VIEWPORT_SIZE"] = "1920,1080";
});

var host = builder.Build();

Console.WriteLine(" Starting the Browser MCP Server host...");
await host.StartAsync();

Console.WriteLine(" Server is running! Press Ctrl+C to stop...");
Console.WriteLine("📍 Use this with VS Code Copilot Chat: @darbot-browser-mcp navigate to https://copilotstudio.microsoft.com");

// Keep the application running
await host.WaitForShutdownAsync();
