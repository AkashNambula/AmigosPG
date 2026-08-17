from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import uuid
from datetime import datetime
from app.core.database import get_db
from app.core.config import settings
from app.models.room import Room, RoomImage, RoomFacility
from app.models.audit import AuditLog
from app.schemas.room import RoomOut, RoomCreate, RoomUpdate
from app.dependencies.auth import get_current_active_user, get_current_admin

router = APIRouter(prefix="/rooms", tags=["Rooms"])

# Validate file type and size helper
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB

def validate_image(file: UploadFile):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Allowed: JPG, JPEG, PNG, WEBP."
        )
    # Size check is handled during read

@router.get("/", response_model=List[RoomOut])
def get_rooms(
    floor: Optional[int] = None,
    sharing_type: Optional[str] = None,
    availability_status: Optional[str] = None,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Room)
    
    if current_user.role == "tenant":
        # Tenants should only see available or full rooms, not maintenance rooms
        query = query.filter(Room.availability_status.in_(["available", "full", "VACANCY", "OCCUPIED"]))
    else:
        # Admins can filter by availability_status (including maintenance)
        if availability_status:
            query = query.filter(Room.availability_status == availability_status)
            
    if floor is not None:
        query = query.filter(Room.floor == floor)
    if sharing_type:
        query = query.filter(Room.sharing_type == sharing_type)
        
    return query.order_by(Room.floor.asc(), Room.room_number.asc()).all()

from pydantic import BaseModel

class RoomAvailabilityStats(BaseModel):
    total_rooms: int
    available_rooms: int
    full_rooms: int
    total_available_beds: int
    total_occupied_beds: int

class RoomAvailabilityResponse(BaseModel):
    stats: RoomAvailabilityStats
    rooms: List[RoomOut]

@router.get("/availability", response_model=RoomAvailabilityResponse)
def get_room_availability(
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "tenant":
        all_rooms = db.query(Room).filter(Room.availability_status.in_(["available", "full", "VACANCY", "OCCUPIED"])).all()
    else:
        all_rooms = db.query(Room).all()
        
    total_rooms = len(all_rooms)
    available_rooms = sum(1 for r in all_rooms if r.available_beds > 0 and r.availability_status in ["available", "VACANCY"])
    full_rooms = sum(1 for r in all_rooms if r.available_beds == 0 or r.availability_status in ["full", "OCCUPIED"])
    total_available_beds = sum(r.available_beds for r in all_rooms if r.availability_status in ["available", "VACANCY"])
    total_occupied_beds = sum(r.occupied_beds for r in all_rooms)
    
    return {
        "stats": {
            "total_rooms": total_rooms,
            "available_rooms": available_rooms,
            "full_rooms": full_rooms,
            "total_available_beds": total_available_beds,
            "total_occupied_beds": total_occupied_beds
        },
        "rooms": all_rooms
    }

@router.get("/{room_id}", response_model=RoomOut)
def get_room_by_id(
    room_id: int,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found."
        )
    if current_user.role == "tenant" and room.availability_status == "maintenance":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Room is currently under maintenance."
        )
    return room

@router.post("/", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
def create_room(
    room_in: RoomCreate,
    admin: User = Depends(get_current_admin), # We will import User locally or just use the dependent
    db: Session = Depends(get_db)
):
    # Check duplicate room number
    existing_room = db.query(Room).filter(Room.room_number == room_in.room_number).first()
    if existing_room:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room {room_in.room_number} already exists."
        )
        
    new_room = Room(
        floor=room_in.floor,
        room_number=room_in.room_number,
        total_capacity=room_in.total_capacity,
        available_beds=room_in.total_capacity,  # Initially all beds available
        occupied_beds=0,
        sharing_type=room_in.sharing_type,
        monthly_price=room_in.monthly_price,
        security_deposit=room_in.security_deposit,
        description=room_in.description,
        availability_status=room_in.availability_status or "VACANCY"
    )
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    
    # Add facilities
    for facility_name in room_in.facilities:
        facility = RoomFacility(room_id=new_room.id, facility_name=facility_name)
        db.add(facility)
        
    db.commit()
    db.refresh(new_room)
    
    # Audit log
    audit = AuditLog(
        user_id=admin.id,
        action="create_room",
        entity_name="rooms",
        entity_id=new_room.id,
        details=f"Admin created room: {new_room.room_number}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return new_room

@router.put("/{room_id}", response_model=RoomOut)
def update_room(
    room_id: int,
    room_update: RoomUpdate,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found."
        )
        
    # Check room number uniqueness if updated
    update_data = room_update.dict(exclude_unset=True)
    if "room_number" in update_data and update_data["room_number"] != room.room_number:
        dup = db.query(Room).filter(Room.room_number == update_data["room_number"]).first()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room {update_data['room_number']} already exists."
            )
            
    # Handle facilities update
    if "facilities" in update_data:
        new_facilities = update_data.pop("facilities")
        # Remove old facilities
        db.query(RoomFacility).filter(RoomFacility.room_id == room.id).delete()
        # Add new facilities
        for f_name in new_facilities:
            db.add(RoomFacility(room_id=room.id, facility_name=f_name))
            
    # If total_capacity changes and available_beds/occupied_beds are not specified, adjust available_beds
    if "total_capacity" in update_data:
        if "available_beds" not in update_data and "occupied_beds" not in update_data:
            cap_diff = update_data["total_capacity"] - room.total_capacity
            new_avail = room.available_beds + cap_diff
            if new_avail < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="New capacity cannot be less than current occupied beds."
                )
            room.available_beds = new_avail
        
    for field, value in update_data.items():
        setattr(room, field, value)
        
    # Check full status automatically if availability is set to available
    if room.availability_status == "available" and room.available_beds == 0:
        room.availability_status = "full"
        
    db.commit()
    db.refresh(room)
    
    # Audit log
    audit = AuditLog(
        user_id=admin.id,
        action="update_room",
        entity_name="rooms",
        entity_id=room.id,
        details=f"Admin updated room: {room.room_number}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return room

@router.delete("/{room_id}", status_code=status.HTTP_200_OK)
def delete_room(
    room_id: int,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found."
        )
        
    room_num = room.room_number
    db.delete(room)
    db.commit()
    
    # Audit log
    audit = AuditLog(
        user_id=admin.id,
        action="delete_room",
        entity_name="rooms",
        entity_id=room_id,
        details=f"Admin deleted room: {room_num}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return {"message": f"Room {room_num} deleted successfully."}

@router.post("/{room_id}/images", response_model=RoomOut)
async def upload_room_image(
    room_id: int,
    file: UploadFile = File(...),
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found."
        )
        
    validate_image(file)
    
    # Setup directory
    rooms_dir = os.path.join(settings.UPLOAD_DIR, "rooms")
    os.makedirs(rooms_dir, exist_ok=True)
    
    # Read file size
    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum limit of 5MB."
        )
        
    # Save file
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"room_{room.room_number}_{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(rooms_dir, filename)
    
    with open(file_path, "wb") as f:
        f.write(contents)
        
    # Store path in database (using relative URL style)
    relative_path = f"/uploads/rooms/{filename}"
    room_img = RoomImage(room_id=room.id, image_path=relative_path)
    db.add(room_img)
    db.commit()
    db.refresh(room)
    
    return room
