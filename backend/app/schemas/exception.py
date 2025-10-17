"""
Pydantic schemas for ReviewException data validation and serialization.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.models.exception import ExceptionType, ExceptionStatus, ExceptionPriority



class ReviewExceptionCreate(BaseModel):
    """Schema for creating a new review exception."""
    model_config = ConfigDict(populate_by_name=True)
    
    review_id: int = Field(..., description="Review ID this exception is related to")
    # Support both 'type' and 'exception_type' field names for frontend compatibility
    exception_type: ExceptionType = Field(..., alias="type", description="Type of exception")
    title: str = Field(default="Exception", min_length=1, max_length=255, description="Title/summary of the exception")
    description: str = Field(..., min_length=1, max_length=2000, description="Detailed description of the exception")
    priority: ExceptionPriority = Field(default=ExceptionPriority.MEDIUM, description="Priority level of the exception")
    due_date: Optional[datetime] = Field(None, description="Due date for exception resolution")
    assigned_to: Optional[int] = Field(None, description="ID of assigned user")


class ReviewExceptionUpdate(BaseModel):
    """Schema for updating review exception information."""
    model_config = ConfigDict(populate_by_name=True)
    
    # Support both 'type' and 'exception_type' field names for frontend compatibility
    exception_type: Optional[ExceptionType] = Field(None, alias="type", description="Type of exception")
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Title/summary of the exception")
    description: Optional[str] = Field(None, min_length=1, max_length=2000, description="Description of the exception")
    priority: Optional[ExceptionPriority] = Field(None, description="Priority level of the exception")
    due_date: Optional[datetime] = Field(None, description="Due date for exception resolution")
    status: Optional[ExceptionStatus] = Field(None, description="Status of the exception")
    assigned_to: Optional[int] = Field(None, description="ID of assigned user")


class ReviewExceptionResolve(BaseModel):
    """Schema for resolving a review exception."""
    resolution_notes: str = Field(..., min_length=1, description="Notes about the resolution")


class ReviewExceptionStatusUpdate(BaseModel):
    """Schema for updating exception status."""
    status: ExceptionStatus = Field(..., description="New status for the exception")


class ReviewExceptionResponse(BaseModel):
    """Schema for review exception response data."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    # Core fields
    id: int = Field(..., description="Internal database ID")
    review_id: int = Field(..., description="Review ID this exception is related to")
    exception_type: ExceptionType = Field(..., alias="type", description="Type of exception")
    title: str = Field(..., description="Title/summary of the exception")
    description: str = Field(..., description="Description of the exception")
    priority: ExceptionPriority = Field(..., description="Priority level of the exception")
    status: ExceptionStatus = Field(..., description="Current status of the exception")
    due_date: Optional[datetime] = Field(None, description="Due date for exception resolution")
    
    # User tracking fields
    created_by: int = Field(..., description="ID of user who created the exception")
    resolved_by: Optional[int] = Field(None, description="ID of user who resolved the exception")
    assigned_to: Optional[int] = Field(None, description="ID of assigned user")
    
    # User name fields for frontend display
    created_by_name: Optional[str] = Field(None, description="Name of user who created the exception")
    resolved_by_name: Optional[str] = Field(None, description="Name of user who resolved the exception")
    assigned_to_name: Optional[str] = Field(None, description="Name of assigned user")
    
    # Resolution tracking
    resolution_notes: Optional[str] = Field(None, description="Resolution notes")
    resolved_at: Optional[datetime] = Field(None, description="Timestamp when resolved")
    
    # Timestamps
    created_at: datetime = Field(..., description="Timestamp when created")
    updated_at: datetime = Field(..., description="Timestamp when last updated")
    
    # Computed properties
    is_open: bool = Field(..., description="Whether exception is open")
    is_in_progress: bool = Field(..., description="Whether exception is in progress")
    is_resolved: bool = Field(..., description="Whether exception is resolved")
    is_closed: bool = Field(..., description="Whether exception is closed")
    is_active: bool = Field(..., description="Whether exception is active")
    is_high_priority: bool = Field(..., description="Whether exception is high priority")
    is_critical: bool = Field(..., description="Whether exception is critical priority")
    is_overdue: bool = Field(..., description="Whether exception is overdue")


class ReviewExceptionDetailResponse(ReviewExceptionResponse):
    """Schema for detailed review exception information including related data."""
    # Include review information
    review_client_id: Optional[str] = Field(None, description="Client ID from related review")
    review_status: Optional[str] = Field(None, description="Status of related review")
    
    # Include client information
    client_name: Optional[str] = Field(None, description="Name of the client from related review")
    
    # Additional user information (extends the base user name fields)
    creator_name: Optional[str] = Field(None, description="Name of user who created the exception")
    resolver_name: Optional[str] = Field(None, description="Name of user who resolved the exception")


class ReviewExceptionListResponse(BaseModel):
    """Schema for paginated review exception list response."""
    exceptions: List[ReviewExceptionDetailResponse] = Field(..., description="List of exceptions with detailed information")
    total: int = Field(..., description="Total number of exceptions matching filters")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")


class ReviewExceptionSearchFilters(BaseModel):
    """Schema for review exception search and filtering parameters."""
    review_id: Optional[int] = Field(None, description="Filter by review ID")
    exception_type: Optional[ExceptionType] = Field(None, description="Filter by exception type")
    priority: Optional[ExceptionPriority] = Field(None, description="Filter by priority")
    status: Optional[ExceptionStatus] = Field(None, description="Filter by status")
    created_by: Optional[int] = Field(None, description="Filter by creator user ID")
    resolved_by: Optional[int] = Field(None, description="Filter by resolver user ID")
    assigned_to: Optional[int] = Field(None, description="Filter by assigned user ID")
    due_after: Optional[datetime] = Field(None, description="Filter exceptions due after this date")
    due_before: Optional[datetime] = Field(None, description="Filter exceptions due before this date")
    created_after: Optional[datetime] = Field(None, description="Filter exceptions created after this date")
    created_before: Optional[datetime] = Field(None, description="Filter exceptions created before this date")
    resolved_after: Optional[datetime] = Field(None, description="Filter exceptions resolved after this date")
    resolved_before: Optional[datetime] = Field(None, description="Filter exceptions resolved before this date")
    page: int = Field(1, ge=1, description="Page number for pagination")
    per_page: int = Field(20, ge=1, le=100, description="Number of items per page")
    sort_by: Optional[str] = Field("created_at", description="Field to sort by")
    sort_order: Optional[str] = Field("desc", pattern="^(asc|desc)$", description="Sort order")


class ReviewExceptionStatsResponse(BaseModel):
    """Schema for review exception statistics."""
    total_exceptions: int = Field(..., description="Total number of exceptions")
    open_exceptions: int = Field(..., description="Number of open exceptions")
    in_progress_exceptions: int = Field(..., description="Number of in-progress exceptions")
    resolved_exceptions: int = Field(..., description="Number of resolved exceptions")
    closed_exceptions: int = Field(..., description="Number of closed exceptions")
    
    # Priority statistics
    low_priority_exceptions: int = Field(..., description="Number of low priority exceptions")
    medium_priority_exceptions: int = Field(..., description="Number of medium priority exceptions")
    high_priority_exceptions: int = Field(..., description="Number of high priority exceptions")
    critical_priority_exceptions: int = Field(..., description="Number of critical priority exceptions")
    
    # Type statistics
    kyc_non_compliance_exceptions: int = Field(..., description="Number of KYC non-compliance exceptions")
    dormant_funded_ufaa_exceptions: int = Field(..., description="Number of dormant funded UFAA exceptions")
    dormant_overdrawn_exit_exceptions: int = Field(..., description="Number of dormant overdrawn exit exceptions")
    documentation_exceptions: int = Field(..., description="Number of documentation exceptions")
    compliance_exceptions: int = Field(..., description="Number of compliance exceptions")
    technical_exceptions: int = Field(..., description="Number of technical exceptions")
    operational_exceptions: int = Field(..., description="Number of operational exceptions")
    
    # Time-based statistics
    overdue_exceptions: int = Field(..., description="Number of overdue exceptions")
    avg_resolution_time_hours: Optional[float] = Field(None, description="Average resolution time in hours")