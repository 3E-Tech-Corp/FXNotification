/*
 * 008 — Stored procedure: Get tasks scoped by App via AppProfiles
 *
 * @AppId NULL = return all tasks (master key)
 * @AppId set  = return only tasks whose ProfileID is linked via AppProfiles
 */
USE [fxEmail];
GO

IF OBJECT_ID('dbo.csp_GetTasksByApp', 'P') IS NOT NULL
    DROP PROCEDURE dbo.csp_GetTasksByApp;
GO

CREATE PROCEDURE dbo.csp_GetTasksByApp
    @AppId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @AppId IS NULL
    BEGIN
        -- Master key: return all tasks
        SELECT Task_ID AS TaskID, TaskCode, Status, MailPriority, ProfileID, 
               TemplateID, TemplateCode, TaskType, TestMailTo, MailFromName, 
               MailFrom, MailTo, MailCC, MailBCC, MainProcName, LineProcName, 
               AttachmentProcName, LangCode
        FROM dbo.emailtaskconfig
        ORDER BY Task_ID;
    END
    ELSE
    BEGIN
        -- App key: only tasks for linked profiles
        SELECT t.Task_ID AS TaskID, t.TaskCode, t.Status, t.MailPriority, t.ProfileID,
               t.TemplateID, t.TemplateCode, t.TaskType, t.TestMailTo, t.MailFromName,
               t.MailFrom, t.MailTo, t.MailCC, t.MailBCC, t.MainProcName, t.LineProcName,
               t.AttachmentProcName, t.LangCode
        FROM dbo.emailtaskconfig t
        INNER JOIN dbo.AppProfiles ap ON t.ProfileID = ap.ProfileId
        WHERE ap.AppId = @AppId
        ORDER BY t.Task_ID;
    END
END;
GO

PRINT '008-sp-get-tasks-by-app.sql completed successfully.';
GO
