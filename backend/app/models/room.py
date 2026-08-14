from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    floor = Column(Integer, nullable=False, index=True)
    room_number = Column(String, unique=True, index=True, nullable=False)
    total_capacity = Column(Integer, nullable=False)
    available_beds = Column(Integer, nullable=False)
    occupied_beds = Column(Integer, default=0, nullable=False)
    sharing_type = Column(String, nullable=False)  # "1 Sharing", "2 Sharing", etc.
    monthly_price = Column(Float, nullable=False)
    security_deposit = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    availability_status = Column(String, default="available")  # "available", "full", "maintenance"
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    images = relationship("RoomImage", back_populates="room", cascade="all, delete-orphan")
    facilities = relationship("RoomFacility", back_populates="room", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="room")

class RoomImage(Base):
    __tablename__ = "room_images"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    image_path = Column(String, nullable=False)

    # Relationships
    room = relationship("Room", back_populates="images")

class RoomFacility(Base):
    __tablename__ = "room_facilities"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    facility_name = Column(String, nullable=False)

    # Relationships
    room = relationship("Room", back_populates="facilities")
