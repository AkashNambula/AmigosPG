import sqlite3

conn = sqlite3.connect("amigos_pg.db")
cursor = conn.cursor()

try:
    cursor.execute("PRAGMA table_info(payment_settings)")
    print("payment_settings columns:")
    for row in cursor.fetchall():
        print(row)
except Exception as e:
    print(f"Error reading payment_settings: {e}")

try:
    cursor.execute("SELECT * FROM payment_settings")
    print("payment_settings rows:")
    for row in cursor.fetchall():
        print(row)
except Exception as e:
    print(f"Error reading rows: {e}")

conn.close()
