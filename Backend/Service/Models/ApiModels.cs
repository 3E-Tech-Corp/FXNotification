namespace FXEmailWorker.Models;

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
    public string Base64Content { get; set; } = "";
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
