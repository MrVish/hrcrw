"""
Main API router that includes all endpoint routers.
"""
from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.notifications import router as notifications_router
from app.api.users import router as users_router
from app.api.clients import router as clients_router
from app.api.reviews import router as reviews_router
from app.api.exceptions import router as exceptions_router
from app.api.audit import router as audit_router
from app.api.documents import router as documents_router
from app.api.users_test import test_users_router

# Create main API router
api_router = APIRouter()

# Include authentication routes
api_router.include_router(auth_router)

# Include dashboard routes
api_router.include_router(dashboard_router)

# Include notifications routes
api_router.include_router(notifications_router)

# Include user management routes
api_router.include_router(users_router)

# Create a test router to debug the issue
from fastapi import APIRouter as TestAPIRouter
test_router = TestAPIRouter(prefix="/test-users", tags=["test-users"])

@test_router.get("/no-auth-test")
async def no_auth_test():
    """Test endpoint with no authentication."""
    return {"message": "Test router works", "no_auth": True}

api_router.include_router(test_router)

# Include test users router
api_router.include_router(test_users_router)

# Include client management routes
api_router.include_router(clients_router)

# Include review workflow routes
api_router.include_router(reviews_router)

# Include exception management routes
api_router.include_router(exceptions_router)

# Include audit log routes
api_router.include_router(audit_router)

# Include document management routes
api_router.include_router(documents_router)


# Debug endpoint to test api_router directly
@api_router.get("/debug-api-test")
async def debug_api_test():
    """Debug test endpoint in api_router to test authentication."""
    return {"message": "API router direct endpoint works - UPDATED", "no_auth": True, "timestamp": "updated"}