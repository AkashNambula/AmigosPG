from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
from datetime import datetime
from app.core.database import get_db
from app.core.config import settings
from app.models.complaint import Complaint, ComplaintUpdate
from app.models.notification import Notification
from app.models.audit import AuditLog
from app.schemas.complaint import ComplaintOut, ComplaintAdminUpdate
from app.dependencies.auth import get_current_active_user, get_current_admin, require_feature

router = APIRouter(prefix="/complaints", tags=["Complaints"], dependencies=[Depends(require_feature("complaints"))])

# File validation
ALLOWED_IMG_TYPES = ["image/jpeg", "image/png", "image/jpg"]
MAX_IMG_SIZE = 5 * 1024 * 1024  # 5MB

def validate_img(file: UploadFile):
    if file.content_type not in ALLOWED_IMG_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image format. Allowed: JPG, JPEG, PNG."
        )

@router.post("/", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
async def create_complaint(
    category: str = Form(...),
    subject: str = Form(...),
    description: str = Form(...),
    priority: str = Form("LOW"),
    file: Optional[UploadFile] = File(None),
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    attachment_path = None
    
    if file and file.filename != "":
        validate_img(file)
        
        contents = await file.read()
        if len(contents) > MAX_IMG_SIZE:
             raise HTTPException(
                 status_code=status.HTTP_400_BAD_REQUEST,
                 detail="Complaint attachment size exceeds maximum limit of 5MB."
             )
             
        # Save attachment locally (can be served via static file mount since it is just room maintenance/complaint details)
        complaints_dir = os.path.join(settings.UPLOAD_DIR, "complaints")
        os.makedirs(complaints_dir, exist_ok=True)
        
        file_ext = os.path.splitext(file.filename)[1]
        filename = f"complaint_{current_user.id}_{uuid.uuid4().hex}{file_ext}"
        filepath = os.path.join(complaints_dir, filename)
        
        with open(filepath, "wb") as f:
            f.write(contents)
            
        attachment_path = f"/uploads/complaints/{filename}"

    complaint = Complaint(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        category=category,
        subject=subject,
        description=description,
        priority=priority,
        status="OPEN",
        attachment_path=attachment_path
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    
    # Notify admin in same tenant
    from app.models.user import User
    admin_query = db.query(User).filter(User.role == "admin")
    if current_user.tenant_id:
        admin_query = admin_query.filter(User.tenant_id == current_user.tenant_id)
    admins = admin_query.all()
    for admin_user in admins:
         db.add(Notification(
             tenant_id=current_user.tenant_id,
             user_id=admin_user.id,
             title="New Complaint Raised",
             message=f"{current_user.first_name} raised a {priority} priority complaint regarding {category}.",
             notification_type="complaint",
             is_read=False,
             reference_id=complaint.id,
             target_route="/admin/complaints"
         ))
    db.commit()
    db.refresh(complaint)
    
    return complaint

@router.get("/", response_model=List[ComplaintOut])
def list_complaints(
    status_filter: Optional[str] = None,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Complaint)
    if current_user.tenant_id:
        query = query.filter(Complaint.tenant_id == current_user.tenant_id)
        
    if current_user.role == "tenant":
        query = query.filter(Complaint.user_id == current_user.id)
    else:
        if status_filter:
            query = query.filter(Complaint.status == status_filter)
            
    return query.order_by(Complaint.created_at.desc()).all()

@router.put("/{complaint_id}/status", response_model=ComplaintOut)
def update_complaint_status(
    complaint_id: int,
    admin_update: ComplaintAdminUpdate,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found."
        )
        
    old_status = complaint.status
    new_status = admin_update.status.upper()
    
    if new_status not in ["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Allowed: OPEN, IN_PROGRESS, RESOLVED, REJECTED."
        )
        
    complaint.status = new_status
    
    # Record update log/comment
    update_log = ComplaintUpdate(
        complaint_id=complaint.id,
        admin_id=admin.id,
        status_change=f"{old_status} -> {new_status}",
        response_message=admin_update.response_message
    )
    db.add(update_log)
    
    # Notify tenant
    notify = Notification(
        user_id=complaint.user_id,
        title=f"Complaint Status Updated",
        message=f"Your complaint on '{complaint.subject}' status changed to {new_status}. Response: {admin_update.response_message}",
        notification_type="complaint",
        is_read=False,
        reference_id=complaint.id,
        target_route="/dashboard/complaints"
    )
    db.add(notify)
    
    # Audit log
    audit = AuditLog(
        user_id=admin.id,
        action="update_complaint_status",
        entity_name="complaints",
        entity_id=complaint.id,
        details=f"Admin updated complaint status to {new_status}. Reply: {admin_update.response_message}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    
    db.commit()
    db.refresh(complaint)
    
    return complaint
