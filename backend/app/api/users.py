"""
User management API endpoints for admin operations.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.core.database import get_db
from app.core.auth import (
    get_current_user,
    require_admin_role,
    require_maker_or_checker_role,
    get_password_hash
)
from app.models.user import User, UserRole
from app.schemas.user import (
    UserResponse,
    UserListResponse,
    UserCreateRequest,
    UserUpdateRequest,
    UserRoleUpdateRequest,
    UserStatsResponse
)
from app.services.audit import AuditService


# Create a fresh router instance
from fastapi import APIRouter as FreshAPIRouter
router = FreshAPIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserListResponse)
async def get_users(
    page: int = Query(1, ge=1, description="Page number for pagination"),
    per_page: int = Query(50, ge=1, le=200, description="Number of items per page"),
    role: Optional[UserRole] = Query(None, description="Filter by user role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Get list of users with filtering and pagination.
    
    Accessible only by Admins for user management.
    """
    query = db.query(User)
    
    # Apply filters
    if role:
        query = query.filter(User.role == role)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.name.ilike(search_term)) | 
            (User.email.ilike(search_term))
        )
    
    # Get total count
    total_count = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    users = query.offset(offset).limit(per_page).all()
    
    # Calculate pagination info
    total_pages = (total_count + per_page - 1) // per_page
    
    # Convert to response format
    user_responses = []
    for user in users:
        user_responses.append(UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at
        ))
    
    return UserListResponse(
        users=user_responses,
        total=total_count,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.get("/statistics", response_model=UserStatsResponse)
async def get_user_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Get user statistics for admin dashboard.
    
    Accessible only by Admins for system monitoring.
    """
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    inactive_users = total_users - active_users
    
    # Count by role
    role_counts = {}
    for role in UserRole:
        count = db.query(func.count(User.id)).filter(User.role == role).scalar() or 0
        role_counts[role.value] = count
    
    # Recent registrations (last 30 days)
    from datetime import datetime, timedelta
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_registrations = db.query(func.count(User.id)).filter(
        User.created_at >= thirty_days_ago
    ).scalar() or 0
    
    return UserStatsResponse(
        total_users=total_users,
        active_users=active_users,
        inactive_users=inactive_users,
        role_counts=role_counts,
        recent_registrations=recent_registrations
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Create a new user.
    
    Accessible only by Admins for user management.
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash the password
    hashed_password = get_password_hash(user_data.password)
    
    # Create new user
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role,
        is_active=user_data.is_active
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Log the creation
    audit_service = AuditService(db)
    audit_service.log_action(
        user_id=current_user.id,
        entity_type="User",
        entity_id=str(new_user.id),
        action="CREATE",
        details={
            "created_user_name": new_user.name,
            "created_user_email": new_user.email,
            "created_user_role": new_user.role.value,
            "created_by_admin": current_user.name
        }
    )
    
    return UserResponse(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        role=new_user.role,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        updated_at=new_user.updated_at
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Get user details by ID.
    
    Accessible only by Admins for user management.
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Update user information.
    
    Accessible only by Admins for user management.
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from deactivating themselves
    if user_id == current_user.id and user_data.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    # Store previous values for audit
    previous_values = {
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "is_active": user.is_active
    }
    
    # Check if email is being changed and if it already exists
    if user_data.email and user_data.email != user.email:
        existing_user = db.query(User).filter(
            User.email == user_data.email,
            User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Update fields
    changes = {}
    if user_data.name is not None:
        changes["name"] = {"from": user.name, "to": user_data.name}
        user.name = user_data.name
    
    if user_data.email is not None:
        changes["email"] = {"from": user.email, "to": user_data.email}
        user.email = user_data.email
    
    if user_data.role is not None:
        changes["role"] = {"from": user.role.value, "to": user_data.role.value}
        user.role = user_data.role
    
    if user_data.is_active is not None:
        changes["is_active"] = {"from": user.is_active, "to": user_data.is_active}
        user.is_active = user_data.is_active
    
    # Update password if provided
    if user_data.password:
        user.hashed_password = get_password_hash(user_data.password)
        changes["password"] = {"from": "[HIDDEN]", "to": "[UPDATED]"}
    
    db.commit()
    db.refresh(user)
    
    # Log the update
    audit_service = AuditService(db)
    audit_service.log_action(
        user_id=current_user.id,
        entity_type="User",
        entity_id=str(user.id),
        action="UPDATE",
        details={
            "updated_user_name": user.name,
            "updated_user_email": user.email,
            "changes": changes,
            "previous_values": previous_values,
            "updated_by_admin": current_user.name
        }
    )
    
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    role_data: UserRoleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Update user role.
    
    Accessible only by Admins for role management.
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from changing their own role
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role"
        )
    
    previous_role = user.role
    user.role = role_data.role
    
    db.commit()
    db.refresh(user)
    
    # Log the role change
    audit_service = AuditService(db)
    audit_service.log_action(
        user_id=current_user.id,
        entity_type="User",
        entity_id=str(user.id),
        action="UPDATE",
        details={
            "action_type": "role_change",
            "user_name": user.name,
            "user_email": user.email,
            "previous_role": previous_role.value,
            "new_role": role_data.role.value,
            "changed_by_admin": current_user.name
        }
    )
    
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.patch("/{user_id}/activate")
async def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Activate a user account.
    
    Accessible only by Admins for user management.
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already active"
        )
    
    user.is_active = True
    db.commit()
    
    # Log the activation
    audit_service = AuditService(db)
    audit_service.log_action(
        user_id=current_user.id,
        entity_type="User",
        entity_id=str(user.id),
        action="UPDATE",
        details={
            "action_type": "activation",
            "user_name": user.name,
            "user_email": user.email,
            "activated_by_admin": current_user.name
        }
    )
    
    return {"message": f"User {user.name} has been activated"}


@router.patch("/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Deactivate a user account.
    
    Accessible only by Admins for user management.
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from deactivating themselves
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already inactive"
        )
    
    user.is_active = False
    db.commit()
    
    # Log the deactivation
    audit_service = AuditService(db)
    audit_service.log_action(
        user_id=current_user.id,
        entity_type="User",
        entity_id=str(user.id),
        action="UPDATE",
        details={
            "action_type": "deactivation",
            "user_name": user.name,
            "user_email": user.email,
            "deactivated_by_admin": current_user.name
        }
    )
    
    return {"message": f"User {user.name} has been deactivated"}


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_role)
):
    """
    Delete a user account (soft delete by deactivation).
    
    Accessible only by Admins for user management.
    Note: This performs a soft delete by deactivating the user to preserve audit trails.
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from deleting themselves
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Soft delete by deactivating
    user.is_active = False
    db.commit()
    
    # Log the deletion
    audit_service = AuditService(db)
    audit_service.log_action(
        user_id=current_user.id,
        entity_type="User",
        entity_id=str(user.id),
        action="DELETE",
        details={
            "action_type": "soft_delete",
            "user_name": user.name,
            "user_email": user.email,
            "deleted_by_admin": current_user.name,
            "note": "Soft delete performed to preserve audit trails"
        }
    )
    
    return {"message": f"User {user.name} has been deleted (deactivated)"}


@router.get("/assignable")
async def get_assignable_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of users that can be assigned to exceptions.
    
    Accessible by any authenticated user for exception assignment.
    Returns only active Checkers and Admins (users who can handle exceptions).
    """
    # Get active users with Checker or Admin roles
    assignable_users = db.query(User).filter(
        User.is_active == True,
        User.role.in_([UserRole.CHECKER, UserRole.ADMIN])
    ).order_by(User.name).all()
    
    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None
        }
        for user in assignable_users
    ]


@router.get("/assignable-list")
async def get_assignable_users_list(
    db: Session = Depends(get_db)
):
    """
    Get list of users that can be assigned to exceptions - alternative endpoint.
    
    No authentication required for testing purposes.
    Returns only active Checkers and Admins (users who can handle exceptions).
    """
    # Get active users with Checker or Admin roles
    assignable_users = db.query(User).filter(
        User.is_active == True,
        User.role.in_([UserRole.CHECKER, UserRole.ADMIN])
    ).order_by(User.name).all()
    
    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None
        }
        for user in assignable_users
    ]


@router.get("/test")
async def test_endpoint():
    """
    Test endpoint to verify server is responding.
    No authentication required.
    """
    return {"message": "Server is working - UPDATED", "timestamp": "2024-01-01T00:00:00Z", "debug": "no auth required"}


@router.get("/debug-users-test")
async def debug_users_test():
    """
    Another debug test endpoint in users router.
    No authentication required.
    """
    # Debug: Check if router has dependencies
    dependencies_info = {
        "has_dependencies": hasattr(router, 'dependencies') and router.dependencies is not None,
        "dependencies_count": len(router.dependencies) if hasattr(router, 'dependencies') and router.dependencies else 0,
        "router_prefix": router.prefix,
        "router_tags": router.tags
    }
    return {"message": "Users router debug endpoint", "no_auth": True, "router": "users", "debug": dependencies_info}