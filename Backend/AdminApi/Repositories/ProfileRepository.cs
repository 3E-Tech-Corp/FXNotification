using AdminApi.Models;
using Dapper;
using System.Data;

namespace AdminApi.Repositories;

public interface IProfileRepository
{
    Task<IEnumerable<Profile>> GetAllAsync();
    Task<Profile?> GetByIdAsync(int id);
    Task<int> CreateAsync(ProfileCreateDto profile);
    Task UpdateAsync(ProfileUpdateDto profile);
    Task DeleteAsync(int id);
}

public class ProfileRepository : BaseRepository, IProfileRepository
{
    public ProfileRepository(IConfiguration configuration) : base(configuration)
    {
    }

    public async Task<IEnumerable<Profile>> GetAllAsync()
    {
        using var connection = CreateConnection();
        return await connection.QueryAsync<Profile>(
            "csp_Profiles_Get",
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task<Profile?> GetByIdAsync(int id)
    {
        using var connection = CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<Profile>(
            "csp_MailProfile_Get",
            new { ProfileId = id },
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task<int> CreateAsync(ProfileCreateDto profile)
    {
        using var connection = CreateConnection();
        var parameters = new DynamicParameters();
        parameters.Add("ProfileCode", profile.ProfileCode);
        parameters.Add("FromName", profile.FromName);
        parameters.Add("FromEmail", profile.FromEmail);
        parameters.Add("SmtpHost", profile.SmtpHost);
        parameters.Add("SmtpPort", profile.SmtpPort);
        parameters.Add("AuthUser", profile.AuthUser);
        parameters.Add("AuthSecretRef", profile.AuthSecretRef);
        parameters.Add("SecurityMode", profile.SecurityMode);
        parameters.Add("IsActive", profile.IsActive);

        var result = await connection.QuerySingleOrDefaultAsync<int?>(
            "csp_MailProfile_AddNew",
            parameters,
            commandType: CommandType.StoredProcedure
        );

        return result ?? 0;
    }

    public async Task UpdateAsync(ProfileUpdateDto profile)
    {
        using var connection = CreateConnection();
        await connection.ExecuteAsync(
            "csp_MailProfile_Update",
            new
            {
                profile.ProfileId,
                profile.ProfileCode,
                profile.FromName,
                profile.FromEmail,
                profile.SmtpHost,
                profile.SmtpPort,
                profile.AuthUser,
                profile.AuthSecretRef,
                profile.SecurityMode,
                profile.IsActive
            },
            commandType: CommandType.StoredProcedure
        );
    }

    public async Task DeleteAsync(int id)
    {
        using var connection = CreateConnection();
        await connection.ExecuteAsync(
            "DELETE FROM MailProfiles WHERE ProfileId = @ProfileId",
            new { ProfileId = id }
        );
    }
}
