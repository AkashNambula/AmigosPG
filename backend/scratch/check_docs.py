import sqlite3

conn = sqlite3.connect("amigos_pg.db")
cursor = conn.cursor()

try:
    cursor.execute("PRAGMA table_info(booking_documents)")
    print("booking_documents columns:")
    for row in cursor.fetchall():
        print(row)
except Exception as e:
    print(f"Error: {e}")

try:
    cursor.execute("SELECT * FROM booking_documents")
    print("booking_documents rows:")
    for row in cursor.fetchall():
        print(row)
except Exception as e:
    print(f"Error rows: {e}")

conn.close()
