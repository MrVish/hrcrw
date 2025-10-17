"""
Workflow history model for tracking status transitions and actions.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class WorkflowHistory(Base):
    """
    Model for tracking workflow history and status transitions.
    
    This table records all significant actions and status changes
    in the maker-checker workflow for reviews and exceptions.
    """
    __tablename__ = "workflow_history"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False, index=True)  # 'review', 'exception', etc.
    entity_id = Column(Integer, nullable=False, index=True)
    action = Column(String(50), nullable=False, index=True)  # 'create', 'submit', 'approve', 'reject', etc.
    from_status = Column(String(50), nullable=True)  # Previous status
    to_status = Column(String(50), nullable=True)   # New status
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_name = Column(String(255), nullable=False)  # Denormalized for historical accuracy
    user_role = Column(String(50), nullable=False)   # Role at time of action
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    comments = Column(Text, nullable=True)
    action_metadata = Column(JSON, nullable=True)  # Additional context data
    ip_address = Column(String(45), nullable=True)  # IPv4/IPv6 address
    user_agent = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="workflow_history")

    def __repr__(self):
        return f"<WorkflowHistory(id={self.id}, entity={self.entity_type}:{self.entity_id}, action={self.action})>"

    @classmethod
    def create_entry(
        cls,
        entity_type: str,
        entity_id: int,
        action: str,
        user_id: int,
        user_name: str,
        user_role: str,
        from_status: Optional[str] = None,
        to_status: Optional[str] = None,
        comments: Optional[str] = None,
        action_metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> "WorkflowHistory":
        """
        Create a new workflow history entry.
        
        Args:
            entity_type: Type of entity ('review', 'exception', etc.)
            entity_id: ID of the entity
            action: Action performed ('create', 'submit', 'approve', etc.)
            user_id: ID of user performing action
            user_name: Name of user (for historical accuracy)
            user_role: Role of user at time of action
            from_status: Previous status (optional)
            to_status: New status (optional)
            comments: User comments (optional)
            action_metadata: Additional context data (optional)
            ip_address: User's IP address (optional)
            user_agent: User's browser/client info (optional)
            
        Returns:
            New WorkflowHistory instance
        """
        return cls(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            user_id=user_id,
            user_name=user_name,
            user_role=user_role,
            from_status=from_status,
            to_status=to_status,
            comments=comments,
            action_metadata=action_metadata or {},
            ip_address=ip_address,
            user_agent=user_agent
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "action": self.action,
            "from_status": self.from_status,
            "to_status": self.to_status,
            "user_id": self.user_id,
            "user_name": self.user_name,
            "user_role": self.user_role,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "comments": self.comments,
            "action_metadata": self.action_metadata,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent
        }

    @property
    def is_status_change(self) -> bool:
        """Check if this entry represents a status change."""
        return self.from_status is not None and self.to_status is not None

    @property
    def status_direction(self) -> Optional[str]:
        """Get the direction of status change (forward/backward)."""
        if not self.is_status_change:
            return None
            
        # Define status progression for reviews
        review_progression = [
            'draft', 'submitted', 'under_review', 'approved'
        ]
        
        # Define status progression for exceptions
        exception_progression = [
            'open', 'in_progress', 'resolved', 'closed'
        ]
        
        progression = review_progression if self.entity_type == 'review' else exception_progression
        
        try:
            from_idx = progression.index(self.from_status.lower())
            to_idx = progression.index(self.to_status.lower())
            
            if to_idx > from_idx:
                return 'forward'
            elif to_idx < from_idx:
                return 'backward'
            else:
                return 'lateral'
        except (ValueError, AttributeError):
            return None

    def get_action_description(self) -> str:
        """Get human-readable description of the action."""
        action_descriptions = {
            'create': 'Created',
            'update': 'Updated',
            'submit': 'Submitted for review',
            'start_review': 'Started reviewing',
            'approve': 'Approved',
            'reject': 'Rejected',
            'reopen': 'Reopened',
            'assign': 'Assigned',
            'resolve': 'Resolved',
            'close': 'Closed',
            'escalate': 'Escalated',
            'comment': 'Added comment'
        }
        
        base_description = action_descriptions.get(self.action, self.action.title())
        
        if self.is_status_change:
            return f"{base_description} (changed from {self.from_status} to {self.to_status})"
        
        return base_description

    def get_time_since(self) -> str:
        """Get human-readable time since this action."""
        if not self.timestamp:
            return "Unknown time"
            
        now = datetime.utcnow()
        diff = now - self.timestamp.replace(tzinfo=None)
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        else:
            return "Just now"