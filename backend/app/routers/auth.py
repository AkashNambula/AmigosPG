from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.user import UserCreate, UserLogin, Token, UserOut
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
