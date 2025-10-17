"""
Workflow history service for tracking and retrieving workflow actions.
"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func
from fastapi import Request

from app.models.workflow_history import WorkflowHistory
from app.models.user import User
from app.schemas.workflow_history import WorkflowHistoryCreate, WorkflowHistoryFilters


logger = logging.getLogger(__name__)


class WorkflowHistoryService:
    """Service for managing workflow history tracking."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def record_action(
        self,
        entity_type: str,
        entity_id: int,
        action: str,
        user_id: int,
        from_status: Optional[str] = None,
        to_status: Optional[str] = None,
        comments: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None
    ) -> WorkflowHistory:
        """
        Record a workflow action in the history.
        
        Args:
            entity_type: Type of entity ('review', 'exception', etc.)
            entity_id: ID of the entity
            action: Action performed
            user_id: ID of user performing action
            from_status: Previous status (optional)
            to_status: New status (optional)
            comments: User comments (optional)
            metadata: Additional context data (optional)
            request: FastAPI request object for IP/user agent (optional)
            
        Returns:
            Created WorkflowHistory entry
        """
        try:
            # Get user information
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError(f"User with ID {user_id} not found")
            
            # Extract request information if available
            ip_address = None
            user_agent = None
            if request:
                ip_address = self._get_client_ip(request)
                user_agent = request.headers.get("user-agent")
            
            # Create history entry
            history_entry = WorkflowHistory.create_entry(
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                user_id=user_id,
                user_name=user.name,
                user_role=user.role.value,
                from_status=from_status,
                to_status=to_status,
                comments=comments,
                action_metadata=metadata,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            self.db.add(history_entry)
            self.db.commit()
            
            logger.info(
                f"Recorded workflow action: {action} on {entity_type}:{entity_id} by user {user_id}"
            )
            
            return history_entry
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to record workflow action: {e}")
            raise
    
    def get_entity_history(
        self,
        entity_type: str,
        entity_id: int,
        limit: Optional[int] = None,
        include_metadata: bool = False
    ) -> List[WorkflowHistory]:
        """
        Get workflow history for a specific entity.
        
        Args:
            entity_type: Type of entity
            entity_id: ID of the entity
            limit: Maximum number of entries to return
            include_metadata: Whether to include metadata in results
            
        Returns:
            List of WorkflowHistory entries
        """
        query = self.db.query(WorkflowHistory).filter(
            and_(
                WorkflowHistory.entity_type == entity_type,
                WorkflowHistory.entity_id == entity_id
            )
        ).order_by(desc(WorkflowHistory.timestamp))
        
        if limit:
            query = query.limit(limit)
        
        return query.all()
    
    def get_user_activity(
        self,
        user_id: int,
        days: int = 30,
        entity_type: Optional[str] = None
    ) -> List[WorkflowHistory]:
        """
        Get recent workflow activity for a user.
        
        Args:
            user_id: ID of the user
            days: Number of days to look back
            entity_type: Optional filter by entity type
            
        Returns:
            List of WorkflowHistory entries
        """
        since_date = datetime.utcnow() - timedelta(days=days)
        
        query = self.db.query(WorkflowHistory).filter(
            and_(
                WorkflowHistory.user_id == user_id,
                WorkflowHistory.timestamp >= since_date
            )
        )
        
        if entity_type:
            query = query.filter(WorkflowHistory.entity_type == entity_type)
        
        return query.order_by(desc(WorkflowHistory.timestamp)).all()
    
    def search_history(
        self,
        filters: WorkflowHistoryFilters,
        page: int = 1,
        per_page: int = 50
    ) -> Tuple[List[WorkflowHistory], int]:
        """
        Search workflow history with filters and pagination.
        
        Args:
            filters: Search filters
            page: Page number (1-based)
            per_page: Items per page
            
        Returns:
            Tuple of (history entries, total count)
        """
        query = self.db.query(WorkflowHistory)
        
        # Apply filters
        if filters.entity_type:
            query = query.filter(WorkflowHistory.entity_type == filters.entity_type)
        
        if filters.entity_id:
            query = query.filter(WorkflowHistory.entity_id == filters.entity_id)
        
        if filters.action:
            query = query.filter(WorkflowHistory.action == filters.action)
        
        if filters.user_id:
            query = query.filter(WorkflowHistory.user_id == filters.user_id)
        
        if filters.from_date:
            query = query.filter(WorkflowHistory.timestamp >= filters.from_date)
        
        if filters.to_date:
            query = query.filter(WorkflowHistory.timestamp <= filters.to_date)
        
        if filters.status_changes_only:
            query = query.filter(
                and_(
                    WorkflowHistory.from_status.isnot(None),
                    WorkflowHistory.to_status.isnot(None)
                )
            )
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination and sorting
        offset = (page - 1) * per_page
        query = query.order_by(desc(WorkflowHistory.timestamp))
        query = query.offset(offset).limit(per_page)
        
        entries = query.all()
        
        return entries, total_count
    
    def get_workflow_statistics(
        self,
        entity_type: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get workflow statistics for dashboard/reporting.
        
        Args:
            entity_type: Optional filter by entity type
            days: Number of days to analyze
            
        Returns:
            Dictionary with workflow statistics
        """
        since_date = datetime.utcnow() - timedelta(days=days)
        
        base_query = self.db.query(WorkflowHistory).filter(
            WorkflowHistory.timestamp >= since_date
        )
        
        if entity_type:
            base_query = base_query.filter(WorkflowHistory.entity_type == entity_type)
        
        # Total actions
        total_actions = base_query.count()
        
        # Actions by type
        actions_by_type = self.db.query(
            WorkflowHistory.action,
            func.count(WorkflowHistory.id)
        ).filter(
            WorkflowHistory.timestamp >= since_date
        )
        
        if entity_type:
            actions_by_type = actions_by_type.filter(WorkflowHistory.entity_type == entity_type)
        
        actions_by_type = actions_by_type.group_by(WorkflowHistory.action).all()
        
        # Most active users
        active_users = self.db.query(
            WorkflowHistory.user_name,
            func.count(WorkflowHistory.id)
        ).filter(
            WorkflowHistory.timestamp >= since_date
        )
        
        if entity_type:
            active_users = active_users.filter(WorkflowHistory.entity_type == entity_type)
        
        active_users = active_users.group_by(
            WorkflowHistory.user_name
        ).order_by(
            desc(func.count(WorkflowHistory.id))
        ).limit(10).all()
        
        # Status changes
        status_changes = base_query.filter(
            and_(
                WorkflowHistory.from_status.isnot(None),
                WorkflowHistory.to_status.isnot(None)
            )
        ).count()
        
        # Daily activity (last 7 days)
        daily_activity = []
        for i in range(7):
            day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            
            day_query = base_query.filter(
                and_(
                    WorkflowHistory.timestamp >= day_start,
                    WorkflowHistory.timestamp < day_end
                )
            )
            
            count = day_query.count()
            daily_activity.append({
                "date": day_start.strftime("%Y-%m-%d"),
                "count": count
            })
        
        return {
            "total_actions": total_actions,
            "status_changes": status_changes,
            "actions_by_type": dict(actions_by_type),
            "active_users": [{"name": name, "count": count} for name, count in active_users],
            "daily_activity": list(reversed(daily_activity)),
            "period_days": days
        }
    
    def get_entity_timeline(
        self,
        entity_type: str,
        entity_id: int
    ) -> List[Dict[str, Any]]:
        """
        Get a formatted timeline for an entity's workflow history.
        
        Args:
            entity_type: Type of entity
            entity_id: ID of the entity
            
        Returns:
            List of timeline entries with formatted information
        """
        history = self.get_entity_history(entity_type, entity_id)
        
        timeline = []
        for entry in history:
            timeline_entry = {
                "id": entry.id,
                "timestamp": entry.timestamp,
                "action": entry.action,
                "description": entry.get_action_description(),
                "user_name": entry.user_name,
                "user_role": entry.user_role,
                "comments": entry.comments,
                "is_status_change": entry.is_status_change,
                "status_direction": entry.status_direction,
                "time_since": entry.get_time_since(),
                "metadata": entry.metadata
            }
            
            # Add status change information
            if entry.is_status_change:
                timeline_entry.update({
                    "from_status": entry.from_status,
                    "to_status": entry.to_status
                })
            
            timeline.append(timeline_entry)
        
        return timeline
    
    def cleanup_old_history(self, days_to_keep: int = 365) -> int:
        """
        Clean up old workflow history entries.
        
        Args:
            days_to_keep: Number of days of history to retain
            
        Returns:
            Number of entries deleted
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        deleted_count = self.db.query(WorkflowHistory).filter(
            WorkflowHistory.timestamp < cutoff_date
        ).delete()
        
        self.db.commit()
        
        logger.info(f"Cleaned up {deleted_count} old workflow history entries")
        
        return deleted_count
    
    def _get_client_ip(self, request: Request) -> Optional[str]:
        """Extract client IP address from request."""
        # Check for forwarded headers first (for load balancers/proxies)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fall back to direct client IP
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return None