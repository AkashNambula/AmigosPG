import os
import mimetypes
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.models.booking import Booking, BookingDocument
from app.models.bill import Bill, Payment, PaymentSettings
from app.models.room import Room, RoomImage
from app.models.tenant import Tenant
from app.services.storage import storage_service

router = APIRouter(prefix="/files", tags=["Files"])


def normalize_key(path_str: str) -> str:
    """Normalize file path or key to prevent path traversal."""
    clean = path_str.strip().replace("\\", "/")
    # Remove leading slashes
    clean = clean.lstrip("/")
    # Guard against path traversal
    if ".." in clean.split("/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path."
        )
    return clean


@router.get("/secure")
def get_secure_file(
    file_path: str = Query(..., description="Relative file path or object key"),
    download: bool = Query(False, description="Whether to trigger download"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Secure file retrieval endpoint.
    Requires a valid JWT token and verifies multi-tenant authorization before returning file contents.
    """
    clean_key = normalize_key(file_path)
    
    # Standardize lookup patterns (with and without leading slash or /uploads/ prefix)
    possible_matches = [
        clean_key,
        f"/{clean_key}",
        clean_key.replace("uploads/", ""),
        f"/uploads/{clean_key.replace('uploads/', '')}"
    ]

    authorized = False
    
    # 1. Check if it's a Booking Document (Aadhaar, Passport)
    doc = db.query(BookingDocument).filter(BookingDocument.file_path.in_(possible_matches)).first()
    if doc:
        booking = db.query(Booking).filter(Booking.id == doc.booking_id).first()
        if not booking:
            raise HTTPException(status_code=404, detail="Associated booking not found.")
            
        if current_user.role == "super_admin":
            authorized = True
        elif current_user.role == "admin":
            if booking.tenant_id == current_user.tenant_id:
                authorized = True
        elif current_user.role == "tenant":
            if booking.user_id == current_user.id and booking.tenant_id == current_user.tenant_id:
                authorized = True

        if not authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to view this sensitive document."
            )

    # 2. Check if it's a Payment Screenshot Proof
    elif not authorized:
        payment = db.query(Payment).filter(Payment.screenshot_path.in_(possible_matches)).first()
        if payment:
            bill = db.query(Bill).filter(Bill.id == payment.bill_id).first()
            if current_user.role == "super_admin":
                authorized = True
            elif current_user.role == "admin":
                if payment.tenant_id == current_user.tenant_id or (bill and bill.tenant_id == current_user.tenant_id):
                    authorized = True
            elif current_user.role == "tenant":
                if bill and bill.user_id == current_user.id and payment.tenant_id == current_user.tenant_id:
                    authorized = True

            if not authorized:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not have permission to view this payment proof."
                )

    # 3. Check if it's a User Profile Photo
    elif not authorized:
        target_user = db.query(User).filter(User.profile_image.in_(possible_matches)).first()
        if target_user:
            if current_user.role == "super_admin":
                authorized = True
            elif current_user.role == "admin":
                if target_user.tenant_id == current_user.tenant_id:
                    authorized = True
            elif current_user.role == "tenant":
                if target_user.id == current_user.id:
                    authorized = True

            if not authorized:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not have permission to view this profile image."
                )

    # 4. Check Payment Settings QR Code
    elif not authorized:
        ps = db.query(PaymentSettings).filter(PaymentSettings.qr_code_path.in_(possible_matches)).first()
        if ps:
            if current_user.role == "super_admin" or ps.tenant_id == current_user.tenant_id:
                authorized = True
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You do not have permission to view this QR code."
                )

    # 5. Check Room Images & Tenant Logos (Public assets or Tenant assets)
    else:
        # Check Tenant Logo
        tenant_match = db.query(Tenant).filter(Tenant.logo_url.in_(possible_matches)).first()
        if tenant_match:
            authorized = True
            
        # Check Room Image
        room_img = db.query(RoomImage).filter(RoomImage.image_path.in_(possible_matches)).first()
        if room_img:
            room = db.query(Room).filter(Room.id == room_img.room_id).first()
            if current_user.role == "super_admin":
                authorized = True
            elif room and current_user.tenant_id and room.tenant_id == current_user.tenant_id:
                authorized = True
            elif current_user.role == "tenant":
                authorized = True
                
        # If path starts with logos/ or rooms/ or profiles/ and user is active
        if not authorized and any(clean_key.startswith(p) for p in ["logos/", "rooms/", "profiles/", "uploads/logos/", "uploads/rooms/"]):
            authorized = True

    if not authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Unauthorized file request."
        )

    # Retrieve file contents from storage service
    file_bytes = storage_service.get_file(clean_key)
    if file_bytes is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on storage server."
        )

    filename = os.path.basename(clean_key)
    media_type, _ = mimetypes.guess_type(filename)
    if not media_type:
        media_type = "application/octet-stream"

    disposition_type = "attachment" if download else "inline"
    headers = {
        "Content-Disposition": f'{disposition_type}; filename="{filename}"'
    }

    return Response(content=file_bytes, media_type=media_type, headers=headers)
