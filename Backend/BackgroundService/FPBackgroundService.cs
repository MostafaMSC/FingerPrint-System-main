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

namespace FingerPrint.BackgroundService
{
    public class FPBackgroundService : Microsoft.Extensions.Hosting.BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public FPBackgroundService(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
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

                                // Check for duplicates: 
                                // 1. Exact match (already imported)
                                // 2. Same user, same status, within 2 minutes (duplicate punch)
                                bool exists = db.AttendanceLogs.Any(x => 
                                    x.UserID == userId && 
                                    (
                                        x.Time == logTime || 
                                        (
                                            !string.IsNullOrEmpty(checkStatus) && 
                                            x.CheckStatus == checkStatus && 
                                            x.Time >= logTime.AddMinutes(-2) && 
                                            x.Time <= logTime.AddMinutes(2)
                                        )
                                    )
                                );

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
                            await db.SaveChangesAsync();
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Error processing device {deviceIp}: {ex.Message}");
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"FPBackgroundService Critical Error: {ex.Message}");
                }

                await Task.Delay(TimeSpan.FromMinutes(0.1), stoppingToken);
            }
        }
    }
}
