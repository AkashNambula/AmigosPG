from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random
import string
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.email import send_reset_code_email
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.user import UserCreate, UserLogin, Token, UserOut, ForgotPasswordRequest, VerifyResetCodeRequest, ResetPasswordRequest
from app.dependencies.auth import get_current_active_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    email_lower = user_in.email.lower().strip()
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email_lower).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
    
    # Hash password
    hashed_pwd = hash_password(user_in.password)
    
    # Create user
    new_user = User(
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
    email_lower = login_in.email.lower().strip()
    user = db.query(User).filter(User.email == email_lower).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
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
    token = create_access_token(subject=user.email)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role
    }

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_active_user)):
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

