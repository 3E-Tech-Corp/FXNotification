using Dapper;
using FXEmailWorker;
using FXEmailWorker.Endpoints;
using FXEmailWorker.Middleware;
using FXEmailWorker.Services;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Serilog;
using Serilog.Settings.Configuration;
using Serilog.Expressions;
using System.Net;
using Microsoft.Extensions.FileProviders;

// Fix TLS security issue - add this at the very beginning
ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls13;
ServicePointManager.CheckCertificateRevocationList = true;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory,
    WebRootPath = Path.Combine(AppContext.BaseDirectory, "wwwroot")
});

// ── Serilog ───────────────────────────────────────────────────────────────
var serilogOptions = new ConfigurationReaderOptions(
    typeof(Serilog.LoggerConfiguration).Assembly,
    typeof(Serilog.LoggerConfigurationExtensions).Assembly,
    typeof(Serilog.Expressions.SerilogExpression).Assembly
);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration, serilogOptions)
    .CreateLogger();

builder.Logging.ClearProviders();
builder.Logging.AddSerilog();

// ── Windows Service ───────────────────────────────────────────────────────
builder.Services.AddWindowsService(options =>
{
    options.ServiceName = "FX Notification Service";
});

// ── Configuration bindings ────────────────────────────────────────────────
builder.Services.Configure<Smssettings>(
    builder.Configuration.GetSection("SMSSettings"));

builder.Services.Configure<WebhookSettings>(
    builder.Configuration.GetSection("Webhook"));

// ── Database ──────────────────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("Default") ??
    throw new InvalidOperationException("Missing ConnectionStrings:Default");

var csb = new SqlConnectionStringBuilder(connectionString);

builder.Services.AddSingleton(csb);
builder.Services.AddSingleton<IDbConnectionFactory>(new DbConnectionFactory(csb));

// ── HTTP clients ──────────────────────────────────────────────────────────
var smsSettings = builder.Configuration.GetSection("SMSSettings").Get<Smssettings>();
if (smsSettings is not null && !string.IsNullOrWhiteSpace(smsSettings.BaseUrl))
{
    builder.Services.AddHttpClient("SMS", client =>
    {
        client.BaseAddress = new Uri(smsSettings.BaseUrl);
        client.DefaultRequestHeaders.Add("X-API-Key", smsSettings.ApiKey);
        client.Timeout = TimeSpan.FromSeconds(30);
    });
}
else
{
    builder.Services.AddHttpClient("SMS");
}

builder.Services.AddHttpClient("Webhook", client =>
{
    var timeoutSec = builder.Configuration.GetValue("Webhook:TimeoutSeconds", 10);
    client.Timeout = TimeSpan.FromSeconds(timeoutSec);
});

// ── Application services ─────────────────────────────────────────────────
builder.Services.AddSingleton<IConfiguration>(builder.Configuration);
builder.Services.AddSingleton<WindowsServiceLifecycle>();
builder.Services.AddSingleton<WorkerStatusService>();
builder.Services.AddSingleton<IWebhookService, WebhookService>();

// ── API key cache ─────────────────────────────────────────────────────────
builder.Services.AddSingleton<ApiKeyCacheService>();

// ── Background worker ────────────────────────────────────────────────────
builder.Services.AddHostedService<FXEmailWorker.EmailWorker>();

// ── Swagger / OpenAPI ────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "FX Notification API",
        Version = "v1",
        Description = "REST API for the FX Notification Service — queue, monitor, and manage email/SMS notifications."
    });

    // Add API Key auth to Swagger UI
    c.AddSecurityDefinition("ApiKey", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Name = "X-API-Key",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Description = "API key for authentication"
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "ApiKey"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ── Build app ─────────────────────────────────────────────────────────────
var app = builder.Build();

// ── Middleware pipeline ───────────────────────────────────────────────────
var enableSwagger = builder.Configuration.GetValue("ApiSettings:EnableSwagger", true);
if (enableSwagger)
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "FX Notification API v1");
        c.RoutePrefix = "swagger";
    });
}

// ── Admin UI: localhost-only static files ─────────────────────────────────
// Serve the built admin SPA from wwwroot/admin, restricted to local access
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";
    if (path.Equals("/admin", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/admin/", StringComparison.OrdinalIgnoreCase))
    {
        var remoteIp = context.Connection.RemoteIpAddress;
        var isLocal = IPAddress.IsLoopback(remoteIp!)
            || remoteIp!.Equals(context.Connection.LocalIpAddress);

        if (!isLocal)
        {
            context.Response.StatusCode = 403;
            await context.Response.WriteAsync("Admin UI is only accessible from the local server.");
            return;
        }
    }
    await next();
});

app.UseStaticFiles(); // default wwwroot

// Explicit static files for admin SPA (PublishSingleFile compatibility)
var adminPath = Path.Combine(AppContext.BaseDirectory, "wwwroot", "admin");
if (Directory.Exists(adminPath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(adminPath),
        RequestPath = "/admin"
    });
}

// Debug: log resolved paths on startup
app.Logger.LogInformation("AppContext.BaseDirectory: {Dir}", AppContext.BaseDirectory);
app.Logger.LogInformation("Admin path exists: {Exists} at {Path}", Directory.Exists(adminPath), adminPath);
app.Logger.LogInformation("WebRootPath: {Path}", app.Environment.WebRootPath);
app.Logger.LogInformation("ContentRootPath: {Path}", app.Environment.ContentRootPath);

// Diagnostic endpoint
app.MapGet("/admin/diag", () =>
{
    var baseDir = AppContext.BaseDirectory;
    var adminDir = Path.Combine(baseDir, "wwwroot", "admin");
    var assetsDir = Path.Combine(adminDir, "assets");
    var files = Directory.Exists(assetsDir)
        ? Directory.GetFiles(assetsDir).Select(Path.GetFileName).ToArray()
        : Array.Empty<string>();
    return new
    {
        baseDir,
        webRoot = app.Environment.WebRootPath,
        contentRoot = app.Environment.ContentRootPath,
        adminDirExists = Directory.Exists(adminDir),
        assetsDirExists = Directory.Exists(assetsDir),
        assetFiles = files
    };
});

// SPA fallback: any /admin/* route that isn't a file → serve admin/index.html
app.MapFallbackToFile("/admin/{**slug}", "admin/index.html");

app.UseMiddleware<ApiKeyMiddleware>();

// Load API key cache on startup
var keyCache = app.Services.GetRequiredService<ApiKeyCacheService>();
await keyCache.RefreshAsync();

// ── Map API endpoints ─────────────────────────────────────────────────────
app.MapNotificationEndpoints();
app.MapTemplateEndpoints();
app.MapTaskEndpoints();
app.MapProfileEndpoints();
app.MapHealthEndpoints();
app.MapApiKeyEndpoints();
app.MapLookupEndpoints();
app.MapOutboxEndpoints();

// ── Run ───────────────────────────────────────────────────────────────────
Log.Information("FX Notification Service starting — API + Background Worker");
try
{
    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "FX Notification Service terminated unexpectedly");
}
finally
{
    await Log.CloseAndFlushAsync();
}
