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

        group.MapPost("/", CreateTask)
            .WithName("CreateTask")
            .WithSummary("Create a new task (master key required)");

        group.MapPut("/{id:int}", UpdateTask)
            .WithName("UpdateTask")
            .WithSummary("Update a task (master key required)");
    }

    private static bool IsMasterKey(HttpContext context)
        => context.Items.TryGetValue("IsMasterKey", out var val) && val is true;

    private static async Task<IResult> ListTasks(IDbConnectionFactory db)
    {
        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var tasks = (await conn.QueryAsync<TaskConfig>(
            @"SELECT Task_ID AS TaskID, TaskCode, Status, MailPriority, ProfileID, TemplateID, TemplateCode,
                     TaskType, TestMailTo, MailFromName, MailFrom, MailTo, MailCC, MailBCC,
                     MainProcName, LineProcName, AttachmentProcName, LangCode
              FROM dbo.emailtaskconfig
              ORDER BY Task_ID")).ToList();

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

    private static async Task<IResult> CreateTask(
        HttpContext httpContext,
        [FromBody] TaskConfig task,
        IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        if (string.IsNullOrWhiteSpace(task.TaskCode))
            return Results.BadRequest(ApiResponse.Fail("taskCode is required."));

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var id = await conn.QuerySingleAsync<int>(
            @"INSERT INTO dbo.emailtaskconfig (TaskCode, Status, MailPriority, ProfileID, TemplateID, TemplateCode,
                TaskType, TestMailTo, MailFromName, MailFrom, MailTo, MailCC, MailBCC,
                MainProcName, LineProcName, AttachmentProcName, LangCode)
              OUTPUT INSERTED.Task_ID
              VALUES (@TaskCode, @Status, @MailPriority, @ProfileID, @TemplateID, @TemplateCode,
                @TaskType, @TestMailTo, @MailFromName, @MailFrom, @MailTo, @MailCC, @MailBCC,
                @MainProcName, @LineProcName, @AttachmentProcName, @LangCode)",
            new
            {
                task.TaskCode,
                Status = string.IsNullOrEmpty(task.Status) ? "A" : task.Status,
                MailPriority = string.IsNullOrEmpty(task.MailPriority) ? "N" : task.MailPriority,
                task.ProfileID,
                task.TemplateID,
                task.TemplateCode,
                TaskType = string.IsNullOrEmpty(task.TaskType) ? "Email" : task.TaskType,
                task.TestMailTo,
                task.MailFromName,
                task.MailFrom,
                task.MailTo,
                task.MailCC,
                task.MailBCC,
                task.MainProcName,
                task.LineProcName,
                task.AttachmentProcName,
                task.LangCode
            });

        return Results.Ok(ApiResponse<object>.Ok(new { taskId = id }, "Task created."));
    }

    private static async Task<IResult> UpdateTask(
        int id,
        HttpContext httpContext,
        [FromBody] TaskConfig task,
        IDbConnectionFactory db)
    {
        if (!IsMasterKey(httpContext))
            return Results.Json(ApiResponse.Fail("Master API key required."), statusCode: 403);

        using var conn = db.CreateConnection();
        await conn.OpenAsync();

        var affected = await conn.ExecuteAsync(
            @"UPDATE dbo.emailtaskconfig SET
                TaskCode = @TaskCode, Status = @Status, MailPriority = @MailPriority,
                ProfileID = @ProfileID, TemplateID = @TemplateID, TemplateCode = @TemplateCode,
                TaskType = @TaskType, TestMailTo = @TestMailTo, MailFromName = @MailFromName,
                MailFrom = @MailFrom, MailTo = @MailTo, MailCC = @MailCC, MailBCC = @MailBCC,
                MainProcName = @MainProcName, LineProcName = @LineProcName,
                AttachmentProcName = @AttachmentProcName, LangCode = @LangCode
              WHERE Task_ID = @Id",
            new
            {
                Id = id,
                task.TaskCode,
                task.Status,
                task.MailPriority,
                task.ProfileID,
                task.TemplateID,
                task.TemplateCode,
                task.TaskType,
                task.TestMailTo,
                task.MailFromName,
                task.MailFrom,
                task.MailTo,
                task.MailCC,
                task.MailBCC,
                task.MainProcName,
                task.LineProcName,
                task.AttachmentProcName,
                task.LangCode
            });

        if (affected == 0)
            return Results.NotFound(ApiResponse.Fail($"Task {id} not found."));

        return Results.Ok(ApiResponse.Ok(message: $"Task {id} updated."));
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
            "UPDATE dbo.emailtaskconfig SET Status = @Status WHERE Task_ID = @Id",
            new { Status = status, Id = id });

        if (affected == 0)
            return Results.NotFound(ApiResponse.Fail($"Task {id} not found."));

        return Results.Ok(ApiResponse.Ok(message: $"Task {id} status updated to {status}."));
    }
}
