from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.user import UserOut, UserUpdate
from app.dependencies.auth import get_current_active_user, get_current_admin

router = APIRouter(prefix="/users", tags=["Users"])

@router.put("/profile", response_model=UserOut)
def update_profile(
    user_update: UserUpdate, 
    current_user: User = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    # Update fields if provided
    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
        
    db.commit()
    db.refresh(current_user)
    
    # Audit log
    audit = AuditLog(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="update_profile",
        entity_name="users",
        entity_id=current_user.id,
        details="User updated profile details",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return current_user

@router.get("/", response_model=List[UserOut])
def list_users(
    role: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if admin.tenant_id:
        query = query.filter(User.tenant_id == admin.tenant_id)
    
    if role:
        query = query.filter(User.role == role)
    if status:
        query = query.filter(User.account_status == status)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.first_name.ilike(search_filter)) | 
            (User.last_name.ilike(search_filter)) | 
            (User.email.ilike(search_filter)) | 
            (User.phone.ilike(search_filter))
        )
        
    return query.order_by(User.created_at.desc()).all()

@router.put("/{user_id}/status", response_model=UserOut)
def update_user_status(
    user_id: int,
    account_status: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if account_status not in ["active", "pending", "inactive"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid account status value."
        )
        
    query = db.query(User).filter(User.id == user_id)
    if admin.tenant_id:
        query = query.filter(User.tenant_id == admin.tenant_id)
    user = query.first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
        
    user.account_status = account_status
    db.commit()
    db.refresh(user)
    
    # Audit log
    audit = AuditLog(
        tenant_id=admin.tenant_id,
        user_id=admin.id,
        action="update_user_status",
        entity_name="users",
        entity_id=user.id,
        details=f"Admin changed status of {user.email} to {account_status}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return user

from pydantic import BaseModel, Field
import re
from app.core.security import hash_password

class AdminUserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    account_status: Optional[str] = None
    new_password: Optional[str] = None

@router.put("/{user_id}/admin-update", response_model=UserOut)
def admin_update_user(
    user_id: int,
    user_in: AdminUserUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User).filter(User.id == user_id)
    if admin.tenant_id:
        query = query.filter(User.tenant_id == admin.tenant_id)
    target_user = query.first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    # 1. Update Names if provided
    if user_in.first_name is not None and user_in.first_name.strip():
        name_clean = user_in.first_name.strip()
        if not re.match(r"^[A-Za-z\s]+$", name_clean):
            raise HTTPException(status_code=400, detail="First name must contain only letters and spaces.")
        target_user.first_name = name_clean

    if user_in.last_name is not None and user_in.last_name.strip():
        name_clean = user_in.last_name.strip()
        if not re.match(r"^[A-Za-z\s]+$", name_clean):
            raise HTTPException(status_code=400, detail="Last name must contain only letters and spaces.")
        target_user.last_name = name_clean

    # 2. Update Email if provided
    if user_in.email is not None and user_in.email.strip():
        email_clean = user_in.email.strip().lower()
        if email_clean != target_user.email:
            existing = db.query(User).filter(User.email == email_clean, User.id != target_user.id).first()
            if existing:
                raise HTTPException(status_code=400, detail="A user with this email address already exists.")
            target_user.email = email_clean

    # 3. Update Phone if provided
    if user_in.phone is not None and user_in.phone.strip():
        clean_phone = re.sub(r"\D", "", user_in.phone.strip())
        if not re.match(r"^[6-9]\d{9}$", clean_phone):
            raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile number starting with 6-9.")
        target_user.phone = clean_phone

    # 4. Update Status if provided
    if user_in.account_status is not None:
        if user_in.account_status not in ["active", "pending", "inactive"]:
            raise HTTPException(status_code=400, detail="Invalid account status value.")
        target_user.account_status = user_in.account_status

    # 5. Reset Password if provided
    if user_in.new_password and user_in.new_password.strip():
        if len(user_in.new_password.strip()) < 6:
            raise HTTPException(status_code=400, detail="Password must contain at least 6 characters.")
        target_user.password_hash = hash_password(user_in.new_password.strip())

    db.commit()
    db.refresh(target_user)

    # Audit log
    audit = AuditLog(
        tenant_id=admin.tenant_id,
        user_id=admin.id,
        action="admin_update_user",
        entity_name="users",
        entity_id=target_user.id,
        details=f"Admin {admin.email} updated user {target_user.email}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return target_user
