using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FingerPrint.Data;
using FingerPrint.Models;
using Microsoft.AspNetCore.Authorization;
using FingerPrint.Models.Enums;

[ApiController]
[Route("api/[controller]")]
public class ZKPythonController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly PythonService _pythonService;

    public ZKPythonController(ApplicationDbContext context, PythonService pythonService)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _pythonService = pythonService ?? throw new ArgumentNullException(nameof(pythonService));
    }

    [HttpGet("get-logs")]
    public async Task<IActionResult> GetLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 100, [FromQuery] string deviceIp = null)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 100;

        var query = _context.AttendanceLogs.AsQueryable();

        if (!string.IsNullOrEmpty(deviceIp))
        {
            query = query.Where(x => x.DeviceIP == deviceIp);
        }

        var total = await query.CountAsync();

        var logs = await query
            .OrderByDescending(x => x.Time)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { success = true, total, page, pageSize, count = logs.Count, data = logs });
    }

    [HttpGet("get-logs_from_device")]
    public async Task<IActionResult> GetLogsByDevice([FromQuery] int page = 1, [FromQuery] int pageSize = 100, [FromQuery] string deviceIp = null)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 100;

        var query = _pythonService.RunPython(deviceIp);

       

        

        return Ok(new { success = true, total = query.Count(), page, pageSize, count = query.Count(), data = query });
    }

    // 2️⃣ جلب قائمة المستخدمين (من قاعدة البيانات)
    [HttpGet("get-users")]
    public async Task<IActionResult> GetUsers([FromQuery] string deviceIp = null)
    {
        // We now fetch from UserInfo table which has Department/Section
        var query = _context.UserInfos.AsQueryable();

        if (!string.IsNullOrEmpty(deviceIp))
        {
            query = query.Where(u => u.DeviceIp == deviceIp);
        }

        var users = await query.ToListAsync();
        
        return Ok(new { success = true, count = users.Count, users });
    }

    [HttpPost("sync-users")]
    public async Task<IActionResult> SyncUsers([FromQuery] string? deviceIp)
    {
        try
        {
            if (string.IsNullOrEmpty(deviceIp)) return BadRequest(new { success = false, message = "Device IP is required" });

            var result = _pythonService.RunPythonGetUsers(deviceIp);
            
            if (result["success"]?.GetValue<bool>() == true)
            {
                var usersNode = result["users"]?.AsArray();
                if (usersNode != null)
                {
                    // Pre-fetch all existing usernames to handle uniqueness in-memory
                    var existingUsernames = await _context.UserInfos
                                            .Select(u => u.Username)
                                            .ToListAsync();
                    var usedNames = new HashSet<string>(existingUsernames, StringComparer.OrdinalIgnoreCase);

                    foreach (var u in usersNode)
                    {
                        var userId = u["UserID"]?.ToString() ?? "";
                        var name = u["Name"]?.ToString();
                        
                        if (string.IsNullOrWhiteSpace(userId)) continue;

                        if (string.IsNullOrWhiteSpace(name)) name = $"User_{userId}";

                        var card = u["Card"]?.ToString();
                        var password = u["Password"]?.ToString();

                        var existingUser = await _context.UserInfos
                            .FirstOrDefaultAsync(x => x.DeviceUserID == userId && x.DeviceIp == deviceIp);
                        
                        // Determine the final unique username
                        string finalName = name;
                        
                        // If we are adding a NEW user, or changing the name of an existing user
                        if (existingUser == null || !string.Equals(existingUser.Username, finalName, StringComparison.OrdinalIgnoreCase))
                        {
                            int suffix = 1;
                            while (usedNames.Contains(finalName))
                            {
                                finalName = $"{name}_{suffix}";
                                suffix++;
                            }
                        }

                        if (existingUser == null)
                        {
                            var newUser = new UserInfo
                            {
                                DeviceUserID = userId,
                                DeviceIp = deviceIp,
                                Username = finalName,
                                Card = card,
                                Password = password,
                            };
                            _context.UserInfos.Add(newUser);
                            usedNames.Add(finalName);
                        }
                        else
                        {
                            // If name changed, we use the resolved unique finalName
                            // If name didn't change, finalName == existingUser.Username (which is already in usedNames)
                            existingUser.Username = finalName;
                            existingUser.Card = card;
                            existingUser.Password = password;
                            
                            // No need to add to usedNames if it was already there, but safe to add
                            usedNames.Add(finalName); 
                        }
                    }
                    await _context.SaveChangesAsync();
                }
                return Ok(new { success = true, message = "Users synced successfully" });
            }
            else
            {
                return BadRequest(result);
            }
        }
        catch (Exception ex)
        {
            var innerMessage = ex.InnerException?.Message ?? "";
            return StatusCode(500, new { success = false, error = ex.Message, innerError = innerMessage });
        }
    }
// 9️⃣ البحث (على اسم)
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return BadRequest(new { success = false, message = "name is required" });

        var results = await _context.AttendanceLogs
            .Where(l => l.Name.Contains(name))
            .OrderByDescending(l => l.Time)
            .ToListAsync();

        return Ok(new { success = true, results });
    }

    // 🔟 JSON كامل للتصدير (كل السجلات) - احذر من الذاكرة عند وجود ملايين سجلات
    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] string deviceIp = null)
    {
        var query = _context.AttendanceLogs.AsQueryable();

        if (!string.IsNullOrEmpty(deviceIp))
        {
            query = query.Where(x => x.DeviceIP == deviceIp);
        }

        var logs = await query
            .OrderByDescending(l => l.Time)
            .ToListAsync();

        return Ok(new { success = true, count = logs.Count, deviceIp = string.IsNullOrEmpty(deviceIp) ? "All Devices" : deviceIp, data = logs });
    }

    // 11️⃣ المتأخرين (وقت قابل للتغيير)
    [HttpGet("get-late")]
    public async Task<IActionResult> GetLate([FromQuery] string time = "08:30", [FromQuery] string deviceIp = null)
    {
        if (!TimeSpan.TryParse(time, out TimeSpan lateTime))
            lateTime = new TimeSpan(8, 30, 0);

        var today = DateTime.Today;

        var query = _context.AttendanceLogs
            .Where(l => l.Time.Date == today);

        if (!string.IsNullOrEmpty(deviceIp))
        {
            query = query.Where(x => x.DeviceIP == deviceIp);
        }

        var lateLogs = await query.ToListAsync();

        // فلترة يدوية للاحتياط (بما أن EF Core لا ينسق نص الوقت)
        var filtered = lateLogs
            .Where(l => l.Time.TimeOfDay > lateTime)
            .OrderByDescending(l => l.Time)
            .ToList();

        return Ok(new { success = true, count = filtered.Count, lateLogs = filtered });
    }

    // 11.1️⃣ المتأخرين - ملخص الأسبوع
    // 11.1️⃣ المتأخرين - ملخص الأسبوع
    [HttpGet("get-weekly-late")]
    public async Task<IActionResult> GetWeeklyLate([FromQuery] string time = "08:30", [FromQuery] string deviceIp = null)
    {
        if (!TimeSpan.TryParse(time, out TimeSpan lateTime))
            lateTime = new TimeSpan(8, 30, 0);

        var today = DateTime.Today;
        int daysSinceSaturday = ((int)today.DayOfWeek + 1) % 7;
        var startOfWeek = today.AddDays(-daysSinceSaturday);

        var query = _context.AttendanceLogs
            .Where(l => l.Time.Date >= startOfWeek && l.Time.Date <= today);

        if (!string.IsNullOrEmpty(deviceIp))
        {
            query = query.Where(x => x.DeviceIP == deviceIp);
        }

        var weeklyLogs = await query.ToListAsync();

        var result = weeklyLogs
            .GroupBy(l => new { l.UserID, l.Name })
            .Select(g => {
                var dailyFirstEntry = g
                    .GroupBy(x => x.Time.Date)
                    .Select(dayGroup => new {
                        Date = dayGroup.Key,
                        DayName = GetArabicDayName(dayGroup.Key.DayOfWeek),
                        FirstEntry = dayGroup.Min(x => x.Time),
                        FirstEntryTime = dayGroup.Min(x => x.Time).TimeOfDay
                    })
                    .ToList();

                var dailyLate = dailyFirstEntry
                    .Where(d => d.FirstEntryTime > lateTime)
                    .Select(d => new {
                        d.Date,
                        d.DayName,
                        EntryTime = d.FirstEntry.ToString("HH:mm:ss"),
                        LateMinutes = Math.Round((d.FirstEntryTime - lateTime).TotalMinutes, 0)
                    })
                    .ToList();

                var totalLateMinutes = dailyLate.Sum(d => d.LateMinutes);
                var lateDaysCount = dailyLate.Count;

                return new {
                    UserID = g.Key.UserID,
                    Name = g.Key.Name,
                    LateDaysCount = lateDaysCount,
                    TotalLateMinutes = totalLateMinutes,
                    TotalLateHours = Math.Round(totalLateMinutes / 60.0, 2),
                    DailyDetails = dailyLate
                };
            })
            .Where(x => x.LateDaysCount > 0)
            .OrderByDescending(x => x.TotalLateMinutes)
            .ToList();

        return Ok(new {
            success = true,
            weekStart = startOfWeek.ToString("yyyy-MM-dd"),
            weekEnd = today.ToString("yyyy-MM-dd"),
            requiredTime = time,
            result
        });
    }

    private static string GetArabicDayName(DayOfWeek day)
    {
        return day switch
        {
            DayOfWeek.Saturday => "السبت",
            DayOfWeek.Sunday => "الأحد",
            DayOfWeek.Monday => "الاثنين",
            DayOfWeek.Tuesday => "الثلاثاء",
            DayOfWeek.Wednesday => "الأربعاء",
            DayOfWeek.Thursday => "الخميس",
            DayOfWeek.Friday => "الجمعة",
            _ => ""
        };
    }

    // 12️⃣ ساعات العمل (يومي وشهري مع الحسابات المطلوبة)
    [HttpGet("get-work-hours")]
    public async Task<IActionResult> GetWorkHours(
        [FromQuery] string time = "08:30",
        [FromQuery] string FinishTime = "16:00",
        [FromQuery] double requiredDailyHours = 8,
        [FromQuery] int workingDaysPerMonth = 26,
        [FromQuery] string deviceIp = null)
    {
        if (!TimeSpan.TryParse(time, out TimeSpan startTime))
            startTime = new TimeSpan(8, 30, 0);

        if (!TimeSpan.TryParse(FinishTime, out TimeSpan finishTimeSpan))
            finishTimeSpan = new TimeSpan(16, 0, 0);

        var today = DateTime.Today;
        var firstDayOfMonth = new DateTime(today.Year, today.Month, 1);

        int daysSinceSaturday = ((int)today.DayOfWeek + 1) % 7;
        var startOfWeek = today.AddDays(-daysSinceSaturday);
        var endOfWeek = startOfWeek.AddDays(6);

        double monthlyRequired = requiredDailyHours * workingDaysPerMonth;

        var query = _context.AttendanceLogs
            .Where(l => l.Time.Date >= firstDayOfMonth && l.Time.Date <= today);

        if (!string.IsNullOrEmpty(deviceIp) && deviceIp != "null")
        {
            query = query.Where(x => x.DeviceIP == deviceIp);
        }

        var usersGrouped = await query.ToListAsync();

        var result = usersGrouped
            .GroupBy(u => new { u.UserID, u.Name })
            .Select(g => {
                // Helper to calculate hours for a specific date range
                double CalculateHours(IEnumerable<AttendanceLog> logs)
                {
                    var dailyGroups = logs.GroupBy(x => x.Time.Date);
                    double totalHours = 0;

                    foreach (var dayGroup in dailyGroups)
                    {
                        var dayLogs = dayGroup.OrderBy(x => x.Time).ToList();
                        if (!dayLogs.Any()) continue;

                        // Try to find explicit CheckIn and CheckOut
                        var checkIn = dayLogs.FirstOrDefault(x => x.CheckStatus == "CheckIn" || x.CheckStatus == "0");
                        var checkOut = dayLogs.LastOrDefault(x => x.CheckStatus == "CheckOut" || x.CheckStatus == "1");

                        if (checkIn != null && checkOut != null && checkIn != checkOut)
                        {
                            totalHours += (checkOut.Time - checkIn.Time).TotalHours;
                        }
                        else
                        {
                            // Fallback: Max - Min
                            var minLog = dayLogs.First();
                            var maxLog = dayLogs.Last();
                            
                            if (maxLog.Time > minLog.Time)
                            {
                                // Only count if duration > 60 mins OR explicit CheckOut
                                bool isExplicitCheckOut = (maxLog.CheckStatus == "CheckOut" || maxLog.CheckStatus == "1");
                                if ((maxLog.Time - minLog.Time).TotalMinutes > 60 || isExplicitCheckOut)
                                {
                                    totalHours += (maxLog.Time - minLog.Time).TotalHours;
                                }
                            }
                        }
                    }
                    return totalHours;
                }

                var todayLogsList = g.Where(x => x.Time.Date == today).ToList();
                double todayHours = 0;
                
                // Calculate Today's Hours
                if (todayLogsList.Any())
                {
                     var checkIn = todayLogsList.FirstOrDefault(x => x.CheckStatus == "CheckIn" || x.CheckStatus == "0");
                     var checkOut = todayLogsList.LastOrDefault(x => x.CheckStatus == "CheckOut" || x.CheckStatus == "1");

                     if (checkIn != null && checkOut != null && checkIn != checkOut)
                     {
                         todayHours = (checkOut.Time - checkIn.Time).TotalHours;
                     }
                     else if (todayLogsList.Count > 1)
                     {
                         var first = todayLogsList.First().Time;
                         var last = todayLogsList.Last().Time;
                         var lastLog = todayLogsList.Last();

                         // Check if the last punch is a valid CheckOut (explicit or > 60 mins)
                         bool isExplicitCheckOut = (lastLog.CheckStatus == "CheckOut" || lastLog.CheckStatus == "1");
                         if ((last - first).TotalMinutes > 60 || isExplicitCheckOut)
                         {
                             todayHours = (last - first).TotalHours;
                         }
                         else
                         {
                             // Treat as "Still Working" (Live Calculation)
                             var finishDateTime = today.Add(finishTimeSpan);
                             todayHours = (DateTime.Now > finishDateTime) ? (finishDateTime - first).TotalHours : (DateTime.Now - first).TotalHours;
                         }
                     }
                     else if (todayLogsList.Count == 1)
                     {
                        // Live calculation for today if only CheckIn exists
                        var first = todayLogsList.First().Time;
                        var finishDateTime = today.Add(finishTimeSpan);
                        todayHours = (DateTime.Now > finishDateTime) ? (finishDateTime - first).TotalHours : (DateTime.Now - first).TotalHours;
                     }
                }

                var weekLogs = g.Where(x => x.Time.Date >= startOfWeek && x.Time.Date <= endOfWeek).ToList();
                double weeklyHours = CalculateHours(weekLogs);

                var monthLogs = g.ToList(); // Already filtered by date in query
                double monthlyHours = CalculateHours(monthLogs);

                double achievementPercent = monthlyRequired > 0 ? (monthlyHours / monthlyRequired) * 100 : 0;
                double deductionPercent = monthlyRequired > 0 ? Math.Max(0, ((monthlyRequired - monthlyHours) / monthlyRequired) * 100) : 0;

                return new
                {
                    UserID = g.Key.UserID,
                    Name = g.Key.Name,
                    TodayHours = Math.Round(todayHours, 2),
                    WeeklyHours = Math.Round(weeklyHours, 2),
                    MonthHours = Math.Round(monthlyHours, 2),
                    MonthlyRequired = Math.Round(monthlyRequired, 2),
                    AchievementPercent = Math.Round(achievementPercent, 2),
                    DeductionPercent = Math.Round(deductionPercent, 2),
                    LogsCount = g.Count() // Debugging info
                };
            })
            .ToList();

        return Ok(new { success = true, result });
    }

    // 13️⃣ مزامنة السجلات - هنا افتراضياً: تستدعي مصدر خارجي (مثلاً Python service) وتضيف فقط السجلات الجديدة
    // ملاحظة: في تطبيقك، استبدل القسم داخل "FetchExternalLogsAsync" بالاستدعاء الفعلي لخدمة البايثون أو أي مصدر آخر.
    [HttpPost("sync-logs")]
    public async Task<IActionResult> SyncLogs()
    {
        try
        {
            // مثال: هذي مجرد دالة وهمية تُمثل جلب السجلات من المصدر الخارجي
            var externalLogs = await FetchExternalLogsAsync();

            int added = 0;
            int skipped = 0;

            foreach (var log in externalLogs)
            {
                var exists = await _context.AttendanceLogs.AnyAsync(a => a.UserID == log.UserID && a.Time == log.Time);
                if (!exists)
                {
                    _context.AttendanceLogs.Add(log);
                    added++;
                }
                else
                {
                    skipped++;
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "تم مزامنة السجلات بنجاح", added, skipped, total = externalLogs.Count });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    // ... (Skipping get-cards, get-roles, get-today, get-count, get-users-count, get-user, search, export, get-late, get-weekly-late, get-work-hours, sync-logs) ...
// 8️⃣ جلب سجلات موظف معيّن
    [HttpGet("get-user/{id}")]
    public async Task<IActionResult> GetUserLogs(string id, [FromQuery] string deviceIp = null)
    {
        if (string.IsNullOrEmpty(id)) return BadRequest(new { success = false, message = "id is required" });

        var query = _context.AttendanceLogs.Where(l => l.UserID == id);

        if (!string.IsNullOrEmpty(deviceIp))
        {
            query = query.Where(x => x.DeviceIP == deviceIp);
        }

        var userLogs = await query
            .OrderByDescending(l => l.Time)
            .ToListAsync();

        return Ok(new { success = true, count = userLogs.Count, userLogs });
    }
[HttpGet("get-cards")]
    public async Task<IActionResult> GetCards()
    {
        var cards = await _context.AttendanceLogs
            .Where(l => !string.IsNullOrEmpty(l.Card))
            .Select(l => l.Card)
            .Distinct()
            .ToListAsync();

        return Ok(new { success = true, count = cards.Count, cards });
    }

    // 4️⃣ جلب الأدوار (Roles)
    [HttpGet("get-roles")]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await _context.AttendanceLogs
            .Where(l => !string.IsNullOrEmpty(l.Role))
            .Select(l => l.Role)
            .Distinct()
            .ToListAsync();

        return Ok(new { success = true, roles });
    }

    // 5️⃣ سجلات اليوم فقط
    [HttpGet("get-today")]
    public async Task<IActionResult> GetToday([FromQuery] string deviceIp = null)
    {
        var today = DateTime.Today;

        var query = _context.AttendanceLogs
            .Where(l => l.Time.Date == today);

        if (!string.IsNullOrEmpty(deviceIp))
        {
            query = query.Where(x => x.DeviceIP == deviceIp);
        }

        var logs = await query
            .OrderByDescending(l => l.Time)
            .ToListAsync();

        return Ok(new { success = true, count = logs.Count, logs });
    }

    // 6️⃣ عدد السجلات
    [HttpGet("get-count")]
    public async Task<IActionResult> GetLogsCount([FromQuery] string deviceIp = null)
    {
        var query = _context.AttendanceLogs.AsQueryable();

        if (!string.IsNullOrEmpty(deviceIp))
        {
            query = query.Where(x => x.DeviceIP == deviceIp);
        }

        var count = await query.CountAsync();
        return Ok(new { success = true, count });
    }

    // 7️⃣ عدد الموظفين
    [HttpGet("get-users-count")]
    public async Task<IActionResult> GetUsersCount([FromQuery] string deviceIp = null)
    {
        var query = _context.AttendanceLogs.AsQueryable();

        if (!string.IsNullOrEmpty(deviceIp))
        {
            query = query.Where(x => x.DeviceIP == deviceIp);
        }

        var count = await query
            .Select(l => l.UserID)
            .Distinct()
            .CountAsync();

        return Ok(new { success = true, usersCount = count });
    }
    [HttpPost("add-user")]
    public async Task<IActionResult> AddUser([FromBody] AddUserRequest req)
    {
        try
        {
            // 1. Add to Device via Python
            var result = _pythonService.RunPythonAddUser(req.DeviceIp, req.UserName);
            
            if (result["success"]?.GetValue<bool>() == true)
            {
                // 2. Add to Database
                var userId = result["generated_user_id"]?.ToString();
                
                var newUser = new UserInfo
                {
                    DeviceUserID = userId,
                    DeviceIp = req.DeviceIp,
                    Username = req.UserName,
                    Department = req.Department,
                    Section = req.Section,
                    Role =  UserType.Emplpoyee  // Default
                };

                _context.UserInfos.Add(newUser);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "User added to device and database", user = newUser });
            }
            else
            {
                return BadRequest(result);
            }
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    [HttpPost("edit-user")]
    public async Task<IActionResult> EditUser([FromBody] AddUserRequest req, [FromQuery] int userId)
    {
        try
        {
            var user = await _context.UserInfos.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { success = false, message = "User not found in database" });
            }

            // 1. Edit on Device via Python
            // Use DeviceUserID from DB for the device operation
            var deviceUserId = user.DeviceUserID; 
            if (string.IsNullOrEmpty(deviceUserId))
            {
                // Fallback or error? specific logic might depend on if device requires ID.
                return BadRequest(new { success = false, message = "User has no DeviceUserID linked" });
            }

            var result = _pythonService.RunPythonEditUser(req.DeviceIp, deviceUserId, req.UserName);

            if (result["success"]?.GetValue<bool>() == true)
            {
                // 2. Update Database
                user.Username = req.UserName;
                user.Department = req.Department;
                user.Section = req.Section;
                // If the device updated the name, ensure we save changes
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "User updated successfully" });
            }
            else
            {
                return BadRequest(result);
            }
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    [HttpPost("delete-user")]
    public async Task<IActionResult> DeleteUser([FromQuery] string deviceIp, [FromQuery] int userId)
    {
        try
        {
            var user = await _context.UserInfos.FindAsync(userId);
            if (user == null)
            {
                 return NotFound(new { success = false, message = "User not found in database" });
            }

            // 1. Delete from Device via Python
            var deviceUserId = user.DeviceUserID;
            if (string.IsNullOrEmpty(deviceUserId))
            {
                 // If no device ID, maybe just delete from DB? 
                 // But let's check validation protocols.
                 // For now, proceed to warn or just allow DB delete if force?
                 // Let's assume we try to delete from device if we have a DeviceUserID.
            }
            
            var result = new System.Text.Json.Nodes.JsonObject();
            if (!string.IsNullOrEmpty(deviceUserId))
            {
                result = _pythonService.RunPythonDeleteUser(deviceIp, deviceUserId);
            }
            else
            {
                // If null, mock success to allow DB delete? Or error?
                // Assuming success to allow cleanup of broken records
                result["success"] = true; 
            }

            if (result["success"]?.GetValue<bool>() == true)
            {
                // 2. Delete from Database
                _context.UserInfos.Remove(user);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "User deleted successfully" });
            }
            else
            {
                return BadRequest(result);
            }
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }


    // دالة مثال — استبدلها باستدعاء PythonService أو باي مصدر خارجي
    private async Task<List<AttendanceLog>> FetchExternalLogsAsync()
    {
        await Task.Yield();

        // الرجّع قائمة فارغة كلّها مؤقتاً
        return new List<AttendanceLog>();
    }
    // 14️⃣ تقرير الحضور (مجمّع مع Pagination)
    [HttpGet("get-attendance-report")]
    public async Task<IActionResult> GetAttendanceReport(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string deviceIp = null,
        [FromQuery] string dateFrom = null,
        [FromQuery] string dateTo = null,
        [FromQuery] string search = null)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 20;

        var query = _context.AttendanceLogs.AsQueryable();

        if (!string.IsNullOrEmpty(deviceIp))
        {
            query = query.Where(x => x.DeviceIP == deviceIp);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(x => x.Name.Contains(search) || x.UserID.Contains(search));
        }

        if (DateTime.TryParse(dateFrom, out DateTime dtFrom))
        {
            query = query.Where(x => x.Time.Date >= dtFrom.Date);
        }

        if (DateTime.TryParse(dateTo, out DateTime dtTo))
        {
            query = query.Where(x => x.Time.Date <= dtTo.Date);
        }

        var groupedQuery = query
            .GroupBy(l => new { l.UserID, l.Name, Date = l.Time.Date })
            .Select(g => new 
            {
                UserID = g.Key.UserID,
                Name = g.Key.Name,
                Date = g.Key.Date,
                CheckIn = g.Min(x => x.Time),
                CheckOut = g.Max(x => x.Time)
            });

        var totalCount = await groupedQuery.CountAsync();
        
        var pagedData = await groupedQuery
            .OrderByDescending(x => x.Date)
            .ThenBy(x => x.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = pagedData.Select(x => new 
        {
            x.UserID,
            x.Name,
            Date = x.Date.ToString("yyyy-MM-dd"),
            CheckIn = x.CheckIn.ToString("HH:mm:ss"),
            CheckOut = (x.CheckIn == x.CheckOut || (x.CheckOut - x.CheckIn).TotalMinutes < 60) ? null : x.CheckOut.ToString("HH:mm:ss")
        });

        return Ok(new 
        { 
            success = true, 
            page, 
            pageSize, 
            total = totalCount, 
            totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
            data = result 
        });
    }
}
