using Dapper;
using FXEmailWorker.Models;
using FXEmailWorker.Services;
using Microsoft.AspNetCore.Mvc;

namespace FXEmailWorker.Endpoints;

public static class TemplateEndpoints
{
    public static void MapTemplateEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/templates")
            .WithTags("Templates");

        group.MapGet("/", ListTemplates)
            .WithName("ListTemplates")
            .WithSummary("List all email templates");

        group.MapGet("/{id:int}", GetTemplate)
            .WithName("GetTemplate")
            .WithSummary("Get template by ID");

        group.MapPost("/preview", PreviewTemplate)
            .WithName("PreviewTemplate")
            .WithSummary("Preview a rendered template without sending");

        group.MapPost("/", CreateTemplate)
            .WithName("CreateTemplate")
            .WithSummary("Create a new template (master key required)");

        group.MapPut("/{id:int}", UpdateTemplate)
            .WithName("UpdateTemplate")
            .WithSummary("Update a template (master key required)");
    }

    private static bool IsMasterKey(HttpContext context)
        => context.Items.TryGetValue("IsMasterKey", out var val) && val is true;

    private static async Task<IResult> ListTemplates(IDbConnectionFactory db)
    {
        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var templates = (await conn.QueryAsync<TemplateListItem>(
            "SELECT ET_ID, ET_Code, Lang_Code, Subject, App_Code FROM dbo.EmailTemplates ORDER BY ET_ID")).ToList();

        return Results.Ok(ApiResponse<List<TemplateListItem>>.Ok(templates));
    }

    private static async Task<IResult> GetTemplate(int id, IDbConnectionFactory db)
    {
        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var template = await conn.QueryFirstOrDefaultAsync<EmailTemplateRow>(
            "SELECT ET_ID, ET_Code, Lang_Code, Subject, Body, App_Code FROM dbo.EmailTemplates WHERE ET_ID = @Id",
            new { Id = id });

        if (template is null)
            return Results.NotFound(ApiResponse.Fail($"Template {id} not found."));

        return Results.Ok(ApiResponse<EmailTemplateRow>.Ok(template));
    }

    private static async Task<IResult> CreateTemplate(
        HttpContext httpContext,
        [FromBody] EmailTemplateRow template,
        IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        if (string.IsNullOrWhiteSpace(template.ET_Code))
            return Results.BadRequest(ApiResponse.Fail("eT_Code is required."));

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var id = await conn.QuerySingleAsync<int>(
            @"INSERT INTO dbo.EmailTemplates (ET_Code, Lang_Code, Subject, Body, App_Code)
              OUTPUT INSERTED.ET_ID
              VALUES (@ET_Code, @Lang_Code, @Subject, @Body, @App_Code)",
            new
            {
                template.ET_Code,
                Lang_Code = template.Lang_Code ?? "en",
                template.Subject,
                template.Body,
                template.App_Code
            });

        return Results.Ok(ApiResponse<object>.Ok(new { templateId = id }, "Template created."));
    }

    private static async Task<IResult> UpdateTemplate(
        int id,
        HttpContext httpContext,
        [FromBody] EmailTemplateRow template,
        IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            @"UPDATE dbo.EmailTemplates SET
                ET_Code = @ET_Code, Lang_Code = @Lang_Code,
                Subject = @Subject, Body = @Body, App_Code = @App_Code
              WHERE ET_ID = @Id",
            new
            {
                Id = id,
                template.ET_Code,
                template.Lang_Code,
                template.Subject,
                template.Body,
                template.App_Code
            });

        if (affected == 0)
            return Results.NotFound(ApiResponse.Fail($"Template {id} not found."));

        return Results.Ok(ApiResponse.Ok(message: $"Template {id} updated."));
    }

    private static async Task<IResult> PreviewTemplate(
        [FromBody] TemplatePreviewRequest req,
        IDbConnectionFactory db)
    {
        if (req.TemplateId is null && string.IsNullOrWhiteSpace(req.TemplateCode))
            return Results.BadRequest(ApiResponse.Fail("Either templateId or templateCode is required."));

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        EmailTemplateRow? tpl;
        if (req.TemplateId.HasValue)
        {
            tpl = await conn.QueryFirstOrDefaultAsync<EmailTemplateRow>(
                "SELECT ET_ID, ET_Code, Lang_Code, Subject, Body, App_Code FROM dbo.EmailTemplates WHERE ET_ID = @Id",
                new { Id = req.TemplateId.Value });
        }
        else
        {
            tpl = await conn.QueryFirstOrDefaultAsync<EmailTemplateRow>(
                "SELECT TOP 1 ET_ID, ET_Code, Lang_Code, Subject, Body, App_Code FROM dbo.EmailTemplates WHERE ET_Code = @Code ORDER BY ET_ID",
                new { Code = req.TemplateCode });
        }

        if (tpl is null || string.IsNullOrWhiteSpace(tpl.Subject) || string.IsNullOrWhiteSpace(tpl.Body))
            return Results.NotFound(ApiResponse.Fail("Template not found or empty."));

        try
        {
            var model = Utility.BuildScribanModel(req.BodyJson, req.DetailJson);
            var (subject, html) = Utility.RenderWithScriban(tpl.Subject!, tpl.Body!, model);

            return Results.Ok(ApiResponse<TemplatePreviewResponse>.Ok(new TemplatePreviewResponse
            {
                Subject = subject,
                Body = html
            }));
        }
        catch (Exception ex)
        {
            return Results.Json(ApiResponse.Fail($"Template rendering error: {ex.Message}"),
                statusCode: 400);
        }
    }
}
