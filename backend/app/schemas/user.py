"""
Pydantic schemas for user data validation and serialization.
"""
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field, EmailStr, ConfigDict

from app.models.user import UserRole


class UserResponse(BaseModel):
    """Schema for user response data."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="User ID")
    name: str = Field(..., description="User full name")
    email: EmailStr = Field(..., description="User email address")
    role: UserRole = Field(..., description="User role")
    is_active: bool = Field(..., description="Whether the user account is active")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class UserListResponse(BaseModel):
    """Schema for paginated user list response."""
    users: List[UserResponse] = Field(..., description="List of users")
    total: int = Field(..., description="Total number of users matching filters")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")


class UserCreateRequest(BaseModel):
    """Schema for user creation request."""
    name: str = Field(..., min_length=2, max_length=100, description="User full name")
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=128, description="User password")
    role: UserRole = Field(..., description="User role")
    is_active: bool = Field(True, description="Whether the user account should be active")


class UserUpdateRequest(BaseModel):
    """Schema for user update request."""
    name: Optional[str] = Field(None, min_length=2, max_length=100, description="User full name")
    email: Optional[EmailStr] = Field(None, description="User email address")
    password: Optional[str] = Field(None, min_length=8, max_length=128, description="New password")
    role: Optional[UserRole] = Field(None, description="User role")
    is_active: Optional[bool] = Field(None, description="Whether the user account should be active")


class UserRoleUpdateRequest(BaseModel):
    """Schema for user role update request."""
    role: UserRole = Field(..., description="New user role")


class UserStatsResponse(BaseModel):
    """Schema for user statistics response."""
    total_users: int = Field(..., description="Total number of users")
    active_users: int = Field(..., description="Number of active users")
    inactive_users: int = Field(..., description="Number of inactive users")
    role_counts: Dict[str, int] = Field(..., description="Count of users by role")
    recent_registrations: int = Field(..., description="Number of users registered in the last 30 days")


class UserProfile(BaseModel):
    """Schema for user profile information."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="User ID")
    name: str = Field(..., description="User full name")
    email: EmailStr = Field(..., description="User email address")
    role: UserRole = Field(..., description="User role")
    is_active: bool = Field(..., description="Whether the user account is active")
    created_at: datetime = Field(..., description="Account creation timestamp")


class PasswordChangeRequest(BaseModel):
    """Schema for password change request."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")


class ProfileUpdateRequest(BaseModel):
    """Schema for profile update request."""
    name: Optional[str] = Field(None, min_length=2, max_length=100, description="User full name")
    email: Optional[EmailStr] = Field(None, description="User email address")