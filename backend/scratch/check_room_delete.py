from app.core.database import SessionLocal
from app.models.room import Room
from app.models.booking import Booking
from sqlalchemy.exc import IntegrityError
import sys

db = SessionLocal()
room_num = "R-1786614937"
room = db.query(Room).filter(Room.room_number == room_num).first()

if not room:
    print(f"Room {room_num} not found in database.")
    # Print list of all rooms
    all_rooms = db.query(Room).all()
    print("All rooms:")
    for r in all_rooms:
        print(f"- {r.id}: {r.room_number} (beds: {r.available_beds}/{r.total_capacity})")
    sys.exit(0)

print(f"Found Room: {room.id} - {room.room_number}")

# Check related bookings
bookings = db.query(Booking).filter(Booking.room_id == room.id).all()
print(f"Bookings count: {len(bookings)}")
for b in bookings:
    print(f"- Booking {b.id}: user_id {b.user_id}, status {b.status}")

# Try simulated deletion
try:
    print("Starting simulated deletion...")
    db.delete(room)
    db.commit()
    print("Simulated deletion succeeded!")
except Exception as e:
    print("Simulated deletion failed!")
    print("Error class:", e.__class__.__name__)
    print("Error string:", str(e))
    db.rollback()
finally:
    db.close()
