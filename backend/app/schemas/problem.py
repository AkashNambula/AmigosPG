from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.user import UserOut

class PersonProblemReportBase(BaseModel):
    target_person_name: str
    target_room_number: str
    category: str  # "Noise", "Misbehavior", "Roommate issue", "Cleanliness", etc.
    description: str

class PersonProblemReportCreate(PersonProblemReportBase):
    pass

class PersonProblemReportOut(PersonProblemReportBase):
    id: int
    reporter_id: int
    report_date: datetime
    attachment_path: Optional[str] = None
    reporter: Optional[UserOut] = None

    class Config:
        from_attributes = True
