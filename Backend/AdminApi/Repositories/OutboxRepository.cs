using AdminApi.Models;
using Dapper;
using System.Data;

namespace AdminApi.Repositories;

public interface IOutboxRepository
{
    Task<IEnumerable<OutboxItem>> GetAllAsync();
    Task<OutboxItem?> GetByIdAsync(int id);
    Task UpdateAsync(OutboxUpdateDto item);
    Task DeleteAsync(int id);
    Task RetryAsync(int id);
}

public class OutboxRepository : BaseRepository, IOutboxRepository
{
    public OutboxRepository(IConfiguration configuration) : base(configuration)
    {
    }

    public async Task<IEnumerable<OutboxItem>> GetAllAsync()
    {
        using var connection = CreateConnection();
        return await connection.QueryAsync<OutboxItem>(
            "csp_Outbox_Get",
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task<OutboxItem?> GetByIdAsync(int id)
    {
        using var connection = CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<OutboxItem>(
            @"SELECT ID, TaskID, TaskCode, Status, CreatedAt, ToList, CcList, BccList,
                     Attempts, LastError, BodyJson, DetailJson, ObjectId
              FROM EmailOutbox WHERE ID = @Id",
            new { Id = id }
        );
    }

    public async Task UpdateAsync(OutboxUpdateDto item)
    {
        using var connection = CreateConnection();
        await connection.ExecuteAsync(
            "csp_Outbox_Update",
            new
            {
                item.ID,
                item.TaskID,
                item.ToList,
                item.BodyJson,
                item.DetailJson
            },
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task DeleteAsync(int id)
    {
        using var connection = CreateConnection();
        await connection.ExecuteAsync(
            "csp_Outbox_Delete",
            new { ID = id },
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task RetryAsync(int id)
    {
        using var connection = CreateConnection();
        // Reset the item for retry - set status back to Pending and reset NextAttemptAt
        await connection.ExecuteAsync(
            @"UPDATE EmailOutbox
              SET Status = 'P', NextAttemptAt = GETDATE(), Attempts = 0
              WHERE ID = @Id",
            new { Id = id }
        );
    }
}
