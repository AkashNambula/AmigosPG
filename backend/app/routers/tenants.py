import os
import uuid
import re
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.security import hash_password
from app.dependencies.auth import get_current_active_user, get_current_super_admin
from app.services.storage import storage_service
from app.models.tenant import Tenant
from app.models.tenant_feature import TenantFeature, ALL_FEATURE_KEYS
from app.models.user import User
from app.models.room import Room, RoomImage, RoomFacility
from app.models.booking import Booking, BookingDocument
from app.models.complaint import Complaint, ComplaintUpdate
from app.models.bill import Bill, Payment, PaymentSettings
from app.models.food import FoodMenu
from app.models.problem import PersonProblemReport
from app.models.notification import Notification
from app.models.announcement import Announcement
from app.models.audit import AuditLog
from app.schemas.tenant import TenantOut, TenantUpdate, TenantFeaturesUpdate, TenantFeaturesOut, PublicTenantOut

router = APIRouter(prefix="/tenants", tags=["Tenants"])
tenant_router = APIRouter(prefix="/tenant", tags=["Tenants"])
super_admin_router = APIRouter(prefix="/super-admin/tenants", tags=["Super Admin Tenants"])
public_router = APIRouter(prefix="/public/tenants", tags=["Public Tenants"])

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def generate_slug(name: str, db: Session, current_tenant_id: Optional[int] = None) -> str:
    base_slug = re.sub(r'[^a-z0-9]+', '', name.lower().strip()) or "tenant"
    slug = base_slug
    counter = 2
    while True:
        query = db.query(Tenant).filter(Tenant.slug == slug)
        if current_tenant_id:
            query = query.filter(Tenant.id != current_tenant_id)
        existing = query.first()
        if not existing:
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1

def get_tenant_features_dict(db: Session, tenant_id: int) -> Dict[str, bool]:
    feature_rows = db.query(TenantFeature).filter(TenantFeature.tenant_id == tenant_id).all()
    features_dict = {key: True for key in ALL_FEATURE_KEYS}
    for row in feature_rows:
        features_dict[row.feature_key] = row.enabled
    return features_dict

def seed_default_tenant_features(db: Session, tenant_id: int):
    existing_keys = {
        row.feature_key for row in db.query(TenantFeature).filter(TenantFeature.tenant_id == tenant_id).all()
    }
    for key in ALL_FEATURE_KEYS:
        if key not in existing_keys:
            db.add(TenantFeature(tenant_id=tenant_id, feature_key=key, enabled=True))
    db.commit()

def save_logo_file(logo_file: UploadFile, tenant_id: int) -> str:
    ext = os.path.splitext(logo_file.filename)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PNG, JPG, JPEG, and WEBP images are allowed."
        )
    if logo_file.content_type and logo_file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image MIME type."
        )
    
    # Read content to check size
    contents = logo_file.file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum limit of 5MB."
        )
    
    filename = f"tenant_{tenant_id}_{uuid.uuid4().hex[:8]}{ext}"
    object_key = f"logos/{filename}"
    storage_service.save_file(contents, object_key)
        
    return f"/uploads/logos/{filename}"


def build_tenant_out(tenant: Tenant, db: Session) -> TenantOut:
    features = get_tenant_features_dict(db, tenant.id)
    return TenantOut(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug or "",
        description=tenant.description,
        phone=tenant.phone,
        email=tenant.email,
        address=tenant.address,
        city=tenant.city,
        state=tenant.state,
        pincode=tenant.pincode,
        logo_url=tenant.logo_url,
        is_active=tenant.is_active,
        created_at=tenant.created_at,
        updated_at=tenant.updated_at,
        features=features
    )

# GET /api/tenant/me and GET /api/tenants/me
@tenant_router.get("/me", response_model=Optional[TenantOut])
@router.get("/me", response_model=Optional[TenantOut])
def get_my_tenant(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "super_admin" or not current_user.tenant_id:
        return None
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")
    return build_tenant_out(tenant, db)

# GET /api/tenants/public
@router.get("/public", response_model=List[TenantOut])
def get_public_tenants(db: Session = Depends(get_db)):
    tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
    return [build_tenant_out(t, db) for t in tenants]

# GET /api/public/tenants/{tenant_slug} and /api/tenants/public/{tenant_slug}
@public_router.get("/{tenant_slug}", response_model=PublicTenantOut)
@router.get("/public/{tenant_slug}", response_model=PublicTenantOut)
def get_public_tenant_by_slug(tenant_slug: str, db: Session = Depends(get_db)):
    slug_clean = tenant_slug.strip().lower()
    tenant = db.query(Tenant).filter(Tenant.slug == slug_clean).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="PG tenant not found.")
    return PublicTenantOut(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        description=tenant.description,
        logo_url=tenant.logo_url,
        is_active=tenant.is_active
    )

# GET /api/tenants (Super Admin)
@router.get("", response_model=List[TenantOut])
def get_all_tenants(
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    tenants = db.query(Tenant).order_by(Tenant.id.desc()).all()
    return [build_tenant_out(t, db) for t in tenants]

# POST /api/tenants (Super Admin)
@router.post("", response_model=TenantOut, status_code=201)
def create_tenant(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    pincode: Optional[str] = Form(None),
    admin_first_name: str = Form(...),
    admin_last_name: str = Form(...),
    admin_email: str = Form(...),
    admin_phone: str = Form(...),
    admin_password: str = Form(...),
    logo_file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    # Validate Admin Phone
    clean_admin_phone = re.sub(r'\D', '', admin_phone.strip())
    if not re.match(r'^[6-9]\d{9}$', clean_admin_phone):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid 10-digit mobile number for Admin Phone."
        )
    admin_phone = clean_admin_phone

    # Validate Contact Phone if provided
    clean_phone = None
    if phone and phone.strip():
        clean_phone = re.sub(r'\D', '', phone.strip())
        if not re.match(r'^[6-9]\d{9}$', clean_phone):
            raise HTTPException(
                status_code=400,
                detail="Please enter a valid 10-digit mobile number for Contact Phone."
            )

    slug = generate_slug(name, db)

    # 1. Create Tenant
    new_tenant = Tenant(
        name=name.strip(),
        slug=slug,
        description=description.strip() if description else None,
        phone=clean_phone,
        email=email.strip() if email else None,
        address=address.strip() if address else None,
        city=city.strip() if city else None,
        state=state.strip() if state else None,
        pincode=pincode.strip() if pincode else None,
        is_active=True
    )
    db.add(new_tenant)
    db.flush()

    # 2. Save Logo if provided
    if logo_file and logo_file.filename:
        logo_url = save_logo_file(logo_file, new_tenant.id)
        new_tenant.logo_url = logo_url

    # 3. Create PG Admin user
    admin_user = User(
        tenant_id=new_tenant.id,
        first_name=admin_first_name.strip(),
        last_name=admin_last_name.strip(),
        email=admin_email.strip().lower(),
        phone=admin_phone.strip(),
        state=state.strip() if state else "Karnataka",
        city=city.strip() if city else "Bengaluru",
        password_hash=hash_password(admin_password),
        role="admin",
        account_status="active"
    )
    db.add(admin_user)
    db.commit()
    db.refresh(new_tenant)

    # 4. Seed default features
    seed_default_tenant_features(db, new_tenant.id)
    return build_tenant_out(new_tenant, db)

# PUT /api/tenants/{tenant_id} (Super Admin)
@router.put("/{tenant_id}", response_model=TenantOut)
def update_tenant(
    tenant_id: int,
    tenant_in: TenantUpdate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    update_data = tenant_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)

    db.commit()
    db.refresh(tenant)
    return build_tenant_out(tenant, db)

# POST /api/tenants/{tenant_id}/logo (Super Admin)
@router.post("/{tenant_id}/logo", response_model=TenantOut)
def upload_tenant_logo(
    tenant_id: int,
    logo_file: UploadFile = File(...),
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    logo_url = save_logo_file(logo_file, tenant.id)
    tenant.logo_url = logo_url
    db.commit()
    db.refresh(tenant)
    return build_tenant_out(tenant, db)

# PUT /api/tenants/{tenant_id}/status (Super Admin)
@router.put("/{tenant_id}/status", response_model=TenantOut)
def toggle_tenant_status(
    tenant_id: int,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    tenant.is_active = not tenant.is_active
    db.commit()
    db.refresh(tenant)
    return build_tenant_out(tenant, db)

# GET /api/tenants/{tenant_id}/features & GET /api/super-admin/tenants/{tenant_id}/features
@super_admin_router.get("/{tenant_id}/features", response_model=TenantFeaturesOut)
@router.get("/{tenant_id}/features", response_model=TenantFeaturesOut)
def get_tenant_features(
    tenant_id: int,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")
    features = get_tenant_features_dict(db, tenant_id)
    return TenantFeaturesOut(tenant_id=tenant_id, features=features)

# PUT /api/tenants/{tenant_id}/features & PUT /api/super-admin/tenants/{tenant_id}/features
@super_admin_router.put("/{tenant_id}/features", response_model=TenantFeaturesOut)
@router.put("/{tenant_id}/features", response_model=TenantFeaturesOut)
def update_tenant_features(
    tenant_id: int,
    features_in: TenantFeaturesUpdate,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    for key, enabled in features_in.features.items():
        if key not in ALL_FEATURE_KEYS:
            continue
        row = db.query(TenantFeature).filter(
            TenantFeature.tenant_id == tenant_id,
            TenantFeature.feature_key == key
        ).first()
        if row:
            row.enabled = bool(enabled)
        else:
            db.add(TenantFeature(tenant_id=tenant_id, feature_key=key, enabled=bool(enabled)))

    db.commit()
    updated_features = get_tenant_features_dict(db, tenant_id)
    return TenantFeaturesOut(tenant_id=tenant_id, features=updated_features)

# DELETE /api/tenants/{tenant_id} & DELETE /api/super-admin/tenants/{tenant_id} (Super Admin Only)
def perform_delete_tenant(tenant_id: int, db: Session):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="PG tenant not found.")

    tenant_name = tenant.name

    try:
        # 1. Delete TenantFeatures & PaymentSettings
        db.query(TenantFeature).filter(TenantFeature.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(PaymentSettings).filter(PaymentSettings.tenant_id == tenant_id).delete(synchronize_session=False)

        # 2. Delete Payments (belonging to tenant's bills or tenant_id)
        bill_ids = [b.id for b in db.query(Bill.id).filter(Bill.tenant_id == tenant_id).all()]
        if bill_ids:
            db.query(Payment).filter(Payment.bill_id.in_(bill_ids)).delete(synchronize_session=False)
        db.query(Payment).filter(Payment.tenant_id == tenant_id).delete(synchronize_session=False)

        # 3. Delete Bills
        db.query(Bill).filter(Bill.tenant_id == tenant_id).delete(synchronize_session=False)

        # 4. Delete BookingDocuments & Bookings
        booking_ids = [b.id for b in db.query(Booking.id).filter(Booking.tenant_id == tenant_id).all()]
        if booking_ids:
            db.query(BookingDocument).filter(BookingDocument.booking_id.in_(booking_ids)).delete(synchronize_session=False)
        db.query(Booking).filter(Booking.tenant_id == tenant_id).delete(synchronize_session=False)

        # 5. Delete ComplaintUpdates & Complaints
        complaint_ids = [c.id for c in db.query(Complaint.id).filter(Complaint.tenant_id == tenant_id).all()]
        if complaint_ids:
            db.query(ComplaintUpdate).filter(ComplaintUpdate.complaint_id.in_(complaint_ids)).delete(synchronize_session=False)
        db.query(Complaint).filter(Complaint.tenant_id == tenant_id).delete(synchronize_session=False)

        # 6. Delete RoomImages, RoomFacilities & Rooms
        room_ids = [r.id for r in db.query(Room.id).filter(Room.tenant_id == tenant_id).all()]
        if room_ids:
            db.query(RoomImage).filter(RoomImage.room_id.in_(room_ids)).delete(synchronize_session=False)
            db.query(RoomFacility).filter(RoomFacility.room_id.in_(room_ids)).delete(synchronize_session=False)
        db.query(Room).filter(Room.tenant_id == tenant_id).delete(synchronize_session=False)

        # 7. Delete FoodMenu, PersonProblemReport, Notification, Announcement, AuditLog
        db.query(FoodMenu).filter(FoodMenu.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(PersonProblemReport).filter(PersonProblemReport.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(Notification).filter(Notification.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(Announcement).filter(Announcement.tenant_id == tenant_id).delete(synchronize_session=False)
        db.query(AuditLog).filter(AuditLog.tenant_id == tenant_id).delete(synchronize_session=False)

        # 8. Delete Users belonging ONLY to this tenant (EXCLUDING super_admin!)
        db.query(User).filter(User.tenant_id == tenant_id, User.role != "super_admin").delete(synchronize_session=False)

        # 9. Delete Tenant record itself
        db.delete(tenant)
        db.commit()

        return {
            "message": f"PG tenant '{tenant_name}' was permanently deleted.",
            "tenant_id": tenant_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete PG tenant: {str(e)}"
        )

@router.delete("/{tenant_id}", status_code=200)
def delete_tenant_router(
    tenant_id: int,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    return perform_delete_tenant(tenant_id, db)

@super_admin_router.delete("/{tenant_id}", status_code=200)
def delete_tenant_super_admin_router(
    tenant_id: int,
    current_user: User = Depends(get_current_super_admin),
    db: Session = Depends(get_db)
):
    return perform_delete_tenant(tenant_id, db)
