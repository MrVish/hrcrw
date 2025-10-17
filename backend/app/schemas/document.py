"""
Pydantic schemas for document-related API operations.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator


class DocumentUploadRequest(BaseModel):
    """Schema for document upload preparation request."""
    
    review_id: int = Field(..., description="ID of the review this document belongs to")
    filename: str = Field(..., min_length=1, max_length=255, description="Original filename")
    content_type: str = Field(..., description="MIME type of the file")
    document_type: str = Field(
        default="supporting",
        description="Type/category of the document"
    )
    file_size: Optional[int] = Field(None, ge=1, description="Expected file size in bytes")
    is_sensitive: bool = Field(default=False, description="Whether document contains sensitive information")
    
    @validator('filename')
    def validate_filename(cls, v):
        """Validate filename format."""
        if not v or v.strip() == "":
            raise ValueError("Filename cannot be empty")
        
        # Check for invalid characters
        invalid_chars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/']
        if any(char in v for char in invalid_chars):
            raise ValueError("Filename contains invalid characters")
        
        return v.strip()
    
    @validator('document_type')
    def validate_document_type(cls, v):
        """Validate document type."""
        allowed_types = [
            "identity", "financial", "compliance", "legal", "supporting", "other"
        ]
        if v not in allowed_types:
            raise ValueError(f"Document type must be one of: {', '.join(allowed_types)}")
        return v
    
    @validator('content_type')
    def validate_content_type(cls, v):
        """Validate content type format."""
        if not v or '/' not in v:
            raise ValueError("Invalid content type format")
        return v


class DocumentUploadResponse(BaseModel):
    """Schema for document upload preparation response."""
    
    document_id: int = Field(..., description="ID of the created document record")
    upload_url: str = Field(..., description="Pre-signed URL for file upload")
    upload_fields: Dict[str, Any] = Field(..., description="Form fields required for upload")
    file_key: str = Field(..., description="S3 key/path for the file")
    expires_in: int = Field(..., description="URL expiration time in seconds")
    max_file_size: int = Field(..., description="Maximum allowed file size in bytes")


class DocumentUploadConfirmRequest(BaseModel):
    """Schema for confirming document upload completion."""
    
    document_id: int = Field(..., description="ID of the document")
    actual_file_size: Optional[int] = Field(None, ge=1, description="Actual size of uploaded file")


class DocumentDownloadRequest(BaseModel):
    """Schema for document download URL request."""
    
    document_id: int = Field(..., description="ID of the document")
    expiration: int = Field(default=3600, ge=300, le=86400, description="URL expiration in seconds")


class DocumentDownloadResponse(BaseModel):
    """Schema for document download URL response."""
    
    download_url: str = Field(..., description="Pre-signed download URL")
    expires_in: int = Field(..., description="URL expiration time in seconds")
    filename: str = Field(..., description="Original filename")


class DocumentVersionRequest(BaseModel):
    """Schema for creating a new document version."""
    
    original_document_id: int = Field(..., description="ID of the original document")
    filename: str = Field(..., min_length=1, max_length=255, description="Filename for new version")
    content_type: str = Field(..., description="MIME type of the new file")
    
    @validator('filename')
    def validate_filename(cls, v):
        """Validate filename format."""
        if not v or v.strip() == "":
            raise ValueError("Filename cannot be empty")
        
        # Check for invalid characters
        invalid_chars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/']
        if any(char in v for char in invalid_chars):
            raise ValueError("Filename contains invalid characters")
        
        return v.strip()


class DocumentBase(BaseModel):
    """Base schema for document information."""
    
    id: int
    review_id: int
    uploaded_by: int
    filename: str
    file_size: int
    content_type: str
    document_type: str
    status: str
    version: int
    is_sensitive: bool
    access_count: int
    created_at: datetime
    updated_at: datetime
    last_accessed_at: Optional[datetime]
    retention_date: Optional[datetime]
    
    class Config:
        from_attributes = True


class DocumentDetail(DocumentBase):
    """Detailed document schema with additional metadata."""
    
    checksum: Optional[str]
    file_size_mb: float
    is_image: bool
    is_pdf: bool
    is_expired: bool
    file_extension: str
    
    @validator('file_size_mb', pre=True, always=True)
    def calculate_file_size_mb(cls, v, values):
        """Calculate file size in MB."""
        file_size = values.get('file_size', 0)
        return round(file_size / (1024 * 1024), 2)
    
    @validator('is_image', pre=True, always=True)
    def check_is_image(cls, v, values):
        """Check if document is an image."""
        content_type = values.get('content_type', '')
        return content_type.startswith('image/')
    
    @validator('is_pdf', pre=True, always=True)
    def check_is_pdf(cls, v, values):
        """Check if document is a PDF."""
        content_type = values.get('content_type', '')
        return content_type == 'application/pdf'
    
    @validator('is_expired', pre=True, always=True)
    def check_is_expired(cls, v, values):
        """Check if document has expired."""
        retention_date = values.get('retention_date')
        if not retention_date:
            return False
        return datetime.utcnow() > retention_date
    
    @validator('file_extension', pre=True, always=True)
    def get_file_extension(cls, v, values):
        """Get file extension from filename."""
        filename = values.get('filename', '')
        if '.' in filename:
            return filename.rsplit('.', 1)[1].lower()
        return ''


class DocumentList(BaseModel):
    """Schema for document list response."""
    
    documents: List[DocumentBase]
    total_count: int
    review_id: int


class DocumentDeleteRequest(BaseModel):
    """Schema for document deletion request."""
    
    document_id: int = Field(..., description="ID of the document to delete")
    permanent: bool = Field(default=False, description="Whether to permanently delete from S3")


class DocumentSearchRequest(BaseModel):
    """Schema for document search request."""
    
    review_id: Optional[int] = Field(None, description="Filter by review ID")
    document_type: Optional[str] = Field(None, description="Filter by document type")
    filename_filter: Optional[str] = Field(None, description="Filter by filename (partial match)")
    is_sensitive: Optional[bool] = Field(None, description="Filter by sensitivity")
    status: Optional[str] = Field(None, description="Filter by status")
    page: int = Field(default=1, ge=1, description="Page number")
    per_page: int = Field(default=20, ge=1, le=100, description="Items per page")


class DocumentSearchResponse(BaseModel):
    """Schema for document search response."""
    
    documents: List[DocumentBase]
    total_count: int
    page: int
    per_page: int
    total_pages: int


class DocumentMetadata(BaseModel):
    """Schema for document metadata."""
    
    document_id: int
    filename: str
    file_size: int
    content_type: str
    document_type: str
    version: int
    is_sensitive: bool
    checksum: Optional[str]
    upload_date: datetime
    uploader_name: str


class DocumentAccessLog(BaseModel):
    """Schema for document access logging."""
    
    document_id: int
    access_timestamp: datetime
    access_type: str  # 'download', 'view', 'metadata'
    user_id: int
    user_name: str
    ip_address: Optional[str]


class DocumentValidationError(BaseModel):
    """Schema for document validation errors."""
    
    field: str
    message: str
    code: str


class DocumentOperationResponse(BaseModel):
    """Schema for generic document operation responses."""
    
    success: bool
    message: str
    document_id: Optional[int] = None
    errors: Optional[List[DocumentValidationError]] = None


class DocumentStatistics(BaseModel):
    """Schema for document statistics."""
    
    total_documents: int
    documents_by_type: Dict[str, int]
    documents_by_status: Dict[str, int]
    total_file_size: int
    total_file_size_mb: float
    sensitive_documents_count: int
    expired_documents_count: int
    recent_uploads_count: int  # Last 24 hours


class DocumentRetentionInfo(BaseModel):
    """Schema for document retention information."""
    
    document_id: int
    filename: str
    retention_date: Optional[datetime]
    days_until_expiry: Optional[int]
    is_expired: bool
    can_extend_retention: bool


class BulkDocumentOperation(BaseModel):
    """Schema for bulk document operations."""
    
    document_ids: List[int] = Field(..., min_items=1, max_items=100)
    operation: str = Field(..., description="Operation to perform: 'delete', 'archive', 'restore'")
    
    @validator('operation')
    def validate_operation(cls, v):
        """Validate operation type."""
        allowed_operations = ['delete', 'archive', 'restore']
        if v not in allowed_operations:
            raise ValueError(f"Operation must be one of: {', '.join(allowed_operations)}")
        return v


class BulkDocumentOperationResponse(BaseModel):
    """Schema for bulk document operation response."""
    
    success_count: int
    failure_count: int
    total_count: int
    successful_ids: List[int]
    failed_operations: List[Dict[str, Any]]
    message: str