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
    room_q = db.query(Room)
    booking_q = db.query(Booking)
    user_q = db.query(User)
    complaint_q = db.query(Complaint)
    bill_q = db.query(Bill)
    
    if admin.tenant_id:
        room_q = room_q.filter(Room.tenant_id == admin.tenant_id)
        booking_q = booking_q.filter(Booking.tenant_id == admin.tenant_id)
        user_q = user_q.filter(User.tenant_id == admin.tenant_id)
        complaint_q = complaint_q.filter(Complaint.tenant_id == admin.tenant_id)
        bill_q = bill_q.filter(Bill.tenant_id == admin.tenant_id)

    total_rooms = room_q.count()
    
    beds_query = db.query(
        func.sum(Room.available_beds).label("available"),
        func.sum(Room.occupied_beds).label("occupied")
    )
    if admin.tenant_id:
        beds_query = beds_query.filter(Room.tenant_id == admin.tenant_id)
    beds_stats = beds_query.first()
    
    available_beds = int(beds_stats.available or 0) if beds_stats else 0
    occupied_beds = int(beds_stats.occupied or 0) if beds_stats else 0
    
    pending_bookings = booking_q.filter(Booking.status == "PENDING").count()
    total_residents = user_q.filter(User.role == "tenant", User.account_status == "active").count()
    pending_complaints = complaint_q.filter(Complaint.status.in_(["OPEN", "IN_PROGRESS"])).count()
    pending_bills = bill_q.filter(Bill.status == "PENDING").count()
    
    rev_query = db.query(func.sum(Bill.total_amount)).filter(Bill.status == "PAID")
    if admin.tenant_id:
        rev_query = rev_query.filter(Bill.tenant_id == admin.tenant_id)
    revenue_stats = rev_query.scalar()
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
        tenant_id=admin.tenant_id,
        title=ann_in.title,
        content=ann_in.content,
        created_at=datetime.utcnow()
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    
    # 2. Query tenants in same PG and broadcast notification
    tenant_users_q = db.query(User).filter(User.role == "tenant")
    if admin.tenant_id:
        tenant_users_q = tenant_users_q.filter(User.tenant_id == admin.tenant_id)
    tenants = tenant_users_q.all()
    for tenant in tenants:
        db.add(Notification(
            tenant_id=admin.tenant_id,
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
        tenant_id=admin.tenant_id,
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

from app.dependencies.auth import get_current_admin, require_feature

@router.get("/audit-logs", response_model=List[AuditLogOut], dependencies=[Depends(require_feature("reports"))])
def get_audit_logs(
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if admin.tenant_id:
        query = query.filter(AuditLog.tenant_id == admin.tenant_id)
    return query.order_by(AuditLog.timestamp.desc()).all()

@router.get("/bookings/{booking_id}/download-pdf")
def download_booking_pdf_admin(
    booking_id: int,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Booking).filter(Booking.id == booking_id)
    if admin.tenant_id:
        query = query.filter(Booking.tenant_id == admin.tenant_id)
    booking = query.first()
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
    filename = f"Booking_Form_Room_{booking.room.room_number}_{clean_user_name}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

