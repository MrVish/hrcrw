"""
Authentication utilities for JWT token management and password hashing.
"""
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Union, Annotated, List, Callable
from functools import wraps
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import UserRole, User
from app.core.database import get_db


class AuthenticationError(Exception):
    """Custom exception for authentication errors."""
    pass


class AuthorizationError(Exception):
    """Custom exception for authorization errors."""
    pass


# OAuth2 password bearer scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    scheme_name="JWT"
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    
    Args:
        plain_password: Plain text password
        hashed_password: Hashed password from database
        
    Returns:
        bool: True if password is correct, False otherwise
    """
    if not hashed_password or len(hashed_password) < 64:
        return False
    
    # Extract salt (first 64 characters) and hash (remaining characters)
    salt = hashed_password[:64]
    stored_hash = hashed_password[64:]
    
    # Hash the provided password with the stored salt
    password_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000)
    
    # Compare hashes
    return password_hash.hex() == stored_hash


def get_password_hash(password: str) -> str:
    """
    Hash a password using PBKDF2 with SHA-256.
    
    Args:
        password: Plain text password
        
    Returns:
        str: Hashed password with salt
    """
    # Generate a random salt
    salt = secrets.token_hex(32)
    # Hash the password with the salt using PBKDF2
    password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    # Return salt + hash as hex string
    return salt + password_hash.hex()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Data to encode in the token
        expires_delta: Token expiration time
        
    Returns:
        str: JWT token
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    """
    Verify and decode a JWT token.
    
    Args:
        token: JWT token to verify
        
    Returns:
        dict: Decoded token payload
        
    Raises:
        AuthenticationError: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        raise AuthenticationError(f"Invalid token: {e}")


def create_user_token(user_id: int, email: str, role: UserRole) -> str:
    """
    Create a JWT token for a user.
    
    Args:
        user_id: User ID
        email: User email
        role: User role
        
    Returns:
        str: JWT token
    """
    token_data = {
        "sub": str(user_id),
        "email": email,
        "role": role.value,
        "type": "access_token"
    }
    return create_access_token(token_data)


def extract_user_from_token(token: str) -> dict:
    """
    Extract user information from a JWT token.
    
    Args:
        token: JWT token
        
    Returns:
        dict: User information with keys: user_id, email, role
        
    Raises:
        AuthenticationError: If token is invalid or missing required fields
    """
    payload = verify_token(token)
    
    # Validate required fields
    if "sub" not in payload:
        raise AuthenticationError("Token missing user ID")
    if "email" not in payload:
        raise AuthenticationError("Token missing email")
    if "role" not in payload:
        raise AuthenticationError("Token missing role")
    
    try:
        user_id = int(payload["sub"])
        role = UserRole(payload["role"])
    except (ValueError, TypeError) as e:
        raise AuthenticationError(f"Invalid token data: {e}")
    
    return {
        "user_id": user_id,
        "email": payload["email"],
        "role": role
    }


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token.
    
    Args:
        token: JWT token from OAuth2 bearer scheme
        db: Database session
        
    Returns:
        User: Current authenticated user
        
    Raises:
        HTTPException: If authentication fails
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        user_info = extract_user_from_token(token)
        user_id = user_info["user_id"]
    except AuthenticationError:
        raise credentials_exception
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
        )
    
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """
    Get current active user (alias for get_current_user for clarity).
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User: Current active user
    """
    return current_user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Authenticate a user with email and password.
    
    Args:
        db: Database session
        email: User email
        password: Plain text password
        
    Returns:
        User: Authenticated user or None if authentication fails
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not user.verify_password(password):
        return None
    if not user.is_active:
        return None
    return user


def require_roles(*allowed_roles: UserRole):
    """
    Decorator factory for role-based access control.
    
    Args:
        *allowed_roles: Roles that are allowed to access the endpoint
        
    Returns:
        Dependency function that validates user role
    """
    def role_checker(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        """
        Check if current user has required role.
        
        Args:
            current_user: Current authenticated user
            
        Returns:
            User: Current user if authorized
            
        Raises:
            HTTPException: If user doesn't have required role
        """
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[role.value for role in allowed_roles]}"
            )
        return current_user
    
    return role_checker


def require_maker_role(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """
    Dependency to require Maker role.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User: Current user if they have Maker role
        
    Raises:
        HTTPException: If user doesn't have Maker role
    """
    if not current_user.is_maker:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Maker role required."
        )
    return current_user


def require_checker_role(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """
    Dependency to require Checker role.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User: Current user if they have Checker role
        
    Raises:
        HTTPException: If user doesn't have Checker role
    """
    if not current_user.is_checker:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Checker role required."
        )
    return current_user


def require_admin_role(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """
    Dependency to require Admin role.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User: Current user if they have Admin role
        
    Raises:
        HTTPException: If user doesn't have Admin role
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin role required."
        )
    return current_user


def require_maker_or_checker_role(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """
    Dependency to require Maker or Checker role.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User: Current user if they have Maker or Checker role
        
    Raises:
        HTTPException: If user doesn't have Maker or Checker role
    """
    if not (current_user.is_maker or current_user.is_checker):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Maker or Checker role required."
        )
    return current_user


def require_checker_or_admin_role(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """
    Dependency to require Checker or Admin role.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User: Current user if they have Checker or Admin role
        
    Raises:
        HTTPException: If user doesn't have Checker or Admin role
    """
    if not (current_user.is_checker or current_user.is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Checker or Admin role required."
        )
    return current_user


def require_any_authenticated_user(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """
    Dependency that allows any authenticated user.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User: Current user (already validated by get_current_user)
    """
    return current_user


async def get_user_from_token(token: str) -> Optional[User]:
    """
    Get user from JWT token without raising exceptions.
    
    This function is used by middleware to extract user information
    without failing the request if the token is invalid.
    
    Args:
        token: JWT token
        
    Returns:
        User: User object if token is valid, None otherwise
    """
    try:
        # Extract user info from token
        user_info = extract_user_from_token(token)
        user_id = user_info["user_id"]
        
        # Get database session
        from app.core.database import SessionLocal
        db = SessionLocal()
        
        try:
            # Get user from database
            user = db.query(User).filter(User.id == user_id).first()
            if user and user.is_active:
                return user
        finally:
            db.close()
            
    except (AuthenticationError, Exception):
        # Return None for any authentication errors
        pass
    
    return None