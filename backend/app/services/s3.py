"""
AWS S3 service for secure document handling.
Provides functionality for document upload, download, and management with pre-signed URLs.
"""
import hashlib
import logging
import mimetypes
import os
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, Any, List
from urllib.parse import urlparse

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from botocore.config import Config

from app.core.config import settings

logger = logging.getLogger(__name__)


class S3ServiceError(Exception):
    """Custom exception for S3 service errors."""
    pass


class S3Service:
    """
    AWS S3 service for secure document handling.
    
    Provides methods for:
    - Generating pre-signed URLs for secure uploads and downloads
    - Document metadata management
    - File integrity verification
    - Secure file access with expiring URLs
    """
    
    def __init__(self):
        """Initialize S3 service with AWS configuration."""
        self._client = None
        self._bucket_name = settings.S3_BUCKET_NAME
        
        if not self._bucket_name:
            raise S3ServiceError("S3_BUCKET_NAME not configured")
        
        # Configure boto3 with retry and timeout settings
        self._config = Config(
            region_name=settings.AWS_REGION,
            retries={
                'max_attempts': 3,
                'mode': 'adaptive'
            },
            max_pool_connections=50
        )
    
    @property
    def client(self):
        """Lazy initialization of S3 client."""
        if self._client is None:
            try:
                self._client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    config=self._config
                )
                # Test connection
                self._client.head_bucket(Bucket=self._bucket_name)
            except NoCredentialsError:
                raise S3ServiceError("AWS credentials not configured")
            except ClientError as e:
                error_code = e.response['Error']['Code']
                if error_code == '404':
                    raise S3ServiceError(f"S3 bucket '{self._bucket_name}' not found")
                elif error_code == '403':
                    raise S3ServiceError(f"Access denied to S3 bucket '{self._bucket_name}'")
                else:
                    raise S3ServiceError(f"Failed to connect to S3: {e}")
        
        return self._client
    
    def generate_upload_presigned_url(
        self,
        file_key: str,
        content_type: str,
        expiration: int = 3600,
        max_file_size: int = 100 * 1024 * 1024  # 100MB default
    ) -> Dict[str, Any]:
        """
        Generate a pre-signed URL for secure file upload.
        
        Args:
            file_key: S3 key/path for the file
            content_type: MIME type of the file
            expiration: URL expiration time in seconds (default: 1 hour)
            max_file_size: Maximum allowed file size in bytes
            
        Returns:
            Dictionary containing pre-signed URL and form fields
            
        Raises:
            S3ServiceError: If URL generation fails
        """
        try:
            # Define upload conditions for security
            conditions = [
                {"bucket": self._bucket_name},
                {"key": file_key},
                {"Content-Type": content_type},
                ["content-length-range", 1, max_file_size],  # File size limits
                {"x-amz-server-side-encryption": "AES256"}  # Encryption requirement
            ]
            
            # Generate pre-signed POST URL
            response = self.client.generate_presigned_post(
                Bucket=self._bucket_name,
                Key=file_key,
                Fields={
                    "Content-Type": content_type,
                    "x-amz-server-side-encryption": "AES256"
                },
                Conditions=conditions,
                ExpiresIn=expiration
            )
            
            logger.info(f"Generated upload pre-signed URL for key: {file_key}")
            return {
                "upload_url": response["url"],
                "fields": response["fields"],
                "expires_in": expiration,
                "max_file_size": max_file_size
            }
            
        except ClientError as e:
            logger.error(f"Failed to generate upload pre-signed URL: {e}")
            raise S3ServiceError(f"Failed to generate upload URL: {e}")
    
    def generate_download_presigned_url(
        self,
        file_key: str,
        expiration: int = 3600,
        filename: Optional[str] = None
    ) -> str:
        """
        Generate a pre-signed URL for secure file download.
        
        Args:
            file_key: S3 key/path for the file
            expiration: URL expiration time in seconds (default: 1 hour)
            filename: Optional filename for Content-Disposition header
            
        Returns:
            Pre-signed download URL
            
        Raises:
            S3ServiceError: If URL generation fails
        """
        try:
            params = {
                'Bucket': self._bucket_name,
                'Key': file_key
            }
            
            # Add Content-Disposition header if filename provided
            if filename:
                params['ResponseContentDisposition'] = f'attachment; filename="{filename}"'
            
            url = self.client.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expiration
            )
            
            logger.info(f"Generated download pre-signed URL for key: {file_key}")
            return url
            
        except ClientError as e:
            logger.error(f"Failed to generate download pre-signed URL: {e}")
            raise S3ServiceError(f"Failed to generate download URL: {e}")
    
    def get_file_metadata(self, file_key: str) -> Dict[str, Any]:
        """
        Get metadata for a file stored in S3.
        
        Args:
            file_key: S3 key/path for the file
            
        Returns:
            Dictionary containing file metadata
            
        Raises:
            S3ServiceError: If metadata retrieval fails
        """
        try:
            response = self.client.head_object(
                Bucket=self._bucket_name,
                Key=file_key
            )
            
            metadata = {
                "file_key": file_key,
                "size": response.get('ContentLength', 0),
                "content_type": response.get('ContentType', 'application/octet-stream'),
                "last_modified": response.get('LastModified'),
                "etag": response.get('ETag', '').strip('"'),
                "server_side_encryption": response.get('ServerSideEncryption'),
                "metadata": response.get('Metadata', {})
            }
            
            logger.info(f"Retrieved metadata for file: {file_key}")
            return metadata
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                raise S3ServiceError(f"File not found: {file_key}")
            else:
                logger.error(f"Failed to get file metadata: {e}")
                raise S3ServiceError(f"Failed to get file metadata: {e}")
    
    def delete_file(self, file_key: str) -> bool:
        """
        Delete a file from S3.
        
        Args:
            file_key: S3 key/path for the file to delete
            
        Returns:
            True if deletion was successful
            
        Raises:
            S3ServiceError: If deletion fails
        """
        try:
            self.client.delete_object(
                Bucket=self._bucket_name,
                Key=file_key
            )
            
            logger.info(f"Deleted file: {file_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete file: {e}")
            raise S3ServiceError(f"Failed to delete file: {e}")
    
    def copy_file(self, source_key: str, destination_key: str) -> bool:
        """
        Copy a file within S3.
        
        Args:
            source_key: S3 key/path for the source file
            destination_key: S3 key/path for the destination file
            
        Returns:
            True if copy was successful
            
        Raises:
            S3ServiceError: If copy fails
        """
        try:
            copy_source = {
                'Bucket': self._bucket_name,
                'Key': source_key
            }
            
            self.client.copy_object(
                CopySource=copy_source,
                Bucket=self._bucket_name,
                Key=destination_key,
                ServerSideEncryption='AES256'
            )
            
            logger.info(f"Copied file from {source_key} to {destination_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to copy file: {e}")
            raise S3ServiceError(f"Failed to copy file: {e}")
    
    def generate_file_key(
        self,
        review_id: int,
        user_id: int,
        filename: str,
        document_type: str = "general"
    ) -> str:
        """
        Generate a secure S3 key for file storage.
        
        Args:
            review_id: ID of the review
            user_id: ID of the uploading user
            filename: Original filename
            document_type: Type of document
            
        Returns:
            Generated S3 key/path
        """
        # Extract file extension
        file_ext = ""
        if '.' in filename:
            file_ext = filename.rsplit('.', 1)[1].lower()
        
        # Generate timestamp
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        
        # Create hash of filename for uniqueness
        filename_hash = hashlib.md5(filename.encode()).hexdigest()[:8]
        
        # Construct secure file key
        file_key = f"documents/{document_type}/review_{review_id}/user_{user_id}/{timestamp}_{filename_hash}"
        
        if file_ext:
            file_key += f".{file_ext}"
        
        return file_key
    
    def validate_file_type(self, filename: str, content_type: str) -> Tuple[bool, str]:
        """
        Validate file type based on filename and content type.
        
        Args:
            filename: Original filename
            content_type: MIME type
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Allowed file extensions and MIME types
        allowed_extensions = {
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff',
            'txt', 'csv', 'xml', 'json'
        }
        
        allowed_mime_types = {
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff',
            'text/plain', 'text/csv', 'application/xml', 'application/json'
        }
        
        # Check file extension
        file_ext = ""
        if '.' in filename:
            file_ext = filename.rsplit('.', 1)[1].lower()
        
        if file_ext not in allowed_extensions:
            return False, f"File extension '{file_ext}' is not allowed"
        
        # Check MIME type
        if content_type not in allowed_mime_types:
            return False, f"Content type '{content_type}' is not allowed"
        
        # Cross-validate extension and MIME type
        expected_mime = mimetypes.guess_type(filename)[0]
        if expected_mime and expected_mime != content_type:
            return False, f"Content type '{content_type}' does not match file extension"
        
        return True, ""
    
    def calculate_file_checksum(self, file_key: str) -> Optional[str]:
        """
        Calculate MD5 checksum for a file in S3.
        
        Args:
            file_key: S3 key/path for the file
            
        Returns:
            MD5 checksum or None if calculation fails
        """
        try:
            response = self.client.head_object(
                Bucket=self._bucket_name,
                Key=file_key
            )
            
            # S3 ETag is MD5 for single-part uploads
            etag = response.get('ETag', '').strip('"')
            
            # Check if it's a multipart upload (contains hyphen)
            if '-' not in etag:
                return etag
            else:
                # For multipart uploads, we'd need to download and calculate
                logger.warning(f"Cannot get simple MD5 for multipart upload: {file_key}")
                return None
                
        except ClientError as e:
            logger.error(f"Failed to calculate checksum: {e}")
            return None
    
    def list_files_by_prefix(self, prefix: str, max_keys: int = 1000) -> List[Dict[str, Any]]:
        """
        List files in S3 by prefix.
        
        Args:
            prefix: S3 key prefix to filter by
            max_keys: Maximum number of keys to return
            
        Returns:
            List of file information dictionaries
        """
        try:
            response = self.client.list_objects_v2(
                Bucket=self._bucket_name,
                Prefix=prefix,
                MaxKeys=max_keys
            )
            
            files = []
            for obj in response.get('Contents', []):
                files.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'],
                    'etag': obj['ETag'].strip('"')
                })
            
            return files
            
        except ClientError as e:
            logger.error(f"Failed to list files: {e}")
            raise S3ServiceError(f"Failed to list files: {e}")
    
    def check_bucket_exists(self) -> bool:
        """
        Check if the configured S3 bucket exists and is accessible.
        
        Returns:
            True if bucket exists and is accessible
        """
        try:
            self.client.head_bucket(Bucket=self._bucket_name)
            return True
        except ClientError:
            return False


# Global S3 service instance - lazy initialization
s3_service = None

def get_s3_service() -> S3Service:
    """Get or create S3 service instance."""
    global s3_service
    if s3_service is None:
        s3_service = S3Service()
    return s3_service