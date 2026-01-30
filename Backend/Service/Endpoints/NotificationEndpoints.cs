using Dapper;
using FXEmailWorker.Models;
using FXEmailWorker.Services;
using Microsoft.AspNetCore.Mvc;

namespace FXEmailWorker.Endpoints;

public static class NotificationEndpoints
{
    public static void MapNotificationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/notifications")
            .WithTags("Notifications");

        group.MapPost("/queue", QueueNotification)
            .WithName("QueueNotification")
            .WithSummary("Queue a new notification for sending");

        group.MapPost("/queue-batch", QueueBatch)
            .WithName("QueueBatch")
            .WithSummary("Queue multiple notifications at once");

        group.MapGet("/{id:long}/status", GetStatus)
            .WithName("GetNotificationStatus")
            .WithSummary("Check notification status");

        group.MapPost("/{id:long}/retry", RetryNotification)
            .WithName("RetryNotification")
            .WithSummary("Retry a failed notification");

        group.MapGet("/history", GetHistory)
            .WithName("GetNotificationHistory")
            .WithSummary("Query notification history");
    }

    private static async Task<IResult> QueueNotification(
        [FromBody] QueueNotificationRequest req,
        IDbConnectionFactory db)
    {
        if (string.IsNullOrWhiteSpace(req.TaskCode))
            return Results.BadRequest(ApiResponse.Fail("taskCode is required."));
        if (string.IsNullOrWhiteSpace(req.To))
            return Results.BadRequest(ApiResponse.Fail("to is required."));

        try
        {
            using var conn = db.CreateConnection();
            await conn.OpenAsync();

            // Queue via stored procedure
            var newId = await conn.QuerySingleAsync<long>(
                @"EXEC dbo.EmailOutbox_Queue
                    @TaskCode, @To, @Cc, @Bcc, @ObjectId,
                    @BodyJson, @DetailJson, @LangCode, @Priority, @WebhookUrl",
                new
                {
                    req.TaskCode,
                    To = req.To,
                    Cc = req.Cc,
                    Bcc = req.Bcc,
                    req.ObjectId,
                    req.BodyJson,
                    req.DetailJson,
                    req.LangCode,
                    req.Priority,
                    req.WebhookUrl
                });

            // If attachments were provided, insert them
            if (req.Attachments?.Count > 0)
            {
                foreach (var att in req.Attachments)
                {
                    // Validate: must have either Base64Content or StorageUrl
                    if (string.IsNullOrWhiteSpace(att.Base64Content) && string.IsNullOrWhiteSpace(att.StorageUrl))
                        continue; // skip invalid attachment

                    byte[]? content = null;
                    if (!string.IsNullOrWhiteSpace(att.Base64Content))
                        content = Convert.FromBase64String(att.Base64Content);

                    await conn.ExecuteAsync(
                        @"INSERT INTO dbo.EmailAttachments (EmailId, FileName, MimeType, IsInline, ContentId, Content, StorageUrl)
                          VALUES (@EmailId, @FileName, @MimeType, @IsInline, @ContentId, @Content, @StorageUrl)",
                        new
                        {
                            EmailId = newId,
                            att.FileName,
                            att.MimeType,
                            att.IsInline,
                            att.ContentId,
                            Content = content,
                            att.StorageUrl
                        });
                }
            }

            return Results.Ok(ApiResponse<QueueNotificationResponse>.Ok(
                new QueueNotificationResponse { NotificationId = newId, Message = "Queued successfully" }));
        }
        catch (Exception ex)
        {
            return Results.Json(ApiResponse.Fail($"Failed to queue notification: {ex.Message}"),
                statusCode: 500);
        }
    }

    private static async Task<IResult> QueueBatch(
        [FromBody] QueueBatchRequest req,
        IDbConnectionFactory db)
    {
        if (req.Notifications.Count == 0)
            return Results.BadRequest(ApiResponse.Fail("notifications array is empty."));

        var results = new List<QueueNotificationResponse>();
        var errors = new List<string>();

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        foreach (var n in req.Notifications)
        {
            try
            {
                var newId = await conn.QuerySingleAsync<long>(
                    @"EXEC dbo.EmailOutbox_Queue
                        @TaskCode, @To, @Cc, @Bcc, @ObjectId,
                        @BodyJson, @DetailJson, @LangCode, @Priority, @WebhookUrl",
                    new
                    {
                        n.TaskCode,
                        To = n.To,
                        Cc = n.Cc,
                        Bcc = n.Bcc,
                        n.ObjectId,
                        n.BodyJson,
                        n.DetailJson,
                        n.LangCode,
                        n.Priority,
                        n.WebhookUrl
                    });

                results.Add(new QueueNotificationResponse { NotificationId = newId, Message = "Queued" });
            }
            catch (Exception ex)
            {
                errors.Add($"Failed to queue {n.TaskCode} to {n.To}: {ex.Message}");
            }
        }

        var response = new
        {
            Queued = results,
            Errors = errors,
            TotalRequested = req.Notifications.Count,
            TotalQueued = results.Count,
            TotalFailed = errors.Count
        };

        return errors.Count == 0
            ? Results.Ok(ApiResponse<object>.Ok(response, $"{results.Count} notifications queued."))
            : Results.Ok(ApiResponse<object>.Ok(response, $"{results.Count} queued, {errors.Count} failed."));
    }

    private static async Task<IResult> GetStatus(
        long id,
        IDbConnectionFactory db)
    {
        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var row = await conn.QueryFirstOrDefaultAsync<NotificationStatusResponse>(
            @"SELECT Id, Status, SentAt, Attempts, ErrorMessage, TaskCode, ToList
              FROM dbo.EmailOutbox
              WHERE Id = @Id",
            new { Id = id });

        if (row is null)
            return Results.NotFound(ApiResponse.Fail($"Notification {id} not found."));

        return Results.Ok(ApiResponse<NotificationStatusResponse>.Ok(row));
    }

    private static async Task<IResult> RetryNotification(
        long id,
        IDbConnectionFactory db)
    {
        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "EXEC dbo.csp_History_Retry @Id",
            new { Id = id });

        return affected > 0
            ? Results.Ok(ApiResponse.Ok(message: $"Notification {id} requeued for retry."))
            : Results.NotFound(ApiResponse.Fail($"Notification {id} not found or not in failed state."));
    }

    private static async Task<IResult> GetHistory(
        [AsParameters] NotificationHistoryQuery query,
        IDbConnectionFactory db)
    {
        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var offset = (query.Page - 1) * query.PageSize;

        const string countSql = @"
            SELECT COUNT(*)
            FROM dbo.EmailOutbox
            WHERE (@TaskCode IS NULL OR TaskCode = @TaskCode)
              AND (@Status IS NULL OR Status = @Status)
              AND (@From IS NULL OR CreatedAt >= @From)
              AND (@To IS NULL OR CreatedAt <= @To)";

        const string dataSql = @"
            SELECT Id, Status, SentAt, Attempts, ErrorMessage, TaskCode, ToList
            FROM dbo.EmailOutbox
            WHERE (@TaskCode IS NULL OR TaskCode = @TaskCode)
              AND (@Status IS NULL OR Status = @Status)
              AND (@From IS NULL OR CreatedAt >= @From)
              AND (@To IS NULL OR CreatedAt <= @To)
            ORDER BY Id DESC
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY";

        var p = new
        {
            query.TaskCode,
            query.Status,
            query.From,
            query.To,
            Offset = offset,
            query.PageSize
        };

        var total = await conn.ExecuteScalarAsync<int>(countSql, p);
        var items = (await conn.QueryAsync<NotificationStatusResponse>(dataSql, p)).ToList();

        var response = new NotificationHistoryResponse
        {
            Items = items,
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };

        return Results.Ok(ApiResponse<NotificationHistoryResponse>.Ok(response));
    }
}
