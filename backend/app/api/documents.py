"""
Document management API endpoints.
Handles document upload, download, and management operations with S3 integration.
"""
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.document import (
    DocumentUploadRequest,
    DocumentUploadResponse,
    DocumentUploadConfirmRequest,
    DocumentDownloadRequest,
    DocumentDownloadResponse,
    DocumentVersionRequest,
    DocumentBase,
    DocumentDetail,
    DocumentList,
    DocumentDeleteRequest,
    DocumentSearchRequest,
    DocumentSearchResponse,
    DocumentOperationResponse,
    DocumentStatistics,
    BulkDocumentOperation,
    BulkDocumentOperationResponse
)
from app.services.document import get_document_service, DocumentServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload/prepare", response_model=DocumentUploadResponse)
async def prepare_document_upload(
    request: DocumentUploadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Prepare a document for upload by creating metadata and generating pre-signed URL.
    
    This endpoint:
    1. Validates the file type and request parameters
    2. Creates a document metadata record in the database
    3. Generates a pre-signed S3 URL for secure upload
    4. Returns upload instructions and metadata
    
    The client should use the returned upload_url and fields to upload the file directly to S3.
    After successful upload, call the confirm endpoint to finalize the process.
    """
    try:
        result = get_document_service().prepare_document_upload(
            db=db,
            review_id=request.review_id,
            user_id=current_user.id,
            filename=request.filename,
            content_type=request.content_type,
            document_type=request.document_type,
            file_size=request.file_size,
            is_sensitive=request.is_sensitive
        )
        
        return DocumentUploadResponse(**result)
        
    except DocumentServiceError as e:
        logger.error(f"Document upload preparation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in document upload preparation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to prepare document upload"
        )


@router.post("/upload/confirm", response_model=DocumentOperationResponse)
async def confirm_document_upload(
    request: DocumentUploadConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Confirm that a document has been successfully uploaded to S3.
    
    This endpoint:
    1. Verifies the file exists in S3
    2. Updates the document metadata with actual file information
    3. Changes document status from 'uploading' to 'active'
    4. Records the upload completion in audit logs
    
    Call this endpoint after successfully uploading the file using the pre-signed URL.
    """
    try:
        document = get_document_service().confirm_document_upload(
            db=db,
            document_id=request.document_id,
            user_id=current_user.id,
            actual_file_size=request.actual_file_size
        )
        
        return DocumentOperationResponse(
            success=True,
            message="Document upload confirmed successfully",
            document_id=document.id
        )
        
    except DocumentServiceError as e:
        logger.error(f"Document upload confirmation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in document upload confirmation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to confirm document upload"
        )


@router.post("/download", response_model=DocumentDownloadResponse)
async def get_document_download_url(
    request: DocumentDownloadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a secure download URL for a document.
    
    This endpoint:
    1. Verifies user has access to the document
    2. Generates a pre-signed S3 URL for secure download
    3. Records the access in audit logs
    4. Updates document access statistics
    
    The returned URL is temporary and will expire after the specified time.
    """
    try:
        download_url = get_document_service().get_document_download_url(
            db=db,
            document_id=request.document_id,
            user_id=current_user.id,
            expiration=request.expiration
        )
        
        # Get document info for response
        from app.models.document import Document
        document = db.query(Document).filter(Document.id == request.document_id).first()
        
        return DocumentDownloadResponse(
            download_url=download_url,
            expires_in=request.expiration,
            filename=document.filename
        )
        
    except DocumentServiceError as e:
        logger.error(f"Document download URL generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error generating download URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate download URL"
        )


@router.get("/review/{review_id}", response_model=DocumentList)
async def get_documents_by_review(
    review_id: int,
    include_deleted: bool = Query(default=False, description="Include deleted documents"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all documents for a specific review.
    
    This endpoint:
    1. Verifies user has access to the review
    2. Retrieves all documents associated with the review
    3. Optionally includes deleted documents
    4. Returns document metadata and statistics
    
    Access is granted to review makers, checkers, and administrators.
    """
    try:
        documents = get_document_service().get_documents_by_review(
            db=db,
            review_id=review_id,
            user_id=current_user.id,
            include_deleted=include_deleted
        )
        
        document_list = [DocumentBase.from_orm(doc) for doc in documents]
        
        return DocumentList(
            documents=document_list,
            total_count=len(document_list),
            review_id=review_id
        )
        
    except DocumentServiceError as e:
        logger.error(f"Failed to get documents by review: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error getting review documents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve review documents"
        )


@router.get("/{document_id}", response_model=DocumentDetail)
async def get_document_details(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific document.
    
    This endpoint:
    1. Verifies user has access to the document
    2. Returns comprehensive document metadata
    3. Includes computed properties like file size in MB, type checks, etc.
    
    Access is granted to document uploaders, review participants, and administrators.
    """
    try:
        from app.models.document import Document
        
        # Use the service's access control method
        document = get_document_service()._get_document_with_access_check(
            db=db,
            document_id=document_id,
            user_id=current_user.id
        )
        
        return DocumentDetail.from_orm(document)
        
    except DocumentServiceError as e:
        logger.error(f"Failed to get document details: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error getting document details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document details"
        )


@router.delete("/{document_id}", response_model=DocumentOperationResponse)
async def delete_document(
    document_id: int,
    permanent: bool = Query(default=False, description="Permanently delete from S3"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a document (soft delete by default).
    
    This endpoint:
    1. Verifies user has permission to delete the document
    2. Performs soft delete (status change) or permanent delete
    3. Optionally removes file from S3 for permanent deletion
    4. Records deletion in audit logs
    
    Only document uploaders and administrators can delete documents.
    """
    try:
        success = get_document_service().delete_document(
            db=db,
            document_id=document_id,
            user_id=current_user.id,
            permanent=permanent
        )
        
        return DocumentOperationResponse(
            success=success,
            message=f"Document {'permanently ' if permanent else ''}deleted successfully",
            document_id=document_id
        )
        
    except DocumentServiceError as e:
        logger.error(f"Document deletion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error deleting document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document"
        )


@router.post("/version", response_model=DocumentUploadResponse)
async def create_document_version(
    request: DocumentVersionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new version of an existing document.
    
    This endpoint:
    1. Verifies user has access to the original document
    2. Creates a new document record with incremented version
    3. Generates pre-signed URL for uploading the new version
    4. Maintains link to original document for version history
    
    Use this for updating existing documents while preserving history.
    """
    try:
        result = get_document_service().create_document_version(
            db=db,
            original_document_id=request.original_document_id,
            user_id=current_user.id,
            filename=request.filename,
            content_type=request.content_type
        )
        
        return DocumentUploadResponse(**result)
        
    except DocumentServiceError as e:
        logger.error(f"Document version creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error creating document version: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create document version"
        )


@router.post("/search", response_model=DocumentSearchResponse)
async def search_documents(
    request: DocumentSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search documents with various filters.
    
    This endpoint:
    1. Applies user-specified filters (review, type, filename, etc.)
    2. Enforces access control based on user permissions
    3. Returns paginated results
    4. Supports partial filename matching
    
    Users can only see documents they have access to based on review participation.
    """
    try:
        from app.models.document import Document
        from app.models.review import Review
        from sqlalchemy import and_, or_
        
        # Build base query with access control
        query = db.query(Document).join(Review)
        
        # Apply access control - users can see documents from reviews they're involved in
        if current_user.role != "admin":
            query = query.filter(
                or_(
                    Document.uploaded_by == current_user.id,
                    Review.submitted_by == current_user.id,
                    Review.reviewed_by == current_user.id
                )
            )
        
        # Apply filters
        if request.review_id:
            query = query.filter(Document.review_id == request.review_id)
        
        if request.document_type:
            query = query.filter(Document.document_type == request.document_type)
        
        if request.filename_filter:
            query = query.filter(Document.filename.ilike(f"%{request.filename_filter}%"))
        
        if request.is_sensitive is not None:
            query = query.filter(Document.is_sensitive == request.is_sensitive)
        
        if request.status:
            query = query.filter(Document.status == request.status)
        else:
            # Default to active documents only
            query = query.filter(Document.status == "active")
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        offset = (request.page - 1) * request.per_page
        documents = query.order_by(Document.created_at.desc()).offset(offset).limit(request.per_page).all()
        
        # Calculate total pages
        total_pages = (total_count + request.per_page - 1) // request.per_page
        
        document_list = [DocumentBase.from_orm(doc) for doc in documents]
        
        return DocumentSearchResponse(
            documents=document_list,
            total_count=total_count,
            page=request.page,
            per_page=request.per_page,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"Document search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search documents"
        )


@router.get("/statistics/overview", response_model=DocumentStatistics)
async def get_document_statistics(
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.CHECKER)),
    db: Session = Depends(get_db)
):
    """
    Get document statistics and metrics.
    
    This endpoint provides:
    1. Total document counts by type and status
    2. Storage usage statistics
    3. Sensitive document counts
    4. Recent activity metrics
    
    Available to administrators and checkers for oversight purposes.
    """
    try:
        from app.models.document import Document
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        # Get basic counts
        total_documents = db.query(Document).filter(Document.status != "deleted").count()
        
        # Documents by type
        type_counts = db.query(
            Document.document_type,
            func.count(Document.id)
        ).filter(Document.status != "deleted").group_by(Document.document_type).all()
        
        documents_by_type = {doc_type: count for doc_type, count in type_counts}
        
        # Documents by status
        status_counts = db.query(
            Document.status,
            func.count(Document.id)
        ).group_by(Document.status).all()
        
        documents_by_status = {status: count for status, count in status_counts}
        
        # Storage statistics
        total_size_result = db.query(func.sum(Document.file_size)).filter(
            Document.status != "deleted"
        ).scalar()
        total_file_size = total_size_result or 0
        
        # Sensitive documents
        sensitive_count = db.query(Document).filter(
            and_(Document.is_sensitive == True, Document.status != "deleted")
        ).count()
        
        # Expired documents
        expired_count = db.query(Document).filter(
            and_(
                Document.retention_date < datetime.utcnow(),
                Document.status == "active"
            )
        ).count()
        
        # Recent uploads (last 24 hours)
        yesterday = datetime.utcnow() - timedelta(days=1)
        recent_uploads = db.query(Document).filter(
            Document.created_at >= yesterday
        ).count()
        
        return DocumentStatistics(
            total_documents=total_documents,
            documents_by_type=documents_by_type,
            documents_by_status=documents_by_status,
            total_file_size=total_file_size,
            total_file_size_mb=round(total_file_size / (1024 * 1024), 2),
            sensitive_documents_count=sensitive_count,
            expired_documents_count=expired_count,
            recent_uploads_count=recent_uploads
        )
        
    except Exception as e:
        logger.error(f"Failed to get document statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document statistics"
        )


@router.post("/bulk", response_model=BulkDocumentOperationResponse)
async def bulk_document_operation(
    request: BulkDocumentOperation,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Perform bulk operations on multiple documents.
    
    This endpoint allows administrators to:
    1. Bulk delete multiple documents
    2. Bulk archive documents
    3. Bulk restore deleted documents
    
    Operations are performed with proper access control and audit logging.
    Available to administrators only.
    """
    try:
        from app.models.document import Document
        from app.services.audit import AuditService
        
        successful_ids = []
        failed_operations = []
        
        for document_id in request.document_ids:
            try:
                document = db.query(Document).filter(Document.id == document_id).first()
                if not document:
                    failed_operations.append({
                        "document_id": document_id,
                        "error": "Document not found"
                    })
                    continue
                
                if request.operation == "delete":
                    document.delete()
                elif request.operation == "archive":
                    document.archive()
                elif request.operation == "restore":
                    document.restore()
                
                successful_ids.append(document_id)
                
                # Log the operation
                audit_service = AuditService(db)
                audit_service.log_action(
                    user_id=current_user.id,
                    entity_type="document",
                    entity_id=str(document_id),
                    action=f"bulk_{request.operation}",
                    details={
                        "filename": document.filename,
                        "operation": request.operation
                    }
                )
                
            except Exception as e:
                failed_operations.append({
                    "document_id": document_id,
                    "error": str(e)
                })
        
        db.commit()
        
        success_count = len(successful_ids)
        failure_count = len(failed_operations)
        total_count = len(request.document_ids)
        
        return BulkDocumentOperationResponse(
            success_count=success_count,
            failure_count=failure_count,
            total_count=total_count,
            successful_ids=successful_ids,
            failed_operations=failed_operations,
            message=f"Bulk {request.operation} completed: {success_count} successful, {failure_count} failed"
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk document operation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform bulk document operation"
        )