namespace AdminApi.Models;

public class EmailTemplate
{
    public int ET_ID { get; set; }
    public string ET_Code { get; set; } = "";
    public string? Lang_Code { get; set; }
    public string? Subject { get; set; }
    public string? Body { get; set; }
    public int? App_ID { get; set; }
    public string? App_Code { get; set; }
}

public class EmailTemplateCreateDto
{
    public string ET_Code { get; set; } = "";
    public string? Lang_Code { get; set; } = "en";
    public string? Subject { get; set; }
    public string? Body { get; set; }
    public int? App_ID { get; set; }
}

public class EmailTemplateUpdateDto : EmailTemplateCreateDto
{
    public int ET_ID { get; set; }
}
