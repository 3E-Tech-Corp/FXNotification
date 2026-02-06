namespace AdminApi.Models;

public class HistoryItem
{
    public int ID { get; set; }
    public string? TaskCode { get; set; }
    public string Status { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public string ToList { get; set; } = "";
    public string? CcList { get; set; }
    public string? BccList { get; set; }
    public int Attempts { get; set; }
    public string? LastError { get; set; }
    public string? BodyJson { get; set; }
    public string? DetailJson { get; set; }
}

public class AuditItem
{
    public int Audit_ID { get; set; }
    public DateTime DT_Audit { get; set; }
    public DateTime? NextAttemptAt { get; set; }
    public string Status { get; set; } = "";
    public int Attempts { get; set; }
    public string? LastError { get; set; }
}
