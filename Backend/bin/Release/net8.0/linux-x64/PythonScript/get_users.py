import sys
import io
import json
from zk import ZK, const

# Ensure UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Usage: python get_users.py <device_ip>
if len(sys.argv) < 2:
    print(json.dumps({"success": False, "error": "Missing arguments"}, ensure_ascii=False))
    sys.exit(1)

device_ip = sys.argv[1]
device_port = 4370

try:
    zk = ZK(device_ip, port=device_port, timeout=5)
    conn = zk.connect()

    users = conn.get_users()
    
    users_list = []
    for u in users:
        users_list.append({
            "UserID": u.user_id,
            "Name": u.name,
            "Card": u.card if hasattr(u, 'card') else None,
            "Role": u.role if hasattr(u, 'role') else None,
            "Password": u.password if hasattr(u, 'password') else None
        })

    print(json.dumps({
        "success": True,
        "count": len(users_list),
        "users": users_list
    }, ensure_ascii=False))

    conn.disconnect()

except Exception as e:
    print(json.dumps({
        "success": False,
        "error": str(e)
    }, ensure_ascii=False))
