using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Text.Json.Nodes;

public class PythonService
{
    // قراءة logs من جهاز البصمة
    public JsonObject RunPython(string deviceIp)
    {
        return RunPythonScript("read_zk.py", $"{deviceIp}");
    }

    // إضافة مستخدم جديد
    public JsonObject RunPythonAddUser(string deviceIp, string userName)
    {
        return RunPythonScript("AddNewUserToDevice.py", $"{deviceIp} \"{userName}\"");
    }

    // تعديل مستخدم
    public JsonObject RunPythonEditUser(string deviceIp, string userId, string newName)
    {
        return RunPythonScript("edit_user.py", $"{deviceIp} {userId} \"{newName}\"");
    }

    // حذف مستخدم
    public JsonObject RunPythonDeleteUser(string deviceIp, string userId)
    {
        return RunPythonScript("delete_user.py", $"{deviceIp} {userId}");
    }

    // جلب كل المستخدمين من الجهاز
    public JsonObject RunPythonGetUsers(string deviceIp)
    {
        // We can reuse a script or create a new one. 
        // `read_zk.py` fetches logs. We need a script to fetch users.
        // Let's assume we create `get_users.py` or modify `read_zk.py`?
        // Actually `AddNewUserToDevice.py` had code to get users.
        // Let's create `get_users.py`.
        return RunPythonScript("get_users.py", $"{deviceIp}");
    }

    // الدالة العامة لتشغيل أي سكربت
    private JsonObject RunPythonScript(string scriptName, string arguments)
    {
        var start = new ProcessStartInfo
        {
            FileName = "python",
            Arguments = $"{scriptName} {arguments}",
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };

        using var process = Process.Start(start);

        string output = process.StandardOutput.ReadToEnd();
        string error = process.StandardError.ReadToEnd();

        process.WaitForExit();

        if (!string.IsNullOrWhiteSpace(error))
        {
            return new JsonObject
            {
                ["success"] = false,
                ["error"] = error
            };
        }

        return JsonNode.Parse(output)!.AsObject();
    }
}
