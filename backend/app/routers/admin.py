from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from app.utils.pdf import generate_booking_pdf
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from app.core.database import get_db
from app.models.room import Room
from app.models.booking import Booking
from app.models.user import User
from app.models.complaint import Complaint
from app.models.bill import Bill
from app.models.notification import Notification
from app.models.announcement import Announcement
from app.models.audit import AuditLog
from app.schemas.notification import AnnouncementCreate, AnnouncementOut
from app.dependencies.auth import get_current_admin
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

class AuditUserOut(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    class Config:
        from_attributes = True

class AuditLogOut(BaseModel):
    id: int
    user_id: int
    action: str
    entity_name: str
    entity_id: int
    details: str
    timestamp: datetime
    user: AuditUserOut

    class Config:
        from_attributes = True

@router.get("/stats")
def get_dashboard_stats(
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    total_rooms = db.query(Room).count()
    
    beds_stats = db.query(
        func.sum(Room.available_beds).label("available"),
        func.sum(Room.occupied_beds).label("occupied")
    ).first()
    
    available_beds = int(beds_stats.available or 0) if beds_stats else 0
    occupied_beds = int(beds_stats.occupied or 0) if beds_stats else 0
    
    pending_bookings = db.query(Booking).filter(Booking.status == "PENDING").count()
    total_residents = db.query(User).filter(User.role == "tenant", User.account_status == "active").count()
    pending_complaints = db.query(Complaint).filter(Complaint.status.in_(["OPEN", "IN_PROGRESS"])).count()
    pending_bills = db.query(Bill).filter(Bill.status == "PENDING").count()
    
    # Calculate Monthly Revenue (sum of total_amount of bills that are PAID)
    revenue_stats = db.query(func.sum(Bill.total_amount)).filter(Bill.status == "PAID").scalar()
    monthly_revenue = float(revenue_stats or 0.0)
    
    return {
        "total_rooms": total_rooms,
        "available_beds": available_beds,
        "occupied_beds": occupied_beds,
        "pending_bookings": pending_bookings,
        "total_residents": total_residents,
        "pending_complaints": pending_complaints,
        "pending_bills": pending_bills,
        "monthly_revenue": monthly_revenue
    }

@router.post("/announcements", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
def broadcast_announcement(
    ann_in: AnnouncementCreate,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # 1. Save announcement in db
    announcement = Announcement(
        title=ann_in.title,
        content=ann_in.content,
        created_at=datetime.utcnow()
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    
    # 2. Query all tenants and broadcast notification
    tenants = db.query(User).filter(User.role == "tenant").all()
    for tenant in tenants:
        db.add(Notification(
            user_id=tenant.id,
            title=f"Announcement: {ann_in.title}",
            message=ann_in.content,
            notification_type="announcement",
            is_read=False,
            reference_id=announcement.id,
            target_route="/dashboard"
        ))
        
    # Audit log
    audit = AuditLog(
        user_id=admin.id,
        action="broadcast_announcement",
        entity_name="announcements",
        entity_id=announcement.id,
        details=f"Admin broadcasted announcement: {ann_in.title}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    
    db.commit()
    return announcement

@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()

@router.get("/bookings/{booking_id}/download-pdf")
def download_booking_pdf_admin(
    booking_id: int,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking request not found."
        )
    
    # Generate PDF
    try:
        pdf_buffer = generate_booking_pdf(booking)
    except Exception as e:
        print(f"Error generating booking PDF: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate the booking form PDF. Please try again."
        )
        
    user_name = f"{booking.user.first_name}_{booking.user.last_name}"
    clean_user_name = "".join(c for c in user_name if c.isalnum() or c == "_")
    filename = f"Amigos_PG_Booking_Form_Room_{booking.room.room_number}_{clean_user_name}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

