/*
 * 010 — Stored procedure: Release a queued notification (0 → 10)
 *
 * After queueing (Status=0) and optionally adding attachments,
 * call this to mark the item ready for the worker to pick up.
 */
USE [fxEmail];
GO

IF OBJECT_ID('dbo.EmailOutbox_Release', 'P') IS NOT NULL
    DROP PROCEDURE dbo.EmailOutbox_Release;
GO

CREATE PROCEDURE dbo.EmailOutbox_Release
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    -- Only release items that are in queued/draft state (Status = 0)
    UPDATE dbo.EmailOutbox
    SET Status      = 10,
        NextRetryAt = GETUTCDATE()
    WHERE Id = @Id
      AND Status = 0;

    IF @@ROWCOUNT = 0
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM dbo.EmailOutbox WHERE Id = @Id)
            RAISERROR('EmailOutbox entry %I64d not found.', 16, 1, @Id);
        ELSE
            RAISERROR('EmailOutbox entry %I64d is not in queued state (Status 0).', 16, 1, @Id);
        RETURN;
    END

    SELECT @Id AS Id;
END;
GO

PRINT '010-sp-emailoutbox-release.sql completed successfully.';
GO
