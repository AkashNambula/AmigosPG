from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.notification import Notification
from app.schemas.notification import NotificationOut
from app.dependencies.auth import get_current_active_user, require_feature

router = APIRouter(prefix="/notifications", tags=["Notifications"], dependencies=[Depends(require_feature("notifications"))])

@router.get("/", response_model=List[NotificationOut])
def get_my_notifications(
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()

@router.get("/unread-count")
def get_unread_count(
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return {"unread_count": count}

@router.put("/read-all", status_code=status.HTTP_200_OK)
def mark_all_read(
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read."}

@router.put("/{notification_id}/read", response_model=NotificationOut)
def mark_read_by_id(
    notification_id: int,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    notify = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notify:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found."
        )
        
    notify.is_read = True
    db.commit()
    db.refresh(notify)
    return notify

@router.put("/{notification_id}/unread", response_model=NotificationOut)
def mark_unread_by_id(
    notification_id: int,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    notify = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notify:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found."
        )
        
    notify.is_read = False
    db.commit()
    db.refresh(notify)
    return notify

@router.put("/{notification_id}/toggle-read", response_model=NotificationOut)
def toggle_read_by_id(
    notification_id: int,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    notify = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notify:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found."
        )
        
    notify.is_read = not notify.is_read
    db.commit()
    db.refresh(notify)
    return notify
