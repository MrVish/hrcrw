"""
Client model for high-risk client data management.
"""
import enum
from datetime import date
from sqlalchemy import Column, String, Enum, Date, Boolean, Index
from sqlalchemy.orm import relationship
from typing import List, Optional

from app.models.base import BaseModel


class RiskLevel(enum.Enum):
    """Risk level enumeration for client classification."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class AMLRiskLevel(enum.Enum):
    """AML risk level enumeration for enhanced client classification."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


class ClientStatus(enum.Enum):
    """Client status enumeration for tracking client state."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    UNDER_REVIEW = "under_review"


class Client(BaseModel):
    """
    Client model for managing high-risk client information.
    
    Attributes:
        client_id: Unique client identifier (business key)
        name: Client name or company name
        risk_level: Risk classification (Low, Medium, High)
        country: Country of operation or registration
        status: Current client status
        last_review_date: Date of last compliance review
        domicile_branch: Branch where client is domiciled
        relationship_manager: Assigned relationship manager
        business_unit: Business unit classification
        aml_risk: AML risk level assessment
    """
    __tablename__ = "clients"
    
    client_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    risk_level = Column(Enum(RiskLevel), nullable=False, index=True)
    country = Column(String(100), nullable=False, index=True)
    status = Column(Enum(ClientStatus), default=ClientStatus.ACTIVE, nullable=False, index=True)
    last_review_date = Column(Date, nullable=True, index=True)
    
    # Enhanced client fields
    domicile_branch = Column(String(100), nullable=True, index=True)
    relationship_manager = Column(String(100), nullable=True, index=True)
    business_unit = Column(String(100), nullable=True, index=True)
    aml_risk = Column(Enum(AMLRiskLevel), nullable=True, index=True)
    
    # Auto-review flags for high-risk clients
    auto_kyc_review = Column(Boolean, nullable=False, default=False, index=True)
    auto_aml_review = Column(Boolean, nullable=False, default=False, index=True)
    auto_sanctions_review = Column(Boolean, nullable=False, default=False, index=True)
    auto_pep_review = Column(Boolean, nullable=False, default=False, index=True)
    auto_financial_review = Column(Boolean, nullable=False, default=False, index=True)
    
    # Relationships
    reviews = relationship("Review", back_populates="client", cascade="all, delete-orphan")
    
    # Create composite indexes for common query patterns
    __table_args__ = (
        Index('idx_client_risk_country', 'risk_level', 'country'),
        Index('idx_client_status_risk', 'status', 'risk_level'),
        Index('idx_client_review_date', 'last_review_date'),
        Index('idx_client_aml_risk', 'aml_risk'),
        Index('idx_client_business_unit', 'business_unit'),
        Index('idx_client_relationship_manager', 'relationship_manager'),
        # Auto-review flag indexes
        Index('idx_client_risk_auto_kyc', 'risk_level', 'auto_kyc_review'),
        Index('idx_client_risk_auto_aml', 'risk_level', 'auto_aml_review'),
        Index('idx_client_risk_auto_sanctions', 'risk_level', 'auto_sanctions_review'),
        Index('idx_client_risk_auto_pep', 'risk_level', 'auto_pep_review'),
        Index('idx_client_risk_auto_financial', 'risk_level', 'auto_financial_review'),
    )
    
    def __repr__(self):
        """String representation of the Client model."""
        return f"<Client(id={self.id}, client_id='{self.client_id}', name='{self.name}', risk='{self.risk_level.value}')>"
    
    @property
    def is_high_risk(self) -> bool:
        """Check if client is classified as high risk."""
        return self.risk_level == RiskLevel.HIGH
    
    @property
    def is_active(self) -> bool:
        """Check if client is currently active."""
        return self.status == ClientStatus.ACTIVE
    
    @property
    def needs_review(self) -> bool:
        """
        Check if client needs a compliance review.
        High-risk clients should be reviewed more frequently.
        """
        if not self.last_review_date:
            return True
        
        from datetime import datetime, timedelta
        
        # High-risk clients need review every 6 months
        if self.is_high_risk:
            review_threshold = datetime.now().date() - timedelta(days=180)
        else:
            # Medium/Low risk clients need review every 12 months
            review_threshold = datetime.now().date() - timedelta(days=365)
        
        return self.last_review_date < review_threshold
    
    def update_review_date(self, review_date: Optional[date] = None) -> None:
        """
        Update the last review date.
        
        Args:
            review_date: Date of review (defaults to today)
        """
        if review_date is None:
            from datetime import datetime
            review_date = datetime.now().date()
        
        self.last_review_date = review_date
    
    def set_risk_level(self, risk_level: RiskLevel) -> None:
        """
        Set the client's risk level.
        
        Args:
            risk_level: New risk level
        """
        self.risk_level = risk_level
    
    def set_aml_risk_level(self, aml_risk: AMLRiskLevel) -> None:
        """
        Set the client's AML risk level.
        
        Args:
            aml_risk: New AML risk level
        """
        self.aml_risk = aml_risk
    
    @property
    def is_very_high_aml_risk(self) -> bool:
        """Check if client is classified as very high AML risk."""
        return self.aml_risk == AMLRiskLevel.VERY_HIGH if self.aml_risk else False
    
    @property
    def has_auto_review_flags(self) -> bool:
        """Check if client has any auto-review flags enabled."""
        return any([
            self.auto_kyc_review,
            self.auto_aml_review,
            self.auto_sanctions_review,
            self.auto_pep_review,
            self.auto_financial_review
        ])
    
    @property
    def enabled_auto_review_types(self) -> List[str]:
        """Get list of enabled auto-review types."""
        enabled_types = []
        if self.auto_kyc_review:
            enabled_types.append('kyc')
        if self.auto_aml_review:
            enabled_types.append('aml')
        if self.auto_sanctions_review:
            enabled_types.append('sanctions')
        if self.auto_pep_review:
            enabled_types.append('pep')
        if self.auto_financial_review:
            enabled_types.append('financial')
        return enabled_types
    
    def activate(self) -> None:
        """Activate the client."""
        self.status = ClientStatus.ACTIVE
    
    def deactivate(self) -> None:
        """Deactivate the client."""
        self.status = ClientStatus.INACTIVE
    
    def suspend(self) -> None:
        """Suspend the client."""
        self.status = ClientStatus.SUSPENDED
    
    def mark_under_review(self) -> None:
        """Mark client as under review."""
        self.status = ClientStatus.UNDER_REVIEW
    
    def set_auto_review_flags(self, 
                             kyc: bool = False,
                             aml: bool = False,
                             sanctions: bool = False,
                             pep: bool = False,
                             financial: bool = False) -> None:
        """
        Set auto-review flags for the client.
        
        Args:
            kyc: Enable auto KYC reviews
            aml: Enable auto AML reviews
            sanctions: Enable auto sanctions reviews
            pep: Enable auto PEP reviews
            financial: Enable auto financial reviews
        """
        self.auto_kyc_review = kyc
        self.auto_aml_review = aml
        self.auto_sanctions_review = sanctions
        self.auto_pep_review = pep
        self.auto_financial_review = financial
    
    @classmethod
    def get_high_risk_clients(cls, db_session) -> List['Client']:
        """
        Get all high-risk clients.
        
        Args:
            db_session: Database session
            
        Returns:
            List of high-risk clients
        """
        return db_session.query(cls).filter(cls.risk_level == RiskLevel.HIGH).all()
    
    @classmethod
    def get_high_risk_clients_with_auto_reviews(cls, db_session) -> List['Client']:
        """
        Get all high-risk clients with auto-review flags enabled.
        
        Args:
            db_session: Database session
            
        Returns:
            List of high-risk clients with auto-review flags
        """
        return db_session.query(cls).filter(
            cls.risk_level == RiskLevel.HIGH,
            (cls.auto_kyc_review == True) |
            (cls.auto_aml_review == True) |
            (cls.auto_sanctions_review == True) |
            (cls.auto_pep_review == True) |
            (cls.auto_financial_review == True)
        ).all()
    
    @classmethod
    def get_clients_needing_review(cls, db_session) -> List['Client']:
        """
        Get all clients that need review based on their last review date.
        
        Args:
            db_session: Database session
            
        Returns:
            List of clients needing review
        """
        from datetime import datetime, timedelta
        
        # Calculate thresholds
        high_risk_threshold = datetime.now().date() - timedelta(days=180)
        standard_threshold = datetime.now().date() - timedelta(days=365)
        
        # Query for clients needing review
        return db_session.query(cls).filter(
            (
                (cls.risk_level == RiskLevel.HIGH) & 
                ((cls.last_review_date.is_(None)) | (cls.last_review_date < high_risk_threshold))
            ) |
            (
                (cls.risk_level.in_([RiskLevel.MEDIUM, RiskLevel.LOW])) & 
                ((cls.last_review_date.is_(None)) | (cls.last_review_date < standard_threshold))
            )
        ).all()
    
    @classmethod
    def search_clients(cls, db_session, 
                      name_filter: Optional[str] = None,
                      risk_level_filter: Optional[RiskLevel] = None,
                      country_filter: Optional[str] = None,
                      status_filter: Optional[ClientStatus] = None,
                      domicile_branch_filter: Optional[str] = None,
                      relationship_manager_filter: Optional[str] = None,
                      business_unit_filter: Optional[str] = None,
                      aml_risk_filter: Optional[AMLRiskLevel] = None) -> List['Client']:
        """
        Search clients with various filters.
        
        Args:
            db_session: Database session
            name_filter: Filter by client name (partial match)
            risk_level_filter: Filter by risk level
            country_filter: Filter by country
            status_filter: Filter by status
            domicile_branch_filter: Filter by domicile branch
            relationship_manager_filter: Filter by relationship manager
            business_unit_filter: Filter by business unit
            aml_risk_filter: Filter by AML risk level
            
        Returns:
            List of matching clients
        """
        query = db_session.query(cls)
        
        if name_filter:
            query = query.filter(cls.name.ilike(f"%{name_filter}%"))
        
        if risk_level_filter:
            query = query.filter(cls.risk_level == risk_level_filter)
        
        if country_filter:
            query = query.filter(cls.country.ilike(f"%{country_filter}%"))
        
        if status_filter:
            query = query.filter(cls.status == status_filter)
        
        if domicile_branch_filter:
            query = query.filter(cls.domicile_branch.ilike(f"%{domicile_branch_filter}%"))
        
        if relationship_manager_filter:
            query = query.filter(cls.relationship_manager.ilike(f"%{relationship_manager_filter}%"))
        
        if business_unit_filter:
            query = query.filter(cls.business_unit.ilike(f"%{business_unit_filter}%"))
        
        if aml_risk_filter:
            query = query.filter(cls.aml_risk == aml_risk_filter)
        
        return query.order_by(cls.name).all()