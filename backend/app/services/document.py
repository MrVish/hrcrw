"""
Document service for managing document uploads, metadata, and S3 integration.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.document import Document
from app.models.user import User
from app.models.review import Review
from app.services.s3 import get_s3_service, S3ServiceError
from app.services.audit import AuditService

logger = logging.getLogger(__name__)


class DocumentServiceError(Exception):
    """Custom exception for document service errors."""
    pass


class DocumentService:
    """
    Service for managing document operations including S3 integration.
    
    Handles:
    - Document upload preparation and metadata creation
    - Pre-signed URL generation for secure uploads
    - Document retrieval and access control
    - Version management and audit logging
    """
    
    def __init__(self):
        """Initialize document service."""
        self.s3_service = get_s3_service()
    
    def prepare_document_upload(
        self,
        db: Session,
        review_id: int,
        user_id: int,
        filename: str,
        content_type: str,
        document_type: str = "supporting",
        file_size: Optional[int] = None,
        is_sensitive: bool = False
    ) -> Dict[str, Any]:
        """
        Prepare a document for upload by creating metadata and generating pre-signed URL.
        
        Args:
            db: Database session
            review_id: ID of the review this document belongs to
            user_id: ID of the user uploading the document
            filename: Original filename
            content_type: MIME type of the file
            document_type: Type/category of the document
            file_size: Expected file size in bytes
            is_sensitive: Whether the document contains sensitive information
            
        Returns:
            Dictionary containing document metadata and upload URL
            
        Raises:
            DocumentServiceError: If preparation fails
        """
        try:
            # Validate file type
            is_valid, error_msg = self.s3_service.validate_file_type(filename, content_type)
            if not is_valid:
                raise DocumentServiceError(f"Invalid file type: {error_msg}")
            
            # Check if review exists
            review = db.query(Review).filter(Review.id == review_id).first()
            if not review:
                raise DocumentServiceError(f"Review with ID {review_id} not found")
            
            # Check if user exists
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise DocumentServiceError(f"User with ID {user_id} not found")
            
            # Generate S3 file key
            file_key = self.s3_service.generate_file_key(
                review_id=review_id,
                user_id=user_id,
                filename=filename,
                document_type=document_type
            )
            
            # Create document metadata record
            document = Document(
                review_id=review_id,
                uploaded_by=user_id,
                filename=filename,
                file_path=file_key,
                file_size=file_size or 0,
                content_type=content_type,
                document_type=document_type,
                status="uploading",
                is_sensitive=is_sensitive,
                version=1
            )
            
            # Set retention date (7 years for compliance documents)
            if document_type in ["compliance", "legal", "identity"]:
                document.retention_date = datetime.utcnow() + timedelta(days=7*365)
            else:
                document.retention_date = datetime.utcnow() + timedelta(days=3*365)
            
            db.add(document)
            db.flush()  # Get the document ID
            
            # Generate pre-signed upload URL
            upload_data = self.s3_service.generate_upload_presigned_url(
                file_key=file_key,
                content_type=content_type,
                expiration=3600,  # 1 hour
                max_file_size=100 * 1024 * 1024  # 100MB
            )
            
            # Log the document preparation
            audit_service = AuditService(db)
            audit_service.log_action(
                user_id=user_id,
                entity_type="DOCUMENT",
                entity_id=str(document.id),
                action="prepare_upload",
                details={
                    "filename": filename,
                    "document_type": document_type,
                    "review_id": review_id,
                    "file_key": file_key,
                    "is_sensitive": is_sensitive
                }
            )
            
            db.commit()
            
            return {
                "document_id": document.id,
                "upload_url": upload_data["upload_url"],
                "upload_fields": upload_data["fields"],
                "file_key": file_key,
                "expires_in": upload_data["expires_in"],
                "max_file_size": upload_data["max_file_size"]
            }
            
        except S3ServiceError as e:
            db.rollback()
            logger.error(f"S3 error during document upload preparation: {e}")
            raise DocumentServiceError(f"Failed to prepare upload: {e}")
        except Exception as e:
            db.rollback()
            logger.error(f"Error preparing document upload: {e}")
            raise DocumentServiceError(f"Failed to prepare document upload: {e}")
    
    def confirm_document_upload(
        self,
        db: Session,
        document_id: int,
        user_id: int,
        actual_file_size: Optional[int] = None
    ) -> Document:
        """
        Confirm that a document has been successfully uploaded to S3.
        
        Args:
            db: Database session
            document_id: ID of the document
            user_id: ID of the user confirming the upload
            actual_file_size: Actual size of the uploaded file
            
        Returns:
            Updated document object
            
        Raises:
            DocumentServiceError: If confirmation fails
        """
        try:
            # Get document record
            document = db.query(Document).filter(
                Document.id == document_id,
                Document.uploaded_by == user_id,
                Document.status == "uploading"
            ).first()
            
            if not document:
                raise DocumentServiceError(f"Document {document_id} not found or not in uploading state")
            
            # Verify file exists in S3 and get metadata
            try:
                s3_metadata = self.s3_service.get_file_metadata(document.file_path)
                
                # Update document with S3 metadata
                document.file_size = s3_metadata["size"]
                document.status = "active"
                
                # Calculate and store checksum if available
                checksum = self.s3_service.calculate_file_checksum(document.file_path)
                if checksum:
                    document.checksum = checksum
                
            except S3ServiceError as e:
                raise DocumentServiceError(f"Failed to verify file in S3: {e}")
            
            # Log the successful upload
            audit_service = AuditService(db)
            audit_service.log_action(
                user_id=user_id,
                entity_type="DOCUMENT",
                entity_id=str(document.id),
                action="upload_confirmed",
                details={
                    "filename": document.filename,
                    "file_size": document.file_size,
                    "file_path": document.file_path,
                    "checksum": document.checksum
                }
            )
            
            db.commit()
            
            logger.info(f"Document upload confirmed: {document.id}")
            return document
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error confirming document upload: {e}")
            raise DocumentServiceError(f"Failed to confirm document upload: {e}")
    
    def get_document_download_url(
        self,
        db: Session,
        document_id: int,
        user_id: int,
        expiration: int = 3600
    ) -> str:
        """
        Generate a secure download URL for a document.
        
        Args:
            db: Database session
            document_id: ID of the document
            user_id: ID of the user requesting access
            expiration: URL expiration time in seconds
            
        Returns:
            Pre-signed download URL
            
        Raises:
            DocumentServiceError: If URL generation fails
        """
        try:
            # Get document with access control
            document = self._get_document_with_access_check(db, document_id, user_id)
            
            # Generate download URL
            download_url = self.s3_service.generate_download_presigned_url(
                file_key=document.file_path,
                expiration=expiration,
                filename=document.filename
            )
            
            # Record access
            document.record_access()
            
            # Log the access
            audit_service = AuditService(db)
            audit_service.log_action(
                user_id=user_id,
                entity_type="DOCUMENT",
                entity_id=str(document.id),
                action="download_url_generated",
                details={
                    "filename": document.filename,
                    "access_count": document.access_count,
                    "expiration": expiration
                }
            )
            
            db.commit()
            
            return download_url
            
        except S3ServiceError as e:
            logger.error(f"S3 error generating download URL: {e}")
            raise DocumentServiceError(f"Failed to generate download URL: {e}")
        except Exception as e:
            logger.error(f"Error generating download URL: {e}")
            raise DocumentServiceError(f"Failed to generate download URL: {e}")
    
    def get_documents_by_review(
        self,
        db: Session,
        review_id: int,
        user_id: int,
        include_deleted: bool = False
    ) -> List[Document]:
        """
        Get all documents for a specific review.
        
        Args:
            db: Database session
            review_id: ID of the review
            user_id: ID of the user requesting access
            include_deleted: Whether to include deleted documents
            
        Returns:
            List of documents for the review
            
        Raises:
            DocumentServiceError: If access is denied or review not found
        """
        try:
            # Check if user has access to the review
            review = db.query(Review).filter(Review.id == review_id).first()
            if not review:
                raise DocumentServiceError(f"Review {review_id} not found")
            
            # Check access permissions (user is maker, checker, or admin)
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise DocumentServiceError("User not found")
            
            # Allow access if user is the maker, assigned checker, or admin
            has_access = (
                review.submitted_by == user_id or
                review.reviewed_by == user_id or
                user.role == "admin"
            )
            
            if not has_access:
                raise DocumentServiceError("Access denied to review documents")
            
            # Get documents
            query = db.query(Document).filter(Document.review_id == review_id)
            
            if not include_deleted:
                query = query.filter(Document.status != "deleted")
            
            documents = query.order_by(Document.created_at.desc()).all()
            
            # Log the access
            audit_service = AuditService(db)
            audit_service.log_action(
                user_id=user_id,
                entity_type="REVIEW",
                entity_id=str(review_id),
                action="documents_accessed",
                details={
                    "document_count": len(documents),
                    "include_deleted": include_deleted
                }
            )
            
            return documents
            
        except Exception as e:
            logger.error(f"Error getting documents by review: {e}")
            raise DocumentServiceError(f"Failed to get review documents: {e}")
    
    def delete_document(
        self,
        db: Session,
        document_id: int,
        user_id: int,
        permanent: bool = False
    ) -> bool:
        """
        Delete a document (soft delete by default).
        
        Args:
            db: Database session
            document_id: ID of the document to delete
            user_id: ID of the user requesting deletion
            permanent: Whether to permanently delete from S3
            
        Returns:
            True if deletion was successful
            
        Raises:
            DocumentServiceError: If deletion fails
        """
        try:
            # Get document with access control
            document = self._get_document_with_access_check(db, document_id, user_id)
            
            # Check if user can delete (uploader or admin)
            user = db.query(User).filter(User.id == user_id).first()
            can_delete = (
                document.uploaded_by == user_id or
                user.role == "admin"
            )
            
            if not can_delete:
                raise DocumentServiceError("Access denied for document deletion")
            
            if permanent:
                # Permanently delete from S3
                try:
                    self.s3_service.delete_file(document.file_path)
                except S3ServiceError as e:
                    logger.warning(f"Failed to delete file from S3: {e}")
                
                # Delete from database
                db.delete(document)
                action = "permanent_delete"
            else:
                # Soft delete
                document.delete()
                action = "soft_delete"
            
            # Log the deletion
            audit_service = AuditService(db)
            audit_service.log_action(
                user_id=user_id,
                entity_type="DOCUMENT",
                entity_id=str(document.id),
                action=action,
                details={
                    "filename": document.filename,
                    "file_path": document.file_path,
                    "permanent": permanent
                }
            )
            
            db.commit()
            
            logger.info(f"Document {'permanently ' if permanent else ''}deleted: {document_id}")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting document: {e}")
            raise DocumentServiceError(f"Failed to delete document: {e}")
    
    def create_document_version(
        self,
        db: Session,
        original_document_id: int,
        user_id: int,
        filename: str,
        content_type: str
    ) -> Dict[str, Any]:
        """
        Create a new version of an existing document.
        
        Args:
            db: Database session
            original_document_id: ID of the original document
            user_id: ID of the user creating the new version
            filename: Filename for the new version
            content_type: MIME type of the new file
            
        Returns:
            Dictionary containing new document metadata and upload URL
            
        Raises:
            DocumentServiceError: If version creation fails
        """
        try:
            # Get original document
            original_doc = self._get_document_with_access_check(db, original_document_id, user_id)
            
            # Create new version
            new_document = original_doc.create_new_version(filename, content_type)
            new_document.uploaded_by = user_id
            
            # Generate new S3 file key
            file_key = self.s3_service.generate_file_key(
                review_id=new_document.review_id,
                user_id=user_id,
                filename=filename,
                document_type=new_document.document_type
            )
            new_document.file_path = file_key
            
            db.add(new_document)
            db.flush()
            
            # Generate pre-signed upload URL
            upload_data = self.s3_service.generate_upload_presigned_url(
                file_key=file_key,
                content_type=content_type
            )
            
            # Log version creation
            audit_service = AuditService(db)
            audit_service.log_action(
                user_id=user_id,
                entity_type="DOCUMENT",
                entity_id=str(new_document.id),
                action="version_created",
                details={
                    "original_document_id": original_document_id,
                    "original_version": original_doc.version,
                    "new_version": new_document.version,
                    "filename": filename
                }
            )
            
            db.commit()
            
            return {
                "document_id": new_document.id,
                "version": new_document.version,
                "upload_url": upload_data["upload_url"],
                "upload_fields": upload_data["fields"],
                "file_key": file_key,
                "expires_in": upload_data["expires_in"]
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating document version: {e}")
            raise DocumentServiceError(f"Failed to create document version: {e}")
    
    def _get_document_with_access_check(
        self,
        db: Session,
        document_id: int,
        user_id: int
    ) -> Document:
        """
        Get document with access control check.
        
        Args:
            db: Database session
            document_id: ID of the document
            user_id: ID of the user requesting access
            
        Returns:
            Document object if access is allowed
            
        Raises:
            DocumentServiceError: If document not found or access denied
        """
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise DocumentServiceError(f"Document {document_id} not found")
        
        # Get user and review for access control
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise DocumentServiceError("User not found")
        
        review = db.query(Review).filter(Review.id == document.review_id).first()
        if not review:
            raise DocumentServiceError("Associated review not found")
        
        # Check access permissions
        has_access = (
            document.uploaded_by == user_id or  # Uploader
            review.submitted_by == user_id or   # Review maker
            review.reviewed_by == user_id or    # Review checker
            user.role == "admin"                # Admin
        )
        
        if not has_access:
            raise DocumentServiceError("Access denied to document")
        
        return document


# Global document service instance - lazy initialization
document_service = None

def get_document_service() -> DocumentService:
    """Get or create document service instance."""
    global document_service
    if document_service is None:
        document_service = DocumentService()
    return document_service
