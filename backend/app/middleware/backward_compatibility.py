"""
Backward compatibility middleware for Enhanced Client Review System.

This middleware ensures that existing API clients continue to work during
the transition to the enhanced system.
"""

import logging
from typing import Callable, Dict, Any, Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import json

logger = logging.getLogger(__name__)


class BackwardCompatibilityMiddleware(BaseHTTPMiddleware):
    """Middleware to handle backward compatibility for API requests."""
    
    def __init__(self, app, enable_legacy_support: bool = True):
        """
        Initialize backward compatibility middleware.
        
        Args:
            app: FastAPI application
            enable_legacy_support: Whether to enable legacy API support
        """
        super().__init__(app)
        self.enable_legacy_support = enable_legacy_support
        self.legacy_endpoints = {
            # Map legacy endpoints to new endpoints
            "/api/v1/clients": "/api/v1/compatibility/clients",
            "/api/v1/reviews": "/api/v1/compatibility/reviews",
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and handle backward compatibility.
        
        Args:
            request: Incoming request
            call_next: Next middleware/handler
            
        Returns:
            Response with compatibility handling
        """
        if not self.enable_legacy_support:
            return await call_next(request)
        
        # Check if this is a legacy API request
        if self._is_legacy_request(request):
            return await self._handle_legacy_request(request, call_next)
        
        # Handle enhanced API requests
        response = await call_next(request)
        
        # Add compatibility headers
        if self._should_add_compatibility_headers(request):
            response.headers["X-API-Version"] = "enhanced"
            response.headers["X-Backward-Compatible"] = "true"
        
        return response
    
    def _is_legacy_request(self, request: Request) -> bool:
        """
        Check if the request is from a legacy client.
        
        Args:
            request: Incoming request
            
        Returns:
            True if legacy request, False otherwise
        """
        # Check for legacy client headers
        user_agent = request.headers.get("user-agent", "").lower()
        api_version = request.headers.get("x-api-version", "").lower()
        
        # Legacy indicators
        legacy_indicators = [
            "legacy-client",
            "old-review-system",
            api_version == "v1" or api_version == "legacy"
        ]
        
        return any(indicator in user_agent for indicator in legacy_indicators) or api_version == "legacy"
    
    async def _handle_legacy_request(self, request: Request, call_next: Callable) -> Response:
        """
        Handle requests from legacy clients.
        
        Args:
            request: Legacy request
            call_next: Next middleware/handler
            
        Returns:
            Response formatted for legacy clients
        """
        try:
            # Check if we need to redirect to compatibility endpoint
            path = request.url.path
            if path in self.legacy_endpoints:
                # Modify request to use compatibility endpoint
                new_path = self.legacy_endpoints[path]
                request.scope["path"] = new_path
                request.scope["raw_path"] = new_path.encode()
            
            # Process the request
            response = await call_next(request)
            
            # Transform response for legacy clients if needed
            if response.status_code == 200 and hasattr(response, 'body'):
                transformed_response = await self._transform_response_for_legacy(request, response)
                if transformed_response:
                    return transformed_response
            
            # Add legacy compatibility headers
            response.headers["X-API-Version"] = "legacy-compatible"
            response.headers["X-Legacy-Support"] = "enabled"
            
            return response
            
        except Exception as e:
            logger.error(f"Error handling legacy request: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Legacy compatibility error",
                    "message": str(e),
                    "legacy_support": True
                }
            )
    
    async def _transform_response_for_legacy(self, request: Request, response: Response) -> Optional[Response]:
        """
        Transform response data for legacy clients.
        
        Args:
            request: Original request
            response: Response to transform
            
        Returns:
            Transformed response or None if no transformation needed
        """
        try:
            # Only transform JSON responses
            content_type = response.headers.get("content-type", "")
            if "application/json" not in content_type:
                return None
            
            # Get response body
            body = b""
            async for chunk in response.body_iterator:
                body += chunk
            
            if not body:
                return None
            
            # Parse JSON
            try:
                data = json.loads(body.decode())
            except json.JSONDecodeError:
                return None
            
            # Transform based on endpoint
            path = request.url.path
            transformed_data = None
            
            if "/clients" in path:
                transformed_data = self._transform_client_data_for_legacy(data)
            elif "/reviews" in path:
                transformed_data = self._transform_review_data_for_legacy(data)
            
            if transformed_data is not None:
                return JSONResponse(
                    content=transformed_data,
                    status_code=response.status_code,
                    headers={
                        **dict(response.headers),
                        "X-Data-Transformed": "legacy-format"
                    }
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Error transforming response for legacy: {str(e)}")
            return None
    
    def _transform_client_data_for_legacy(self, data: Any) -> Any:
        """
        Transform client data for legacy format.
        
        Args:
            data: Client data to transform
            
        Returns:
            Transformed data in legacy format
        """
        if isinstance(data, list):
            return [self._transform_single_client_for_legacy(client) for client in data]
        elif isinstance(data, dict):
            return self._transform_single_client_for_legacy(data)
        
        return data
    
    def _transform_single_client_for_legacy(self, client: Dict[str, Any]) -> Dict[str, Any]:
        """Transform a single client record for legacy format."""
        # Remove enhanced fields that legacy clients don't expect
        legacy_client = client.copy()
        
        # Keep enhanced fields but mark them as optional
        enhanced_fields = ["domicile_branch", "relationship_manager", "business_unit", "aml_risk"]
        for field in enhanced_fields:
            if field in legacy_client and legacy_client[field] is None:
                # Remove null enhanced fields for cleaner legacy response
                legacy_client.pop(field, None)
        
        return legacy_client
    
    def _transform_review_data_for_legacy(self, data: Any) -> Any:
        """
        Transform review data for legacy format.
        
        Args:
            data: Review data to transform
            
        Returns:
            Transformed data in legacy format
        """
        if isinstance(data, list):
            return [self._transform_single_review_for_legacy(review) for review in data]
        elif isinstance(data, dict):
            return self._transform_single_review_for_legacy(data)
        
        return data
    
    def _transform_single_review_for_legacy(self, review: Dict[str, Any]) -> Dict[str, Any]:
        """Transform a single review record for legacy format."""
        legacy_review = review.copy()
        
        # Remove enhanced fields that legacy clients don't expect
        enhanced_fields = ["kyc_questionnaire", "exceptions", "enhanced_data"]
        for field in enhanced_fields:
            legacy_review.pop(field, None)
        
        # If there's an exceptions_summary, include it as a comment addendum
        if "exceptions_summary" in review and review["exceptions_summary"]:
            current_comments = legacy_review.get("comments", "")
            if current_comments:
                legacy_review["comments"] = f"{current_comments}\n\n[Exceptions] {review['exceptions_summary']}"
            else:
                legacy_review["comments"] = f"[Exceptions] {review['exceptions_summary']}"
        
        return legacy_review
    
    def _should_add_compatibility_headers(self, request: Request) -> bool:
        """
        Check if compatibility headers should be added.
        
        Args:
            request: Request to check
            
        Returns:
            True if headers should be added
        """
        # Add headers for API endpoints
        path = request.url.path
        return (path.startswith("/api/v1/") and 
                not path.startswith("/api/v1/compatibility/"))


class DocumentUploadCompatibilityHandler:
    """Handler for maintaining document upload compatibility."""
    
    @staticmethod
    def ensure_legacy_document_workflow(review_id: int, document_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ensure document upload workflow remains compatible with legacy clients.
        
        Args:
            review_id: Review ID
            document_data: Document upload data
            
        Returns:
            Compatible document data
        """
        # Preserve existing document upload structure
        compatible_data = document_data.copy()
        
        # Ensure required fields are present for legacy clients
        if "review_id" not in compatible_data:
            compatible_data["review_id"] = review_id
        
        # Map new document types to legacy types if needed
        type_mapping = {
            "kyc_evidence": "supporting",
            "source_of_funds": "financial",
            "adverse_media_screenshot": "compliance"
        }
        
        if "document_type" in compatible_data:
            legacy_type = type_mapping.get(compatible_data["document_type"])
            if legacy_type:
                compatible_data["legacy_document_type"] = compatible_data["document_type"]
                compatible_data["document_type"] = legacy_type
        
        return compatible_data
    
    @staticmethod
    def transform_document_response_for_legacy(document: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform document response for legacy clients.
        
        Args:
            document: Document data
            
        Returns:
            Legacy-compatible document data
        """
        legacy_doc = document.copy()
        
        # Remove enhanced fields
        enhanced_fields = ["kyc_question_link", "enhanced_metadata"]
        for field in enhanced_fields:
            legacy_doc.pop(field, None)
        
        # Restore legacy document type if it was mapped
        if "legacy_document_type" in legacy_doc:
            legacy_doc["document_type"] = legacy_doc.pop("legacy_document_type")
        
        return legacy_doc


def create_backward_compatibility_middleware(enable_legacy_support: bool = True):
    """
    Factory function to create backward compatibility middleware.
    
    Args:
        enable_legacy_support: Whether to enable legacy support
        
    Returns:
        Configured middleware class
    """
    def middleware_factory(app):
        return BackwardCompatibilityMiddleware(app, enable_legacy_support)
    
    return middleware_factory