import os
import uuid
import re
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random
import string
from app.core.database import get_db
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from app.core.email import send_reset_code_email
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.user import UserCreate, UserLogin, Token, UserOut, UserProfileUpdate, ForgotPasswordRequest, VerifyResetCodeRequest, ResetPasswordRequest
from app.dependencies.auth import get_current_active_user
from app.services.storage import storage_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    from app.models.tenant import Tenant
    email_lower = user_in.email.lower().strip()
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email_lower).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
    
    # Resolve tenant
    target_tenant = None
    if user_in.tenant_slug:
        slug_clean = user_in.tenant_slug.strip().lower()
        target_tenant = db.query(Tenant).filter(Tenant.slug == slug_clean).first()
        if not target_tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PG tenant not found."
            )
    elif user_in.tenant_id:
        target_tenant = db.query(Tenant).filter(Tenant.id == user_in.tenant_id).first()
        if not target_tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PG tenant not found."
            )
    else:
        target_tenant = db.query(Tenant).filter(Tenant.is_active == True).order_by(Tenant.id.asc()).first()
        
    if target_tenant and not target_tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This PG tenant is currently inactive. Registration is disabled."
        )

    target_tenant_id = target_tenant.id if target_tenant else None
            
    # Hash password
    hashed_pwd = hash_password(user_in.password)
    
    # Create user
    new_user = User(
        tenant_id=target_tenant_id,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        email=email_lower,
        phone=user_in.phone,
        state=user_in.state,
        city=user_in.city,
        password_hash=hashed_pwd,
        role="tenant",
        account_status="pending",
        joining_date=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Audit log
    audit = AuditLog(
        tenant_id=target_tenant_id,
        user_id=new_user.id,
        action="register",
        entity_name="users",
        entity_id=new_user.id,
        details=f"User registered with email: {new_user.email}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return new_user

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    from app.models.tenant import Tenant
    email_lower = login_in.email.lower().strip()
    
    user = None
    
    # 1. Super Admin Login Mode
    if login_in.login_type == "super_admin" or login_in.tenant_slug == "superadmin":
        user = db.query(User).filter(User.email == email_lower, User.role == "super_admin").first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password for Super Admin."
            )
    # 2. Tenant Specific Login Mode
    elif login_in.tenant_slug:
        slug_clean = login_in.tenant_slug.strip().lower()
        tenant = db.query(Tenant).filter(Tenant.slug == slug_clean).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PG tenant not found."
            )
        if not tenant.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This PG tenant is currently inactive. Login is disabled."
            )
        # Match user by email and tenant_id
        user = db.query(User).filter(User.email == email_lower, User.tenant_id == tenant.id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password for this PG property."
            )
    # 3. Fallback General Login Mode
    else:
        user = db.query(User).filter(User.email == email_lower).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )
        if user.role != "super_admin" and user.tenant_id:
            tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
            if tenant and not tenant.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This PG tenant is currently inactive. Login is disabled."
                )

    if not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
        
    if user.account_status == "inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact administration."
        )
        
    # Generate token
    token = create_access_token(subject=user.email, tenant_id=user.tenant_id, role=user.role)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "tenant_id": user.tenant_id
    }

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_active_user)):
    return current_user

ALLOWED_PROFILE_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_PROFILE_MIME_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_PROFILE_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def save_profile_photo_file(photo_file: UploadFile, user_id: int) -> str:
    ext = os.path.splitext(photo_file.filename)[1].lower()
    if ext not in ALLOWED_PROFILE_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PNG, JPG, JPEG, and WEBP images are allowed."
        )
    if photo_file.content_type and photo_file.content_type.lower() not in ALLOWED_PROFILE_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image MIME type."
        )
    contents = photo_file.file.read()
    if len(contents) > MAX_PROFILE_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum limit of 5MB."
        )
    
    filename = f"user_{user_id}_{uuid.uuid4().hex[:8]}{ext}"
    object_key = f"profiles/{filename}"
    storage_service.save_file(contents, object_key)
        
    return f"/uploads/profiles/{filename}"

@router.put("/me", response_model=UserOut)
@router.patch("/me", response_model=UserOut)
def update_current_user_profile(
    profile_in: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # 1. Update First & Last Name if provided
    if profile_in.first_name is not None:
        current_user.first_name = profile_in.first_name.strip()
    if profile_in.last_name is not None:
        current_user.last_name = profile_in.last_name.strip()

    # 2. Update Phone if provided (validate 10 digits)
    if profile_in.phone is not None:
        clean_phone = re.sub(r"\D", "", profile_in.phone.strip())
        if not re.match(r"^[6-9]\d{9}$", clean_phone):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid 10-digit mobile number starting with 6-9."
            )
        current_user.phone = clean_phone

    # 3. Update Email if provided
    if profile_in.email is not None:
        email_clean = profile_in.email.strip().lower()
        if email_clean != current_user.email:
            existing = db.query(User).filter(User.email == email_clean, User.id != current_user.id).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A user with this email address already exists."
                )
            current_user.email = email_clean

    # 4. Update Location if provided
    if profile_in.state is not None and profile_in.state.strip():
        current_user.state = profile_in.state.strip()
    if profile_in.city is not None and profile_in.city.strip():
        current_user.city = profile_in.city.strip()

    # 5. Update Password if provided
    if profile_in.new_password:
        if len(profile_in.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must contain at least 6 characters."
            )
        if profile_in.new_password != profile_in.confirm_new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password and confirm password do not match."
            )
        current_user.password_hash = hash_password(profile_in.new_password)

    db.commit()
    db.refresh(current_user)

    # Audit log
    audit = AuditLog(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        action="update_profile",
        entity_name="users",
        entity_id=current_user.id,
        details=f"User updated their profile (email: {current_user.email})",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return current_user

@router.post("/me/profile-photo", response_model=UserOut)
def upload_current_user_profile_photo(
    photo_file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Remove previous profile photo file if it exists
    if current_user.profile_image:
        old_filename = os.path.basename(current_user.profile_image)
        storage_service.delete_file(f"profiles/{old_filename}")

    new_photo_url = save_profile_photo_file(photo_file, current_user.id)
    current_user.profile_image = new_photo_url
    db.commit()
    db.refresh(current_user)
    return current_user

@router.delete("/me/profile-photo", response_model=UserOut)
def remove_current_user_profile_photo(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.profile_image:
        old_filename = os.path.basename(current_user.profile_image)
        storage_service.delete_file(f"profiles/{old_filename}")

    current_user.profile_image = None
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email_lower = request.email.lower().strip()
    user = db.query(User).filter(User.email == email_lower).first()
    
    if not user:
        # Prevent email enumeration by returning a generic success message
        return {"message": "If an account with that email exists, a reset code has been sent."}
    
    # Generate 6-digit OTP
    reset_code = ''.join(random.choices(string.digits, k=6))
    user.reset_code = reset_code
    user.reset_code_expires = datetime.utcnow() + timedelta(minutes=15)
    db.commit()
    
    background_tasks.add_task(
        send_reset_code_email,
        to_email=user.email,
        code=reset_code,
        user_name=user.first_name
    )
    
    return {"message": "If an account with that email exists, a reset code has been sent."}

@router.post("/verify-reset-code")
def verify_reset_code(request: VerifyResetCodeRequest, db: Session = Depends(get_db)):
    email_lower = request.email.lower().strip()
    user = db.query(User).filter(User.email == email_lower).first()
    
    if not user or user.reset_code != request.code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset code.")
    
    if not user.reset_code_expires or datetime.utcnow() > user.reset_code_expires:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset code.")
        
    return {"message": "Code verified successfully."}

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    email_lower = request.email.lower().strip()
    user = db.query(User).filter(User.email == email_lower).first()
    
    if not user or user.reset_code != request.code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset code.")
        
    if not user.reset_code_expires or datetime.utcnow() > user.reset_code_expires:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset code.")
        
    # Reset password
    user.password_hash = hash_password(request.new_password)
    user.reset_code = None
    user.reset_code_expires = None
    db.commit()
    
    # Audit log
    audit = AuditLog(
        user_id=user.id,
        action="reset_password",
        entity_name="users",
        entity_id=user.id,
        details=f"User reset password",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return {"message": "Password reset successfully. You can now log in."}

