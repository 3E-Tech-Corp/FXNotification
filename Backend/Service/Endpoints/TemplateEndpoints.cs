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
    }

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
