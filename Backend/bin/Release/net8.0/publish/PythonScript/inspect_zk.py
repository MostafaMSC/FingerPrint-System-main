import sys
from zk import ZK

print("Inspecting ZK object methods:")
print(dir(ZK))

try:
    zk = ZK('172.16.1.40', port=4370, timeout=5)
    print("\nInspecting ZK instance methods:")
    print(dir(zk))
    
    conn = zk.connect()
    print("\nInspecting ZK connection methods:")
    print(dir(conn))
    conn.disconnect()
except Exception as e:
    print(f"\nError connecting: {e}")
