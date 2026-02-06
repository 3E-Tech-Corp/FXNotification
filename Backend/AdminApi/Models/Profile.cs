namespace AdminApi.Models;

public class Profile
{
    public int ProfileId { get; set; }
    public string ProfileCode { get; set; } = "";
    public string FromName { get; set; } = "";
    public string FromEmail { get; set; } = "";
    public string SmtpHost { get; set; } = "";
    public int SmtpPort { get; set; }
    public string? AuthUser { get; set; }
    public string? AuthSecretRef { get; set; }
    public string SecurityMode { get; set; } = "0";
    public bool IsActive { get; set; }
    public int? App_ID { get; set; }
    public string? App_Code { get; set; }
}

public class ProfileCreateDto
{
    public string ProfileCode { get; set; } = "";
    public string FromName { get; set; } = "";
    public string FromEmail { get; set; } = "";
    public string SmtpHost { get; set; } = "";
    public int SmtpPort { get; set; } = 587;
    public string? AuthUser { get; set; }
    public string? AuthSecretRef { get; set; }
    public string SecurityMode { get; set; } = "1";
    public bool IsActive { get; set; } = true;
    public int? App_ID { get; set; }
}

public class ProfileUpdateDto : ProfileCreateDto
{
    public int ProfileId { get; set; }
}
