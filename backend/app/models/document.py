"""
Document model for managing file uploads and metadata.
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, BigInteger, Boolean, Index, ForeignKey
from sqlalchemy.orm import relationship
from typing import Optional, List

from app.models.base import BaseModel


class DocumentType(enum.Enum):
    """Document type enumeration for categorizing documents."""
    IDENTITY = "identity"
    FINANCIAL = "financial"
    COMPLIANCE = "compliance"
    LEGAL = "legal"
    SUPPORTING = "supporting"
    OTHER = "other"


class DocumentStatus(enum.Enum):
    """Document status enumeration for tracking document lifecycle."""
    UPLOADING = "uploading"
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"


class Document(BaseModel):
    """
    Document model for managing file uploads and metadata.
    
    Attributes:
        review_id: Foreign key to Review model
        uploaded_by: Foreign key to User model (uploader)
        filename: Original filename
        file_path: S3 path/key for the stored file
        file_size: File size in bytes
        content_type: MIME type of the file
        document_type: Type/category of the document
        status: Current status of the document
        version: Version number for document versioning
        checksum: File checksum for integrity verification
        is_sensitive: Whether the document contains sensitive information
        retention_date: Date when document should be deleted (for compliance)
        access_count: Number of times document has been accessed
        last_accessed_at: Timestamp of last access
    """
    __tablename__ = "documents"
    
    # Foreign key relationships
    review_id = Column(Integer, ForeignKey("reviews.id"), nullable=False, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # File metadata
    filename = Column(String(255), nullable=False, index=True)
    file_path = Column(String(500), nullable=False, unique=True, index=True)
    file_size = Column(BigInteger, nullable=False)
    content_type = Column(String(100), nullable=False)
    checksum = Column(String(64), nullable=True)  # SHA-256 checksum
    
    # Document classification
    document_type = Column(String(50), nullable=False, index=True)  # Using String instead of Enum for flexibility
    status = Column(String(20), default="active", nullable=False, index=True)
    version = Column(Integer, default=1, nullable=False)
    is_sensitive = Column(Boolean, default=False, nullable=False, index=True)
    
    # Compliance and tracking
    retention_date = Column(DateTime, nullable=True, index=True)
    access_count = Column(Integer, default=0, nullable=False)
    last_accessed_at = Column(DateTime, nullable=True)
    
    # Relationships
    review = relationship("Review", back_populates="documents")
    uploader = relationship("User", back_populates="uploaded_documents")
    
    # Create composite indexes for common query patterns
    __table_args__ = (
        Index('idx_document_review_type', 'review_id', 'document_type'),
        Index('idx_document_status_sensitive', 'status', 'is_sensitive'),
        Index('idx_document_retention_date', 'retention_date'),
        Index('idx_document_uploader_created', 'uploaded_by', 'created_at'),
    )
    
    def __repr__(self):
        """String representation of the Document model."""
        return f"<Document(id={self.id}, filename='{self.filename}', type='{self.document_type}')>"
    
    @property
    def is_active(self) -> bool:
        """Check if document is active."""
        return self.status == "active"
    
    @property
    def is_archived(self) -> bool:
        """Check if document is archived."""
        return self.status == "archived"
    
    @property
    def is_deleted(self) -> bool:
        """Check if document is deleted."""
        return self.status == "deleted"
    
    @property
    def is_uploading(self) -> bool:
        """Check if document is still uploading."""
        return self.status == "uploading"
    
    @property
    def file_size_mb(self) -> float:
        """Get file size in megabytes."""
        return round(self.file_size / (1024 * 1024), 2)
    
    @property
    def is_image(self) -> bool:
        """Check if document is an image."""
        return self.content_type.startswith('image/')
    
    @property
    def is_pdf(self) -> bool:
        """Check if document is a PDF."""
        return self.content_type == 'application/pdf'
    
    @property
    def is_expired(self) -> bool:
        """Check if document has passed its retention date."""
        if not self.retention_date:
            return False
        return datetime.utcnow() > self.retention_date
    
    @property
    def file_extension(self) -> str:
        """Get file extension from filename."""
        if '.' in self.filename:
            return self.filename.rsplit('.', 1)[1].lower()
        return ''
    
    def mark_as_uploaded(self, file_path: str, file_size: int, checksum: Optional[str] = None) -> None:
        """
        Mark document as successfully uploaded.
        
        Args:
            file_path: S3 path where file is stored
            file_size: Size of the uploaded file
            checksum: Optional file checksum
        """
        self.file_path = file_path
        self.file_size = file_size
        self.status = "active"
        if checksum:
            self.checksum = checksum
    
    def archive(self) -> None:
        """Archive the document."""
        if self.status != "active":
            raise ValueError(f"Cannot archive document with status: {self.status}")
        self.status = "archived"
    
    def delete(self) -> None:
        """Mark document as deleted (soft delete)."""
        if self.status == "deleted":
            raise ValueError("Document is already deleted")
        self.status = "deleted"
    
    def restore(self) -> None:
        """Restore a deleted document."""
        if self.status != "deleted":
            raise ValueError(f"Cannot restore document with status: {self.status}")
        self.status = "active"
    
    def record_access(self) -> None:
        """Record that the document was accessed."""
        if self.access_count is None:
            self.access_count = 0
        self.access_count += 1
        self.last_accessed_at = datetime.utcnow()
    
    def set_retention_date(self, retention_date: datetime) -> None:
        """
        Set the retention date for the document.
        
        Args:
            retention_date: Date when document should be deleted
        """
        self.retention_date = retention_date
    
    def mark_as_sensitive(self) -> None:
        """Mark document as containing sensitive information."""
        self.is_sensitive = True
    
    def mark_as_non_sensitive(self) -> None:
        """Mark document as not containing sensitive information."""
        self.is_sensitive = False
    
    def create_new_version(self, new_filename: str, new_content_type: str) -> 'Document':
        """
        Create a new version of this document.
        
        Args:
            new_filename: Filename for the new version
            new_content_type: Content type for the new version
            
        Returns:
            New Document instance for the next version
        """
        current_version = self.version or 1
        new_document = Document(
            review_id=self.review_id,
            uploaded_by=self.uploaded_by,
            filename=new_filename,
            content_type=new_content_type,
            document_type=self.document_type,
            version=current_version + 1,
            is_sensitive=self.is_sensitive,
            retention_date=self.retention_date,
            status="uploading"
        )
        return new_document
    
    @classmethod
    def get_documents_by_review(cls, db_session, review_id: int, include_deleted: bool = False) -> List['Document']:
        """
        Get all documents for a specific review.
        
        Args:
            db_session: Database session
            review_id: Review ID
            include_deleted: Whether to include deleted documents
            
        Returns:
            List of documents for the review
        """
        query = db_session.query(cls).filter(cls.review_id == review_id)
        
        if not include_deleted:
            query = query.filter(cls.status != "deleted")
        
        return query.order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_documents_by_uploader(cls, db_session, user_id: int) -> List['Document']:
        """
        Get all documents uploaded by a specific user.
        
        Args:
            db_session: Database session
            user_id: ID of the uploader
            
        Returns:
            List of documents uploaded by the user
        """
        return db_session.query(cls).filter(
            cls.uploaded_by == user_id,
            cls.status != "deleted"
        ).order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_sensitive_documents(cls, db_session) -> List['Document']:
        """
        Get all sensitive documents.
        
        Args:
            db_session: Database session
            
        Returns:
            List of sensitive documents
        """
        return db_session.query(cls).filter(
            cls.is_sensitive == True,
            cls.status == "active"
        ).order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_expired_documents(cls, db_session) -> List['Document']:
        """
        Get all documents that have passed their retention date.
        
        Args:
            db_session: Database session
            
        Returns:
            List of expired documents
        """
        return db_session.query(cls).filter(
            cls.retention_date < datetime.utcnow(),
            cls.status == "active"
        ).order_by(cls.retention_date).all()
    
    @classmethod
    def get_documents_by_type(cls, db_session, document_type: str) -> List['Document']:
        """
        Get all documents of a specific type.
        
        Args:
            db_session: Database session
            document_type: Type of documents to retrieve
            
        Returns:
            List of documents of the specified type
        """
        return db_session.query(cls).filter(
            cls.document_type == document_type,
            cls.status == "active"
        ).order_by(cls.created_at.desc()).all()
    
    @classmethod
    def search_documents(cls, db_session, 
                        filename_filter: Optional[str] = None,
                        document_type_filter: Optional[str] = None,
                        uploader_id: Optional[int] = None,
                        review_id: Optional[int] = None) -> List['Document']:
        """
        Search documents with various filters.
        
        Args:
            db_session: Database session
            filename_filter: Filter by filename (partial match)
            document_type_filter: Filter by document type
            uploader_id: Filter by uploader
            review_id: Filter by review
            
        Returns:
            List of matching documents
        """
        query = db_session.query(cls).filter(cls.status == "active")
        
        if filename_filter:
            query = query.filter(cls.filename.ilike(f"%{filename_filter}%"))
        
        if document_type_filter:
            query = query.filter(cls.document_type == document_type_filter)
        
        if uploader_id:
            query = query.filter(cls.uploaded_by == uploader_id)
        
        if review_id:
            query = query.filter(cls.review_id == review_id)
        
        return query.order_by(cls.created_at.desc()).all()