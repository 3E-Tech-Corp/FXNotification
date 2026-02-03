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

        // ── Draft → Attach → Release workflow ─────────────────────────
        group.MapPost("/draft", CreateDraft)
            .WithName("CreateDraft")
            .WithSummary("Create a draft notification (status=Draft, not sent until released)");

        group.MapPost("/{id:long}/attachments", AddAttachment)
            .WithName("AddAttachment")
            .WithSummary("Add a single attachment to a notification");

        group.MapPost("/{id:long}/release", ReleaseNotification)
            .WithName("ReleaseNotification")
            .WithSummary("Release a draft notification for sending (Draft → Pending)");
    }

    // ══════════════════════════════════════════════════════════════════
    // Task authorization helper
    // ══════════════════════════════════════════════════════════════════

    /// <summary>
    /// Check if the current API key is authorized for the given task code.
    /// Returns null if authorized, or a 403 IResult if not.
    /// </summary>
    private static IResult? CheckTaskAuthorization(HttpContext context, string taskCode)
    {
        // Master key has no restrictions
        if (context.Items.TryGetValue("IsMasterKey", out var isMaster) && isMaster is true)
            return null;

        // Check per-app key restrictions
        if (context.Items.TryGetValue("ApiKey", out var keyObj) && keyObj is ApiKeyRecord record)
        {
            var allowedTasks = record.GetAllowedTasksList();
            if (allowedTasks is not null && allowedTasks.Count > 0)
            {
                if (!allowedTasks.Contains(taskCode, StringComparer.OrdinalIgnoreCase))
                {
                    return Results.Json(
                        ApiResponse.Fail($"This API key is not authorized for task: {taskCode}"),
                        statusCode: 403);
                }
            }
        }

        return null;
    }

    // ══════════════════════════════════════════════════════════════════
    // Draft → Attach → Release workflow
    // ══════════════════════════════════════════════════════════════════

    private static async Task<IResult> CreateDraft(
        HttpContext context,
        [FromBody] DraftNotificationRequest req,
        IDbConnectionFactory db)
    {
        if (string.IsNullOrWhiteSpace(req.TaskCode))
            return Results.BadRequest(ApiResponse.Fail("taskCode is required."));
        if (string.IsNullOrWhiteSpace(req.To))
            return Results.BadRequest(ApiResponse.Fail("to is required."));

        // Check per-app task restrictions
        var taskAuthResult = CheckTaskAuthorization(context, req.TaskCode);
        if (taskAuthResult is not null)
            return taskAuthResult;

        try
        {
            using var conn = db.CreateConnection();
            await conn.OpenAsync();

            var newId = await conn.QuerySingleAsync<long>(
                @"EXEC dbo.EmailOutbox_Draft
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

            return Results.Ok(ApiResponse<DraftResponse>.Ok(
                new DraftResponse
                {
                    NotificationId = newId,
                    Status = "Draft",
                    Message = "Draft created. Add attachments, then release."
                }));
        }
        catch (Exception ex)
        {
            return Results.Json(ApiResponse.Fail($"Failed to create draft: {ex.Message}"),
                statusCode: 500);
        }
    }

    private static async Task<IResult> AddAttachment(
        long id,
        [FromBody] AddAttachmentRequest req,
        IDbConnectionFactory db)
    {
        if (string.IsNullOrWhiteSpace(req.FileName))
            return Results.BadRequest(ApiResponse.Fail("fileName is required."));
        if (string.IsNullOrWhiteSpace(req.Base64Content) && string.IsNullOrWhiteSpace(req.StorageUrl))
            return Results.BadRequest(ApiResponse.Fail("Either base64Content or storageUrl is required."));

        try
        {
            using var conn = db.CreateConnection();
            await conn.OpenAsync();

            byte[]? content = null;
            if (!string.IsNullOrWhiteSpace(req.Base64Content))
                content = Convert.FromBase64String(req.Base64Content);

            var attId = await conn.QuerySingleAsync<long>(
                @"EXEC dbo.EmailOutbox_AddAttachment
                    @EmailId, @FileName, @MimeType, @IsInline, @ContentId, @Content, @StorageUrl",
                new
                {
                    EmailId = id,
                    req.FileName,
                    req.MimeType,
                    req.IsInline,
                    req.ContentId,
                    Content = content,
                    req.StorageUrl
                });

            return Results.Ok(ApiResponse<AttachmentResponse>.Ok(
                new AttachmentResponse
                {
                    AttachmentId = attId,
                    NotificationId = id,
                    FileName = req.FileName,
                    Message = "Attachment added."
                }));
        }
        catch (Exception ex)
        {
            return Results.Json(ApiResponse.Fail($"Failed to add attachment: {ex.Message}"),
                statusCode: 500);
        }
    }

    private static async Task<IResult> ReleaseNotification(
        long id,
        IDbConnectionFactory db)
    {
        try
        {
            using var conn = db.CreateConnection();
            await conn.OpenAsync();

            var releasedId = await conn.QuerySingleAsync<long>(
                "EXEC dbo.EmailOutbox_Release @Id",
                new { Id = id });

            return Results.Ok(ApiResponse<ReleaseResponse>.Ok(
                new ReleaseResponse
                {
                    NotificationId = releasedId,
                    Status = "Pending",
                    Message = "Released for sending."
                }));
        }
        catch (Exception ex)
        {
            return Results.Json(ApiResponse.Fail($"Failed to release notification: {ex.Message}"),
                statusCode: 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // One-shot queue (existing)
    // ══════════════════════════════════════════════════════════════════

    private static async Task<IResult> QueueNotification(
        HttpContext context,
        [FromBody] QueueNotificationRequest req,
        IDbConnectionFactory db)
    {
        if (string.IsNullOrWhiteSpace(req.TaskCode))
            return Results.BadRequest(ApiResponse.Fail("taskCode is required."));
        if (string.IsNullOrWhiteSpace(req.To))
            return Results.BadRequest(ApiResponse.Fail("to is required."));

        // Check per-app task restrictions
        var taskAuthResult = CheckTaskAuthorization(context, req.TaskCode);
        if (taskAuthResult is not null)
            return taskAuthResult;

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
        HttpContext context,
        [FromBody] QueueBatchRequest req,
        IDbConnectionFactory db)
    {
        if (req.Notifications.Count == 0)
            return Results.BadRequest(ApiResponse.Fail("notifications array is empty."));

        // Check per-app task restrictions for all requested tasks
        foreach (var n in req.Notifications)
        {
            if (!string.IsNullOrWhiteSpace(n.TaskCode))
            {
                var taskAuthResult = CheckTaskAuthorization(context, n.TaskCode);
                if (taskAuthResult is not null)
                    return taskAuthResult;
            }
        }

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
