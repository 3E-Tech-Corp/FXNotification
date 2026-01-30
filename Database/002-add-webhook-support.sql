/*
 * 002-add-webhook-support.sql
 * ============================
 * Adds WebhookUrl column to EmailOutbox if it doesn't already exist.
 * Safe to re-run (idempotent).
 */

USE [fxEmail];
GO

-- Add WebhookUrl column if missing
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.EmailOutbox')
      AND name = 'WebhookUrl'
)
BEGIN
    ALTER TABLE dbo.EmailOutbox
    ADD WebhookUrl NVARCHAR(500) NULL;

    PRINT 'Added WebhookUrl column to EmailOutbox.';
END
ELSE
BEGIN
    PRINT 'WebhookUrl column already exists.';
END
GO

-- Add ScheduledFor column if missing (for future scheduling support)
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.EmailOutbox')
      AND name = 'ScheduledFor'
)
BEGIN
    ALTER TABLE dbo.EmailOutbox
    ADD ScheduledFor DATETIME2 NULL;

    PRINT 'Added ScheduledFor column to EmailOutbox.';
END
ELSE
BEGIN
    PRINT 'ScheduledFor column already exists.';
END
GO

PRINT '002-add-webhook-support.sql completed successfully.';
GO
