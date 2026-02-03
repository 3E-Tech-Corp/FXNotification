using Dapper;
using FXEmailWorker.Models;
using FXEmailWorker.Services;

namespace FXEmailWorker.Endpoints;

public static class OutboxEndpoints
{
    public static void MapOutboxEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/outbox")
            .WithTags("Outbox");

        group.MapGet("/", ListOutbox)
            .WithName("ListOutbox")
            .WithSummary("List outbox items with pagination and filters");

        group.MapDelete("/{id:long}", DeleteOutbox)
            .WithName("DeleteOutbox")
            .WithSummary("Delete an outbox item (master key required)");

        group.MapPost("/{id:long}/retry", RetryOutbox)
            .WithName("RetryOutbox")
            .WithSummary("Retry a failed outbox item");
    }

    private static bool IsMasterKey(HttpContext context)
        => context.Items.TryGetValue("IsMasterKey", out var val) && val is true;

    private static async Task<IResult> ListOutbox(
        HttpContext httpContext,
        IDbConnectionFactory db,
        string? status = null,
        string? taskCode = null,
        int page = 1,
        int pageSize = 20)
    {
        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var offset = (page - 1) * pageSize;

        const string countSql = @"
            SELECT COUNT(*)
            FROM dbo.EmailOutbox
            WHERE (@Status IS NULL OR Status = @Status)
              AND (@TaskCode IS NULL OR TaskCode = @TaskCode)";

        const string dataSql = @"
            SELECT Id, TaskCode, Status, ToList, Subject, Attempts,
                   CreatedAt, SentAt, ErrorMessage, BodyHtml, CcList, BccList,
                   MailPriority, ObjectId, WebhookUrl, NextRetryAt
            FROM dbo.EmailOutbox
            WHERE (@Status IS NULL OR Status = @Status)
              AND (@TaskCode IS NULL OR TaskCode = @TaskCode)
            ORDER BY Id DESC
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY";

        var p = new
        {
            Status = string.IsNullOrWhiteSpace(status) ? null : status,
            TaskCode = string.IsNullOrWhiteSpace(taskCode) ? null : taskCode,
            Offset = offset,
            PageSize = pageSize
        };

        var total = await conn.ExecuteScalarAsync<int>(countSql, p);
        var items = (await conn.QueryAsync<dynamic>(dataSql, p)).ToList();

        return Results.Ok(ApiResponse<object>.Ok(new
        {
            items,
            totalCount = total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        }));
    }

    private static async Task<IResult> DeleteOutbox(
        long id,
        HttpContext httpContext,
        IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        // Only allow deleting Pending or Failed items
        var affected = await conn.ExecuteAsync(
            "DELETE FROM dbo.EmailOutbox WHERE Id = @Id AND Status IN ('Pending', 'Failed', 'Draft')",
            new { Id = id });

        if (affected == 0)
            return Results.NotFound(ApiResponse.Fail($"Outbox item {id} not found or cannot be deleted (only Pending/Failed/Draft items can be deleted)."));

        return Results.Ok(ApiResponse.Ok(message: $"Outbox item {id} deleted."));
    }

    private static async Task<IResult> RetryOutbox(
        long id,
        IDbConnectionFactory db)
    {
        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            @"UPDATE dbo.EmailOutbox
              SET Status = 'Pending', Attempts = 0, ErrorMessage = NULL, NextRetryAt = NULL
              WHERE Id = @Id AND Status = 'Failed'",
            new { Id = id });

        if (affected == 0)
            return Results.NotFound(ApiResponse.Fail($"Outbox item {id} not found or not in Failed status."));

        return Results.Ok(ApiResponse.Ok(message: $"Outbox item {id} requeued for retry."));
    }
}
