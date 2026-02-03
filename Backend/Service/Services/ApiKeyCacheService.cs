using Dapper;
using FXEmailWorker.Models;

namespace FXEmailWorker.Services;

/// <summary>
/// In-memory cache of API keys loaded from dbo.Apps.
/// Singleton — refreshed on startup and after mutations.
/// </summary>
public class ApiKeyCacheService
{
    private readonly IDbConnectionFactory _db;
    private readonly ILogger<ApiKeyCacheService> _logger;
    private Dictionary<string, ApiKeyRecord> _cache = new(StringComparer.Ordinal);
    private readonly SemaphoreSlim _lock = new(1, 1);

    public ApiKeyCacheService(IDbConnectionFactory db, ILogger<ApiKeyCacheService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public bool TryGetKey(string apiKey, out ApiKeyRecord? record)
    {
        return _cache.TryGetValue(apiKey, out record) && record is not null && record.IsActive;
    }

    public async Task RefreshAsync()
    {
        await _lock.WaitAsync();
        try
        {
            using var conn = _db.CreateConnection();
            await conn.OpenAsync();

            // Load from dbo.Apps (primary source)
            var keys = await conn.QueryAsync<ApiKeyRecord>(
                @"SELECT AppId, AppCode, AppName, ApiKey, AllowedTasks, IsActive, CreatedAt, LastUsedAt, RequestCount, Notes
                  FROM dbo.Apps
                  WHERE IsActive = 1 AND ApiKey IS NOT NULL");

            var dict = new Dictionary<string, ApiKeyRecord>(StringComparer.Ordinal);
            foreach (var k in keys)
            {
                if (!string.IsNullOrWhiteSpace(k.ApiKey))
                    dict[k.ApiKey] = k;
            }

            // Also load legacy profile-level keys if they still exist
            try
            {
                var profileKeys = await conn.QueryAsync<ApiKeyRecord>(
                    @"SELECT ProfileId AS AppId, AppKey AS AppCode, AppKey AS AppName, ApiKey,
                             NULL AS AllowedTasks, IsActive, GETUTCDATE() AS CreatedAt, LastUsedAt, RequestCount, NULL AS Notes
                      FROM dbo.MailProfiles
                      WHERE IsActive = 1 AND ApiKey IS NOT NULL");

                foreach (var k in profileKeys)
                {
                    if (!string.IsNullOrWhiteSpace(k.ApiKey) && !dict.ContainsKey(k.ApiKey))
                        dict[k.ApiKey] = k;
                }
            }
            catch
            {
                // MailProfiles may not have ApiKey column yet — that's fine
            }

            _cache = dict;
            _logger.LogInformation("API key cache refreshed: {Count} active keys", dict.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh API key cache");
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task UpdateUsageAsync(int appId)
    {
        try
        {
            using var conn = _db.CreateConnection();
            await conn.OpenAsync();
            await conn.ExecuteAsync(
                "UPDATE dbo.Apps SET LastUsedAt = GETUTCDATE(), RequestCount = RequestCount + 1 WHERE AppId = @Id",
                new { Id = appId });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to update API key usage for AppId={AppId}", appId);
        }
    }
}
