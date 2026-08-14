import sqlite3

conn = sqlite3.connect("amigos_pg.db")
cursor = conn.cursor()

try:
    cursor.execute("SELECT * FROM bookings WHERE id = 7")
    print("Booking 7 row:")
    print(cursor.fetchone())
except Exception as e:
    print(f"Error: {e}")

try:
    cursor.execute("SELECT * FROM rooms WHERE id = 7")
    print("Room with ID 7:")
    print(cursor.fetchone())
except Exception as e:
    print(f"Error: {e}")

try:
    cursor.execute("SELECT * FROM users WHERE id = 7")
    print("User with ID 7:")
    print(cursor.fetchone())
except Exception as e:
    print(f"Error: {e}")

conn.close()
