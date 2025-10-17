"""
Backward compatibility layer for Enhanced Client Review System.

This module provides backward compatibility for existing API clients during
the transition to the enhanced client review system.
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.client import Client
from app.models.review import Review, ReviewStatus
from app.schemas.client import ClientResponse
from app.schemas.review import ReviewResponse, ReviewCreate, ReviewUpdate
from app.services.client import ClientService
from app.services.review import ReviewService

router = APIRouter(prefix="/api/v1/compatibility", tags=["compatibility"])


class BackwardCompatibilityService:
    """Service to handle backward compatibility transformations."""
    
    @staticmethod
    def transform_client_response(client: Client) -> Dict[str, Any]:
        """
        Transform enhanced client to legacy format.
        
        Args:
            client: Enhanced client model
            
        Returns:
            Client data in legacy format
        """
        return {
            "id": client.id,
            "client_id": client.client_id,
            "name": client.name,
            "risk_level": client.risk_level.value,
            "country": client.country,
            "status": client.status.value,
            "last_review_date": client.last_review_date.isoformat() if client.last_review_date else None,
            "created_at": client.created_at.isoformat(),
            "updated_at": client.updated_at.isoformat(),
            # Enhanced fields are optional in legacy format
            "domicile_branch": client.domicile_branch,
            "relationship_manager": client.relationship_manager,
            "business_unit": client.business_unit,
            "aml_risk": client.aml_risk.value if client.aml_risk else None
        }
    
    @staticmethod
    def transform_review_response(review: Review) -> Dict[str, Any]:
        """
        Transform enhanced review to legacy format.
        
        Args:
            review: Enhanced review model
            
        Returns:
            Review data in legacy format
        """
        # Handle legacy comment format
        comments = review.comments
        if review.kyc_questionnaire:
            # If there's a KYC questionnaire, create a legacy comment summary
            kyc_summary = BackwardCompatibilityService._create_kyc_summary(review.kyc_questionnaire)
            if comments:
                comments = f"{comments}\n\n[KYC Summary]\n{kyc_summary}"
            else:
                comments = f"[KYC Summary]\n{kyc_summary}"
        
        return {
            "id": review.id,
            "client_id": review.client_id,
            "submitted_by": review.submitted_by,
            "reviewed_by": review.reviewed_by,
            "status": review.status.value,
            "comments": comments,
            "rejection_reason": review.rejection_reason,
            "submitted_at": review.submitted_at.isoformat() if review.submitted_at else None,
            "reviewed_at": review.reviewed_at.isoformat() if review.reviewed_at else None,
            "created_at": review.created_at.isoformat(),
            "updated_at": review.updated_at.isoformat(),
            # Include exception summary for legacy clients
            "exceptions_summary": BackwardCompatibilityService._create_exceptions_summary(review.exceptions) if review.exceptions else None
        }
    
    @staticmethod
    def _create_kyc_summary(kyc_questionnaire) -> str:
        """Create a text summary of KYC questionnaire for legacy clients."""
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
        
        if kyc_questionnaire.remedial_actions:
            summary_parts.append(f"Remedial Actions: {kyc_questionnaire.remedial_actions}")
        
        return " | ".join(summary_parts) if summary_parts else "No KYC details available"
    
    @staticmethod
    def _create_exceptions_summary(exceptions: List) -> str:
        """Create a text summary of exceptions for legacy clients."""
        if not exceptions:
            return None
        
        exception_summaries = []
        for exception in exceptions:
            status_text = f"[{exception.status.value.upper()}]"
            type_text = exception.exception_type.value.replace('_', ' ').title()
            exception_summaries.append(f"{status_text} {type_text}")
        
        return " | ".join(exception_summaries)
    
    @staticmethod
    def handle_legacy_review_create(review_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform legacy review creation data to enhanced format.
        
        Args:
            review_data: Legacy review creation data
            
        Returns:
            Enhanced review creation data
        """
        enhanced_data = review_data.copy()
        
        # If comments are provided in legacy format, preserve them
        if "comments" in review_data and review_data["comments"]:
            # Mark as legacy comment to distinguish from KYC questionnaire
            enhanced_data["legacy_comments"] = review_data["comments"]
        
        return enhanced_data


@router.get("/clients", response_model=List[Dict[str, Any]])
async def get_clients_legacy(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get clients in legacy format for backward compatibility.
    
    This endpoint provides the same interface as the original client endpoint
    but includes enhanced fields as optional data.
    """
    try:
        client_service = ClientService(db)
        clients = client_service.get_clients(skip=skip, limit=limit)
        
        # Transform to legacy format
        legacy_clients = [
            BackwardCompatibilityService.transform_client_response(client)
            for client in clients
        ]
        
        return legacy_clients
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving clients: {str(e)}"
        )


@router.get("/clients/{client_id}", response_model=Dict[str, Any])
async def get_client_legacy(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific client in legacy format."""
    try:
        client_service = ClientService(db)
        client = client_service.get_client_by_client_id(client_id)
        
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )
        
        return BackwardCompatibilityService.transform_client_response(client)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving client: {str(e)}"
        )


@router.get("/reviews", response_model=List[Dict[str, Any]])
async def get_reviews_legacy(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get reviews in legacy format for backward compatibility."""
    try:
        review_service = ReviewService(db)
        
        # Convert status filter if provided
        status_enum = None
        if status_filter:
            try:
                status_enum = ReviewStatus(status_filter)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status filter: {status_filter}"
                )
        
        reviews = review_service.get_reviews(
            skip=skip, 
            limit=limit, 
            status_filter=status_enum
        )
        
        # Transform to legacy format
        legacy_reviews = [
            BackwardCompatibilityService.transform_review_response(review)
            for review in reviews
        ]
        
        return legacy_reviews
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving reviews: {str(e)}"
        )


@router.get("/reviews/{review_id}", response_model=Dict[str, Any])
async def get_review_legacy(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific review in legacy format."""
    try:
        review_service = ReviewService(db)
        review = review_service.get_review(review_id)
        
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found"
            )
        
        return BackwardCompatibilityService.transform_review_response(review)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving review: {str(e)}"
        )


@router.post("/reviews", response_model=Dict[str, Any])
async def create_review_legacy(
    review_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a review using legacy format.
    
    This endpoint accepts the old review format and converts it to the new
    enhanced format internally while maintaining backward compatibility.
    """
    try:
        review_service = ReviewService(db)
        
        # Transform legacy data to enhanced format
        enhanced_data = BackwardCompatibilityService.handle_legacy_review_create(review_data)
        
        # Create review with enhanced service
        review = review_service.create_review_legacy_compatible(
            client_id=enhanced_data.get("client_id"),
            submitted_by=current_user.id,
            comments=enhanced_data.get("comments"),
            legacy_comments=enhanced_data.get("legacy_comments")
        )
        
        return BackwardCompatibilityService.transform_review_response(review)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating review: {str(e)}"
        )


@router.put("/reviews/{review_id}", response_model=Dict[str, Any])
async def update_review_legacy(
    review_id: int,
    review_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a review using legacy format."""
    try:
        review_service = ReviewService(db)
        
        # Get existing review
        review = review_service.get_review(review_id)
        if not review:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Review not found"
            )
        
        # Transform legacy data
        enhanced_data = BackwardCompatibilityService.handle_legacy_review_create(review_data)
        
        # Update review with legacy compatibility
        updated_review = review_service.update_review_legacy_compatible(
            review_id=review_id,
            comments=enhanced_data.get("comments"),
            legacy_comments=enhanced_data.get("legacy_comments")
        )
        
        return BackwardCompatibilityService.transform_review_response(updated_review)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating review: {str(e)}"
        )


@router.post("/reviews/{review_id}/submit", response_model=Dict[str, Any])
async def submit_review_legacy(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit a review using legacy format."""
    try:
        review_service = ReviewService(db)
        
        review = review_service.submit_review(review_id, current_user.id)
        
        return BackwardCompatibilityService.transform_review_response(review)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error submitting review: {str(e)}"
        )


@router.post("/reviews/{review_id}/approve", response_model=Dict[str, Any])
async def approve_review_legacy(
    review_id: int,
    approval_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve a review using legacy format."""
    try:
        review_service = ReviewService(db)
        
        review = review_service.approve_review(
            review_id=review_id,
            reviewer_id=current_user.id,
            comments=approval_data.get("comments")
        )
        
        return BackwardCompatibilityService.transform_review_response(review)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error approving review: {str(e)}"
        )


@router.post("/reviews/{review_id}/reject", response_model=Dict[str, Any])
async def reject_review_legacy(
    review_id: int,
    rejection_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject a review using legacy format."""
    try:
        review_service = ReviewService(db)
        
        if not rejection_data.get("rejection_reason"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rejection reason is required"
            )
        
        review = review_service.reject_review(
            review_id=review_id,
            reviewer_id=current_user.id,
            rejection_reason=rejection_data["rejection_reason"],
            comments=rejection_data.get("comments")
        )
        
        return BackwardCompatibilityService.transform_review_response(review)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error rejecting review: {str(e)}"
        )


@router.get("/health", response_model=Dict[str, str])
async def compatibility_health_check():
    """Health check endpoint for backward compatibility layer."""
    return {
        "status": "healthy",
        "message": "Backward compatibility layer is operational",
        "version": "1.0.0"
    }