using AdminApi.Models;
using Dapper;
using System.Data;

namespace AdminApi.Repositories;

public interface ITemplateRepository
{
    Task<IEnumerable<EmailTemplate>> GetAllAsync(int? appId = null);
    Task<EmailTemplate?> GetByIdAsync(int id);
    Task<int> CreateAsync(EmailTemplateCreateDto template);
    Task UpdateAsync(EmailTemplateUpdateDto template);
    Task DeleteAsync(int id);
}

public class TemplateRepository : BaseRepository, ITemplateRepository
{
    public TemplateRepository(IConfiguration configuration) : base(configuration)
    {
    }

    public async Task<IEnumerable<EmailTemplate>> GetAllAsync(int? appId = null)
    {
        using var connection = CreateConnection();
        return await connection.QueryAsync<EmailTemplate>(
            "csp_Get_Email_Templates",
            new { App_ID = appId ?? 0 },
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task<EmailTemplate?> GetByIdAsync(int id)
    {
        using var connection = CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<EmailTemplate>(
            "SELECT ET_ID, ET_Code, Lang_Code, Subject, Body FROM Email_Templates WHERE ET_ID = @Id",
            new { Id = id }
        );
    }

    public async Task<int> CreateAsync(EmailTemplateCreateDto template)
    {
        using var connection = CreateConnection();
        var parameters = new DynamicParameters();
        parameters.Add("ET_Code", template.ET_Code);
        parameters.Add("Lang_Code", template.Lang_Code);
        parameters.Add("Subject", template.Subject);
        parameters.Add("Body", template.Body);
        parameters.Add("App_ID", template.App_ID);

        var result = await connection.QuerySingleOrDefaultAsync<int?>(
            "csp_Email_Templates_AddNew",
            parameters,
            commandType: CommandType.StoredProcedure
        );

        return result ?? 0;
    }

    public async Task UpdateAsync(EmailTemplateUpdateDto template)
    {
        using var connection = CreateConnection();
        await connection.ExecuteAsync(
            "csp_Email_Templates_Update",
            new
            {
                template.ET_ID,
                template.ET_Code,
                template.Lang_Code,
                template.Subject,
                template.Body,
                template.App_ID
            },
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task DeleteAsync(int id)
    {
        using var connection = CreateConnection();
        await connection.ExecuteAsync(
            "csp_Email_Templates_Delete",
            new { ET_ID = id },
            commandType: CommandType.StoredProcedure
        );
    }
}
