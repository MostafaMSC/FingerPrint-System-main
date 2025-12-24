# Python Integration Deployment Guide

## Overview
This application integrates Python scripts with a .NET backend to interact with ZKTeco fingerprint devices. This guide explains how to properly deploy the system in production.

## Production Deployment Steps

### 1. **Ensure Python is Installed on Production Server**

Your production server must have Python 3.7+ installed.

**For Windows:**
```powershell
# Download and install Python from https://www.python.org/downloads/
# During installation, make sure to:
# ✓ Check "Add Python to PATH"
# ✓ Check "Install pip"

# Verify installation
python --version
pip --version
```

**For Linux:**
```bash
sudo apt-get update
sudo apt-get install python3 python3-pip
python3 --version
pip3 --version
```

### 2. **Install Python Dependencies**

Navigate to the PythonScript folder and install required packages:

```bash
cd /path/to/published/PythonScript
pip install -r requirements.txt

# Or if using python3 on Linux
pip3 install -r requirements.txt
```

**Required Package:**
- `zkpy` - ZKTeco biometric device library

### 3. **Publish the Application**

Ensure the .NET project is configured correctly. The project file now includes:
```xml
<ItemGroup>
  <None Update="PythonScript/**" CopyToPublishDirectory="PreserveNewest" />
</ItemGroup>
```

This automatically copies all Python scripts to the publish output.

**Publish command:**
```bash
dotnet publish -c Release -o ./publish
```

The published output will include:
- ✓ Backend binaries
- ✓ PythonScript folder with all .py files
- ✓ Configuration files

### 4. **Set Environment Variable (Optional but Recommended)**

If Python is not in system PATH, set the `PYTHON_PATH` environment variable:

**Windows:**
```powershell
# Via PowerShell (as Administrator)
[Environment]::SetEnvironmentVariable("PYTHON_PATH", "C:\Python311\python.exe", "Machine")

# Verify
$env:PYTHON_PATH
```

**Linux:**
```bash
export PYTHON_PATH=/usr/bin/python3
# Make permanent by adding to ~/.bashrc or /etc/environment
echo 'export PYTHON_PATH=/usr/bin/python3' >> ~/.bashrc
source ~/.bashrc
```

### 5. **Directory Structure After Publishing**

```
publish/
├── FingerPrint.dll
├── FingerPrint.exe (Windows only)
├── appsettings.json
├── appsettings.Production.json
└── PythonScript/
    ├── read_zk.py
    ├── AddNewUserToDevice.py
    ├── edit_user.py
    ├── delete_user.py
    ├── get_users.py
    ├── requirements.txt
    └── zk/
```

### 6. **Troubleshooting**

**Error: "Script not found"**
- Ensure PythonScript folder is in the publish directory
- Check file paths in error message
- Run: `ls PythonScript/` (Linux) or `dir PythonScript\` (Windows)

**Error: "Failed to start python process"**
- Python not installed or not in PATH
- Set `PYTHON_PATH` environment variable
- Test: `python --version` in command prompt

**Error: "Invalid JSON output from script" or module import errors**
- Install required packages: `pip install zkpy`
- Check network connectivity to ZKTeco device
- Verify device IP address and port (default 4370)
- Check device logs for connection issues

**Error: "pip install zkpy" fails**
- Windows: Install Visual C++ Build Tools (required by zkpy)
- Linux: Install `python3-dev` package
- May need to update pip: `pip install --upgrade pip`

### 7. **Running the Application in Production**

**Windows (IIS):**
1. Create IIS application pool (recommended: .NET 8.0)
2. Deploy published files to IIS application directory
3. Ensure Application Pool identity has access to PythonScript folder
4. Set `PYTHON_PATH` in web.config:
   ```xml
   <system.webServer>
     <aspNetCore>
       <environmentVariables>
         <environmentVariable name="PYTHON_PATH" value="C:\Python311\python.exe" />
       </environmentVariables>
     </aspNetCore>
   </system.webServer>
   ```

**Linux (Systemd):**
1. Create systemd service file:
   ```ini
   [Service]
   Type=notify
   ExecStart=/usr/bin/dotnet /path/to/FingerPrint.dll
   WorkingDirectory=/path/to/publish
   Environment=PYTHON_PATH=/usr/bin/python3
   Restart=always
   ```

2. Start service:
   ```bash
   sudo systemctl start fingerprint
   sudo systemctl status fingerprint
   ```

### 8. **Python Script Execution Details**

The application automatically:
- Detects Python executable from PATH or `PYTHON_PATH` environment variable
- Executes scripts with proper UTF-8 encoding
- Captures and returns JSON output
- Handles errors with detailed messages

**Supported Python installations:**
- python, python3, python.exe, python3.exe
- C:\Python311\python.exe, C:\Python310\python.exe, etc.
- /usr/bin/python3, /usr/local/bin/python3

### 9. **Performance Considerations**

- Python script execution is synchronous (blocks until completion)
- Default timeout: 10 seconds per script execution
- For large device operations, may need timeout adjustment in PythonService.cs
- Consider device network connectivity and response times

### 10. **Security Notes**

- Keep PythonScript folder permissions restricted (no public access)
- Python scripts run with same privileges as application pool/service
- ZKTeco device IP addresses should be validated before execution
- Consider firewall rules for device communication (port 4370)

## Testing the Deployment

Test the Python integration after deployment:

1. **Via API Endpoint:**
   ```bash
   curl -X POST http://localhost:5000/api/zk/get-users \
     -H "Content-Type: application/json" \
     -d '{"deviceIp":"192.168.1.100"}'
   ```

2. **Via Application Logs:**
   - Check detailed error messages in API response
   - Python script errors will include helpful hints
   - Look for "hint" field in error responses

## Support

If you encounter issues:
1. Check error message in API response (includes Python executable path)
2. Verify Python and zkpy are installed: `pip list | grep zkpy`
3. Test device connectivity: `ping <device-ip>`
4. Check firewall rules for port 4370
5. Review application logs for detailed error context
