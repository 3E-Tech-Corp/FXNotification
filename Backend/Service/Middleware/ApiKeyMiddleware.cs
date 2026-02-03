using System.Security.Cryptography;
using FXEmailWorker.Models;
using FXEmailWorker.Services;

namespace FXEmailWorker.Middleware;

public class ApiKeyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string _masterApiKey;
    private const string ApiKeyHeader = "X-API-Key";

    private static ApiKeyCacheService? _cacheInstance;

    /// <summary>Generate a new random API key with fxn_ prefix.</summary>
    public static string GenerateApiKey()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return "fxn_" + Convert.ToHexString(bytes).ToLowerInvariant();
    }

    /// <summary>Trigger a cache refresh (fire-and-forget).</summary>
    public static void InvalidateCache()
    {
        _ = _cacheInstance?.RefreshAsync();
    }

    public ApiKeyMiddleware(RequestDelegate next, IConfiguration configuration)
    {
        _next = next;
        _masterApiKey = configuration["ApiSettings:ApiKey"]
            ?? throw new InvalidOperationException("ApiSettings:ApiKey is not configured.");
    }

    public async Task InvokeAsync(HttpContext context, ApiKeyCacheService keyCache)
    {
        // Store cache instance for static InvalidateCache()
        _cacheInstance ??= keyCache;

        // Skip auth for health endpoints and swagger
        if (context.Request.Path.StartsWithSegments("/api/health") ||
            context.Request.Path.StartsWithSegments("/swagger") ||
            context.Request.Path.StartsWithSegments("/favicon.ico"))
        {
            await _next(context);
            return;
        }

        // Only apply to /api routes
        if (!context.Request.Path.StartsWithSegments("/api"))
        {
            await _next(context);
            return;
        }

        if (!context.Request.Headers.TryGetValue(ApiKeyHeader, out var extractedKey) ||
            string.IsNullOrWhiteSpace(extractedKey))
        {
            await WriteUnauthorized(context);
            return;
        }

        string key = extractedKey.ToString();

        // Check master key first (backward compat — unrestricted access)
        if (string.Equals(key, _masterApiKey, StringComparison.Ordinal))
        {
            context.Items["IsMasterKey"] = true;
            await _next(context);
            return;
        }

        // Check per-app keys from cache
        if (keyCache.TryGetKey(key, out var record) && record is not null)
        {
            context.Items["ApiKey"] = record;
            context.Items["IsMasterKey"] = false;

            // Fire-and-forget: update LastUsedAt and increment RequestCount
            _ = keyCache.UpdateUsageAsync(record.Id);

            await _next(context);
            return;
        }

        await WriteUnauthorized(context);
    }

    private static async Task WriteUnauthorized(HttpContext context)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new
        {
            success = false,
            data = (object?)null,
            message = "Invalid or missing API key. Provide a valid X-API-Key header."
        });
    }
}
