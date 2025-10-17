"""
Pydantic schemas for review data validation and serialization.
"""
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field, ConfigDict

from app.models.review import ReviewStatus, ReviewType


class ReviewBase(BaseModel):
    """Base review schema with common fields."""
    client_id: str = Field(..., min_length=1, max_length=50, description="Client identifier")
    review_type: ReviewType = Field(default=ReviewType.MANUAL, description="Type of review")
    auto_created: bool = Field(default=False, description="Whether review was automatically created")
    comments: Optional[str] = Field(None, description="Review comments and notes")


class ReviewCreate(ReviewBase):
    """Schema for creating a new review."""
    pass


class AutoReviewCreate(BaseModel):
    """Schema for creating auto-reviews."""
    client_id: str = Field(..., min_length=1, max_length=50, description="Client identifier")
    review_types: List[ReviewType] = Field(..., description="List of review types to create")
    created_by_user_id: int = Field(..., description="ID of user creating the reviews")


class ReviewUpdate(BaseModel):
    """Schema for updating review information."""
    comments: Optional[str] = Field(None, description="Review comments and notes")


class ReviewSubmit(BaseModel):
    """Schema for submitting a review."""
    comments: Optional[str] = Field(None, description="Submission comments")


class ReviewApprove(BaseModel):
    """Schema for approving a review."""
    comments: Optional[str] = Field(None, description="Approval comments")


class ReviewReject(BaseModel):
    """Schema for rejecting a review."""
    rejection_reason: str = Field(..., min_length=1, description="Reason for rejection")
    comments: Optional[str] = Field(None, description="Additional comments")


class ReviewResponse(ReviewBase):
    """Schema for review response data."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="Internal database ID")
    submitted_by: int = Field(..., description="ID of user who submitted the review")
    reviewed_by: Optional[int] = Field(None, description="ID of user who reviewed the review")
    status: ReviewStatus = Field(..., description="Current review status")
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection if applicable")
    submitted_at: Optional[datetime] = Field(None, description="Timestamp when review was submitted")
    reviewed_at: Optional[datetime] = Field(None, description="Timestamp when review was completed")
    created_at: datetime = Field(..., description="Timestamp when review was created")
    updated_at: datetime = Field(..., description="Timestamp when review was last updated")
    
    # Computed properties
    is_draft: bool = Field(..., description="Whether review is in draft status")
    is_submitted: bool = Field(..., description="Whether review has been submitted")
    is_pending_review: bool = Field(..., description="Whether review is pending checker review")
    is_completed: bool = Field(..., description="Whether review has been completed")
    is_approved: bool = Field(..., description="Whether review has been approved")
    is_rejected: bool = Field(..., description="Whether review has been rejected")
    is_auto_created: bool = Field(..., description="Whether review was automatically created")
    is_manual_review: bool = Field(..., description="Whether review is a manual review")


class ReviewDetailResponse(ReviewResponse):
    """Schema for detailed review information including related data."""
    # Include client information
    client_name: Optional[str] = Field(None, description="Name of the client being reviewed")
    client_risk_level: Optional[str] = Field(None, description="Risk level of the client")
    
    # Include user information
    submitter_name: Optional[str] = Field(None, description="Name of the user who submitted the review")
    reviewer_name: Optional[str] = Field(None, description="Name of the user who reviewed the review")
    
    # Include related counts
    document_count: int = Field(0, description="Number of documents attached to the review")
    exception_count: int = Field(0, description="Number of exceptions related to the review")
    
    # Document summary information
    active_documents: int = Field(0, description="Number of active documents")
    uploading_documents: int = Field(0, description="Number of documents still uploading")
    sensitive_documents: int = Field(0, description="Number of sensitive documents")
    total_file_size_mb: float = Field(0.0, description="Total file size in MB")
    documents_by_type: Dict[str, int] = Field(default_factory=dict, description="Document count by type")
    latest_document_upload: Optional[datetime] = Field(None, description="Timestamp of latest document upload")
    
    # KYC questionnaire information
    kyc_questionnaire: Optional[Dict] = Field(None, description="KYC questionnaire data if available")


class ReviewListResponse(BaseModel):
    """Schema for paginated review list response."""
    reviews: List[ReviewDetailResponse] = Field(..., description="List of reviews with detailed information")
    total: int = Field(..., description="Total number of reviews matching filters")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")


class ReviewSearchFilters(BaseModel):
    """Schema for review search and filtering parameters."""
    client_id: Optional[str] = Field(None, description="Filter by client ID")
    status: Optional[ReviewStatus] = Field(None, description="Filter by review status")
    review_type: Optional[ReviewType] = Field(None, description="Filter by review type")
    auto_created: Optional[bool] = Field(None, description="Filter by auto-created reviews")
    submitted_by: Optional[int] = Field(None, description="Filter by submitter user ID")
    reviewed_by: Optional[int] = Field(None, description="Filter by reviewer user ID")
    submitted_after: Optional[datetime] = Field(None, description="Filter reviews submitted after this date")
    submitted_before: Optional[datetime] = Field(None, description="Filter reviews submitted before this date")
    reviewed_after: Optional[datetime] = Field(None, description="Filter reviews reviewed after this date")
    reviewed_before: Optional[datetime] = Field(None, description="Filter reviews reviewed before this date")
    page: int = Field(1, ge=1, description="Page number for pagination")
    per_page: int = Field(20, ge=1, le=100, description="Number of items per page")
    sort_by: Optional[str] = Field("created_at", description="Field to sort by")
    sort_order: Optional[str] = Field("desc", pattern="^(asc|desc)$", description="Sort order")


class ReviewStatsResponse(BaseModel):
    """Schema for review statistics."""
    total_reviews: int = Field(..., description="Total number of reviews")
    draft_reviews: int = Field(..., description="Number of draft reviews")
    submitted_reviews: int = Field(..., description="Number of submitted reviews")
    under_review_reviews: int = Field(..., description="Number of reviews under review")
    approved_reviews: int = Field(..., description="Number of approved reviews")
    rejected_reviews: int = Field(..., description="Number of rejected reviews")
    pending_reviews: int = Field(..., description="Number of reviews pending review")
    avg_review_time_hours: Optional[float] = Field(None, description="Average review time in hours")


class ReviewDocumentSummary(BaseModel):
    """Schema for review document summary information."""
    total_documents: int = Field(..., description="Total number of documents")
    active_documents: int = Field(..., description="Number of active documents")
    uploading_documents: int = Field(..., description="Number of documents still uploading")
    deleted_documents: int = Field(..., description="Number of deleted documents")
    sensitive_documents: int = Field(..., description="Number of sensitive documents")
    total_file_size: int = Field(..., description="Total file size in bytes")
    total_file_size_mb: float = Field(..., description="Total file size in MB")
    documents_by_type: Dict[str, int] = Field(..., description="Document count by type")
    latest_upload: Optional[datetime] = Field(None, description="Timestamp of latest upload")


class ReviewDocumentRequirements(BaseModel):
    """Schema for review document requirements check."""
    meets_requirements: bool = Field(..., description="Whether review meets document requirements")
    client_risk_level: str = Field(..., description="Client risk level")
    total_documents: int = Field(..., description="Total number of documents uploaded")
    required_types: List[str] = Field(..., description="Required document types")
    recommended_types: List[str] = Field(..., description="Recommended document types")
    missing_required: List[str] = Field(..., description="Missing required document types")
    missing_recommended: List[str] = Field(..., description="Missing recommended document types")
    uploaded_types: List[str] = Field(..., description="Document types that have been uploaded")
    min_documents_required: int = Field(..., description="Minimum number of documents required")


class ReviewValidationResult(BaseModel):
    """Schema for review validation results."""
    is_valid: bool = Field(..., description="Whether review is valid for submission")
    errors: List[str] = Field(..., description="List of validation errors")
    warnings: List[str] = Field(default_factory=list, description="List of validation warnings")


class ReviewSubmissionRequest(BaseModel):
    """Schema for review submission with validation."""
    comments: Optional[str] = Field(None, description="Submission comments")
    force_submit: bool = Field(default=False, description="Force submission despite warnings")


class ReviewCreateWithKYC(ReviewBase):
    """Schema for creating a review with KYC questionnaire."""
    kyc_questionnaire: Optional[Dict] = Field(None, description="KYC questionnaire data")


class ReviewSubmitWithExceptions(BaseModel):
    """Schema for submitting a review with exceptions."""
    comments: Optional[str] = Field(None, description="Submission comments")
    exceptions: Optional[List[Dict]] = Field(default_factory=list, description="List of exceptions to create")
    force_submit: bool = Field(default=False, description="Force submission despite warnings")


class ReviewWithDocuments(ReviewDetailResponse):
    """Schema for review with embedded document information."""
    document_summary: ReviewDocumentSummary = Field(..., description="Document summary")
    document_requirements: ReviewDocumentRequirements = Field(..., description="Document requirements check")