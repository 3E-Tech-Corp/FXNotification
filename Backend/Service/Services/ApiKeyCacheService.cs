using Dapper;
using FXEmailWorker.Models;

namespace FXEmailWorker.Services;

/// <summary>
/// Singleton cache for API keys. Loaded once on startup; refreshed on key CRUD operations.
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

    /// <summary>
    /// Try to look up a key from the in-memory cache.
    /// Returns false if the key doesn't exist or is inactive.
    /// </summary>
    public bool TryGetKey(string apiKey, out ApiKeyRecord? record)
    {
        if (_cache.TryGetValue(apiKey, out var found) && found.IsActive)
        {
            record = found;
            return true;
        }
        record = null;
        return false;
    }

    /// <summary>
    /// Reload all active API keys from the database into memory.
    /// Also loads profile-level API keys from MailProfiles.
    /// </summary>
    public async Task RefreshAsync()
    {
        await _lock.WaitAsync();
        try
        {
            using var conn = _db.CreateConnection();
            await conn.OpenAsync();

            var newCache = new Dictionary<string, ApiKeyRecord>(StringComparer.Ordinal);

            // Load from ApiKeys table
            var keys = await conn.QueryAsync<ApiKeyRecord>(
                @"SELECT Id, AppName, ApiKey, AllowedTasks, IsActive, CreatedAt, LastUsedAt, RequestCount, Notes
                  FROM dbo.ApiKeys
                  WHERE IsActive = 1 AND ApiKey IS NOT NULL");

            foreach (var k in keys)
            {
                if (!string.IsNullOrWhiteSpace(k.ApiKey))
                    newCache[k.ApiKey] = k;
            }

            // Load from MailProfiles (profile-level keys)
            var profileKeys = await conn.QueryAsync<dynamic>(
                @"SELECT ProfileId, AppKey, ApiKey
                  FROM dbo.MailProfiles
                  WHERE ApiKey IS NOT NULL AND IsActive = 1");

            foreach (var pk in profileKeys)
            {
                string key = (string)pk.ApiKey;
                if (!string.IsNullOrWhiteSpace(key) && !newCache.ContainsKey(key))
                {
                    newCache[key] = new ApiKeyRecord
                    {
                        Id = -(int)pk.ProfileId, // negative ID to distinguish profile keys
                        AppName = (string)(pk.AppKey ?? "profile"),
                        ApiKey = key,
                        IsActive = true,
                        AllowedTasks = null // profile keys have no task restrictions
                    };
                }
            }

            _cache = newCache;
            _logger.LogInformation("API key cache refreshed — {Count} keys loaded ({AppKeys} app keys, {ProfileKeys} profile keys)",
                newCache.Count,
                keys.Count(),
                profileKeys.Count());
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

    /// <summary>
    /// Fire-and-forget: update LastUsedAt and increment RequestCount for a key.
    /// </summary>
    public async Task UpdateUsageAsync(int id)
    {
        try
        {
            using var conn = _db.CreateConnection();
            await conn.OpenAsync();

            if (id > 0)
            {
                // App-level key in ApiKeys table
                await conn.ExecuteAsync(
                    @"UPDATE dbo.ApiKeys
                      SET LastUsedAt = GETUTCDATE(), RequestCount = RequestCount + 1
                      WHERE Id = @Id",
                    new { Id = id });
            }
            else
            {
                // Profile-level key (negative id = ProfileId)
                var profileId = -id;
                await conn.ExecuteAsync(
                    @"UPDATE dbo.MailProfiles
                      SET LastUsedAt = GETUTCDATE(), RequestCount = RequestCount + 1
                      WHERE ProfileId = @Id",
                    new { Id = profileId });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to update usage for key ID {Id}", id);
        }
    }
}
