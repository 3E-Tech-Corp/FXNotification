using AdminApi.Models;
using Dapper;
using System.Data;

namespace AdminApi.Repositories;

public interface ITaskRepository
{
    Task<IEnumerable<NotificationTask>> GetAllAsync(int? appId = null);
    Task<NotificationTask?> GetByIdAsync(int id);
    Task<int> CreateAsync(TaskCreateDto task);
    Task UpdateAsync(TaskUpdateDto task);
    Task DeleteAsync(int id);
}

public class TaskRepository : BaseRepository, ITaskRepository
{
    public TaskRepository(IConfiguration configuration) : base(configuration)
    {
    }

    public async Task<IEnumerable<NotificationTask>> GetAllAsync(int? appId = null)
    {
        using var connection = CreateConnection();
        return await connection.QueryAsync<NotificationTask>(
            "csp_Tasks_Get",
            new { App_ID = appId ?? 0 },
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task<NotificationTask?> GetByIdAsync(int id)
    {
        using var connection = CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<NotificationTask>(
            @"SELECT Task_ID, TaskCode, TaskType, Status, MailPriority, ProfileID, TemplateID,
                     TestMailTo, LangCode, MailFromName, MailFrom, MailTo, MailCC, MailBCC,
                     AttachmentProcName, App_ID
              FROM Tasks WHERE Task_ID = @Id",
            new { Id = id }
        );
    }

    public async Task<int> CreateAsync(TaskCreateDto task)
    {
        using var connection = CreateConnection();
        var parameters = new DynamicParameters();
        parameters.Add("TaskCode", task.TaskCode);
        parameters.Add("TaskType", task.TaskType);
        parameters.Add("App_ID", task.App_ID ?? 0);
        parameters.Add("ProfileID", task.ProfileID);
        parameters.Add("TemplateID", task.TemplateID);
        parameters.Add("Status", task.Status);
        parameters.Add("TestMailTo", task.TestMailTo);
        parameters.Add("LangCode", task.LangCode);
        parameters.Add("MailFromName", task.MailFromName);
        parameters.Add("MailFrom", task.MailFrom);
        parameters.Add("MailTo", task.MailTo);
        parameters.Add("MailCC", task.MailCC);
        parameters.Add("MailBCC", task.MailBCC);
        parameters.Add("AttachmentProcName", task.AttachmentProcName);

        var result = await connection.QuerySingleOrDefaultAsync<int?>(
            "csp_Tasks_AddNew",
            parameters,
            commandType: CommandType.StoredProcedure
        );

        return result ?? 0;
    }

    public async Task UpdateAsync(TaskUpdateDto task)
    {
        using var connection = CreateConnection();
        await connection.ExecuteAsync(
            "csp_Tasks_Update",
            new
            {
                task.Task_ID,
                task.TaskCode,
                task.TaskType,
                task.App_ID,
                task.ProfileID,
                task.TemplateID,
                task.Status,
                task.TestMailTo,
                task.LangCode,
                task.MailFromName,
                task.MailFrom,
                task.MailTo,
                task.MailCC,
                task.MailBCC,
                task.AttachmentProcName
            },
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task DeleteAsync(int id)
    {
        using var connection = CreateConnection();
        await connection.ExecuteAsync(
            "csp_Tasks_Delete",
            new { Task_ID = id },
            commandType: CommandType.StoredProcedure
        );
    }
}
