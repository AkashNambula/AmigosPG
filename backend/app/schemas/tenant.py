from pydantic import BaseModel, EmailStr
from typing import Optional, Dict
from datetime import datetime

class TenantBase(BaseModel):
    name: str
    description: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    slug: Optional[str] = None

class TenantCreate(TenantBase):
    admin_first_name: str
    admin_last_name: str
    admin_email: EmailStr
    admin_phone: str
    admin_password: str

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    slug: Optional[str] = None
    is_active: Optional[bool] = None

class TenantFeaturesUpdate(BaseModel):
    features: Dict[str, bool]

class TenantFeaturesOut(BaseModel):
    tenant_id: int
    features: Dict[str, bool]

class PublicTenantOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class TenantOut(TenantBase):
    id: int
    slug: str
    logo_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    features: Optional[Dict[str, bool]] = None

    class Config:
        from_attributes = True
