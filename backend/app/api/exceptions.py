"""
ReviewException management API endpoints.
"""
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.auth import (
    get_current_user,
    require_checker_role,
    require_maker_or_checker_role,
    require_admin_role
)
from app.models.user import User
from app.models.exception import ExceptionType, ExceptionStatus, ExceptionPriority
from app.schemas.exception import (
    ReviewExceptionResponse,
    ReviewExceptionDetailResponse,
    ReviewExceptionListResponse,
    ReviewExceptionCreate,
    ReviewExceptionUpdate,
    ReviewExceptionResolve,
    ReviewExceptionStatusUpdate,
    ReviewExceptionSearchFilters,
    ReviewExceptionStatsResponse
)
from app.services.exception import ReviewExceptionService
from app.services.audit import AuditService


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/exceptions", tags=["exceptions"])


@router.get("", response_model=ReviewExceptionListResponse)
async def get_exceptions(
    review_id: Optional[int] = Query(None, description="Filter by review ID"),
    exception_type: Optional[ExceptionType] = Query(None, description="Filter by exception type"),
    priority: Optional[ExceptionPriority] = Query(None, description="Filter by priority"),
    status: Optional[ExceptionStatus] = Query(None, description="Filter by status"),
    created_by: Optional[int] = Query(None, description="Filter by creator user ID"),
    resolved_by: Optional[int] = Query(None, description="Filter by resolver user ID"),
    assigned_to: Optional[int] = Query(None, description="Filter by assigned user ID"),
    due_after: Optional[datetime] = Query(None, description="Filter exceptions due after this date"),
    due_before: Optional[datetime] = Query(None, description="Filter exceptions due before this date"),
    created_after: Optional[datetime] = Query(None, description="Filter exceptions created after this date"),
    created_before: Optional[datetime] = Query(None, description="Filter exceptions created before this date"),
    resolved_after: Optional[datetime] = Query(None, description="Filter exceptions resolved after this date"),
    resolved_before: Optional[datetime] = Query(None, description="Filter exceptions resolved before this date"),
    page: int = Query(1, ge=1, description="Page number for pagination"),
    per_page: int = Query(20, ge=1, le=100, description="Number of items per page"),
    sort_by: Optional[str] = Query("created_at", description="Field to sort by"),
    sort_order: Optional[str] = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get review exceptions with filtering and pagination.
    
    Accessible by Makers, Checkers, and Admins with role-based filtering.
    """
    # Create search filters
    filters = ReviewExceptionSearchFilters(
        review_id=review_id,
        exception_type=exception_type,
        priority=priority,
        status=status,
        created_by=created_by,
        resolved_by=resolved_by,
        assigned_to=assigned_to,
        due_after=due_after,
        due_before=due_before,
        created_after=created_after,
        created_before=created_before,
        resolved_after=resolved_after,
        resolved_before=resolved_before,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    # Get exceptions using service
    exception_service = ReviewExceptionService(db)
    exceptions, total_count = exception_service.search_exceptions(filters)
    
    # Filter results based on user permissions if not admin
    if not current_user.is_admin:
        filtered_exceptions = []
        for exception in exceptions:
            # Check if user has access to this exception
            if (current_user.is_checker or 
                exception.created_by == current_user.id or 
                exception.resolved_by == current_user.id or
                (exception.review and exception.review.submitted_by == current_user.id)):
                filtered_exceptions.append(exception)
        
        exceptions = filtered_exceptions
        total_count = len(exceptions)
    
    # Calculate pagination info
    total_pages = (total_count + per_page - 1) // per_page
    
    # Convert to response models with detailed information
    exception_responses = []
    for exception in exceptions:
        # Create detailed response with client and user information
        # Get assigned user name if assigned
        assigned_to_name = None
        if exception.assigned_to and exception.assignee:
            assigned_to_name = exception.assignee.name

        # Safely extract client information
        client_name = 'Unknown Client'
        client_id = None
        review_status = None
        
        if exception.review:
            review_status = exception.review.status.value if exception.review.status else None
            client_id = exception.review.client_id
            
            if exception.review.client:
                client_name = exception.review.client.name
            else:
                # If client relationship is not loaded, try to get client by ID
                from app.models.client import Client
                client = db.query(Client).filter(Client.client_id == exception.review.client_id).first()
                if client:
                    client_name = client.name
                else:
                    logger.warning(f"Client not found for client_id: {exception.review.client_id}")
        else:
            logger.warning(f"Review not found for exception {exception.id}")

        exception_dict = {
            'id': exception.id,
            'review_id': exception.review_id,
            'created_by': exception.created_by,
            'resolved_by': exception.resolved_by,
            'assigned_to': exception.assigned_to,
            'exception_type': exception.exception_type,
            'title': exception.title,
            'description': exception.description,
            'priority': exception.priority,
            'status': exception.status,
            'due_date': exception.due_date,
            'resolution_notes': exception.resolution_notes,
            'resolved_at': exception.resolved_at,
            'created_at': exception.created_at,
            'updated_at': exception.updated_at,
            'client_name': client_name,
            'client_id': client_id,
            'review_client_id': client_id,
            'review_status': review_status,
            'creator_name': exception.creator.name if exception.creator else None,
            'resolver_name': exception.resolver.name if exception.resolver else None,
            'assigned_to_name': assigned_to_name,
            'is_open': exception.is_open,
            'is_in_progress': exception.is_in_progress,
            'is_resolved': exception.is_resolved,
            'is_closed': exception.is_closed,
            'is_active': exception.is_active,
            'is_high_priority': exception.is_high_priority,
            'is_critical': exception.is_critical,
            'is_overdue': exception.is_overdue
        }
        exception_responses.append(ReviewExceptionDetailResponse.model_validate(exception_dict))
    
    return ReviewExceptionListResponse(
        exceptions=exception_responses,
        total=total_count,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.get("/open", response_model=List[ReviewExceptionResponse])
async def get_open_exceptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all open exceptions.
    
    Accessible by Makers, Checkers, and Admins for workflow management.
    """
    exception_service = ReviewExceptionService(db)
    exceptions = exception_service.get_open_exceptions()
    
    # Filter based on user permissions if not admin
    if not current_user.is_admin:
        filtered_exceptions = []
        for exception in exceptions:
            if (current_user.is_checker or 
                exception.created_by == current_user.id or 
                exception.resolved_by == current_user.id or
                (exception.review and exception.review.submitted_by == current_user.id)):
                filtered_exceptions.append(exception)
        exceptions = filtered_exceptions
    
    return [ReviewExceptionResponse.model_validate(exception) for exception in exceptions]


@router.get("/statistics", response_model=ReviewExceptionStatsResponse)
async def get_exception_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get exception statistics for dashboard.
    
    Accessible by Makers, Checkers, and Admins for monitoring.
    """
    exception_service = ReviewExceptionService(db)
    stats = exception_service.get_exception_statistics()
    
    return ReviewExceptionStatsResponse(**stats)


@router.get("/{exception_id}", response_model=ReviewExceptionDetailResponse)
async def get_exception_detail(
    exception_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed exception information including related data.
    
    Accessible by users with appropriate permissions.
    """
    exception_service = ReviewExceptionService(db)
    exception_detail = exception_service.get_exception_detail(exception_id)
    
    if not exception_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exception not found"
        )
    
    exception = exception_detail["exception"]
    
    # Check permissions
    if not current_user.is_admin:
        has_access = (
            current_user.is_checker or
            exception.created_by == current_user.id or
            exception.resolved_by == current_user.id or
            (exception.review and exception.review.submitted_by == current_user.id)
        )
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You don't have permission to view this exception."
            )
    
    # Create response with exception data and related information
    exception_dict = {
        'id': exception.id,
        'review_id': exception.review_id,
        'created_by': exception.created_by,
        'resolved_by': exception.resolved_by,
        'assigned_to': exception.assigned_to,
        'exception_type': exception.exception_type,
        'title': exception.title,
        'description': exception.description,
        'priority': exception.priority,
        'status': exception.status,
        'due_date': exception.due_date,
        'resolution_notes': exception.resolution_notes,
        'resolved_at': exception.resolved_at,
        'created_at': exception.created_at,
        'updated_at': exception.updated_at,
        'created_by_name': exception_detail["creator_name"],
        'creator_name': exception_detail["creator_name"],
        'resolved_by_name': exception_detail["resolver_name"],
        'assigned_to_name': exception_detail["assigned_to_name"],
        'is_open': exception.is_open,
        'is_in_progress': exception.is_in_progress,
        'is_resolved': exception.is_resolved,
        'is_closed': exception.is_closed,
        'is_active': exception.is_active,
        'is_high_priority': exception.is_high_priority,
        'is_critical': exception.is_critical,
        'is_overdue': exception.is_overdue
    }
    
    return ReviewExceptionDetailResponse(
        **exception_dict,
        review_client_id=exception_detail["review_client_id"],
        review_status=exception_detail["review_status"],
        client_id=exception_detail["client_id"],
        client_name=exception_detail["client_name"]
    )


# Review-specific exception endpoints
@router.post("/reviews/{review_id}/exceptions", response_model=ReviewExceptionResponse, status_code=status.HTTP_201_CREATED)
async def create_exception_for_review(
    review_id: int,
    exception_data: ReviewExceptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_or_checker_role)
):
    """
    Create a new exception for a specific review.
    
    Accessible by Makers, Checkers, and Admins for exception management.
    Supports comprehensive exception data including title, priority, due_date, and assignment.
    """
    # Ensure the review_id in the URL matches the one in the data
    if exception_data.review_id != review_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review ID in URL must match review ID in request body"
        )
    
    try:
        # Initialize service with proper database transaction handling
        exception_service = ReviewExceptionService(db)
        
        # Create exception with enhanced validation
        exception = exception_service.create_exception(exception_data, current_user.id)
        
        # Refresh the exception to get all related data
        db.refresh(exception)
        
        # Get user names for response
        creator_name = current_user.name
        assigned_to_name = None
        
        if exception.assigned_to:
            assigned_user = db.query(User).filter(User.id == exception.assigned_to).first()
            if assigned_user:
                assigned_to_name = assigned_user.name
        
        # Create response with user names
        exception_dict = {
            'id': exception.id,
            'review_id': exception.review_id,
            'exception_type': exception.exception_type,
            'title': exception.title,
            'description': exception.description,
            'priority': exception.priority,
            'status': exception.status,
            'due_date': exception.due_date,
            'created_by': exception.created_by,
            'resolved_by': exception.resolved_by,
            'created_by_name': creator_name,
            'resolved_by_name': None,
            'assigned_to_name': assigned_to_name,
            'resolution_notes': exception.resolution_notes,
            'resolved_at': exception.resolved_at,
            'created_at': exception.created_at,
            'updated_at': exception.updated_at,
            'is_open': exception.is_open,
            'is_in_progress': exception.is_in_progress,
            'is_resolved': exception.is_resolved,
            'is_closed': exception.is_closed,
            'is_active': exception.is_active,
            'is_high_priority': exception.is_high_priority,
            'is_critical': exception.is_critical,
            'is_overdue': exception.is_overdue
        }
        
        return ReviewExceptionResponse.model_validate(exception_dict)
    
    except ValueError as e:
        # Provide detailed error messages for validation failures
        error_message = str(e)
        
        # Map common validation errors to more user-friendly messages
        if "not found" in error_message.lower():
            if "review" in error_message.lower():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Review with ID {review_id} not found"
                )
            elif "user" in error_message.lower():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Assigned user not found"
                )
        elif "permission" in error_message.lower() or "only" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_message
            )
        elif "maker-checker" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maker-checker violation: " + error_message
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
    
    except Exception as e:
        # Log unexpected errors and return generic message
        logger.error(f"Unexpected error creating exception: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while creating the exception"
        )


@router.post("/reviews/{review_id}/exceptions/bulk", response_model=List[ReviewExceptionResponse], status_code=status.HTTP_201_CREATED)
async def create_multiple_exceptions_for_review(
    review_id: int,
    exception_types: List[ExceptionType],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_or_checker_role)
):
    """
    Create multiple exceptions for a specific review.
    
    Accessible by Makers, Checkers, and Admins for bulk exception creation.
    """
    try:
        exception_service = ReviewExceptionService(db)
        exceptions = exception_service.create_exceptions_for_review(
            review_id, exception_types, current_user.id
        )
        
        return [ReviewExceptionResponse.model_validate(exception) for exception in exceptions]
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/reviews/{review_id}/exceptions", response_model=List[ReviewExceptionResponse])
async def get_exceptions_for_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all exceptions for a specific review.
    
    Accessible by users with appropriate permissions.
    """
    exception_service = ReviewExceptionService(db)
    exceptions = exception_service.get_exceptions_by_review(review_id)
    
    # Check permissions for the review
    if exceptions and not current_user.is_admin:
        # Check if user has access to this review
        first_exception = exceptions[0]
        has_access = (
            current_user.is_checker or
            first_exception.created_by == current_user.id or
            (first_exception.review and first_exception.review.submitted_by == current_user.id)
        )
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You don't have permission to view exceptions for this review."
            )
    
    return [ReviewExceptionResponse.model_validate(exception) for exception in exceptions]


@router.patch("/{exception_id}", response_model=ReviewExceptionResponse)
async def update_exception(
    exception_id: int,
    exception_data: ReviewExceptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing exception.
    
    Accessible by the exception creator, checkers, or admin.
    """
    try:
        exception_service = ReviewExceptionService(db)
        exception = exception_service.update_exception(exception_id, exception_data, current_user.id)
        
        if not exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exception not found"
            )
        
        return ReviewExceptionResponse.model_validate(exception)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{exception_id}/status", response_model=ReviewExceptionResponse)
async def update_exception_status(
    exception_id: int,
    status_data: ReviewExceptionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Update exception status.
    
    Accessible only by Checkers and Admins for status management.
    """
    try:
        exception_service = ReviewExceptionService(db)
        exception = exception_service.update_exception_status(
            exception_id, 
            status_data.status, 
            current_user.id
        )
        
        if not exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exception not found"
            )
        
        return ReviewExceptionResponse.model_validate(exception)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{exception_id}/resolve", response_model=ReviewExceptionResponse)
async def resolve_exception(
    exception_id: int,
    resolve_data: ReviewExceptionResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Resolve an exception.
    
    Accessible only by Checkers and Admins.
    """
    try:
        exception_service = ReviewExceptionService(db)
        exception = exception_service.resolve_exception(
            exception_id, 
            resolve_data.resolution_notes, 
            current_user.id
        )
        
        if not exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exception not found"
            )
        
        return ReviewExceptionResponse.model_validate(exception)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/my-created", response_model=List[ReviewExceptionResponse])
async def get_my_created_exceptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get exceptions created by the current user.
    
    Accessible by all authenticated users for personal task management.
    """
    exception_service = ReviewExceptionService(db)
    exceptions = exception_service.get_exceptions_by_creator(current_user.id)
    
    return [ReviewExceptionResponse.model_validate(exception) for exception in exceptions]


@router.get("/by-type/{exception_type}", response_model=List[ReviewExceptionResponse])
async def get_exceptions_by_type(
    exception_type: ExceptionType,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get exceptions by type.
    
    Accessible by Checkers and Admins for type-specific management.
    """
    if not current_user.is_checker and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only Checkers and Admins can view exceptions by type."
        )
    
    exception_service = ReviewExceptionService(db)
    exceptions = exception_service.get_exceptions_by_type(exception_type)
    
    return [ReviewExceptionResponse.model_validate(exception) for exception in exceptions]


@router.get("/{exception_id}/audit-trail")
async def get_exception_audit_trail(
    exception_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get audit trail for a specific exception.
    
    Accessible by users with appropriate permissions.
    """
    # Verify exception exists and check permissions
    exception_service = ReviewExceptionService(db)
    exception = exception_service.get_exception_by_id(exception_id)
    
    if not exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exception not found"
        )
    
    # Check permissions (same as get_exception_detail)
    if not current_user.is_admin:
        has_access = (
            current_user.is_checker or
            exception.created_by == current_user.id or
            exception.resolved_by == current_user.id or
            (exception.review and exception.review.submitted_by == current_user.id)
        )
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You don't have permission to view this exception's audit trail."
            )
    
    # Get audit trail
    audit_service = AuditService(db)
    audit_logs = audit_service.get_entity_audit_trail("ReviewException", str(exception_id))
    
    return {
        "exception_id": exception_id,
        "review_id": exception.review_id,
        "exception_type": exception.exception_type.value,
        "description": exception.description,
        "audit_trail": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "action": log.action,
                "timestamp": log.timestamp,
                "details": log.details
            }
            for log in audit_logs
        ]
    }

@router.post("/{exception_id}/approve", response_model=ReviewExceptionResponse)
async def approve_exception(
    exception_id: int,
    approve_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Approve an exception (maker-checker workflow).
    
    Accessible only by Checkers for completing the exception workflow.
    """
    try:
        exception_service = ReviewExceptionService(db)
        
        comments = approve_data.get("comments")
        exception = exception_service.approve_exception(exception_id, current_user.id, comments)
        
        if not exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exception not found"
            )
        
        return ReviewExceptionResponse.model_validate(exception)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{exception_id}/reject", response_model=ReviewExceptionResponse)
async def reject_exception(
    exception_id: int,
    reject_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Reject an exception (maker-checker workflow).
    
    Accessible only by Checkers for completing the exception workflow.
    """
    try:
        exception_service = ReviewExceptionService(db)
        
        rejection_reason = reject_data.get("rejection_reason")
        comments = reject_data.get("comments")
        
        if not rejection_reason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rejection reason is required"
            )
        
        exception = exception_service.reject_exception(
            exception_id, 
            current_user.id, 
            rejection_reason, 
            comments
        )
        
        if not exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exception not found"
            )
        
        return ReviewExceptionResponse.model_validate(exception)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{exception_id}/assign", response_model=ReviewExceptionResponse)
async def assign_exception(
    exception_id: int,
    assign_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Assign an exception to a checker for review.
    
    Accessible by Checkers and Admins for workflow management.
    """
    try:
        exception_service = ReviewExceptionService(db)
        
        assignee_user_id = assign_data.get("assignee_user_id")
        comments = assign_data.get("comments")
        
        if not assignee_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignee user ID is required"
            )
        
        exception = exception_service.assign_exception(
            exception_id, 
            assignee_user_id, 
            current_user.id, 
            comments
        )
        
        if not exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exception not found"
            )
        
        return ReviewExceptionResponse.model_validate(exception)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/for-checking", response_model=List[ReviewExceptionResponse])
async def get_exceptions_for_checking(
    status: Optional[str] = Query(None, description="Filter by exception status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Get exceptions assigned to the current checker for review.
    
    Accessible only by Checkers for workflow management.
    """
    exception_service = ReviewExceptionService(db)
    
    status_filter = None
    if status:
        try:
            status_filter = ExceptionStatus(status.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status}"
            )
    
    exceptions = exception_service.get_exceptions_for_checking(current_user.id, status_filter)
    
    return [ReviewExceptionResponse.model_validate(exception) for exception in exceptions]


@router.post("/{exception_id}/validate", response_model=Dict[str, Any])
async def validate_exception_for_approval(
    exception_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Validate if an exception can be approved by the current checker.
    
    Checks maker-checker rules, assignment, and status requirements.
    """
    exception_service = ReviewExceptionService(db)
    is_valid, errors = exception_service.validate_exception_for_approval(exception_id, current_user.id)
    
    return {
        "is_valid": is_valid,
        "errors": errors,
        "exception_id": exception_id,
        "checker_id": current_user.id
    }


@router.get("/statistics", response_model=Dict[str, Any])
async def get_exception_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Get exception statistics for dashboard.
    
    Accessible by Checkers and Admins for monitoring.
    """
    exception_service = ReviewExceptionService(db)
    stats = exception_service.get_exception_statistics()
    
    return stats


@router.get("/{exception_id}/history", response_model=Dict[str, Any])
async def get_exception_history(
    exception_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Get workflow history for a specific exception.
    
    Accessible by Checkers and Admins with appropriate permissions.
    """
    # Verify exception exists and check permissions
    exception_service = ReviewExceptionService(db)
    exception = exception_service.get_exception_by_id(exception_id)
    
    if not exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exception not found"
        )
    
    # Check permissions (creator, assigned checker, or admin)
    has_access = (
        exception.created_by == current_user.id or
        exception.assigned_to == current_user.id or
        current_user.is_admin
    )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to exception history"
        )
    
    # Get workflow history
    from app.services.workflow_history import WorkflowHistoryService
    workflow_service = WorkflowHistoryService(db)
    timeline = workflow_service.get_entity_timeline("exception", exception_id)
    
    return {
        "exception_id": exception_id,
        "timeline": timeline,
        "total_entries": len(timeline)
    }