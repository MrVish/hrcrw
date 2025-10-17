"""
Audit logging middleware for automatic audit trail generation.
"""
import json
import time
import uuid
from typing import Callable, Optional, Dict, Any
from fastapi import Request, Response
from fastapi.routing import APIRoute
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.audit_log import AuditLog, AuditAction, AuditEntityType
from app.core.auth import get_user_from_token


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Middleware for automatic audit trail generation.
    
    This middleware captures all API requests and responses, creating audit logs
    for compliance tracking and security monitoring.
    """
    
    def __init__(self, app, exclude_paths: Optional[list] = None):
        """
        Initialize audit middleware.
        
        Args:
            app: FastAPI application instance
            exclude_paths: List of paths to exclude from audit logging
        """
        super().__init__(app)
        self.exclude_paths = exclude_paths or [
            "/health",
            "/",
            "/docs",
            "/openapi.json",
            "/redoc"
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> StarletteResponse:
        """
        Process request and generate audit log.
        
        Args:
            request: Incoming HTTP request
            call_next: Next middleware or endpoint handler
            
        Returns:
            HTTP response
        """
        # Skip audit logging for excluded paths
        if self._should_exclude_path(request.url.path):
            return await call_next(request)
        
        # Generate unique request ID for tracking
        request_id = str(uuid.uuid4())
        
        # Capture request start time
        start_time = time.time()
        
        # Extract request information
        request_info = await self._extract_request_info(request)
        
        # Get user information from token if available
        user_info = await self._get_user_info(request)
        
        # Process the request
        response = await call_next(request)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Extract response information
        response_info = self._extract_response_info(response)
        
        # Create audit log entry
        await self._create_audit_log(
            request_id=request_id,
            request_info=request_info,
            response_info=response_info,
            user_info=user_info,
            processing_time=processing_time
        )
        
        # Add request ID to response headers for tracking
        response.headers["X-Request-ID"] = request_id
        
        return response
    
    def _should_exclude_path(self, path: str) -> bool:
        """
        Check if path should be excluded from audit logging.
        
        Args:
            path: Request path
            
        Returns:
            True if path should be excluded
        """
        return any(path.startswith(excluded) for excluded in self.exclude_paths)
    
    async def _extract_request_info(self, request: Request) -> Dict[str, Any]:
        """
        Extract relevant information from the request.
        
        Args:
            request: HTTP request
            
        Returns:
            Dictionary containing request information
        """
        # Get client IP address
        client_ip = self._get_client_ip(request)
        
        # Get user agent
        user_agent = request.headers.get("user-agent", "")
        
        # Get request body for POST/PUT/PATCH requests
        request_body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                # Read body and reset stream for downstream processing
                body = await request.body()
                if body:
                    # Try to parse as JSON, fallback to string
                    try:
                        request_body = json.loads(body.decode())
                        # Remove sensitive fields
                        request_body = self._sanitize_request_body(request_body)
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        request_body = {"raw_body_length": len(body)}
            except Exception:
                request_body = {"error": "Could not read request body"}
        
        return {
            "method": request.method,
            "url": str(request.url),
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "headers": dict(request.headers),
            "client_ip": client_ip,
            "user_agent": user_agent,
            "request_body": request_body
        }
    
    def _extract_response_info(self, response: Response) -> Dict[str, Any]:
        """
        Extract relevant information from the response.
        
        Args:
            response: HTTP response
            
        Returns:
            Dictionary containing response information
        """
        return {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "media_type": response.media_type
        }
    
    async def _get_user_info(self, request: Request) -> Optional[Dict[str, Any]]:
        """
        Extract user information from request token.
        
        Args:
            request: HTTP request
            
        Returns:
            User information dictionary or None
        """
        try:
            # Get authorization header
            auth_header = request.headers.get("authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return None
            
            # Extract token
            token = auth_header.split(" ")[1]
            
            # Get user from token
            user = await get_user_from_token(token)
            if user:
                return {
                    "user_id": user.id,
                    "email": user.email,
                    "role": user.role.value,
                    "is_active": user.is_active
                }
        except Exception:
            # If token validation fails, continue without user info
            pass
        
        return None
    
    def _get_client_ip(self, request: Request) -> str:
        """
        Get client IP address from request headers.
        
        Args:
            request: HTTP request
            
        Returns:
            Client IP address
        """
        # Check for forwarded headers (load balancer, proxy)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()
        
        # Check for real IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to client host
        return request.client.host if request.client else "unknown"
    
    def _sanitize_request_body(self, body: Dict[str, Any]) -> Dict[str, Any]:
        """
        Remove sensitive information from request body.
        
        Args:
            body: Request body dictionary
            
        Returns:
            Sanitized request body
        """
        sensitive_fields = [
            "password", "token", "secret", "key", "auth",
            "credential", "private", "confidential"
        ]
        
        sanitized = {}
        for key, value in body.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in sensitive_fields):
                sanitized[key] = "[REDACTED]"
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_request_body(value)
            elif isinstance(value, list):
                sanitized[key] = [
                    self._sanitize_request_body(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                sanitized[key] = value
        
        return sanitized
    
    async def _create_audit_log(
        self,
        request_id: str,
        request_info: Dict[str, Any],
        response_info: Dict[str, Any],
        user_info: Optional[Dict[str, Any]],
        processing_time: float
    ) -> None:
        """
        Create audit log entry in database.
        
        Args:
            request_id: Unique request identifier
            request_info: Request information
            response_info: Response information
            user_info: User information (if authenticated)
            processing_time: Request processing time in seconds
        """
        try:
            # Create database session
            db = SessionLocal()
            
            # Determine audit action based on HTTP method and path
            action = self._determine_audit_action(
                request_info["method"], 
                request_info["path"]
            )
            
            # Determine entity type and ID from path
            entity_type, entity_id = self._extract_entity_info(request_info["path"])
            
            # Create description
            description = self._create_audit_description(
                request_info["method"],
                request_info["path"],
                response_info["status_code"],
                user_info
            )
            
            # Prepare audit details
            audit_details = {
                "request_id": request_id,
                "method": request_info["method"],
                "path": request_info["path"],
                "status_code": response_info["status_code"],
                "processing_time_ms": round(processing_time * 1000, 2),
                "query_params": request_info["query_params"],
                "user_agent": request_info["user_agent"],
                "request_body": request_info["request_body"]
            }
            
            # Create audit log entry
            audit_log = AuditLog.create_audit_log(
                user_id=user_info["user_id"] if user_info else None,
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                description=description,
                details=audit_details,
                ip_address=request_info["client_ip"],
                user_agent=request_info["user_agent"],
                session_id=request_id  # Use request ID as session identifier
            )
            
            # Set success/failure based on response status
            if 200 <= response_info["status_code"] < 400:
                audit_log.set_success()
            else:
                audit_log.set_failure(f"HTTP {response_info['status_code']}")
            
            # Save to database
            db.add(audit_log)
            db.commit()
            
        except Exception as e:
            # Log error but don't fail the request
            print(f"Failed to create audit log: {str(e)}")
        finally:
            if 'db' in locals():
                db.close()
    
    def _determine_audit_action(self, method: str, path: str) -> AuditAction:
        """
        Determine audit action based on HTTP method and path.
        
        Args:
            method: HTTP method
            path: Request path
            
        Returns:
            Appropriate audit action
        """
        # Map HTTP methods to audit actions
        method_mapping = {
            "GET": AuditAction.ACCESS,
            "POST": AuditAction.CREATE,
            "PUT": AuditAction.UPDATE,
            "PATCH": AuditAction.UPDATE,
            "DELETE": AuditAction.DELETE
        }
        
        # Special cases based on path patterns
        if "/auth/login" in path:
            return AuditAction.LOGIN
        elif "/auth/logout" in path:
            return AuditAction.LOGOUT
        elif "/submit" in path:
            return AuditAction.SUBMIT
        elif "/approve" in path:
            return AuditAction.APPROVE
        elif "/reject" in path:
            return AuditAction.REJECT
        elif "/assign" in path:
            return AuditAction.ASSIGN
        elif "/resolve" in path:
            return AuditAction.RESOLVE
        elif "/upload" in path:
            return AuditAction.UPLOAD
        elif "/download" in path:
            return AuditAction.DOWNLOAD
        elif "/export" in path:
            return AuditAction.EXPORT
        
        # Default to method-based mapping
        return method_mapping.get(method, AuditAction.ACCESS)
    
    def _extract_entity_info(self, path: str) -> tuple[AuditEntityType, Optional[str]]:
        """
        Extract entity type and ID from request path.
        
        Args:
            path: Request path
            
        Returns:
            Tuple of (entity_type, entity_id)
        """
        # Parse path to determine entity type
        path_parts = path.strip("/").split("/")
        
        if "users" in path_parts:
            entity_type = AuditEntityType.USER
            # Try to extract user ID
            try:
                user_idx = path_parts.index("users")
                if user_idx + 1 < len(path_parts):
                    entity_id = path_parts[user_idx + 1]
                else:
                    entity_id = None
            except (ValueError, IndexError):
                entity_id = None
        elif "clients" in path_parts:
            entity_type = AuditEntityType.CLIENT
            try:
                client_idx = path_parts.index("clients")
                if client_idx + 1 < len(path_parts):
                    entity_id = path_parts[client_idx + 1]
                else:
                    entity_id = None
            except (ValueError, IndexError):
                entity_id = None
        elif "reviews" in path_parts:
            entity_type = AuditEntityType.REVIEW
            try:
                review_idx = path_parts.index("reviews")
                if review_idx + 1 < len(path_parts):
                    entity_id = path_parts[review_idx + 1]
                else:
                    entity_id = None
            except (ValueError, IndexError):
                entity_id = None
        elif "exceptions" in path_parts:
            entity_type = AuditEntityType.EXCEPTION
            try:
                exception_idx = path_parts.index("exceptions")
                if exception_idx + 1 < len(path_parts):
                    entity_id = path_parts[exception_idx + 1]
                else:
                    entity_id = None
            except (ValueError, IndexError):
                entity_id = None
        elif "documents" in path_parts:
            entity_type = AuditEntityType.DOCUMENT
            try:
                doc_idx = path_parts.index("documents")
                if doc_idx + 1 < len(path_parts):
                    entity_id = path_parts[doc_idx + 1]
                else:
                    entity_id = None
            except (ValueError, IndexError):
                entity_id = None
        else:
            entity_type = AuditEntityType.SYSTEM
            entity_id = None
        
        return entity_type, entity_id
    
    def _create_audit_description(
        self,
        method: str,
        path: str,
        status_code: int,
        user_info: Optional[Dict[str, Any]]
    ) -> str:
        """
        Create human-readable audit description.
        
        Args:
            method: HTTP method
            path: Request path
            status_code: Response status code
            user_info: User information
            
        Returns:
            Audit description string
        """
        user_desc = "Anonymous user"
        if user_info:
            user_desc = f"User {user_info['email']} ({user_info['role']})"
        
        action_desc = f"{method} {path}"
        status_desc = "successfully" if 200 <= status_code < 400 else f"with error {status_code}"
        
        return f"{user_desc} {action_desc} {status_desc}"


class AuditEventLogger:
    """
    Utility class for creating structured audit events with categorization and tagging.
    """
    
    def __init__(self, db: Session):
        """
        Initialize audit event logger.
        
        Args:
            db: Database session
        """
        self.db = db
    
    def log_business_event(
        self,
        user_id: Optional[int],
        event_type: str,
        entity_type: AuditEntityType,
        entity_id: Optional[str],
        action: AuditAction,
        description: str,
        details: Optional[Dict[str, Any]] = None,
        tags: Optional[list] = None,
        category: str = "business"
    ) -> AuditLog:
        """
        Log a business event with categorization and tagging.
        
        Args:
            user_id: User performing the action
            event_type: Type of business event (e.g., "review_submission", "approval")
            entity_type: Type of entity involved
            entity_id: ID of the entity
            action: Audit action
            description: Human-readable description
            details: Additional event details
            tags: Event tags for categorization
            category: Event category
            
        Returns:
            Created audit log entry
        """
        # Prepare enhanced details with categorization
        enhanced_details = details or {}
        enhanced_details.update({
            "event_type": event_type,
            "category": category,
            "tags": tags or [],
            "logged_at": time.time()
        })
        
        # Create audit log
        audit_log = AuditLog.create_audit_log(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            description=description,
            details=enhanced_details
        )
        
        # Save to database
        self.db.add(audit_log)
        self.db.flush()
        
        return audit_log
    
    def log_security_event(
        self,
        user_id: Optional[int],
        event_type: str,
        description: str,
        severity: str = "info",
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        """
        Log a security-related event.
        
        Args:
            user_id: User involved in the event
            event_type: Type of security event
            description: Event description
            severity: Event severity (info, warning, error, critical)
            details: Additional event details
            ip_address: IP address involved
            
        Returns:
            Created audit log entry
        """
        enhanced_details = details or {}
        enhanced_details.update({
            "event_type": event_type,
            "category": "security",
            "severity": severity,
            "tags": ["security", severity],
            "logged_at": time.time()
        })
        
        audit_log = AuditLog.create_audit_log(
            user_id=user_id,
            entity_type=AuditEntityType.SYSTEM,
            entity_id=None,
            action=AuditAction.ACCESS,
            description=description,
            details=enhanced_details,
            ip_address=ip_address
        )
        
        self.db.add(audit_log)
        self.db.flush()
        
        return audit_log
    
    def log_compliance_event(
        self,
        user_id: Optional[int],
        compliance_type: str,
        entity_type: AuditEntityType,
        entity_id: str,
        action: AuditAction,
        description: str,
        regulatory_reference: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """
        Log a compliance-related event.
        
        Args:
            user_id: User performing the action
            compliance_type: Type of compliance event (e.g., "aml_review", "ctf_check")
            entity_type: Type of entity involved
            entity_id: ID of the entity
            action: Audit action
            description: Event description
            regulatory_reference: Reference to regulatory requirement
            details: Additional event details
            
        Returns:
            Created audit log entry
        """
        enhanced_details = details or {}
        enhanced_details.update({
            "event_type": compliance_type,
            "category": "compliance",
            "regulatory_reference": regulatory_reference,
            "tags": ["compliance", compliance_type],
            "logged_at": time.time()
        })
        
        audit_log = AuditLog.create_audit_log(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            description=description,
            details=enhanced_details
        )
        
        self.db.add(audit_log)
        self.db.flush()
        
        return audit_log