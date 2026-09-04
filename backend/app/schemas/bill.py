from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.schemas.user import UserOut

class PaymentBase(BaseModel):
    amount_paid: float
    payment_method: str
    transaction_id: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class BillOutSimple(BaseModel):
    id: int
    user_id: int
    rent_amount: float
    electricity_amount: float
    food_amount: float
    maintenance_amount: float
    other_amount: float
    total_amount: float
    due_date: datetime
    status: str
    created_at: datetime
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True

class PaymentOut(PaymentBase):
    id: int
    bill_id: int
    payment_date: datetime
    status: str
    screenshot_path: Optional[str] = None
    submitted_at: datetime
    verified_at: Optional[datetime] = None
    verified_by: Optional[int] = None
    admin_notes: Optional[str] = None
    bill: Optional[BillOutSimple] = None

    class Config:
        from_attributes = True

class PaymentSettingsOut(BaseModel):
    id: int
    upi_id: Optional[str] = None
    qr_code_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PaymentSettingsUpdate(BaseModel):
    upi_id: Optional[str] = None

class BillBase(BaseModel):
    user_id: int
    booking_id: Optional[int] = None
    room_id: Optional[int] = None
    rent_amount: float = 0.0
    electricity_amount: float = 0.0
    food_amount: float = 0.0
    maintenance_amount: float = 0.0
    other_amount: float = 0.0
    due_date: datetime

class BillCreate(BillBase):
    pass

class BillUpdate(BaseModel):
    rent_amount: Optional[float] = None
    electricity_amount: Optional[float] = None
    food_amount: Optional[float] = None
    maintenance_amount: Optional[float] = None
    other_amount: Optional[float] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None

class BillOut(BaseModel):
    id: int
    user_id: int
    booking_id: Optional[int] = None
    room_id: Optional[int] = None
    rent_amount: float
    electricity_amount: float
    food_amount: float
    maintenance_amount: float
    other_amount: float
    total_amount: float
    due_date: datetime
    status: str
    created_at: datetime
    user: Optional[UserOut] = None
    payments: List[PaymentOut] = []

    class Config:
        from_attributes = True
