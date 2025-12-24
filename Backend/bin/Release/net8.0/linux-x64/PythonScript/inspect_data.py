import psycopg2

try:
    conn = psycopg2.connect("host=localhost port=5432 dbname=FingerPrintDB user=postgres password=postgres")
    cur = conn.cursor()

    print("--- UserInfo DeviceIp Distribution ---")
    cur.execute('SELECT "DeviceIp", COUNT(*) FROM "UserInfos" GROUP BY "DeviceIp"')
    rows = cur.fetchall()
    for row in rows:
        print(f"DeviceIp: {row[0]}, Count: {row[1]}")

    print("\n--- AttendanceLogs DeviceIP Distribution ---")
    cur.execute('SELECT "DeviceIP", COUNT(*) FROM "AttendanceLogs" GROUP BY "DeviceIP"')
    rows = cur.fetchall()
    for row in rows:
        print(f"DeviceIP: {row[0]}, Count: {row[1]}")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
