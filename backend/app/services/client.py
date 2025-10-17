"""
Client service layer for business logic and database operations.
"""
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc

from app.models.client import Client, RiskLevel, ClientStatus, AMLRiskLevel
from app.models.review import Review, ReviewStatus
from app.schemas.client import ClientCreate, ClientUpdate, ClientSearchFilters
from app.services.audit import AuditService


class ClientService:
    """Service class for client-related operations."""
    
    def __init__(self, db: Session, audit_service: Optional[AuditService] = None):
        """
        Initialize client service.
        
        Args:
            db: Database session
            audit_service: Audit service for logging operations
        """
        self.db = db
        self.audit_service = audit_service or AuditService(db)
        
        # Define valid business units and relationship managers
        self.valid_business_units = [
            "Corporate Banking",
            "Investment Banking", 
            "Private Banking",
            "Retail Banking",
            "Treasury",
            "Trade Finance",
            "Asset Management"
        ]
        
        # In a real system, this would come from a user management system
        self.valid_relationship_managers = [
            "John Smith",
            "Sarah Johnson", 
            "Michael Brown",
            "Emily Davis",
            "David Wilson",
            "Lisa Anderson",
            "Robert Taylor"
        ]
    
    def get_client_by_id(self, client_id: int) -> Optional[Client]:
        """
        Get client by internal database ID.
        
        Args:
            client_id: Internal database ID
            
        Returns:
            Client object or None if not found
        """
        return self.db.query(Client).filter(Client.id == client_id).first()
    
    def get_client_by_client_id(self, client_id: str) -> Optional[Client]:
        """
        Get client by business client ID.
        
        Args:
            client_id: Business client identifier
            
        Returns:
            Client object or None if not found
        """
        return self.db.query(Client).filter(Client.client_id == client_id).first()
    
    def validate_business_unit(self, business_unit: Optional[str]) -> bool:
        """
        Validate business unit against allowed values.
        
        Args:
            business_unit: Business unit to validate
            
        Returns:
            True if valid or None, False otherwise
        """
        if business_unit is None:
            return True
        return business_unit in self.valid_business_units
    
    def validate_relationship_manager(self, relationship_manager: Optional[str]) -> bool:
        """
        Validate relationship manager against allowed values.
        
        Args:
            relationship_manager: Relationship manager to validate
            
        Returns:
            True if valid or None, False otherwise
        """
        if relationship_manager is None:
            return True
        return relationship_manager in self.valid_relationship_managers
    
    def validate_aml_risk_level(self, aml_risk: Optional[AMLRiskLevel]) -> bool:
        """
        Validate AML risk level.
        
        Args:
            aml_risk: AML risk level to validate
            
        Returns:
            True if valid or None, False otherwise
        """
        if aml_risk is None:
            return True
        return isinstance(aml_risk, AMLRiskLevel)
    
    def validate_enhanced_fields(self, client_data) -> None:
        """
        Validate enhanced client fields.
        
        Args:
            client_data: Client data to validate
            
        Raises:
            ValueError: If validation fails
        """
        # Validate business unit
        business_unit = getattr(client_data, 'business_unit', None)
        if not self.validate_business_unit(business_unit):
            raise ValueError(f"Invalid business unit '{business_unit}'. Must be one of: {', '.join(self.valid_business_units)}")
        
        # Validate relationship manager
        relationship_manager = getattr(client_data, 'relationship_manager', None)
        if not self.validate_relationship_manager(relationship_manager):
            raise ValueError(f"Invalid relationship manager '{relationship_manager}'. Must be one of: {', '.join(self.valid_relationship_managers)}")
        
        # Validate AML risk level
        aml_risk = getattr(client_data, 'aml_risk', None)
        if not self.validate_aml_risk_level(aml_risk):
            raise ValueError(f"Invalid AML risk level '{aml_risk}'")
    
    def create_client(self, client_data: ClientCreate, created_by_user_id: int) -> Client:
        """
        Create a new client.
        
        Args:
            client_data: Client creation data
            created_by_user_id: ID of user creating the client
            
        Returns:
            Created client object
            
        Raises:
            ValueError: If client_id already exists or validation fails
        """
        # Check if client_id already exists
        existing_client = self.get_client_by_client_id(client_data.client_id)
        if existing_client:
            raise ValueError(f"Client with ID '{client_data.client_id}' already exists")
        
        # Validate enhanced fields
        self.validate_enhanced_fields(client_data)
        
        # Create new client
        client = Client(**client_data.model_dump())
        self.db.add(client)
        self.db.flush()  # Flush to get the ID
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=created_by_user_id,
            entity_type="Client",
            entity_id=str(client.id),
            action="CREATE",
            details={
                "client_id": client.client_id,
                "name": client.name,
                "risk_level": client.risk_level.value,
                "country": client.country,
                "status": client.status.value,
                "domicile_branch": client.domicile_branch,
                "relationship_manager": client.relationship_manager,
                "business_unit": client.business_unit,
                "aml_risk": client.aml_risk.value if client.aml_risk else None
            }
        )
        
        self.db.commit()
        return client
    
    def update_client(self, client_id: int, client_data: ClientUpdate, updated_by_user_id: int) -> Optional[Client]:
        """
        Update an existing client.
        
        Args:
            client_id: Internal database ID
            client_data: Client update data
            updated_by_user_id: ID of user updating the client
            
        Returns:
            Updated client object or None if not found
            
        Raises:
            ValueError: If validation fails
        """
        client = self.get_client_by_id(client_id)
        if not client:
            return None
        
        # Validate enhanced fields
        self.validate_enhanced_fields(client_data)
        
        # Store original values for audit
        original_values = {
            "name": client.name,
            "risk_level": client.risk_level.value,
            "country": client.country,
            "status": client.status.value,
            "last_review_date": client.last_review_date.isoformat() if client.last_review_date else None,
            "domicile_branch": client.domicile_branch,
            "relationship_manager": client.relationship_manager,
            "business_unit": client.business_unit,
            "aml_risk": client.aml_risk.value if client.aml_risk else None
        }
        
        # Update fields
        update_data = client_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(client, field, value)
        
        # Prepare serializable update data for audit
        serializable_update_data = {}
        for field, value in update_data.items():
            if hasattr(value, 'value'):  # Handle enum values
                serializable_update_data[field] = value.value
            else:
                serializable_update_data[field] = value
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=updated_by_user_id,
            entity_type="Client",
            entity_id=str(client.id),
            action="UPDATE",
            details={
                "client_id": client.client_id,
                "original_values": original_values,
                "updated_values": serializable_update_data
            }
        )
        
        self.db.commit()
        return client
    
    def search_clients(self, filters: ClientSearchFilters) -> Tuple[List[dict], int]:
        """
        Search clients with filtering and pagination, including review counts.
        
        Args:
            filters: Search and filter parameters
            
        Returns:
            Tuple of (clients list with review counts, total count)
        """
        # Build base query with review count subquery and last review date
        review_count_subquery = self.db.query(
            Review.client_id,
            func.count(Review.id).label('review_count'),
            func.max(Review.created_at).label('last_review_date')
        ).group_by(Review.client_id).subquery()
        
        query = self.db.query(
            Client,
            func.coalesce(review_count_subquery.c.review_count, 0).label('review_count'),
            review_count_subquery.c.last_review_date.label('last_review_date')
        ).outerjoin(
            review_count_subquery,
            Client.client_id == review_count_subquery.c.client_id
        )
        
        # Apply filters
        if filters.name:
            query = query.filter(Client.name.ilike(f"%{filters.name}%"))
        
        if filters.risk_level:
            query = query.filter(Client.risk_level == filters.risk_level)
        
        if filters.country:
            query = query.filter(Client.country.ilike(f"%{filters.country}%"))
        
        if filters.status:
            query = query.filter(Client.status == filters.status)
        
        if filters.domicile_branch:
            query = query.filter(Client.domicile_branch.ilike(f"%{filters.domicile_branch}%"))
        
        if filters.relationship_manager:
            query = query.filter(Client.relationship_manager.ilike(f"%{filters.relationship_manager}%"))
        
        if filters.business_unit:
            query = query.filter(Client.business_unit.ilike(f"%{filters.business_unit}%"))
        
        if filters.aml_risk:
            query = query.filter(Client.aml_risk == filters.aml_risk)
        
        if filters.needs_review is not None:
            if filters.needs_review:
                # Filter for clients that need review
                high_risk_threshold = datetime.now().date() - timedelta(days=180)
                standard_threshold = datetime.now().date() - timedelta(days=365)
                
                query = query.filter(
                    or_(
                        and_(
                            Client.risk_level == RiskLevel.HIGH,
                            or_(
                                Client.last_review_date.is_(None),
                                Client.last_review_date < high_risk_threshold
                            )
                        ),
                        and_(
                            Client.risk_level.in_([RiskLevel.MEDIUM, RiskLevel.LOW]),
                            or_(
                                Client.last_review_date.is_(None),
                                Client.last_review_date < standard_threshold
                            )
                        )
                    )
                )
            else:
                # Filter for clients that don't need review
                high_risk_threshold = datetime.now().date() - timedelta(days=180)
                standard_threshold = datetime.now().date() - timedelta(days=365)
                
                query = query.filter(
                    or_(
                        and_(
                            Client.risk_level == RiskLevel.HIGH,
                            Client.last_review_date >= high_risk_threshold
                        ),
                        and_(
                            Client.risk_level.in_([RiskLevel.MEDIUM, RiskLevel.LOW]),
                            Client.last_review_date >= standard_threshold
                        )
                    )
                )
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply sorting
        if filters.sort_by:
            sort_column = getattr(Client, filters.sort_by, None)
            if sort_column:
                if filters.sort_order == "desc":
                    query = query.order_by(desc(sort_column))
                else:
                    query = query.order_by(asc(sort_column))
        
        # Apply pagination
        offset = (filters.page - 1) * filters.per_page
        query = query.offset(offset).limit(filters.per_page)
        
        # Execute query and build result with review counts and last review date
        results = query.all()
        clients_with_counts = []
        
        for client, review_count, last_review_date in results:
            # Create a dictionary with client data, review count, and last review date
            client_dict = {
                'client': client,
                'review_count': review_count,
                'last_review_date': last_review_date
            }
            clients_with_counts.append(client_dict)
        
        return clients_with_counts, total_count
    
    def get_client_detail(self, client_id: int) -> Optional[dict]:
        """
        Get detailed client information including review statistics.
        
        Args:
            client_id: Internal database ID
            
        Returns:
            Dictionary with client details and statistics or None if not found
        """
        client = self.get_client_by_id(client_id)
        if not client:
            return None
        
        # Get review statistics
        review_stats = self.db.query(
            func.count(Review.id).label('total_reviews'),
            func.count(
                func.nullif(Review.status == ReviewStatus.SUBMITTED, False)
            ).label('pending_reviews')
        ).filter(Review.client_id == client.client_id).first()
        
        # Get last review status and date
        last_review = self.db.query(Review).filter(
            Review.client_id == client.client_id
        ).order_by(desc(Review.created_at)).first()
        
        return {
            "client": client,
            "review_count": review_stats.total_reviews or 0,
            "pending_reviews": review_stats.pending_reviews or 0,
            "last_review_status": last_review.status.value if last_review else None
        }
    
    def get_high_risk_clients(self) -> List[Client]:
        """
        Get all high-risk clients.
        
        Returns:
            List of high-risk clients
        """
        return self.db.query(Client).filter(
            Client.risk_level == RiskLevel.HIGH
        ).order_by(Client.name).all()
    
    def get_clients_needing_review(self) -> List[Client]:
        """
        Get all clients that need review based on their last review date.
        
        Returns:
            List of clients needing review
        """
        high_risk_threshold = datetime.now().date() - timedelta(days=180)
        standard_threshold = datetime.now().date() - timedelta(days=365)
        
        return self.db.query(Client).filter(
            or_(
                and_(
                    Client.risk_level == RiskLevel.HIGH,
                    or_(
                        Client.last_review_date.is_(None),
                        Client.last_review_date < high_risk_threshold
                    )
                ),
                and_(
                    Client.risk_level.in_([RiskLevel.MEDIUM, RiskLevel.LOW]),
                    or_(
                        Client.last_review_date.is_(None),
                        Client.last_review_date < standard_threshold
                    )
                )
            )
        ).order_by(Client.name).all()
    
    def delete_client(self, client_id: int, deleted_by_user_id: int) -> bool:
        """
        Delete a client (soft delete by setting status to inactive).
        
        Args:
            client_id: Internal database ID
            deleted_by_user_id: ID of user deleting the client
            
        Returns:
            True if client was deleted, False if not found
        """
        client = self.get_client_by_id(client_id)
        if not client:
            return False
        
        # Soft delete by setting status to inactive
        original_status = client.status.value
        client.status = ClientStatus.INACTIVE
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=deleted_by_user_id,
            entity_type="Client",
            entity_id=str(client.id),
            action="DELETE",
            details={
                "client_id": client.client_id,
                "original_status": original_status,
                "new_status": ClientStatus.INACTIVE.value
            }
        )
        
        self.db.commit()
        return True
    
    def update_aml_risk_level(self, client_id: int, aml_risk: AMLRiskLevel, updated_by_user_id: int) -> Optional[Client]:
        """
        Update a client's AML risk level.
        
        Args:
            client_id: Internal database ID
            aml_risk: New AML risk level
            updated_by_user_id: ID of user updating the risk level
            
        Returns:
            Updated client object or None if not found
        """
        client = self.get_client_by_id(client_id)
        if not client:
            return None
        
        # Store original value for audit
        original_aml_risk = client.aml_risk.value if client.aml_risk else None
        
        # Update AML risk level
        client.aml_risk = aml_risk
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=updated_by_user_id,
            entity_type="Client",
            entity_id=str(client.id),
            action="UPDATE_AML_RISK",
            details={
                "client_id": client.client_id,
                "original_aml_risk": original_aml_risk,
                "new_aml_risk": aml_risk.value
            }
        )
        
        self.db.commit()
        return client
    
    def get_clients_by_aml_risk(self, aml_risk: AMLRiskLevel) -> List[Client]:
        """
        Get all clients with a specific AML risk level.
        
        Args:
            aml_risk: AML risk level to filter by
            
        Returns:
            List of clients with the specified AML risk level
        """
        return self.db.query(Client).filter(
            Client.aml_risk == aml_risk
        ).order_by(Client.name).all()
    
    def get_very_high_aml_risk_clients(self) -> List[Client]:
        """
        Get all clients with very high AML risk.
        
        Returns:
            List of very high AML risk clients
        """
        return self.get_clients_by_aml_risk(AMLRiskLevel.VERY_HIGH)