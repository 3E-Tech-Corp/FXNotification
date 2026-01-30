/*
 * 004-add-draft-release.sql
 * ==========================
 * Adds Draft → Attach → Release workflow.
 *
 * Status flow:
 *   'Draft'   (1)  — created, awaiting attachments / final details
 *   'Pending' (10) — released for sending, worker picks it up
 *
 * Safe to re-run (idempotent).
 */

USE [fxEmail];
GO

-- ════════════════════════════════════════════════════════════════════════════
-- dbo.EmailOutbox_Draft
-- Creates a new outbox entry with Status = 'Draft'.
-- Worker ignores drafts (only polls Status = 'Pending').
-- Returns the new Id.
-- ════════════════════════════════════════════════════════════════════════════
IF OBJECT_ID('dbo.EmailOutbox_Draft', 'P') IS NOT NULL DROP PROCEDURE dbo.EmailOutbox_Draft;
GO

CREATE PROCEDURE dbo.EmailOutbox_Draft
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

    -- Insert as Draft — worker will NOT pick this up
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
        @BodyJson, @DetailJson, 'Draft', @WebhookUrl,
        SYSUTCDATETIME(), SYSUTCDATETIME()
    );

    DECLARE @NewId BIGINT = SCOPE_IDENTITY();

    -- Audit trail
    INSERT INTO dbo.EmailAudit (EmailId, Action, Detail, CreatedBy)
    VALUES (@NewId, 'Draft', 'Draft created via REST API.', 'API');

    -- Return the new ID
    SELECT @NewId AS Id;
END;
GO

-- ════════════════════════════════════════════════════════════════════════════
-- dbo.EmailOutbox_AddAttachment
-- Adds a single attachment to an outbox item (Draft or Pending).
-- Supports both StorageUrl and binary Content.
-- ════════════════════════════════════════════════════════════════════════════
IF OBJECT_ID('dbo.EmailOutbox_AddAttachment', 'P') IS NOT NULL DROP PROCEDURE dbo.EmailOutbox_AddAttachment;
GO

CREATE PROCEDURE dbo.EmailOutbox_AddAttachment
    @EmailId    BIGINT,
    @FileName   NVARCHAR(500),
    @MimeType   NVARCHAR(200)   = 'application/octet-stream',
    @IsInline   BIT             = 0,
    @ContentId  NVARCHAR(200)   = NULL,
    @Content    VARBINARY(MAX)  = NULL,
    @StorageUrl NVARCHAR(1000)  = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Verify the outbox entry exists
    IF NOT EXISTS (SELECT 1 FROM dbo.EmailOutbox WHERE Id = @EmailId)
    BEGIN
        RAISERROR('EmailOutbox entry %I64d not found.', 16, 1, @EmailId);
        RETURN;
    END

    INSERT INTO dbo.EmailAttachments
    (EmailId, FileName, MimeType, IsInline, ContentId, Content, StorageUrl)
    VALUES
    (@EmailId, @FileName, @MimeType, @IsInline, @ContentId, @Content, @StorageUrl);

    DECLARE @AttId BIGINT = SCOPE_IDENTITY();

    -- Audit trail
    INSERT INTO dbo.EmailAudit (EmailId, Action, Detail, CreatedBy)
    VALUES (@EmailId, 'AttachmentAdded',
            'Attachment added: ' + @FileName + ' (' + @MimeType + ')',
            'API');

    SELECT @AttId AS AttachmentId;
END;
GO

-- ════════════════════════════════════════════════════════════════════════════
-- dbo.EmailOutbox_Release
-- Transitions a Draft to Pending so the worker picks it up.
-- Only works on Draft status entries.
-- ════════════════════════════════════════════════════════════════════════════
IF OBJECT_ID('dbo.EmailOutbox_Release', 'P') IS NOT NULL DROP PROCEDURE dbo.EmailOutbox_Release;
GO

CREATE PROCEDURE dbo.EmailOutbox_Release
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.EmailOutbox
    SET Status      = 'Pending',
        NextRetryAt = SYSUTCDATETIME()
    WHERE Id = @Id
      AND Status = 'Draft';

    IF @@ROWCOUNT = 0
    BEGIN
        -- Check if exists at all
        IF NOT EXISTS (SELECT 1 FROM dbo.EmailOutbox WHERE Id = @Id)
            RAISERROR('EmailOutbox entry %I64d not found.', 16, 1, @Id);
        ELSE
            RAISERROR('EmailOutbox entry %I64d is not in Draft status.', 16, 1, @Id);
        RETURN;
    END

    -- Audit trail
    INSERT INTO dbo.EmailAudit (EmailId, Action, Detail, CreatedBy)
    VALUES (@Id, 'Released', 'Draft released for sending via REST API.', 'API');

    SELECT @Id AS Id;
END;
GO

PRINT '004-add-draft-release.sql completed successfully.';
GO
