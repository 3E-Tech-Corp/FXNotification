using Dapper;
using FXEmailWorker.Middleware;
using FXEmailWorker.Models;
using FXEmailWorker.Services;
using Microsoft.AspNetCore.Mvc;

namespace FXEmailWorker.Endpoints;

public static class ProfileEndpoints
{
    public static void MapProfileEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/profiles")
            .WithTags("Profiles");

        group.MapGet("/", ListProfiles)
            .WithName("ListProfiles")
            .WithSummary("List all mail profiles");

        group.MapGet("/{id:int}", GetProfile)
            .WithName("GetProfile")
            .WithSummary("Get mail profile by ID");

        group.MapPost("/", CreateProfile)
            .WithName("CreateProfile")
            .WithSummary("Create a new mail profile (master key required)");

        group.MapPut("/{id:int}", UpdateProfile)
            .WithName("UpdateProfile")
            .WithSummary("Update a mail profile (master key required)");

        group.MapPost("/{id:int}/generate-key", GenerateKey)
            .WithName("GenerateProfileApiKey")
            .WithSummary("Generate a new API key for a profile (master key required)");

        group.MapDelete("/{id:int}/key", RevokeKey)
            .WithName("RevokeProfileApiKey")
            .WithSummary("Revoke a profile's API key (master key required)");
    }

    private static bool IsMasterKey(HttpContext context)
        => context.Items.TryGetValue("IsMasterKey", out var val) && val is true;

    private static async Task<IResult> ListProfiles(HttpContext httpContext, IDbConnectionFactory db)
    {
        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var profiles = (await conn.QueryAsync<MailProfileRow>(
            @"SELECT ProfileId, AppKey, FromName, FromEmail, SmtpHost, SmtpPort,
                     AuthUser, SecurityMode, IsActive, LastUsedAt, RequestCount,
                     CASE WHEN ApiKey IS NOT NULL THEN 'fxn_****' + RIGHT(ApiKey, 8) ELSE NULL END AS MaskedApiKey
              FROM dbo.MailProfiles
              ORDER BY ProfileId")).ToList();

        // Scrub secret refs from response
        foreach (var p in profiles)
            p.AuthSecretRef = null;

        return Results.Ok(ApiResponse<List<MailProfileRow>>.Ok(profiles));
    }

    private static async Task<IResult> GetProfile(int id, IDbConnectionFactory db)
    {
        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var profile = await conn.QueryFirstOrDefaultAsync<MailProfileRow>(
            @"SELECT ProfileId, AppKey, FromName, FromEmail, SmtpHost, SmtpPort,
                     AuthUser, SecurityMode, IsActive, LastUsedAt, RequestCount,
                     CASE WHEN ApiKey IS NOT NULL THEN 'fxn_****' + RIGHT(ApiKey, 8) ELSE NULL END AS MaskedApiKey
              FROM dbo.MailProfiles WHERE ProfileId = @Id",
            new { Id = id });

        if (profile is null)
            return Results.NotFound(ApiResponse.Fail($"Profile {id} not found."));

        // Scrub secret ref
        profile.AuthSecretRef = null;

        return Results.Ok(ApiResponse<MailProfileRow>.Ok(profile));
    }

    private static async Task<IResult> CreateProfile(
        HttpContext httpContext,
        [FromBody] MailProfileRow profile,
        IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var id = await conn.QuerySingleAsync<int>(
            @"INSERT INTO dbo.MailProfiles (AppKey, FromName, FromEmail, SmtpHost, SmtpPort, AuthUser, AuthSecretRef, SecurityMode, IsActive)
              OUTPUT INSERTED.ProfileId
              VALUES (@AppKey, @FromName, @FromEmail, @SmtpHost, @SmtpPort, @AuthUser, @AuthSecretRef, @SecurityMode, @IsActive)",
            new
            {
                profile.AppKey,
                profile.FromName,
                profile.FromEmail,
                profile.SmtpHost,
                SmtpPort = profile.SmtpPort > 0 ? profile.SmtpPort : 587,
                profile.AuthUser,
                profile.AuthSecretRef,
                profile.SecurityMode,
                IsActive = profile.IsActive
            });

        return Results.Ok(ApiResponse<object>.Ok(new { profileId = id }, "Profile created."));
    }

    private static async Task<IResult> UpdateProfile(
        int id,
        HttpContext httpContext,
        [FromBody] MailProfileRow profile,
        IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            @"UPDATE dbo.MailProfiles SET
                AppKey = @AppKey,
                FromName = @FromName,
                FromEmail = @FromEmail,
                SmtpHost = @SmtpHost,
                SmtpPort = @SmtpPort,
                AuthUser = @AuthUser,
                AuthSecretRef = COALESCE(NULLIF(@AuthSecretRef, ''), AuthSecretRef),
                SecurityMode = @SecurityMode,
                IsActive = @IsActive
              WHERE ProfileId = @Id",
            new
            {
                Id = id,
                profile.AppKey,
                profile.FromName,
                profile.FromEmail,
                profile.SmtpHost,
                SmtpPort = profile.SmtpPort > 0 ? profile.SmtpPort : 587,
                profile.AuthUser,
                profile.AuthSecretRef,
                profile.SecurityMode,
                IsActive = profile.IsActive
            });

        if (affected == 0)
            return Results.NotFound(ApiResponse.Fail($"Profile {id} not found."));

        return Results.Ok(ApiResponse.Ok(message: $"Profile {id} updated."));
    }

    /// <summary>
    /// Generate a new API key for a profile. Master key required.
    /// Returns the full key only on this response — save it.
    /// </summary>
    private static async Task<IResult> GenerateKey(int id, HttpContext httpContext, IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        var newKey = ApiKeyMiddleware.GenerateApiKey();

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "UPDATE dbo.MailProfiles SET ApiKey = @ApiKey WHERE ProfileId = @Id",
            new { ApiKey = newKey, Id = id });

        if (affected == 0)
            return Results.NotFound(ApiResponse.Fail($"Profile {id} not found."));

        ApiKeyMiddleware.InvalidateCache();

        var profile = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT ProfileId, AppKey FROM dbo.MailProfiles WHERE ProfileId = @Id",
            new { Id = id });

        return Results.Ok(ApiResponse<object>.Ok(
            new { profileId = id, appKey = (string)profile.AppKey, apiKey = newKey },
            $"API key generated for '{profile.AppKey}'. Save it — it won't be shown again."));
    }

    /// <summary>
    /// Revoke a profile's API key. Master key required.
    /// </summary>
    private static async Task<IResult> RevokeKey(int id, HttpContext httpContext, IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "UPDATE dbo.MailProfiles SET ApiKey = NULL WHERE ProfileId = @Id",
            new { Id = id });

        if (affected == 0)
            return Results.NotFound(ApiResponse.Fail($"Profile {id} not found."));

        ApiKeyMiddleware.InvalidateCache();

        return Results.Ok(ApiResponse.Ok(message: $"API key revoked for profile {id}."));
    }
}
