"""
Application configuration settings using Pydantic for environment variable management.
"""
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator
import os


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Project settings
    PROJECT_NAME: str = "High Risk Client Review Workflow"
    API_V1_STR: str = "/api/v1"
    
    # Database settings
    DATABASE_URL: str = "postgresql://user:password@localhost/hrcrw_db"
    
    # Security settings
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"
    
    # CORS settings
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000"
    
    # Trusted hosts for security
    ALLOWED_HOSTS: str = "localhost,127.0.0.1"
    
    # AWS settings
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: Optional[str] = None
    
    # Email settings (AWS SES)
    SES_FROM_EMAIL: Optional[str] = None
    SES_REPLY_TO_EMAIL: Optional[str] = None
    SES_CONFIGURATION_SET: Optional[str] = None
    
    # Azure AD settings
    AZURE_AD_ENABLED: bool = False
    AZURE_AD_TENANT_ID: Optional[str] = None
    AZURE_AD_CLIENT_ID: Optional[str] = None
    AZURE_AD_CLIENT_SECRET: Optional[str] = None
    AZURE_AD_REDIRECT_URI: Optional[str] = None
    AZURE_AD_AUTHORITY: Optional[str] = None
    AZURE_AD_SCOPES: str = "openid profile email"
    AZURE_AD_GROUP_MAPPING: str = "{}"
    AZURE_AD_AUTO_PROVISION: bool = True
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    def get_cors_origins(self) -> List[str]:
        """Parse CORS origins from string."""
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",")]
    
    def get_allowed_hosts(self) -> List[str]:
        """Parse allowed hosts from string."""
        return [host.strip() for host in self.ALLOWED_HOSTS.split(",")]
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True
    }


# Create global settings instance
settings = Settings()