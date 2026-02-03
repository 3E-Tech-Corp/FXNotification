/*
 * 006 — Create ApiKeys table for per-app API key management
 * Separate from MailProfiles — these are consumer API keys with task restrictions.
 */
USE [fxEmail];
GO

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('dbo.ApiKeys') AND type = 'U')
BEGIN
    CREATE TABLE dbo.ApiKeys (
        Id           INT IDENTITY(1,1) PRIMARY KEY,
        AppName      NVARCHAR(200)  NOT NULL,
        ApiKey       NVARCHAR(128)  NOT NULL,
        AllowedTasks NVARCHAR(MAX)  NULL,      -- JSON array of task codes, NULL = all tasks
        IsActive     BIT            NOT NULL DEFAULT 1,
        CreatedAt    DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
        LastUsedAt   DATETIME2      NULL,
        RequestCount BIGINT         NOT NULL DEFAULT 0,
        Notes        NVARCHAR(500)  NULL
    );

    CREATE UNIQUE NONCLUSTERED INDEX IX_ApiKeys_ApiKey
        ON dbo.ApiKeys(ApiKey)
        WHERE IsActive = 1;

    PRINT 'Created dbo.ApiKeys table.';
END;
GO

PRINT '006-apikeys-table.sql completed successfully.';
GO
