using Microsoft.Data.SqlClient;
using System.Data;

namespace AdminApi.Repositories;

public abstract class BaseRepository
{
    private readonly string _connectionString;

    protected BaseRepository(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Connection string 'Default' not found.");
    }

    protected IDbConnection CreateConnection()
    {
        return new SqlConnection(_connectionString);
    }
}
