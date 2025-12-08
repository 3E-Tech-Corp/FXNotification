using Dapper;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Data.SqlClient;

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using System.Net;


namespace FXEmailWorker
{
    //public record MailProfileRow(
    //    int ProfileId, string AppKey, string FromName, string FromEmail,
    //    string SmtpHost, int SmtpPort, string? AuthUser, string? AuthSecretRef,
    //    byte SecurityMode, bool IsActive);
    public class MailProfileRow
    {
        public int ProfileId { get; set; }
        public string AppKey { get; set; }
        public string FromName { get; set; }
        public string FromEmail { get; set; }
        public string SmtpHost { get; set; }
        public int SmtpPort { get; set; }
        public string? AuthUser { get; set; }
        public string? AuthSecretRef { get; set; }
        public byte SecurityMode { get; set; }
        public bool IsActive { get; set; }

    }
    public class OutboxRow
    {
        public long Id { get; set; }

        public int TaskId { get; set; }
        public string? TaskCode { get; set; }
        public string? TaskStatus { get; set; }

        public string? TemplateCode { get; set; }
        public string? LangCode { get; set; }
        public string? EmailFrom { get; set; }
        public string? EmailFromName { get; set; }

        public string MailPriority { get; set; } = "";
        public long? ObjectId { get; set; }
        public string ToList { get; set; } = "";
        public string? CcList { get; set; }
        public string? BccList { get; set; }
        public string? Subject { get; set; }   // null → render
        public string? BodyHtml { get; set; }   // null → render
        public string? BodyJson { get; set; }  // null → render
        public string? DetailJson { get; set; }
        public int Attempts { get; set; }
    }

    public class AttachmentRow
    {
        public AttachmentRow() { }

        public long AttachmentId { get; set; }
        public long EmailId { get; set; }
        public string FileName { get; set; }
        public string MimeType { get; set; }
        public bool IsInline { get; set; }
        public string? ContentId { get; set; }
        public byte[]? Content { get; set; }
        public string? StorageUrl { get; set; }

    }

    public class EmailTemplateRow
    {
        public int ET_ID { get; set; }
        public string? ET_Code { get; set; }
        public string? Lang_Code { get; set; }
        public string? Subject { get; set; }
        public string? Body { get; set; }
        public string? App_Code { get; set; }
    }
    public class TaskConfig
    {
        public int TaskID { get; set; }

        /// <summary>
        /// A:Active, T:Testing, N:Inactive
        /// </summary>
        public string Status { get; set; } = "";
        public string MailPriority { get; set; } = "";
        public int ProfileID { get; set; }
        public int TemplateID { get; set; }
        public string TemplateCode { get; set; } = "";
        public string TaskCode { get; set; } = "";
        public string TaskType { get; set; } = "";
        public string TestMailTo { get; set; } = "";
        public string MailFromName { get; set; } = "";
        public string MailFrom { get; set; } = "";
        public string MailTo { get; set; } = "";
        public string MailCC { get; set; } = "";
        public string MailBCC { get; set; } = "";
        public string MainProcName { get; set; } = "";
        public string? LineProcName { get; set; }
        public string? AttachmentProcName { get; set; } = "";
        public string? LangCode { get; set; }


    }

    public sealed class Smssettings
    {
        public string BaseUrl { get; set; } = "";
        // e.g., https://api.your-sms.local
        public string ApiKey { get; set; } = "";
        public string SendFrom { get; set; } = "";
    }


}