namespace FXEmailWorker.Services;

/// <summary>
/// Thread-safe singleton that the EmailWorker updates and health endpoints read.
/// </summary>
public class WorkerStatusService
{
    private readonly DateTime _startedAt = DateTime.UtcNow;

    public DateTime StartedAt => _startedAt;
    public DateTime? LastBatchProcessed { get; set; }
    public bool WorkerRunning { get; set; }
    public int LastBatchSize { get; set; }

    public string Uptime
    {
        get
        {
            var ts = DateTime.UtcNow - _startedAt;
            return $"{(int)ts.TotalDays}d {ts.Hours}h {ts.Minutes}m";
        }
    }
}
