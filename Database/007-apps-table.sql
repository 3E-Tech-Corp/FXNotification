/*
 * 007 — Create Apps table (API keys live here) + App↔Profile many-to-many
 *
 * Apps are the consumer identity (external partner, service, etc.)
 * Each App gets an API key and can be linked to multiple MailProfiles.
 * A MailProfile can serve multiple Apps.
 *
 * This replaces the standalone dbo.ApiKeys table from 006.
 */
USE [fxEmail];
GO

-- ════════════════════════════════════════════════════════════════
-- 1. Apps table
-- ════════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('dbo.Apps') AND type = 'U')
BEGIN
    CREATE TABLE dbo.Apps
    (
        AppId           INT             IDENTITY(1,1) PRIMARY KEY,
        AppCode         NVARCHAR(50)    NOT NULL,
        AppName         NVARCHAR(200)   NOT NULL,
        ApiKey          NVARCHAR(128)   NULL,
        AllowedTasks    NVARCHAR(MAX)   NULL,           -- JSON array of task codes, NULL = all
        IsActive        BIT             NOT NULL DEFAULT 1,
        CreatedAt       DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
        LastUsedAt      DATETIME2       NULL,
        RequestCount    BIGINT          NOT NULL DEFAULT 0,
        Notes           NVARCHAR(500)   NULL
    );

    CREATE UNIQUE NONCLUSTERED INDEX IX_Apps_AppCode
        ON dbo.Apps(AppCode);

    CREATE UNIQUE NONCLUSTERED INDEX IX_Apps_ApiKey
        ON dbo.Apps(ApiKey)
        WHERE ApiKey IS NOT NULL AND IsActive = 1;

    PRINT 'Created dbo.Apps table.';
END;
GO

-- ════════════════════════════════════════════════════════════════
-- 2. AppProfiles junction table (many-to-many)
-- ════════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('dbo.AppProfiles') AND type = 'U')
BEGIN
    CREATE TABLE dbo.AppProfiles
    (
        AppId       INT NOT NULL,
        ProfileId   INT NOT NULL,

        CONSTRAINT PK_AppProfiles       PRIMARY KEY (AppId, ProfileId),
        CONSTRAINT FK_AppProfiles_App   FOREIGN KEY (AppId)     REFERENCES dbo.Apps(AppId),
        CONSTRAINT FK_AppProfiles_Prof  FOREIGN KEY (ProfileId) REFERENCES dbo.MailProfiles(ProfileId)
    );

    PRINT 'Created dbo.AppProfiles junction table.';
END;
GO

-- ════════════════════════════════════════════════════════════════
-- 3. Migrate existing data
-- ════════════════════════════════════════════════════════════════

-- 3a. Migrate from dbo.ApiKeys (if 006 was applied)
IF OBJECT_ID('dbo.ApiKeys', 'U') IS NOT NULL
BEGIN
    SET IDENTITY_INSERT dbo.Apps ON;

    INSERT INTO dbo.Apps (AppId, AppCode, AppName, ApiKey, AllowedTasks, IsActive, CreatedAt, LastUsedAt, RequestCount, Notes)
    SELECT Id,
           LOWER(REPLACE(AppName, ' ', '-')),  -- auto-generate AppCode from name
           AppName, ApiKey, AllowedTasks, IsActive, CreatedAt, LastUsedAt, RequestCount, Notes
    FROM dbo.ApiKeys
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Apps WHERE Apps.ApiKey = ApiKeys.ApiKey);

    SET IDENTITY_INSERT dbo.Apps OFF;
    PRINT 'Migrated data from dbo.ApiKeys → dbo.Apps.';
END;
GO

-- 3b. Migrate MailProfile-level API keys to Apps
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MailProfiles') AND name = 'ApiKey')
BEGIN
    -- Create an App for each profile that has its own API key
    INSERT INTO dbo.Apps (AppCode, AppName, ApiKey, IsActive, CreatedAt, LastUsedAt, RequestCount)
    SELECT
        LOWER(REPLACE(mp.AppKey, ' ', '-')),
        mp.AppKey,
        mp.ApiKey,
        mp.IsActive,
        GETUTCDATE(),
        mp.LastUsedAt,
        mp.RequestCount
    FROM dbo.MailProfiles mp
    WHERE mp.ApiKey IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM dbo.Apps WHERE Apps.ApiKey = mp.ApiKey);

    -- Link those new apps to their source profiles
    INSERT INTO dbo.AppProfiles (AppId, ProfileId)
    SELECT a.AppId, mp.ProfileId
    FROM dbo.Apps a
    INNER JOIN dbo.MailProfiles mp ON a.ApiKey = mp.ApiKey
    WHERE NOT EXISTS (SELECT 1 FROM dbo.AppProfiles WHERE AppId = a.AppId AND ProfileId = mp.ProfileId);

    PRINT 'Migrated MailProfile API keys → dbo.Apps + dbo.AppProfiles.';
END;
GO

PRINT '007-apps-table.sql completed successfully.';
GO
