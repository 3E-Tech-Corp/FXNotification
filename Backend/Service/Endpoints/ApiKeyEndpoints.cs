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
        var group = app.MapGroup("/api/apps")
            .WithTags("Apps / API Keys");

        group.MapGet("/", ListApps)
            .WithName("ListApps")
            .WithSummary("List all apps with their API key info (master key required)");

        group.MapPost("/", CreateApp)
            .WithName("CreateApp")
            .WithSummary("Create a new app with API key (master key required)");

        group.MapPut("/{id:int}", UpdateApp)
            .WithName("UpdateApp")
            .WithSummary("Update an app (master key required)");

        group.MapDelete("/{id:int}", DeleteApp)
            .WithName("DeleteApp")
            .WithSummary("Delete an app (master key required)");

        group.MapPost("/{id:int}/toggle", ToggleApp)
            .WithName("ToggleApp")
            .WithSummary("Toggle app active/inactive (master key required)");

        group.MapPost("/{id:int}/regenerate", RegenerateKey)
            .WithName("RegenerateAppKey")
            .WithSummary("Regenerate app API key (master key required)");

        group.MapGet("/{id:int}/profiles", GetAppProfiles)
            .WithName("GetAppProfiles")
            .WithSummary("Get profiles linked to an app");

        group.MapPut("/{id:int}/profiles", SetAppProfiles)
            .WithName("SetAppProfiles")
            .WithSummary("Set profiles linked to an app (replaces all)");

        // Keep legacy /api/apikeys path as alias
        var legacy = app.MapGroup("/api/apikeys").WithTags("Apps / API Keys (Legacy)");
        legacy.MapGet("/", ListApps).WithName("ListApiKeysLegacy");
        legacy.MapPost("/", CreateApp).WithName("CreateApiKeyLegacy");
    }

    private static bool IsMasterKey(HttpContext context)
        => context.Items.TryGetValue("IsMasterKey", out var val) && val is true;

    private static string MaskKey(string? key)
        => key != null && key.Length > 12 ? key[..8] + "****" + key[^4..] : "****";

    private static async Task<List<int>> GetProfileIds(System.Data.Common.DbConnection conn, int appId)
    {
        var links = await conn.QueryAsync<int>(
            "SELECT ProfileId FROM dbo.AppProfiles WHERE AppId = @AppId", new { AppId = appId });
        return links.ToList();
    }

    private static AppResponse ToResponse(ApiKeyRecord r, List<int>? profileIds = null, string? fullKey = null) => new()
    {
        AppId = r.AppId,
        AppCode = r.AppCode,
        AppName = r.AppName,
        MaskedKey = MaskKey(r.ApiKey),
        FullKey = fullKey,
        AllowedTasks = r.GetAllowedTasksList(),
        IsActive = r.IsActive,
        CreatedAt = r.CreatedAt,
        LastUsedAt = r.LastUsedAt,
        RequestCount = r.RequestCount,
        Notes = r.Notes,
        ProfileIds = profileIds ?? new(),
    };

    private static async Task<IResult> ListApps(HttpContext httpContext, IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var apps = (await conn.QueryAsync<ApiKeyRecord>(
            @"SELECT AppId, AppCode, AppName, ApiKey, AllowedTasks, IsActive, CreatedAt, LastUsedAt, RequestCount, Notes
              FROM dbo.Apps ORDER BY AppId")).ToList();

        var allLinks = (await conn.QueryAsync<AppProfileLink>(
            "SELECT AppId, ProfileId FROM dbo.AppProfiles")).ToList();

        var linkMap = allLinks.GroupBy(l => l.AppId).ToDictionary(g => g.Key, g => g.Select(l => l.ProfileId).ToList());

        var response = apps.Select(a => ToResponse(a, linkMap.GetValueOrDefault(a.AppId))).ToList();

        return Results.Ok(ApiResponse<List<AppResponse>>.Ok(response));
    }

    private static async Task<IResult> CreateApp(
        HttpContext httpContext,
        [FromBody] CreateAppRequest req,
        IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        if (string.IsNullOrWhiteSpace(req.AppName))
            return Results.BadRequest(ApiResponse.Fail("appName is required."));

        var appCode = string.IsNullOrWhiteSpace(req.AppCode)
            ? req.AppName.Trim().ToLower().Replace(" ", "-")
            : req.AppCode.Trim().ToLower();

        var newKey = ApiKeyMiddleware.GenerateApiKey();
        var allowedTasksJson = req.AllowedTasks?.Count > 0
            ? System.Text.Json.JsonSerializer.Serialize(req.AllowedTasks)
            : null;

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var id = await conn.QuerySingleAsync<int>(
            @"INSERT INTO dbo.Apps (AppCode, AppName, ApiKey, AllowedTasks, IsActive, CreatedAt, RequestCount, Notes)
              OUTPUT INSERTED.AppId
              VALUES (@AppCode, @AppName, @ApiKey, @AllowedTasks, 1, GETUTCDATE(), 0, @Notes)",
            new { AppCode = appCode, req.AppName, ApiKey = newKey, AllowedTasks = allowedTasksJson, req.Notes });

        // Set profile links
        if (req.ProfileIds?.Count > 0)
        {
            foreach (var pid in req.ProfileIds)
                await conn.ExecuteAsync("INSERT INTO dbo.AppProfiles (AppId, ProfileId) VALUES (@AppId, @ProfileId)",
                    new { AppId = id, ProfileId = pid });
        }

        ApiKeyMiddleware.InvalidateCache();

        var record = await conn.QueryFirstAsync<ApiKeyRecord>(
            "SELECT AppId, AppCode, AppName, ApiKey, AllowedTasks, IsActive, CreatedAt, LastUsedAt, RequestCount, Notes FROM dbo.Apps WHERE AppId = @Id",
            new { Id = id });

        var profileIds = await GetProfileIds(conn, id);

        return Results.Ok(ApiResponse<AppResponse>.Ok(
            ToResponse(record, profileIds, newKey),
            "App created with API key. Save the key — it won't be shown again."));
    }

    private static async Task<IResult> UpdateApp(
        int id,
        HttpContext httpContext,
        [FromBody] UpdateAppRequest req,
        IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var sets = new List<string>();
        var p = new DynamicParameters();
        p.Add("Id", id);

        if (req.AppCode is not null)
        {
            sets.Add("AppCode = @AppCode");
            p.Add("AppCode", req.AppCode.Trim().ToLower());
        }
        if (req.AppName is not null)
        {
            sets.Add("AppName = @AppName");
            p.Add("AppName", req.AppName);
        }
        if (req.AllowedTasks is not null)
        {
            var json = req.AllowedTasks.Count > 0
                ? System.Text.Json.JsonSerializer.Serialize(req.AllowedTasks)
                : null;
            sets.Add("AllowedTasks = @AllowedTasks");
            p.Add("AllowedTasks", json);
        }
        if (req.Notes is not null)
        {
            sets.Add("Notes = @Notes");
            p.Add("Notes", req.Notes);
        }
        if (req.IsActive.HasValue)
        {
            sets.Add("IsActive = @IsActive");
            p.Add("IsActive", req.IsActive.Value);
        }

        if (sets.Count > 0)
        {
            var sql = $"UPDATE dbo.Apps SET {string.Join(", ", sets)} WHERE AppId = @Id";
            var affected = await conn.ExecuteAsync(sql, p);
            if (affected == 0)
                return Results.NotFound(ApiResponse.Fail($"App {id} not found."));
        }

        // Update profile links if provided
        if (req.ProfileIds is not null)
        {
            await conn.ExecuteAsync("DELETE FROM dbo.AppProfiles WHERE AppId = @AppId", new { AppId = id });
            foreach (var pid in req.ProfileIds)
                await conn.ExecuteAsync("INSERT INTO dbo.AppProfiles (AppId, ProfileId) VALUES (@AppId, @ProfileId)",
                    new { AppId = id, ProfileId = pid });
        }

        ApiKeyMiddleware.InvalidateCache();

        var updated = await conn.QueryFirstOrDefaultAsync<ApiKeyRecord>(
            "SELECT AppId, AppCode, AppName, ApiKey, AllowedTasks, IsActive, CreatedAt, LastUsedAt, RequestCount, Notes FROM dbo.Apps WHERE AppId = @Id",
            new { Id = id });

        if (updated is null)
            return Results.NotFound(ApiResponse.Fail($"App {id} not found."));

        var profileIds = await GetProfileIds(conn, id);

        return Results.Ok(ApiResponse<AppResponse>.Ok(ToResponse(updated, profileIds)));
    }

    private static async Task<IResult> DeleteApp(int id, HttpContext httpContext, IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        await conn.ExecuteAsync("DELETE FROM dbo.AppProfiles WHERE AppId = @Id", new { Id = id });
        var affected = await conn.ExecuteAsync("DELETE FROM dbo.Apps WHERE AppId = @Id", new { Id = id });
        if (affected == 0)
            return Results.NotFound(ApiResponse.Fail($"App {id} not found."));

        ApiKeyMiddleware.InvalidateCache();
        return Results.Ok(ApiResponse.Ok(message: $"App {id} deleted."));
    }

    private static async Task<IResult> ToggleApp(int id, HttpContext httpContext, IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "UPDATE dbo.Apps SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END WHERE AppId = @Id",
            new { Id = id });
        if (affected == 0)
            return Results.NotFound(ApiResponse.Fail($"App {id} not found."));

        ApiKeyMiddleware.InvalidateCache();

        var updated = await conn.QueryFirstAsync<ApiKeyRecord>(
            "SELECT AppId, AppCode, AppName, ApiKey, AllowedTasks, IsActive, CreatedAt, LastUsedAt, RequestCount, Notes FROM dbo.Apps WHERE AppId = @Id",
            new { Id = id });
        var profileIds = await GetProfileIds(conn, id);

        return Results.Ok(ApiResponse<AppResponse>.Ok(ToResponse(updated, profileIds)));
    }

    private static async Task<IResult> RegenerateKey(int id, HttpContext httpContext, IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        var newKey = ApiKeyMiddleware.GenerateApiKey();

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "UPDATE dbo.Apps SET ApiKey = @ApiKey WHERE AppId = @Id",
            new { ApiKey = newKey, Id = id });
        if (affected == 0)
            return Results.NotFound(ApiResponse.Fail($"App {id} not found."));

        ApiKeyMiddleware.InvalidateCache();

        var updated = await conn.QueryFirstAsync<ApiKeyRecord>(
            "SELECT AppId, AppCode, AppName, ApiKey, AllowedTasks, IsActive, CreatedAt, LastUsedAt, RequestCount, Notes FROM dbo.Apps WHERE AppId = @Id",
            new { Id = id });
        var profileIds = await GetProfileIds(conn, id);

        return Results.Ok(ApiResponse<AppResponse>.Ok(
            ToResponse(updated, profileIds, newKey),
            "API key regenerated. Save it — it won't be shown again."));
    }

    private static async Task<IResult> GetAppProfiles(int id, IDbConnectionFactory db)
    {
        using var conn = db.CreateConnection();
        await conn.OpenAsync();
        var profileIds = await GetProfileIds(conn, id);
        return Results.Ok(ApiResponse<List<int>>.Ok(profileIds));
    }

    private static async Task<IResult> SetAppProfiles(
        int id,
        HttpContext httpContext,
        [FromBody] List<int> profileIds,
        IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        await conn.ExecuteAsync("DELETE FROM dbo.AppProfiles WHERE AppId = @AppId", new { AppId = id });
        foreach (var pid in profileIds)
            await conn.ExecuteAsync("INSERT INTO dbo.AppProfiles (AppId, ProfileId) VALUES (@AppId, @ProfileId)",
                new { AppId = id, ProfileId = pid });

        return Results.Ok(ApiResponse<List<int>>.Ok(profileIds, "Profile links updated."));
    }
}
