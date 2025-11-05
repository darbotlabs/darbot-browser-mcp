/**
 * Copyright (c) 2024 DarbotLabs
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using System.Diagnostics;
using System.Text.Json;

namespace DarbotLabs.Browser.MCP;

/// <summary>
/// Browser MCP Server host for .NET applications
/// </summary>
public class BrowserMcpServer : IHostedService, IDisposable
{
    private readonly ILogger<BrowserMcpServer> _logger;
    private Process? _serverProcess;
    private readonly BrowserMcpOptions _options;

    public BrowserMcpServer(ILogger<BrowserMcpServer> logger, BrowserMcpOptions? options = null)
    {
        _logger = logger;
        _options = options ?? new BrowserMcpOptions();
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Starting Browser MCP Server...");

            var startInfo = new ProcessStartInfo
            {
                FileName = _options.NodePath,
                Arguments = $"-e \"require('@darbotlabs/darbot-browser-mcp')\"",
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                RedirectStandardInput = true,
                CreateNoWindow = true
            };

            // Add environment variables if specified
            foreach (var env in _options.Environment)
            {
                startInfo.Environment[env.Key] = env.Value;
            }

            _serverProcess = Process.Start(startInfo);

            if (_serverProcess == null)
            {
                throw new InvalidOperationException("Failed to start Browser MCP Server process");
            }

            _logger.LogInformation("Browser MCP Server started with PID: {ProcessId}", _serverProcess.Id);

            // Handle output
            _serverProcess.OutputDataReceived += (sender, e) =>
            {
                if (!string.IsNullOrEmpty(e.Data))
                {
                    _logger.LogInformation("Server Output: {Data}", e.Data);
                }
            };

            _serverProcess.ErrorDataReceived += (sender, e) =>
            {
                if (!string.IsNullOrEmpty(e.Data))
                {
                    _logger.LogError("Server Error: {Data}", e.Data);
                }
            };

            _serverProcess.BeginOutputReadLine();
            _serverProcess.BeginErrorReadLine();

            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start Browser MCP Server");
            throw;
        }
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Stopping Browser MCP Server...");

            if (_serverProcess != null && !_serverProcess.HasExited)
            {
                _serverProcess.Kill();
                await _serverProcess.WaitForExitAsync(cancellationToken);
            }

            _logger.LogInformation("Browser MCP Server stopped");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping Browser MCP Server");
        }
    }

    public void Dispose()
    {
        _serverProcess?.Dispose();
    }
}

/// <summary>
/// Configuration options for Browser MCP Server
/// </summary>
public class BrowserMcpOptions
{
    /// <summary>
    /// Path to Node.js executable
    /// </summary>
    public string NodePath { get; set; } = "node";

    /// <summary>
    /// Environment variables to pass to the server process
    /// </summary>
    public Dictionary<string, string> Environment { get; set; } = new();

    /// <summary>
    /// Server port (optional)
    /// </summary>
    public int? Port { get; set; }

    /// <summary>
    /// Log level for the server
    /// </summary>
    public string LogLevel { get; set; } = "info";
}

/// <summary>
/// Extension methods for adding Browser MCP Server to IServiceCollection
/// </summary>
public static class BrowserMcpServiceCollectionExtensions
{
    /// <summary>
    /// Add Browser MCP Server as a hosted service
    /// </summary>
    public static IServiceCollection AddBrowserMcpServer(this IServiceCollection services, Action<BrowserMcpOptions>? configureOptions = null)
    {
        var options = new BrowserMcpOptions();
        configureOptions?.Invoke(options);

        services.AddSingleton(options);
        services.AddHostedService<BrowserMcpServer>();

        return services;
    }
}