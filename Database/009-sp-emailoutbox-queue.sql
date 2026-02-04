/*
 * 009 — Stored procedure: Queue a notification into EmailOutbox
 *
 * Looks up Task_ID from TaskCode in emailtaskconfig, then inserts into EmailOutbox.
 * Returns the new Id.
 */
USE [fxEmail];
GO

IF OBJECT_ID('dbo.EmailOutbox_Queue', 'P') IS NOT NULL
    DROP PROCEDURE dbo.EmailOutbox_Queue;
GO

CREATE PROCEDURE dbo.EmailOutbox_Queue
    @TaskId         INT             = NULL,
    @TaskCode       NVARCHAR(100)   = NULL,
    @To             NVARCHAR(MAX),
    @Cc             NVARCHAR(MAX)   = NULL,
    @Bcc            NVARCHAR(MAX)   = NULL,
    @ObjectId       BIGINT          = NULL,
    @BodyJson       NVARCHAR(MAX)   = NULL,
    @DetailJson     NVARCHAR(MAX)   = NULL,
    @LangCode       NVARCHAR(10)    = NULL,
    @Priority       NVARCHAR(10)    = NULL,
    @WebhookUrl     NVARCHAR(500)   = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Resolve: prefer TaskId, fall back to TaskCode
    IF @TaskId IS NULL AND @TaskCode IS NOT NULL
    BEGIN
        SELECT @TaskId = Task_ID
        FROM dbo.emailtaskconfig
        WHERE TaskCode = @TaskCode;
    END

    IF @TaskId IS NULL
    BEGIN
        RAISERROR('Task not found. Provide a valid TaskId or TaskCode.', 16, 1);
        RETURN;
    END

    -- Insert into outbox with Pending status (0)
    INSERT INTO dbo.EmailOutbox (TaskId, ObjectId, ToList, CcList, BccList, Subject, BodyJson, DetailJson, Attempts, NextAttemptAt, Status, CreatedAt)
    VALUES (
        @TaskId,
        @ObjectId,
        @To,
        @Cc,
        @Bcc,
        NULL,           -- Subject filled by template engine at send time
        @BodyJson,
        @DetailJson,
        0,              -- Attempts
        GETUTCDATE(),   -- NextAttemptAt = immediately
        0,              -- Status = Pending
        GETUTCDATE()    -- CreatedAt
    );

    SELECT SCOPE_IDENTITY() AS Id;
END;
GO

PRINT '009-sp-emailoutbox-queue.sql completed successfully.';
GO
