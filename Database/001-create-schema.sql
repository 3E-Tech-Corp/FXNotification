/*
 * FXNotification Database Schema
 * ===============================
 * Inferred from the .NET service code (Worker.cs, Objects.cs, Utility.cs)
 * 
 * Target: SQL Server 2019+  |  Database: fxEmail
 * Run in order: 001 → 002 → 003
 */

USE [fxEmail];
GO

-- ════════════════════════════════════════════════════════════════════════════
-- 1. MailProfiles — SMTP / sender configurations
-- ════════════════════════════════════════════════════════════════════════════
IF OBJECT_ID('dbo.MailProfiles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.MailProfiles
    (
        ProfileId       INT             IDENTITY(1,1)   PRIMARY KEY,
        AppKey          NVARCHAR(50)    NOT NULL,           -- application key / code
        FromName        NVARCHAR(200)   NOT NULL,           -- display name in From header
        FromEmail       NVARCHAR(200)   NOT NULL,           -- sender email address
        SmtpHost        NVARCHAR(200)   NOT NULL,
        SmtpPort        INT             NOT NULL DEFAULT 587,
        AuthUser        NVARCHAR(200)   NULL,               -- SMTP login (null = no auth)
        AuthSecretRef   NVARCHAR(500)   NULL,               -- secret ref: ENV:VAR, KEY:literal, or raw
        SecurityMode    TINYINT         NOT NULL DEFAULT 1, -- 0=None, 1=StartTls, 2=SslOnConnect
        IsActive        BIT             NOT NULL DEFAULT 1,
        CreatedAt       DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2       NULL
    );
END;
GO

-- ════════════════════════════════════════════════════════════════════════════
-- 2. EmailTemplates — Scriban templates for subject + body
-- ════════════════════════════════════════════════════════════════════════════
IF OBJECT_ID('dbo.EmailTemplates', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.EmailTemplates
    (
        ET_ID           INT             IDENTITY(1,1)   PRIMARY KEY,
        ET_Code         NVARCHAR(50)    NOT NULL,           -- template code (e.g., RAFFLE_OTP)
        Lang_Code       NVARCHAR(10)    NULL,               -- language code (en, es, etc.)
        Subject         NVARCHAR(500)   NULL,               -- Scriban template for subject
        Body            NVARCHAR(MAX)   NULL,               -- Scriban template for HTML body
        App_Code        NVARCHAR(50)    NULL,               -- application code for multi-app matching
        IsActive        BIT             NOT NULL DEFAULT 1,
        CreatedAt       DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2       NULL
    );

    CREATE NONCLUSTERED INDEX IX_EmailTemplates_Code
        ON dbo.EmailTemplates (ET_Code, Lang_Code);
END;
GO

-- ════════════════════════════════════════════════════════════════════════════
-- 3. EmailTasks — Task configurations (what to send, how to send)
-- ════════════════════════════════════════════════════════════════════════════
IF OBJECT_ID('dbo.EmailTasks', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.EmailTasks
    (
        TaskID              INT             IDENTITY(1,1)   PRIMARY KEY,
        TaskCode            NVARCHAR(50)    NOT NULL UNIQUE,    -- e.g., RAFFLE_OTP
        Status              CHAR(1)         NOT NULL DEFAULT 'A',  -- A=Active, T=Testing, N=Inactive
        MailPriority        CHAR(1)         NOT NULL DEFAULT 'N',  -- H=High, N=Normal, L=Low
        ProfileID           INT             NOT NULL,           -- FK → MailProfiles
        TemplateID          INT             NOT NULL,           -- FK → EmailTemplates (ET_ID)
        TemplateCode        NVARCHAR(50)    NOT NULL DEFAULT '',
        TaskType            NVARCHAR(10)    NOT NULL DEFAULT 'E', -- E=Email, T=Text/SMS
        TestMailTo          NVARCHAR(500)   NOT NULL DEFAULT '',  -- test mode recipient
        MailFromName        NVARCHAR(200)   NOT NULL DEFAULT '',
        MailFrom            NVARCHAR(200)   NOT NULL DEFAULT '',
        MailTo              NVARCHAR(500)   NOT NULL DEFAULT '',  -- default/override To
        MailCC              NVARCHAR(500)   NOT NULL DEFAULT '',
        MailBCC             NVARCHAR(500)   NOT NULL DEFAULT '',
        MainProcName        NVARCHAR(200)   NOT NULL DEFAULT '',  -- stored proc for main model data
        LineProcName        NVARCHAR(200)   NULL,                 -- stored proc for detail/lines
        AttachmentProcName  NVARCHAR(200)   NULL,                 -- stored proc for task-level attachments
        LangCode            NVARCHAR(10)    NULL,
        CreatedAt           DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt           DATETIME2       NULL,

        CONSTRAINT FK_EmailTasks_Profile  FOREIGN KEY (ProfileID)   REFERENCES dbo.MailProfiles(ProfileId),
        CONSTRAINT FK_EmailTasks_Template FOREIGN KEY (TemplateID)  REFERENCES dbo.EmailTemplates(ET_ID),
        CONSTRAINT CK_EmailTasks_Status   CHECK (Status IN ('A','T','N')),
        CONSTRAINT CK_EmailTasks_Priority CHECK (MailPriority IN ('H','N','L'))
    );
END;
GO

-- ════════════════════════════════════════════════════════════════════════════
-- 4. EmailOutbox — Notification queue (the core outbox table)
-- ════════════════════════════════════════════════════════════════════════════
IF OBJECT_ID('dbo.EmailOutbox', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.EmailOutbox
    (
        Id              BIGINT          IDENTITY(1,1)   PRIMARY KEY,
        TaskId          INT             NOT NULL,
        TaskCode        NVARCHAR(50)    NULL,
        TaskStatus      NVARCHAR(10)    NULL,           -- snapshot of task status at queue time
        TemplateCode    NVARCHAR(50)    NULL,
        LangCode        NVARCHAR(10)    NULL,
        EmailFrom       NVARCHAR(200)   NULL,
        EmailFromName   NVARCHAR(200)   NULL,
        MailPriority    CHAR(1)         NOT NULL DEFAULT 'N',
        ObjectId        BIGINT          NULL,           -- reference ID for stored proc data fetching
        ToList          NVARCHAR(500)   NOT NULL,
        CcList          NVARCHAR(500)   NULL,
        BccList         NVARCHAR(500)   NULL,
        Subject         NVARCHAR(500)   NULL,           -- null = render from template
        BodyHtml        NVARCHAR(MAX)   NULL,           -- null = render from template
        BodyJson        NVARCHAR(MAX)   NULL,           -- JSON model for Scriban template
        DetailJson      NVARCHAR(MAX)   NULL,           -- detail/line items JSON
        Attempts        INT             NOT NULL DEFAULT 0,
        Status          NVARCHAR(20)    NOT NULL DEFAULT 'Pending',  -- Pending, Sent, Failed, Error
        WebhookUrl      NVARCHAR(500)   NULL,           -- callback URL on send/fail
        CreatedAt       DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
        ScheduledFor    DATETIME2       NULL,            -- future scheduling (null = immediate)
        SentAt          DATETIME2       NULL,
        NextRetryAt     DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
        ErrorMessage    NVARCHAR(2000)  NULL,

        CONSTRAINT FK_EmailOutbox_Task FOREIGN KEY (TaskId) REFERENCES dbo.EmailTasks(TaskID)
    );

    -- Worker poll index: the main query path
    CREATE NONCLUSTERED INDEX IX_EmailOutbox_Pending
        ON dbo.EmailOutbox (Status, NextRetryAt)
        INCLUDE (TaskId, TaskCode, ObjectId)
        WHERE Status = 'Pending';

    -- History queries
    CREATE NONCLUSTERED INDEX IX_EmailOutbox_History
        ON dbo.EmailOutbox (TaskCode, Status, CreatedAt DESC);
END;
GO

-- ════════════════════════════════════════════════════════════════════════════
-- 5. EmailAttachments — File attachments linked to outbox items
-- ════════════════════════════════════════════════════════════════════════════
IF OBJECT_ID('dbo.EmailAttachments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.EmailAttachments
    (
        AttachmentId    BIGINT          IDENTITY(1,1)   PRIMARY KEY,
        EmailId         BIGINT          NOT NULL,       -- FK → EmailOutbox.Id
        FileName        NVARCHAR(500)   NOT NULL,
        MimeType        NVARCHAR(200)   NOT NULL DEFAULT 'application/octet-stream',
        IsInline        BIT             NOT NULL DEFAULT 0,
        ContentId       NVARCHAR(200)   NULL,           -- for inline/CID references
        Content         VARBINARY(MAX)  NULL,           -- binary content (if stored in DB)
        StorageUrl      NVARCHAR(1000)  NULL,           -- external URL for download
        CreatedAt       DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_EmailAttachments_Outbox FOREIGN KEY (EmailId) REFERENCES dbo.EmailOutbox(Id)
    );

    CREATE NONCLUSTERED INDEX IX_EmailAttachments_EmailId
        ON dbo.EmailAttachments (EmailId);
END;
GO

-- ════════════════════════════════════════════════════════════════════════════
-- 6. EmailAudit — Audit/history log for tracking changes and events
-- ════════════════════════════════════════════════════════════════════════════
IF OBJECT_ID('dbo.EmailAudit', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.EmailAudit
    (
        AuditId         BIGINT          IDENTITY(1,1)   PRIMARY KEY,
        EmailId         BIGINT          NULL,           -- FK → EmailOutbox.Id (nullable for system events)
        Action          NVARCHAR(50)    NOT NULL,       -- Queued, Sent, Failed, Retried, StatusChanged, etc.
        Detail          NVARCHAR(2000)  NULL,
        CreatedAt       DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy       NVARCHAR(100)   NULL            -- user/system identifier
    );

    CREATE NONCLUSTERED INDEX IX_EmailAudit_EmailId
        ON dbo.EmailAudit (EmailId, CreatedAt DESC);
END;
GO

-- ════════════════════════════════════════════════════════════════════════════
-- STORED PROCEDURES
-- ════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- dbo.EmailOutbox_GetBatch
-- Called by: Worker.cs every poll cycle
-- Purpose:  Fetch the next batch of pending notifications ready to send
-- ────────────────────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.EmailOutbox_GetBatch', 'P') IS NOT NULL DROP PROCEDURE dbo.EmailOutbox_GetBatch;
GO
CREATE PROCEDURE dbo.EmailOutbox_GetBatch
    @Batch INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (@Batch)
        Id, TaskId, TaskCode, TaskStatus, TemplateCode, LangCode,
        EmailFrom, EmailFromName, MailPriority, ObjectId,
        ToList, CcList, BccList, Subject, BodyHtml, BodyJson, DetailJson,
        Attempts, Status, WebhookUrl, CreatedAt, SentAt, NextRetryAt, ErrorMessage
    FROM dbo.EmailOutbox WITH (ROWLOCK, READPAST)
    WHERE Status = 'Pending'
      AND ISNULL(NextRetryAt, GETDATE()) <= GETDATE()
    ORDER BY
        CASE MailPriority WHEN 'H' THEN 0 WHEN 'N' THEN 1 WHEN 'L' THEN 2 ELSE 1 END,
        Id;
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- dbo.GetTaskConfigAsync
-- Called by: Worker.cs to load task configuration
-- ────────────────────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.GetTaskConfigAsync', 'P') IS NOT NULL DROP PROCEDURE dbo.GetTaskConfigAsync;
GO
CREATE PROCEDURE dbo.GetTaskConfigAsync
    @Task_id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TaskID, TaskCode, Status, MailPriority, ProfileID, TemplateID, TemplateCode,
           TaskType, TestMailTo, MailFromName, MailFrom, MailTo, MailCC, MailBCC,
           MainProcName, LineProcName, AttachmentProcName, LangCode
    FROM dbo.EmailTasks
    WHERE TaskID = @Task_id;
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- dbo.LoadTemplateAsync
-- Called by: Worker.cs to find the best-match template
-- ────────────────────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.LoadTemplateAsync', 'P') IS NOT NULL DROP PROCEDURE dbo.LoadTemplateAsync;
GO
CREATE PROCEDURE dbo.LoadTemplateAsync
    @ETID   INT,
    @lang   NVARCHAR(10) = NULL,
    @AppID  INT          = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Priority: exact match on ET_ID + lang + app, then fallback
    SELECT TOP 1
        ET_ID, ET_Code, Lang_Code, Subject, Body, App_Code
    FROM dbo.EmailTemplates
    WHERE ET_ID = @ETID
      AND (@lang IS NULL OR Lang_Code = @lang OR Lang_Code IS NULL)
    ORDER BY
        CASE WHEN Lang_Code = @lang THEN 0 ELSE 1 END,
        ET_ID;
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- dbo.MailProfile_Get
-- Called by: Worker.cs to load SMTP profile
-- ────────────────────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.MailProfile_Get', 'P') IS NOT NULL DROP PROCEDURE dbo.MailProfile_Get;
GO
CREATE PROCEDURE dbo.MailProfile_Get
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ProfileId, AppKey, FromName, FromEmail, SmtpHost, SmtpPort,
           AuthUser, AuthSecretRef, SecurityMode, IsActive
    FROM dbo.MailProfiles
    WHERE ProfileId = @Id;
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- dbo.EmailOutbox_MarkSent
-- Called by: Worker.cs after successful send
-- ────────────────────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.EmailOutbox_MarkSent', 'P') IS NOT NULL DROP PROCEDURE dbo.EmailOutbox_MarkSent;
GO
CREATE PROCEDURE dbo.EmailOutbox_MarkSent
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.EmailOutbox
    SET Status   = 'Sent',
        SentAt   = SYSUTCDATETIME(),
        Attempts = Attempts + 1
    WHERE Id = @Id;

    -- Audit trail
    INSERT INTO dbo.EmailAudit (EmailId, Action, Detail)
    VALUES (@Id, 'Sent', 'Notification sent successfully.');
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- dbo.EmailOutbox_RecordFailure
-- Called by: Worker.cs on send failure (with retry backoff)
-- ────────────────────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.EmailOutbox_RecordFailure', 'P') IS NOT NULL DROP PROCEDURE dbo.EmailOutbox_RecordFailure;
GO
CREATE PROCEDURE dbo.EmailOutbox_RecordFailure
    @Id           BIGINT,
    @Attempts     INT,
    @DelayMinutes INT,
    @Error        NVARCHAR(2000),
    @MaxAttempts  INT = 5
AS
BEGIN
    SET NOCOUNT ON;

    IF @Attempts >= @MaxAttempts
    BEGIN
        -- Permanently failed
        UPDATE dbo.EmailOutbox
        SET Status       = 'Failed',
            Attempts     = @Attempts,
            ErrorMessage = @Error
        WHERE Id = @Id;

        INSERT INTO dbo.EmailAudit (EmailId, Action, Detail)
        VALUES (@Id, 'Failed', 'Max attempts reached. Error: ' + LEFT(@Error, 500));
    END
    ELSE
    BEGIN
        -- Schedule retry
        UPDATE dbo.EmailOutbox
        SET Attempts     = @Attempts,
            NextRetryAt  = DATEADD(MINUTE, @DelayMinutes, SYSUTCDATETIME()),
            ErrorMessage = @Error
        WHERE Id = @Id;

        INSERT INTO dbo.EmailAudit (EmailId, Action, Detail)
        VALUES (@Id, 'RetryScheduled', CONCAT('Attempt ', @Attempts, ', next retry in ', @DelayMinutes, ' min. Error: ', LEFT(@Error, 300)));
    END
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- dbo.EmailOutbox_MarkLoopError
-- Called by: Worker.cs on unhandled exception in the processing loop
-- ────────────────────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.EmailOutbox_MarkLoopError', 'P') IS NOT NULL DROP PROCEDURE dbo.EmailOutbox_MarkLoopError;
GO
CREATE PROCEDURE dbo.EmailOutbox_MarkLoopError
    @Id  BIGINT,
    @Err NVARCHAR(2000)
AS
BEGIN
    SET NOCOUNT ON;

    IF @Id > 0
    BEGIN
        UPDATE dbo.EmailOutbox
        SET Status       = 'Error',
            ErrorMessage = @Err
        WHERE Id = @Id;

        INSERT INTO dbo.EmailAudit (EmailId, Action, Detail)
        VALUES (@Id, 'LoopError', LEFT(@Err, 500));
    END
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- dbo.EmailAttachments_GetAll
-- Called by: Worker.cs to load attachments for an outbox item
-- ────────────────────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.EmailAttachments_GetAll', 'P') IS NOT NULL DROP PROCEDURE dbo.EmailAttachments_GetAll;
GO
CREATE PROCEDURE dbo.EmailAttachments_GetAll
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT AttachmentId, EmailId, FileName, MimeType, IsInline, ContentId, Content, StorageUrl
    FROM dbo.EmailAttachments
    WHERE EmailId = @Id;
END;
GO

-- ────────────────────────────────────────────────────────────────────────────
-- dbo.csp_History_Retry
-- Called by: API retry endpoint — reset a failed item for reprocessing
-- ────────────────────────────────────────────────────────────────────────────
IF OBJECT_ID('dbo.csp_History_Retry', 'P') IS NOT NULL DROP PROCEDURE dbo.csp_History_Retry;
GO
CREATE PROCEDURE dbo.csp_History_Retry
    @Id BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.EmailOutbox
    SET Status       = 'Pending',
        NextRetryAt  = SYSUTCDATETIME(),
        ErrorMessage = NULL
    WHERE Id = @Id
      AND Status IN ('Failed', 'Error');

    IF @@ROWCOUNT > 0
    BEGIN
        INSERT INTO dbo.EmailAudit (EmailId, Action, Detail)
        VALUES (@Id, 'Retried', 'Manually requeued via API.');
    END

    SELECT @@ROWCOUNT AS AffectedRows;
END;
GO

PRINT '001-create-schema.sql completed successfully.';
GO
