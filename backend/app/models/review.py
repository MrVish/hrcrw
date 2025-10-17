"""
Review model for managing client review workflow.
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Enum, ForeignKey, Integer, DateTime, Boolean, Index
from sqlalchemy.orm import relationship
from typing import Optional, List

from app.models.base import BaseModel


class ReviewStatus(enum.Enum):
    """Review status enumeration for workflow state management."""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class ReviewType(enum.Enum):
    """Review type enumeration for different review categories."""
    MANUAL = "manual"
    KYC = "kyc"
    AML = "aml"
    SANCTIONS = "sanctions"
    PEP = "pep"
    FINANCIAL = "financial"


class Review(BaseModel):
    """
    Review model for managing client compliance reviews.
    
    Attributes:
        client_id: Foreign key to Client model
        submitted_by: Foreign key to User model (Maker)
        reviewed_by: Foreign key to User model (Checker) - nullable until reviewed
        status: Current review status
        comments: Review comments and notes
        rejection_reason: Reason for rejection (if applicable)
        submitted_at: Timestamp when review was submitted
        reviewed_at: Timestamp when review was completed
    """
    __tablename__ = "reviews"
    
    # Foreign key relationships
    client_id = Column(String(50), ForeignKey("clients.client_id"), nullable=False, index=True)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    # Review workflow fields
    status = Column(Enum(ReviewStatus), default=ReviewStatus.DRAFT, nullable=False, index=True)
    review_type = Column(Enum(ReviewType), default=ReviewType.MANUAL, nullable=False, index=True)
    auto_created = Column(Boolean, default=False, nullable=False, index=True)
    comments = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Timestamp fields
    submitted_at = Column(DateTime, nullable=True, index=True)
    reviewed_at = Column(DateTime, nullable=True, index=True)
    
    # Relationships
    client = relationship("Client", back_populates="reviews")
    submitter = relationship("User", foreign_keys=[submitted_by], back_populates="submitted_reviews")
    reviewer = relationship("User", foreign_keys=[reviewed_by], back_populates="reviewed_reviews")
    
    # Relationships
    exceptions = relationship("ReviewException", back_populates="review", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="review", cascade="all, delete-orphan")
    kyc_questionnaire = relationship("KYCQuestionnaire", back_populates="review", uselist=False, cascade="all, delete-orphan")
    
    # Create composite indexes for common query patterns
    __table_args__ = (
        Index('idx_review_status_submitted', 'status', 'submitted_at'),
        Index('idx_review_client_status', 'client_id', 'status'),
        Index('idx_review_submitter_status', 'submitted_by', 'status'),
        Index('idx_review_reviewer_status', 'reviewed_by', 'status'),
        Index('idx_review_type_status', 'review_type', 'status'),
        Index('idx_review_auto_created_status', 'auto_created', 'status'),
        Index('idx_review_client_type', 'client_id', 'review_type'),
    )
    
    def __repr__(self):
        """String representation of the Review model."""
        return f"<Review(id={self.id}, client_id='{self.client_id}', status='{self.status.value}')>"
    
    @property
    def is_draft(self) -> bool:
        """Check if review is in draft status."""
        return self.status == ReviewStatus.DRAFT
    
    @property
    def is_submitted(self) -> bool:
        """Check if review has been submitted."""
        return self.status in [ReviewStatus.SUBMITTED, ReviewStatus.UNDER_REVIEW, ReviewStatus.APPROVED, ReviewStatus.REJECTED]
    
    @property
    def is_pending_review(self) -> bool:
        """Check if review is pending checker review."""
        return self.status in [ReviewStatus.SUBMITTED, ReviewStatus.UNDER_REVIEW]
    
    @property
    def is_completed(self) -> bool:
        """Check if review has been completed (approved or rejected)."""
        return self.status in [ReviewStatus.APPROVED, ReviewStatus.REJECTED]
    
    @property
    def is_approved(self) -> bool:
        """Check if review has been approved."""
        return self.status == ReviewStatus.APPROVED
    
    @property
    def is_rejected(self) -> bool:
        """Check if review has been rejected."""
        return self.status == ReviewStatus.REJECTED
    
    @property
    def is_auto_created(self) -> bool:
        """Check if review was automatically created."""
        return self.auto_created
    
    @property
    def is_manual_review(self) -> bool:
        """Check if review is a manual review."""
        return self.review_type == ReviewType.MANUAL
    
    def can_be_submitted(self) -> bool:
        """Check if review can be submitted."""
        return self.status == ReviewStatus.DRAFT
    
    def can_be_reviewed(self) -> bool:
        """Check if review can be reviewed by a checker."""
        return self.status in [ReviewStatus.SUBMITTED, ReviewStatus.UNDER_REVIEW]
    
    def can_be_edited(self) -> bool:
        """Check if review can be edited."""
        return self.status == ReviewStatus.DRAFT
    
    def submit(self, submitted_by_user_id: int) -> None:
        """
        Submit the review for checker approval.
        
        Args:
            submitted_by_user_id: ID of the user submitting the review
            
        Raises:
            ValueError: If review cannot be submitted
        """
        if not self.can_be_submitted():
            raise ValueError(f"Review cannot be submitted from status: {self.status.value}")
        
        self.status = ReviewStatus.SUBMITTED
        self.submitted_by = submitted_by_user_id
        self.submitted_at = datetime.utcnow()
    
    def start_review(self, reviewer_user_id: int) -> None:
        """
        Start the review process by assigning a checker.
        
        Args:
            reviewer_user_id: ID of the checker starting the review
            
        Raises:
            ValueError: If review cannot be started
        """
        if not self.can_be_reviewed():
            raise ValueError(f"Review cannot be started from status: {self.status.value}")
        
        self.status = ReviewStatus.UNDER_REVIEW
        self.reviewed_by = reviewer_user_id
    
    def approve(self, reviewer_user_id: int, comments: Optional[str] = None) -> None:
        """
        Approve the review.
        
        Args:
            reviewer_user_id: ID of the checker approving the review
            comments: Optional approval comments
            
        Raises:
            ValueError: If review cannot be approved
        """
        if not self.can_be_reviewed():
            raise ValueError(f"Review cannot be approved from status: {self.status.value}")
        
        self.status = ReviewStatus.APPROVED
        self.reviewed_by = reviewer_user_id
        self.reviewed_at = datetime.utcnow()
        if comments:
            self.comments = comments
    
    def reject(self, reviewer_user_id: int, rejection_reason: str, comments: Optional[str] = None) -> None:
        """
        Reject the review.
        
        Args:
            reviewer_user_id: ID of the checker rejecting the review
            rejection_reason: Reason for rejection
            comments: Optional additional comments
            
        Raises:
            ValueError: If review cannot be rejected or rejection reason is empty
        """
        if not self.can_be_reviewed():
            raise ValueError(f"Review cannot be rejected from status: {self.status.value}")
        
        if not rejection_reason or not rejection_reason.strip():
            raise ValueError("Rejection reason is required")
        
        self.status = ReviewStatus.REJECTED
        self.reviewed_by = reviewer_user_id
        self.reviewed_at = datetime.utcnow()
        self.rejection_reason = rejection_reason.strip()
        if comments:
            self.comments = comments
    
    def reset_to_draft(self) -> None:
        """
        Reset review back to draft status (for rejected reviews).
        
        Raises:
            ValueError: If review cannot be reset to draft
        """
        if self.status != ReviewStatus.REJECTED:
            raise ValueError(f"Only rejected reviews can be reset to draft, current status: {self.status.value}")
        
        self.status = ReviewStatus.DRAFT
        self.reviewed_by = None
        self.reviewed_at = None
        self.rejection_reason = None
        # Keep comments for reference
    
    def add_comment(self, comment: str) -> None:
        """
        Add a comment to the review.
        
        Args:
            comment: Comment to add
        """
        if not comment or not comment.strip():
            return
        
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        new_comment = f"[{timestamp}] {comment.strip()}"
        
        if self.comments:
            self.comments += f"\n\n{new_comment}"
        else:
            self.comments = new_comment
    
    @classmethod
    def get_pending_reviews(cls, db_session) -> List['Review']:
        """
        Get all reviews pending checker review.
        
        Args:
            db_session: Database session
            
        Returns:
            List of pending reviews
        """
        return db_session.query(cls).filter(
            cls.status.in_([ReviewStatus.SUBMITTED, ReviewStatus.UNDER_REVIEW])
        ).order_by(cls.submitted_at).all()
    
    @classmethod
    def get_reviews_by_submitter(cls, db_session, user_id: int) -> List['Review']:
        """
        Get all reviews submitted by a specific user.
        
        Args:
            db_session: Database session
            user_id: ID of the submitting user
            
        Returns:
            List of reviews by the user
        """
        return db_session.query(cls).filter(cls.submitted_by == user_id).order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_reviews_by_reviewer(cls, db_session, user_id: int) -> List['Review']:
        """
        Get all reviews reviewed by a specific checker.
        
        Args:
            db_session: Database session
            user_id: ID of the reviewing user
            
        Returns:
            List of reviews by the checker
        """
        return db_session.query(cls).filter(cls.reviewed_by == user_id).order_by(cls.reviewed_at.desc()).all()
    
    @classmethod
    def get_reviews_by_client(cls, db_session, client_id: str) -> List['Review']:
        """
        Get all reviews for a specific client.
        
        Args:
            db_session: Database session
            client_id: Client ID
            
        Returns:
            List of reviews for the client
        """
        return db_session.query(cls).filter(cls.client_id == client_id).order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_reviews_by_status(cls, db_session, status: ReviewStatus) -> List['Review']:
        """
        Get all reviews with a specific status.
        
        Args:
            db_session: Database session
            status: Review status to filter by
            
        Returns:
            List of reviews with the specified status
        """
        return db_session.query(cls).filter(cls.status == status).order_by(cls.created_at.desc()).all()