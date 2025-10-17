"""
User model for authentication and role management.
"""
import enum
import hashlib
import secrets
from sqlalchemy import Column, String, Boolean, Enum
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class UserRole(enum.Enum):
    """User role enumeration for role-based access control."""
    MAKER = "maker"
    CHECKER = "checker" 
    ADMIN = "admin"


class User(BaseModel):
    """
    User model for authentication and authorization.
    
    Attributes:
        name: Full name of the user
        email: Unique email address for login
        hashed_password: Bcrypt hashed password
        role: User role (Maker, Checker, Admin)
        is_active: Whether the user account is active
    """
    __tablename__ = "users"
    
    name = Column(String(100), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # Relationships
    submitted_reviews = relationship("Review", foreign_keys="Review.submitted_by", back_populates="submitter")
    reviewed_reviews = relationship("Review", foreign_keys="Review.reviewed_by", back_populates="reviewer")
    created_exceptions = relationship("ReviewException", foreign_keys="ReviewException.created_by", back_populates="creator")
    resolved_exceptions = relationship("ReviewException", foreign_keys="ReviewException.resolved_by", back_populates="resolver")
    assigned_exceptions = relationship("ReviewException", foreign_keys="ReviewException.assigned_to", back_populates="assignee")
    uploaded_documents = relationship("Document", back_populates="uploader")
    audit_logs = relationship("AuditLog", back_populates="user")
    workflow_history = relationship("WorkflowHistory", back_populates="user")
    
    def __repr__(self):
        """String representation of the User model."""
        return f"<User(id={self.id}, email='{self.email}', role='{self.role.value}')>"
    
    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash a password using PBKDF2 with SHA-256.
        
        Args:
            password: Plain text password
            
        Returns:
            str: Hashed password with salt
        """
        # Generate a random salt
        salt = secrets.token_hex(32)
        # Hash the password with the salt using PBKDF2
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        # Return salt + hash as hex string
        return salt + password_hash.hex()
    
    def verify_password(self, password: str) -> bool:
        """
        Verify a password against the stored hash.
        
        Args:
            password: Plain text password to verify
            
        Returns:
            bool: True if password is correct, False otherwise
        """
        if not self.hashed_password or len(self.hashed_password) < 64:
            return False
        
        # Extract salt (first 64 characters) and hash (remaining characters)
        salt = self.hashed_password[:64]
        stored_hash = self.hashed_password[64:]
        
        # Hash the provided password with the stored salt
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        
        # Compare hashes
        return password_hash.hex() == stored_hash
    
    def set_password(self, password: str) -> None:
        """
        Set a new password for the user.
        
        Args:
            password: Plain text password
        """
        self.hashed_password = self.hash_password(password)
    
    @property
    def is_maker(self) -> bool:
        """Check if user has Maker role."""
        return self.role == UserRole.MAKER
    
    @property
    def is_checker(self) -> bool:
        """Check if user has Checker role."""
        return self.role == UserRole.CHECKER
    
    @property
    def is_admin(self) -> bool:
        """Check if user has Admin role."""
        return self.role == UserRole.ADMIN
    
    def has_role(self, role: UserRole) -> bool:
        """
        Check if user has a specific role.
        
        Args:
            role: Role to check
            
        Returns:
            bool: True if user has the role, False otherwise
        """
        return self.role == role
    
    def can_submit_reviews(self) -> bool:
        """Check if user can submit reviews (Maker role)."""
        return self.is_maker
    
    def can_review_submissions(self) -> bool:
        """Check if user can review submissions (Checker role)."""
        return self.is_checker
    
    def can_manage_users(self) -> bool:
        """Check if user can manage other users (Admin role)."""
        return self.is_admin