"""
Test configuration and fixtures for the High Risk Client Review Workflow.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import get_db, Base
from app.models.user import User, UserRole
from app.core.auth import create_user_token


# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    session = TestingSessionLocal()
    
    try:
        yield session
    finally:
        session.close()
        # Drop tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session: Session):
    """Create a test client with database dependency override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Clean up
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user with Maker role."""
    user = User(
        name="Test User",
        email="test@example.com",
        role=UserRole.MAKER,
        is_active=True
    )
    user.set_password("testpassword123")
    
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    return user


@pytest.fixture
def maker_user(db_session: Session) -> User:
    """Create a test user with Maker role."""
    user = User(
        name="Maker User",
        email="maker@example.com",
        role=UserRole.MAKER,
        is_active=True
    )
    user.set_password("testpassword123")
    
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    return user


@pytest.fixture
def checker_user(db_session: Session) -> User:
    """Create a test user with Checker role."""
    user = User(
        name="Checker User",
        email="checker@example.com",
        role=UserRole.CHECKER,
        is_active=True
    )
    user.set_password("testpassword123")
    
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    return user


@pytest.fixture
def admin_user(db_session: Session) -> User:
    """Create a test user with Admin role."""
    user = User(
        name="Admin User",
        email="admin@example.com",
        role=UserRole.ADMIN,
        is_active=True
    )
    user.set_password("testpassword123")
    
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    return user


@pytest.fixture
def inactive_user(db_session: Session) -> User:
    """Create an inactive test user."""
    user = User(
        name="Inactive User",
        email="inactive@example.com",
        role=UserRole.MAKER,
        is_active=False
    )
    user.set_password("testpassword123")
    
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict:
    """Create authentication headers for test requests."""
    token = create_user_token(
        user_id=test_user.id,
        email=test_user.email,
        role=test_user.role
    )
    
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def maker_auth_headers(maker_user: User) -> dict:
    """Create authentication headers for maker user."""
    token = create_user_token(
        user_id=maker_user.id,
        email=maker_user.email,
        role=maker_user.role
    )
    
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def checker_auth_headers(checker_user: User) -> dict:
    """Create authentication headers for checker user."""
    token = create_user_token(
        user_id=checker_user.id,
        email=checker_user.email,
        role=checker_user.role
    )
    
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(admin_user: User) -> dict:
    """Create authentication headers for admin user."""
    token = create_user_token(
        user_id=admin_user.id,
        email=admin_user.email,
        role=admin_user.role
    )
    
    return {"Authorization": f"Bearer {token}"}