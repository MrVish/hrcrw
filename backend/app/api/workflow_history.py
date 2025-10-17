"""
Workflow history API endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.auth import get_current_user, require_admin_role
from app.models.user import User
from app.schemas.workflow_history import (
    WorkflowHistoryResponse,
    WorkflowHistoryListResponse,
    WorkflowHistoryFilters,
    WorkflowTimelineResponse,
    WorkflowStatistics,
    WorkflowNotification,
    WorkflowNotificationListResponse,
    NotificationPreferences
)
from app.services.workflow_history import WorkflowHistoryService


router = APIRouter(prefix="/workflow-history", tags=["workflow-history"])


@router.get("/entity/{entity_type}/{entity_id}", response_model=WorkflowTimelineResponse)
async def get_entity_timeline(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get workflow timeline for a specific entity.
    
    Returns chronological history of all actions performed on the entity.
    """
    # Validate entity type
    valid_entity_types = ['review', 'exception', 'document']
    if entity_type not in valid_entity_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid entity type. Must be one of: {', '.join(valid_entity_types)}"
        )
    
    # TODO: Add permission checks based on entity type and user role
    # For now, allow all authenticated users to view history
    
    workflow_service = WorkflowHistoryService(db)
    timeline = workflow_service.get_entity_timeline(entity_type, entity_id)
    
    return WorkflowTimelineResponse(
        entity_type=entity_type,
        entity_id=entity_id,
        timeline=timeline,
        total_entries=len(timeline)
    )


@router.get("/search", response_model=WorkflowHistoryListResponse)
async def search_workflow_history(
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    entity_id: Optional[int] = Query(None, description="Filter by entity ID"),
    action: Optional[str] = Query(None, description="Filter by action"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    from_date: Optional[datetime] = Query(None, description="Filter from this date"),
    to_date: Optional[datetime] = Query(None, description="Filter to this date"),
    status_changes_only: bool = Query(False, description="Show only status changes"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Search workflow history with filters and pagination.
    
    Accessible only by administrators for audit and compliance purposes.
    """
    filters = WorkflowHistoryFilters(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        user_id=user_id,
        from_date=from_date,
        to_date=to_date,
        status_changes_only=status_changes_only
    )
    
    workflow_service = WorkflowHistoryService(db)
    entries, total_count = workflow_service.search_history(filters, page, per_page)
    
    # Calculate pagination info
    total_pages = (total_count + per_page - 1) // per_page
    
    return WorkflowHistoryListResponse(
        items=[WorkflowHistoryResponse.from_orm(entry) for entry in entries],
        total=total_count,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.get("/user/{user_id}/activity", response_model=List[WorkflowHistoryResponse])
async def get_user_activity(
    user_id: int,
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get recent workflow activity for a user.
    
    Users can view their own activity, admins can view any user's activity.
    """
    # Permission check: users can only view their own activity unless they're admin
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own activity"
        )
    
    workflow_service = WorkflowHistoryService(db)
    activity = workflow_service.get_user_activity(user_id, days, entity_type)
    
    return [WorkflowHistoryResponse.from_orm(entry) for entry in activity]


@router.get("/statistics", response_model=WorkflowStatistics)
async def get_workflow_statistics(
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Get workflow statistics for dashboard and reporting.
    
    Accessible only by administrators.
    """
    workflow_service = WorkflowHistoryService(db)
    stats = workflow_service.get_workflow_statistics(entity_type, days)
    
    return WorkflowStatistics(**stats)


@router.post("/cleanup")
async def cleanup_old_history(
    days_to_keep: int = Query(365, ge=30, description="Number of days of history to retain"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Clean up old workflow history entries.
    
    Accessible only by administrators for maintenance purposes.
    """
    workflow_service = WorkflowHistoryService(db)
    deleted_count = workflow_service.cleanup_old_history(days_to_keep)
    
    return {
        "message": f"Successfully cleaned up {deleted_count} old workflow history entries",
        "deleted_count": deleted_count,
        "days_retained": days_to_keep
    }


# Notification endpoints
@router.get("/notifications", response_model=WorkflowNotificationListResponse)
async def get_user_notifications(
    unread_only: bool = Query(False, description="Show only unread notifications"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=50, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get workflow notifications for the current user.
    """
    # TODO: Implement notification service
    # For now, return empty response
    return WorkflowNotificationListResponse(
        items=[],
        total=0,
        unread_count=0,
        page=page,
        per_page=per_page,
        total_pages=0
    )


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark a notification as read.
    """
    # TODO: Implement notification service
    return {"message": "Notification marked as read"}


@router.patch("/notifications/read-all")
async def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark all notifications as read for the current user.
    """
    # TODO: Implement notification service
    return {"message": "All notifications marked as read"}


@router.get("/notifications/preferences", response_model=NotificationPreferences)
async def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get notification preferences for the current user.
    """
    # TODO: Implement user preferences storage
    # For now, return default preferences
    return NotificationPreferences()


@router.put("/notifications/preferences", response_model=NotificationPreferences)
async def update_notification_preferences(
    preferences: NotificationPreferences,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update notification preferences for the current user.
    """
    # TODO: Implement user preferences storage
    return preferences