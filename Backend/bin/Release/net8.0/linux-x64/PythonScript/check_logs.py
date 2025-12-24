import psycopg2

try:
    conn = psycopg2.connect("host=localhost port=5432 dbname=FingerPrintDB user=postgres password=postgres")
    cur = conn.cursor()

    print("--- First 10 AttendanceLogs ---")
    cur.execute('SELECT "UserID", "DeviceIP", "Time" FROM "AttendanceLogs" LIMIT 10')
    rows = cur.fetchall()
    for row in rows:
        print(f"UserID: {row[0]}, DeviceIP: {row[1]}, Time: {row[2]}")

    print("\n--- DeviceIP Counts ---")
    cur.execute('SELECT "DeviceIP", COUNT(*) FROM "AttendanceLogs" GROUP BY "DeviceIP"')
    rows = cur.fetchall()
    for row in rows:
        print(f"DeviceIP: {row[0]}, Count: {row[1]}")

    conn.close()
except Exception as e:
    print(f"Error: {e}")
