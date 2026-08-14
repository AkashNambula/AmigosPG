from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class RoomFacilityBase(BaseModel):
    facility_name: str

class RoomFacilityCreate(RoomFacilityBase):
    pass

class RoomFacilityOut(RoomFacilityBase):
    id: int
    class Config:
        from_attributes = True

class RoomImageBase(BaseModel):
    image_path: str

class RoomImageCreate(RoomImageBase):
    pass

class RoomImageOut(RoomImageBase):
    id: int
    class Config:
        from_attributes = True

class RoomBase(BaseModel):
    floor: int
    room_number: str
    total_capacity: int
    sharing_type: str
    monthly_price: float
    security_deposit: float
    description: Optional[str] = None

class RoomCreate(RoomBase):
    facilities: List[str] = []

class RoomUpdate(BaseModel):
    floor: Optional[int] = None
    room_number: Optional[str] = None
    total_capacity: Optional[int] = None
    available_beds: Optional[int] = None
    occupied_beds: Optional[int] = None
    sharing_type: Optional[str] = None
    monthly_price: Optional[float] = None
    security_deposit: Optional[float] = None
    description: Optional[str] = None
    availability_status: Optional[str] = None  # "available", "full", "maintenance"
    facilities: Optional[List[str]] = None

class RoomOut(RoomBase):
    id: int
    available_beds: int
    occupied_beds: int
    availability_status: str
    created_at: datetime
    images: List[RoomImageOut] = []
    facilities: List[RoomFacilityOut] = []

    class Config:
        from_attributes = True
