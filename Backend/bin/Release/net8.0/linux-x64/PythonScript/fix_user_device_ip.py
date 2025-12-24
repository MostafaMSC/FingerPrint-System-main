import psycopg2

try:
    conn = psycopg2.connect("host=localhost port=5432 dbname=FingerPrintDB user=postgres password=postgres")
    cur = conn.cursor()

    # Update UserInfos to match the logs IP (172.16.1.40)
    # We only update those that were set to the 'wrong' default (192.168.150.233)
    # assuming they were the ones migrated.
    
    print("Updating UserInfos DeviceIp from 192.168.150.233 to 172.16.1.40...")
    
    cur.execute("""
        UPDATE "UserInfos" 
        SET "DeviceIp" = '172.16.1.40' 
        WHERE "DeviceIp" = '192.168.150.233';
    """)
    
    print(f"Updated {cur.rowcount} rows.")
    
    conn.commit()
    conn.close()
    print("Success.")
except Exception as e:
    print(f"Error: {e}")
