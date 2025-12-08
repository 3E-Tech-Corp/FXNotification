using Dapper;
using FXEmailWorker;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using Scriban.Syntax;
using Serilog;
using Serilog.Settings.Configuration;
using Serilog.Expressions;
using Serilog.Configuration;
using Serilog.Sinks.File;
using System.Data;
using System.Net;
using System.Net.Http.Json;
using System.ServiceProcess;

// Fix TLS security issue - add this at the very beginning
ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls13;
ServicePointManager.CheckCertificateRevocationList = true;

HostApplicationBuilder builder = Host.CreateApplicationBuilder(args);



var serilogOptions = new ConfigurationReaderOptions(
    typeof(Serilog.LoggerConfiguration).Assembly,
    typeof(Serilog.LoggerConfigurationExtensions).Assembly,
    typeof(Serilog.Expressions.SerilogExpression).Assembly
);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration, serilogOptions)
    .CreateLogger(); 

builder.Logging.ClearProviders();
builder.Logging.AddSerilog();  // ✅ CORRECT: Use AddSerilog on Logging

builder.Services.Configure<Smssettings>(
    builder.Configuration.GetSection("SMSSettings"));

builder.Services.AddWindowsService(options =>
{
    options.ServiceName = "Feng Xiao Notification Service";
});


// Bind connection string
var connectionString = builder.Configuration.GetConnectionString("Default") ??
    throw new InvalidOperationException("Missing ConnectionStrings:Default");

var csb = new SqlConnectionStringBuilder(connectionString);

// Register services
builder.Services.AddSingleton(csb);
builder.Services.AddSingleton<IConfiguration>(builder.Configuration);
builder.Services.AddSingleton<WindowsServiceLifecycle>();

// Register the worker
builder.Services.AddHostedService<FXEmailWorker.EmailWorker>();

var host = builder.Build();
await host.RunAsync();

