"""
Client management API endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user, require_maker_or_checker_role, require_admin_role
from app.models.user import User
from app.models.client import RiskLevel, ClientStatus, AMLRiskLevel
from app.schemas.client import (
    ClientResponse, 
    ClientListResponse, 
    ClientDetailResponse,
    ClientCreate,
    ClientUpdate,
    ClientSearchFilters
)
from app.services.client import ClientService
from app.services.audit import AuditService


router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=ClientListResponse)
async def get_clients(
    name: Optional[str] = Query(None, description="Filter by client name (partial match)"),
    risk_level: Optional[RiskLevel] = Query(None, description="Filter by risk level"),
    country: Optional[str] = Query(None, description="Filter by country"),
    status: Optional[ClientStatus] = Query(None, description="Filter by status"),
    domicile_branch: Optional[str] = Query(None, description="Filter by domicile branch"),
    relationship_manager: Optional[str] = Query(None, description="Filter by relationship manager"),
    business_unit: Optional[str] = Query(None, description="Filter by business unit"),
    aml_risk: Optional[AMLRiskLevel] = Query(None, description="Filter by AML risk level"),
    needs_review: Optional[bool] = Query(None, description="Filter clients that need review"),
    page: int = Query(1, ge=1, description="Page number for pagination"),
    per_page: int = Query(20, ge=1, le=100, description="Number of items per page"),
    sort_by: Optional[str] = Query("name", description="Field to sort by"),
    sort_order: Optional[str] = Query("asc", pattern="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get clients with filtering and pagination.
    
    Accessible by Makers and Checkers for viewing client data.
    Supports filtering by name, risk level, country, status, domicile branch, 
    relationship manager, business unit, AML risk level, and review needs.
    """
    # Create search filters
    filters = ClientSearchFilters(
        name=name,
        risk_level=risk_level,
        country=country,
        status=status,
        domicile_branch=domicile_branch,
        relationship_manager=relationship_manager,
        business_unit=business_unit,
        aml_risk=aml_risk,
        needs_review=needs_review,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    # Get clients using service
    client_service = ClientService(db)
    clients_with_counts, total_count = client_service.search_clients(filters)
    
    # Calculate pagination info
    total_pages = (total_count + per_page - 1) // per_page
    
    # Convert to response models with review counts and last review date
    client_responses = []
    for client_data in clients_with_counts:
        client = client_data['client']
        review_count = client_data['review_count']
        last_review_date = client_data['last_review_date']
        
        # Create response model from client and add computed fields
        client_response = ClientResponse.model_validate(client)
        client_response.review_count = review_count
        # Update last_review_date with computed value if available
        if last_review_date:
            client_response.last_review_date = last_review_date.date()
        client_responses.append(client_response)
    
    return ClientListResponse(
        clients=client_responses,
        total=total_count,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.get("/high-risk", response_model=List[ClientResponse])
async def get_high_risk_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all high-risk clients.
    
    Accessible by Makers and Checkers for compliance monitoring.
    """
    client_service = ClientService(db)
    clients = client_service.get_high_risk_clients()
    
    return [ClientResponse.model_validate(client) for client in clients]


@router.get("/needs-review", response_model=List[ClientResponse])
async def get_clients_needing_review(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all clients that need review based on their last review date.
    
    Accessible by Makers and Checkers for workflow management.
    """
    client_service = ClientService(db)
    clients = client_service.get_clients_needing_review()
    
    return [ClientResponse.model_validate(client) for client in clients]


@router.get("/{client_id}", response_model=ClientDetailResponse)
async def get_client_detail(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed client information including review statistics.
    
    Accessible by Makers and Checkers for detailed client analysis.
    """
    client_service = ClientService(db)
    client_detail = client_service.get_client_detail(client_id)
    
    if not client_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Create response with client data and statistics
    client = client_detail["client"]
    client_response = ClientResponse.model_validate(client)
    
    return ClientDetailResponse(
        **client_response.model_dump(),
        review_count=client_detail["review_count"],
        pending_reviews=client_detail["pending_reviews"],
        last_review_status=client_detail["last_review_status"]
    )


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Create a new client.
    
    Accessible only by Admins for client onboarding.
    """
    try:
        client_service = ClientService(db)
        client = client_service.create_client(client_data, current_user.id)
        
        return ClientResponse.model_validate(client)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{client_id}", response_model=ClientResponse)
@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    client_data: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Update an existing client.
    
    Accessible only by Admins for client data management.
    Supports both PUT and PATCH methods for full and partial updates.
    """
    client_service = ClientService(db)
    client = client_service.update_client(client_id, client_data, current_user.id)
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    return ClientResponse.model_validate(client)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Delete a client (soft delete by setting status to inactive).
    
    Accessible only by Admins for client management.
    """
    client_service = ClientService(db)
    success = client_service.delete_client(client_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )


@router.get("/{client_id}/audit-trail")
async def get_client_audit_trail(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get audit trail for a specific client.
    
    Accessible by Makers and Checkers for compliance tracking.
    """
    # Verify client exists
    client_service = ClientService(db)
    client = client_service.get_client_by_id(client_id)
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Get audit trail
    audit_service = AuditService(db)
    audit_logs = audit_service.get_entity_audit_trail("Client", str(client_id))
    
    return {
        "client_id": client_id,
        "client_business_id": client.client_id,
        "audit_trail": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "action": log.action,
                "timestamp": log.timestamp,
                "details": log.details
            }
            for log in audit_logs
        ]
    }