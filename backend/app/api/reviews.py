"""
Review workflow API endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.auth import (
    get_current_user, 
    require_maker_role, 
    require_checker_role,
    require_maker_or_checker_role,
    require_admin_role
)
from app.models.user import User
from app.models.review import ReviewStatus
from app.schemas.review import (
    ReviewResponse,
    ReviewDetailResponse,
    ReviewListResponse,
    ReviewCreate,
    ReviewCreateWithKYC,
    ReviewUpdate,
    ReviewSubmit,
    ReviewApprove,
    ReviewReject,
    ReviewSearchFilters,
    ReviewStatsResponse,
    ReviewDocumentSummary,
    ReviewDocumentRequirements,
    ReviewValidationResult,
    ReviewSubmissionRequest,
    ReviewWithDocuments
)
from app.schemas.kyc_questionnaire import (
    KYCQuestionnaireCreate,
    KYCQuestionnaireUpdate,
    KYCQuestionnaireResponse,
    KYCQuestionnaireDetailResponse
)
from app.schemas.exception import ReviewExceptionCreate, ReviewExceptionResponse
from app.services.review import ReviewService
from app.services.audit import AuditService


router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("", response_model=ReviewListResponse)
async def get_reviews(
    client_id: Optional[str] = Query(None, description="Filter by client ID"),
    status: Optional[ReviewStatus] = Query(None, description="Filter by review status"),
    submitted_by: Optional[int] = Query(None, description="Filter by submitter user ID"),
    reviewed_by: Optional[int] = Query(None, description="Filter by reviewer user ID"),
    submitted_after: Optional[datetime] = Query(None, description="Filter reviews submitted after this date"),
    submitted_before: Optional[datetime] = Query(None, description="Filter reviews submitted before this date"),
    reviewed_after: Optional[datetime] = Query(None, description="Filter reviews reviewed after this date"),
    reviewed_before: Optional[datetime] = Query(None, description="Filter reviews reviewed before this date"),
    page: int = Query(1, ge=1, description="Page number for pagination"),
    per_page: int = Query(20, ge=1, le=100, description="Number of items per page"),
    sort_by: Optional[str] = Query("created_at", description="Field to sort by"),
    sort_order: Optional[str] = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get reviews with filtering and pagination.
    
    Accessible by Makers and Checkers. Makers see their own reviews,
    Checkers see reviews they can review, Admins see all reviews.
    """
    # Create search filters
    filters = ReviewSearchFilters(
        client_id=client_id,
        status=status,
        submitted_by=submitted_by,
        reviewed_by=reviewed_by,
        submitted_after=submitted_after,
        submitted_before=submitted_before,
        reviewed_after=reviewed_after,
        reviewed_before=reviewed_before,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    # Apply role-based filtering
    if current_user.is_maker and not current_user.is_admin:
        # Makers can only see their own reviews
        filters.submitted_by = current_user.id
    elif current_user.is_checker and not current_user.is_admin:
        # Checkers can see reviews they can review (submitted/under review) or have reviewed
        if not filters.status:
            # If no status filter, show pending reviews and reviews they've completed
            pass  # Let the service handle this logic
    
    # Get reviews using service
    review_service = ReviewService(db)
    reviews, total_count = review_service.search_reviews(filters)
    
    # Calculate pagination info
    total_pages = (total_count + per_page - 1) // per_page
    
    # Convert to response models with detailed information
    review_responses = []
    for review in reviews:
        # Create detailed response with client and user information
        review_dict = {
            'id': review.id,
            'client_id': review.client_id,
            'submitted_by': review.submitted_by,
            'reviewed_by': review.reviewed_by,
            'status': review.status,
            'comments': review.comments,
            'rejection_reason': review.rejection_reason,
            'submitted_at': review.submitted_at,
            'reviewed_at': review.reviewed_at,
            'created_at': review.created_at,
            'updated_at': review.updated_at,
            'client_name': review.client.name if review.client else None,
            'client_risk_level': review.client.risk_level if review.client else None,
            'submitter_name': review.submitter.name if review.submitter else None,
            'reviewer_name': review.reviewer.name if review.reviewer else None,
            'document_count': len(review.documents) if hasattr(review, 'documents') else 0,
            'exception_count': 0,  # TODO: Add exception count when exceptions are linked to reviews
            'is_draft': review.is_draft,
            'is_submitted': review.is_submitted,
            'is_pending_review': review.is_pending_review,
            'is_completed': review.is_completed,
            'is_approved': review.is_approved,
            'is_rejected': review.is_rejected,
            'is_auto_created': review.auto_created,
            'is_manual_review': not review.auto_created
        }
        review_responses.append(ReviewDetailResponse.model_validate(review_dict))
    
    return ReviewListResponse(
        reviews=review_responses,
        total=total_count,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.get("/pending", response_model=List[ReviewResponse])
async def get_pending_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Get all reviews pending checker review.
    
    Accessible only by Checkers for workflow management.
    """
    review_service = ReviewService(db)
    reviews = review_service.get_pending_reviews()
    
    return [ReviewResponse.model_validate(review) for review in reviews]


@router.get("/my-reviews", response_model=List[ReviewResponse])
async def get_my_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get reviews associated with the current user based on their role.
    
    Makers see reviews they've submitted, Checkers see reviews they've reviewed.
    """
    review_service = ReviewService(db)
    reviews = review_service.get_reviews_by_user(current_user.id, current_user.role)
    
    return [ReviewResponse.model_validate(review) for review in reviews]


@router.get("/statistics", response_model=ReviewStatsResponse)
async def get_review_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_or_checker_role)
):
    """
    Get review statistics for dashboard.
    
    Accessible by Makers, Checkers, and Admins for monitoring.
    """
    review_service = ReviewService(db)
    stats = review_service.get_review_statistics()
    
    return ReviewStatsResponse(**stats)


@router.get("/{review_id}", response_model=ReviewDetailResponse)
async def get_review_detail(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed review information including related data.
    
    Accessible by Makers and Checkers with appropriate permissions.
    """
    review_service = ReviewService(db)
    review_detail = review_service.get_review_detail(review_id)
    
    if not review_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    review = review_detail["review"]
    
    # Check permissions
    if current_user.is_maker and not current_user.is_admin:
        # Makers can only see their own reviews
        if review.submitted_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only view your own reviews."
            )
    elif current_user.is_checker and not current_user.is_admin:
        # Checkers can see reviews that are pending review or reviews they have reviewed
        if not (review.is_pending_review or review.reviewed_by == current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You cannot view this review."
            )
    
    # Create response with review data and statistics
    review_response = ReviewResponse.model_validate(review)
    
    # Include KYC questionnaire data if available
    kyc_questionnaire_data = None
    if review_detail.get("kyc_questionnaire"):
        kyc_questionnaire_data = review_detail["kyc_questionnaire"]
    
    response_data = {
        **review_response.model_dump(),
        "client_name": review_detail["client_name"],
        "client_risk_level": review_detail["client_risk_level"],
        "submitter_name": review_detail["submitter_name"],
        "reviewer_name": review_detail["reviewer_name"],
        "document_count": review_detail["document_count"],
        "exception_count": review_detail["exception_count"]
    }
    
    # Add KYC questionnaire to response if available
    if kyc_questionnaire_data:
        kyc_response = KYCQuestionnaireResponse.model_validate(kyc_questionnaire_data)
        response_data["kyc_questionnaire"] = kyc_response.model_dump()
    
    return ReviewDetailResponse(**response_data)


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_data: ReviewCreateWithKYC,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_role)
):
    """
    Create a new review with optional KYC questionnaire.
    
    Accessible only by Makers for initiating review workflow.
    """
    try:
        review_service = ReviewService(db)
        
        # Extract KYC data if present
        kyc_data = None
        if review_data.kyc_questionnaire:
            # Convert dict to KYCQuestionnaireCreate with temporary review_id
            from app.schemas.kyc_questionnaire import KYCQuestionnaireCreate
            kyc_dict = review_data.kyc_questionnaire.copy()
            kyc_dict['review_id'] = 0  # Temporary ID, will be overridden in service
            kyc_data = KYCQuestionnaireCreate(**kyc_dict)
        
        # Create base review data
        base_review_data = ReviewCreate(
            client_id=review_data.client_id,
            review_type=review_data.review_type,
            auto_created=review_data.auto_created,
            comments=review_data.comments
        )
        
        print(f"About to create review with:")
        print(f"  base_review_data: {base_review_data}")
        print(f"  current_user.id: {current_user.id}")
        print(f"  kyc_data: {kyc_data}")
        
        review = review_service.create_review(base_review_data, current_user.id, kyc_data)
        
        return ReviewResponse.model_validate(review)
    
    except ValueError as e:
        print(f"ValueError in create_review: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"Unexpected error in create_review: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.patch("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: int,
    review_data: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing review.
    
    Accessible by the review submitter or admin for editing draft reviews.
    """
    try:
        review_service = ReviewService(db)
        review = review_service.update_review(review_id, review_data, current_user.id)
        
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found"
            )
        
        return ReviewResponse.model_validate(review)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{review_id}/submit", response_model=ReviewResponse)
async def submit_review(
    review_id: int,
    submit_data: ReviewSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_role)
):
    """
    Submit a review for checker approval.
    
    Accessible only by Makers who created the review.
    """
    try:
        review_service = ReviewService(db)
        review = review_service.submit_review(review_id, current_user.id, submit_data.comments)
        
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found"
            )
        
        return ReviewResponse.model_validate(review)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{review_id}/start-review", response_model=ReviewResponse)
async def start_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Start reviewing a submitted review.
    
    Accessible only by Checkers for workflow management.
    """
    try:
        review_service = ReviewService(db)
        review = review_service.start_review(review_id, current_user.id)
        
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found"
            )
        
        return ReviewResponse.model_validate(review)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{review_id}/approve", response_model=ReviewResponse)
async def approve_review(
    review_id: int,
    approve_data: ReviewApprove,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Approve a review.
    
    Accessible only by Checkers for completing the review workflow.
    """
    try:
        review_service = ReviewService(db)
        review = review_service.approve_review(review_id, current_user.id, approve_data.comments)
        
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found"
            )
        
        return ReviewResponse.model_validate(review)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{review_id}/reject", response_model=ReviewResponse)
async def reject_review(
    review_id: int,
    reject_data: ReviewReject,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_checker_role)
):
    """
    Reject a review.
    
    Accessible only by Checkers for completing the review workflow.
    """
    try:
        review_service = ReviewService(db)
        review = review_service.reject_review(
            review_id, 
            current_user.id, 
            reject_data.rejection_reason, 
            reject_data.comments
        )
        
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found"
            )
        
        return ReviewResponse.model_validate(review)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{review_id}/audit-trail")
async def get_review_audit_trail(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_or_checker_role)
):
    """
    Get audit trail for a specific review.
    
    Accessible by Makers and Checkers with appropriate permissions.
    """
    # Verify review exists and check permissions
    review_service = ReviewService(db)
    review = review_service.get_review_by_id(review_id)
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Check permissions (same as get_review_detail)
    if current_user.is_maker and not current_user.is_admin:
        if review.submitted_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only view audit trail for your own reviews."
            )
    elif current_user.is_checker and not current_user.is_admin:
        if (review.submitted_by == current_user.id or 
            (not review.is_pending_review and review.reviewed_by != current_user.id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You cannot view audit trail for this review."
            )
    
    # Get audit trail
    audit_service = AuditService(db)
    audit_logs = audit_service.get_entity_audit_trail("Review", str(review_id))
    
    return {
        "review_id": review_id,
        "client_id": review.client_id,
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


@router.get("/{review_id}/documents", response_model=List[dict])
async def get_review_documents(
    review_id: int,
    include_deleted: bool = Query(default=False, description="Include deleted documents"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_or_checker_role)
):
    """
    Get all documents for a specific review.
    
    Accessible by review participants (makers, checkers) and administrators.
    """
    try:
        review_service = ReviewService(db)
        documents = review_service.get_review_documents(
            review_id=review_id,
            user_id=current_user.id,
            include_deleted=include_deleted
        )
        
        # Convert documents to response format
        from app.schemas.document import DocumentBase
        return [DocumentBase.from_orm(doc).model_dump() for doc in documents]
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{review_id}/documents/summary", response_model=ReviewDocumentSummary)
async def get_review_document_summary(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_or_checker_role)
):
    """
    Get document summary for a review.
    
    Provides statistics about documents attached to the review.
    """
    # Check if user has access to the review
    review_service = ReviewService(db)
    review = review_service.get_review_by_id(review_id)
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Check permissions (same logic as other review endpoints)
    if current_user.is_maker and not current_user.is_admin:
        if review.submitted_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    elif current_user.is_checker and not current_user.is_admin:
        if (review.submitted_by == current_user.id or 
            (not review.is_pending_review and review.reviewed_by != current_user.id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    summary = review_service.get_review_document_summary(review_id)
    
    # Convert file size to MB
    summary["total_file_size_mb"] = round(summary["total_file_size"] / (1024 * 1024), 2)
    
    return ReviewDocumentSummary(**summary)


@router.get("/{review_id}/documents/requirements", response_model=ReviewDocumentRequirements)
async def check_review_document_requirements(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_or_checker_role)
):
    """
    Check if review meets document requirements.
    
    Validates document requirements based on client risk level.
    """
    # Check if user has access to the review (same logic as above)
    review_service = ReviewService(db)
    review = review_service.get_review_by_id(review_id)
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Check permissions
    if current_user.is_maker and not current_user.is_admin:
        if review.submitted_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    elif current_user.is_checker and not current_user.is_admin:
        if (review.submitted_by == current_user.id or 
            (not review.is_pending_review and review.reviewed_by != current_user.id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    requirements = review_service.check_review_document_requirements(review_id)
    
    if "error" in requirements:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=requirements["error"]
        )
    
    return ReviewDocumentRequirements(**requirements)


@router.post("/{review_id}/validate", response_model=ReviewValidationResult)
async def validate_review_for_submission(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_role)
):
    """
    Validate if a review is ready for submission.
    
    Checks document requirements, review status, and other validation rules.
    """
    review_service = ReviewService(db)
    
    # Check if review exists and user has permission
    review = review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    if review.submitted_by != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only validate your own reviews."
        )
    
    is_valid, errors = review_service.validate_review_for_submission(review_id)
    
    # Generate warnings for missing recommended documents
    warnings = []
    requirements = review_service.check_review_document_requirements(review_id)
    if not requirements.get("error") and requirements.get("missing_recommended"):
        warnings.append(f"Missing recommended document types: {', '.join(requirements['missing_recommended'])}")
    
    return ReviewValidationResult(
        is_valid=is_valid,
        errors=errors,
        warnings=warnings
    )


@router.post("/{review_id}/submit-with-validation", response_model=ReviewResponse)
async def submit_review_with_validation(
    review_id: int,
    submit_data: ReviewSubmissionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_role)
):
    """
    Submit a review with validation checks.
    
    Validates the review before submission and allows force submission if needed.
    """
    review_service = ReviewService(db)
    
    # Validate review first
    is_valid, errors = review_service.validate_review_for_submission(review_id)
    
    if not is_valid and not submit_data.force_submit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Review validation failed",
                "errors": errors,
                "can_force_submit": True
            }
        )
    
    # Submit the review
    try:
        review = review_service.submit_review(review_id, current_user.id, submit_data.comments)
        
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found"
            )
        
        return ReviewResponse.model_validate(review)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{review_id}/with-documents", response_model=ReviewWithDocuments)
async def get_review_with_documents(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_or_checker_role)
):
    """
    Get comprehensive review information including document summary and requirements.
    
    Provides a complete view of the review with all document-related information.
    """
    review_service = ReviewService(db)
    
    # Get review detail
    review_detail = review_service.get_review_detail(review_id)
    if not review_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    review = review_detail["review"]
    
    # Check permissions
    if current_user.is_maker and not current_user.is_admin:
        if review.submitted_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    elif current_user.is_checker and not current_user.is_admin:
        if (review.submitted_by == current_user.id or 
            (not review.is_pending_review and review.reviewed_by != current_user.id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    # Get document summary and requirements
    doc_summary = review_service.get_review_document_summary(review_id)
    doc_requirements = review_service.check_review_document_requirements(review_id)
    
    if "error" in doc_requirements:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=doc_requirements["error"]
        )
    
    # Convert file size to MB
    doc_summary["total_file_size_mb"] = round(doc_summary["total_file_size"] / (1024 * 1024), 2)
    
    # Create base review response
    review_response = ReviewResponse.model_validate(review)
    
    # Create detailed response with document information
    return ReviewWithDocuments(
        **review_response.model_dump(),
        client_name=review_detail["client_name"],
        client_risk_level=review_detail["client_risk_level"],
        submitter_name=review_detail["submitter_name"],
        reviewer_name=review_detail["reviewer_name"],
        document_count=review_detail["document_count"],
        exception_count=review_detail["exception_count"],
        active_documents=doc_summary["active_documents"],
        uploading_documents=doc_summary["uploading_documents"],
        sensitive_documents=doc_summary["sensitive_documents"],
        total_file_size_mb=doc_summary["total_file_size_mb"],
        documents_by_type=doc_summary["documents_by_type"],
        latest_document_upload=doc_summary["latest_upload"],
        document_summary=ReviewDocumentSummary(**doc_summary),
        document_requirements=ReviewDocumentRequirements(**doc_requirements)
    )


@router.post("/{review_id}/submit-with-exceptions", response_model=ReviewResponse)
async def submit_review_with_exceptions(
    review_id: int,
    submit_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_role)
):
    """
    Submit a review with optional exceptions.
    
    Accessible only by Makers who created the review.
    """
    try:
        review_service = ReviewService(db)
        
        # Parse submission data
        comments = submit_data.get("comments")
        exceptions_data = submit_data.get("exceptions", [])
        
        # Convert exception data to schema objects
        exception_objects = []
        for exc_data in exceptions_data:
            # Ensure review_id is set from the URL parameter
            exc_data['review_id'] = review_id
            exception_objects.append(ReviewExceptionCreate(**exc_data))
        
        review = review_service.submit_review(
            review_id, 
            current_user.id, 
            comments,
            exception_objects if exception_objects else None
        )
        
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found"
            )
        
        return ReviewResponse.model_validate(review)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{review_id}/kyc-questionnaire", response_model=KYCQuestionnaireResponse)
async def get_kyc_questionnaire(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_or_checker_role)
):
    """
    Get KYC questionnaire for a review.
    
    Accessible by Makers and Checkers with appropriate permissions.
    """
    review_service = ReviewService(db)
    
    # Check if review exists and user has permission
    review = review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Check permissions (same logic as get_review_detail)
    if current_user.is_maker and not current_user.is_admin:
        if review.submitted_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    elif current_user.is_checker and not current_user.is_admin:
        if (review.submitted_by == current_user.id or 
            (not review.is_pending_review and review.reviewed_by != current_user.id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    questionnaire = review_service.get_kyc_questionnaire(review_id)
    if not questionnaire:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC questionnaire not found for this review"
        )
    
    return KYCQuestionnaireResponse.model_validate(questionnaire)


@router.post("/{review_id}/kyc-questionnaire", response_model=KYCQuestionnaireResponse, status_code=status.HTTP_201_CREATED)
async def create_kyc_questionnaire(
    review_id: int,
    kyc_data: KYCQuestionnaireCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_role)
):
    """
    Create KYC questionnaire for a review.
    
    Accessible only by Makers who created the review.
    """
    try:
        review_service = ReviewService(db)
        questionnaire = review_service.create_kyc_questionnaire(review_id, kyc_data, current_user.id)
        
        return KYCQuestionnaireResponse.model_validate(questionnaire)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{review_id}/kyc-questionnaire", response_model=KYCQuestionnaireResponse)
async def update_kyc_questionnaire(
    review_id: int,
    kyc_data: KYCQuestionnaireUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_role)
):
    """
    Update KYC questionnaire for a review.
    
    Accessible only by Makers who created the review.
    """
    try:
        review_service = ReviewService(db)
        questionnaire = review_service.update_kyc_questionnaire(review_id, kyc_data, current_user.id)
        
        if not questionnaire:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="KYC questionnaire not found for this review"
            )
        
        return KYCQuestionnaireResponse.model_validate(questionnaire)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{review_id}/exceptions", response_model=List[ReviewExceptionResponse])
async def get_review_exceptions(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_or_checker_role)
):
    """
    Get all exceptions for a review.
    
    Accessible by Makers and Checkers with appropriate permissions.
    """
    review_service = ReviewService(db)
    
    # Check if review exists and user has permission
    review = review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Check permissions (same logic as get_review_detail)
    if current_user.is_maker and not current_user.is_admin:
        if review.submitted_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    elif current_user.is_checker and not current_user.is_admin:
        if (review.submitted_by == current_user.id or 
            (not review.is_pending_review and review.reviewed_by != current_user.id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    exceptions = review_service.get_review_exceptions(review_id)
    
    return [ReviewExceptionResponse.model_validate(exc) for exc in exceptions]


@router.post("/{review_id}/exceptions", response_model=List[ReviewExceptionResponse], status_code=status.HTTP_201_CREATED)
async def create_review_exceptions(
    review_id: int,
    exceptions_data: List[ReviewExceptionCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_role)
):
    """
    Create exceptions for a review.
    
    Accessible only by Makers who created the review.
    """
    try:
        review_service = ReviewService(db)
        exceptions = review_service.create_review_exceptions(review_id, exceptions_data, current_user.id)
        
        return [ReviewExceptionResponse.model_validate(exc) for exc in exceptions]
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{review_id}/kyc-questionnaire/link-document")
async def link_document_to_kyc_question(
    review_id: int,
    document_id: int,
    question_field: str = "source_of_funds_docs",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_role)
):
    """
    Link a document to a specific KYC questionnaire question.
    
    Accessible only by Makers who created the review.
    """
    try:
        review_service = ReviewService(db)
        success = review_service.link_document_to_kyc_question(
            review_id, document_id, question_field, current_user.id
        )
        
        return {
            "success": success,
            "message": f"Document {document_id} linked to {question_field}",
            "review_id": review_id,
            "document_id": document_id,
            "question_field": question_field
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{review_id}/kyc-questionnaire/unlink-document")
async def unlink_document_from_kyc_question(
    review_id: int,
    document_id: int,
    question_field: str = "source_of_funds_docs",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_role)
):
    """
    Unlink a document from a specific KYC questionnaire question.
    
    Accessible only by Makers who created the review.
    """
    try:
        review_service = ReviewService(db)
        success = review_service.unlink_document_from_kyc_question(
            review_id, document_id, question_field, current_user.id
        )
        
        return {
            "success": success,
            "message": f"Document {document_id} unlinked from {question_field}",
            "review_id": review_id,
            "document_id": document_id,
            "question_field": question_field
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{review_id}/kyc-questionnaire/documents")
async def get_kyc_linked_documents(
    review_id: int,
    question_field: str = "source_of_funds_docs",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_or_checker_role)
):
    """
    Get documents linked to a specific KYC questionnaire question.
    
    Accessible by Makers and Checkers with appropriate permissions.
    """
    review_service = ReviewService(db)
    
    # Check if review exists and user has permission
    review = review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Check permissions (same logic as other endpoints)
    if current_user.is_maker and not current_user.is_admin:
        if review.submitted_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    elif current_user.is_checker and not current_user.is_admin:
        if (review.submitted_by == current_user.id or 
            (not review.is_pending_review and review.reviewed_by != current_user.id)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    documents = review_service.get_kyc_linked_documents(review_id, question_field)
    
    # Convert documents to response format
    from app.schemas.document import DocumentBase
    return {
        "review_id": review_id,
        "question_field": question_field,
        "documents": [DocumentBase.from_orm(doc).model_dump() for doc in documents],
        "document_count": len(documents)
    }


@router.post("/{review_id}/validate-enhanced", response_model=dict)
async def validate_review_enhanced(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_maker_role)
):
    """
    Enhanced validation that includes KYC questionnaire and document requirements.
    
    Accessible only by Makers who created the review.
    """
    review_service = ReviewService(db)
    
    # Check if review exists and user has permission
    review = review_service.get_review_by_id(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    if review.submitted_by != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only validate your own reviews."
        )
    
    is_valid, errors, warnings = review_service.validate_review_with_kyc_and_documents(review_id)
    
    return {
        "review_id": review_id,
        "is_valid": is_valid,
        "errors": errors,
        "warnings": warnings,
        "validation_type": "enhanced_with_kyc"
    }