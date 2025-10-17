"""
Pydantic schemas for client data validation and serialization.
"""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator

from app.models.client import RiskLevel, ClientStatus, AMLRiskLevel


class ClientBase(BaseModel):
    """Base client schema with common fields."""
    client_id: str = Field(..., min_length=1, max_length=50, description="Unique client identifier")
    name: str = Field(..., min_length=1, max_length=255, description="Client name or company name")
    risk_level: RiskLevel = Field(..., description="Risk classification level")
    country: str = Field(..., min_length=1, max_length=100, description="Country of operation")
    status: ClientStatus = Field(default=ClientStatus.ACTIVE, description="Current client status")
    domicile_branch: Optional[str] = Field(None, max_length=100, description="Branch where client is domiciled")
    relationship_manager: Optional[str] = Field(None, max_length=100, description="Assigned relationship manager")
    business_unit: Optional[str] = Field(None, max_length=100, description="Business unit classification")
    aml_risk: Optional[AMLRiskLevel] = Field(None, description="AML risk level assessment")
    
    # Auto-review flags
    auto_kyc_review: bool = Field(default=False, description="Enable automatic KYC reviews")
    auto_aml_review: bool = Field(default=False, description="Enable automatic AML reviews")
    auto_sanctions_review: bool = Field(default=False, description="Enable automatic sanctions reviews")
    auto_pep_review: bool = Field(default=False, description="Enable automatic PEP reviews")
    auto_financial_review: bool = Field(default=False, description="Enable automatic financial reviews")
    
    @field_validator('domicile_branch', 'relationship_manager', 'business_unit')
    @classmethod
    def validate_optional_strings(cls, v):
        """Validate optional string fields are not empty if provided."""
        if v is not None and v.strip() == "":
            raise ValueError("Field cannot be empty string")
        return v.strip() if v else v


class ClientCreate(ClientBase):
    """Schema for creating a new client."""
    last_review_date: Optional[date] = Field(None, description="Date of last compliance review")


class ClientUpdate(BaseModel):
    """Schema for updating client information."""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Client name")
    risk_level: Optional[RiskLevel] = Field(None, description="Risk classification level")
    country: Optional[str] = Field(None, min_length=1, max_length=100, description="Country of operation")
    status: Optional[ClientStatus] = Field(None, description="Current client status")
    last_review_date: Optional[date] = Field(None, description="Date of last compliance review")
    domicile_branch: Optional[str] = Field(None, max_length=100, description="Branch where client is domiciled")
    relationship_manager: Optional[str] = Field(None, max_length=100, description="Assigned relationship manager")
    business_unit: Optional[str] = Field(None, max_length=100, description="Business unit classification")
    aml_risk: Optional[AMLRiskLevel] = Field(None, description="AML risk level assessment")
    
    # Auto-review flags
    auto_kyc_review: Optional[bool] = Field(None, description="Enable automatic KYC reviews")
    auto_aml_review: Optional[bool] = Field(None, description="Enable automatic AML reviews")
    auto_sanctions_review: Optional[bool] = Field(None, description="Enable automatic sanctions reviews")
    auto_pep_review: Optional[bool] = Field(None, description="Enable automatic PEP reviews")
    auto_financial_review: Optional[bool] = Field(None, description="Enable automatic financial reviews")
    
    @field_validator('domicile_branch', 'relationship_manager', 'business_unit')
    @classmethod
    def validate_optional_strings(cls, v):
        """Validate optional string fields are not empty if provided."""
        if v is not None and v.strip() == "":
            raise ValueError("Field cannot be empty string")
        return v.strip() if v else v


class ClientResponse(ClientBase):
    """Schema for client response data."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="Internal database ID")
    last_review_date: Optional[date] = Field(None, description="Date of most recent review creation")
    created_at: datetime = Field(..., description="Date when client was last updated")
    updated_at: datetime = Field(..., description="Date when client was last updated")
    
    # Review statistics
    review_count: int = Field(default=0, description="Total number of reviews for this client")
    
    # Computed properties
    is_high_risk: bool = Field(..., description="Whether client is classified as high risk")
    is_active: bool = Field(..., description="Whether client is currently active")
    needs_review: bool = Field(..., description="Whether client needs a compliance review")
    is_very_high_aml_risk: bool = Field(..., description="Whether client is classified as very high AML risk")
    has_auto_review_flags: bool = Field(..., description="Whether client has any auto-review flags enabled")
    enabled_auto_review_types: List[str] = Field(..., description="List of enabled auto-review types")


class ClientListResponse(BaseModel):
    """Schema for paginated client list response."""
    clients: List[ClientResponse] = Field(..., description="List of clients")
    total: int = Field(..., description="Total number of clients matching filters")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")


class ClientSearchFilters(BaseModel):
    """Schema for client search and filtering parameters."""
    name: Optional[str] = Field(None, description="Filter by client name (partial match)")
    risk_level: Optional[RiskLevel] = Field(None, description="Filter by risk level")
    country: Optional[str] = Field(None, description="Filter by country")
    status: Optional[ClientStatus] = Field(None, description="Filter by status")
    domicile_branch: Optional[str] = Field(None, description="Filter by domicile branch")
    relationship_manager: Optional[str] = Field(None, description="Filter by relationship manager")
    business_unit: Optional[str] = Field(None, description="Filter by business unit")
    aml_risk: Optional[AMLRiskLevel] = Field(None, description="Filter by AML risk level")
    needs_review: Optional[bool] = Field(None, description="Filter clients that need review")
    page: int = Field(1, ge=1, description="Page number for pagination")
    per_page: int = Field(20, ge=1, le=100, description="Number of items per page")
    sort_by: Optional[str] = Field("name", description="Field to sort by")
    sort_order: Optional[str] = Field("asc", pattern="^(asc|desc)$", description="Sort order")


class ClientDetailResponse(ClientResponse):
    """Schema for detailed client information including related data."""
    review_count: int = Field(..., description="Total number of reviews for this client")
    last_review_status: Optional[str] = Field(None, description="Status of the most recent review")
    pending_reviews: int = Field(..., description="Number of pending reviews")