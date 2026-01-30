using Dapper;
using FXEmailWorker.Models;
using FXEmailWorker.Services;
using Microsoft.AspNetCore.Mvc;

namespace FXEmailWorker.Endpoints;

public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tasks")
            .WithTags("Tasks");

        group.MapGet("/", ListTasks)
            .WithName("ListTasks")
            .WithSummary("List all tasks with their config");

        group.MapGet("/{id:int}", GetTask)
            .WithName("GetTask")
            .WithSummary("Get task config by ID");

        group.MapPut("/{id:int}/status", UpdateTaskStatus)
            .WithName("UpdateTaskStatus")
            .WithSummary("Update task status (A=Active, T=Testing, N=Inactive)");
    }

    private static async Task<IResult> ListTasks(IDbConnectionFactory db)
    {
        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var tasks = (await conn.QueryAsync<TaskConfig>(
            @"SELECT TaskID, TaskCode, Status, MailPriority, ProfileID, TemplateID, TemplateCode,
                     TaskType, TestMailTo, MailFromName, MailFrom, MailTo, MailCC, MailBCC,
                     MainProcName, LineProcName, AttachmentProcName, LangCode
              FROM dbo.EmailTasks
              ORDER BY TaskID")).ToList();

        return Results.Ok(ApiResponse<List<TaskConfig>>.Ok(tasks));
    }

    private static async Task<IResult> GetTask(int id, IDbConnectionFactory db)
    {
        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var task = await conn.QueryFirstOrDefaultAsync<TaskConfig>(
            "EXEC dbo.GetTaskConfigAsync @Task_id",
            new { Task_id = id });

        if (task is null)
            return Results.NotFound(ApiResponse.Fail($"Task {id} not found."));

        return Results.Ok(ApiResponse<TaskConfig>.Ok(task));
    }

    private static async Task<IResult> UpdateTaskStatus(
        int id,
        [FromBody] UpdateTaskStatusRequest req,
        IDbConnectionFactory db)
    {
        var validStatuses = new[] { "A", "T", "N" };
        var status = req.Status?.ToUpper() ?? "";
        if (!validStatuses.Contains(status))
            return Results.BadRequest(ApiResponse.Fail("Status must be A (Active), T (Testing), or N (Inactive)."));

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            "UPDATE dbo.EmailTasks SET Status = @Status WHERE TaskID = @Id",
            new { Status = status, Id = id });

        if (affected == 0)
            return Results.NotFound(ApiResponse.Fail($"Task {id} not found."));

        return Results.Ok(ApiResponse.Ok(message: $"Task {id} status updated to {status}."));
    }
}
