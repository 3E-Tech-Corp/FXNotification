using System.Text.Json;

namespace FXEmailWorker.Models;

// ──────────────────────────────────────────────
// App / API Key management
// ──────────────────────────────────────────────

/// <summary>
/// Row from dbo.Apps — the canonical API key record.
/// Also used by ApiKeyCacheService for key lookups.
/// </summary>
public class ApiKeyRecord
{
    public int AppId { get; set; }
    // Aliases for backward compat with cache lookups
    public int Id { get => AppId; set => AppId = value; }
    public string AppCode { get; set; } = "";
    public string AppName { get; set; } = "";
    public string ApiKey { get; set; } = "";
    public string? AllowedTasks { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public long RequestCount { get; set; }
    public string? Notes { get; set; }

    /// <summary>
    /// Deserialize AllowedTasks JSON array into a list of task codes.
    /// Returns null if AllowedTasks is null/empty (meaning all tasks allowed).
    /// </summary>
    public List<string>? GetAllowedTasksList()
    {
        if (string.IsNullOrWhiteSpace(AllowedTasks))
            return null;
        try
        {
            return JsonSerializer.Deserialize<List<string>>(AllowedTasks);
        }
        catch
        {
            return null;
        }
    }
}

public class AppProfileLink
{
    public int AppId { get; set; }
    public int ProfileId { get; set; }
}

public class CreateAppRequest
{
    public string AppCode { get; set; } = "";
    public string AppName { get; set; } = "";
    public List<string>? AllowedTasks { get; set; }
    public string? Notes { get; set; }
    public List<int>? ProfileIds { get; set; }
}

public class UpdateAppRequest
{
    public string? AppCode { get; set; }
    public string? AppName { get; set; }
    public List<string>? AllowedTasks { get; set; }
    public string? Notes { get; set; }
    public bool? IsActive { get; set; }
    public List<int>? ProfileIds { get; set; }
}

public class AppResponse
{
    public int AppId { get; set; }
    public string AppCode { get; set; } = "";
    public string AppName { get; set; } = "";
    public string MaskedKey { get; set; } = "";
    public string? FullKey { get; set; }
    public List<string>? AllowedTasks { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public long RequestCount { get; set; }
    public string? Notes { get; set; }
    public List<int> ProfileIds { get; set; } = new();
}

// ──────────────────────────────────────────────
// Notification endpoints
// ──────────────────────────────────────────────

public class QueueNotificationRequest
{
    public string TaskCode { get; set; } = "";
    public string To { get; set; } = "";
    public string? Cc { get; set; }
    public string? Bcc { get; set; }
    public long? ObjectId { get; set; }
    public string? BodyJson { get; set; }
    public string? DetailJson { get; set; }
    public string? LangCode { get; set; }
    public string Priority { get; set; } = "N";
    public string? WebhookUrl { get; set; }
    public List<AttachmentInput>? Attachments { get; set; }
}

public class AttachmentInput
{
    public string FileName { get; set; } = "";
    public string MimeType { get; set; } = "application/octet-stream";
    /// <summary>
    /// Base64-encoded file content. Either this or StorageUrl must be provided.
    /// </summary>
    public string? Base64Content { get; set; }
    /// <summary>
    /// URL to download the attachment from at send time. 
    /// The worker will download it when sending the email.
    /// Either this or Base64Content must be provided.
    /// </summary>
    public string? StorageUrl { get; set; }
    public bool IsInline { get; set; }
    public string? ContentId { get; set; }
}

public class QueueBatchRequest
{
    public List<QueueNotificationRequest> Notifications { get; set; } = new();
}

public class QueueNotificationResponse
{
    public long NotificationId { get; set; }
    public string? Message { get; set; }
}

public class NotificationStatusResponse
{
    public long Id { get; set; }
    public string Status { get; set; } = "";
    public DateTime? SentAt { get; set; }
    public int Attempts { get; set; }
    public string? ErrorMessage { get; set; }
    public string? TaskCode { get; set; }
    public string? ToList { get; set; }
}

public class NotificationHistoryQuery
{
    public string? TaskCode { get; set; }
    public string? Status { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class NotificationHistoryResponse
{
    public List<NotificationStatusResponse> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

// ──────────────────────────────────────────────
// Draft / Attach / Release endpoints
// ──────────────────────────────────────────────

public class DraftNotificationRequest
{
    public string TaskCode { get; set; } = "";
    public string To { get; set; } = "";
    public string? Cc { get; set; }
    public string? Bcc { get; set; }
    public long? ObjectId { get; set; }
    public string? BodyJson { get; set; }
    public string? DetailJson { get; set; }
    public string? LangCode { get; set; }
    public string Priority { get; set; } = "N";
    public string? WebhookUrl { get; set; }
}

public class AddAttachmentRequest
{
    public string FileName { get; set; } = "";
    public string MimeType { get; set; } = "application/octet-stream";
    /// <summary>
    /// Base64-encoded file content. Either this or StorageUrl must be provided.
    /// </summary>
    public string? Base64Content { get; set; }
    /// <summary>
    /// URL to download the attachment from at send time.
    /// Either this or Base64Content must be provided.
    /// </summary>
    public string? StorageUrl { get; set; }
    public bool IsInline { get; set; }
    public string? ContentId { get; set; }
}

public class DraftResponse
{
    public long NotificationId { get; set; }
    public string Status { get; set; } = "Draft";
    public string? Message { get; set; }
}

public class AttachmentResponse
{
    public long AttachmentId { get; set; }
    public long NotificationId { get; set; }
    public string? FileName { get; set; }
    public string? Message { get; set; }
}

public class ReleaseResponse
{
    public long NotificationId { get; set; }
    public string Status { get; set; } = "Pending";
    public string? Message { get; set; }
}

// ──────────────────────────────────────────────
// Template endpoints
// ──────────────────────────────────────────────

public class TemplatePreviewRequest
{
    public int? TemplateId { get; set; }
    public string? TemplateCode { get; set; }
    public string? BodyJson { get; set; }
    public string? DetailJson { get; set; }
}

public class TemplatePreviewResponse
{
    public string Subject { get; set; } = "";
    public string Body { get; set; } = "";
}

public class TemplateListItem
{
    public int ET_ID { get; set; }
    public string? ET_Code { get; set; }
    public string? Lang_Code { get; set; }
    public string? Subject { get; set; }
    public string? App_Code { get; set; }
}

// ──────────────────────────────────────────────
// Task endpoints
// ──────────────────────────────────────────────

public class UpdateTaskStatusRequest
{
    public string Status { get; set; } = "";   // A, T, N
}

// ──────────────────────────────────────────────
// Health endpoints
// ──────────────────────────────────────────────

public class HealthResponse
{
    public string Status { get; set; } = "";
    public string Uptime { get; set; } = "";
    public DateTime? LastBatchProcessed { get; set; }
    public int QueueDepth { get; set; }
    public int PendingCount { get; set; }
    public int FailedCount { get; set; }
    public int SentLast24h { get; set; }
    public int FailedLast24h { get; set; }
    public bool WorkerRunning { get; set; }
    public bool DatabaseConnected { get; set; }
}

public class HealthStatsResponse
{
    public List<HourlyStat> Hourly { get; set; } = new();
    public List<TaskBreakdown> TaskBreakdown { get; set; } = new();
}

public class HourlyStat
{
    public string Hour { get; set; } = "";
    public int Sent { get; set; }
    public int Failed { get; set; }
}

public class TaskBreakdown
{
    public string TaskCode { get; set; } = "";
    public int Sent { get; set; }
    public int Failed { get; set; }
    public int Pending { get; set; }
}
