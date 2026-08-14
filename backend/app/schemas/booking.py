from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.schemas.user import UserOut
from app.schemas.room import RoomOut

class BookingDocumentOut(BaseModel):
    id: int
    document_type: str
    original_filename: str
    class Config:
        from_attributes = True

class BookingBase(BaseModel):
    room_id: int
    booking_start_date: datetime
    duration: str  # "1 Month", "2 Months", "3 Months", "5 Months", "Custom"
    custom_days: Optional[int] = None
    luggage_bags_count: int = 0
    additional_notes: Optional[str] = None
    terms_accepted: bool

class BookingCreate(BookingBase):
    pass

class BookingStatusUpdate(BaseModel):
    status: str  # "APPROVED" or "REJECTED"

class BookingOut(BaseModel):
    id: int
    user_id: int
    room_id: int
    booking_start_date: datetime
    duration: str
    custom_days: Optional[int]
    luggage_bags_count: int
    additional_notes: Optional[str]
    status: str
    terms_accepted: bool
    created_at: datetime
    user: Optional[UserOut] = None
    room: Optional[RoomOut] = None
    documents: List[BookingDocumentOut] = []

    class Config:
        from_attributes = True
