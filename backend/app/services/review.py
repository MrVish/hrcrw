"""
Review service layer for business logic and database operations.
"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc

from app.models.review import Review, ReviewStatus
from app.models.client import Client
from app.models.user import User, UserRole
from app.models.document import Document
from app.models.exception import ReviewException
from app.models.kyc_questionnaire import KYCQuestionnaire
from app.schemas.review import ReviewCreate, ReviewUpdate, ReviewSearchFilters
from app.schemas.kyc_questionnaire import KYCQuestionnaireCreate, KYCQuestionnaireUpdate
from app.schemas.exception import ReviewExceptionCreate
from app.services.audit import AuditService
from app.services.workflow_history import WorkflowHistoryService


logger = logging.getLogger(__name__)


class ReviewService:
    """Service class for review-related operations."""
    
    def __init__(self, db: Session, audit_service: Optional[AuditService] = None, notification_service=None, workflow_history_service: Optional[WorkflowHistoryService] = None):
        """
        Initialize review service.
        
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
    
    def get_review_by_id(self, review_id: int) -> Optional[Review]:
        """
        Get review by ID.
        
        Args:
            review_id: Review ID
            
        Returns:
            Review object or None if not found
        """
        return self.db.query(Review).filter(Review.id == review_id).first()
    
    def create_review(self, review_data: ReviewCreate, created_by_user_id: int, 
                     kyc_data: Optional[KYCQuestionnaireCreate] = None) -> Review:
        """
        Create a new review with optional KYC questionnaire.
        
        Args:
            review_data: Review creation data
            created_by_user_id: ID of user creating the review
            kyc_data: Optional KYC questionnaire data
            
        Returns:
            Created review object
            
        Raises:
            ValueError: If client doesn't exist or user doesn't have permission
        """
        # Verify client exists
        client = self.db.query(Client).filter(Client.client_id == review_data.client_id).first()
        if not client:
            raise ValueError(f"Client with ID '{review_data.client_id}' not found")
        
        # Verify user is a Maker
        user = self.db.query(User).filter(User.id == created_by_user_id).first()
        if not user or not user.is_maker:
            raise ValueError("Only Makers can create reviews")
        
        # Create new review
        review = Review(
            client_id=review_data.client_id,
            submitted_by=created_by_user_id,
            comments=review_data.comments,
            status=ReviewStatus.DRAFT
        )
        
        self.db.add(review)
        self.db.flush()  # Flush to get the ID
        
        # Create KYC questionnaire if provided
        if kyc_data:
            kyc_questionnaire = KYCQuestionnaire(
                review_id=review.id,
                purpose_of_account=kyc_data.purpose_of_account,
                kyc_documents_complete=kyc_data.kyc_documents_complete,
                missing_kyc_details=kyc_data.missing_kyc_details,
                account_purpose_aligned=kyc_data.account_purpose_aligned,
                adverse_media_completed=kyc_data.adverse_media_completed,
                adverse_media_evidence=kyc_data.adverse_media_evidence,
                senior_mgmt_approval=kyc_data.senior_mgmt_approval,
                pep_approval_obtained=kyc_data.pep_approval_obtained,
                static_data_correct=kyc_data.static_data_correct,
                kyc_documents_valid=kyc_data.kyc_documents_valid,
                regulated_business_license=kyc_data.regulated_business_license,
                remedial_actions=kyc_data.remedial_actions,
                source_of_funds_docs=kyc_data.source_of_funds_docs or []
            )
            self.db.add(kyc_questionnaire)
        
        # Log audit trail
        audit_details = {
            "client_id": review.client_id,
            "status": review.status.value,
            "comments": review.comments,
            "has_kyc_questionnaire": kyc_data is not None
        }
        
        self.audit_service.log_action(
            user_id=created_by_user_id,
            entity_type="Review",
            entity_id=str(review.id),
            action="CREATE",
            details=audit_details
        )
        
        # Record workflow history
        self.workflow_history_service.record_action(
            entity_type="review",
            entity_id=review.id,
            action="create",
            user_id=created_by_user_id,
            to_status=review.status.value,
            comments=review.comments,
            metadata={
                "client_id": review.client_id,
                "has_kyc_questionnaire": kyc_data is not None
            }
        )
        
        self.db.commit()
        return review
    
    def update_review(self, review_id: int, review_data: ReviewUpdate, updated_by_user_id: int) -> Optional[Review]:
        """
        Update an existing review.
        
        Args:
            review_id: Review ID
            review_data: Review update data
            updated_by_user_id: ID of user updating the review
            
        Returns:
            Updated review object or None if not found
            
        Raises:
            ValueError: If review cannot be updated or user doesn't have permission
        """
        review = self.get_review_by_id(review_id)
        if not review:
            return None
        
        # Check if review can be edited
        if not review.can_be_edited():
            raise ValueError(f"Review cannot be edited in status: {review.status.value}")
        
        # Check if user has permission to edit (only the submitter or admin)
        user = self.db.query(User).filter(User.id == updated_by_user_id).first()
        if not user:
            raise ValueError("User not found")
        
        if review.submitted_by != updated_by_user_id and not user.is_admin:
            raise ValueError("Only the review submitter or admin can edit the review")
        
        # Store original values for audit
        original_values = {
            "comments": review.comments
        }
        
        # Update fields
        update_data = review_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(review, field, value)
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=updated_by_user_id,
            entity_type="Review",
            entity_id=str(review.id),
            action="UPDATE",
            details={
                "original_values": original_values,
                "updated_values": update_data
            }
        )
        
        self.db.commit()
        return review
    
    def submit_review(self, review_id: int, submitted_by_user_id: int, comments: Optional[str] = None,
                     exception_data: Optional[List[ReviewExceptionCreate]] = None) -> Optional[Review]:
        """
        Submit a review for checker approval with optional exceptions.
        
        Args:
            review_id: Review ID
            submitted_by_user_id: ID of user submitting the review
            comments: Optional submission comments
            exception_data: Optional list of exceptions to create
            
        Returns:
            Updated review object or None if not found
            
        Raises:
            ValueError: If review cannot be submitted or user doesn't have permission
        """
        review = self.get_review_by_id(review_id)
        if not review:
            return None
        
        # Check if user has permission to submit (only the submitter)
        if review.submitted_by != submitted_by_user_id:
            raise ValueError("Only the review submitter can submit the review")
        
        # Validate KYC questionnaire if it exists
        kyc_questionnaire = self.db.query(KYCQuestionnaire).filter(
            KYCQuestionnaire.review_id == review_id
        ).first()
        
        if kyc_questionnaire:
            validation_errors = kyc_questionnaire.validate_conditional_fields()
            if validation_errors:
                raise ValueError(f"KYC questionnaire validation failed: {'; '.join(validation_errors)}")
        
        # Add submission comments if provided
        if comments:
            review.add_comment(f"Submission: {comments}")
        
        # Create exceptions if provided
        created_exceptions = []
        if exception_data:
            for exc_data in exception_data:
                exception = ReviewException(
                    review_id=review_id,
                    exception_type=exc_data.exception_type,
                    title=exc_data.title,
                    description=exc_data.description,
                    priority=exc_data.priority,
                    created_by=submitted_by_user_id
                )
                self.db.add(exception)
                created_exceptions.append(exception)
        
        # Submit the review
        review.submit(submitted_by_user_id)
        
        # Log audit trail
        audit_details = {
            "status": review.status.value,
            "submitted_at": review.submitted_at.isoformat() if review.submitted_at else None,
            "comments": comments,
            "exceptions_created": len(created_exceptions),
            "has_kyc_questionnaire": kyc_questionnaire is not None
        }
        
        self.audit_service.log_action(
            user_id=submitted_by_user_id,
            entity_type="Review",
            entity_id=str(review.id),
            action="SUBMIT",
            details=audit_details
        )
        
        # Record workflow history
        self.workflow_history_service.record_action(
            entity_type="review",
            entity_id=review.id,
            action="submit",
            user_id=submitted_by_user_id,
            from_status="draft",
            to_status=review.status.value,
            comments=comments,
            metadata={
                "exceptions_created": len(created_exceptions),
                "has_kyc_questionnaire": kyc_questionnaire is not None
            }
        )
        
        self.db.commit()
        
        # Send notification to checkers
        if self.notification_service:
            try:
                self.notification_service.notify_review_submitted(review.id, submitted_by_user_id)
            except Exception as e:
                logger.error(f"Failed to send review submission notification: {e}")
        
        return review
    
    def start_review(self, review_id: int, reviewer_user_id: int) -> Optional[Review]:
        """
        Start reviewing a submitted review.
        
        Args:
            review_id: Review ID
            reviewer_user_id: ID of checker starting the review
            
        Returns:
            Updated review object or None if not found
            
        Raises:
            ValueError: If review cannot be started or user doesn't have permission
        """
        review = self.get_review_by_id(review_id)
        if not review:
            return None
        
        # Verify user is a Checker
        user = self.db.query(User).filter(User.id == reviewer_user_id).first()
        if not user or not user.is_checker:
            raise ValueError("Only Checkers can review submissions")
        
        # Check maker-checker separation
        if review.submitted_by == reviewer_user_id:
            raise ValueError("Checker cannot review their own submission")
        
        # Start the review
        review.start_review(reviewer_user_id)
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=reviewer_user_id,
            entity_type="Review",
            entity_id=str(review.id),
            action="START_REVIEW",
            details={
                "status": review.status.value,
                "reviewer_id": reviewer_user_id
            }
        )
        
        self.db.commit()
        return review
    
    def approve_review(self, review_id: int, reviewer_user_id: int, comments: Optional[str] = None) -> Optional[Review]:
        """
        Approve a review.
        
        Args:
            review_id: Review ID
            reviewer_user_id: ID of checker approving the review
            comments: Optional approval comments
            
        Returns:
            Updated review object or None if not found
            
        Raises:
            ValueError: If review cannot be approved or user doesn't have permission
        """
        review = self.get_review_by_id(review_id)
        if not review:
            return None
        
        # Verify user is a Checker
        user = self.db.query(User).filter(User.id == reviewer_user_id).first()
        if not user or not user.is_checker:
            raise ValueError("Only Checkers can approve reviews")
        
        # Check maker-checker separation
        if review.submitted_by == reviewer_user_id:
            raise ValueError("Checker cannot approve their own submission")
        
        # Add approval comments if provided
        if comments:
            review.add_comment(f"Approval: {comments}")
        
        # Approve the review
        review.approve(reviewer_user_id, comments)
        
        # Update client's last review date
        client = self.db.query(Client).filter(Client.client_id == review.client_id).first()
        if client:
            client.update_review_date()
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=reviewer_user_id,
            entity_type="Review",
            entity_id=str(review.id),
            action="APPROVE",
            details={
                "status": review.status.value,
                "reviewed_at": review.reviewed_at.isoformat() if review.reviewed_at else None,
                "comments": comments
            }
        )
        
        # Record workflow history
        self.workflow_history_service.record_action(
            entity_type="review",
            entity_id=review.id,
            action="approve",
            user_id=reviewer_user_id,
            from_status="under_review",
            to_status=review.status.value,
            comments=comments,
            metadata={
                "reviewed_at": review.reviewed_at.isoformat() if review.reviewed_at else None
            }
        )
        
        self.db.commit()
        
        # Send notification to submitter
        if self.notification_service:
            try:
                self.notification_service.notify_review_approved(review.id, reviewer_user_id, comments)
            except Exception as e:
                logger.error(f"Failed to send review approval notification: {e}")
        
        return review
    
    def reject_review(self, review_id: int, reviewer_user_id: int, rejection_reason: str, comments: Optional[str] = None) -> Optional[Review]:
        """
        Reject a review.
        
        Args:
            review_id: Review ID
            reviewer_user_id: ID of checker rejecting the review
            rejection_reason: Reason for rejection
            comments: Optional additional comments
            
        Returns:
            Updated review object or None if not found
            
        Raises:
            ValueError: If review cannot be rejected or user doesn't have permission
        """
        review = self.get_review_by_id(review_id)
        if not review:
            return None
        
        # Verify user is a Checker
        user = self.db.query(User).filter(User.id == reviewer_user_id).first()
        if not user or not user.is_checker:
            raise ValueError("Only Checkers can reject reviews")
        
        # Check maker-checker separation
        if review.submitted_by == reviewer_user_id:
            raise ValueError("Checker cannot reject their own submission")
        
        # Add rejection comments if provided
        if comments:
            review.add_comment(f"Rejection: {comments}")
        
        # Reject the review
        review.reject(reviewer_user_id, rejection_reason, comments)
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=reviewer_user_id,
            entity_type="Review",
            entity_id=str(review.id),
            action="REJECT",
            details={
                "status": review.status.value,
                "reviewed_at": review.reviewed_at.isoformat() if review.reviewed_at else None,
                "rejection_reason": rejection_reason,
                "comments": comments
            }
        )
        
        # Record workflow history
        self.workflow_history_service.record_action(
            entity_type="review",
            entity_id=review.id,
            action="reject",
            user_id=reviewer_user_id,
            from_status="under_review",
            to_status=review.status.value,
            comments=f"{rejection_reason}. {comments}" if comments else rejection_reason,
            metadata={
                "rejection_reason": rejection_reason,
                "reviewed_at": review.reviewed_at.isoformat() if review.reviewed_at else None
            }
        )
        
        self.db.commit()
        
        # Send notification to submitter
        if self.notification_service:
            try:
                self.notification_service.notify_review_rejected(review.id, reviewer_user_id, rejection_reason, comments)
            except Exception as e:
                logger.error(f"Failed to send review rejection notification: {e}")
        
        return review
    
    def search_reviews(self, filters: ReviewSearchFilters) -> Tuple[List[Review], int]:
        """
        Search reviews with filtering and pagination.
        
        Args:
            filters: Search and filter parameters
            
        Returns:
            Tuple of (reviews list, total count)
        """
        query = self.db.query(Review).options(
            joinedload(Review.client),
            joinedload(Review.submitter),
            joinedload(Review.reviewer)
        )
        
        # Apply filters
        if filters.client_id:
            query = query.filter(Review.client_id == filters.client_id)
        
        if filters.status:
            query = query.filter(Review.status == filters.status)
        
        if filters.submitted_by:
            query = query.filter(Review.submitted_by == filters.submitted_by)
        
        if filters.reviewed_by:
            query = query.filter(Review.reviewed_by == filters.reviewed_by)
        
        if filters.submitted_after:
            query = query.filter(Review.submitted_at >= filters.submitted_after)
        
        if filters.submitted_before:
            query = query.filter(Review.submitted_at <= filters.submitted_before)
        
        if filters.reviewed_after:
            query = query.filter(Review.reviewed_at >= filters.reviewed_after)
        
        if filters.reviewed_before:
            query = query.filter(Review.reviewed_at <= filters.reviewed_before)
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply sorting
        if filters.sort_by:
            sort_column = getattr(Review, filters.sort_by, None)
            if sort_column:
                if filters.sort_order == "desc":
                    query = query.order_by(desc(sort_column))
                else:
                    query = query.order_by(asc(sort_column))
        
        # Apply pagination
        offset = (filters.page - 1) * filters.per_page
        query = query.offset(offset).limit(filters.per_page)
        
        reviews = query.all()
        return reviews, total_count
    
    def get_review_detail(self, review_id: int) -> Optional[Dict[str, Any]]:
        """
        Get detailed review information including related data and KYC questionnaire.
        
        Args:
            review_id: Review ID
            
        Returns:
            Dictionary with review details, KYC questionnaire, and statistics or None if not found
        """
        review = self.db.query(Review).options(
            joinedload(Review.client),
            joinedload(Review.submitter),
            joinedload(Review.reviewer),
            joinedload(Review.kyc_questionnaire)
        ).filter(Review.id == review_id).first()
        
        if not review:
            return None
        
        # Get document and exception counts
        document_count = self.db.query(func.count(Document.id)).filter(Document.review_id == review.id).scalar() or 0
        exception_count = self.db.query(func.count(ReviewException.id)).filter(ReviewException.review_id == review.id).scalar() or 0
        
        # Get KYC questionnaire if it exists
        kyc_questionnaire = None
        if hasattr(review, 'kyc_questionnaire') and review.kyc_questionnaire:
            kyc_questionnaire = review.kyc_questionnaire
        
        return {
            "review": review,
            "client_name": review.client.name if review.client else None,
            "client_risk_level": review.client.risk_level.value if review.client else None,
            "submitter_name": review.submitter.name if review.submitter else None,
            "reviewer_name": review.reviewer.name if review.reviewer else None,
            "document_count": document_count,
            "exception_count": exception_count,
            "kyc_questionnaire": kyc_questionnaire
        }
    
    def get_pending_reviews(self) -> List[Review]:
        """
        Get all reviews pending checker review.
        
        Returns:
            List of pending reviews
        """
        return self.db.query(Review).filter(
            Review.status.in_([ReviewStatus.SUBMITTED, ReviewStatus.UNDER_REVIEW])
        ).order_by(Review.submitted_at).all()
    
    def get_reviews_by_user(self, user_id: int, role: UserRole) -> List[Review]:
        """
        Get reviews associated with a user based on their role.
        
        Args:
            user_id: User ID
            role: User role
            
        Returns:
            List of reviews
        """
        if role == UserRole.MAKER:
            return self.db.query(Review).filter(Review.submitted_by == user_id).order_by(desc(Review.created_at)).all()
        elif role == UserRole.CHECKER:
            return self.db.query(Review).filter(Review.reviewed_by == user_id).order_by(desc(Review.reviewed_at)).all()
        else:
            # Admin can see all reviews
            return self.db.query(Review).order_by(desc(Review.created_at)).all()
    
    def get_review_statistics(self) -> Dict[str, Any]:
        """
        Get review statistics for dashboard.
        
        Returns:
            Dictionary with review statistics
        """
        # Get counts by status
        status_counts = self.db.query(
            Review.status,
            func.count(Review.id)
        ).group_by(Review.status).all()
        
        stats = {
            "total_reviews": 0,
            "draft_reviews": 0,
            "submitted_reviews": 0,
            "under_review_reviews": 0,
            "approved_reviews": 0,
            "rejected_reviews": 0,
            "pending_reviews": 0,
            "avg_review_time_hours": None
        }
        
        for status, count in status_counts:
            stats["total_reviews"] += count
            if status == ReviewStatus.DRAFT:
                stats["draft_reviews"] = count
            elif status == ReviewStatus.SUBMITTED:
                stats["submitted_reviews"] = count
                stats["pending_reviews"] += count
            elif status == ReviewStatus.UNDER_REVIEW:
                stats["under_review_reviews"] = count
                stats["pending_reviews"] += count
            elif status == ReviewStatus.APPROVED:
                stats["approved_reviews"] = count
            elif status == ReviewStatus.REJECTED:
                stats["rejected_reviews"] = count
        
        # Calculate average review time for completed reviews
        completed_reviews = self.db.query(Review).filter(
            and_(
                Review.status.in_([ReviewStatus.APPROVED, ReviewStatus.REJECTED]),
                Review.submitted_at.isnot(None),
                Review.reviewed_at.isnot(None)
            )
        ).all()
        
        if completed_reviews:
            total_hours = 0
            for review in completed_reviews:
                time_diff = review.reviewed_at - review.submitted_at
                total_hours += time_diff.total_seconds() / 3600
            
            stats["avg_review_time_hours"] = round(total_hours / len(completed_reviews), 2)
        
        return stats
    
    def get_review_documents(self, review_id: int, user_id: int, include_deleted: bool = False) -> List[Document]:
        """
        Get all documents for a specific review with access control.
        
        Args:
            review_id: Review ID
            user_id: ID of user requesting access
            include_deleted: Whether to include deleted documents
            
        Returns:
            List of documents for the review
            
        Raises:
            ValueError: If access is denied or review not found
        """
        review = self.get_review_by_id(review_id)
        if not review:
            raise ValueError(f"Review {review_id} not found")
        
        # Check access permissions
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        # Allow access if user is the maker, assigned checker, or admin
        has_access = (
            review.submitted_by == user_id or
            review.reviewed_by == user_id or
            user.role == UserRole.ADMIN
        )
        
        if not has_access:
            raise ValueError("Access denied to review documents")
        
        # Get documents
        query = self.db.query(Document).filter(Document.review_id == review_id)
        
        if not include_deleted:
            query = query.filter(Document.status != "deleted")
        
        return query.order_by(Document.created_at.desc()).all()
    
    def validate_review_for_submission(self, review_id: int) -> Tuple[bool, List[str]]:
        """
        Validate if a review is ready for submission.
        
        Args:
            review_id: Review ID
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        review = self.get_review_by_id(review_id)
        if not review:
            return False, ["Review not found"]
        
        errors = []
        
        # Check if review can be submitted
        if not review.can_be_submitted():
            errors.append(f"Review cannot be submitted from status: {review.status.value}")
        
        # Check if client exists and is high-risk
        client = self.db.query(Client).filter(Client.client_id == review.client_id).first()
        if not client:
            errors.append("Associated client not found")
        elif client.risk_level.value != "high":
            errors.append("Review can only be submitted for high-risk clients")
        
        # Check if required documents are uploaded
        active_documents = self.db.query(Document).filter(
            and_(
                Document.review_id == review_id,
                Document.status == "active"
            )
        ).count()
        
        if active_documents == 0:
            errors.append("At least one document must be uploaded before submission")
        
        # Check for any uploading documents
        uploading_documents = self.db.query(Document).filter(
            and_(
                Document.review_id == review_id,
                Document.status == "uploading"
            )
        ).count()
        
        if uploading_documents > 0:
            errors.append("All document uploads must be completed before submission")
        
        return len(errors) == 0, errors
    
    def get_review_document_summary(self, review_id: int) -> Dict[str, Any]:
        """
        Get document summary for a review.
        
        Args:
            review_id: Review ID
            
        Returns:
            Dictionary with document statistics
        """
        documents = self.db.query(Document).filter(Document.review_id == review_id).all()
        
        summary = {
            "total_documents": len(documents),
            "active_documents": 0,
            "uploading_documents": 0,
            "deleted_documents": 0,
            "sensitive_documents": 0,
            "total_file_size": 0,
            "documents_by_type": {},
            "latest_upload": None
        }
        
        for doc in documents:
            if doc.status == "active":
                summary["active_documents"] += 1
            elif doc.status == "uploading":
                summary["uploading_documents"] += 1
            elif doc.status == "deleted":
                summary["deleted_documents"] += 1
            
            if doc.is_sensitive:
                summary["sensitive_documents"] += 1
            
            summary["total_file_size"] += doc.file_size or 0
            
            # Count by type
            doc_type = doc.document_type
            summary["documents_by_type"][doc_type] = summary["documents_by_type"].get(doc_type, 0) + 1
            
            # Track latest upload
            if not summary["latest_upload"] or doc.created_at > summary["latest_upload"]:
                summary["latest_upload"] = doc.created_at
        
        return summary
    
    def create_kyc_questionnaire(self, review_id: int, kyc_data: KYCQuestionnaireCreate, 
                                created_by_user_id: int) -> KYCQuestionnaire:
        """
        Create a KYC questionnaire for a review.
        
        Args:
            review_id: Review ID
            kyc_data: KYC questionnaire data
            created_by_user_id: ID of user creating the questionnaire
            
        Returns:
            Created KYC questionnaire
            
        Raises:
            ValueError: If review doesn't exist, questionnaire already exists, or user doesn't have permission
        """
        # Verify review exists and user has permission
        review = self.get_review_by_id(review_id)
        if not review:
            raise ValueError(f"Review {review_id} not found")
        
        if review.submitted_by != created_by_user_id:
            user = self.db.query(User).filter(User.id == created_by_user_id).first()
            if not user or not user.is_admin:
                raise ValueError("Only the review submitter or admin can create KYC questionnaire")
        
        # Check if questionnaire already exists
        existing = self.db.query(KYCQuestionnaire).filter(
            KYCQuestionnaire.review_id == review_id
        ).first()
        if existing:
            raise ValueError(f"KYC questionnaire already exists for review {review_id}")
        
        # Create questionnaire
        questionnaire = KYCQuestionnaire(
            review_id=review_id,
            purpose_of_account=kyc_data.purpose_of_account,
            kyc_documents_complete=kyc_data.kyc_documents_complete,
            missing_kyc_details=kyc_data.missing_kyc_details,
            account_purpose_aligned=kyc_data.account_purpose_aligned,
            adverse_media_completed=kyc_data.adverse_media_completed,
            adverse_media_evidence=kyc_data.adverse_media_evidence,
            senior_mgmt_approval=kyc_data.senior_mgmt_approval,
            pep_approval_obtained=kyc_data.pep_approval_obtained,
            static_data_correct=kyc_data.static_data_correct,
            kyc_documents_valid=kyc_data.kyc_documents_valid,
            regulated_business_license=kyc_data.regulated_business_license,
            remedial_actions=kyc_data.remedial_actions,
            source_of_funds_docs=kyc_data.source_of_funds_docs or []
        )
        
        self.db.add(questionnaire)
        self.db.flush()
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=created_by_user_id,
            entity_type="KYCQuestionnaire",
            entity_id=str(questionnaire.id),
            action="CREATE",
            details={
                "review_id": review_id,
                "is_complete": questionnaire.is_complete
            }
        )
        
        self.db.commit()
        return questionnaire
    
    def update_kyc_questionnaire(self, review_id: int, kyc_data: KYCQuestionnaireUpdate,
                                updated_by_user_id: int) -> Optional[KYCQuestionnaire]:
        """
        Update a KYC questionnaire for a review.
        
        Args:
            review_id: Review ID
            kyc_data: KYC questionnaire update data
            updated_by_user_id: ID of user updating the questionnaire
            
        Returns:
            Updated KYC questionnaire or None if not found
            
        Raises:
            ValueError: If review doesn't exist or user doesn't have permission
        """
        # Verify review exists and user has permission
        review = self.get_review_by_id(review_id)
        if not review:
            raise ValueError(f"Review {review_id} not found")
        
        if review.submitted_by != updated_by_user_id:
            user = self.db.query(User).filter(User.id == updated_by_user_id).first()
            if not user or not user.is_admin:
                raise ValueError("Only the review submitter or admin can update KYC questionnaire")
        
        # Check if review can be edited
        if not review.can_be_edited():
            raise ValueError(f"Review cannot be edited in status: {review.status.value}")
        
        # Get existing questionnaire
        questionnaire = self.db.query(KYCQuestionnaire).filter(
            KYCQuestionnaire.review_id == review_id
        ).first()
        
        if not questionnaire:
            return None
        
        # Store original values for audit
        original_values = questionnaire.to_dict()
        
        # Update fields
        update_data = kyc_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(questionnaire, field):
                setattr(questionnaire, field, value)
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=updated_by_user_id,
            entity_type="KYCQuestionnaire",
            entity_id=str(questionnaire.id),
            action="UPDATE",
            details={
                "review_id": review_id,
                "updated_fields": list(update_data.keys()),
                "is_complete": questionnaire.is_complete
            }
        )
        
        self.db.commit()
        return questionnaire
    
    def get_kyc_questionnaire(self, review_id: int) -> Optional[KYCQuestionnaire]:
        """
        Get KYC questionnaire for a review.
        
        Args:
            review_id: Review ID
            
        Returns:
            KYC questionnaire or None if not found
        """
        return self.db.query(KYCQuestionnaire).filter(
            KYCQuestionnaire.review_id == review_id
        ).first()
    
    def create_review_exceptions(self, review_id: int, exception_data: List[ReviewExceptionCreate],
                               created_by_user_id: int) -> List[ReviewException]:
        """
        Create exceptions for a review.
        
        Args:
            review_id: Review ID
            exception_data: List of exception data
            created_by_user_id: ID of user creating the exceptions
            
        Returns:
            List of created exceptions
            
        Raises:
            ValueError: If review doesn't exist or user doesn't have permission
        """
        # Verify review exists and user has permission
        review = self.get_review_by_id(review_id)
        if not review:
            raise ValueError(f"Review {review_id} not found")
        
        if review.submitted_by != created_by_user_id:
            user = self.db.query(User).filter(User.id == created_by_user_id).first()
            if not user or not user.is_admin:
                raise ValueError("Only the review submitter or admin can create exceptions")
        
        # Create exceptions
        created_exceptions = []
        for exc_data in exception_data:
            exception = ReviewException(
                review_id=review_id,
                exception_type=exc_data.exception_type,
                description=exc_data.description,
                created_by=created_by_user_id
            )
            self.db.add(exception)
            created_exceptions.append(exception)
        
        self.db.flush()
        
        # Log audit trail for each exception
        for exception in created_exceptions:
            self.audit_service.log_action(
                user_id=created_by_user_id,
                entity_type="ReviewException",
                entity_id=str(exception.id),
                action="CREATE",
                details={
                    "review_id": review_id,
                    "exception_type": exception.exception_type.value,
                    "description": exception.description
                }
            )
        
        self.db.commit()
        return created_exceptions
    
    def get_review_exceptions(self, review_id: int) -> List[ReviewException]:
        """
        Get all exceptions for a review.
        
        Args:
            review_id: Review ID
            
        Returns:
            List of exceptions for the review
        """
        return self.db.query(ReviewException).filter(
            ReviewException.review_id == review_id
        ).order_by(ReviewException.created_at.desc()).all()
    
    def link_document_to_kyc_question(self, review_id: int, document_id: int, 
                                     question_field: str = "source_of_funds_docs",
                                     user_id: int = None) -> bool:
        """
        Link a document to a specific KYC questionnaire question.
        
        Args:
            review_id: Review ID
            document_id: Document ID to link
            question_field: KYC question field to link to (default: source_of_funds_docs)
            user_id: ID of user performing the operation
            
        Returns:
            True if successful, False otherwise
            
        Raises:
            ValueError: If review, document, or questionnaire not found
        """
        # Verify review exists
        review = self.get_review_by_id(review_id)
        if not review:
            raise ValueError(f"Review {review_id} not found")
        
        # Verify document exists and belongs to the review
        document = self.db.query(Document).filter(
            and_(Document.id == document_id, Document.review_id == review_id)
        ).first()
        if not document:
            raise ValueError(f"Document {document_id} not found for review {review_id}")
        
        # Get or create KYC questionnaire
        questionnaire = self.get_kyc_questionnaire(review_id)
        if not questionnaire:
            raise ValueError(f"KYC questionnaire not found for review {review_id}")
        
        # Link document to the specified question field
        if question_field == "source_of_funds_docs":
            questionnaire.add_source_of_funds_document(document_id)
        else:
            raise ValueError(f"Unsupported question field: {question_field}")
        
        # Log audit trail if user provided
        if user_id:
            self.audit_service.log_action(
                user_id=user_id,
                entity_type="KYCQuestionnaire",
                entity_id=str(questionnaire.id),
                action="LINK_DOCUMENT",
                details={
                    "review_id": review_id,
                    "document_id": document_id,
                    "question_field": question_field,
                    "document_filename": document.filename
                }
            )
        
        self.db.commit()
        return True
    
    def unlink_document_from_kyc_question(self, review_id: int, document_id: int,
                                         question_field: str = "source_of_funds_docs",
                                         user_id: int = None) -> bool:
        """
        Unlink a document from a specific KYC questionnaire question.
        
        Args:
            review_id: Review ID
            document_id: Document ID to unlink
            question_field: KYC question field to unlink from
            user_id: ID of user performing the operation
            
        Returns:
            True if successful, False otherwise
            
        Raises:
            ValueError: If review or questionnaire not found
        """
        # Get KYC questionnaire
        questionnaire = self.get_kyc_questionnaire(review_id)
        if not questionnaire:
            raise ValueError(f"KYC questionnaire not found for review {review_id}")
        
        # Unlink document from the specified question field
        if question_field == "source_of_funds_docs":
            questionnaire.remove_source_of_funds_document(document_id)
        else:
            raise ValueError(f"Unsupported question field: {question_field}")
        
        # Log audit trail if user provided
        if user_id:
            self.audit_service.log_action(
                user_id=user_id,
                entity_type="KYCQuestionnaire",
                entity_id=str(questionnaire.id),
                action="UNLINK_DOCUMENT",
                details={
                    "review_id": review_id,
                    "document_id": document_id,
                    "question_field": question_field
                }
            )
        
        self.db.commit()
        return True
    
    def get_kyc_linked_documents(self, review_id: int, question_field: str = "source_of_funds_docs") -> List[Document]:
        """
        Get documents linked to a specific KYC question.
        
        Args:
            review_id: Review ID
            question_field: KYC question field to get documents for
            
        Returns:
            List of documents linked to the question
        """
        questionnaire = self.get_kyc_questionnaire(review_id)
        if not questionnaire:
            return []
        
        if question_field == "source_of_funds_docs":
            document_ids = questionnaire.get_document_ids()
            if not document_ids:
                return []
            
            return self.db.query(Document).filter(
                and_(
                    Document.id.in_(document_ids),
                    Document.review_id == review_id,
                    Document.status == "active"
                )
            ).all()
        
        return []
    
    def validate_review_with_kyc_and_documents(self, review_id: int) -> Tuple[bool, List[str], List[str]]:
        """
        Enhanced validation that includes KYC questionnaire and document requirements.
        
        Args:
            review_id: Review ID
            
        Returns:
            Tuple of (is_valid, errors, warnings)
        """
        # Start with base validation
        is_valid, errors = self.validate_review_for_submission(review_id)
        warnings = []
        
        # Get KYC questionnaire
        questionnaire = self.get_kyc_questionnaire(review_id)
        if questionnaire:
            # Validate KYC questionnaire completeness
            if not questionnaire.is_complete:
                errors.append("KYC questionnaire is incomplete")
                is_valid = False
            
            # Validate conditional fields
            kyc_errors = questionnaire.validate_conditional_fields()
            if kyc_errors:
                errors.extend(kyc_errors)
                is_valid = False
            
            # Check document requirements for Q12 (source of funds)
            source_docs = questionnaire.get_document_ids()
            if not source_docs:
                errors.append("Source of funds documentation (Q12) is required")
                is_valid = False
            else:
                # Verify documents exist and are active
                active_source_docs = self.db.query(Document).filter(
                    and_(
                        Document.id.in_(source_docs),
                        Document.review_id == review_id,
                        Document.status == "active"
                    )
                ).count()
                
                if active_source_docs == 0:
                    errors.append("No active source of funds documents found")
                    is_valid = False
                elif active_source_docs < len(source_docs):
                    warnings.append("Some source of funds documents are not active")
            
            # Check for adverse media evidence if Q5 indicates issues
            if (questionnaire.adverse_media_completed and 
                questionnaire.adverse_media_completed.value == "yes" and
                not questionnaire.adverse_media_evidence):
                warnings.append("Adverse media evidence details recommended when adverse media check is completed")
        else:
            warnings.append("No KYC questionnaire found - using legacy review format")
        
        return is_valid, errors, warnings
    
    def check_review_document_requirements(self, review_id: int) -> Dict[str, Any]:
        """
        Check if review meets document requirements for different client types.
        
        Args:
            review_id: Review ID
            
        Returns:
            Dictionary with requirement check results
        """
        review = self.get_review_by_id(review_id)
        if not review:
            return {"error": "Review not found"}
        
        client = self.db.query(Client).filter(Client.client_id == review.client_id).first()
        if not client:
            return {"error": "Client not found"}
        
        documents = self.db.query(Document).filter(
            and_(
                Document.review_id == review_id,
                Document.status == "active"
            )
        ).all()
        
        doc_types = {doc.document_type for doc in documents}
        
        # Define requirements based on client risk level
        requirements = {
            "high": {
                "required_types": ["identity", "financial", "compliance"],
                "recommended_types": ["legal", "supporting"],
                "min_documents": 3
            },
            "medium": {
                "required_types": ["identity", "financial"],
                "recommended_types": ["compliance", "supporting"],
                "min_documents": 2
            },
            "low": {
                "required_types": ["identity"],
                "recommended_types": ["financial", "supporting"],
                "min_documents": 1
            }
        }
        
        client_requirements = requirements.get(client.risk_level.value, requirements["high"])
        
        missing_required = set(client_requirements["required_types"]) - doc_types
        missing_recommended = set(client_requirements["recommended_types"]) - doc_types
        
        meets_requirements = (
            len(missing_required) == 0 and
            len(documents) >= client_requirements["min_documents"]
        )
        
        return {
            "meets_requirements": meets_requirements,
            "client_risk_level": client.risk_level.value,
            "total_documents": len(documents),
            "required_types": client_requirements["required_types"],
            "recommended_types": client_requirements["recommended_types"],
            "missing_required": list(missing_required),
            "missing_recommended": list(missing_recommended),
            "uploaded_types": list(doc_types),
            "min_documents_required": client_requirements["min_documents"]
        } 
   
    # Legacy Compatibility Methods
    
    def create_review_legacy_compatible(self, client_id: str, submitted_by: int, 
                                      comments: Optional[str] = None,
                                      legacy_comments: Optional[str] = None) -> Review:
        """
        Create a review with legacy compatibility.
        
        This method creates a review that works with both old and new systems.
        If legacy_comments are provided, they are preserved as-is.
        
        Args:
            client_id: Client ID
            submitted_by: User ID of submitter
            comments: Regular comments
            legacy_comments: Legacy format comments to preserve
            
        Returns:
            Created review
        """
        # Create the review
        review = Review(
            client_id=client_id,
            submitted_by=submitted_by,
            status=ReviewStatus.DRAFT
        )
        
        # Handle comments - prioritize legacy comments if provided
        if legacy_comments:
            review.comments = f"[LEGACY] {legacy_comments}"
        elif comments:
            review.comments = comments
        
        self.db.add(review)
        self.db.flush()
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=submitted_by,
            entity_type="Review",
            entity_id=str(review.id),
            action="CREATE",
            details={
                "client_id": client_id,
                "legacy_compatible": True,
                "has_legacy_comments": bool(legacy_comments)
            }
        )
        
        self.db.commit()
        return review
    
    def update_review_legacy_compatible(self, review_id: int, 
                                      comments: Optional[str] = None,
                                      legacy_comments: Optional[str] = None) -> Review:
        """
        Update a review with legacy compatibility.
        
        Args:
            review_id: Review ID
            comments: Regular comments
            legacy_comments: Legacy format comments to preserve
            
        Returns:
            Updated review
            
        Raises:
            ValueError: If review not found or cannot be edited
        """
        review = self.get_review_by_id(review_id)
        if not review:
            raise ValueError(f"Review {review_id} not found")
        
        if not review.can_be_edited():
            raise ValueError(f"Review cannot be edited in status: {review.status.value}")
        
        # Handle comments - prioritize legacy comments if provided
        if legacy_comments:
            review.comments = f"[LEGACY] {legacy_comments}"
        elif comments:
            review.comments = comments
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=review.submitted_by,  # Use original submitter for audit
            entity_type="Review",
            entity_id=str(review.id),
            action="UPDATE",
            details={
                "legacy_compatible": True,
                "has_legacy_comments": bool(legacy_comments),
                "updated_fields": ["comments"]
            }
        )
        
        self.db.commit()
        return review
    
    def get_review_legacy_format(self, review_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a review in legacy format for backward compatibility.
        
        Args:
            review_id: Review ID
            
        Returns:
            Review data in legacy format or None if not found
        """
        review = self.get_review_by_id(review_id)
        if not review:
            return None
        
        # Transform to legacy format
        legacy_data = {
            "id": review.id,
            "client_id": review.client_id,
            "submitted_by": review.submitted_by,
            "reviewed_by": review.reviewed_by,
            "status": review.status.value,
            "comments": review.comments,
            "rejection_reason": review.rejection_reason,
            "submitted_at": review.submitted_at.isoformat() if review.submitted_at else None,
            "reviewed_at": review.reviewed_at.isoformat() if review.reviewed_at else None,
            "created_at": review.created_at.isoformat(),
            "updated_at": review.updated_at.isoformat()
        }
        
        # Add KYC summary if available
        if review.kyc_questionnaire:
            kyc_summary = self._create_kyc_legacy_summary(review.kyc_questionnaire)
            if legacy_data["comments"]:
                legacy_data["comments"] += f"\n\n[KYC Summary]\n{kyc_summary}"
            else:
                legacy_data["comments"] = f"[KYC Summary]\n{kyc_summary}"
        
        # Add exception summary if available
        if review.exceptions:
            exception_summary = self._create_exception_legacy_summary(review.exceptions)
            legacy_data["exceptions_summary"] = exception_summary
        
        return legacy_data
    
    def _create_kyc_legacy_summary(self, kyc_questionnaire) -> str:
        """Create a legacy text summary of KYC questionnaire."""
        summary_parts = []
        
        if kyc_questionnaire.purpose_of_account:
            summary_parts.append(f"Purpose: {kyc_questionnaire.purpose_of_account}")
        
        if kyc_questionnaire.kyc_documents_complete:
            summary_parts.append(f"KYC Complete: {kyc_questionnaire.kyc_documents_complete.value}")
        
        if kyc_questionnaire.missing_kyc_details:
            summary_parts.append(f"Missing Details: {kyc_questionnaire.missing_kyc_details}")
        
        if kyc_questionnaire.account_purpose_aligned:
            summary_parts.append(f"Purpose Aligned: {kyc_questionnaire.account_purpose_aligned.value}")
        
        if kyc_questionnaire.adverse_media_completed:
            summary_parts.append(f"Adverse Media: {kyc_questionnaire.adverse_media_completed.value}")
        
        if kyc_questionnaire.pep_approval_obtained:
            summary_parts.append(f"PEP Approval: {kyc_questionnaire.pep_approval_obtained.value}")
        
        if kyc_questionnaire.remedial_actions:
            summary_parts.append(f"Remedial Actions: {kyc_questionnaire.remedial_actions}")
        
        return " | ".join(summary_parts) if summary_parts else "No KYC details available"
    
    def _create_exception_legacy_summary(self, exceptions: List) -> str:
        """Create a legacy text summary of exceptions."""
        if not exceptions:
            return None
        
        exception_summaries = []
        for exception in exceptions:
            status_text = f"[{exception.status.value.upper()}]"
            type_text = exception.exception_type.value.replace('_', ' ').title()
            exception_summaries.append(f"{status_text} {type_text}")
        
        return " | ".join(exception_summaries)
    
    def preserve_legacy_document_workflow(self, review_id: int) -> bool:
        """
        Ensure legacy document upload workflow continues to work.
        
        This method verifies that existing document upload functionality
        remains intact for reviews created in legacy format.
        
        Args:
            review_id: Review ID
            
        Returns:
            True if legacy workflow is preserved, False otherwise
        """
        review = self.get_review_by_id(review_id)
        if not review:
            return False
        
        # Check if review has legacy comments marker
        has_legacy_format = (review.comments and 
                           review.comments.startswith("[LEGACY]"))
        
        # For legacy reviews, ensure document associations work
        if has_legacy_format:
            # Get all documents for this review
            documents = self.db.query(Document).filter(
                Document.review_id == review_id
            ).all()
            
            # Verify all documents are properly associated
            for doc in documents:
                if doc.review_id != review_id:
                    logger.warning(f"Document {doc.id} has incorrect review association")
                    return False
            
            logger.info(f"Legacy document workflow preserved for review {review_id} with {len(documents)} documents")
        
        return True
    
    def migrate_legacy_review_to_enhanced(self, review_id: int, user_id: int) -> bool:
        """
        Migrate a legacy review to enhanced format.
        
        This method converts a legacy review to use the new KYC questionnaire
        format while preserving the original comments.
        
        Args:
            review_id: Review ID
            user_id: User performing the migration
            
        Returns:
            True if migration successful, False otherwise
        """
        review = self.get_review_by_id(review_id)
        if not review:
            return False
        
        # Check if already has KYC questionnaire
        if review.kyc_questionnaire:
            logger.info(f"Review {review_id} already has KYC questionnaire")
            return True
        
        # Check if this is a legacy review
        is_legacy = (review.comments and 
                    review.comments.startswith("[LEGACY]"))
        
        if not is_legacy:
            logger.info(f"Review {review_id} is not in legacy format")
            return True
        
        try:
            # Create a basic KYC questionnaire with default values
            from app.schemas.kyc_questionnaire import KYCQuestionnaireCreate
            from app.models.kyc_questionnaire import YesNoNA
            
            # Extract purpose from legacy comments if possible
            legacy_comments = review.comments.replace("[LEGACY]", "").strip()
            
            kyc_data = KYCQuestionnaireCreate(
                purpose_of_account=f"Migrated from legacy: {legacy_comments[:200]}...",
                kyc_documents_complete=YesNoNA.NOT_APPLICABLE,
                account_purpose_aligned=YesNoNA.NOT_APPLICABLE,
                adverse_media_completed=YesNoNA.NOT_APPLICABLE,
                pep_approval_obtained=YesNoNA.NOT_APPLICABLE,
                static_data_correct=YesNoNA.NOT_APPLICABLE,
                kyc_documents_valid=YesNoNA.NOT_APPLICABLE,
                regulated_business_license=YesNoNA.NOT_APPLICABLE
            )
            
            # Create the questionnaire
            self.create_kyc_questionnaire(review_id, kyc_data, user_id)
            
            # Update review comments to indicate migration
            review.comments = f"[MIGRATED] {legacy_comments}"
            
            # Log the migration
            self.audit_service.log_action(
                user_id=user_id,
                entity_type="Review",
                entity_id=str(review.id),
                action="MIGRATE_TO_ENHANCED",
                details={
                    "from_format": "legacy",
                    "to_format": "enhanced",
                    "preserved_comments": True
                }
            )
            
            self.db.commit()
            logger.info(f"Successfully migrated legacy review {review_id} to enhanced format")
            return True
            
        except Exception as e:
            logger.error(f"Failed to migrate legacy review {review_id}: {str(e)}")
            self.db.rollback()
            return False