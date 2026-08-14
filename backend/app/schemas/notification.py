from pydantic import BaseModel
from datetime import datetime

from typing import Optional

class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    notification_type: str
    is_read: bool
    reference_id: Optional[int] = None
    target_route: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AnnouncementCreate(BaseModel):
    title: str
    content: str

class AnnouncementOut(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
