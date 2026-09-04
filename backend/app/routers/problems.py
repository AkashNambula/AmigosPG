from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
from datetime import datetime
from app.core.database import get_db
from app.core.config import settings
from app.models.problem import PersonProblemReport
from app.models.audit import AuditLog
from app.schemas.problem import PersonProblemReportOut
from app.dependencies.auth import get_current_active_user, get_current_admin, require_feature

router = APIRouter(prefix="/problems", tags=["Problems With Persons"], dependencies=[Depends(require_feature("problems_with_persons"))])

# File validation
ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def validate_doc(file: UploadFile):
    if file.content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Allowed: PDF, JPG, JPEG, PNG."
        )

@router.post("/", response_model=PersonProblemReportOut, status_code=status.HTTP_201_CREATED)
async def create_problem_report(
    target_person_name: str = Form(...),
    target_room_number: str = Form(...),
    category: str = Form(...),
    description: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    attachment_path = None
    
    if file and file.filename != "":
        validate_doc(file)
        
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Attachment file size exceeds maximum limit of 5MB."
            )
            
        secure_problems_dir = os.path.join(settings.UPLOAD_DIR, "problems")
        os.makedirs(secure_problems_dir, exist_ok=True)
        
        file_ext = os.path.splitext(file.filename)[1]
        filename = f"problem_{current_user.id}_{uuid.uuid4().hex}{file_ext}"
        filepath = os.path.join(secure_problems_dir, filename)
        
        with open(filepath, "wb") as f:
            f.write(contents)
            
        attachment_path = filepath # Store exact local path for secure download

    report = PersonProblemReport(
        tenant_id=current_user.tenant_id,
        reporter_id=current_user.id,
        target_person_name=target_person_name,
        target_room_number=target_room_number,
        category=category,
        description=description,
        attachment_path=attachment_path
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    
    # Notify admin in same tenant
    from app.models.user import User
    from app.models.notification import Notification
    admin_query = db.query(User).filter(User.role == "admin")
    if current_user.tenant_id:
        admin_query = admin_query.filter(User.tenant_id == current_user.tenant_id)
    admins = admin_query.all()
    for admin_user in admins:
         db.add(Notification(
             tenant_id=current_user.tenant_id,
             user_id=admin_user.id,
             title="Confidential Problem Report",
             message=f"A new confidential problem report has been submitted regarding {target_person_name}.",
             notification_type="problem",
             is_read=False,
             reference_id=report.id,
             target_route="/admin/problems"
         ))
    
    # Audit log
    audit = AuditLog(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="create_problem_report",
        entity_name="person_problem_reports",
        entity_id=report.id,
        details="User filed confidential peer problem report",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return report

@router.get("/", response_model=List[PersonProblemReportOut])
def get_all_problem_reports(
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(PersonProblemReport)
    if admin.tenant_id:
        query = query.filter(PersonProblemReport.tenant_id == admin.tenant_id)
    return query.order_by(PersonProblemReport.report_date.desc()).all()

@router.get("/{report_id}/attachment")
def download_report_attachment(
    report_id: int,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(PersonProblemReport).filter(PersonProblemReport.id == report_id)
    if admin.tenant_id:
        query = query.filter(PersonProblemReport.tenant_id == admin.tenant_id)
    report = query.first()
    if not report or not report.attachment_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found."
        )
        
    if not os.path.exists(report.attachment_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical file not found."
        )
        
    return FileResponse(
        path=report.attachment_path,
        filename=os.path.basename(report.attachment_path),
        media_type="application/octet-stream"
    )
