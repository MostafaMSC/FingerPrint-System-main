using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Text.Json.Nodes;
using System.IO;

public class PythonService
{
    private readonly string _pythonExecutable;

    public PythonService()
    {
        // Try to find Python executable
        _pythonExecutable = FindPythonExecutable();
    }

    // قراءة logs من جهاز البصمة
    public JsonObject RunPython(string deviceIp)
    {
        return RunPythonScript("../PythonScript/read_zk.py", $"{deviceIp}");
    }

    // إضافة مستخدم جديد
    public JsonObject RunPythonAddUser(string deviceIp, string userName)
    {
        return RunPythonScript("../PythonScript/AddNewUserToDevice.py", $"{deviceIp} \"{userName}\"");
    }

    // تعديل مستخدم
    public JsonObject RunPythonEditUser(string deviceIp, string userId, string newName)
    {
        return RunPythonScript("../PythonScript/edit_user.py", $"{deviceIp} {userId} \"{newName}\"");
    }

    // حذف مستخدم
    public JsonObject RunPythonDeleteUser(string deviceIp, string userId)
    {
        return RunPythonScript("../PythonScript/delete_user.py", $"{deviceIp} {userId}");
    }

    // جلب كل المستخدمين من الجهاز
    public JsonObject RunPythonGetUsers(string deviceIp)
    {
        return RunPythonScript("../PythonScript/get_users.py", $"{deviceIp}");
    }

    // Find Python executable in system
    private string FindPythonExecutable()
    {
        // Check environment variables for PYTHON_PATH
        var envPythonPath = Environment.GetEnvironmentVariable("PYTHON_PATH");
        if (!string.IsNullOrEmpty(envPythonPath) && File.Exists(envPythonPath))
        {
            return envPythonPath;
        }

        // Try common Python executables
        var pythonCandidates = new[]
        {
            "python3", "python",
            "python.exe", "python3.exe",
            "C:\\Python311\\python.exe",
            "C:\\Python310\\python.exe",
            "C:\\Python39\\python.exe",
            "/usr/bin/python3",
            "/usr/bin/python",
            "/usr/local/bin/python3"
        };

        foreach (var candidate in pythonCandidates)
        {
            try
            {
                var processInfo = new ProcessStartInfo
                {
                    FileName = candidate,
                    Arguments = "--version",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                };

                using (var process = Process.Start(processInfo))
                {
                    if (process != null && process.WaitForExit(2000) && process.ExitCode == 0)
                    {
                        return candidate;
                    }
                }
            }
            catch { }
        }

        return "python"; // Default fallback
    }

    // الدالة العامة لتشغيل أي سكربت
    private JsonObject RunPythonScript(string scriptRelativePath, string arguments)
    {
        string ResolveScriptPath(string rel)
        {
            var fileName = Path.GetFileName(rel);

            // 1) Directly combine and normalize (handles .. segments)
            try
            {
                var candidate = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, rel));
                if (File.Exists(candidate)) return candidate;
            }
            catch { }

            // 2) Check if PythonScript folder is next to base dir (copied to output)
            try
            {
                var candidate = Path.Combine(AppContext.BaseDirectory, "PythonScript", fileName);
                if (File.Exists(candidate)) return Path.GetFullPath(candidate);
            }
            catch { }

            // 3) Walk up parent directories to find a PythonScript folder (repo/project root)
            var dirInfo = new DirectoryInfo(AppContext.BaseDirectory);
            for (int i = 0; i < 8 && dirInfo != null; i++)
            {
                var candidate = Path.Combine(dirInfo.FullName, "PythonScript", fileName);
                if (File.Exists(candidate)) return Path.GetFullPath(candidate);
                dirInfo = dirInfo.Parent;
            }

            // Fallback to the original (normalized) combine even if missing
            try { return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, rel)); } catch { return Path.Combine(AppContext.BaseDirectory, rel); }
        }

        var scriptPath = ResolveScriptPath(scriptRelativePath);

        // Verify file exists to give better error message
        if (!File.Exists(scriptPath))
        {
            return new JsonObject
            {
                ["success"] = false,
                ["error"] = $"Script not found at: {scriptPath}. Make sure PythonScript folder is deployed with your application."
            };
        }

        var start = new ProcessStartInfo
        {
            FileName = _pythonExecutable,
            Arguments = $"\"{scriptPath}\" {arguments}",
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            WorkingDirectory = Path.GetDirectoryName(scriptPath)
        };

        try
        {
            using var process = Process.Start(start);
            if (process == null)
            {
                return new JsonObject
                {
                    ["success"] = false,
                    ["error"] = $"Failed to start Python process. Python executable: {_pythonExecutable}"
                };
            }

            string output = process.StandardOutput.ReadToEnd();
            string error = process.StandardError.ReadToEnd();

            process.WaitForExit(10000); // Wait up to 10 seconds

            if (process.ExitCode != 0 || !string.IsNullOrWhiteSpace(error))
            {
                return new JsonObject
                {
                    ["success"] = false,
                    ["error"] = error,
                    ["exitCode"] = process.ExitCode,
                    ["hint"] = "Make sure Python and required packages (zkpy) are installed. Run: pip install zkpy"
                };
            }

            if (string.IsNullOrWhiteSpace(output))
            {
                return new JsonObject
                {
                    ["success"] = false,
                    ["error"] = "Python script produced no output"
                };
            }

            try
            {
                return JsonNode.Parse(output)!.AsObject();
            }
            catch (System.Text.Json.JsonException)
            {
                return new JsonObject
                {
                    ["success"] = false,
                    ["error"] = $"Invalid JSON output from script: {output}"
                };
            }
        }
        catch (Exception ex)
        {
            return new JsonObject
            {
                ["success"] = false,
                ["error"] = $"Exception running Python script: {ex.Message}",
                ["pythonExecutable"] = _pythonExecutable
            };
        }
    }
}
