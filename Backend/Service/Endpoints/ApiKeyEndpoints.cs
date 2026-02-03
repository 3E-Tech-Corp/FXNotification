using System.Text.Json;
using Dapper;
using FXEmailWorker.Middleware;
using FXEmailWorker.Models;
using FXEmailWorker.Services;
using Microsoft.AspNetCore.Mvc;

namespace FXEmailWorker.Endpoints;

public static class ApiKeyEndpoints
{
    public static void MapApiKeyEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/apikeys")
            .WithTags("API Keys");

        group.MapGet("/", ListApiKeys)
            .WithName("ListApiKeys")
            .WithSummary("List all API keys (master key required)");

        group.MapPost("/", CreateApiKey)
            .WithName("CreateApiKey")
            .WithSummary("Create a new API key (master key required)");

        group.MapPut("/{id:int}", UpdateApiKey)
            .WithName("UpdateApiKey")
            .WithSummary("Update an API key (master key required)");

        group.MapDelete("/{id:int}", DeleteApiKey)
            .WithName("DeleteApiKey")
            .WithSummary("Delete an API key (master key required)");

        group.MapPost("/{id:int}/toggle", ToggleApiKey)
            .WithName("ToggleApiKey")
            .WithSummary("Toggle an API key's active status (master key required)");

        group.MapPost("/{id:int}/regenerate", RegenerateApiKey)
            .WithName("RegenerateApiKey")
            .WithSummary("Regenerate an API key (master key required)");
    }

    private static bool IsMasterKey(HttpContext context)
        => context.Items.TryGetValue("IsMasterKey", out var val) && val is true;

    private static string MaskKey(string key)
    {
        if (string.IsNullOrWhiteSpace(key) || key.Length < 12)
            return "****";
        return key[..4] + "****" + key[^8..];
    }

    private static ApiKeyResponse ToResponse(ApiKeyRecord r, string? fullKey = null)
    {
        return new ApiKeyResponse
        {
            Id = r.Id,
            AppName = r.AppName,
            MaskedKey = MaskKey(r.ApiKey),
            FullKey = fullKey,
            AllowedTasks = r.GetAllowedTasksList(),
            IsActive = r.IsActive,
            CreatedAt = r.CreatedAt,
            LastUsedAt = r.LastUsedAt,
            RequestCount = r.RequestCount,
            Notes = r.Notes
        };
    }

    private static async Task<IResult> ListApiKeys(HttpContext httpContext, IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var keys = (await conn.QueryAsync<ApiKeyRecord>(
            @"SELECT Id, AppName, ApiKey, AllowedTasks, IsActive, CreatedAt, LastUsedAt, RequestCount, Notes
              FROM dbo.ApiKeys
              ORDER BY Id")).ToList();

        var response = keys.Select(k => ToResponse(k)).ToList();
        return Results.Ok(ApiResponse<List<ApiKeyResponse>>.Ok(response));
    }

    private static async Task<IResult> CreateApiKey(
        HttpContext httpContext,
        [FromBody] CreateApiKeyRequest req,
        IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        if (string.IsNullOrWhiteSpace(req.AppName))
            return Results.BadRequest(ApiResponse.Fail("appName is required."));

        var newKey = ApiKeyMiddleware.GenerateApiKey();
        var allowedTasksJson = req.AllowedTasks?.Count > 0
            ? JsonSerializer.Serialize(req.AllowedTasks)
            : null;

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var id = await conn.QuerySingleAsync<int>(
            @"INSERT INTO dbo.ApiKeys (AppName, ApiKey, AllowedTasks, IsActive, CreatedAt, RequestCount, Notes)
              OUTPUT INSERTED.Id
              VALUES (@AppName, @ApiKey, @AllowedTasks, 1, GETUTCDATE(), 0, @Notes)",
            new
            {
                req.AppName,
                ApiKey = newKey,
                AllowedTasks = allowedTasksJson,
                req.Notes
            });

        ApiKeyMiddleware.InvalidateCache();

        var record = new ApiKeyRecord
        {
            Id = id,
            AppName = req.AppName,
            ApiKey = newKey,
            AllowedTasks = allowedTasksJson,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            RequestCount = 0,
            Notes = req.Notes
        };

        return Results.Ok(ApiResponse<ApiKeyResponse>.Ok(
            ToResponse(record, fullKey: newKey),
            "API key created. Save the full key — it won't be shown again."));
    }

    private static async Task<IResult> UpdateApiKey(
        int id,
        HttpContext httpContext,
        [FromBody] UpdateApiKeyRequest req,
        IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        var allowedTasksJson = req.AllowedTasks?.Count > 0
            ? JsonSerializer.Serialize(req.AllowedTasks)
            : null;

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        // Build dynamic SET clause
        var setClauses = new List<string>();
        var parameters = new DynamicParameters();
        parameters.Add("Id", id);

        if (req.AllowedTasks is not null)
        {
            setClauses.Add("AllowedTasks = @AllowedTasks");
            parameters.Add("AllowedTasks", allowedTasksJson);
        }

        if (req.Notes is not null)
        {
            setClauses.Add("Notes = @Notes");
            parameters.Add("Notes", req.Notes);
        }

        if (req.IsActive.HasValue)
        {
            setClauses.Add("IsActive = @IsActive");
            parameters.Add("IsActive", req.IsActive.Value);
        }

        if (setClauses.Count == 0)
            return Results.BadRequest(ApiResponse.Fail("No fields to update."));

        var sql = $"UPDATE dbo.ApiKeys SET {string.Join(", ", setClauses)} WHERE Id = @Id";
        var affected = await conn.ExecuteAsync(sql, parameters);

        if (affected == 0)
            return Results.NotFound(ApiResponse.Fail($"API key {id} not found."));

        ApiKeyMiddleware.InvalidateCache();

        // Return updated record
        var updated = await conn.QueryFirstOrDefaultAsync<ApiKeyRecord>(
            @"SELECT Id, AppName, ApiKey, AllowedTasks, IsActive, CreatedAt, LastUsedAt, RequestCount, Notes
              FROM dbo.ApiKeys WHERE Id = @Id",
            new { Id = id });

        return Results.Ok(ApiResponse<ApiKeyResponse>.Ok(
            ToResponse(updated!),
            "API key updated."));
    }

    private static async Task<IResult> DeleteApiKey(
        int id,
        HttpContext httpContext,
        IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "DELETE FROM dbo.ApiKeys WHERE Id = @Id",
            new { Id = id });

        if (affected == 0)
            return Results.NotFound(ApiResponse.Fail($"API key {id} not found."));

        ApiKeyMiddleware.InvalidateCache();

        return Results.Ok(ApiResponse.Ok(message: $"API key {id} deleted."));
    }

    private static async Task<IResult> ToggleApiKey(
        int id,
        HttpContext httpContext,
        IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "UPDATE dbo.ApiKeys SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END WHERE Id = @Id",
            new { Id = id });

        if (affected == 0)
            return Results.NotFound(ApiResponse.Fail($"API key {id} not found."));

        ApiKeyMiddleware.InvalidateCache();

        var updated = await conn.QueryFirstOrDefaultAsync<ApiKeyRecord>(
            @"SELECT Id, AppName, ApiKey, AllowedTasks, IsActive, CreatedAt, LastUsedAt, RequestCount, Notes
              FROM dbo.ApiKeys WHERE Id = @Id",
            new { Id = id });

        var statusLabel = updated!.IsActive ? "activated" : "deactivated";
        return Results.Ok(ApiResponse<ApiKeyResponse>.Ok(
            ToResponse(updated),
            $"API key {id} {statusLabel}."));
    }

    private static async Task<IResult> RegenerateApiKey(
        int id,
        HttpContext httpContext,
        IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        var newKey = ApiKeyMiddleware.GenerateApiKey();

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "UPDATE dbo.ApiKeys SET ApiKey = @ApiKey WHERE Id = @Id",
            new { ApiKey = newKey, Id = id });

        if (affected == 0)
            return Results.NotFound(ApiResponse.Fail($"API key {id} not found."));

        ApiKeyMiddleware.InvalidateCache();

        var updated = await conn.QueryFirstOrDefaultAsync<ApiKeyRecord>(
            @"SELECT Id, AppName, ApiKey, AllowedTasks, IsActive, CreatedAt, LastUsedAt, RequestCount, Notes
              FROM dbo.ApiKeys WHERE Id = @Id",
            new { Id = id });

        return Results.Ok(ApiResponse<ApiKeyResponse>.Ok(
            ToResponse(updated!, fullKey: newKey),
            "API key regenerated. Save the new key — it won't be shown again."));
    }
}
