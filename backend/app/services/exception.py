"""
ReviewException service layer for business logic and database operations.
"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc

from app.models.exception import ReviewException, ExceptionType, ExceptionStatus, ExceptionPriority
from app.models.review import Review
from app.models.client import Client
from app.models.user import User, UserRole
from app.schemas.exception import ReviewExceptionCreate, ReviewExceptionUpdate, ReviewExceptionSearchFilters
from app.services.audit import AuditService
from app.services.workflow_history import WorkflowHistoryService


logger = logging.getLogger(__name__)


class ReviewExceptionService:
    """Service class for review exception-related operations."""
    
    def __init__(self, db: Session, audit_service: Optional[AuditService] = None, notification_service=None, workflow_history_service: Optional[WorkflowHistoryService] = None):
        """
        Initialize review exception service.
        
        Args:
            db: Database session
            audit_service: Audit service for logging operations
            notification_service: Notification service for sending alerts
            workflow_history_service: Workflow history service for tracking actions
        """
        self.db = db
        self.audit_service = audit_service or AuditService(db)
        self.notification_service = notification_service
        self.workflow_history_service = workflow_history_service or WorkflowHistoryService(db)
    
    def get_exception_by_id(self, exception_id: int) -> Optional[ReviewException]:
        """
        Get review exception by ID.
        
        Args:
            exception_id: Exception ID
            
        Returns:
            ReviewException object or None if not found
        """
        return self.db.query(ReviewException).filter(ReviewException.id == exception_id).first()
    
    def get_exception_with_user_names(self, exception_id: int) -> Optional[ReviewException]:
        """
        Get review exception by ID with user names resolved.
        
        Args:
            exception_id: Exception ID
            
        Returns:
            ReviewException object with user names or None if not found
        """
        exception = self.db.query(ReviewException).options(
            joinedload(ReviewException.creator),
            joinedload(ReviewException.resolver),
            joinedload(ReviewException.assignee)
        ).filter(ReviewException.id == exception_id).first()
        
        if exception:
            user_names = self._resolve_user_names(exception)
            # Add user names as dynamic attributes for API response
            exception.created_by_name = user_names["created_by_name"]
            exception.resolved_by_name = user_names["resolved_by_name"]
            exception.assigned_to_name = user_names["assigned_to_name"]
        
        return exception
    
    def create_exception(self, exception_data: ReviewExceptionCreate, created_by_user_id: int) -> ReviewException:
        """
        Create a new review exception with comprehensive field support.
        
        Args:
            exception_data: Exception creation data with all fields
            created_by_user_id: ID of user creating the exception
            
        Returns:
            Created exception object
            
        Raises:
            ValueError: If review doesn't exist, user doesn't have permission, or validation fails
        """
        # Verify review exists
        review = self.db.query(Review).filter(Review.id == exception_data.review_id).first()
        if not review:
            raise ValueError(f"Review with ID {exception_data.review_id} not found")
        
        # Verify user has permission to create exceptions (Makers and Checkers can create exceptions)
        user = self.db.query(User).filter(User.id == created_by_user_id).first()
        if not user or not (user.is_maker or user.is_checker or user.is_admin):
            raise ValueError("Only Makers, Checkers, and Admins can create exceptions")
        
        # Validate assigned_to user if provided
        if exception_data.assigned_to:
            assigned_user = self.db.query(User).filter(User.id == exception_data.assigned_to).first()
            if not assigned_user:
                raise ValueError(f"Assigned user with ID {exception_data.assigned_to} not found")
            if not assigned_user.is_checker and not assigned_user.is_admin:
                raise ValueError("Exception can only be assigned to Checkers or Admins")
            # Check maker-checker separation
            if exception_data.assigned_to == created_by_user_id:
                raise ValueError("Exception cannot be assigned to its creator (maker-checker violation)")
        
        # Validate title field
        if not exception_data.title or not exception_data.title.strip():
            raise ValueError("Exception title is required and cannot be empty")
        
        # Validate description field
        if not exception_data.description or not exception_data.description.strip():
            raise ValueError("Exception description is required and cannot be empty")
        
        # Create new exception with all fields
        exception = ReviewException(
            review_id=exception_data.review_id,
            exception_type=exception_data.exception_type,
            title=exception_data.title.strip(),
            description=exception_data.description.strip(),
            priority=exception_data.priority,
            due_date=exception_data.due_date,
            created_by=created_by_user_id,
            status=ExceptionStatus.OPEN
        )
        
        # Set assigned_to if provided
        if exception_data.assigned_to:
            exception.assigned_to = exception_data.assigned_to
            # If assigned, set status to IN_PROGRESS
            exception.status = ExceptionStatus.IN_PROGRESS
        
        self.db.add(exception)
        self.db.flush()  # Flush to get the ID
        
        # Log audit trail with all fields
        audit_details = {
            "review_id": exception.review_id,
            "exception_type": exception.exception_type.value,
            "title": exception.title,
            "description": exception.description,
            "priority": exception.priority.value,
            "status": exception.status.value
        }
        
        if exception.due_date:
            audit_details["due_date"] = exception.due_date.isoformat()
        
        if exception.assigned_to:
            audit_details["assigned_to"] = exception.assigned_to
        
        self.audit_service.log_action(
            user_id=created_by_user_id,
            entity_type="EXCEPTION",
            entity_id=str(exception.id),
            action="CREATE",
            details=audit_details
        )
        
        self.db.commit()
        
        # Send notification to checkers/admins
        if self.notification_service:
            try:
                self.notification_service.notify_exception_created(exception.id, created_by_user_id)
            except Exception as e:
                logger.error(f"Failed to send exception creation notification: {e}")
        
        return exception
    
    def create_exceptions_for_review(self, review_id: int, exception_types: List[ExceptionType], created_by_user_id: int) -> List[ReviewException]:
        """
        Create multiple exceptions for a review with comprehensive field support.
        
        Args:
            review_id: Review ID
            exception_types: List of exception types to create
            created_by_user_id: ID of user creating the exceptions
            
        Returns:
            List of created exception objects
            
        Raises:
            ValueError: If review doesn't exist or user doesn't have permission
        """
        # Verify review exists
        review = self.db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise ValueError(f"Review with ID {review_id} not found")
        
        # Verify user has permission
        user = self.db.query(User).filter(User.id == created_by_user_id).first()
        if not user or not (user.is_maker or user.is_checker or user.is_admin):
            raise ValueError("Only Makers, Checkers, and Admins can create exceptions")
        
        exceptions = []
        
        for exception_type in exception_types:
            # Create title and description based on exception type
            title = self._get_default_title(exception_type)
            description = self._get_default_description(exception_type)
            
            exception = ReviewException(
                review_id=review_id,
                exception_type=exception_type,
                title=title,
                description=description,
                priority=ExceptionPriority.MEDIUM,  # Default priority
                created_by=created_by_user_id,
                status=ExceptionStatus.OPEN
            )
            
            self.db.add(exception)
            exceptions.append(exception)
        
        self.db.flush()  # Flush to get the IDs
        
        # Log audit trail for each exception
        for exception in exceptions:
            self.audit_service.log_action(
                user_id=created_by_user_id,
                entity_type="EXCEPTION",
                entity_id=str(exception.id),
                action="CREATE",
                details={
                    "review_id": exception.review_id,
                    "exception_type": exception.exception_type.value,
                    "title": exception.title,
                    "description": exception.description,
                    "priority": exception.priority.value,
                    "status": exception.status.value
                }
            )
        
        self.db.commit()
        
        # Send notification
        if self.notification_service:
            try:
                self.notification_service.notify_exceptions_created(review_id, [e.id for e in exceptions], created_by_user_id)
            except Exception as e:
                logger.error(f"Failed to send exceptions creation notification: {e}")
        
        return exceptions
    
    def _get_default_title(self, exception_type: ExceptionType) -> str:
        """
        Get default title for exception type.
        
        Args:
            exception_type: Exception type
            
        Returns:
            Default title string
        """
        titles = {
            ExceptionType.KYC_NON_COMPLIANCE: "KYC Non-Compliance Exception",
            ExceptionType.DORMANT_FUNDED_UFAA: "Dormant Funded Account - UFAA Required",
            ExceptionType.DORMANT_OVERDRAWN_EXIT: "Dormant Overdrawn Account - Exit Required",
            ExceptionType.DOCUMENTATION: "Documentation Exception",
            ExceptionType.COMPLIANCE: "Compliance Exception",
            ExceptionType.TECHNICAL: "Technical Exception",
            ExceptionType.OPERATIONAL: "Operational Exception"
        }
        return titles.get(exception_type, "Review Exception")
    
    def _get_default_description(self, exception_type: ExceptionType) -> str:
        """
        Get default description for exception type.
        
        Args:
            exception_type: Exception type
            
        Returns:
            Default description string
        """
        descriptions = {
            ExceptionType.KYC_NON_COMPLIANCE: "Customer flagged for KYC non-compliance during review process",
            ExceptionType.DORMANT_FUNDED_UFAA: "Dormant or non-reachable account with funds - UFAA process required",
            ExceptionType.DORMANT_OVERDRAWN_EXIT: "Dormant or non-reachable overdrawn account - exit process required",
            ExceptionType.DOCUMENTATION: "Documentation-related exception requiring attention",
            ExceptionType.COMPLIANCE: "Compliance-related exception requiring review",
            ExceptionType.TECHNICAL: "Technical issue exception requiring resolution",
            ExceptionType.OPERATIONAL: "Operational exception requiring process review"
        }
        return descriptions.get(exception_type, "Exception raised during review process")
    
    def update_exception(self, exception_id: int, exception_data: ReviewExceptionUpdate, updated_by_user_id: int) -> Optional[ReviewException]:
        """
        Update an existing review exception with comprehensive field support.
        
        Args:
            exception_id: Exception ID
            exception_data: Exception update data with all fields
            updated_by_user_id: ID of user updating the exception
            
        Returns:
            Updated exception object or None if not found
            
        Raises:
            ValueError: If user doesn't have permission or validation fails
        """
        exception = self.get_exception_by_id(exception_id)
        if not exception:
            return None
        
        # Check if user has permission to update (creator, checker, or admin)
        user = self.db.query(User).filter(User.id == updated_by_user_id).first()
        if not user:
            raise ValueError("User not found")
        
        if (exception.created_by != updated_by_user_id and 
            not user.is_checker and 
            not user.is_admin):
            raise ValueError("Only the exception creator, checkers, or admins can update the exception")
        
        # Store original values for audit
        original_values = {
            "exception_type": exception.exception_type.value,
            "title": exception.title,
            "description": exception.description,
            "priority": exception.priority.value,
            "status": exception.status.value,
            "due_date": exception.due_date.isoformat() if exception.due_date else None,
            "assigned_to": exception.assigned_to
        }
        
        # Get update data and validate
        update_data = exception_data.model_dump(exclude_unset=True)
        
        # Validate assigned_to user if being updated
        if "assigned_to" in update_data and update_data["assigned_to"]:
            assigned_user = self.db.query(User).filter(User.id == update_data["assigned_to"]).first()
            if not assigned_user:
                raise ValueError(f"Assigned user with ID {update_data['assigned_to']} not found")
            if not assigned_user.is_checker and not assigned_user.is_admin:
                raise ValueError("Exception can only be assigned to Checkers or Admins")
            # Check maker-checker separation
            if update_data["assigned_to"] == exception.created_by:
                raise ValueError("Exception cannot be assigned to its creator (maker-checker violation)")
        
        # Validate title if being updated
        if "title" in update_data and update_data["title"] is not None:
            if not update_data["title"].strip():
                raise ValueError("Exception title cannot be empty")
            update_data["title"] = update_data["title"].strip()
        
        # Validate description if being updated
        if "description" in update_data and update_data["description"] is not None:
            if not update_data["description"].strip():
                raise ValueError("Exception description cannot be empty")
            update_data["description"] = update_data["description"].strip()
        
        # Update fields
        for field, value in update_data.items():
            setattr(exception, field, value)
        
        # If assigned_to is being set and status is OPEN, change to IN_PROGRESS
        if "assigned_to" in update_data and update_data["assigned_to"] and exception.status == ExceptionStatus.OPEN:
            exception.status = ExceptionStatus.IN_PROGRESS
            update_data["status"] = ExceptionStatus.IN_PROGRESS.value
        
        # Set resolved_at timestamp when status changes to resolved or closed
        if "status" in update_data and update_data["status"] in ["resolved", "closed"]:
            if not exception.resolved_at:  # Only set if not already set
                exception.resolved_at = datetime.utcnow()
                exception.resolved_by = updated_by_user_id
                audit_updated_values["resolved_at"] = exception.resolved_at.isoformat()
                audit_updated_values["resolved_by"] = updated_by_user_id
        
        # Prepare updated values for audit (convert enums to strings)
        audit_updated_values = {}
        for key, value in update_data.items():
            if hasattr(value, 'value'):  # It's an enum
                audit_updated_values[key] = value.value
            else:
                audit_updated_values[key] = value
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=updated_by_user_id,
            entity_type="EXCEPTION",
            entity_id=str(exception.id),
            action="UPDATE",
            details={
                "original_values": original_values,
                "updated_values": audit_updated_values
            }
        )
        
        self.db.commit()
        return exception
    
    def resolve_exception(self, exception_id: int, resolution_notes: str, resolved_by_user_id: int) -> Optional[ReviewException]:
        """
        Resolve a review exception with comprehensive validation and tracking.
        
        Args:
            exception_id: Exception ID
            resolution_notes: Notes about the resolution
            resolved_by_user_id: ID of user resolving the exception
            
        Returns:
            Updated exception object or None if not found
            
        Raises:
            ValueError: If exception cannot be resolved or validation fails
        """
        exception = self.get_exception_by_id(exception_id)
        if not exception:
            return None
        
        # Check if user has permission (checker or admin)
        user = self.db.query(User).filter(User.id == resolved_by_user_id).first()
        if not user:
            raise ValueError("User not found")
        
        if not user.is_checker and not user.is_admin:
            raise ValueError("Only checkers or admins can resolve exceptions")
        
        # Validate resolution notes
        if not resolution_notes or not resolution_notes.strip():
            raise ValueError("Resolution notes are required and cannot be empty")
        
        # Store original values for audit
        original_status = exception.status.value
        original_resolution_notes = exception.resolution_notes
        
        # Resolve the exception
        exception.resolve(resolution_notes.strip(), resolved_by_user_id)
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=resolved_by_user_id,
            entity_type="EXCEPTION",
            entity_id=str(exception.id),
            action="RESOLVE",
            details={
                "original_status": original_status,
                "new_status": exception.status.value,
                "resolved_at": exception.resolved_at.isoformat() if exception.resolved_at else None,
                "resolution_notes": resolution_notes.strip(),
                "original_resolution_notes": original_resolution_notes
            }
        )
        
        self.db.commit()
        
        # Send notification about resolution
        if self.notification_service:
            try:
                self.notification_service.notify_exception_resolved(exception.id, resolved_by_user_id, resolution_notes.strip())
            except Exception as e:
                logger.error(f"Failed to send exception resolution notification: {e}")
        
        return exception
    
    def update_exception_status(self, exception_id: int, status: ExceptionStatus, updated_by_user_id: int) -> Optional[ReviewException]:
        """
        Update exception status.
        
        Args:
            exception_id: Exception ID
            status: New status
            updated_by_user_id: ID of user updating the status
            
        Returns:
            Updated exception object or None if not found
            
        Raises:
            ValueError: If status update is not valid
        """
        exception = self.get_exception_by_id(exception_id)
        if not exception:
            return None
        
        # Check if user has permission (checker or admin)
        user = self.db.query(User).filter(User.id == updated_by_user_id).first()
        if not user:
            raise ValueError("User not found")
        
        if not user.is_checker and not user.is_admin:
            raise ValueError("Only checkers or admins can update exception status")
        
        # Store original status for audit
        original_status = exception.status
        
        # Update status based on the new status
        if status == ExceptionStatus.IN_PROGRESS:
            exception.start_work()
        elif status == ExceptionStatus.CLOSED:
            exception.close()
        else:
            exception.status = status
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=updated_by_user_id,
            entity_type="EXCEPTION",
            entity_id=str(exception.id),
            action="STATUS_UPDATE",
            details={
                "original_status": original_status.value,
                "new_status": exception.status.value
            }
        )
        
        self.db.commit()
        return exception
    
    def get_exceptions_by_review(self, review_id: int) -> List[ReviewException]:
        """
        Get all exceptions for a specific review with user names resolved.
        
        Args:
            review_id: Review ID
            
        Returns:
            List of exceptions for the review with user names
        """
        exceptions = self.db.query(ReviewException).options(
            joinedload(ReviewException.creator),
            joinedload(ReviewException.resolver),
            joinedload(ReviewException.assignee)
        ).filter(
            ReviewException.review_id == review_id
        ).order_by(ReviewException.created_at.desc()).all()
        
        # Resolve user names for all exceptions
        for exception in exceptions:
            user_names = self._resolve_user_names(exception)
            # Add user names as dynamic attributes for API response
            exception.created_by_name = user_names["created_by_name"]
            exception.resolved_by_name = user_names["resolved_by_name"]
            exception.assigned_to_name = user_names["assigned_to_name"]
        
        return exceptions
    
    def search_exceptions(self, filters: ReviewExceptionSearchFilters) -> Tuple[List[ReviewException], int]:
        """
        Search review exceptions with filtering, pagination, and user name resolution.
        
        Args:
            filters: Search and filter parameters
            
        Returns:
            Tuple of (exceptions list with user names resolved, total count)
        """
        query = self.db.query(ReviewException).options(
            joinedload(ReviewException.review).joinedload(Review.client),
            joinedload(ReviewException.creator),
            joinedload(ReviewException.resolver),
            joinedload(ReviewException.assignee)
        )
        
        # Apply filters
        if filters.review_id:
            query = query.filter(ReviewException.review_id == filters.review_id)
        
        if filters.exception_type:
            query = query.filter(ReviewException.exception_type == filters.exception_type)
        
        if filters.priority:
            query = query.filter(ReviewException.priority == filters.priority)
        
        if filters.status:
            query = query.filter(ReviewException.status == filters.status)
        
        if filters.created_by:
            query = query.filter(ReviewException.created_by == filters.created_by)
        
        if filters.resolved_by:
            query = query.filter(ReviewException.resolved_by == filters.resolved_by)
        
        if filters.assigned_to:
            query = query.filter(ReviewException.assigned_to == filters.assigned_to)
        
        if filters.due_after:
            query = query.filter(ReviewException.due_date >= filters.due_after)
        
        if filters.due_before:
            query = query.filter(ReviewException.due_date <= filters.due_before)
        
        if filters.created_after:
            query = query.filter(ReviewException.created_at >= filters.created_after)
        
        if filters.created_before:
            query = query.filter(ReviewException.created_at <= filters.created_before)
        
        if filters.resolved_after:
            query = query.filter(ReviewException.resolved_at >= filters.resolved_after)
        
        if filters.resolved_before:
            query = query.filter(ReviewException.resolved_at <= filters.resolved_before)
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply sorting
        if filters.sort_by:
            sort_column = getattr(ReviewException, filters.sort_by, None)
            if sort_column:
                if filters.sort_order == "desc":
                    query = query.order_by(desc(sort_column))
                else:
                    query = query.order_by(asc(sort_column))
        
        # Apply pagination
        offset = (filters.page - 1) * filters.per_page
        query = query.offset(offset).limit(filters.per_page)
        
        exceptions = query.all()
        
        # Resolve user names for all exceptions
        for exception in exceptions:
            user_names = self._resolve_user_names(exception)
            # Add user names as dynamic attributes for API response
            exception.created_by_name = user_names["created_by_name"]
            exception.resolved_by_name = user_names["resolved_by_name"]
            exception.assigned_to_name = user_names["assigned_to_name"]
        
        return exceptions, total_count
    
    def _resolve_user_names(self, exception: ReviewException) -> Dict[str, Optional[str]]:
        """
        Resolve user names for an exception.
        
        Args:
            exception: ReviewException object
            
        Returns:
            Dictionary with user name mappings
        """
        user_names = {
            "created_by_name": None,
            "resolved_by_name": None,
            "assigned_to_name": None
        }
        
        # Get all unique user IDs
        user_ids = set()
        if exception.created_by:
            user_ids.add(exception.created_by)
        if exception.resolved_by:
            user_ids.add(exception.resolved_by)
        if exception.assigned_to:
            user_ids.add(exception.assigned_to)
        
        if not user_ids:
            return user_names
        
        # Query all users at once for efficiency
        users = self.db.query(User).filter(User.id.in_(user_ids)).all()
        user_map = {user.id: user.name for user in users}
        
        # Map user names
        if exception.created_by:
            user_names["created_by_name"] = user_map.get(exception.created_by)
        if exception.resolved_by:
            user_names["resolved_by_name"] = user_map.get(exception.resolved_by)
        if exception.assigned_to:
            user_names["assigned_to_name"] = user_map.get(exception.assigned_to)
        
        return user_names
    
    def get_exception_detail(self, exception_id: int) -> Optional[Dict[str, Any]]:
        """
        Get detailed exception information including related data and user names.
        
        Args:
            exception_id: Exception ID
            
        Returns:
            Dictionary with exception details including user names or None if not found
        """
        exception = self.db.query(ReviewException).options(
            joinedload(ReviewException.review),
            joinedload(ReviewException.creator),
            joinedload(ReviewException.resolver),
            joinedload(ReviewException.assignee)
        ).filter(ReviewException.id == exception_id).first()
        
        if not exception:
            return None
        
        # Get client information from the review
        client_name = None
        client_id = None
        if exception.review and exception.review.client_id:
            client = self.db.query(Client).filter(Client.client_id == exception.review.client_id).first()
            if client:
                client_name = client.name
                client_id = client.client_id
        
        # Resolve user names
        user_names = self._resolve_user_names(exception)
        
        return {
            "exception": exception,
            "review_client_id": exception.review.client_id if exception.review else None,
            "review_status": exception.review.status.value if exception.review else None,
            "client_name": client_name,
            "client_id": client_id,
            "creator_name": user_names["created_by_name"],
            "resolver_name": user_names["resolved_by_name"],
            "assigned_to_name": user_names["assigned_to_name"],
            # Include user names for API response compatibility
            "created_by_name": user_names["created_by_name"],
            "resolved_by_name": user_names["resolved_by_name"]
        }
    
    def get_open_exceptions(self) -> List[ReviewException]:
        """
        Get all open exceptions.
        
        Returns:
            List of open exceptions
        """
        return self.db.query(ReviewException).filter(
            ReviewException.status.in_([ExceptionStatus.OPEN, ExceptionStatus.IN_PROGRESS])
        ).order_by(ReviewException.created_at).all()
    
    def get_exceptions_by_creator(self, user_id: int) -> List[ReviewException]:
        """
        Get exceptions created by a user.
        
        Args:
            user_id: User ID
            
        Returns:
            List of exceptions created by the user
        """
        return self.db.query(ReviewException).filter(
            ReviewException.created_by == user_id
        ).order_by(desc(ReviewException.created_at)).all()
    
    def get_exceptions_by_type(self, exception_type: ExceptionType) -> List[ReviewException]:
        """
        Get exceptions by type.
        
        Args:
            exception_type: Exception type
            
        Returns:
            List of exceptions of the specified type
        """
        return self.db.query(ReviewException).filter(
            ReviewException.exception_type == exception_type
        ).order_by(desc(ReviewException.created_at)).all()
    
    def get_exception_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive exception statistics for dashboard.
        
        Returns:
            Dictionary with exception statistics including new fields
        """
        # Get counts by status
        status_counts = self.db.query(
            ReviewException.status,
            func.count(ReviewException.id)
        ).group_by(ReviewException.status).all()
        
        # Get counts by type
        type_counts = self.db.query(
            ReviewException.exception_type,
            func.count(ReviewException.id)
        ).group_by(ReviewException.exception_type).all()
        
        # Get counts by priority
        priority_counts = self.db.query(
            ReviewException.priority,
            func.count(ReviewException.id)
        ).group_by(ReviewException.priority).all()
        
        stats = {
            "total_exceptions": 0,
            "open_exceptions": 0,
            "in_progress_exceptions": 0,
            "resolved_exceptions": 0,
            "closed_exceptions": 0,
            "pending_exceptions": 0,
            
            # Priority statistics
            "low_priority_exceptions": 0,
            "medium_priority_exceptions": 0,
            "high_priority_exceptions": 0,
            "critical_priority_exceptions": 0,
            
            # Type statistics
            "kyc_non_compliance_exceptions": 0,
            "dormant_funded_ufaa_exceptions": 0,
            "dormant_overdrawn_exit_exceptions": 0,
            "documentation_exceptions": 0,
            "compliance_exceptions": 0,
            "technical_exceptions": 0,
            "operational_exceptions": 0,
            
            # Time-based statistics
            "overdue_exceptions": 0,
            "avg_resolution_time_hours": None
        }
        
        # Process status counts
        for status, count in status_counts:
            stats["total_exceptions"] += count
            if status == ExceptionStatus.OPEN:
                stats["open_exceptions"] = count
                stats["pending_exceptions"] += count
            elif status == ExceptionStatus.IN_PROGRESS:
                stats["in_progress_exceptions"] = count
                stats["pending_exceptions"] += count
            elif status == ExceptionStatus.RESOLVED:
                stats["resolved_exceptions"] = count
            elif status == ExceptionStatus.CLOSED:
                stats["closed_exceptions"] = count
        
        # Process priority counts
        for priority, count in priority_counts:
            if priority == ExceptionPriority.LOW:
                stats["low_priority_exceptions"] = count
            elif priority == ExceptionPriority.MEDIUM:
                stats["medium_priority_exceptions"] = count
            elif priority == ExceptionPriority.HIGH:
                stats["high_priority_exceptions"] = count
            elif priority == ExceptionPriority.CRITICAL:
                stats["critical_priority_exceptions"] = count
        
        # Process type counts
        for exception_type, count in type_counts:
            if exception_type == ExceptionType.KYC_NON_COMPLIANCE:
                stats["kyc_non_compliance_exceptions"] = count
            elif exception_type == ExceptionType.DORMANT_FUNDED_UFAA:
                stats["dormant_funded_ufaa_exceptions"] = count
            elif exception_type == ExceptionType.DORMANT_OVERDRAWN_EXIT:
                stats["dormant_overdrawn_exit_exceptions"] = count
            elif exception_type == ExceptionType.DOCUMENTATION:
                stats["documentation_exceptions"] = count
            elif exception_type == ExceptionType.COMPLIANCE:
                stats["compliance_exceptions"] = count
            elif exception_type == ExceptionType.TECHNICAL:
                stats["technical_exceptions"] = count
            elif exception_type == ExceptionType.OPERATIONAL:
                stats["operational_exceptions"] = count
        
        # Calculate overdue exceptions
        overdue_count = self.db.query(ReviewException).filter(
            and_(
                ReviewException.due_date < datetime.utcnow(),
                ReviewException.status.in_([ExceptionStatus.OPEN, ExceptionStatus.IN_PROGRESS])
            )
        ).count()
        stats["overdue_exceptions"] = overdue_count
        
        # Calculate average resolution time for resolved exceptions
        resolved_exceptions = self.db.query(ReviewException).filter(
            and_(
                ReviewException.status.in_([ExceptionStatus.RESOLVED, ExceptionStatus.CLOSED]),
                ReviewException.created_at.isnot(None),
                ReviewException.resolved_at.isnot(None)
            )
        ).all()
        
        if resolved_exceptions:
            total_hours = 0
            for exception in resolved_exceptions:
                time_diff = exception.resolved_at - exception.created_at
                total_hours += time_diff.total_seconds() / 3600
            
            stats["avg_resolution_time_hours"] = round(total_hours / len(resolved_exceptions), 2)
        
        return stats   

    def approve_exception(self, exception_id: int, approver_user_id: int, comments: Optional[str] = None) -> Optional[ReviewException]:
        """
        Approve an exception (maker-checker workflow).
        
        Args:
            exception_id: Exception ID
            approver_user_id: ID of user approving the exception
            comments: Optional approval comments
            
        Returns:
            Updated exception object or None if not found
            
        Raises:
            ValueError: If exception cannot be approved or user doesn't have permission
        """
        exception = self.get_exception_by_id(exception_id)
        if not exception:
            return None
        
        # Verify user is a Checker
        user = self.db.query(User).filter(User.id == approver_user_id).first()
        if not user or not user.is_checker:
            raise ValueError("Only Checkers can approve exceptions")
        
        # Check maker-checker separation
        if exception.created_by == approver_user_id:
            raise ValueError("Checker cannot approve their own exception")
        
        # Check if exception can be approved
        if exception.status not in [ExceptionStatus.OPEN, ExceptionStatus.IN_PROGRESS]:
            raise ValueError(f"Exception cannot be approved from status: {exception.status.value}")
        
        # Store original status for workflow history
        original_status = exception.status.value
        
        # Approve the exception
        exception.status = ExceptionStatus.RESOLVED
        exception.resolved_by = approver_user_id
        exception.resolved_at = datetime.utcnow()
        
        if comments:
            exception.resolution_notes = f"Approved: {comments}"
        else:
            exception.resolution_notes = "Approved by checker"
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=approver_user_id,
            entity_type="EXCEPTION",
            entity_id=str(exception.id),
            action="APPROVE",
            details={
                "status": exception.status.value,
                "resolved_at": exception.resolved_at.isoformat() if exception.resolved_at else None,
                "comments": comments
            }
        )
        
        # Record workflow history
        self.workflow_history_service.record_action(
            entity_type="exception",
            entity_id=exception.id,
            action="approve",
            user_id=approver_user_id,
            from_status=original_status,
            to_status=exception.status.value,
            comments=comments,
            metadata={
                "resolved_at": exception.resolved_at.isoformat() if exception.resolved_at else None
            }
        )
        
        self.db.commit()
        
        # Send notification to creator
        if self.notification_service:
            try:
                self.notification_service.notify_exception_approved(exception.id, approver_user_id, comments)
            except Exception as e:
                logger.error(f"Failed to send exception approval notification: {e}")
        
        return exception
    
    def reject_exception(self, exception_id: int, rejector_user_id: int, rejection_reason: str, comments: Optional[str] = None) -> Optional[ReviewException]:
        """
        Reject an exception (maker-checker workflow).
        
        Args:
            exception_id: Exception ID
            rejector_user_id: ID of user rejecting the exception
            rejection_reason: Reason for rejection
            comments: Optional additional comments
            
        Returns:
            Updated exception object or None if not found
            
        Raises:
            ValueError: If exception cannot be rejected or user doesn't have permission
        """
        exception = self.get_exception_by_id(exception_id)
        if not exception:
            return None
        
        # Verify user is a Checker
        user = self.db.query(User).filter(User.id == rejector_user_id).first()
        if not user or not user.is_checker:
            raise ValueError("Only Checkers can reject exceptions")
        
        # Check maker-checker separation
        if exception.created_by == rejector_user_id:
            raise ValueError("Checker cannot reject their own exception")
        
        # Check if exception can be rejected
        if exception.status not in [ExceptionStatus.OPEN, ExceptionStatus.IN_PROGRESS]:
            raise ValueError(f"Exception cannot be rejected from status: {exception.status.value}")
        
        # Store original status for workflow history
        original_status = exception.status.value
        
        # Reject the exception
        exception.status = ExceptionStatus.CLOSED
        exception.resolved_by = rejector_user_id
        exception.resolved_at = datetime.utcnow()
        
        # Combine rejection reason and comments
        rejection_notes = f"Rejected: {rejection_reason}"
        if comments:
            rejection_notes += f". {comments}"
        exception.resolution_notes = rejection_notes
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=rejector_user_id,
            entity_type="EXCEPTION",
            entity_id=str(exception.id),
            action="REJECT",
            details={
                "status": exception.status.value,
                "resolved_at": exception.resolved_at.isoformat() if exception.resolved_at else None,
                "rejection_reason": rejection_reason,
                "comments": comments
            }
        )
        
        # Record workflow history
        self.workflow_history_service.record_action(
            entity_type="exception",
            entity_id=exception.id,
            action="reject",
            user_id=rejector_user_id,
            from_status=original_status,
            to_status=exception.status.value,
            comments=f"{rejection_reason}. {comments}" if comments else rejection_reason,
            metadata={
                "rejection_reason": rejection_reason,
                "resolved_at": exception.resolved_at.isoformat() if exception.resolved_at else None
            }
        )
        
        self.db.commit()
        
        # Send notification to creator
        if self.notification_service:
            try:
                self.notification_service.notify_exception_rejected(exception.id, rejector_user_id, rejection_reason, comments)
            except Exception as e:
                logger.error(f"Failed to send exception rejection notification: {e}")
        
        return exception
    
    def assign_exception(self, exception_id: int, assignee_user_id: int, assigned_by_user_id: int, comments: Optional[str] = None) -> Optional[ReviewException]:
        """
        Assign an exception to a checker for review.
        
        Args:
            exception_id: Exception ID
            assignee_user_id: ID of user to assign exception to
            assigned_by_user_id: ID of user making the assignment
            comments: Optional assignment comments
            
        Returns:
            Updated exception object or None if not found
            
        Raises:
            ValueError: If assignment is invalid
        """
        exception = self.get_exception_by_id(exception_id)
        if not exception:
            return None
        
        # Verify assignee is a Checker
        assignee = self.db.query(User).filter(User.id == assignee_user_id).first()
        if not assignee or not assignee.is_checker:
            raise ValueError("Exception can only be assigned to Checkers")
        
        # Verify assigner has permission (admin or checker)
        assigner = self.db.query(User).filter(User.id == assigned_by_user_id).first()
        if not assigner or not (assigner.is_admin or assigner.is_checker):
            raise ValueError("Only Admins or Checkers can assign exceptions")
        
        # Check maker-checker separation
        if exception.created_by == assignee_user_id:
            raise ValueError("Exception cannot be assigned to its creator")
        
        # Store original status for workflow history
        original_status = exception.status.value
        
        # Update assignment
        exception.assigned_to = assignee_user_id
        if exception.status == ExceptionStatus.OPEN:
            exception.status = ExceptionStatus.IN_PROGRESS
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=assigned_by_user_id,
            entity_type="EXCEPTION",
            entity_id=str(exception.id),
            action="ASSIGN",
            details={
                "assigned_to": assignee_user_id,
                "assignee_name": assignee.name,
                "status": exception.status.value,
                "comments": comments
            }
        )
        
        # Record workflow history
        self.workflow_history_service.record_action(
            entity_type="exception",
            entity_id=exception.id,
            action="assign",
            user_id=assigned_by_user_id,
            from_status=original_status,
            to_status=exception.status.value,
            comments=comments,
            metadata={
                "assigned_to": assignee_user_id,
                "assignee_name": assignee.name
            }
        )
        
        self.db.commit()
        
        # Send notification to assignee
        if self.notification_service:
            try:
                self.notification_service.notify_exception_assigned(exception.id, assignee_user_id, assigned_by_user_id, comments)
            except Exception as e:
                logger.error(f"Failed to send exception assignment notification: {e}")
        
        return exception
    
    def get_exceptions_for_checking(self, checker_user_id: int, status: Optional[ExceptionStatus] = None) -> List[ReviewException]:
        """
        Get exceptions assigned to a checker for review.
        
        Args:
            checker_user_id: ID of the checker
            status: Optional status filter
            
        Returns:
            List of exceptions for checking
        """
        query = self.db.query(ReviewException).options(
            joinedload(ReviewException.review).joinedload(Review.client),
            joinedload(ReviewException.creator),
            joinedload(ReviewException.resolver)
        ).filter(
            or_(
                ReviewException.assigned_to == checker_user_id,
                and_(
                    ReviewException.assigned_to.is_(None),
                    ReviewException.status.in_([ExceptionStatus.OPEN, ExceptionStatus.IN_PROGRESS])
                )
            )
        )
        
        if status:
            query = query.filter(ReviewException.status == status)
        
        return query.order_by(ReviewException.created_at.desc()).all()
    
    def validate_exception_for_approval(self, exception_id: int, checker_user_id: int) -> Tuple[bool, List[str]]:
        """
        Validate if an exception can be approved by a checker.
        
        Args:
            exception_id: Exception ID
            checker_user_id: ID of the checker
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        exception = self.get_exception_by_id(exception_id)
        if not exception:
            return False, ["Exception not found"]
        
        errors = []
        
        # Check if checker has permission
        checker = self.db.query(User).filter(User.id == checker_user_id).first()
        if not checker or not checker.is_checker:
            errors.append("Only Checkers can approve exceptions")
        
        # Check maker-checker separation
        if exception.created_by == checker_user_id:
            errors.append("You cannot approve your own exception (maker-checker violation)")
        
        # Check exception status
        if exception.status not in [ExceptionStatus.OPEN, ExceptionStatus.IN_PROGRESS]:
            errors.append(f"Exception cannot be approved from status: {exception.status.value}")
        
        # Check if exception is assigned to someone else
        if exception.assigned_to and exception.assigned_to != checker_user_id:
            assigned_user = self.db.query(User).filter(User.id == exception.assigned_to).first()
            assigned_name = assigned_user.name if assigned_user else "Unknown"
            errors.append(f"Exception is assigned to {assigned_name}")
        
        return len(errors) == 0, errors
    
    def get_exception_statistics(self) -> Dict[str, Any]:
        """
        Get exception statistics for dashboard.
        
        Returns:
            Dictionary with exception statistics
        """
        # Get counts by status
        status_counts = self.db.query(
            ReviewException.status,
            func.count(ReviewException.id)
        ).group_by(ReviewException.status).all()
        
        stats = {
            "total_exceptions": 0,
            "open_exceptions": 0,
            "in_progress_exceptions": 0,
            "resolved_exceptions": 0,
            "closed_exceptions": 0,
            "pending_exceptions": 0,
            "avg_resolution_time_hours": None
        }
        
        for status, count in status_counts:
            stats["total_exceptions"] += count
            if status == ExceptionStatus.OPEN:
                stats["open_exceptions"] = count
                stats["pending_exceptions"] += count
            elif status == ExceptionStatus.IN_PROGRESS:
                stats["in_progress_exceptions"] = count
                stats["pending_exceptions"] += count
            elif status == ExceptionStatus.RESOLVED:
                stats["resolved_exceptions"] = count
            elif status == ExceptionStatus.CLOSED:
                stats["closed_exceptions"] = count
        
        # Calculate average resolution time for resolved exceptions
        resolved_exceptions = self.db.query(ReviewException).filter(
            and_(
                ReviewException.status.in_([ExceptionStatus.RESOLVED, ExceptionStatus.CLOSED]),
                ReviewException.created_at.isnot(None),
                ReviewException.resolved_at.isnot(None)
            )
        ).all()
        
        if resolved_exceptions:
            total_hours = 0
            for exception in resolved_exceptions:
                time_diff = exception.resolved_at - exception.created_at
                total_hours += time_diff.total_seconds() / 3600
            
            stats["avg_resolution_time_hours"] = round(total_hours / len(resolved_exceptions), 2)
        
        return stats