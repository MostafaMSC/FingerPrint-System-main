using System;
using System.Linq;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using FingerPrint.Data;
using FingerPrint.Models;
using Microsoft.EntityFrameworkCore;

namespace FingerPrint.BackgroundService
{
    public class FPBackgroundService : Microsoft.Extensions.Hosting.BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly Microsoft.Extensions.Logging.ILogger<FPBackgroundService> _logger;

        public FPBackgroundService(IServiceScopeFactory scopeFactory, Microsoft.Extensions.Logging.ILogger<FPBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var python = scope.ServiceProvider.GetRequiredService<PythonService>();
                    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
                    
                    var devices = config.GetSection("Devices").Get<string[]>() ?? new string[] { "192.168.1.50" };

                    foreach (var deviceIp in devices)
                    {
                        try
                        {
                            var data = python.RunPython(deviceIp);
                            if (data == null || !data.ContainsKey("data")) continue;
                            
                            var logsNode = data["data"];
                            if (logsNode == null) continue;
                            
                            var logs = logsNode.AsArray();

                            foreach (var log in logs)
                            {
                                if (log == null) continue;
                                
                                string userId = log["UserID"]?.ToString() ?? "";
                                string timeStr = log["Time"]?.ToString() ?? "";
                                
                                if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(timeStr)) continue;
                                
                                if (!DateTime.TryParse(timeStr, out DateTime logTime)) continue;

                                string checkStatus = log["CheckStatus"]?.ToString();


                                // Check for duplicates using async EF query to avoid blocking
                                bool exists = await db.AttendanceLogs.AnyAsync(x =>
                                    x.UserID == userId && (
                                        x.Time == logTime || (
                                            !string.IsNullOrEmpty(checkStatus) &&
                                            x.CheckStatus == checkStatus &&
                                            x.Time >= logTime.AddMinutes(-2) &&
                                            x.Time <= logTime.AddMinutes(2)
                                        )
                                    ), stoppingToken);

                                if (!exists)
                                {
                                    db.AttendanceLogs.Add(new AttendanceLog
                                    {
                                        UserID = userId,
                                        Name = log["Name"]?.ToString() ?? "Unknown",
                                        Time = logTime,
                                        Card = log["Card"]?.ToString(),
                                        Role = log["Role"]?.ToString(),
                                        DeviceIP = deviceIp,
                                        CheckStatus = checkStatus
                                    });
                                }
                            }
                            await db.SaveChangesAsync(stoppingToken);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error processing device {DeviceIp}", deviceIp);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "FPBackgroundService critical error");
                }

                try
                {
                    await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    // Cancellation requested - exit the loop gracefully
                    break;
                }
            }
        }
    }
}
