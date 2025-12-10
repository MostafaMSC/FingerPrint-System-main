import sys
import io
import json
from zk import ZK, const

# لضمان طباعة UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# python add_user.py 172.16.1.40 "Mostafa"
device_ip = sys.argv[1]
user_name = sys.argv[2]

device_port = 4370

try:
    zk = ZK(device_ip, port=device_port, timeout=5)
    conn = zk.connect()

    # جلب كل المستخدمين
    existing_users = conn.get_users()

    # فحص إذا كان الاسم موجود مسبقاً
    for u in existing_users:
        if u.name.strip().lower() == user_name.strip().lower():
            print(json.dumps({
                "success": False,
                "error": "User already exists",
                "existing_user": {
                    "UserID": u.user_id,
                    "Name": u.name
                }
            }, ensure_ascii=False))
            conn.disconnect()
            sys.exit(0)

    # تعطيل الجهاز أثناء الإضافة
    conn.disable_device()

    # توليد UserID جديد
    if len(existing_users) == 0:
        new_user_id = 1
    else:
        max_id = max(int(u.user_id) for u in existing_users)
        new_user_id = max_id + 1

    # إضافة المستخدم بدون باسورد ولا كارت
    conn.set_user(
        uid=new_user_id,
        name=user_name,
        privilege=const.USER_DEFAULT,
        password="",
        card=0
    )

    conn.enable_device()

    print(json.dumps({
        "success": True,
        "message": "User added successfully",
        "generated_user_id": new_user_id,
        "data": {
            "Name": user_name
        }
    }, ensure_ascii=False))

    conn.disconnect()

except Exception as e:
    print(json.dumps({
        "success": False,
        "error": str(e)
    }, ensure_ascii=False))
