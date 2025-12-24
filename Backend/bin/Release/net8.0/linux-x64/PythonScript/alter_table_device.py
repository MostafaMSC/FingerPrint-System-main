import psycopg2

try:
    conn = psycopg2.connect("host=localhost port=5432 dbname=FingerPrintDB user=postgres password=postgres")
    cur = conn.cursor()
    
    # 1. Add DeviceIp column
    try:
        cur.execute("ALTER TABLE \"UserInfos\" ADD COLUMN IF NOT EXISTS \"DeviceIp\" text;")
        print("Added DeviceIp column")
    except Exception as e:
        print(f"Error adding DeviceIp: {e}")
        conn.rollback()

    # 2. Update existing records to have a default DeviceIp (required for PK)
    # Using a placeholder or a common IP. Let's use '192.168.150.233' as a default legacy value.
    try:
        cur.execute("UPDATE \"UserInfos\" SET \"DeviceIp\" = '192.168.150.233' WHERE \"DeviceIp\" IS NULL;")
        print("Updated existing records with default DeviceIp")
    except Exception as e:
        print(f"Error updating records: {e}")
        conn.rollback()

    # 3. Drop old Primary Key (UserID)
    try:
        # We need to find the constraint name first usually, but let's try generic DROP CONSTRAINT if we knew the name.
        # Postgres usually names it "UserInfos_pkey".
        cur.execute("ALTER TABLE \"UserInfos\" DROP CONSTRAINT IF EXISTS \"UserInfos_pkey\";")
        print("Dropped old Primary Key")
    except Exception as e:
        print(f"Error dropping PK: {e}")
        conn.rollback()

    # 4. Create new Composite Primary Key
    try:
        cur.execute("ALTER TABLE \"UserInfos\" ADD PRIMARY KEY (\"UserID\", \"DeviceIp\");")
        print("Added new Composite Primary Key")
    except Exception as e:
        print(f"Error adding new PK: {e}")
        conn.rollback()

    conn.commit()
    print("Database schema updated successfully")
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
