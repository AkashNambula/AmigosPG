from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    booking_start_date = Column(DateTime, nullable=False)
    duration = Column(String, nullable=False)  # "1 Month", "2 Months", "3 Months", "5 Months", "Custom"
    custom_days = Column(Integer, nullable=True)
    luggage_bags_count = Column(Integer, default=0)
    additional_notes = Column(String, nullable=True)
    status = Column(String, default="PENDING")  # "PENDING", "APPROVED", "REJECTED"
    terms_accepted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="bookings")
    user = relationship("User", back_populates="bookings")
    room = relationship("Room", back_populates="bookings")
    documents = relationship("BookingDocument", back_populates="booking", cascade="all, delete-orphan")

class BookingDocument(Base):
    __tablename__ = "booking_documents"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    document_type = Column(String, nullable=False)  # "aadhaar_id" or "user_photo"
    file_path = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)

    # Relationships
    booking = relationship("Booking", back_populates="documents")
