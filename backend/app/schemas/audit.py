"""
Pydantic schemas for audit log data validation and serialization.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class AuditLogResponse(BaseModel):
    """Schema for audit log response data."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="Internal database ID")
    user_id: int = Field(..., description="ID of user who performed the action")
    entity_type: str = Field(..., description="Type of entity (e.g., 'Client', 'Review')")
    entity_id: str = Field(..., description="ID of the entity")
    action: str = Field(..., description="Action performed (e.g., 'CREATE', 'UPDATE')")
    created_at: datetime = Field(..., description="Timestamp when action was performed")
    details: Dict[str, Any] = Field(..., description="Additional details about the action")


class AuditLogDetailResponse(AuditLogResponse):
    """Schema for detailed audit log information including user data."""
    user_name: Optional[str] = Field(None, description="Name of the user who performed the action")
    user_email: Optional[str] = Field(None, description="Email of the user who performed the action")
    user_role: Optional[str] = Field(None, description="Role of the user who performed the action")


class AuditLogListResponse(BaseModel):
    """Schema for paginated audit log list response."""
    audit_logs: List[AuditLogDetailResponse] = Field(..., description="List of audit logs")
    total: int = Field(..., description="Total number of audit logs matching filters")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")


class AuditLogSearchFilters(BaseModel):
    """Schema for audit log search and filtering parameters."""
    user_id: Optional[int] = Field(None, description="Filter by user ID")
    entity_type: Optional[str] = Field(None, description="Filter by entity type")
    entity_id: Optional[str] = Field(None, description="Filter by entity ID")
    action: Optional[str] = Field(None, description="Filter by action")
    start_date: Optional[datetime] = Field(None, description="Filter logs after this date")
    end_date: Optional[datetime] = Field(None, description="Filter logs before this date")
    page: int = Field(1, ge=1, description="Page number for pagination")
    per_page: int = Field(50, ge=1, le=200, description="Number of items per page")


class AuditLogExportRequest(BaseModel):
    """Schema for audit log export request."""
    user_id: Optional[int] = Field(None, description="Filter by user ID")
    entity_type: Optional[str] = Field(None, description="Filter by entity type")
    entity_id: Optional[str] = Field(None, description="Filter by entity ID")
    action: Optional[str] = Field(None, description="Filter by action")
    start_date: Optional[datetime] = Field(None, description="Filter logs after this date")
    end_date: Optional[datetime] = Field(None, description="Filter logs before this date")
    format: str = Field("csv", pattern="^(csv|json|xlsx)$", description="Export format")
    include_details: bool = Field(True, description="Include detailed information in export")


class AuditLogStatsResponse(BaseModel):
    """Schema for audit log statistics."""
    total_logs: int = Field(..., description="Total number of audit logs")
    logs_today: int = Field(..., description="Number of logs created today")
    logs_this_week: int = Field(..., description="Number of logs created this week")
    logs_this_month: int = Field(..., description="Number of logs created this month")
    top_actions: List[Dict[str, Any]] = Field(..., description="Most frequent actions")
    top_users: List[Dict[str, Any]] = Field(..., description="Most active users")
    top_entities: List[Dict[str, Any]] = Field(..., description="Most frequently modified entities")


class EntityAuditTrailResponse(BaseModel):
    """Schema for entity-specific audit trail."""
    entity_type: str = Field(..., description="Type of entity")
    entity_id: str = Field(..., description="ID of the entity")
    audit_logs: List[AuditLogDetailResponse] = Field(..., description="Chronological audit trail")
    total_actions: int = Field(..., description="Total number of actions on this entity")
    first_action_date: Optional[datetime] = Field(None, description="Date of first action")
    last_action_date: Optional[datetime] = Field(None, description="Date of last action")


class UserActivityResponse(BaseModel):
    """Schema for user activity summary."""
    user_id: int = Field(..., description="User ID")
    user_name: Optional[str] = Field(None, description="User name")
    user_email: Optional[str] = Field(None, description="User email")
    user_role: Optional[str] = Field(None, description="User role")
    recent_activities: List[AuditLogResponse] = Field(..., description="Recent activities by the user")
    total_actions: int = Field(..., description="Total number of actions by the user")
    actions_today: int = Field(..., description="Number of actions today")
    actions_this_week: int = Field(..., description="Number of actions this week")
    most_frequent_actions: List[Dict[str, Any]] = Field(..., description="Most frequent actions by the user")