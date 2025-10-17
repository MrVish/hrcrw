"""
ReviewException model for managing compliance exceptions during review workflow.
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Enum, ForeignKey, Integer, DateTime, Index
from sqlalchemy.orm import relationship
from typing import Optional, List

from app.models.base import BaseModel


class ExceptionType(enum.Enum):
    """Exception type enumeration for categorizing KYC compliance exceptions."""
    KYC_NON_COMPLIANCE = "kyc_non_compliance"
    DORMANT_FUNDED_UFAA = "dormant_funded_ufaa"
    DORMANT_OVERDRAWN_EXIT = "dormant_overdrawn_exit"
    DOCUMENTATION = "documentation"
    COMPLIANCE = "compliance"
    TECHNICAL = "technical"
    OPERATIONAL = "operational"


class ExceptionPriority(enum.Enum):
    """Exception priority enumeration for prioritizing exceptions."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ExceptionStatus(enum.Enum):
    """Exception status enumeration for tracking exception lifecycle."""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"
    ESCALATED = "escalated"


class ReviewException(BaseModel):
    """
    ReviewException model for managing compliance exceptions during review workflow.
    
    Attributes:
        review_id: Foreign key to Review model
        exception_type: Type of exception (KYC non-compliance, dormant account, etc.)
        title: Title/summary of the exception
        description: Detailed description of the exception
        priority: Priority level of the exception (LOW, MEDIUM, HIGH, CRITICAL)
        status: Current status of the exception
        due_date: Optional due date for exception resolution
        created_by: Foreign key to User model (creator)
        resolved_by: Foreign key to User model (resolver)
        assigned_to: Foreign key to User model (assignee)
        resolution_notes: Notes about how the exception was resolved
        resolved_at: Timestamp when exception was resolved
    """
    __tablename__ = "review_exceptions"
    
    # Foreign key relationships
    review_id = Column(Integer, ForeignKey("reviews.id"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # Exception details
    exception_type = Column(Enum(ExceptionType), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(Enum(ExceptionPriority), default=ExceptionPriority.MEDIUM, nullable=False, index=True)
    status = Column(Enum(ExceptionStatus), default=ExceptionStatus.OPEN, nullable=False, index=True)
    due_date = Column(DateTime, nullable=True, index=True)
    
    # Resolution tracking
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True, index=True)
    
    # Relationships
    review = relationship("Review", back_populates="exceptions")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_exceptions")
    resolver = relationship("User", foreign_keys=[resolved_by], back_populates="resolved_exceptions")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_exceptions")
    
    # Create composite indexes for common query patterns
    __table_args__ = (
        Index('idx_review_exception_status', 'status'),
        Index('idx_review_exception_type_status', 'exception_type', 'status'),
        Index('idx_review_exception_review_status', 'review_id', 'status'),
        Index('idx_review_exception_priority_status', 'priority', 'status'),
        Index('idx_review_exception_due_date', 'due_date'),
    )
    
    def __repr__(self):
        """String representation of the ReviewException model."""
        return f"<ReviewException(id={self.id}, review_id={self.review_id}, title='{self.title}', type='{self.exception_type.value}', priority='{self.priority.value}', status='{self.status.value}')>"
    
    @property
    def is_open(self) -> bool:
        """Check if exception is open."""
        return self.status == ExceptionStatus.OPEN
    
    @property
    def is_in_progress(self) -> bool:
        """Check if exception is in progress."""
        return self.status == ExceptionStatus.IN_PROGRESS
    
    @property
    def is_resolved(self) -> bool:
        """Check if exception is resolved."""
        return self.status == ExceptionStatus.RESOLVED
    
    @property
    def is_closed(self) -> bool:
        """Check if exception is closed."""
        return self.status == ExceptionStatus.CLOSED
    
    @property
    def is_active(self) -> bool:
        """Check if exception is active (not closed or resolved)."""
        return self.status in [ExceptionStatus.OPEN, ExceptionStatus.IN_PROGRESS]
    
    @property
    def is_high_priority(self) -> bool:
        """Check if exception is high priority."""
        return self.priority in [ExceptionPriority.HIGH, ExceptionPriority.CRITICAL]
    
    @property
    def is_critical(self) -> bool:
        """Check if exception is critical priority."""
        return self.priority == ExceptionPriority.CRITICAL
    
    @property
    def is_overdue(self) -> bool:
        """Check if exception is overdue based on due_date."""
        if not self.due_date:
            return False
        return datetime.utcnow() > self.due_date and self.is_active
    
    def can_be_resolved(self) -> bool:
        """Check if exception can be resolved."""
        return self.status in [ExceptionStatus.OPEN, ExceptionStatus.IN_PROGRESS]
    
    def can_be_closed(self) -> bool:
        """Check if exception can be closed."""
        return self.status == ExceptionStatus.RESOLVED
    
    def resolve(self, resolution_notes: str, resolved_by_user_id: int) -> None:
        """
        Resolve the exception.
        
        Args:
            resolution_notes: Notes about the resolution
            resolved_by_user_id: ID of the user resolving the exception
            
        Raises:
            ValueError: If exception cannot be resolved or resolution notes are empty
        """
        if not self.can_be_resolved():
            raise ValueError(f"Exception cannot be resolved from status: {self.status.value}")
        
        if not resolution_notes or not resolution_notes.strip():
            raise ValueError("Resolution notes are required")
        
        self.status = ExceptionStatus.RESOLVED
        self.resolution_notes = resolution_notes.strip()
        self.resolved_at = datetime.utcnow()
        self.resolved_by = resolved_by_user_id
    
    def close(self) -> None:
        """
        Close the exception.
        
        Raises:
            ValueError: If exception cannot be closed
        """
        if not self.can_be_closed():
            raise ValueError(f"Exception cannot be closed from status: {self.status.value}")
        
        self.status = ExceptionStatus.CLOSED
    
    def start_work(self) -> None:
        """
        Start work on the exception.
        
        Raises:
            ValueError: If exception cannot be started
        """
        if self.status != ExceptionStatus.OPEN:
            raise ValueError(f"Exception cannot be started from status: {self.status.value}")
        
        self.status = ExceptionStatus.IN_PROGRESS
    
    @classmethod
    def get_exceptions_by_review(cls, db_session, review_id: int) -> List['ReviewException']:
        """
        Get all exceptions for a specific review.
        
        Args:
            db_session: Database session
            review_id: Review ID
            
        Returns:
            List of exceptions for the review
        """
        return db_session.query(cls).filter(cls.review_id == review_id).order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_open_exceptions(cls, db_session) -> List['ReviewException']:
        """
        Get all open exceptions.
        
        Args:
            db_session: Database session
            
        Returns:
            List of open exceptions
        """
        return db_session.query(cls).filter(
            cls.status.in_([ExceptionStatus.OPEN, ExceptionStatus.IN_PROGRESS])
        ).order_by(cls.created_at).all()
    
    @classmethod
    def get_exceptions_by_creator(cls, db_session, user_id: int) -> List['ReviewException']:
        """
        Get all exceptions created by a specific user.
        
        Args:
            db_session: Database session
            user_id: ID of the creating user
            
        Returns:
            List of exceptions created by the user
        """
        return db_session.query(cls).filter(cls.created_by == user_id).order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_exceptions_by_type(cls, db_session, exception_type: ExceptionType) -> List['ReviewException']:
        """
        Get all exceptions of a specific type.
        
        Args:
            db_session: Database session
            exception_type: Exception type to filter by
            
        Returns:
            List of exceptions of the specified type
        """
        return db_session.query(cls).filter(cls.exception_type == exception_type).order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_exceptions_by_priority(cls, db_session, priority: ExceptionPriority) -> List['ReviewException']:
        """
        Get all exceptions of a specific priority.
        
        Args:
            db_session: Database session
            priority: Exception priority to filter by
            
        Returns:
            List of exceptions of the specified priority
        """
        return db_session.query(cls).filter(cls.priority == priority).order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_high_priority_exceptions(cls, db_session) -> List['ReviewException']:
        """
        Get all high priority and critical exceptions.
        
        Args:
            db_session: Database session
            
        Returns:
            List of high priority and critical exceptions
        """
        return db_session.query(cls).filter(
            cls.priority.in_([ExceptionPriority.HIGH, ExceptionPriority.CRITICAL])
        ).order_by(cls.priority.desc(), cls.created_at).all()
    
    @classmethod
    def get_overdue_exceptions(cls, db_session) -> List['ReviewException']:
        """
        Get all overdue exceptions.
        
        Args:
            db_session: Database session
            
        Returns:
            List of overdue exceptions
        """
        return db_session.query(cls).filter(
            cls.due_date < datetime.utcnow(),
            cls.status.in_([ExceptionStatus.OPEN, ExceptionStatus.IN_PROGRESS])
        ).order_by(cls.due_date).all()