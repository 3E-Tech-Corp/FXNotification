namespace AdminApi.Models;

public class NotificationTask
{
    public int Task_ID { get; set; }
    public string TaskCode { get; set; } = "";
    public string TaskType { get; set; } = "E";
    public string Status { get; set; } = "A";
    public string MailPriority { get; set; } = "N";
    public int? ProfileID { get; set; }
    public int? TemplateID { get; set; }
    public string? TestMailTo { get; set; }
    public string? LangCode { get; set; }
    public string? MailFromName { get; set; }
    public string? MailFrom { get; set; }
    public string? MailTo { get; set; }
    public string? MailCC { get; set; }
    public string? MailBCC { get; set; }
    public string? AttachmentProcName { get; set; }
    public int? App_ID { get; set; }
}

public class TaskCreateDto
{
    public string TaskCode { get; set; } = "";
    public string TaskType { get; set; } = "E";
    public string Status { get; set; } = "A";
    public string MailPriority { get; set; } = "N";
    public int? ProfileID { get; set; }
    public int? TemplateID { get; set; }
    public string? TestMailTo { get; set; }
    public string? LangCode { get; set; } = "en";
    public string? MailFromName { get; set; }
    public string? MailFrom { get; set; }
    public string? MailTo { get; set; }
    public string? MailCC { get; set; }
    public string? MailBCC { get; set; }
    public string? AttachmentProcName { get; set; }
    public int? App_ID { get; set; }
}

public class TaskUpdateDto : TaskCreateDto
{
    public int Task_ID { get; set; }
}
