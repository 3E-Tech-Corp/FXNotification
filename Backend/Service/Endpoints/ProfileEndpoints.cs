using Dapper;
using FXEmailWorker.Models;
using FXEmailWorker.Services;

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
    }

    private static async Task<IResult> ListProfiles(IDbConnectionFactory db)
    {
        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        // Return profiles without secret refs for security
        var profiles = (await conn.QueryAsync<MailProfileRow>(
            @"SELECT ProfileId, AppKey, FromName, FromEmail, SmtpHost, SmtpPort,
                     AuthUser, SecurityMode, IsActive
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
            "EXEC dbo.MailProfile_Get @Id",
            new { Id = id });

        if (profile is null)
            return Results.NotFound(ApiResponse.Fail($"Profile {id} not found."));

        // Scrub secret ref
        profile.AuthSecretRef = null;

        return Results.Ok(ApiResponse<MailProfileRow>.Ok(profile));
    }
}
