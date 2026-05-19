using DarbotLabs.Browser.MCP;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

Console.WriteLine("Darbot Browser MCP NuGet smoke test starting...");

try
{
    var builder = Host.CreateApplicationBuilder(args);

    builder.Services.AddLogging(logging =>
    {
        logging.AddConsole();
        logging.SetMinimumLevel(LogLevel.Warning);
    });

    // NuGet consumers install DarbotLabs.Browser.MCP and register the hosted MCP server.
    builder.Services.AddBrowserMcpServer(options =>
    {
        options.PackageVersion = "2.0.0";
        options.LogLevel = "info";
        options.Environment["BROWSER"] = "msedge";
        options.Environment["VIEWPORT_SIZE"] = "1920,1080";
    });

    using var host = builder.Build();
    var options = host.Services.GetRequiredService<BrowserMcpOptions>();
    var hostedService = host.Services.GetServices<IHostedService>().OfType<BrowserMcpServer>().SingleOrDefault();

    if (hostedService is null)
    {
        Console.Error.WriteLine("Smoke test failed: BrowserMcpServer was not registered.");
        return 1;
    }

    if (options.PackageSpec != "@darbotlabs/darbot-browser-mcp@2.0.0")
    {
        Console.Error.WriteLine($"Smoke test failed: unexpected package spec '{options.PackageSpec}'.");
        return 1;
    }

    await Task.Yield();
    Console.WriteLine("Smoke test passed. DarbotLabs.Browser.MCP is ready to host the MCP server.");
    return 0;
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Smoke test failed: {ex}");
    return 1;
}
