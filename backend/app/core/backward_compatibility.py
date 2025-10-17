"""
Backward compatibility configuration and utilities.

This module provides configuration and utility functions for maintaining
backward compatibility during the enhanced client review system transition.
"""

import os
from typing import Dict, Any, List, Optional
from pydantic import BaseSettings
import logging

logger = logging.getLogger(__name__)


class BackwardCompatibilitySettings(BaseSettings):
    """Settings for backward compatibility features."""
    
    # Enable/disable legacy support
    enable_legacy_api_support: bool = True
    enable_legacy_document_workflow: bool = True
    enable_legacy_review_format: bool = True
    
    # Legacy client identification
    legacy_client_user_agents: List[str] = [
        "legacy-client",
        "old-review-system",
        "compliance-tool-v1"
    ]
    
    # API version compatibility
    supported_api_versions: List[str] = ["v1", "legacy", "enhanced"]
    default_api_version: str = "enhanced"
    
    # Migration settings
    auto_migrate_legacy_reviews: bool = False
    preserve_legacy_comments: bool = True
    create_migration_backups: bool = True
    
    # Compatibility timeouts and limits
    legacy_api_timeout_seconds: int = 30
    max_legacy_requests_per_minute: int = 100
    
    # Feature flags
    allow_mixed_review_formats: bool = True
    enable_legacy_document_types: bool = True
    support_legacy_client_fields: bool = True
    
    class Config:
        env_prefix = "BACKWARD_COMPATIBILITY_"
        case_sensitive = False


class CompatibilityManager:
    """Manager for backward compatibility operations."""
    
    def __init__(self, settings: Optional[BackwardCompatibilitySettings] = None):
        """
        Initialize compatibility manager.
        
        Args:
            settings: Compatibility settings (defaults to environment-based)
        """
        self.settings = settings or BackwardCompatibilitySettings()
        self._legacy_client_cache = {}
    
    def is_legacy_client(self, user_agent: str, api_version: Optional[str] = None) -> bool:
        """
        Check if a client is using legacy API.
        
        Args:
            user_agent: Client user agent string
            api_version: API version header value
            
        Returns:
            True if legacy client, False otherwise
        """
        if not self.settings.enable_legacy_api_support:
            return False
        
        # Check cache first
        cache_key = f"{user_agent}:{api_version}"
        if cache_key in self._legacy_client_cache:
            return self._legacy_client_cache[cache_key]
        
        # Check user agent patterns
        user_agent_lower = user_agent.lower()
        is_legacy = any(
            pattern in user_agent_lower 
            for pattern in self.settings.legacy_client_user_agents
        )
        
        # Check API version
        if api_version:
            is_legacy = is_legacy or api_version.lower() in ["v1", "legacy"]
        
        # Cache result
        self._legacy_client_cache[cache_key] = is_legacy
        return is_legacy
    
    def get_supported_features_for_client(self, is_legacy: bool) -> Dict[str, bool]:
        """
        Get supported features for a client type.
        
        Args:
            is_legacy: Whether client is legacy
            
        Returns:
            Dictionary of supported features
        """
        if is_legacy:
            return {
                "enhanced_client_fields": self.settings.support_legacy_client_fields,
                "kyc_questionnaire": False,
                "review_exceptions": False,
                "structured_reviews": False,
                "document_linking": self.settings.enable_legacy_document_workflow,
                "legacy_comments": True,
                "mixed_review_formats": self.settings.allow_mixed_review_formats
            }
        else:
            return {
                "enhanced_client_fields": True,
                "kyc_questionnaire": True,
                "review_exceptions": True,
                "structured_reviews": True,
                "document_linking": True,
                "legacy_comments": self.settings.preserve_legacy_comments,
                "mixed_review_formats": self.settings.allow_mixed_review_formats
            }
    
    def transform_client_for_compatibility(self, client_data: Dict[str, Any], 
                                         is_legacy: bool) -> Dict[str, Any]:
        """
        Transform client data for compatibility.
        
        Args:
            client_data: Original client data
            is_legacy: Whether client is legacy
            
        Returns:
            Transformed client data
        """
        if not is_legacy:
            return client_data
        
        # For legacy clients, optionally hide enhanced fields
        if not self.settings.support_legacy_client_fields:
            enhanced_fields = [
                "domicile_branch", "relationship_manager", 
                "business_unit", "aml_risk"
            ]
            
            transformed = client_data.copy()
            for field in enhanced_fields:
                transformed.pop(field, None)
            
            return transformed
        
        return client_data
    
    def transform_review_for_compatibility(self, review_data: Dict[str, Any], 
                                         is_legacy: bool) -> Dict[str, Any]:
        """
        Transform review data for compatibility.
        
        Args:
            review_data: Original review data
            is_legacy: Whether client is legacy
            
        Returns:
            Transformed review data
        """
        if not is_legacy:
            return review_data
        
        transformed = review_data.copy()
        
        # Remove enhanced fields for legacy clients
        enhanced_fields = ["kyc_questionnaire", "exceptions", "enhanced_metadata"]
        for field in enhanced_fields:
            transformed.pop(field, None)
        
        # Convert structured data to legacy comments if needed
        if "kyc_questionnaire" in review_data and review_data["kyc_questionnaire"]:
            kyc_summary = self._create_kyc_legacy_summary(review_data["kyc_questionnaire"])
            current_comments = transformed.get("comments", "")
            
            if current_comments:
                transformed["comments"] = f"{current_comments}\n\n[KYC Summary]\n{kyc_summary}"
            else:
                transformed["comments"] = f"[KYC Summary]\n{kyc_summary}"
        
        # Add exception summary to comments
        if "exceptions" in review_data and review_data["exceptions"]:
            exception_summary = self._create_exception_legacy_summary(review_data["exceptions"])
            current_comments = transformed.get("comments", "")
            
            if current_comments:
                transformed["comments"] = f"{current_comments}\n\n[Exceptions]\n{exception_summary}"
            else:
                transformed["comments"] = f"[Exceptions]\n{exception_summary}"
        
        return transformed
    
    def _create_kyc_legacy_summary(self, kyc_data: Dict[str, Any]) -> str:
        """Create legacy summary of KYC questionnaire."""
        summary_parts = []
        
        if kyc_data.get("purpose_of_account"):
            summary_parts.append(f"Purpose: {kyc_data['purpose_of_account']}")
        
        if kyc_data.get("kyc_documents_complete"):
            summary_parts.append(f"KYC Complete: {kyc_data['kyc_documents_complete']}")
        
        if kyc_data.get("account_purpose_aligned"):
            summary_parts.append(f"Purpose Aligned: {kyc_data['account_purpose_aligned']}")
        
        if kyc_data.get("adverse_media_completed"):
            summary_parts.append(f"Adverse Media: {kyc_data['adverse_media_completed']}")
        
        return " | ".join(summary_parts) if summary_parts else "No KYC details available"
    
    def _create_exception_legacy_summary(self, exceptions: List[Dict[str, Any]]) -> str:
        """Create legacy summary of exceptions."""
        if not exceptions:
            return "No exceptions"
        
        exception_summaries = []
        for exc in exceptions:
            status = exc.get("status", "unknown").upper()
            exc_type = exc.get("exception_type", "unknown").replace("_", " ").title()
            exception_summaries.append(f"[{status}] {exc_type}")
        
        return " | ".join(exception_summaries)
    
    def validate_legacy_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and transform legacy request data.
        
        Args:
            request_data: Legacy request data
            
        Returns:
            Validated and transformed data
        """
        validated_data = request_data.copy()
        
        # Handle legacy field mappings
        field_mappings = {
            "client_reference": "client_id",
            "review_notes": "comments",
            "document_category": "document_type"
        }
        
        for legacy_field, new_field in field_mappings.items():
            if legacy_field in validated_data:
                validated_data[new_field] = validated_data.pop(legacy_field)
        
        # Add compatibility markers
        validated_data["_legacy_request"] = True
        validated_data["_compatibility_version"] = "1.0"
        
        return validated_data
    
    def create_migration_plan(self, legacy_data_count: int) -> Dict[str, Any]:
        """
        Create a migration plan for legacy data.
        
        Args:
            legacy_data_count: Number of legacy records to migrate
            
        Returns:
            Migration plan details
        """
        return {
            "total_records": legacy_data_count,
            "auto_migrate": self.settings.auto_migrate_legacy_reviews,
            "preserve_comments": self.settings.preserve_legacy_comments,
            "create_backups": self.settings.create_migration_backups,
            "estimated_duration_minutes": max(1, legacy_data_count // 100),
            "migration_phases": [
                "Backup existing data",
                "Set client defaults",
                "Preserve document associations",
                "Create compatibility records",
                "Validate migration"
            ],
            "rollback_available": True,
            "compatibility_maintained": True
        }
    
    def get_compatibility_status(self) -> Dict[str, Any]:
        """
        Get current compatibility status.
        
        Returns:
            Compatibility status information
        """
        return {
            "legacy_support_enabled": self.settings.enable_legacy_api_support,
            "legacy_document_workflow": self.settings.enable_legacy_document_workflow,
            "legacy_review_format": self.settings.enable_legacy_review_format,
            "supported_api_versions": self.settings.supported_api_versions,
            "default_api_version": self.settings.default_api_version,
            "mixed_formats_allowed": self.settings.allow_mixed_review_formats,
            "auto_migration_enabled": self.settings.auto_migrate_legacy_reviews,
            "cache_size": len(self._legacy_client_cache)
        }


# Global compatibility manager instance
_compatibility_manager = None


def get_compatibility_manager() -> CompatibilityManager:
    """
    Get the global compatibility manager instance.
    
    Returns:
        CompatibilityManager instance
    """
    global _compatibility_manager
    if _compatibility_manager is None:
        _compatibility_manager = CompatibilityManager()
    return _compatibility_manager


def is_legacy_client_request(user_agent: str, api_version: Optional[str] = None) -> bool:
    """
    Convenience function to check if request is from legacy client.
    
    Args:
        user_agent: Client user agent
        api_version: API version header
        
    Returns:
        True if legacy client
    """
    manager = get_compatibility_manager()
    return manager.is_legacy_client(user_agent, api_version)


def transform_for_legacy_client(data: Dict[str, Any], data_type: str) -> Dict[str, Any]:
    """
    Convenience function to transform data for legacy clients.
    
    Args:
        data: Data to transform
        data_type: Type of data ("client" or "review")
        
    Returns:
        Transformed data
    """
    manager = get_compatibility_manager()
    
    if data_type == "client":
        return manager.transform_client_for_compatibility(data, is_legacy=True)
    elif data_type == "review":
        return manager.transform_review_for_compatibility(data, is_legacy=True)
    
    return data