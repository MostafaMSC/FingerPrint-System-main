import sys
import io
import json
from datetime import datetime, timedelta
from zk import ZK, const

# لضمان طباعة UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

if len(sys.argv) < 2:
    print(json.dumps({"success": False, "error": "Device IP argument is required"}, ensure_ascii=False))
    sys.exit(1)

device_ip = sys.argv[1]
device_port = 4370

def get_check_status(punch):
    mapping = {
        0: "Check In",
        1: "Check Out",
        2: "Break Out",
        3: "Break In",
        4: "Overtime In",
        5: "Overtime Out"
    }
    return mapping.get(punch, f"Unknown ({punch})")

try:
    zk = ZK(device_ip, port=device_port, timeout=5)
    conn = zk.connect()

    # ----------------------------
    # Get all users first
    # ----------------------------
    users = conn.get_users()
    users_dict = {
        u.user_id: {
            "Name": u.name,
            "Card": getattr(u, "card", None),
            "Role": getattr(u, "role", None),
            "Password": getattr(u, "password", None)
        }
        for u in users
    }

    # ----------------------------
    # Get attendance logs
    # ----------------------------
    logs = conn.get_attendance()
    logs.reverse()

    thirty_days_ago = datetime.now() - timedelta(days=30)

    logs_list = []
    for log in logs:
        log_time = log.timestamp
        if log_time < thirty_days_ago:
            continue

        punch_type = getattr(log, "punch", None)
        check_status = get_check_status(punch_type)

        user = users_dict.get(log.user_id, {})

        logs_list.append({
            "UserID": log.user_id,
            "Name": user.get("Name", "Unknown"),
            "Card": user.get("Card", None),
            "Role": user.get("Role", None),
            "Time": str(log.timestamp),
            "PunchType": punch_type,
            "CheckStatus": check_status
        })

    print(json.dumps({
        "success": True,
        "count": len(logs_list),
        "data": logs_list
    }, ensure_ascii=False))

    conn.disconnect()

except Exception as e:
    print(json.dumps({
        "success": False,
        "error": str(e)
    }, ensure_ascii=False))
