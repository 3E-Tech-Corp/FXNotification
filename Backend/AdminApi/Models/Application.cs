namespace AdminApi.Models;

public class Application
{
    public int App_ID { get; set; }
    public string App_Code { get; set; } = "";
    public string? Descr { get; set; }
    public int? ProfileID { get; set; }
}

public class ApplicationCreateDto
{
    public string App_Code { get; set; } = "";
    public string? Descr { get; set; }
    public int? ProfileID { get; set; }
}

public class ApplicationUpdateDto : ApplicationCreateDto
{
    public int App_ID { get; set; }
}
