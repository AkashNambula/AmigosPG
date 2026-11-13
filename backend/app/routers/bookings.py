from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
from datetime import datetime
from app.core.database import get_db
from app.core.config import settings
from app.models.booking import Booking, BookingDocument
from app.models.bill import Bill
from app.models.room import Room
from app.models.notification import Notification
from app.models.audit import AuditLog
from app.schemas.booking import BookingOut, BookingStatusUpdate
from app.dependencies.auth import get_current_active_user, get_current_admin, require_feature
from app.services.storage import storage_service

router = APIRouter(prefix="/bookings", tags=["Bookings"], dependencies=[Depends(require_feature("bookings"))])

# File validations
ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def validate_file(file: UploadFile):
    if file.content_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format for {file.filename}. Allowed: PDF, JPG, JPEG, PNG."
        )

@router.post("/", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def create_booking(
    room_id: int = Form(...),
    booking_start_date: str = Form(...),
    duration: str = Form(...),
    custom_days: Optional[int] = Form(None),
    luggage_bags_count: int = Form(0),
    additional_notes: Optional[str] = Form(None),
    terms_accepted: bool = Form(...),
    aadhaar_id: UploadFile = File(...),
    user_photo: UploadFile = File(...),
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must accept the terms and conditions to book a room."
        )

    # 1. Prevent duplicate bookings (Only 1 pending or approved booking at a time)
    existing_booking = db.query(Booking).filter(
        Booking.user_id == current_user.id,
        Booking.status.in_(["PENDING", "APPROVED"])
    ).first()
    
    if existing_booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active or pending booking request."
        )

    # 2. Check room availability
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found."
        )
        
    if room.availability_status not in ["available", "VACANCY"] or room.available_beds <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected room is not available for booking."
        )

    # 3. Validate files
    validate_file(aadhaar_id)
    validate_file(user_photo)

    # Read files to enforce size check
    aadhaar_content = await aadhaar_id.read()
    photo_content = await user_photo.read()
    
    if len(aadhaar_content) > MAX_FILE_SIZE or len(photo_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded files must not exceed 5MB size limit."
        )

    # 4. Save documents via storage_service
    aadhaar_ext = os.path.splitext(aadhaar_id.filename)[1]
    photo_ext = os.path.splitext(user_photo.filename)[1]
    
    aadhaar_filename = f"aadhaar_{current_user.id}_{uuid.uuid4().hex}{aadhaar_ext}"
    photo_filename = f"photo_{current_user.id}_{uuid.uuid4().hex}{photo_ext}"

    storage_service.save_file(aadhaar_content, f"documents/{aadhaar_filename}")
    storage_service.save_file(photo_content, f"documents/{photo_filename}")

    aadhaar_path = f"/uploads/documents/{aadhaar_filename}"
    photo_path = f"/uploads/documents/{photo_filename}"

    # Parse date
    try:
        start_date = datetime.strptime(booking_start_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD."
        )

    # 5. Create Booking record
    booking = Booking(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        room_id=room_id,
        booking_start_date=start_date,
        duration=duration,
        custom_days=custom_days,
        luggage_bags_count=luggage_bags_count,
        additional_notes=additional_notes,
        terms_accepted=terms_accepted,
        status="PENDING"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Save document references
    db.add(BookingDocument(booking_id=booking.id, document_type="aadhaar_id", file_path=aadhaar_path, original_filename=aadhaar_id.filename))
    db.add(BookingDocument(booking_id=booking.id, document_type="user_photo", file_path=photo_path, original_filename=user_photo.filename))
    
    # 6. Create Notifications
    # For tenant
    tenant_notification = Notification(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        title="Booking Request Submitted",
        message=f"Your booking request for Room {room.room_number} has been submitted and is pending admin approval.",
        notification_type="booking",
        is_read=False,
        reference_id=booking.id,
        target_route="/dashboard"
    )
    db.add(tenant_notification)
    
    # Notify admin (users with role admin in same tenant)
    from app.models.user import User
    admin_query = db.query(User).filter(User.role == "admin")
    if current_user.tenant_id:
        admin_query = admin_query.filter(User.tenant_id == current_user.tenant_id)
    admins = admin_query.all()
    for admin_user in admins:
        admin_notification = Notification(
            tenant_id=current_user.tenant_id,
            user_id=admin_user.id,
            title="New Booking Request Received",
            message=f"New room booking request from {current_user.first_name} {current_user.last_name} for Room {room.room_number}.",
            notification_type="booking",
            is_read=False,
            reference_id=booking.id,
            target_route="/admin/bookings"
        )
        db.add(admin_notification)
        
    db.commit()
    db.refresh(booking)

    return booking

@router.get("/", response_model=List[BookingOut])
def list_bookings(
    status_filter: Optional[str] = None,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Booking)
    if current_user.tenant_id:
        query = query.filter(Booking.tenant_id == current_user.tenant_id)
    
    if current_user.role == "tenant":
        query = query.filter(Booking.user_id == current_user.id)
    else:
        if status_filter:
            query = query.filter(Booking.status == status_filter)
            
    return query.order_by(Booking.created_at.desc()).all()

@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(
    booking_id: int,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(Booking).filter(Booking.id == booking_id)
    if current_user.tenant_id:
        query = query.filter(Booking.tenant_id == current_user.tenant_id)
    booking = query.first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking request not found."
        )
        
    if current_user.role == "tenant" and booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden."
        )
        
    return booking

@router.put("/{booking_id}/status", response_model=BookingOut)
def update_booking_status(
    booking_id: int,
    status_update: BookingStatusUpdate,
    admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    new_status = status_update.status.upper()
    if new_status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Allowed values: APPROVED, REJECTED."
        )

    query = db.query(Booking).filter(Booking.id == booking_id)
    if admin.tenant_id:
        query = query.filter(Booking.tenant_id == admin.tenant_id)
    booking = query.first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking request not found."
        )
        
    if booking.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change status. Booking is already {booking.status}."
        )

    room = db.query(Room).filter(Room.id == booking.room_id).first()
    if not room:
         raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found for this booking."
        )

    if new_status == "APPROVED":
        # Check capacity one more time
        if room.available_beds <= 0 or room.availability_status not in ["available", "VACANCY"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot approve. Selected room has no vacant beds."
            )
            
        # Update capacity
        room.available_beds -= 1
        room.occupied_beds += 1
        if room.available_beds == 0:
            room.availability_status = "OCCUPIED"
            

        booking.status = "APPROVED"
        
        # Auto-generate a bill if it doesn't already exist
        existing_bill = db.query(Bill).filter(Bill.booking_id == booking.id).first()
        if not existing_bill:
            rent_amount = room.monthly_price
            other_amount = room.security_deposit
            total_amount = rent_amount + other_amount
            
            new_bill = Bill(
                tenant_id=booking.tenant_id,
                user_id=booking.user_id,
                booking_id=booking.id,
                room_id=room.id,
                rent_amount=rent_amount,
                other_amount=other_amount,
                total_amount=total_amount,
                due_date=booking.booking_start_date,
                status="PENDING"
            )
            db.add(new_bill)
        
        # Notify user

        notify = Notification(
            tenant_id=booking.tenant_id,
            user_id=booking.user_id,
            title="Room Booking Approved",
            message=f"Your booking request for Room {room.room_number} has been approved.",
            notification_type="booking",
            is_read=False,
            reference_id=booking.id,
            target_route="/dashboard"
        )
        db.add(notify)
        
        # Change user status to active resident
        booking.user.account_status = "active"
        
    elif new_status == "REJECTED":
        booking.status = "REJECTED"
        
        # Notify user
        notify = Notification(
            tenant_id=booking.tenant_id,
            user_id=booking.user_id,
            title="Room Booking Rejected",
            message=f"Your booking request for Room {room.room_number} was rejected by administrator.",
            notification_type="booking",
            is_read=False,
            reference_id=booking.id,
            target_route="/dashboard"
        )
        db.add(notify)

    # Audit log
    audit = AuditLog(
        tenant_id=admin.tenant_id,
        user_id=admin.id,
        action="update_booking_status",
        entity_name="bookings",
        entity_id=booking.id,
        details=f"Admin set booking status to {new_status} for Room {room.room_number} by resident id {booking.user_id}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    
    db.commit()
    db.refresh(booking)
    
    return booking

@router.get("/{booking_id}/download-pdf")
def download_pdf(
    booking_id: int,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found."
        )
        
    if current_user.role == "tenant" and booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden."
        )
        
    pdf_buffer = generate_booking_pdf(booking)
    
    filename = f"booking_receipt_{booking.id:04d}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{booking_id}/documents/{document_id}")
def download_secure_document(
    booking_id: int,
    document_id: int,
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found."
        )

    # Permission check: Super Admin, Admin of same tenant, or Resident who owns the booking
    if current_user.role == "super_admin":
        pass
    elif current_user.role == "admin":
        if booking.tenant_id != current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to view documents for another PG tenant."
            )
    elif current_user.role == "tenant":
        if booking.user_id != current_user.id or booking.tenant_id != current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to view these documents."
            )
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    doc = db.query(BookingDocument).filter(
        BookingDocument.id == document_id,
        BookingDocument.booking_id == booking_id
    ).first()
    
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document reference not found."
        )
        
    file_bytes = storage_service.get_file(doc.file_path)
    if file_bytes is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical document file not found on storage."
        )
        
    import mimetypes
    mime_type, _ = mimetypes.guess_type(doc.file_path)
    if not mime_type:
        mime_type = "application/octet-stream"
        
    return Response(
        content=file_bytes,
        media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{doc.original_filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

