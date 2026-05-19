// Copyright (c) 2025 darbotlabs
// Licensed under the Apache License, Version 2.0.

using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DarbotLabs.Browser.MCP;

/// <summary>
/// Hosts the Darbot Browser MCP Node.js server as a managed .NET hosted service.
/// </summary>
public sealed class BrowserMcpServer : IHostedService, IDisposable
{
    private readonly ILogger<BrowserMcpServer> _logger;
    private readonly BrowserMcpOptions _options;
    private Process? _serverProcess;

    /// <summary>
    /// Initializes a new instance of the <see cref="BrowserMcpServer"/> class.
    /// </summary>
    /// <param name="logger">Logger used for process lifecycle and output messages.</param>
    /// <param name="options">Optional server launch options.</param>
    public BrowserMcpServer(ILogger<BrowserMcpServer> logger, BrowserMcpOptions? options = null)
    {
        _logger = logger;
        _options = options ?? new BrowserMcpOptions();
    }

    /// <summary>
    /// Starts the Darbot Browser MCP server process.
    /// </summary>
    /// <param name="cancellationToken">Token that cancels server startup.</param>
    /// <returns>A task that completes after the process has been started.</returns>
    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (_serverProcess is { HasExited: false })
        {
            _logger.LogDebug("Darbot Browser MCP Server is already running with PID {ProcessId}.", _serverProcess.Id);
            return Task.CompletedTask;
        }

        _logger.LogInformation("Starting Darbot Browser MCP Server {PackageSpec}...", _options.PackageSpec);

        var startInfo = new ProcessStartInfo
        {
            FileName = _options.NodePath,
            Arguments = _options.BuildArguments(),
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            RedirectStandardInput = true,
            CreateNoWindow = true
        };

        startInfo.Environment["LOG_LEVEL"] = _options.LogLevel;
        foreach (var env in _options.Environment)
        {
            startInfo.Environment[env.Key] = env.Value;
        }

        _serverProcess = Process.Start(startInfo)
            ?? throw new InvalidOperationException("Failed to start the Darbot Browser MCP Server process.");

        _serverProcess.OutputDataReceived += (_, eventArgs) =>
        {
            if (!string.IsNullOrWhiteSpace(eventArgs.Data))
            {
                _logger.LogInformation("Darbot Browser MCP: {Data}", eventArgs.Data);
            }
        };

        _serverProcess.ErrorDataReceived += (_, eventArgs) =>
        {
            if (!string.IsNullOrWhiteSpace(eventArgs.Data))
            {
                _logger.LogWarning("Darbot Browser MCP: {Data}", eventArgs.Data);
            }
        };

        _serverProcess.BeginOutputReadLine();
        _serverProcess.BeginErrorReadLine();

        _logger.LogInformation("Darbot Browser MCP Server started with PID {ProcessId}.", _serverProcess.Id);
        return Task.CompletedTask;
    }

    /// <summary>
    /// Stops the Darbot Browser MCP server process.
    /// </summary>
    /// <param name="cancellationToken">Token that cancels waiting for shutdown.</param>
    /// <returns>A task that completes after the process exits.</returns>
    public async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_serverProcess is null)
        {
            return;
        }

        try
        {
            if (!_serverProcess.HasExited)
            {
                _logger.LogInformation("Stopping Darbot Browser MCP Server with PID {ProcessId}...", _serverProcess.Id);
                _serverProcess.Kill(entireProcessTree: true);
                await _serverProcess.WaitForExitAsync(cancellationToken).ConfigureAwait(false);
            }
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogDebug(ex, "Darbot Browser MCP Server process had already exited.");
        }
        finally
        {
            _serverProcess.Dispose();
            _serverProcess = null;
        }
    }

    /// <summary>
    /// Releases resources held by the server process wrapper.
    /// </summary>
    public void Dispose()
    {
        _serverProcess?.Dispose();
    }
}

/// <summary>
/// Configuration options used to launch the Darbot Browser MCP server.
/// </summary>
public sealed class BrowserMcpOptions
{
    /// <summary>
    /// Gets or sets the executable used to launch the package. The default uses npx for NuGet consumers.
    /// </summary>
    public string NodePath { get; set; } = "npx";

    /// <summary>
    /// Gets or sets the npm package name for the MCP server.
    /// </summary>
    public string PackageName { get; set; } = "@darbotlabs/darbot-browser-mcp";

    /// <summary>
    /// Gets or sets the npm package version pinned by the .NET wrapper.
    /// </summary>
    public string PackageVersion { get; set; } = "2.0.0";

    /// <summary>
    /// Gets the fully-qualified npm package spec used when launching through npx.
    /// </summary>
    public string PackageSpec => $"{PackageName}@{PackageVersion}";

    /// <summary>
    /// Gets environment variables passed to the MCP server process.
    /// </summary>
    public IDictionary<string, string> Environment { get; } = new Dictionary<string, string>();

    /// <summary>
    /// Gets or sets the browser automation log level.
    /// </summary>
    public string LogLevel { get; set; } = "info";

    /// <summary>
    /// Builds the command-line arguments for the configured launcher.
    /// </summary>
    /// <returns>Arguments that launch the pinned Darbot Browser MCP package.</returns>
    public string BuildArguments()
    {
        var launcher = Path.GetFileNameWithoutExtension(NodePath);
        return string.Equals(launcher, "npx", StringComparison.OrdinalIgnoreCase)
            ? $"-y {PackageSpec}"
            : $"--input-type=module -e \"import('{PackageName}')\"";
    }
}

/// <summary>
/// Extension methods for registering the Darbot Browser MCP server with dependency injection.
/// </summary>
public static class BrowserMcpServiceCollectionExtensions
{
    /// <summary>
    /// Adds the Darbot Browser MCP server as a hosted service.
    /// </summary>
    /// <param name="services">The service collection to update.</param>
    /// <param name="configureOptions">Optional callback for configuring server launch options.</param>
    /// <returns>The same service collection for fluent chaining.</returns>
    public static IServiceCollection AddBrowserMcpServer(
        this IServiceCollection services,
        Action<BrowserMcpOptions>? configureOptions = null)
    {
        var options = new BrowserMcpOptions();
        configureOptions?.Invoke(options);

        services.AddSingleton(options);
        services.AddHostedService<BrowserMcpServer>();

        return services;
    }
}

