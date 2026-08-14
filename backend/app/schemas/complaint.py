from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.schemas.user import UserOut

class ComplaintUpdateOut(BaseModel):
    id: int
    admin_id: int
    status_change: str
    response_message: str
    created_at: datetime
    class Config:
        from_attributes = True

class ComplaintBase(BaseModel):
    category: str
    subject: str
    description: str
    priority: str

class ComplaintCreate(ComplaintBase):
    pass

class ComplaintAdminUpdate(BaseModel):
    status: str
    response_message: str

class ComplaintOut(ComplaintBase):
    id: int
    user_id: int
    status: str
    attachment_path: Optional[str] = None
    created_at: datetime
    user: Optional[UserOut] = None
    updates: List[ComplaintUpdateOut] = []

    class Config:
        from_attributes = True
