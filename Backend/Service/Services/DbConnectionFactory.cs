using Microsoft.Data.SqlClient;

namespace FXEmailWorker.Services;

public interface IDbConnectionFactory
{
    SqlConnection CreateConnection();
}

public class DbConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public DbConnectionFactory(SqlConnectionStringBuilder csb)
    {
        _connectionString = csb.ConnectionString;
    }

    public SqlConnection CreateConnection() => new SqlConnection(_connectionString);
}
