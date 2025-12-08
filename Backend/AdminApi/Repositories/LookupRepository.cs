using AdminApi.Models;
using Dapper;
using System.Data;

namespace AdminApi.Repositories;

public interface ILookupRepository
{
    Task<IEnumerable<SelectOption>> GetSecurityModesAsync();
    Task<IEnumerable<SelectOption>> GetTaskStatusesAsync();
    Task<IEnumerable<SelectOption>> GetTaskTypesAsync();
    Task<IEnumerable<SelectOption>> GetMailPrioritiesAsync();
    Task<IEnumerable<SelectOption>> GetOutboxStatusesAsync();
}

public class LookupRepository : BaseRepository, ILookupRepository
{
    public LookupRepository(IConfiguration configuration) : base(configuration)
    {
    }

    public async Task<IEnumerable<SelectOption>> GetSecurityModesAsync()
    {
        using var connection = CreateConnection();
        return await connection.QueryAsync<SelectOption>(
            "csp_SecurityMode_Get",
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task<IEnumerable<SelectOption>> GetTaskStatusesAsync()
    {
        using var connection = CreateConnection();
        return await connection.QueryAsync<SelectOption>(
            "csp_Task_Status",
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task<IEnumerable<SelectOption>> GetTaskTypesAsync()
    {
        using var connection = CreateConnection();
        return await connection.QueryAsync<SelectOption>(
            "csp_Task_Type",
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task<IEnumerable<SelectOption>> GetMailPrioritiesAsync()
    {
        using var connection = CreateConnection();
        return await connection.QueryAsync<SelectOption>(
            "csp_Task_Priority",
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task<IEnumerable<SelectOption>> GetOutboxStatusesAsync()
    {
        using var connection = CreateConnection();
        return await connection.QueryAsync<SelectOption>(
            "csp_Outbox_Status",
            commandType: CommandType.StoredProcedure
        );
    }
}
