using Dapper;
using FXEmailWorker.Models;
using FXEmailWorker.Services;

namespace FXEmailWorker.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/health")
            .WithTags("Health");

        group.MapGet("/", GetHealth)
            .WithName("GetHealth")
            .WithSummary("Service health check");

        group.MapGet("/stats", GetStats)
            .WithName("GetHealthStats")
            .WithSummary("Detailed statistics");
    }

    private static async Task<IResult> GetHealth(
        IDbConnectionFactory db,
        WorkerStatusService workerStatus)
    {
        var health = new HealthResponse
        {
            Status = "healthy",
            Uptime = workerStatus.Uptime,
            LastBatchProcessed = workerStatus.LastBatchProcessed,
            WorkerRunning = workerStatus.WorkerRunning,
            DatabaseConnected = false
        };

        try
        {
            using var conn = db.CreateConnection();
            await conn.OpenAsync();
            health.DatabaseConnected = true;

            // Status values: 0=Draft, 10=Pending, 99=Failed, 100=Sent
            health.PendingCount = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM dbo.EmailOutbox WHERE Status = 10");

            health.FailedCount = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM dbo.EmailOutbox WHERE Status = 99");

            health.QueueDepth = health.PendingCount;

            health.SentLast24h = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM dbo.EmailOutbox WHERE Status = 100 AND SentAt >= DATEADD(HOUR, -24, GETUTCDATE())");

            health.FailedLast24h = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM dbo.EmailOutbox WHERE Status = 99 AND CreatedAt >= DATEADD(HOUR, -24, GETUTCDATE())");
        }
        catch
        {
            health.Status = "degraded";
            health.DatabaseConnected = false;
        }

        return Results.Ok(ApiResponse<HealthResponse>.Ok(health));
    }

    private static async Task<IResult> GetStats(
        IDbConnectionFactory db)
    {
        var response = new HealthStatsResponse();

        try
        {
            using var conn = db.CreateConnection();
            await conn.OpenAsync();

            // Hourly stats for last 24 hours
            // Status values: 0=Draft, 10=Pending, 99=Failed, 100=Sent
            var hourly = await conn.QueryAsync<HourlyStat>(@"
                SELECT
                    FORMAT(DATEADD(HOUR, DATEDIFF(HOUR, 0, SentAt), 0), 'yyyy-MM-ddTHH:mm') AS [Hour],
                    SUM(CASE WHEN Status = 100 THEN 1 ELSE 0 END) AS Sent,
                    SUM(CASE WHEN Status = 99 THEN 1 ELSE 0 END) AS Failed
                FROM dbo.EmailOutbox
                WHERE CreatedAt >= DATEADD(HOUR, -24, GETUTCDATE())
                GROUP BY DATEADD(HOUR, DATEDIFF(HOUR, 0, SentAt), 0)
                ORDER BY [Hour]");

            response.Hourly = hourly.ToList();

            // Task breakdown
            var tasks = await conn.QueryAsync<TaskBreakdown>(@"
                SELECT
                    TaskCode,
                    SUM(CASE WHEN Status = 100 THEN 1 ELSE 0 END) AS Sent,
                    SUM(CASE WHEN Status = 99 THEN 1 ELSE 0 END) AS Failed,
                    SUM(CASE WHEN Status = 10 THEN 1 ELSE 0 END) AS Pending
                FROM dbo.EmailOutbox
                WHERE CreatedAt >= DATEADD(HOUR, -24, GETUTCDATE())
                GROUP BY TaskCode
                ORDER BY TaskCode");

            response.TaskBreakdown = tasks.ToList();

            return Results.Ok(ApiResponse<HealthStatsResponse>.Ok(response));
        }
        catch (Exception ex)
        {
            return Results.Json(ApiResponse.Fail($"Failed to retrieve stats: {ex.Message}"),
                statusCode: 500);
        }
    }
}
