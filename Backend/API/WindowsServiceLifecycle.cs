using System.ServiceProcess;
using Microsoft.Extensions.Hosting;

public class WindowsServiceLifecycle : ServiceBase
{
    private readonly IHostApplicationLifetime _lifetime;

    public static bool IsPaused = false;

    public WindowsServiceLifecycle(IHostApplicationLifetime lifetime)
    {
        _lifetime = lifetime;
        ServiceName = "Feng Xiao Notification Service";
        CanPauseAndContinue = true;
    }

    protected override void OnStart(string[] args)
    {
        // Host already started
    }

    protected override void OnStop()
    {
        _lifetime.StopApplication();
    }

    protected override void OnPause()
    {
        IsPaused = true;
    }

    protected override void OnContinue()
    {
        IsPaused = false;
    }
}
