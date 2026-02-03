using FXEmailWorker.Models;

namespace FXEmailWorker.Endpoints;

public static class LookupEndpoints
{
    public static void MapLookupEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/lookups")
            .WithTags("Lookups");

        group.MapGet("/security-modes", GetSecurityModes)
            .WithName("GetSecurityModes")
            .WithSummary("List available SMTP security modes");

        group.MapGet("/task-statuses", GetTaskStatuses)
            .WithName("GetTaskStatuses")
            .WithSummary("List available task statuses");

        group.MapGet("/task-types", GetTaskTypes)
            .WithName("GetTaskTypes")
            .WithSummary("List available task types");

        group.MapGet("/task-priorities", GetTaskPriorities)
            .WithName("GetTaskPriorities")
            .WithSummary("List available task mail priorities");
    }

    private static IResult GetSecurityModes()
    {
        var modes = new[]
        {
            new { value = "0", label = "None" },
            new { value = "1", label = "StartTLS" },
            new { value = "2", label = "SSL/TLS" }
        };
        return Results.Ok(ApiResponse<object>.Ok(modes));
    }

    private static IResult GetTaskStatuses()
    {
        var statuses = new[]
        {
            new { value = "A", label = "Active" },
            new { value = "T", label = "Testing" },
            new { value = "N", label = "Inactive" }
        };
        return Results.Ok(ApiResponse<object>.Ok(statuses));
    }

    private static IResult GetTaskTypes()
    {
        var types = new[]
        {
            new { value = "E", label = "Email" },
            new { value = "S", label = "SMS" }
        };
        return Results.Ok(ApiResponse<object>.Ok(types));
    }

    private static IResult GetTaskPriorities()
    {
        var priorities = new[]
        {
            new { value = "H", label = "High" },
            new { value = "N", label = "Normal" },
            new { value = "L", label = "Low" }
        };
        return Results.Ok(ApiResponse<object>.Ok(priorities));
    }
}
