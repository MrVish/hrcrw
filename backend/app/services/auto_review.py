"""
Auto-review creation service for high-risk clients.
"""
from datetime import datetime
from typing import List, Dict, Optional
from sqlalchemy.orm import Session

from app.models.client import Client, RiskLevel
from app.models.review import Review, ReviewStatus, ReviewType
from app.models.user import User
from app.services.audit import AuditService


class AutoReviewService:
    """Service for automatically creating reviews for high-risk clients with auto-review flags."""
    
    def __init__(self, db_session: Session, audit_service: AuditService):
        """
        Initialize the auto-review service.
        
        Args:
            db_session: Database session
            audit_service: Audit service for logging
        """
        self.db = db_session
        self.audit_service = audit_service
    
    def create_auto_reviews_for_client(self, client: Client, created_by_user_id: int) -> List[Review]:
        """
        Create auto-reviews for a client based on their enabled auto-review flags.
        
        Args:
            client: Client to create reviews for
            created_by_user_id: ID of the user creating the reviews (system user)
            
        Returns:
            List of created reviews
            
        Raises:
            ValueError: If client is not high-risk or has no auto-review flags enabled
        """
        if not client.is_high_risk:
            raise ValueError(f"Auto-reviews can only be created for high-risk clients. Client {client.client_id} is {client.risk_level.value}")
        
        if not client.has_auto_review_flags:
            raise ValueError(f"Client {client.client_id} has no auto-review flags enabled")
        
        created_reviews = []
        
        # Create reviews for each enabled auto-review type
        for review_type in client.enabled_auto_review_types:
            review = self._create_single_auto_review(client, review_type, created_by_user_id)
            if review:
                created_reviews.append(review)
        
        # Commit all reviews at once
        self.db.commit()
        
        # Log the auto-review creation
        self.audit_service.log_auto_review_creation(
            client_id=client.client_id,
            review_count=len(created_reviews),
            review_types=[r.review_type.value for r in created_reviews],
            created_by=created_by_user_id
        )
        
        return created_reviews
    
    def _create_single_auto_review(self, client: Client, review_type_str: str, created_by_user_id: int) -> Optional[Review]:
        """
        Create a single auto-review for a specific type.
        
        Args:
            client: Client to create review for
            review_type_str: String representation of review type
            created_by_user_id: ID of the user creating the review
            
        Returns:
            Created review or None if creation failed
        """
        # Map string to ReviewType enum
        review_type_mapping = {
            'kyc': ReviewType.KYC,
            'aml': ReviewType.AML,
            'sanctions': ReviewType.SANCTIONS,
            'pep': ReviewType.PEP,
            'financial': ReviewType.FINANCIAL
        }
        
        review_type = review_type_mapping.get(review_type_str)
        if not review_type:
            return None
        
        # Check if there's already a pending auto-review of this type for the client
        existing_review = self.db.query(Review).filter(
            Review.client_id == client.client_id,
            Review.review_type == review_type,
            Review.auto_created == True,
            Review.status.in_([ReviewStatus.DRAFT, ReviewStatus.SUBMITTED, ReviewStatus.UNDER_REVIEW])
        ).first()
        
        if existing_review:
            # Don't create duplicate auto-reviews
            return None
        
        # Create the auto-review
        review = Review(
            client_id=client.client_id,
            submitted_by=created_by_user_id,
            status=ReviewStatus.DRAFT,
            review_type=review_type,
            auto_created=True,
            comments=f"Auto-created {review_type_str.upper()} review for high-risk client"
        )
        
        self.db.add(review)
        return review
    
    def process_all_high_risk_clients_with_auto_reviews(self, created_by_user_id: int) -> Dict[str, int]:
        """
        Process all high-risk clients with auto-review flags and create reviews as needed.
        
        Args:
            created_by_user_id: ID of the system user creating the reviews
            
        Returns:
            Dictionary with processing statistics
        """
        stats = {
            'clients_processed': 0,
            'reviews_created': 0,
            'clients_with_reviews': 0,
            'errors': 0
        }
        
        # Get all high-risk clients with auto-review flags
        clients = Client.get_high_risk_clients_with_auto_reviews(self.db)
        
        for client in clients:
            stats['clients_processed'] += 1
            
            try:
                reviews = self.create_auto_reviews_for_client(client, created_by_user_id)
                if reviews:
                    stats['clients_with_reviews'] += 1
                    stats['reviews_created'] += len(reviews)
            except Exception as e:
                stats['errors'] += 1
                # Log the error but continue processing other clients
                self.audit_service.log_error(
                    action="auto_review_creation_failed",
                    details=f"Failed to create auto-reviews for client {client.client_id}: {str(e)}",
                    user_id=created_by_user_id
                )
        
        return stats
    
    def get_auto_reviews_by_type(self, review_type: ReviewType, status: Optional[ReviewStatus] = None) -> List[Review]:
        """
        Get all auto-created reviews of a specific type.
        
        Args:
            review_type: Type of review to filter by
            status: Optional status filter
            
        Returns:
            List of matching auto-reviews
        """
        query = self.db.query(Review).filter(
            Review.auto_created == True,
            Review.review_type == review_type
        )
        
        if status:
            query = query.filter(Review.status == status)
        
        return query.order_by(Review.created_at.desc()).all()
    
    def get_pending_auto_reviews(self) -> List[Review]:
        """
        Get all pending auto-created reviews.
        
        Returns:
            List of pending auto-reviews
        """
        return self.db.query(Review).filter(
            Review.auto_created == True,
            Review.status.in_([ReviewStatus.DRAFT, ReviewStatus.SUBMITTED, ReviewStatus.UNDER_REVIEW])
        ).order_by(Review.created_at.desc()).all()
    
    def get_auto_reviews_for_client(self, client_id: str) -> List[Review]:
        """
        Get all auto-created reviews for a specific client.
        
        Args:
            client_id: Client ID to filter by
            
        Returns:
            List of auto-reviews for the client
        """
        return self.db.query(Review).filter(
            Review.client_id == client_id,
            Review.auto_created == True
        ).order_by(Review.created_at.desc()).all()
    
    def cleanup_old_draft_auto_reviews(self, days_old: int = 30) -> int:
        """
        Clean up old draft auto-reviews that haven't been processed.
        
        Args:
            days_old: Number of days after which draft reviews should be cleaned up
            
        Returns:
            Number of reviews cleaned up
        """
        from datetime import timedelta
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        old_drafts = self.db.query(Review).filter(
            Review.auto_created == True,
            Review.status == ReviewStatus.DRAFT,
            Review.created_at < cutoff_date
        ).all()
        
        count = len(old_drafts)
        
        for review in old_drafts:
            self.db.delete(review)
        
        self.db.commit()
        
        if count > 0:
            self.audit_service.log_auto_review_cleanup(
                reviews_cleaned=count,
                cutoff_date=cutoff_date
            )
        
        return count