namespace AdminApi.Models;

public class OutboxItem
{
    public int ID { get; set; }
    public int TaskID { get; set; }
    public string? TaskCode { get; set; }
    public string Status { get; set; } = "P";
    public DateTime CreatedAt { get; set; }
    public string ToList { get; set; } = "";
    public string? CcList { get; set; }
    public string? BccList { get; set; }
    public int Attempts { get; set; }
    public string? LastError { get; set; }
    public string? BodyJson { get; set; }
    public string? DetailJson { get; set; }
    public long? ObjectId { get; set; }
}

public class OutboxUpdateDto
{
    public int ID { get; set; }
    public int TaskID { get; set; }
    public string ToList { get; set; } = "";
    public string? BodyJson { get; set; }
    public string? DetailJson { get; set; }
}
