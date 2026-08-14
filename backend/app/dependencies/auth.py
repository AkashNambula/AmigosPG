from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

# Use APIKeyHeader to retrieve bearer token from headers
header_scheme = APIKeyHeader(name="Authorization", auto_error=False)

def get_token(authorization: str = Depends(header_scheme)) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Handle both "Bearer <token>" and raw token format
    token = authorization
    if authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        
    return token

def get_current_user(token: str = Depends(get_token), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    email = decode_access_token(token)
    if email is None:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
        
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    # All registered users are tenant/admin. If inactive, raise exception.
    # Note: Tenant registrations start as 'pending' but can log in and submit bookings, 
    # but we can restrict specific actions if their account is deactivated/suspended.
    if current_user.account_status == "inactive":
         raise HTTPException(
             status_code=status.HTTP_403_FORBIDDEN,
             detail="This account is inactive/deactivated."
         )
    return current_user

def get_current_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Admin privilege required."
        )
    return current_user

def get_current_tenant(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != "tenant":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Tenant privilege required."
        )
    return current_user
