using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net.Http.Json;

namespace FXEmailWorker.Services;

public class WebhookSettings
{
    public bool Enabled { get; set; } = true;
    public int TimeoutSeconds { get; set; } = 10;
    public int MaxRetries { get; set; } = 3;
}

public class WebhookPayload
{
    public long NotificationId { get; set; }
    public string Status { get; set; } = "";
    public DateTime? SentAt { get; set; }
    public string? ErrorMessage { get; set; }
    public int Attempts { get; set; }
}

public interface IWebhookService
{
    void FireWebhook(string webhookUrl, WebhookPayload payload);
}

public class WebhookService : IWebhookService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<WebhookService> _log;
    private readonly WebhookSettings _settings;

    public WebhookService(IHttpClientFactory httpClientFactory, ILogger<WebhookService> log, IOptions<WebhookSettings> settings)
    {
        _httpClientFactory = httpClientFactory;
        _log = log;
        _settings = settings.Value;
    }

    public void FireWebhook(string webhookUrl, WebhookPayload payload)
    {
        if (!_settings.Enabled || string.IsNullOrWhiteSpace(webhookUrl)) return;

        // Fire-and-forget — don't block the worker
        _ = Task.Run(async () =>
        {
            for (int attempt = 1; attempt <= _settings.MaxRetries; attempt++)
            {
                try
                {
                    var client = _httpClientFactory.CreateClient("Webhook");
                    var response = await client.PostAsJsonAsync(webhookUrl, payload);
                    if (response.IsSuccessStatusCode)
                    {
                        _log.LogInformation("Webhook delivered for notification {Id} to {Url}", payload.NotificationId, webhookUrl);
                        return;
                    }

                    _log.LogWarning("Webhook attempt {Attempt} for notification {Id} returned {Status}",
                        attempt, payload.NotificationId, response.StatusCode);
                }
                catch (Exception ex)
                {
                    _log.LogWarning(ex, "Webhook attempt {Attempt} for notification {Id} failed", attempt, payload.NotificationId);
                }

                if (attempt < _settings.MaxRetries)
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)));
            }

            _log.LogError("Webhook permanently failed for notification {Id} to {Url}", payload.NotificationId, webhookUrl);
        });
    }
}
