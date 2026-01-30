using Microsoft.Extensions.Configuration;

namespace FXEmailWorker.Middleware;

public class ApiKeyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string _apiKey;
    private const string ApiKeyHeader = "X-API-Key";

    public ApiKeyMiddleware(RequestDelegate next, IConfiguration configuration)
    {
        _next = next;
        _apiKey = configuration["ApiSettings:ApiKey"]
            ?? throw new InvalidOperationException("ApiSettings:ApiKey is not configured.");
    }

    public async Task InvokeAsync(HttpContext context)
    {
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
            !string.Equals(extractedKey, _apiKey, StringComparison.Ordinal))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                success = false,
                data = (object?)null,
                message = "Invalid or missing API key. Provide a valid X-API-Key header."
            });
            return;
        }

        await _next(context);
    }
}
