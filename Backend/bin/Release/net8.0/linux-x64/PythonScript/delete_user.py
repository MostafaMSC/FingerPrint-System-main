import sys
import io
import json
from zk import ZK, const

# Ensure UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Usage: python delete_user.py <device_ip> <user_id>
if len(sys.argv) < 3:
    print(json.dumps({"success": False, "error": "Missing arguments"}, ensure_ascii=False))
    sys.exit(1)

device_ip = sys.argv[1]
user_id = sys.argv[2]

device_port = 4370

try:
    zk = ZK(device_ip, port=device_port, timeout=5)
    conn = zk.connect()

    # Disable device during operation
    conn.disable_device()

    # Delete user
    conn.delete_user(uid=int(user_id), user_id=user_id)

    conn.enable_device()

    print(json.dumps({
        "success": True,
        "message": "User deleted successfully",
        "data": {
            "UserID": user_id
        }
    }, ensure_ascii=False))

    conn.disconnect()

except Exception as e:
    print(json.dumps({
        "success": False,
        "error": str(e)
    }, ensure_ascii=False))
