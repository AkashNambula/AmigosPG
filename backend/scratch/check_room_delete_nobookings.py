from app.core.database import SessionLocal
from app.models.room import Room, RoomFacility, RoomImage
from app.models.booking import Booking

db = SessionLocal()

# 1. Create a dummy room
dummy_room = Room(
    floor=1,
    room_number="TEMP-101",
    total_capacity=2,
    available_beds=2,
    occupied_beds=0,
    sharing_type="2 Sharing",
    monthly_price=5000.0,
    security_deposit=3000.0,
    availability_status="VACANCY"
)
db.add(dummy_room)
db.commit()
db.refresh(dummy_room)

print(f"Created temporary Room ID: {dummy_room.id}")

# 2. Add facilities and images
db.add(RoomFacility(room_id=dummy_room.id, facility_name="AC"))
db.add(RoomImage(room_id=dummy_room.id, image_path="/uploads/rooms/temp.png"))
db.commit()
db.refresh(dummy_room)

print(f"Added facilities & images. Facilities count: {len(dummy_room.facilities)}")

# 3. Try to delete the room
try:
    print("Deleting room...")
    db.delete(dummy_room)
    db.commit()
    print("Deletion succeeded without bookings!")
except Exception as e:
    print("Deletion failed!")
    print("Error:", str(e))
    db.rollback()
finally:
    db.close()
