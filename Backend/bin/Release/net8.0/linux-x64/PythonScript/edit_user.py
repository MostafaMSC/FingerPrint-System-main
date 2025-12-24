import sys
import io
import json
from zk import ZK, const

# Ensure UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Usage: python edit_user.py <device_ip> <user_id> <new_name>
if len(sys.argv) < 4:
    print(json.dumps({"success": False, "error": "Missing arguments"}, ensure_ascii=False))
    sys.exit(1)

device_ip = sys.argv[1]
user_id = sys.argv[2]
new_name = sys.argv[3]

device_port = 4370

try:
    zk = ZK(device_ip, port=device_port, timeout=5)
    conn = zk.connect()

    # Disable device during operation
    conn.disable_device()

    # Get existing user to preserve other fields if needed, but set_user overwrites.
    # We assume we only want to update the name for now, preserving privilege/password/card if possible or resetting to defaults if not available easily without a full fetch.
    # To be safe and simple: We will fetch the user first.
    
    users = conn.get_users()
    target_user = next((u for u in users if u.user_id == user_id), None)

    if not target_user:
        print(json.dumps({"success": False, "error": "User not found"}, ensure_ascii=False))
        conn.enable_device()
        conn.disconnect()
        sys.exit(0)

    # Update user
    conn.set_user(
        uid=int(user_id),
        name=new_name,
        privilege=target_user.privilege,
        password=target_user.password,
        card=target_user.card,
        user_id=user_id 
    )

    conn.enable_device()

    print(json.dumps({
        "success": True,
        "message": "User updated successfully",
        "data": {
            "UserID": user_id,
            "Name": new_name
        }
    }, ensure_ascii=False))

    conn.disconnect()

except Exception as e:
    print(json.dumps({
        "success": False,
        "error": str(e)
    }, ensure_ascii=False))
