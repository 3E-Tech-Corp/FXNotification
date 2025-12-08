using AdminApi.Models;
using Dapper;
using System.Data;

namespace AdminApi.Repositories;

public interface IApplicationRepository
{
    Task<IEnumerable<Application>> GetAllAsync();
    Task<Application?> GetByIdAsync(int id);
    Task<int> CreateAsync(ApplicationCreateDto app);
    Task UpdateAsync(ApplicationUpdateDto app);
    Task DeleteAsync(int id);
}

public class ApplicationRepository : BaseRepository, IApplicationRepository
{
    public ApplicationRepository(IConfiguration configuration) : base(configuration)
    {
    }

    public async Task<IEnumerable<Application>> GetAllAsync()
    {
        using var connection = CreateConnection();
        return await connection.QueryAsync<Application>(
            "csp_Get_Apps",
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task<Application?> GetByIdAsync(int id)
    {
        using var connection = CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<Application>(
            "SELECT App_ID, App_Code, Descr, ProfileID FROM Applications WHERE App_ID = @Id",
            new { Id = id }
        );
    }

    public async Task<int> CreateAsync(ApplicationCreateDto app)
    {
        using var connection = CreateConnection();
        var parameters = new DynamicParameters();
        parameters.Add("App_Code", app.App_Code);
        parameters.Add("Descr", app.Descr);
        parameters.Add("ProfileID", app.ProfileID);
        parameters.Add("App_ID", dbType: DbType.Int32, direction: ParameterDirection.ReturnValue);

        await connection.ExecuteAsync(
            "csp_Apps_Add",
            parameters,
            commandType: CommandType.StoredProcedure
        );

        return parameters.Get<int>("App_ID");
    }

    public async Task UpdateAsync(ApplicationUpdateDto app)
    {
        using var connection = CreateConnection();
        await connection.ExecuteAsync(
            "csp_Apps_Update",
            new
            {
                app.App_ID,
                app.App_Code,
                app.Descr,
                app.ProfileID
            },
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task DeleteAsync(int id)
    {
        using var connection = CreateConnection();
        await connection.ExecuteAsync(
            "csp_Apps_Delete",
            new { App_ID = id },
            commandType: CommandType.StoredProcedure
        );
    }
}
