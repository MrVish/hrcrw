"""
Authentication API endpoints for user login and token management.
"""
from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.auth import (
    authenticate_user,
    create_user_token,
    get_current_active_user,
    get_current_user
)
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog, AuditAction, AuditEntityType
from app.middleware.audit import AuditEventLogger
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    AuthResponse,
    UserProfile,
    ChangePasswordRequest
)


router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=AuthResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT token.
    
    Args:
        form_data: OAuth2 password form data (username/email and password)
        request: HTTP request for audit logging
        db: Database session
        
    Returns:
        TokenResponse: JWT token and metadata
        
    Raises:
        HTTPException: If authentication fails
    """
    # Get client IP for audit logging
    client_ip = request.client.host if request and request.client else "unknown"
    
    # Authenticate user with email and password
    user = authenticate_user(db, form_data.username, form_data.password)
    
    # Create audit logger
    audit_logger = AuditEventLogger(db)
    
    if not user:
        # Log failed login attempt
        audit_logger.log_security_event(
            user_id=None,
            event_type="login_failed",
            description=f"Failed login attempt for email: {form_data.username}",
            severity="warning",
            details={
                "email": form_data.username,
                "reason": "invalid_credentials"
            },
            ip_address=client_ip
        )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create JWT token
    access_token = create_user_token(
        user_id=user.id,
        email=user.email,
        role=user.role
    )
    
    # Log successful login
    audit_logger.log_business_event(
        user_id=user.id,
        event_type="login_success",
        entity_type=AuditEntityType.USER,
        entity_id=str(user.id),
        action=AuditAction.LOGIN,
        description=f"User {user.email} logged in successfully",
        details={
            "email": user.email,
            "role": user.role.value,
            "login_method": "form_data"
        },
        tags=["authentication", "login"],
        category="security"
    )
    
    db.commit()
    
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserProfile.model_validate(user)
    )


@router.post("/login-json", response_model=AuthResponse)
async def login_json(
    login_data: LoginRequest,
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    Authenticate user with JSON payload and return JWT token.
    
    Args:
        login_data: Login request with email and password
        request: HTTP request for audit logging
        db: Database session
        
    Returns:
        TokenResponse: JWT token and metadata
        
    Raises:
        HTTPException: If authentication fails
    """
    # Get client IP for audit logging
    client_ip = request.client.host if request and request.client else "unknown"
    
    # Authenticate user with email and password
    user = authenticate_user(db, login_data.email, login_data.password)
    
    # Create audit logger
    audit_logger = AuditEventLogger(db)
    
    if not user:
        # Log failed login attempt
        audit_logger.log_security_event(
            user_id=None,
            event_type="login_failed",
            description=f"Failed login attempt for email: {login_data.email}",
            severity="warning",
            details={
                "email": login_data.email,
                "reason": "invalid_credentials"
            },
            ip_address=client_ip
        )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create JWT token
    access_token = create_user_token(
        user_id=user.id,
        email=user.email,
        role=user.role
    )
    
    # Log successful login
    audit_logger.log_business_event(
        user_id=user.id,
        event_type="login_success",
        entity_type=AuditEntityType.USER,
        entity_id=str(user.id),
        action=AuditAction.LOGIN,
        description=f"User {user.email} logged in successfully",
        details={
            "email": user.email,
            "role": user.role.value,
            "login_method": "json"
        },
        tags=["authentication", "login"],
        category="security"
    )
    
    db.commit()
    
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserProfile.model_validate(user)
    )


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """
    Get current user profile information.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        UserProfile: Current user profile data
    """
    return UserProfile.model_validate(current_user)


@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """
    Change current user's password.
    
    Args:
        password_data: Current and new password
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        dict: Success message
        
    Raises:
        HTTPException: If current password is incorrect
    """
    # Create audit logger
    audit_logger = AuditEventLogger(db)
    
    # Verify current password
    if not current_user.verify_password(password_data.current_password):
        # Log failed password change attempt
        audit_logger.log_security_event(
            user_id=current_user.id,
            event_type="password_change_failed",
            description=f"Failed password change attempt for user {current_user.email}",
            severity="warning",
            details={
                "email": current_user.email,
                "reason": "incorrect_current_password"
            }
        )
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Set new password
    current_user.set_password(password_data.new_password)
    
    # Log successful password change
    audit_logger.log_business_event(
        user_id=current_user.id,
        event_type="password_changed",
        entity_type=AuditEntityType.USER,
        entity_id=str(current_user.id),
        action=AuditAction.UPDATE,
        description=f"User {current_user.email} changed their password",
        details={
            "email": current_user.email
        },
        tags=["authentication", "password_change"],
        category="security"
    )
    
    db.commit()
    
    return {"message": "Password changed successfully"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Refresh JWT token for current user.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        TokenResponse: New JWT token and metadata
    """
    # Create new JWT token
    access_token = create_user_token(
        user_id=current_user.id,
        email=current_user.email,
        role=current_user.role
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/logout")
async def logout(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Session = Depends(get_db)
):
    """
    Logout current user.
    
    Note: Since JWT tokens are stateless, this endpoint primarily serves
    as a signal for the client to discard the token. In a production
    environment, you might want to implement token blacklisting.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        dict: Success message
    """
    # Create audit logger
    audit_logger = AuditEventLogger(db)
    
    # Log logout event
    audit_logger.log_business_event(
        user_id=current_user.id,
        event_type="logout",
        entity_type=AuditEntityType.USER,
        entity_id=str(current_user.id),
        action=AuditAction.LOGOUT,
        description=f"User {current_user.email} logged out",
        details={
            "email": current_user.email,
            "role": current_user.role.value
        },
        tags=["authentication", "logout"],
        category="security"
    )
    
    db.commit()
    
    return {"message": "Successfully logged out"}