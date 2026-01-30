/*
 * 003-add-api-queue-proc.sql
 * ===========================
 * Stored procedure for the REST API to queue notifications.
 * Looks up TaskId from TaskCode, inserts into EmailOutbox, returns new Id.
 */

USE [fxEmail];
GO

IF OBJECT_ID('dbo.EmailOutbox_Queue', 'P') IS NOT NULL DROP PROCEDURE dbo.EmailOutbox_Queue;
GO

CREATE PROCEDURE dbo.EmailOutbox_Queue
    @TaskCode   NVARCHAR(50),
    @To         NVARCHAR(500),
    @Cc         NVARCHAR(500)   = NULL,
    @Bcc        NVARCHAR(500)   = NULL,
    @ObjectId   BIGINT          = NULL,
    @BodyJson   NVARCHAR(MAX)   = NULL,
    @DetailJson NVARCHAR(MAX)   = NULL,
    @LangCode   NVARCHAR(10)    = NULL,
    @Priority   CHAR(1)         = 'N',
    @WebhookUrl NVARCHAR(500)   = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Resolve TaskCode → TaskId and load defaults
    DECLARE @TaskId         INT;
    DECLARE @TaskStatus     NVARCHAR(10);
    DECLARE @TemplateCode   NVARCHAR(50);
    DECLARE @MailPriority   CHAR(1);
    DECLARE @TaskLangCode   NVARCHAR(10);

    SELECT
        @TaskId       = TaskID,
        @TaskStatus   = Status,
        @TemplateCode = TemplateCode,
        @MailPriority = MailPriority,
        @TaskLangCode = LangCode
    FROM dbo.EmailTasks
    WHERE TaskCode = @TaskCode;

    IF @TaskId IS NULL
    BEGIN
        RAISERROR('Task code ''%s'' not found.', 16, 1, @TaskCode);
        RETURN;
    END

    IF @TaskStatus = 'N'
    BEGIN
        RAISERROR('Task ''%s'' is inactive.', 16, 1, @TaskCode);
        RETURN;
    END

    -- Use provided priority or fall back to task default
    IF @Priority IS NULL OR @Priority = ''
        SET @Priority = @MailPriority;

    -- Use provided lang or fall back to task default
    IF @LangCode IS NULL OR @LangCode = ''
        SET @LangCode = @TaskLangCode;

    -- Insert into outbox
    INSERT INTO dbo.EmailOutbox
    (
        TaskId, TaskCode, TaskStatus, TemplateCode, LangCode,
        MailPriority, ObjectId, ToList, CcList, BccList,
        BodyJson, DetailJson, Status, WebhookUrl,
        CreatedAt, NextRetryAt
    )
    VALUES
    (
        @TaskId, @TaskCode, @TaskStatus, @TemplateCode, @LangCode,
        @Priority, @ObjectId, @To, @Cc, @Bcc,
        @BodyJson, @DetailJson, 'Pending', @WebhookUrl,
        SYSUTCDATETIME(), SYSUTCDATETIME()
    );

    DECLARE @NewId BIGINT = SCOPE_IDENTITY();

    -- Audit trail
    INSERT INTO dbo.EmailAudit (EmailId, Action, Detail, CreatedBy)
    VALUES (@NewId, 'Queued', 'Queued via REST API.', 'API');

    -- Return the new ID
    SELECT @NewId AS Id;
END;
GO

PRINT '003-add-api-queue-proc.sql completed successfully.';
GO
