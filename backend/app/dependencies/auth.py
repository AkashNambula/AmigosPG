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
    
    payload = decode_access_token(token)
    if payload is None or not isinstance(payload, dict):
        raise credentials_exception
        
    email = payload.get("sub")
    if not email:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
        
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.account_status == "inactive":
         raise HTTPException(
             status_code=status.HTTP_403_FORBIDDEN,
             detail="This account is inactive/deactivated."
         )
    return current_user

def get_current_super_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Super Admin privilege required."
        )
    return current_user

def get_current_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role not in ["admin", "super_admin"]:
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

def require_feature(feature_key: str):
    def dependency(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ):
        if current_user.role == "super_admin":
            return True
        if not current_user.tenant_id:
            return True
            
        from app.models.tenant_feature import TenantFeature
        feat = db.query(TenantFeature).filter(
            TenantFeature.tenant_id == current_user.tenant_id,
            TenantFeature.feature_key == feature_key
        ).first()
        
        if feat and not feat.enabled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The '{feature_key}' feature is not enabled for this PG tenant."
            )
        return True
    return dependency
