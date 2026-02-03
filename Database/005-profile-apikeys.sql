/*
 * 005 — Add ApiKey column to MailProfiles
 * Each application/profile gets its own API key for authentication.
 */
USE [fxEmail];
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MailProfiles') AND name = 'ApiKey')
BEGIN
    ALTER TABLE dbo.MailProfiles ADD ApiKey NVARCHAR(128) NULL;
    
    CREATE UNIQUE NONCLUSTERED INDEX IX_MailProfiles_ApiKey 
        ON dbo.MailProfiles(ApiKey) 
        WHERE ApiKey IS NOT NULL AND IsActive = 1;
END;
GO

-- Add LastUsedAt and RequestCount for usage tracking
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MailProfiles') AND name = 'LastUsedAt')
    ALTER TABLE dbo.MailProfiles ADD LastUsedAt DATETIME2 NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MailProfiles') AND name = 'RequestCount')
    ALTER TABLE dbo.MailProfiles ADD RequestCount BIGINT NOT NULL DEFAULT 0;
GO

PRINT '005-profile-apikeys.sql completed successfully.';
GO
