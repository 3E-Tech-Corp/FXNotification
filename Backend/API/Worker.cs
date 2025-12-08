using Dapper;
using FXEmailWorker;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using Scriban.Syntax;
using Serilog;
using System.Data;
using System.Net;
using System.Net.Http.Json;
using System.ServiceProcess;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace FXEmailWorker
{


    public sealed class EmailWorker : BackgroundService
    {
        private readonly int batch;
        private readonly int idle;
        private readonly int maxAttempts;

        private readonly Smssettings _sms;
        private readonly IConfiguration _cfg;
        private readonly SqlConnectionStringBuilder _csb;
        private readonly ILogger<EmailWorker> _log;

        public EmailWorker(IConfiguration cfg, SqlConnectionStringBuilder csb, ILogger<EmailWorker> log, IOptions<Smssettings> sms)
        {
            _cfg = cfg;
            _csb = csb;
            _log = log;
            _sms = sms.Value;
            batch = cfg.GetValue("Mail:BatchSize", 50);
            idle = cfg.GetValue("Mail:IdleDelaySeconds", 30);
            maxAttempts = cfg.GetValue("Mail:MaxAttempts", 5);
        }

        async Task<TaskConfig?> GetTaskConfigAsync(SqlConnection conn, int taskID) =>
          await conn.QueryFirstOrDefaultAsync<TaskConfig>(
            "exec dbo.GetTaskConfigAsync @Task_id", new { Task_id = taskID });

        // Load template (best match on app/lang like before)
        async Task<EmailTemplateRow?> LoadTemplateAsync(SqlConnection conn, int ETID, string? lang, int? AppID)
        {
            const string sql = "exec LoadTemplateAsync @ETID, @lang, @AppID";
            return await conn.QueryFirstOrDefaultAsync<EmailTemplateRow>(sql, new { ETID, lang, AppID });
        }

        // Execute stored procedures and build a dynamic model
        async Task<Dictionary<string, object?>> BuildModelFromProcsAsync(
          SqlConnection conn, TaskConfig cfg, long objectId)
        {
            var model = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

            // MAIN
            var main = new DataTable();
            using (var da = new SqlDataAdapter(cfg.MainProcName, conn))
            {
                da.SelectCommand.CommandType = CommandType.StoredProcedure;
                da.SelectCommand.Parameters.Add(new SqlParameter("@Id", SqlDbType.BigInt) { Value = objectId });
                da.Fill(main);
            }
            if (main.Rows.Count > 0)
            {
                var mainDict = Utility.RowToDict(main.Rows[0]);
                // Option A: flatten main fields to top-level
                foreach (var kv in mainDict) model[kv.Key] = kv.Value;
                // Option B: also expose as "main"
                model["main"] = mainDict;
            }

            // LINES (optional)
            if (!string.IsNullOrWhiteSpace(cfg.LineProcName))
            {
                var lines = new DataTable();
                using (var da = new SqlDataAdapter(cfg.LineProcName!, conn))
                {
                    da.SelectCommand.CommandType = CommandType.StoredProcedure;
                    da.SelectCommand.Parameters.Add(new SqlParameter("@Id", SqlDbType.BigInt) { Value = objectId });
                    da.Fill(lines);
                }
                model["detail"] = Utility.TableToList(lines); // array of dicts
            }

            return model;
        }


        async Task<List<AttachmentRow>> LoadTaskAttachmentsAsync(SqlConnection conn, TaskConfig cfg, long? objectId)
        {
            var list = new List<AttachmentRow>();
            if (string.IsNullOrWhiteSpace(cfg.AttachmentProcName)) return list;

            using var cmd = new SqlCommand(cfg.AttachmentProcName, conn)
            {
                CommandType = CommandType.StoredProcedure
            };
            cmd.Parameters.Add(new SqlParameter("@Id", SqlDbType.BigInt) { Value = objectId });
            using var rdr = await cmd.ExecuteReaderAsync();
            while (await rdr.ReadAsync())
            {
                list.Add(new AttachmentRow
                {
                    AttachmentId = 0,
                    EmailId = 0,
                    FileName = rdr.GetString(rdr.GetOrdinal("FileName")),
                    MimeType = rdr.GetString(rdr.GetOrdinal("MimeType")),
                    IsInline = rdr.GetBoolean(rdr.GetOrdinal("IsInline")),
                    ContentId = rdr.IsDBNull(rdr.GetOrdinal("ContentId")) ? null : rdr.GetString(rdr.GetOrdinal("ContentId")),
                    Content = rdr.IsDBNull(rdr.GetOrdinal("Content")) ? null : (byte[])rdr["Content"],
                    StorageUrl = rdr.IsDBNull(rdr.GetOrdinal("StorageUrl")) ? null : rdr.GetString(rdr.GetOrdinal("StorageUrl"))
                }
                );
            }
            return list;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _log.LogInformation("EmailWorker started");
            while (!stoppingToken.IsCancellationRequested)
            {

                if (WindowsServiceLifecycle.IsPaused)
                {
                    await Task.Delay(1000, stoppingToken);
                    continue;
                }

                int processed = 0;
                long ItemID = 0;
                try
                {
                    using var conn = new SqlConnection(_csb.ConnectionString);
                    await conn.OpenAsync(stoppingToken);

                    var items = await conn.QueryAsync<OutboxRow>(
                        "exec dbo.EmailOutbox_GetBatch  @Batch",
                        new { batch });


                    foreach (var m in items)
                    {
                        processed++;
                        ItemID = m.Id;
                        // 1) config for task
                        var cfg = await GetTaskConfigAsync(conn, m.TaskId!);
                        if (cfg is null) throw new InvalidOperationException($"Task {m.TaskCode} not found.");


                        var profile = await conn.QuerySingleAsync<MailProfileRow>(
                          "exec dbo.MailProfile_Get @Id",
                          new { id = cfg.ProfileID });
                        ////
                        ///
                        /// 
                        /// 

                        // if (string.IsNullOrWhiteSpace(m.Subject) || string.IsNullOrWhiteSpace(m.BodyHtml))

                        if (m.ObjectId is null)
                            throw new InvalidOperationException($"Email {m.Id}: missing ObjectId.");


                        // 2) best-match template
                        var tpl = await LoadTemplateAsync(conn, cfg.TemplateID, m.LangCode ?? cfg.LangCode, profile.ProfileId);
                        if (tpl is null || string.IsNullOrWhiteSpace(tpl.Subject) || string.IsNullOrWhiteSpace(tpl.Body))
                            throw new InvalidOperationException($"Template {cfg.TemplateCode} not found/empty.");

                        // 3) run procs → model
                        var model = Utility.BuildScribanModel(m.BodyJson, m.DetailJson);
                        //await BuildModelFromProcsAsync(conn, cfg, m.ObjectId.Value);

                        // 4) render
                        var (subj, html) = Utility.RenderWithScriban(tpl.Subject!, tpl.Body!, model);
                        m.Subject = subj;
                        m.BodyHtml = html;

                        m.EmailFromName = Utility.MergeAddress(m.EmailFromName, cfg.MailFromName);
                        m.EmailFrom = Utility.MergeAddress(m.EmailFrom, cfg.MailFrom);
                        m.ToList = Utility.MergeAddress(m.ToList, cfg.MailTo);
                        m.CcList = Utility.MergeAddress(m.CcList, cfg.MailCC);
                        m.BccList = Utility.MergeAddress(m.BccList, cfg.MailBCC);
                        m.MailPriority = cfg.MailPriority;

                        if (cfg.Status.ToLower() == "t")
                        {
                            //testing send , use test email
                            string logOrig = string.Format("To: {0}, CC:{1}, BCC:{2}",
                                    m.ToList, m.CcList, m.BccList);
                            m.ToList = cfg.TestMailTo;
                            m.CcList = null;
                            m.BccList = null;

                            m.Subject = "[TESTING TASK] " + m.Subject;
                            if (cfg.TaskType.ToLower() == "t")
                                m.BodyHtml = string.Format("TEST SMS:: Original To {0} --- {1}", m.ToList, m.BodyHtml);
                            else

                                m.BodyHtml = string.Format("<p><strong>THIS IS A TEST EMAIL</strong></p><p>Original Recipients:</p><p>{0}</p><hr/>{1}",
                                WebUtility.HtmlEncode(logOrig), m.BodyHtml);
                        }

                        /// 
                        /// 
                        /// Do attachments
                        ////


                        var atts = (await conn.QueryAsync<AttachmentRow>(
                          "exec dbo.EmailAttachments_GetAll   @Id",
                          new { id = m.Id })).ToList();

                        if (cfg.AttachmentProcName is not null)
                        {
                            var taskAtts = await LoadTaskAttachmentsAsync(conn, cfg, m.ObjectId.Value);
                            atts.AddRange(taskAtts);
                        }


                        try
                        {
                            if (cfg.TaskType.ToLower() == "t")
                            {
                                if (atts.Count > 0)
                                    await SendSMSAsync(m, atts[0]);
                                else
                                    await SendSMSAsync(m);

                            }
                            else
                                await SendAsync(profile, m, atts, stoppingToken);

                            await conn.ExecuteAsync(
                              "EXEC dbo.EmailOutbox_MarkSent @Id",
                              new { m.Id });
                            _log.LogInformation("Sent {task} email for ({Id}) #{Ticket} to {To}", m.TaskCode, m.Id, m.ObjectId, m.ToList);
                        }
                        catch (Exception ex)
                        {
                            var attempts = m.Attempts + 1;
                            var delayMin = Math.Min(60, (int)Math.Pow(2, attempts)); // 1,2,4,...60
                                                                                     // record failure
                            await conn.ExecuteAsync(
                              "EXEC dbo.EmailOutbox_RecordFailure @Id,@Attempts,@DelayMinutes,@Error,@MaxAttempts",
                              new
                              {
                                  Id = m.Id,
                                  Attempts = attempts,
                                  DelayMinutes = delayMin,
                                  Error = ex.Message.Length > 1900 ? ex.Message[..1900] : ex.Message,
                                  MaxAttempts = maxAttempts
                              });
                            _log.LogWarning(ex, "Email {Id} failed (attempt {Attempts})", m.Id, attempts);
                        }
                    }
                }
                catch (Exception ex)
                {

                    _log.LogError(ex, "Worker loop error");

                    var conn2 = new SqlConnection(_csb.ConnectionString);
                    // Don't crash the service on transient issues
                    await conn2.ExecuteAsync(
                            "EXEC dbo.EmailOutbox_MarkLoopError @Id, @Err",
                            new { Id = ItemID, Err = ex.Message });
                }

                if (processed == 0)
                    await Task.Delay(TimeSpan.FromSeconds(idle), stoppingToken);
            }
        }

        private async Task SendAsync(MailProfileRow p, OutboxRow m, List<AttachmentRow> atts, CancellationToken ct)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(m.EmailFromName, m.EmailFrom));
            AddAddresses(message.To, m.ToList);
            AddAddresses(message.Cc, m.CcList);
            AddAddresses(message.Bcc, m.BccList);
            message.Subject = m.Subject;
            message.Priority = m.MailPriority.ToLower() switch
            {
                "h" => MessagePriority.Urgent,
                "l" => MessagePriority.NonUrgent,
                _ => MessagePriority.Normal
            };

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = m.BodyHtml,
                TextBody = m.BodyHtml
            };
            ///////
            ///


            foreach (var a in atts)
            {
                Stream? stream = null;
                try
                {
                    if (a.Content is not null)
                    {
                        // Use the binary content directly if available
                        stream = new MemoryStream(a.Content);
                    }
                    else if (!string.IsNullOrWhiteSpace(a.StorageUrl))
                    {
                        // StorageUrl contains the web API download URL - download from it
                        stream = await DownloadFromUrlAsync(a.StorageUrl);
                    }
                    else if (!string.IsNullOrWhiteSpace(a.FileName) && File.Exists(a.FileName))
                    {
                        // Fallback: use local file path from FileName if StorageUrl is empty
                        stream = File.OpenRead(a.FileName);
                    }

                    if (stream is null) continue;

                    if (a.IsInline)
                    {
                        var ctype = MimeKit.ContentType.Parse(a.MimeType);
                        var res = bodyBuilder.LinkedResources.Add(a.FileName, stream, ctype);
                        if (!string.IsNullOrWhiteSpace(a.ContentId))
                            res.ContentId = a.ContentId;
                        res.ContentDisposition = new ContentDisposition(ContentDisposition.Inline);
                    }
                    else
                    {
                        // Attachment
                        var ctypeA = MimeKit.ContentType.Parse(a.MimeType);
                        var att = bodyBuilder.Attachments.Add(a.FileName, stream, ctypeA);
                    }
                }
                finally
                {
                    stream?.Dispose();
                }
            }

            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            var sec = p.SecurityMode switch
            {
                0 => SecureSocketOptions.None,            // Plain (trusted networks only)
                1 => SecureSocketOptions.StartTls,        // STARTTLS on 587
                2 => SecureSocketOptions.SslOnConnect,    // SMTPS 465
                _ => SecureSocketOptions.StartTls
            };



            await client.ConnectAsync(p.SmtpHost, p.SmtpPort, sec, ct);

            if (!string.IsNullOrWhiteSpace(p.AuthUser))
            {
                var secret = ResolveSecret(p.AuthSecretRef);
                await client.AuthenticateAsync(p.AuthUser, secret, ct);
            }

            await client.SendAsync(message, ct);
            await client.DisconnectAsync(true, ct);
        }

        private async Task<Stream> DownloadFromUrlAsync(string url)
        {
            using var httpClient = new HttpClient();

            // Set a reasonable timeout
            httpClient.Timeout = TimeSpan.FromMinutes(5);

            // Add any required headers for your API authentication
            // httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "your-token");
            // httpClient.DefaultRequestHeaders.Add("ApiKey", "your-api-key");

            try
            {
                var response = await httpClient.GetAsync(url);
                response.EnsureSuccessStatusCode();

                var stream = new MemoryStream();
                await response.Content.CopyToAsync(stream);
                stream.Position = 0; // Reset stream position to beginning

                return stream;
            }
            catch (HttpRequestException ex)
            {
                throw new Exception($"Failed to download attachment from {url}", ex);
            }
        }

        private async Task SendSMSAsync(OutboxRow m, AttachmentRow? att = null)
        {
            using var http = new HttpClient
            {
                BaseAddress = new Uri(_sms.BaseUrl)
            };
            http.DefaultRequestHeaders.Add("X-API-Key", _sms.ApiKey);
            string mediaurl = "";
            if (att != null)
            {
                mediaurl = att.FileName;
            }

            var payload = new
            {
                from = _sms.SendFrom,                // comma/space separated list your API expects
                to = m.ToList,                // comma/space separated list your API expects
                body = m.BodyHtml,
                media = mediaurl          // [] for SMS, array for MMS
            };

            var res = await http.PostAsJsonAsync(_sms.BaseUrl, payload);
            res.EnsureSuccessStatusCode();
        }

        private static void AddAddresses(InternetAddressList list, string? csv)
        {
            if (string.IsNullOrWhiteSpace(csv)) return;
            foreach (var token in csv.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries))
            {
                var addr = token.Trim();
                if (addr.Length > 0) list.Add(MailboxAddress.Parse(addr));
            }
        }

        private string ResolveSecret(string? refKey)
        {
            if (string.IsNullOrWhiteSpace(refKey)) return "";
            if (refKey.StartsWith("ENV:", StringComparison.OrdinalIgnoreCase))
            {
                var env = Environment.GetEnvironmentVariable(refKey[4..]);
                if (string.IsNullOrEmpty(env)) throw new InvalidOperationException($"Missing env secret {refKey}");
                return env;
            }
            if (refKey.StartsWith("KEY:", StringComparison.OrdinalIgnoreCase))
            {
                return refKey[4..];
            }
            return refKey;
            //throw new InvalidOperationException($"Unsupported secret ref '{refKey}'");
        }
    }

}