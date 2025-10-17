"""
Workflow history schemas for API requests and responses.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class WorkflowHistoryBase(BaseModel):
    """Base workflow history schema."""
    entity_type: str = Field(..., description="Type of entity (review, exception, etc.)")
    entity_id: int = Field(..., description="ID of the entity")
    action: str = Field(..., description="Action performed")
    from_status: Optional[str] = Field(None, description="Previous status")
    to_status: Optional[str] = Field(None, description="New status")
    comments: Optional[str] = Field(None, description="User comments")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional context data")


class WorkflowHistoryCreate(WorkflowHistoryBase):
    """Schema for creating workflow history entries."""
    user_id: int = Field(..., description="ID of user performing action")


class WorkflowHistoryResponse(WorkflowHistoryBase):
    """Schema for workflow history API responses."""
    id: int
    user_id: int
    user_name: str
    user_role: str
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    class Config:
        from_attributes = True


class WorkflowHistoryDetail(WorkflowHistoryResponse):
    """Detailed workflow history with additional computed fields."""
    description: str = Field(..., description="Human-readable action description")
    is_status_change: bool = Field(..., description="Whether this represents a status change")
    status_direction: Optional[str] = Field(None, description="Direction of status change")
    time_since: str = Field(..., description="Human-readable time since action")


class WorkflowHistoryFilters(BaseModel):
    """Filters for searching workflow history."""
    entity_type: Optional[str] = Field(None, description="Filter by entity type")
    entity_id: Optional[int] = Field(None, description="Filter by entity ID")
    action: Optional[str] = Field(None, description="Filter by action")
    user_id: Optional[int] = Field(None, description="Filter by user ID")
    from_date: Optional[datetime] = Field(None, description="Filter from this date")
    to_date: Optional[datetime] = Field(None, description="Filter to this date")
    status_changes_only: bool = Field(False, description="Show only status changes")


class WorkflowHistoryListResponse(BaseModel):
    """Response schema for paginated workflow history."""
    items: List[WorkflowHistoryResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class WorkflowTimelineEntry(BaseModel):
    """Timeline entry for entity workflow history."""
    id: int
    timestamp: datetime
    action: str
    description: str
    user_name: str
    user_role: str
    comments: Optional[str] = None
    is_status_change: bool
    status_direction: Optional[str] = None
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    time_since: str
    metadata: Optional[Dict[str, Any]] = None


class WorkflowTimelineResponse(BaseModel):
    """Response schema for entity workflow timeline."""
    entity_type: str
    entity_id: int
    timeline: List[WorkflowTimelineEntry]
    total_entries: int


class WorkflowStatistics(BaseModel):
    """Workflow statistics for dashboard/reporting."""
    total_actions: int
    status_changes: int
    actions_by_type: Dict[str, int]
    active_users: List[Dict[str, Any]]
    daily_activity: List[Dict[str, Any]]
    period_days: int


class NotificationPreferences(BaseModel):
    """User preferences for workflow notifications."""
    email_enabled: bool = Field(True, description="Enable email notifications")
    in_app_enabled: bool = Field(True, description="Enable in-app notifications")
    notify_on_submission: bool = Field(True, description="Notify when reviews are submitted")
    notify_on_approval: bool = Field(True, description="Notify when reviews are approved")
    notify_on_rejection: bool = Field(True, description="Notify when reviews are rejected")
    notify_on_assignment: bool = Field(True, description="Notify when assigned to review")
    notify_on_exception: bool = Field(True, description="Notify about exceptions")
    digest_frequency: str = Field("daily", description="Frequency for digest emails")


class WorkflowNotification(BaseModel):
    """Workflow notification schema."""
    id: str
    type: str = Field(..., description="Type of notification")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    entity_type: str = Field(..., description="Related entity type")
    entity_id: int = Field(..., description="Related entity ID")
    user_id: int = Field(..., description="Target user ID")
    created_at: datetime
    read_at: Optional[datetime] = None
    action_url: Optional[str] = Field(None, description="URL for related action")
    metadata: Optional[Dict[str, Any]] = None


class WorkflowNotificationCreate(BaseModel):
    """Schema for creating workflow notifications."""
    type: str
    title: str
    message: str
    entity_type: str
    entity_id: int
    user_id: int
    action_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class WorkflowNotificationUpdate(BaseModel):
    """Schema for updating workflow notifications."""
    read_at: Optional[datetime] = None


class WorkflowNotificationListResponse(BaseModel):
    """Response schema for paginated workflow notifications."""
    items: List[WorkflowNotification]
    total: int
    unread_count: int
    page: int
    per_page: int
    total_pages: int