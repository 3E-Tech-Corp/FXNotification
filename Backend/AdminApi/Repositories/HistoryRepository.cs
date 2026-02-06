using AdminApi.Models;
using Dapper;
using System.Data;

namespace AdminApi.Repositories;

public interface IHistoryRepository
{
    Task<IEnumerable<HistoryItem>> GetAllAsync();
    Task<HistoryItem?> GetByIdAsync(int id);
    Task RetryAsync(int id);
    Task<IEnumerable<AuditItem>> GetAuditAsync(int emailId);
}

public class HistoryRepository : BaseRepository, IHistoryRepository
{
    public HistoryRepository(IConfiguration configuration) : base(configuration)
    {
    }

    public async Task<IEnumerable<HistoryItem>> GetAllAsync()
    {
        using var connection = CreateConnection();
        return await connection.QueryAsync<HistoryItem>(
            "csp_History_Get",
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task<HistoryItem?> GetByIdAsync(int id)
    {
        using var connection = CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<HistoryItem>(
            @"SELECT ID, TaskCode, Status, CreatedAt, ToList, CcList, BccList,
                     Attempts, LastError, BodyJson, DetailJson
              FROM EmailHistory WHERE ID = @Id",
            new { Id = id }
        );
    }

    public async Task RetryAsync(int id)
    {
        using var connection = CreateConnection();
        await connection.ExecuteAsync(
            "csp_History_Retry",
            new { Id = id },
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task<IEnumerable<AuditItem>> GetAuditAsync(int emailId)
    {
        using var connection = CreateConnection();
        return await connection.QueryAsync<AuditItem>(
            "csp_History_Audit",
            new { ID = emailId },
            commandType: CommandType.StoredProcedure
        );
    }
}
