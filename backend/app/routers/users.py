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
