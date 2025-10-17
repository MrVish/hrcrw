"""
Audit log API endpoints for compliance tracking and reporting.
"""
import csv
import json
from io import StringIO
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.auth import (
    get_current_user,
    require_checker_role,
    require_admin_role,
    require_maker_or_checker_role
)
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.audit import (
    AuditLogResponse,
    AuditLogDetailResponse,
    AuditLogListResponse,
    AuditLogSearchFilters,
    AuditLogExportRequest,
    AuditLogStatsResponse,
    EntityAuditTrailResponse,
    UserActivityResponse
)
from app.services.audit import AuditService


router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs", response_model=AuditLogListResponse)
async def get_audit_logs(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    entity_id: Optional[str] = Query(None, description="Filter by entity ID"),
    action: Optional[str] = Query(None, description="Filter by action"),
    start_date: Optional[datetime] = Query(None, description="Filter logs after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter logs before this date"),
    page: int = Query(1, ge=1, description="Page number for pagination"),
    per_page: int = Query(50, ge=1, le=200, description="Number of items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_or_checker_role)
):
    """
    Get audit logs with filtering and pagination.
    
    Accessible by Makers, Checkers, and Admins for compliance monitoring.
    """
    # Create search filters
    filters = AuditLogSearchFilters(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        start_date=start_date,
        end_date=end_date,
        page=page,
        per_page=per_page
    )
    
    # Get audit logs using service
    audit_service = AuditService(db)
    audit_logs, total_count = audit_service.get_audit_logs(
        user_id=filters.user_id,
        entity_type=filters.entity_type,
        entity_id=filters.entity_id,
        action=filters.action,
        start_date=filters.start_date,
        end_date=filters.end_date,
        page=filters.page,
        per_page=filters.per_page
    )
    
    # Calculate pagination info
    total_pages = (total_count + per_page - 1) // per_page
    
    # Enrich audit logs with user information
    detailed_logs = []
    for log in audit_logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        
        log_detail = AuditLogDetailResponse(
            id=log.id,
            user_id=log.user_id,
            entity_type=log.entity_type.value,
            entity_id=log.entity_id,
            action=log.action.value,
            created_at=log.created_at,
            details=log.details or {},
            user_name=user.name if user else None,
            user_email=user.email if user else None,
            user_role=user.role.value if user else None
        )
        detailed_logs.append(log_detail)
    
    return AuditLogListResponse(
        audit_logs=detailed_logs,
        total=total_count,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.get("/logs/statistics", response_model=AuditLogStatsResponse)
async def get_audit_log_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Get audit log statistics for dashboard and reporting.
    
    Accessible by Checkers and Admins for compliance monitoring.
    """
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = today_start.replace(day=1)
    
    # Get basic counts
    total_logs = db.query(func.count(AuditLog.id)).scalar() or 0
    
    logs_today = db.query(func.count(AuditLog.id)).filter(
        AuditLog.created_at >= today_start
    ).scalar() or 0
    
    logs_this_week = db.query(func.count(AuditLog.id)).filter(
        AuditLog.created_at >= week_start
    ).scalar() or 0
    
    logs_this_month = db.query(func.count(AuditLog.id)).filter(
        AuditLog.created_at >= month_start
    ).scalar() or 0
    
    # Get top actions
    top_actions_query = db.query(
        AuditLog.action,
        func.count(AuditLog.id).label('count')
    ).group_by(AuditLog.action).order_by(desc('count')).limit(10).all()
    
    top_actions = [
        {"action": action.value, "count": count}
        for action, count in top_actions_query
    ]
    
    # Get top users
    top_users_query = db.query(
        AuditLog.user_id,
        func.count(AuditLog.id).label('count')
    ).group_by(AuditLog.user_id).order_by(desc('count')).limit(10).all()
    
    top_users = []
    for user_id, count in top_users_query:
        user = db.query(User).filter(User.id == user_id).first()
        top_users.append({
            "user_id": user_id,
            "user_name": user.name if user else f"User {user_id}",
            "count": count
        })
    
    # Get top entities
    top_entities_query = db.query(
        AuditLog.entity_type,
        func.count(AuditLog.id).label('count')
    ).group_by(AuditLog.entity_type).order_by(desc('count')).limit(10).all()
    
    top_entities = [
        {"entity_type": entity_type.value, "count": count}
        for entity_type, count in top_entities_query
    ]
    
    return AuditLogStatsResponse(
        total_logs=total_logs,
        logs_today=logs_today,
        logs_this_week=logs_this_week,
        logs_this_month=logs_this_month,
        top_actions=top_actions,
        top_users=top_users,
        top_entities=top_entities
    )


@router.get("/logs/advanced-search", response_model=AuditLogListResponse)
async def advanced_search_audit_logs(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    entity_id: Optional[str] = Query(None, description="Filter by entity ID"),
    action: Optional[str] = Query(None, description="Filter by action"),
    success_filter: Optional[bool] = Query(None, description="Filter by success status"),
    start_date: Optional[datetime] = Query(None, description="Filter logs after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter logs before this date"),
    ip_address: Optional[str] = Query(None, description="Filter by IP address"),
    search_text: Optional[str] = Query(None, description="Full-text search in description and details"),
    tags: Optional[str] = Query(None, description="Comma-separated list of tags to search for"),
    category: Optional[str] = Query(None, description="Filter by category"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    page: int = Query(1, ge=1, description="Page number for pagination"),
    per_page: int = Query(50, ge=1, le=200, description="Number of items per page"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Advanced search for audit logs with multiple filters.
    
    Accessible by Checkers and Admins for detailed audit investigation.
    """
    # Parse tags if provided
    tag_list = None
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
    
    # Perform advanced search
    audit_service = AuditService(db)
    audit_logs, total_count = audit_service.advanced_search_audit_logs(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        success_filter=success_filter,
        start_date=start_date,
        end_date=end_date,
        ip_address=ip_address,
        search_text=search_text,
        tags=tag_list,
        category=category,
        severity=severity,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    # Calculate pagination info
    total_pages = (total_count + per_page - 1) // per_page
    
    # Enrich audit logs with user information
    detailed_logs = []
    for log in audit_logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        
        log_detail = AuditLogDetailResponse(
            id=log.id,
            user_id=log.user_id,
            entity_type=log.entity_type.value,
            entity_id=log.entity_id,
            action=log.action.value,
            created_at=log.created_at,
            details=log.details or {},
            user_name=user.name if user else None,
            user_email=user.email if user else None,
            user_role=user.role.value if user else None
        )
        detailed_logs.append(log_detail)
    
    return AuditLogListResponse(
        audit_logs=detailed_logs,
        total=total_count,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.get("/logs/export")
async def export_audit_logs(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    entity_id: Optional[str] = Query(None, description="Filter by entity ID"),
    action: Optional[str] = Query(None, description="Filter by action"),
    start_date: Optional[datetime] = Query(None, description="Filter logs after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter logs before this date"),
    format: str = Query("csv", pattern="^(csv|json|xml)$", description="Export format"),
    include_details: bool = Query(True, description="Include detailed information"),
    max_records: int = Query(10000, ge=1, le=50000, description="Maximum number of records to export"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Export audit logs in various formats with advanced filtering.
    
    Accessible only by Admins for compliance reporting.
    """
    audit_service = AuditService(db)
    
    # Export audit logs using the service
    export_data = audit_service.export_audit_logs(
        format=format,
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        start_date=start_date,
        end_date=end_date,
        include_details=include_details,
        max_records=max_records
    )
    
    # Determine media type and filename
    if format == "csv":
        media_type = "text/csv"
        filename = "audit_logs.csv"
    elif format == "json":
        media_type = "application/json"
        filename = "audit_logs.json"
    elif format == "xml":
        media_type = "application/xml"
        filename = "audit_logs.xml"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported export format: {format}"
        )
    
    response = StreamingResponse(
        iter([export_data]),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
    return response


@router.get("/logs/compliance-report")
async def get_compliance_report(
    start_date: datetime = Query(..., description="Start date for the report"),
    end_date: datetime = Query(..., description="End date for the report"),
    entity_types: Optional[str] = Query(None, description="Comma-separated list of entity types to include"),
    format: str = Query("json", pattern="^(json|csv)$", description="Report format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Generate a comprehensive compliance report for audit logs.
    
    Accessible only by Admins for regulatory compliance.
    """
    # Parse entity types if provided
    entity_type_list = None
    if entity_types:
        entity_type_list = [et.strip() for et in entity_types.split(",") if et.strip()]
    
    audit_service = AuditService(db)
    report_data = audit_service.get_compliance_report(
        start_date=start_date,
        end_date=end_date,
        entity_types=entity_type_list
    )
    
    if format == "json":
        return report_data
    elif format == "csv":
        # Convert report to CSV format
        csv_data = []
        
        # Summary section
        csv_data.append(["COMPLIANCE REPORT SUMMARY"])
        csv_data.append(["Report Period", f"{start_date.date()} to {end_date.date()}"])
        csv_data.append(["Total Actions", report_data["summary"]["total_actions"]])
        csv_data.append(["User Actions", report_data["summary"]["user_actions"]])
        csv_data.append(["System Actions", report_data["summary"]["system_actions"]])
        csv_data.append(["Failed Actions", report_data["summary"]["failed_actions"]])
        csv_data.append(["Success Rate", f"{report_data['summary']['success_rate']}%"])
        csv_data.append([])
        
        # Actions by type
        csv_data.append(["ACTIONS BY TYPE"])
        csv_data.append(["Action", "Count"])
        for action, count in report_data["actions_by_type"].items():
            csv_data.append([action, count])
        csv_data.append([])
        
        # Compliance indicators
        csv_data.append(["COMPLIANCE INDICATORS"])
        csv_data.append(["Indicator", "Count"])
        for indicator, count in report_data["compliance_indicators"].items():
            csv_data.append([indicator.replace("_", " ").title(), count])
        
        # Convert to CSV string
        output = StringIO()
        writer = csv.writer(output)
        writer.writerows(csv_data)
        
        response = StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=compliance_report.csv"}
        )
        return response


@router.get("/entities/{entity_type}/{entity_id}", response_model=EntityAuditTrailResponse)
async def get_entity_audit_trail(
    entity_type: str,
    entity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_or_checker_role)
):
    """
    Get complete audit trail for a specific entity.
    
    Accessible by Makers, Checkers, and Admins for entity tracking.
    """
    audit_service = AuditService(db)
    audit_logs = audit_service.get_entity_audit_trail(entity_type, entity_id)
    
    if not audit_logs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No audit trail found for {entity_type} with ID {entity_id}"
        )
    
    # Enrich audit logs with user information
    detailed_logs = []
    for log in audit_logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        
        log_detail = AuditLogDetailResponse(
            id=log.id,
            user_id=log.user_id,
            entity_type=log.entity_type.value,
            entity_id=log.entity_id,
            action=log.action.value,
            created_at=log.created_at,
            details=log.details or {},
            user_name=user.name if user else None,
            user_email=user.email if user else None,
            user_role=user.role.value if user else None
        )
        detailed_logs.append(log_detail)
    
    # Calculate summary statistics
    first_action_date = min(log.created_at for log in audit_logs) if audit_logs else None
    last_action_date = max(log.created_at for log in audit_logs) if audit_logs else None
    
    return EntityAuditTrailResponse(
        entity_type=entity_type,
        entity_id=entity_id,
        audit_logs=detailed_logs,
        total_actions=len(audit_logs),
        first_action_date=first_action_date,
        last_action_date=last_action_date
    )


@router.get("/users/{user_id}/activity", response_model=UserActivityResponse)
async def get_user_activity(
    user_id: int,
    limit: int = Query(100, ge=1, le=500, description="Maximum number of recent activities"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Get activity summary for a specific user.
    
    Accessible by Checkers and Admins for user monitoring.
    """
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check permissions - users can view their own activity, admins can view any
    if user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only view your own activity."
        )
    
    audit_service = AuditService(db)
    recent_activities = audit_service.get_user_activity(user_id, limit)
    
    # Calculate activity statistics
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    
    total_actions = db.query(func.count(AuditLog.id)).filter(
        AuditLog.user_id == user_id
    ).scalar() or 0
    
    actions_today = db.query(func.count(AuditLog.id)).filter(
        and_(
            AuditLog.user_id == user_id,
            AuditLog.created_at >= today_start
        )
    ).scalar() or 0
    
    actions_this_week = db.query(func.count(AuditLog.id)).filter(
        and_(
            AuditLog.user_id == user_id,
            AuditLog.created_at >= week_start
        )
    ).scalar() or 0
    
    # Get most frequent actions
    frequent_actions_query = db.query(
        AuditLog.action,
        func.count(AuditLog.id).label('count')
    ).filter(AuditLog.user_id == user_id).group_by(
        AuditLog.action
    ).order_by(desc('count')).limit(10).all()
    
    most_frequent_actions = [
        {"action": action.value, "count": count}
        for action, count in frequent_actions_query
    ]
    
    # Convert audit logs to response format
    activity_responses = []
    for log in recent_activities:
        activity_responses.append(AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            entity_type=log.entity_type.value,
            entity_id=log.entity_id,
            action=log.action.value,
            created_at=log.created_at,
            details=log.details or {}
        ))
    
    return UserActivityResponse(
        user_id=user_id,
        user_name=user.name,
        user_email=user.email,
        user_role=user.role.value,
        recent_activities=activity_responses,
        total_actions=total_actions,
        actions_today=actions_today,
        actions_this_week=actions_this_week,
        most_frequent_actions=most_frequent_actions
    )


@router.get("/logs/{log_id}", response_model=AuditLogDetailResponse)
async def get_audit_log_detail(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_or_checker_role)
):
    """
    Get detailed information for a specific audit log entry.
    
    Accessible by Makers, Checkers, and Admins for detailed investigation.
    """
    audit_log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    
    if not audit_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit log entry not found"
        )
    
    # Get user information
    user = db.query(User).filter(User.id == audit_log.user_id).first()
    
    return AuditLogDetailResponse(
        id=audit_log.id,
        user_id=audit_log.user_id,
        entity_type=audit_log.entity_type.value,
        entity_id=audit_log.entity_id,
        action=audit_log.action.value,
        created_at=audit_log.created_at,
        details=audit_log.details or {},
        user_name=user.name if user else None,
        user_email=user.email if user else None,
        user_role=user.role.value if user else None
    )


@router.get("/logs/advanced-statistics")
async def get_advanced_audit_statistics(
    start_date: Optional[datetime] = Query(None, description="Start date for statistics"),
    end_date: Optional[datetime] = Query(None, description="End date for statistics"),
    group_by: str = Query("day", pattern="^(day|week|month)$", description="Grouping period"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Get advanced audit statistics with time-based grouping.
    
    Accessible by Checkers and Admins for detailed analytics.
    """
    audit_service = AuditService(db)
    statistics = audit_service.get_audit_statistics(
        start_date=start_date,
        end_date=end_date,
        group_by=group_by
    )
    
    return statistics


@router.post("/logs/retention-policy")
async def apply_retention_policy(
    retention_days: int = Query(2555, ge=1, description="Number of days to retain logs (default: 7 years)"),
    archive_before_delete: bool = Query(True, description="Whether to archive logs before deletion"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Apply audit log retention policy.
    
    Accessible only by Admins for data management.
    """
    audit_service = AuditService(db)
    retention_results = audit_service.implement_retention_policy(
        retention_days=retention_days,
        archive_before_delete=archive_before_delete
    )
    
    return {
        "message": "Retention policy applied successfully",
        "results": retention_results
    }


@router.get("/logs/search-suggestions")
async def get_search_suggestions(
    field: str = Query(..., pattern="^(action|entity_type|category|severity|tags)$", description="Field to get suggestions for"),
    query: Optional[str] = Query(None, description="Partial query to filter suggestions"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of suggestions"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_or_checker_role)
):
    """
    Get search suggestions for audit log fields.
    
    Accessible by Makers, Checkers, and Admins for improved search experience.
    """
    suggestions = []
    
    if field == "action":
        # Get all available actions
        from app.models.audit_log import AuditAction
        suggestions = [action.value for action in AuditAction]
        if query:
            suggestions = [s for s in suggestions if query.lower() in s.lower()]
    
    elif field == "entity_type":
        # Get all available entity types
        from app.models.audit_log import AuditEntityType
        suggestions = [entity_type.value for entity_type in AuditEntityType]
        if query:
            suggestions = [s for s in suggestions if query.lower() in s.lower()]
    
    elif field in ["category", "severity", "tags"]:
        # Get unique values from audit log details
        if field == "tags":
            # This would require a more complex query to extract tags from JSON
            # For now, return common tags
            suggestions = ["authentication", "security", "compliance", "business", "system"]
        elif field == "category":
            suggestions = ["business", "security", "compliance", "system"]
        elif field == "severity":
            suggestions = ["info", "warning", "error", "critical"]
        
        if query:
            suggestions = [s for s in suggestions if query.lower() in s.lower()]
    
    return {
        "field": field,
        "suggestions": suggestions[:limit]
    }