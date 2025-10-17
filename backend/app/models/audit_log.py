"""
AuditLog model for comprehensive compliance tracking.
"""
import enum
import json
from datetime import datetime
from sqlalchemy import Column, String, Text, Enum, ForeignKey, Integer, DateTime, Index, JSON
from sqlalchemy.orm import relationship
from typing import Optional, List, Dict, Any

from app.models.base import BaseModel


class AuditAction(enum.Enum):
    """Audit action enumeration for categorizing audit events."""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    SUBMIT = "submit"
    APPROVE = "approve"
    REJECT = "reject"
    ASSIGN = "assign"
    RESOLVE = "resolve"
    UPLOAD = "upload"
    DOWNLOAD = "download"
    ACCESS = "access"
    EXPORT = "export"
    ARCHIVE = "archive"
    RESTORE = "restore"


class AuditEntityType(enum.Enum):
    """Entity type enumeration for audit tracking."""
    USER = "USER"
    CLIENT = "CLIENT"
    REVIEW = "REVIEW"
    EXCEPTION = "EXCEPTION"
    DOCUMENT = "DOCUMENT"
    SYSTEM = "SYSTEM"


class AuditLog(BaseModel):
    """
    AuditLog model for comprehensive compliance and activity tracking.
    
    Attributes:
        user_id: Foreign key to User model (who performed the action)
        entity_type: Type of entity being audited
        entity_id: ID of the specific entity
        action: Action that was performed
        description: Human-readable description of the action
        details: JSON field for storing detailed audit information
        ip_address: IP address of the user performing the action
        user_agent: User agent string from the request
        session_id: Session ID for tracking user sessions
        success: Whether the action was successful
        error_message: Error message if action failed
    """
    __tablename__ = "audit_logs"
    
    # Foreign key relationships
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Nullable for system actions
    
    # Audit details
    entity_type = Column(Enum(AuditEntityType), nullable=False, index=True)
    entity_id = Column(String(50), nullable=True, index=True)  # Can be null for system-wide actions
    action = Column(Enum(AuditAction), nullable=False, index=True)
    description = Column(Text, nullable=False)
    
    # Detailed information stored as JSON
    details = Column(JSON, nullable=True)
    
    # Request context
    ip_address = Column(String(45), nullable=True, index=True)  # IPv6 can be up to 45 chars
    user_agent = Column(Text, nullable=True)
    session_id = Column(String(255), nullable=True, index=True)
    
    # Result tracking
    success = Column(String(10), default="true", nullable=False, index=True)  # Using string for consistency
    error_message = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    # Create composite indexes for common query patterns
    __table_args__ = (
        Index('idx_audit_user_action', 'user_id', 'action'),
        Index('idx_audit_entity_action', 'entity_type', 'entity_id', 'action'),
        Index('idx_audit_timestamp_action', 'created_at', 'action'),
        Index('idx_audit_success_timestamp', 'success', 'created_at'),
        Index('idx_audit_ip_timestamp', 'ip_address', 'created_at'),
    )
    
    def __repr__(self):
        """String representation of the AuditLog model."""
        return f"<AuditLog(id={self.id}, user_id={self.user_id}, action='{self.action.value}', entity='{self.entity_type.value}')>"
    
    @property
    def is_successful(self) -> bool:
        """Check if the audited action was successful."""
        return self.success == "true" or self.success is None  # Default to successful
    
    @property
    def is_failed(self) -> bool:
        """Check if the audited action failed."""
        return self.success == "false"
    
    @property
    def is_user_action(self) -> bool:
        """Check if this is a user-initiated action."""
        return self.user_id is not None
    
    @property
    def is_system_action(self) -> bool:
        """Check if this is a system-initiated action."""
        return self.user_id is None
    
    def set_success(self) -> None:
        """Mark the audit log as successful."""
        self.success = "true"
        self.error_message = None
    
    def set_failure(self, error_message: str) -> None:
        """
        Mark the audit log as failed.
        
        Args:
            error_message: Description of the error
        """
        self.success = "false"
        self.error_message = error_message
    
    def add_detail(self, key: str, value: Any) -> None:
        """
        Add a detail to the audit log.
        
        Args:
            key: Detail key
            value: Detail value
        """
        if self.details is None:
            self.details = {}
        self.details[key] = value
    
    def get_detail(self, key: str, default: Any = None) -> Any:
        """
        Get a detail from the audit log.
        
        Args:
            key: Detail key
            default: Default value if key not found
            
        Returns:
            Detail value or default
        """
        if self.details is None:
            return default
        return self.details.get(key, default)
    
    def set_request_context(self, ip_address: Optional[str] = None, 
                           user_agent: Optional[str] = None, 
                           session_id: Optional[str] = None) -> None:
        """
        Set request context information.
        
        Args:
            ip_address: Client IP address
            user_agent: Client user agent
            session_id: Session ID
        """
        if ip_address:
            self.ip_address = ip_address
        if user_agent:
            self.user_agent = user_agent
        if session_id:
            self.session_id = session_id
    
    @classmethod
    def create_audit_log(cls, 
                        user_id: Optional[int],
                        entity_type: AuditEntityType,
                        entity_id: Optional[str],
                        action: AuditAction,
                        description: str,
                        details: Optional[Dict[str, Any]] = None,
                        ip_address: Optional[str] = None,
                        user_agent: Optional[str] = None,
                        session_id: Optional[str] = None) -> 'AuditLog':
        """
        Create a new audit log entry.
        
        Args:
            user_id: ID of the user performing the action
            entity_type: Type of entity being audited
            entity_id: ID of the specific entity
            action: Action being performed
            description: Human-readable description
            details: Additional details as dictionary
            ip_address: Client IP address
            user_agent: Client user agent
            session_id: Session ID
            
        Returns:
            New AuditLog instance
        """
        audit_log = cls(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            description=description,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id
        )
        return audit_log
    
    @classmethod
    def log_user_action(cls, 
                       user_id: int,
                       action: AuditAction,
                       description: str,
                       entity_type: Optional[AuditEntityType] = None,
                       entity_id: Optional[str] = None,
                       details: Optional[Dict[str, Any]] = None) -> 'AuditLog':
        """
        Create an audit log for a user action.
        
        Args:
            user_id: ID of the user performing the action
            action: Action being performed
            description: Human-readable description
            entity_type: Type of entity (optional)
            entity_id: ID of the entity (optional)
            details: Additional details
            
        Returns:
            New AuditLog instance
        """
        return cls.create_audit_log(
            user_id=user_id,
            entity_type=entity_type or AuditEntityType.USER,
            entity_id=entity_id or str(user_id),
            action=action,
            description=description,
            details=details
        )
    
    @classmethod
    def log_system_action(cls,
                         action: AuditAction,
                         description: str,
                         entity_type: Optional[AuditEntityType] = None,
                         entity_id: Optional[str] = None,
                         details: Optional[Dict[str, Any]] = None) -> 'AuditLog':
        """
        Create an audit log for a system action.
        
        Args:
            action: Action being performed
            description: Human-readable description
            entity_type: Type of entity (optional)
            entity_id: ID of the entity (optional)
            details: Additional details
            
        Returns:
            New AuditLog instance
        """
        return cls.create_audit_log(
            user_id=None,
            entity_type=entity_type or AuditEntityType.SYSTEM,
            entity_id=entity_id,
            action=action,
            description=description,
            details=details
        )
    
    @classmethod
    def get_audit_logs_by_user(cls, db_session, user_id: int, limit: int = 100) -> List['AuditLog']:
        """
        Get audit logs for a specific user.
        
        Args:
            db_session: Database session
            user_id: User ID
            limit: Maximum number of logs to return
            
        Returns:
            List of audit logs for the user
        """
        return db_session.query(cls).filter(
            cls.user_id == user_id
        ).order_by(cls.created_at.desc()).limit(limit).all()
    
    @classmethod
    def get_audit_logs_by_entity(cls, db_session, 
                                entity_type: AuditEntityType, 
                                entity_id: str, 
                                limit: int = 100) -> List['AuditLog']:
        """
        Get audit logs for a specific entity.
        
        Args:
            db_session: Database session
            entity_type: Type of entity
            entity_id: ID of the entity
            limit: Maximum number of logs to return
            
        Returns:
            List of audit logs for the entity
        """
        return db_session.query(cls).filter(
            cls.entity_type == entity_type,
            cls.entity_id == entity_id
        ).order_by(cls.created_at.desc()).limit(limit).all()
    
    @classmethod
    def get_audit_logs_by_action(cls, db_session, 
                                action: AuditAction, 
                                limit: int = 100) -> List['AuditLog']:
        """
        Get audit logs for a specific action.
        
        Args:
            db_session: Database session
            action: Action to filter by
            limit: Maximum number of logs to return
            
        Returns:
            List of audit logs for the action
        """
        return db_session.query(cls).filter(
            cls.action == action
        ).order_by(cls.created_at.desc()).limit(limit).all()
    
    @classmethod
    def get_failed_actions(cls, db_session, limit: int = 100) -> List['AuditLog']:
        """
        Get all failed audit logs.
        
        Args:
            db_session: Database session
            limit: Maximum number of logs to return
            
        Returns:
            List of failed audit logs
        """
        return db_session.query(cls).filter(
            cls.success == "false"
        ).order_by(cls.created_at.desc()).limit(limit).all()
    
    @classmethod
    def search_audit_logs(cls, db_session,
                         user_id: Optional[int] = None,
                         entity_type: Optional[AuditEntityType] = None,
                         entity_id: Optional[str] = None,
                         action: Optional[AuditAction] = None,
                         success_filter: Optional[bool] = None,
                         start_date: Optional[datetime] = None,
                         end_date: Optional[datetime] = None,
                         limit: int = 100) -> List['AuditLog']:
        """
        Search audit logs with various filters.
        
        Args:
            db_session: Database session
            user_id: Filter by user ID
            entity_type: Filter by entity type
            entity_id: Filter by entity ID
            action: Filter by action
            success_filter: Filter by success status
            start_date: Filter by start date
            end_date: Filter by end date
            limit: Maximum number of logs to return
            
        Returns:
            List of matching audit logs
        """
        query = db_session.query(cls)
        
        if user_id is not None:
            query = query.filter(cls.user_id == user_id)
        
        if entity_type is not None:
            query = query.filter(cls.entity_type == entity_type)
        
        if entity_id is not None:
            query = query.filter(cls.entity_id == entity_id)
        
        if action is not None:
            query = query.filter(cls.action == action)
        
        if success_filter is not None:
            success_value = "true" if success_filter else "false"
            query = query.filter(cls.success == success_value)
        
        if start_date is not None:
            query = query.filter(cls.created_at >= start_date)
        
        if end_date is not None:
            query = query.filter(cls.created_at <= end_date)
        
        return query.order_by(cls.created_at.desc()).limit(limit).all()