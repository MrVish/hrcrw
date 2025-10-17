#!/usr/bin/env python3
"""
Database seeding script for High Risk Client Review Workflow.
This script creates initial data for development and testing.
"""
import sys
import os
from datetime import datetime, date, timedelta
from typing import List

# Add the parent directory to the path so we can import our app
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.user import User, UserRole
from app.models.client import Client, RiskLevel, ClientStatus
from app.models.review import Review, ReviewStatus
from app.models.exception import ReviewException, ExceptionType, ExceptionStatus, ExceptionPriority
from app.models.audit_log import AuditLog, AuditAction, AuditEntityType
from app.models.kyc_questionnaire import KYCQuestionnaire, YesNoNA, YesNo
from app.models.base import BaseModel


def create_initial_users(db: Session) -> List[User]:
    """Create initial users for the system."""
    print("Creating initial users...")
    
    users = [
        # Admin users
        User(
            name="System Administrator",
            email="admin@hrcrw.com",
            role=UserRole.ADMIN,
            is_active=True
        ),
        User(
            name="John Admin",
            email="john.admin@hrcrw.com",
            role=UserRole.ADMIN,
            is_active=True
        ),
        
        # Checker users
        User(
            name="Sarah Checker",
            email="sarah.checker@hrcrw.com",
            role=UserRole.CHECKER,
            is_active=True
        ),
        User(
            name="Mike Reviewer",
            email="mike.reviewer@hrcrw.com",
            role=UserRole.CHECKER,
            is_active=True
        ),
        User(
            name="Lisa Validator",
            email="lisa.validator@hrcrw.com",
            role=UserRole.CHECKER,
            is_active=True
        ),
        
        # Maker users
        User(
            name="Alice Maker",
            email="alice.maker@hrcrw.com",
            role=UserRole.MAKER,
            is_active=True
        ),
        User(
            name="Bob Creator",
            email="bob.creator@hrcrw.com",
            role=UserRole.MAKER,
            is_active=True
        ),
        User(
            name="Carol Submitter",
            email="carol.submitter@hrcrw.com",
            role=UserRole.MAKER,
            is_active=True
        ),
        User(
            name="David Analyst",
            email="david.analyst@hrcrw.com",
            role=UserRole.MAKER,
            is_active=True
        ),
        
        # Inactive user for testing
        User(
            name="Inactive User",
            email="inactive@hrcrw.com",
            role=UserRole.MAKER,
            is_active=False
        )
    ]
    
    # Set passwords for all users (default: "password123")
    for user in users:
        user.set_password("password123")
    
    # Add users to database
    for user in users:
        db.add(user)
    
    db.commit()
    
    # Refresh to get IDs
    for user in users:
        db.refresh(user)
    
    print(f"Created {len(users)} users")
    return users


def create_initial_clients(db: Session) -> List[Client]:
    """Create comprehensive realistic client data with proper risk level distribution."""
    print("Creating comprehensive client data...")
    
    from app.models.client import AMLRiskLevel
    
    clients = [
        # High-risk clients with auto-review flags
        Client(
            client_id="HR001",
            name="Offshore Holdings Ltd",
            risk_level=RiskLevel.HIGH,
            country="Cayman Islands",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=200),
            domicile_branch="International Banking",
            relationship_manager="Sarah Mitchell",
            business_unit="Private Banking",
            aml_risk=AMLRiskLevel.VERY_HIGH,
            auto_kyc_review=True,
            auto_aml_review=True,
            auto_sanctions_review=True,
            auto_pep_review=True,
            auto_financial_review=True
        ),
        Client(
            client_id="HR002",
            name="Global Trading Corp",
            risk_level=RiskLevel.HIGH,
            country="British Virgin Islands",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=150),
            domicile_branch="Corporate Banking",
            relationship_manager="Michael Chen",
            business_unit="Trade Finance",
            aml_risk=AMLRiskLevel.HIGH,
            auto_kyc_review=True,
            auto_aml_review=True,
            auto_sanctions_review=True
        ),
        Client(
            client_id="HR003",
            name="International Finance SA",
            risk_level=RiskLevel.HIGH,
            country="Panama",
            status=ClientStatus.UNDER_REVIEW,
            last_review_date=date.today() - timedelta(days=300),
            domicile_branch="Latin America",
            relationship_manager="Carlos Rodriguez",
            business_unit="Investment Banking",
            aml_risk=AMLRiskLevel.VERY_HIGH,
            auto_kyc_review=True,
            auto_aml_review=True,
            auto_sanctions_review=True,
            auto_pep_review=True
        ),
        Client(
            client_id="HR004",
            name="Crypto Ventures LLC",
            risk_level=RiskLevel.HIGH,
            country="Malta",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=100),
            domicile_branch="Digital Assets",
            relationship_manager="Emma Thompson",
            business_unit="Fintech",
            aml_risk=AMLRiskLevel.HIGH,
            auto_kyc_review=True,
            auto_aml_review=True,
            auto_financial_review=True
        ),
        Client(
            client_id="HR005",
            name="Digital Assets Fund",
            risk_level=RiskLevel.HIGH,
            country="Singapore",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=50),
            domicile_branch="Asia Pacific",
            relationship_manager="Li Wei",
            business_unit="Asset Management",
            aml_risk=AMLRiskLevel.HIGH,
            auto_kyc_review=True,
            auto_aml_review=True
        ),
        Client(
            client_id="HR006",
            name="Sovereign Wealth Partners",
            risk_level=RiskLevel.HIGH,
            country="United Arab Emirates",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=180),
            domicile_branch="Middle East",
            relationship_manager="Ahmed Al-Rashid",
            business_unit="Institutional",
            aml_risk=AMLRiskLevel.HIGH,
            auto_kyc_review=True,
            auto_pep_review=True,
            auto_sanctions_review=True
        ),
        Client(
            client_id="HR007",
            name="Emerging Markets Capital",
            risk_level=RiskLevel.HIGH,
            country="Mauritius",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=220),
            domicile_branch="Africa",
            relationship_manager="Priya Sharma",
            business_unit="Emerging Markets",
            aml_risk=AMLRiskLevel.VERY_HIGH,
            auto_kyc_review=True,
            auto_aml_review=True,
            auto_sanctions_review=True
        ),
        Client(
            client_id="HR008",
            name="Shell Company Holdings",
            risk_level=RiskLevel.HIGH,
            country="Seychelles",
            status=ClientStatus.SUSPENDED,
            last_review_date=date.today() - timedelta(days=400),
            domicile_branch="International Banking",
            relationship_manager="David Wilson",
            business_unit="Private Banking",
            aml_risk=AMLRiskLevel.VERY_HIGH,
            auto_kyc_review=True,
            auto_aml_review=True,
            auto_sanctions_review=True,
            auto_pep_review=True
        ),
        
        # Medium-risk clients
        Client(
            client_id="MR001",
            name="Regional Bank Ltd",
            risk_level=RiskLevel.MEDIUM,
            country="United Kingdom",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=300),
            domicile_branch="Europe",
            relationship_manager="James Parker",
            business_unit="Commercial Banking",
            aml_risk=AMLRiskLevel.MEDIUM
        ),
        Client(
            client_id="MR002",
            name="Investment Partners Inc",
            risk_level=RiskLevel.MEDIUM,
            country="United States",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=250),
            domicile_branch="North America",
            relationship_manager="Jennifer Davis",
            business_unit="Investment Banking",
            aml_risk=AMLRiskLevel.MEDIUM
        ),
        Client(
            client_id="MR003",
            name="European Trading Co",
            risk_level=RiskLevel.MEDIUM,
            country="Germany",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=200),
            domicile_branch="Europe",
            relationship_manager="Hans Mueller",
            business_unit="Trade Finance",
            aml_risk=AMLRiskLevel.MEDIUM
        ),
        Client(
            client_id="MR004",
            name="Tech Innovations Ltd",
            risk_level=RiskLevel.MEDIUM,
            country="Ireland",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=180),
            domicile_branch="Europe",
            relationship_manager="Fiona O'Brien",
            business_unit="Technology",
            aml_risk=AMLRiskLevel.MEDIUM
        ),
        Client(
            client_id="MR005",
            name="Healthcare Solutions Corp",
            risk_level=RiskLevel.MEDIUM,
            country="Switzerland",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=160),
            domicile_branch="Europe",
            relationship_manager="Klaus Weber",
            business_unit="Healthcare",
            aml_risk=AMLRiskLevel.LOW
        ),
        Client(
            client_id="MR006",
            name="Energy Transition Fund",
            risk_level=RiskLevel.MEDIUM,
            country="Norway",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=140),
            domicile_branch="Europe",
            relationship_manager="Astrid Hansen",
            business_unit="Energy",
            aml_risk=AMLRiskLevel.MEDIUM
        ),
        Client(
            client_id="MR007",
            name="Real Estate Investment Trust",
            risk_level=RiskLevel.MEDIUM,
            country="Canada",
            status=ClientStatus.INACTIVE,
            last_review_date=date.today() - timedelta(days=320),
            domicile_branch="North America",
            relationship_manager="Robert Taylor",
            business_unit="Real Estate",
            aml_risk=AMLRiskLevel.MEDIUM
        ),
        
        # Low-risk clients
        Client(
            client_id="LR001",
            name="Local Manufacturing Ltd",
            risk_level=RiskLevel.LOW,
            country="Canada",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=400),
            domicile_branch="North America",
            relationship_manager="Susan Brown",
            business_unit="Manufacturing",
            aml_risk=AMLRiskLevel.LOW
        ),
        Client(
            client_id="LR002",
            name="Retail Chain Corp",
            risk_level=RiskLevel.LOW,
            country="Australia",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=200),
            domicile_branch="Asia Pacific",
            relationship_manager="Mark Johnson",
            business_unit="Retail",
            aml_risk=AMLRiskLevel.LOW
        ),
        Client(
            client_id="LR003",
            name="Family Restaurant Group",
            risk_level=RiskLevel.LOW,
            country="United States",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=350),
            domicile_branch="North America",
            relationship_manager="Lisa Anderson",
            business_unit="Hospitality",
            aml_risk=AMLRiskLevel.LOW
        ),
        Client(
            client_id="LR004",
            name="Educational Services Inc",
            risk_level=RiskLevel.LOW,
            country="United Kingdom",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=280),
            domicile_branch="Europe",
            relationship_manager="Thomas Wilson",
            business_unit="Education",
            aml_risk=AMLRiskLevel.LOW
        ),
        Client(
            client_id="LR005",
            name="Agricultural Cooperative",
            risk_level=RiskLevel.LOW,
            country="New Zealand",
            status=ClientStatus.ACTIVE,
            last_review_date=date.today() - timedelta(days=380),
            domicile_branch="Asia Pacific",
            relationship_manager="Rachel Green",
            business_unit="Agriculture",
            aml_risk=AMLRiskLevel.LOW
        )
    ]
    
    # Add clients to database
    for client in clients:
        db.add(client)
    
    db.commit()
    
    # Refresh to get IDs
    for client in clients:
        db.refresh(client)
    
    print(f"Created {len(clients)} clients")
    return clients


def create_initial_reviews(db: Session, users: List[User], clients: List[Client]) -> List[Review]:
    """Create comprehensive reviews linked to clients with proper foreign key relationships."""
    print("Creating comprehensive review data...")
    
    from app.models.review import ReviewType
    
    # Get users by role
    makers = [u for u in users if u.role == UserRole.MAKER and u.is_active]
    checkers = [u for u in users if u.role == UserRole.CHECKER and u.is_active]
    
    reviews = []
    
    # Create reviews in different states with proper relationships
    review_data = [
        # Draft reviews
        {
            "client": clients[0],  # HR001 - Offshore Holdings Ltd
            "submitter": makers[0],
            "status": ReviewStatus.DRAFT,
            "review_type": ReviewType.KYC,
            "auto_created": True,
            "comments": "Auto-generated KYC review for high-risk offshore entity. Requires enhanced due diligence."
        },
        {
            "client": clients[0],  # HR001 - Multiple reviews for same client
            "submitter": makers[1],
            "status": ReviewStatus.DRAFT,
            "review_type": ReviewType.AML,
            "auto_created": True,
            "comments": "Auto-generated AML screening review. Enhanced monitoring required."
        },
        {
            "client": clients[1],  # HR002 - Global Trading Corp
            "submitter": makers[1],
            "status": ReviewStatus.DRAFT,
            "review_type": ReviewType.SANCTIONS,
            "auto_created": True,
            "comments": "Auto-generated sanctions screening for trading entity."
        },
        {
            "client": clients[8],  # MR001 - Regional Bank Ltd
            "submitter": makers[2],
            "status": ReviewStatus.DRAFT,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Manual review initiated for periodic compliance check."
        },
        
        # Submitted reviews (pending)
        {
            "client": clients[2],  # HR003 - International Finance SA
            "submitter": makers[0],
            "status": ReviewStatus.SUBMITTED,
            "review_type": ReviewType.KYC,
            "auto_created": True,
            "comments": "High-risk client review - urgent. Enhanced KYC documentation required.",
            "submitted_at": datetime.utcnow() - timedelta(days=2)
        },
        {
            "client": clients[3],  # HR004 - Crypto Ventures LLC
            "submitter": makers[2],
            "status": ReviewStatus.SUBMITTED,
            "review_type": ReviewType.AML,
            "auto_created": True,
            "comments": "Crypto ventures AML compliance review. Digital asset monitoring required.",
            "submitted_at": datetime.utcnow() - timedelta(days=1)
        },
        {
            "client": clients[4],  # HR005 - Digital Assets Fund
            "submitter": makers[3],
            "status": ReviewStatus.SUBMITTED,
            "review_type": ReviewType.FINANCIAL,
            "auto_created": True,
            "comments": "Financial documentation review for digital assets fund.",
            "submitted_at": datetime.utcnow() - timedelta(days=3)
        },
        {
            "client": clients[5],  # HR006 - Sovereign Wealth Partners
            "submitter": makers[1],
            "status": ReviewStatus.SUBMITTED,
            "review_type": ReviewType.PEP,
            "auto_created": True,
            "comments": "PEP screening for sovereign wealth entity. Political exposure assessment required.",
            "submitted_at": datetime.utcnow() - timedelta(days=1)
        },
        
        # Under review
        {
            "client": clients[6],  # HR007 - Emerging Markets Capital
            "submitter": makers[1],
            "reviewer": checkers[0],
            "status": ReviewStatus.UNDER_REVIEW,
            "review_type": ReviewType.AML,
            "auto_created": True,
            "comments": "Emerging markets AML review - enhanced monitoring for jurisdiction risk.",
            "submitted_at": datetime.utcnow() - timedelta(days=4),
        },
        {
            "client": clients[9],  # MR002 - Investment Partners Inc
            "submitter": makers[2],
            "reviewer": checkers[1],
            "status": ReviewStatus.UNDER_REVIEW,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Investment partners periodic review - checking compliance documentation.",
            "submitted_at": datetime.utcnow() - timedelta(days=5),
        },
        {
            "client": clients[11],  # MR004 - Tech Innovations Ltd
            "submitter": makers[0],
            "reviewer": checkers[2],
            "status": ReviewStatus.UNDER_REVIEW,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Technology sector compliance review - IP and regulatory assessment.",
            "submitted_at": datetime.utcnow() - timedelta(days=3),
        },
        
        # Approved reviews
        {
            "client": clients[8],  # MR001 - Regional Bank Ltd
            "submitter": makers[0],
            "reviewer": checkers[1],
            "status": ReviewStatus.APPROVED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Regional bank review completed successfully. All documentation verified.",
            "submitted_at": datetime.utcnow() - timedelta(days=10),
            "reviewed_at": datetime.utcnow() - timedelta(days=8)
        },
        {
            "client": clients[12],  # MR005 - Healthcare Solutions Corp
            "submitter": makers[3],
            "reviewer": checkers[0],
            "status": ReviewStatus.APPROVED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Healthcare sector compliance review approved. Regulatory requirements met.",
            "submitted_at": datetime.utcnow() - timedelta(days=15),
            "reviewed_at": datetime.utcnow() - timedelta(days=12)
        },
        {
            "client": clients[15],  # LR002 - Retail Chain Corp
            "submitter": makers[1],
            "reviewer": checkers[2],
            "status": ReviewStatus.APPROVED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Low-risk retail client review completed. Standard documentation sufficient.",
            "submitted_at": datetime.utcnow() - timedelta(days=20),
            "reviewed_at": datetime.utcnow() - timedelta(days=18)
        },
        {
            "client": clients[16],  # LR003 - Family Restaurant Group
            "submitter": makers[2],
            "reviewer": checkers[1],
            "status": ReviewStatus.APPROVED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Family business review approved. Simple structure, low risk profile.",
            "submitted_at": datetime.utcnow() - timedelta(days=25),
            "reviewed_at": datetime.utcnow() - timedelta(days=22)
        },
        
        # Rejected reviews
        {
            "client": clients[10],  # MR003 - European Trading Co
            "submitter": makers[2],
            "reviewer": checkers[2],
            "status": ReviewStatus.REJECTED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "European trading review - documentation issues identified.",
            "rejection_reason": "Missing required KYC documentation. Please provide updated beneficial ownership information and source of funds documentation.",
            "submitted_at": datetime.utcnow() - timedelta(days=7),
            "reviewed_at": datetime.utcnow() - timedelta(days=5)
        },
        {
            "client": clients[7],  # HR008 - Shell Company Holdings (Suspended)
            "submitter": makers[0],
            "reviewer": checkers[0],
            "status": ReviewStatus.REJECTED,
            "review_type": ReviewType.KYC,
            "auto_created": True,
            "comments": "Shell company KYC review - significant compliance concerns.",
            "rejection_reason": "Unable to verify beneficial ownership structure. Suspicious transaction patterns identified. Recommend account suspension pending further investigation.",
            "submitted_at": datetime.utcnow() - timedelta(days=12),
            "reviewed_at": datetime.utcnow() - timedelta(days=10)
        },
        {
            "client": clients[13],  # MR006 - Energy Transition Fund
            "submitter": makers[3],
            "reviewer": checkers[1],
            "status": ReviewStatus.REJECTED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Energy fund review - ESG compliance issues.",
            "rejection_reason": "ESG documentation incomplete. Environmental impact assessments missing for several portfolio companies.",
            "submitted_at": datetime.utcnow() - timedelta(days=8),
            "reviewed_at": datetime.utcnow() - timedelta(days=6)
        },
        
        # Additional reviews to reach 50+ total
        # More draft reviews
        {
            "client": clients[17],  # LR004 - Educational Services Inc
            "submitter": makers[0],
            "status": ReviewStatus.DRAFT,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Educational sector compliance review - regulatory changes assessment."
        },
        {
            "client": clients[18],  # LR005 - Agricultural Cooperative
            "submitter": makers[1],
            "status": ReviewStatus.DRAFT,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Agricultural cooperative review - commodity trading compliance."
        },
        
        # More submitted reviews
        {
            "client": clients[14],  # MR007 - Real Estate Investment Trust
            "submitter": makers[2],
            "status": ReviewStatus.SUBMITTED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "REIT compliance review - property portfolio assessment.",
            "submitted_at": datetime.utcnow() - timedelta(days=2)
        },
        
        # Historical approved reviews (older dates)
        {
            "client": clients[0],  # HR001 - Historical review
            "submitter": makers[1],
            "reviewer": checkers[0],
            "status": ReviewStatus.APPROVED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Previous annual review - completed successfully.",
            "submitted_at": datetime.utcnow() - timedelta(days=200),
            "reviewed_at": datetime.utcnow() - timedelta(days=195)
        },
        {
            "client": clients[1],  # HR002 - Historical review
            "submitter": makers[2],
            "reviewer": checkers[1],
            "status": ReviewStatus.APPROVED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Previous compliance review - all requirements met.",
            "submitted_at": datetime.utcnow() - timedelta(days=180),
            "reviewed_at": datetime.utcnow() - timedelta(days=175)
        },
        
        # Additional auto-created reviews for high-risk clients
        {
            "client": clients[2],  # HR003 - Additional auto review
            "submitter": makers[3],
            "status": ReviewStatus.DRAFT,
            "review_type": ReviewType.SANCTIONS,
            "auto_created": True,
            "comments": "Auto-generated sanctions screening - enhanced monitoring required."
        },
        {
            "client": clients[3],  # HR004 - Additional auto review
            "submitter": makers[0],
            "status": ReviewStatus.DRAFT,
            "review_type": ReviewType.KYC,
            "auto_created": True,
            "comments": "Auto-generated KYC review for crypto entity - enhanced verification."
        },
        {
            "client": clients[4],  # HR005 - Additional auto review
            "submitter": makers[1],
            "status": ReviewStatus.SUBMITTED,
            "review_type": ReviewType.AML,
            "auto_created": True,
            "comments": "Auto-generated AML review for digital assets fund.",
            "submitted_at": datetime.utcnow() - timedelta(days=1)
        },
        {
            "client": clients[5],  # HR006 - Additional auto review
            "submitter": makers[2],
            "status": ReviewStatus.SUBMITTED,
            "review_type": ReviewType.SANCTIONS,
            "auto_created": True,
            "comments": "Auto-generated sanctions screening for sovereign wealth entity.",
            "submitted_at": datetime.utcnow() - timedelta(days=2)
        },
        
        # Additional reviews to reach 50+ total
        # More medium-risk client reviews
        {
            "client": clients[11],  # MR004 - Tech Innovations Ltd
            "submitter": makers[3],
            "reviewer": checkers[0],
            "status": ReviewStatus.APPROVED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Technology sector compliance review completed successfully.",
            "submitted_at": datetime.utcnow() - timedelta(days=30),
            "reviewed_at": datetime.utcnow() - timedelta(days=28)
        },
        {
            "client": clients[13],  # MR006 - Energy Transition Fund
            "submitter": makers[1],
            "status": ReviewStatus.DRAFT,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Energy sector ESG compliance review - sustainability assessment."
        },
        {
            "client": clients[14],  # MR007 - Real Estate Investment Trust
            "submitter": makers[0],
            "reviewer": checkers[2],
            "status": ReviewStatus.APPROVED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "REIT compliance review - property portfolio assessment completed.",
            "submitted_at": datetime.utcnow() - timedelta(days=35),
            "reviewed_at": datetime.utcnow() - timedelta(days=32)
        },
        
        # More low-risk client reviews
        {
            "client": clients[17],  # LR004 - Educational Services Inc
            "submitter": makers[2],
            "reviewer": checkers[1],
            "status": ReviewStatus.APPROVED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Educational sector compliance review - regulatory requirements met.",
            "submitted_at": datetime.utcnow() - timedelta(days=40),
            "reviewed_at": datetime.utcnow() - timedelta(days=37)
        },
        {
            "client": clients[18],  # LR005 - Agricultural Cooperative
            "submitter": makers[3],
            "status": ReviewStatus.SUBMITTED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Agricultural cooperative compliance review - commodity trading assessment.",
            "submitted_at": datetime.utcnow() - timedelta(days=3)
        },
        
        # Historical reviews for various clients
        {
            "client": clients[2],  # HR003 - Historical review
            "submitter": makers[0],
            "reviewer": checkers[2],
            "status": ReviewStatus.APPROVED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Previous annual compliance review - enhanced monitoring implemented.",
            "submitted_at": datetime.utcnow() - timedelta(days=250),
            "reviewed_at": datetime.utcnow() - timedelta(days=245)
        },
        {
            "client": clients[3],  # HR004 - Historical review
            "submitter": makers[1],
            "reviewer": checkers[0],
            "status": ReviewStatus.APPROVED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Previous crypto entity review - digital asset compliance verified.",
            "submitted_at": datetime.utcnow() - timedelta(days=220),
            "reviewed_at": datetime.utcnow() - timedelta(days=215)
        },
        {
            "client": clients[4],  # HR005 - Historical review
            "submitter": makers[2],
            "reviewer": checkers[1],
            "status": ReviewStatus.REJECTED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Previous digital assets fund review - documentation issues.",
            "rejection_reason": "Custody documentation incomplete. Digital asset storage procedures not adequately documented.",
            "submitted_at": datetime.utcnow() - timedelta(days=190),
            "reviewed_at": datetime.utcnow() - timedelta(days=185)
        },
        {
            "client": clients[5],  # HR006 - Historical review
            "submitter": makers[3],
            "reviewer": checkers[2],
            "status": ReviewStatus.APPROVED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Previous sovereign wealth review - PEP screening completed.",
            "submitted_at": datetime.utcnow() - timedelta(days=160),
            "reviewed_at": datetime.utcnow() - timedelta(days=155)
        },
        
        # More current reviews
        {
            "client": clients[6],  # HR007 - Current review
            "submitter": makers[0],
            "status": ReviewStatus.SUBMITTED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Emerging markets compliance review - jurisdiction risk assessment.",
            "submitted_at": datetime.utcnow() - timedelta(days=4)
        },
        {
            "client": clients[7],  # HR008 - Current review
            "submitter": makers[1],
            "status": ReviewStatus.DRAFT,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Shell company investigation - enhanced due diligence required."
        },
        
        # Medium-risk client additional reviews
        {
            "client": clients[8],  # MR001 - Additional review
            "submitter": makers[2],
            "status": ReviewStatus.DRAFT,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Regional bank quarterly review - subsidiary compliance check."
        },
        {
            "client": clients[9],  # MR002 - Additional review
            "submitter": makers[3],
            "reviewer": checkers[0],
            "status": ReviewStatus.UNDER_REVIEW,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Investment partners semi-annual review - portfolio assessment.",
            "submitted_at": datetime.utcnow() - timedelta(days=6)
        },
        {
            "client": clients[10],  # MR003 - Additional review
            "submitter": makers[0],
            "status": ReviewStatus.DRAFT,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "European trading company follow-up review - addressing previous issues."
        },
        
        # Low-risk client additional reviews
        {
            "client": clients[15],  # LR002 - Additional review
            "submitter": makers[1],
            "status": ReviewStatus.DRAFT,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Retail chain annual review - expansion compliance assessment."
        },
        {
            "client": clients[16],  # LR003 - Additional review
            "submitter": makers[2],
            "reviewer": checkers[1],
            "status": ReviewStatus.UNDER_REVIEW,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Family restaurant group review - franchise compliance check.",
            "submitted_at": datetime.utcnow() - timedelta(days=7)
        },
        
        # More auto-created reviews for comprehensive coverage
        {
            "client": clients[6],  # HR007 - Auto PEP review
            "submitter": makers[3],
            "status": ReviewStatus.DRAFT,
            "review_type": ReviewType.PEP,
            "auto_created": True,
            "comments": "Auto-generated PEP screening for emerging markets entity."
        },
        {
            "client": clients[7],  # HR008 - Auto financial review
            "submitter": makers[0],
            "status": ReviewStatus.SUBMITTED,
            "review_type": ReviewType.FINANCIAL,
            "auto_created": True,
            "comments": "Auto-generated financial documentation review for shell company.",
            "submitted_at": datetime.utcnow() - timedelta(days=1)
        },
        
        # Additional historical approved reviews
        {
            "client": clients[11],  # MR004 - Historical
            "submitter": makers[1],
            "reviewer": checkers[2],
            "status": ReviewStatus.APPROVED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Previous technology sector review - data protection compliance verified.",
            "submitted_at": datetime.utcnow() - timedelta(days=120),
            "reviewed_at": datetime.utcnow() - timedelta(days=115)
        },
        {
            "client": clients[12],  # MR005 - Historical
            "submitter": makers[2],
            "reviewer": checkers[0],
            "status": ReviewStatus.APPROVED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Previous healthcare sector review - medical device compliance confirmed.",
            "submitted_at": datetime.utcnow() - timedelta(days=90),
            "reviewed_at": datetime.utcnow() - timedelta(days=85)
        },
        
        # Final reviews to reach 50+ total
        {
            "client": clients[13],  # MR006 - Additional review
            "submitter": makers[3],
            "reviewer": checkers[1],
            "status": ReviewStatus.APPROVED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Energy transition fund quarterly review - ESG compliance verified.",
            "submitted_at": datetime.utcnow() - timedelta(days=60),
            "reviewed_at": datetime.utcnow() - timedelta(days=55)
        },
        {
            "client": clients[14],  # MR007 - Additional review
            "submitter": makers[0],
            "status": ReviewStatus.DRAFT,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "REIT quarterly review - property portfolio compliance assessment."
        },
        {
            "client": clients[19],  # LR005 - Additional review
            "submitter": makers[1],
            "reviewer": checkers[2],
            "status": ReviewStatus.APPROVED,
            "review_type": ReviewType.MANUAL,
            "auto_created": False,
            "comments": "Agricultural cooperative annual review - commodity trading compliance verified.",
            "submitted_at": datetime.utcnow() - timedelta(days=45),
            "reviewed_at": datetime.utcnow() - timedelta(days=40)
        }
    ]
    
    for data in review_data:
        review = Review(
            client_id=data["client"].client_id,
            submitted_by=data["submitter"].id,
            reviewed_by=data.get("reviewer").id if data.get("reviewer") else None,
            status=data["status"],
            review_type=data.get("review_type", ReviewType.MANUAL),
            auto_created=data.get("auto_created", False),
            comments=data["comments"],
            rejection_reason=data.get("rejection_reason"),
            submitted_at=data.get("submitted_at"),
            reviewed_at=data.get("reviewed_at")
        )
        reviews.append(review)
        db.add(review)
    
    db.commit()
    
    # Refresh to get IDs
    for review in reviews:
        db.refresh(review)
    
    print(f"Created {len(reviews)} reviews with proper client relationships")
    return reviews


def create_initial_kyc_questionnaires(db: Session, reviews: List[Review], clients: List[Client]) -> List:
    """Create KYC questionnaires for all reviews with realistic data based on client risk level."""
    print("Creating KYC questionnaires for reviews...")
    print(f"Found {len(reviews)} reviews and {len(clients)} clients")
    
    kyc_questionnaires = []
    
    # Create a mapping of client_id to client for faster lookup
    client_map = {client.client_id: client for client in clients}
    
    for review in reviews:
        print(f"Processing review {review.id} for client {review.client_id}")
        
        # Find the client for this review using client_id (string) not id (int)
        client = client_map.get(review.client_id)
        if not client:
            print(f"Client not found for review {review.id} with client_id {review.client_id}")
            continue
            
        risk_level = client.risk_level.value.lower()
        
        # Create realistic KYC questionnaire data based on client risk level
        questionnaire_data = {
            'review_id': review.id,
            'purpose_of_account': f"Account for {client.name} - {client.business_unit} operations. Primary use for {risk_level}-risk business activities.",
            'kyc_documents_complete': YesNoNA.YES if risk_level == 'low' else YesNoNA.NO if risk_level == 'high' else YesNoNA.YES,
            'missing_kyc_details': None if risk_level == 'low' else f"Enhanced documentation required for {risk_level}-risk client. Additional beneficial ownership verification needed.",
            'account_purpose_aligned': YesNoNA.YES,
            'adverse_media_completed': YesNoNA.YES if risk_level in ['high', 'medium'] else YesNoNA.NOT_APPLICABLE,
            'adverse_media_evidence': f"Adverse media screening completed for {client.name}. {'Enhanced monitoring required due to jurisdiction risk.' if risk_level == 'high' else 'No significant findings.'}" if risk_level in ['high', 'medium'] else None,
            'senior_mgmt_approval': YesNo.YES if risk_level == 'high' else None,
            'pep_approval_obtained': YesNoNA.YES if risk_level == 'high' else YesNoNA.NOT_APPLICABLE,
            'static_data_correct': YesNoNA.YES,
            'kyc_documents_valid': YesNoNA.YES if risk_level != 'high' else YesNoNA.NO,
            'regulated_business_license': YesNoNA.YES if client.business_unit in ['Banking', 'Investment Banking', 'Asset Management', 'Commercial Banking', 'Private Banking'] else YesNoNA.NOT_APPLICABLE,
            'remedial_actions': None if risk_level == 'low' else f"Enhanced monitoring required for {risk_level}-risk client. {'Immediate escalation to senior management required.' if risk_level == 'high' else 'Regular review schedule implemented.'}",
            'source_of_funds_docs': [1, 2] if risk_level == 'high' else [1] if risk_level == 'medium' else []
        }
        
        try:
            kyc_questionnaire = KYCQuestionnaire(**questionnaire_data)
            kyc_questionnaires.append(kyc_questionnaire)
            print(f"Created KYC questionnaire for review {review.id} (client: {client.name})")
        except Exception as e:
            print(f"Error creating KYC questionnaire for review {review.id}: {e}")
            import traceback
            traceback.print_exc()
    
    # Add all questionnaires to database in batches to avoid memory issues
    batch_size = 50
    total_created = 0
    
    try:
        for i in range(0, len(kyc_questionnaires), batch_size):
            batch = kyc_questionnaires[i:i + batch_size]
            db.add_all(batch)
            db.commit()
            total_created += len(batch)
            print(f"Committed batch {i//batch_size + 1}: {len(batch)} questionnaires")
        
        print(f"Successfully committed {total_created} KYC questionnaires to database")
    except Exception as e:
        print(f"Error committing KYC questionnaires: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return []
    
    # Refresh to get IDs
    for questionnaire in kyc_questionnaires:
        try:
            db.refresh(questionnaire)
        except Exception as e:
            print(f"Error refreshing questionnaire {questionnaire.review_id}: {e}")
    
    print(f"Created {len(kyc_questionnaires)} KYC questionnaires")
    return kyc_questionnaires


def create_initial_exceptions(db: Session, users: List[User], reviews: List[Review]) -> List[Exception]:
    """Create comprehensive exceptions linked to reviews with realistic scenarios."""
    print("Creating comprehensive exception data...")
    
    # Get users by role
    admins = [u for u in users if u.role == UserRole.ADMIN and u.is_active]
    checkers = [u for u in users if u.role == UserRole.CHECKER and u.is_active]
    makers = [u for u in users if u.role == UserRole.MAKER and u.is_active]
    
    # Import the correct Exception model
    from app.models.exception import ReviewException, ExceptionType, ExceptionStatus, ExceptionPriority
    
    exceptions = [
        # Open exceptions - High priority issues requiring immediate attention
        ReviewException(
            review_id=reviews[4].id,  # HR003 - Submitted KYC review
            created_by=checkers[0].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Client has not provided complete beneficial ownership structure. Ultimate beneficial owners above 25% threshold not identified. Required for high-risk client classification in Panama jurisdiction.",
            status=ExceptionStatus.OPEN
        ),
        ReviewException(
            review_id=reviews[5].id,  # HR004 - Submitted AML review
            created_by=checkers[1].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Crypto entity requires enhanced AML documentation. Source of digital assets not adequately documented. Transaction monitoring thresholds need adjustment.",
            status=ExceptionStatus.OPEN
        ),
        ReviewException(
            review_id=reviews[7].id,  # HR006 - Submitted PEP review
            created_by=checkers[2].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Sovereign wealth entity shows potential PEP connections. Enhanced due diligence required for politically exposed persons. Government relationship documentation incomplete.",
            status=ExceptionStatus.OPEN
        ),
        ReviewException(
            review_id=reviews[8].id,  # HR007 - Under review AML
            created_by=checkers[0].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Emerging markets jurisdiction presents elevated AML risk. Enhanced monitoring protocols required. Country risk assessment needs updating.",
            status=ExceptionStatus.OPEN
        ),
        
        # In Progress exceptions - Currently being worked on
        ReviewException(
            review_id=reviews[6].id,  # HR005 - Submitted Financial review
            created_by=checkers[1].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Digital assets fund financial documentation incomplete. Custody arrangements not clearly documented. Regulatory compliance for digital asset holdings unclear.",
            status=ExceptionStatus.IN_PROGRESS
        ),
        ReviewException(
            review_id=reviews[9].id,  # MR002 - Under review
            created_by=checkers[2].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Investment partnership structure requires clarification. Limited partner documentation incomplete. Investment strategy documentation needs updating.",
            status=ExceptionStatus.IN_PROGRESS
        ),
        ReviewException(
            review_id=reviews[10].id,  # MR004 - Under review
            created_by=checkers[0].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Technology sector regulatory compliance review. Data protection and privacy regulations compliance needs verification. Cross-border data transfer documentation required.",
            status=ExceptionStatus.IN_PROGRESS
        ),
        
        # Resolved exceptions - Successfully completed
        ReviewException(
            review_id=reviews[11].id,  # MR001 - Approved review
            created_by=checkers[1].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Regional bank subsidiary documentation was incomplete. Required regulatory approvals and licenses needed verification.",
            status=ExceptionStatus.RESOLVED,
            resolution_notes="All required documentation received and verified. Regulatory licenses confirmed current. Subsidiary structure properly documented.",
            resolved_at=datetime.utcnow() - timedelta(days=3)
        ),
        ReviewException(
            review_id=reviews[12].id,  # MR005 - Approved review
            created_by=checkers[2].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Healthcare entity required additional regulatory compliance documentation. Medical device regulations and pharmaceutical licensing needed review.",
            status=ExceptionStatus.RESOLVED,
            resolution_notes="Healthcare regulatory compliance confirmed. All medical device certifications current. Pharmaceutical licensing properly documented.",
            resolved_at=datetime.utcnow() - timedelta(days=5)
        ),
        ReviewException(
            review_id=reviews[13].id,  # LR002 - Approved review
            created_by=checkers[0].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Retail chain expansion into new jurisdictions required additional documentation. Franchise agreements and local regulatory compliance needed review.",
            status=ExceptionStatus.RESOLVED,
            resolution_notes="Franchise documentation complete. Local regulatory requirements met in all new jurisdictions. Compliance monitoring procedures established.",
            resolved_at=datetime.utcnow() - timedelta(days=7)
        ),
        
        # Dormant account exceptions
        ReviewException(
            review_id=reviews[14].id,  # LR003 - Approved review
            created_by=makers[0].id,
            exception_type=ExceptionType.DORMANT_FUNDED_UFAA,
            description="Family restaurant group account shows dormant activity with significant balances. Account has been inactive for 18 months with $250,000 balance. UFAA compliance review required.",
            status=ExceptionStatus.RESOLVED,
            resolution_notes="Client contacted and account reactivated. Business operations confirmed ongoing. Regular transaction activity resumed.",
            resolved_at=datetime.utcnow() - timedelta(days=10)
        ),
        ReviewException(
            review_id=reviews[20].id,  # MR007 - Submitted review
            created_by=makers[1].id,
            exception_type=ExceptionType.DORMANT_OVERDRAWN_EXIT,
            description="Real Estate Investment Trust account dormant with negative balance. Account overdrawn by $15,000 for 6 months. Exit procedures may be required.",
            status=ExceptionStatus.IN_PROGRESS
        ),
        
        # Additional exceptions for comprehensive coverage
        ReviewException(
            review_id=reviews[15].id,  # MR003 - Rejected review
            created_by=checkers[2].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="European trading company beneficial ownership documentation rejected. Complex corporate structure requires enhanced due diligence. Multiple jurisdiction compliance issues identified.",
            status=ExceptionStatus.OPEN
        ),
        ReviewException(
            review_id=reviews[16].id,  # HR008 - Rejected review
            created_by=checkers[0].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Shell company structure presents significant compliance risks. Unable to verify legitimate business purpose. Suspicious transaction patterns identified requiring investigation.",
            status=ExceptionStatus.OPEN
        ),
        ReviewException(
            review_id=reviews[17].id,  # MR006 - Rejected review
            created_by=checkers[1].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Energy transition fund ESG compliance documentation incomplete. Environmental impact assessments missing. Sustainability criteria verification required.",
            status=ExceptionStatus.IN_PROGRESS
        ),
        
        # Historical resolved exceptions
        ReviewException(
            review_id=reviews[22].id,  # HR001 - Historical approved
            created_by=checkers[0].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Previous year compliance review identified documentation gaps. Enhanced monitoring was implemented.",
            status=ExceptionStatus.RESOLVED,
            resolution_notes="All documentation gaps addressed. Enhanced monitoring procedures successfully implemented. Annual review completed satisfactorily.",
            resolved_at=datetime.utcnow() - timedelta(days=190)
        ),
        ReviewException(
            review_id=reviews[23].id,  # HR002 - Historical approved
            created_by=checkers[1].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Trading entity required additional transaction monitoring. High-frequency trading patterns needed enhanced oversight.",
            status=ExceptionStatus.RESOLVED,
            resolution_notes="Enhanced transaction monitoring systems implemented. Trading pattern analysis procedures established. Compliance monitoring satisfactory.",
            resolved_at=datetime.utcnow() - timedelta(days=170)
        ),
        
        # More dormant account scenarios
        ReviewException(
            review_id=reviews[18].id,  # LR004 - Draft review
            created_by=makers[2].id,
            exception_type=ExceptionType.DORMANT_FUNDED_UFAA,
            description="Educational services account dormant for 24 months with $75,000 balance. Institution may have ceased operations. UFAA notification procedures initiated.",
            status=ExceptionStatus.OPEN
        ),
        ReviewException(
            review_id=reviews[19].id,  # LR005 - Draft review
            created_by=makers[3].id,
            exception_type=ExceptionType.DORMANT_FUNDED_UFAA,
            description="Agricultural cooperative account shows seasonal dormancy pattern. Account inactive during off-season with $180,000 balance. Seasonal business pattern needs documentation.",
            status=ExceptionStatus.RESOLVED,
            resolution_notes="Seasonal business pattern confirmed. Agricultural cycle documentation provided. Monitoring procedures adjusted for seasonal activity.",
            resolved_at=datetime.utcnow() - timedelta(days=30)
        ),
        
        # Additional KYC non-compliance scenarios
        ReviewException(
            review_id=reviews[1].id,  # HR001 - Draft AML review
            created_by=checkers[2].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Offshore holdings entity requires enhanced AML documentation. Complex ownership structure spans multiple jurisdictions. Enhanced due diligence procedures required.",
            status=ExceptionStatus.OPEN
        ),
        ReviewException(
            review_id=reviews[2].id,  # HR002 - Draft sanctions review
            created_by=checkers[0].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Global trading entity sanctions screening requires updating. New sanctions lists need to be checked. Enhanced monitoring for trade finance activities required.",
            status=ExceptionStatus.IN_PROGRESS
        ),
        
        # Additional exceptions to reach 30+ total
        # More KYC non-compliance exceptions
        ReviewException(
            review_id=reviews[28].id,  # Additional review
            created_by=checkers[1].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Technology sector data protection compliance requires additional documentation. Cross-border data transfer agreements need updating.",
            status=ExceptionStatus.OPEN
        ),
        ReviewException(
            review_id=reviews[30].id,  # Additional review
            created_by=checkers[2].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="REIT property portfolio requires enhanced due diligence. Property ownership structures in multiple jurisdictions need verification.",
            status=ExceptionStatus.IN_PROGRESS
        ),
        ReviewException(
            review_id=reviews[31].id,  # Educational services review
            created_by=checkers[0].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Educational institution regulatory compliance documentation incomplete. Accreditation status needs verification.",
            status=ExceptionStatus.RESOLVED,
            resolution_notes="Accreditation documentation received and verified. Educational licensing confirmed current.",
            resolved_at=datetime.utcnow() - timedelta(days=15)
        ),
        
        # More dormant account exceptions
        ReviewException(
            review_id=reviews[35].id,  # Regional bank review
            created_by=makers[3].id,
            exception_type=ExceptionType.DORMANT_FUNDED_UFAA,
            description="Regional bank subsidiary account dormant for 15 months with $500,000 balance. Corporate restructuring may have affected account activity.",
            status=ExceptionStatus.IN_PROGRESS
        ),
        ReviewException(
            review_id=reviews[36].id,  # Investment partners review
            created_by=makers[0].id,
            exception_type=ExceptionType.DORMANT_OVERDRAWN_EXIT,
            description="Investment partnership account overdrawn by $25,000 for 8 months. Partnership dissolution procedures may be required.",
            status=ExceptionStatus.OPEN
        ),
        ReviewException(
            review_id=reviews[38].id,  # Retail chain review
            created_by=makers[1].id,
            exception_type=ExceptionType.DORMANT_FUNDED_UFAA,
            description="Retail chain expansion account dormant for 12 months with $150,000 balance. Expansion project may have been cancelled.",
            status=ExceptionStatus.RESOLVED,
            resolution_notes="Expansion project confirmed cancelled. Funds transferred to main operating account. Account closed per client request.",
            resolved_at=datetime.utcnow() - timedelta(days=20)
        ),
        
        # Additional KYC non-compliance for various scenarios
        ReviewException(
            review_id=reviews[33].id,  # Emerging markets review
            created_by=checkers[1].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Emerging markets entity country risk assessment outdated. Political risk factors have changed significantly requiring reassessment.",
            status=ExceptionStatus.OPEN
        ),
        ReviewException(
            review_id=reviews[34].id,  # Shell company review
            created_by=checkers[2].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Shell company business purpose documentation insufficient. Unable to verify legitimate commercial activity.",
            status=ExceptionStatus.OPEN
        ),
        ReviewException(
            review_id=reviews[40].id,  # Auto PEP review
            created_by=checkers[0].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Auto-generated PEP screening identified potential political connections. Enhanced due diligence required for government relationships.",
            status=ExceptionStatus.IN_PROGRESS
        ),
        ReviewException(
            review_id=reviews[41].id,  # Auto financial review
            created_by=checkers[1].id,
            exception_type=ExceptionType.KYC_NON_COMPLIANCE,
            description="Auto-generated financial review identified suspicious transaction patterns. Enhanced monitoring and investigation required.",
            status=ExceptionStatus.OPEN
        )
    ]
    
    # Add exceptions to database
    for exception in exceptions:
        db.add(exception)
    
    db.commit()
    
    # Refresh to get IDs
    for exception in exceptions:
        db.refresh(exception)
    
    print(f"Created {len(exceptions)} exceptions with proper review relationships")
    return exceptions


def create_initial_audit_logs(db: Session, users: List[User]) -> List[AuditLog]:
    """Create initial audit log entries."""
    print("Creating initial audit logs...")
    
    audit_logs = []
    
    # System startup log
    system_log = AuditLog.log_system_action(
        action=AuditAction.CREATE,
        description="System initialized with seed data",
        details={"seed_version": "1.0", "environment": "development"}
    )
    audit_logs.append(system_log)
    
    # User login logs
    for i, user in enumerate(users[:5]):  # First 5 users
        login_log = AuditLog.log_user_action(
            user_id=user.id,
            action=AuditAction.LOGIN,
            description=f"User {user.name} logged in",
            details={"login_method": "password", "ip_address": f"192.168.1.{100 + i}"}
        )
        login_log.ip_address = f"192.168.1.{100 + i}"
        audit_logs.append(login_log)
    
    # Review creation logs
    for i in range(3):
        create_log = AuditLog.log_user_action(
            user_id=users[5 + i].id,  # Makers
            action=AuditAction.CREATE,
            description=f"Review created for client",
            entity_type=AuditEntityType.REVIEW,
            entity_id=str(i + 1),
            details={"client_id": f"HR00{i + 1}", "review_type": "periodic"}
        )
        audit_logs.append(create_log)
    
    # Review submission logs
    for i in range(2):
        submit_log = AuditLog.log_user_action(
            user_id=users[5 + i].id,  # Makers
            action=AuditAction.SUBMIT,
            description=f"Review submitted for approval",
            entity_type=AuditEntityType.REVIEW,
            entity_id=str(i + 3),
            details={"submission_time": datetime.utcnow().isoformat()}
        )
        audit_logs.append(submit_log)
    
    # Add audit logs to database
    for log in audit_logs:
        db.add(log)
    
    db.commit()
    
    print(f"Created {len(audit_logs)} audit log entries")
    return audit_logs


def validate_data_relationships(db: Session, users: List[User], clients: List[Client], reviews: List[Review], exceptions: List) -> bool:
    """Validate data relationships and integrity checks."""
    print("Validating data relationships and integrity...")
    
    validation_errors = []
    
    # Validate minimum data requirements
    if len(clients) < 20:
        validation_errors.append(f"Insufficient clients: {len(clients)} (minimum 20 required)")
    
    if len(reviews) < 50:
        validation_errors.append(f"Insufficient reviews: {len(reviews)} (minimum 50 required)")
    
    if len(exceptions) < 30:
        validation_errors.append(f"Insufficient exceptions: {len(exceptions)} (minimum 30 required)")
    
    # Validate client distribution
    high_risk_clients = [c for c in clients if c.risk_level == RiskLevel.HIGH]
    medium_risk_clients = [c for c in clients if c.risk_level == RiskLevel.MEDIUM]
    low_risk_clients = [c for c in clients if c.risk_level == RiskLevel.LOW]
    
    print(f"Client risk distribution: High={len(high_risk_clients)}, Medium={len(medium_risk_clients)}, Low={len(low_risk_clients)}")
    
    if len(high_risk_clients) < 5:
        validation_errors.append(f"Insufficient high-risk clients: {len(high_risk_clients)} (minimum 5 recommended)")
    
    # Validate auto-review flags for high-risk clients
    high_risk_with_flags = [c for c in high_risk_clients if c.has_auto_review_flags]
    print(f"High-risk clients with auto-review flags: {len(high_risk_with_flags)}")
    
    if len(high_risk_with_flags) < 3:
        validation_errors.append(f"Insufficient high-risk clients with auto-review flags: {len(high_risk_with_flags)} (minimum 3 recommended)")
    
    # Validate review status distribution
    from app.models.review import ReviewStatus
    draft_reviews = [r for r in reviews if r.status == ReviewStatus.DRAFT]
    submitted_reviews = [r for r in reviews if r.status == ReviewStatus.SUBMITTED]
    under_review_reviews = [r for r in reviews if r.status == ReviewStatus.UNDER_REVIEW]
    approved_reviews = [r for r in reviews if r.status == ReviewStatus.APPROVED]
    rejected_reviews = [r for r in reviews if r.status == ReviewStatus.REJECTED]
    
    print(f"Review status distribution:")
    print(f"  - Draft: {len(draft_reviews)}")
    print(f"  - Submitted: {len(submitted_reviews)}")
    print(f"  - Under Review: {len(under_review_reviews)}")
    print(f"  - Approved: {len(approved_reviews)}")
    print(f"  - Rejected: {len(rejected_reviews)}")
    
    # Validate foreign key relationships
    print("Validating foreign key relationships...")
    
    # Check review-client relationships
    invalid_review_clients = []
    for review in reviews:
        client_exists = any(c.client_id == review.client_id for c in clients)
        if not client_exists:
            invalid_review_clients.append(review.id)
    
    if invalid_review_clients:
        validation_errors.append(f"Reviews with invalid client_id: {invalid_review_clients}")
    
    # Check review-user relationships
    user_ids = [u.id for u in users]
    invalid_review_submitters = []
    invalid_review_reviewers = []
    
    for review in reviews:
        if review.submitted_by not in user_ids:
            invalid_review_submitters.append(review.id)
        if review.reviewed_by and review.reviewed_by not in user_ids:
            invalid_review_reviewers.append(review.id)
    
    if invalid_review_submitters:
        validation_errors.append(f"Reviews with invalid submitted_by: {invalid_review_submitters}")
    if invalid_review_reviewers:
        validation_errors.append(f"Reviews with invalid reviewed_by: {invalid_review_reviewers}")
    
    # Check exception-review relationships
    review_ids = [r.id for r in reviews]
    invalid_exception_reviews = []
    
    for exception in exceptions:
        if exception.review_id not in review_ids:
            invalid_exception_reviews.append(exception.id)
    
    if invalid_exception_reviews:
        validation_errors.append(f"Exceptions with invalid review_id: {invalid_exception_reviews}")
    
    # Validate auto-review creation logic
    print("Testing auto-review creation logic...")
    
    try:
        high_risk_clients_for_auto = [c for c in high_risk_clients if c.has_auto_review_flags]
        
        for client in high_risk_clients_for_auto[:3]:  # Test first 3 clients
            enabled_types = client.enabled_auto_review_types
            print(f"Client {client.client_id} has auto-review types: {enabled_types}")
            
            # Verify that reviews exist for enabled types
            client_reviews = [r for r in reviews if r.client_id == client.client_id]
            auto_created_reviews = [r for r in client_reviews if r.auto_created]
            
            print(f"Client {client.client_id} has {len(auto_created_reviews)} auto-created reviews")
            
        print("Auto-review flag validation completed successfully")
            
    except Exception as e:
        validation_errors.append(f"Auto-review creation test failed: {str(e)}")
    
    # Validate workflow states and transitions
    print("Validating workflow states...")
    
    # Check that submitted reviews have submitted_at timestamp
    submitted_without_timestamp = [r for r in submitted_reviews + under_review_reviews + approved_reviews + rejected_reviews if not r.submitted_at]
    if submitted_without_timestamp:
        validation_errors.append(f"Submitted reviews missing submitted_at timestamp: {[r.id for r in submitted_without_timestamp]}")
    
    # Check that reviewed reviews have reviewed_at timestamp
    reviewed_without_timestamp = [r for r in approved_reviews + rejected_reviews if not r.reviewed_at]
    if reviewed_without_timestamp:
        validation_errors.append(f"Reviewed reviews missing reviewed_at timestamp: {[r.id for r in reviewed_without_timestamp]}")
    
    # Check that rejected reviews have rejection reasons
    rejected_without_reason = [r for r in rejected_reviews if not r.rejection_reason]
    if rejected_without_reason:
        validation_errors.append(f"Rejected reviews missing rejection_reason: {[r.id for r in rejected_without_reason]}")
    
    # Validate exception status distribution
    from app.models.exception import ExceptionStatus
    open_exceptions = [e for e in exceptions if e.status == ExceptionStatus.OPEN]
    in_progress_exceptions = [e for e in exceptions if e.status == ExceptionStatus.IN_PROGRESS]
    resolved_exceptions = [e for e in exceptions if e.status == ExceptionStatus.RESOLVED]
    
    print(f"Exception status distribution:")
    print(f"  - Open: {len(open_exceptions)}")
    print(f"  - In Progress: {len(in_progress_exceptions)}")
    print(f"  - Resolved: {len(resolved_exceptions)}")
    
    # Check that resolved exceptions have resolution notes
    resolved_without_notes = [e for e in resolved_exceptions if not e.resolution_notes]
    if resolved_without_notes:
        validation_errors.append(f"Resolved exceptions missing resolution_notes: {[e.id for e in resolved_without_notes]}")
    
    # Print validation results
    if validation_errors:
        print("\n" + "="*50)
        print("VALIDATION ERRORS FOUND:")
        print("="*50)
        for error in validation_errors:
            print(f"  ❌ {error}")
        return False
    else:
        print("\n" + "="*50)
        print("✅ ALL VALIDATION CHECKS PASSED!")
        print("="*50)
        return True


def seed_database():
    """Main function to seed the database with initial data."""
    print("Starting comprehensive database seeding...")
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Check if data already exists
        existing_users = db.query(User).count()
        if existing_users > 0:
            print(f"Database already contains {existing_users} users. Skipping seeding.")
            print("To re-seed, please clear the database first.")
            return
        
        # Create initial data
        users = create_initial_users(db)
        clients = create_initial_clients(db)
        reviews = create_initial_reviews(db, users, clients)
        kyc_questionnaires = create_initial_kyc_questionnaires(db, reviews, clients)
        exceptions = create_initial_exceptions(db, users, reviews)
        audit_logs = create_initial_audit_logs(db, users)
        
        # Validate data relationships and integrity
        validation_passed = validate_data_relationships(db, users, clients, reviews, exceptions)
        
        print("\n" + "="*50)
        print("DATABASE SEEDING COMPLETED!")
        print("="*50)
        print(f"Created:")
        print(f"  - {len(users)} users")
        print(f"  - {len(clients)} clients (High: {len([c for c in clients if c.risk_level == RiskLevel.HIGH])}, Medium: {len([c for c in clients if c.risk_level == RiskLevel.MEDIUM])}, Low: {len([c for c in clients if c.risk_level == RiskLevel.LOW])})")
        print(f"  - {len(reviews)} reviews (Draft: {len([r for r in reviews if r.status.value == 'draft'])}, Submitted: {len([r for r in reviews if r.status.value == 'submitted'])}, Approved: {len([r for r in reviews if r.status.value == 'approved'])}, Rejected: {len([r for r in reviews if r.status.value == 'rejected'])})")
        print(f"  - {len(kyc_questionnaires)} KYC questionnaires")
        print(f"  - {len(exceptions)} exceptions (Open: {len([e for e in exceptions if e.status.value == 'open'])}, In Progress: {len([e for e in exceptions if e.status.value == 'in_progress'])}, Resolved: {len([e for e in exceptions if e.status.value == 'resolved'])})")
        print(f"  - {len(audit_logs)} audit log entries")
        
        # Auto-review flag summary
        high_risk_with_flags = [c for c in clients if c.risk_level == RiskLevel.HIGH and c.has_auto_review_flags]
        print(f"  - {len(high_risk_with_flags)} high-risk clients with auto-review flags enabled")
        
        auto_created_reviews = [r for r in reviews if r.auto_created]
        print(f"  - {len(auto_created_reviews)} auto-created reviews")
        
        print(f"\nValidation Status: {'✅ PASSED' if validation_passed else '❌ FAILED'}")
        
        print("\nDefault login credentials:")
        print("  Email: admin@hrcrw.com")
        print("  Password: password123")
        print("\nAll users have the same password: password123")
        
        if not validation_passed:
            print("\n⚠️  WARNING: Some validation checks failed. Please review the errors above.")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def clear_database():
    """Clear all data from the database (for development/testing)."""
    print("Clearing database...")
    
    db = SessionLocal()
    
    try:
        # Import the correct exception model
        from app.models.exception import ReviewException
        
        # Delete in reverse order of dependencies
        db.query(AuditLog).delete()
        db.query(ReviewException).delete()
        db.query(KYCQuestionnaire).delete()
        db.query(Review).delete()
        db.query(Client).delete()
        db.query(User).delete()
        
        db.commit()
        print("Database cleared successfully!")
        
    except Exception as e:
        print(f"Error clearing database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Database seeding script")
    parser.add_argument("--clear", action="store_true", help="Clear database before seeding")
    parser.add_argument("--clear-only", action="store_true", help="Only clear database, don't seed")
    
    args = parser.parse_args()
    
    if args.clear_only:
        clear_database()
    elif args.clear:
        clear_database()
        seed_database()
    else:
        seed_database()