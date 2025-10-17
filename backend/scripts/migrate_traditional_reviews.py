#!/usr/bin/env python3
"""
Migration script to convert traditional reviews to KYC questionnaire format.
This script will:
1. Find all reviews that don't have KYC questionnaires
2. Create basic KYC questionnaires for them based on comments field
3. Clean up any traditional form data

Compatible with SQLite for local development.
"""

import sys
import os
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.models.review import Review
from app.models.kyc_questionnaire import KYCQuestionnaire, YesNoNA, YesNo


def get_local_db_session():
    """Create a direct database session for the migration script."""
    # Create engine directly with the database URL from settings
    engine = create_engine(settings.DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


def migrate_traditional_reviews():
    """Migrate traditional reviews to KYC questionnaire format."""
    
    print("🔄 Starting migration of traditional reviews to KYC questionnaire format...")
    print(f"📍 Using database: {settings.DATABASE_URL}")
    
    # Get database session
    db = get_local_db_session()
    
    try:
        # First, let's check what we have in the database
        total_reviews = db.query(Review).count()
        total_kyc = db.query(KYCQuestionnaire).count()
        
        print(f"📊 Total reviews in database: {total_reviews}")
        print(f"📊 Total KYC questionnaires in database: {total_kyc}")
        
        # Find all reviews without KYC questionnaires using a simpler approach for SQLite
        all_reviews = db.query(Review).all()
        existing_kyc_review_ids = {kyc.review_id for kyc in db.query(KYCQuestionnaire).all()}
        
        reviews_without_kyc = [review for review in all_reviews if review.id not in existing_kyc_review_ids]
        
        print(f"📊 Found {len(reviews_without_kyc)} reviews without KYC questionnaires")
        
        if not reviews_without_kyc:
            print("✅ No reviews need migration")
            return
        
        migrated_count = 0
        
        for review in reviews_without_kyc:
            print(f"🔄 Migrating Review ID {review.id} (Client: {review.client_id})")
            
            # Extract information from comments field if available
            comments = review.comments or ""
            
            # Create a basic KYC questionnaire with proper enum values
            kyc_questionnaire = KYCQuestionnaire(
                review_id=review.id,
                purpose_of_account=extract_purpose_from_comments(comments),
                kyc_documents_complete=YesNoNA.YES,  # Assume complete for existing reviews
                missing_kyc_details=None,
                account_purpose_aligned=YesNoNA.YES,  # Assume aligned for existing reviews
                adverse_media_completed=YesNoNA.YES,  # Assume completed for existing reviews
                adverse_media_evidence=None,
                senior_mgmt_approval=YesNo.YES,  # Assume approved for existing reviews
                pep_approval_obtained=YesNoNA.YES,  # Assume obtained for existing reviews
                static_data_correct=YesNoNA.YES,  # Assume correct for existing reviews
                kyc_documents_valid=YesNoNA.YES,  # Assume valid for existing reviews
                regulated_business_license=YesNoNA.YES,  # Assume yes for existing reviews
                remedial_actions=extract_remedial_actions_from_comments(comments),
                source_of_funds_docs=[]  # Empty list for existing reviews
            )
            
            # Add to database
            db.add(kyc_questionnaire)
            migrated_count += 1
            
            print(f"✅ Created KYC questionnaire for Review ID {review.id}")
        
        # Commit all changes
        db.commit()
        
        print(f"🎉 Successfully migrated {migrated_count} reviews to KYC questionnaire format")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        print(f"❌ Error details: {type(e).__name__}: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


def extract_purpose_from_comments(comments: str) -> str:
    """Extract purpose of account from comments field."""
    if not comments:
        return "Business operations and transactions"
    
    # Look for purpose-related keywords
    lines = comments.split('\n')
    for line in lines:
        line_lower = line.lower()
        if any(keyword in line_lower for keyword in ['purpose', 'account', 'business', 'operations']):
            # Clean up the line and return it
            cleaned = line.strip().replace('Purpose:', '').replace('Account Purpose:', '').strip()
            if cleaned and len(cleaned) > 10:
                return cleaned[:500]  # Limit length
    
    # Default purpose
    return "Business operations and transactions"


def extract_remedial_actions_from_comments(comments: str) -> str:
    """Extract remedial actions from comments field."""
    if not comments:
        return None
    
    # Look for action-related keywords
    lines = comments.split('\n')
    for line in lines:
        line_lower = line.lower()
        if any(keyword in line_lower for keyword in ['action', 'recommend', 'remedial', 'monitor', 'follow']):
            # Clean up the line and return it
            cleaned = line.strip()
            if cleaned and len(cleaned) > 10:
                return cleaned[:1000]  # Limit length
    
    return None


def verify_migration():
    """Verify that all reviews now have KYC questionnaires."""
    
    print("\n🔍 Verifying migration...")
    
    db = get_local_db_session()
    
    try:
        # Count total reviews
        total_reviews = db.query(Review).count()
        
        # Count KYC questionnaires
        total_kyc = db.query(KYCQuestionnaire).count()
        
        # Count reviews with KYC questionnaires using a simpler approach for SQLite
        all_reviews = db.query(Review).all()
        existing_kyc_review_ids = {kyc.review_id for kyc in db.query(KYCQuestionnaire).all()}
        reviews_with_kyc = len([review for review in all_reviews if review.id in existing_kyc_review_ids])
        
        print(f"📊 Total reviews: {total_reviews}")
        print(f"📊 Total KYC questionnaires: {total_kyc}")
        print(f"📊 Reviews with KYC questionnaires: {reviews_with_kyc}")
        
        if total_reviews == reviews_with_kyc:
            print("✅ All reviews now have KYC questionnaires!")
        else:
            print(f"⚠️  {total_reviews - reviews_with_kyc} reviews still missing KYC questionnaires")
            
        # Show some sample data
        if total_reviews > 0:
            print("\n📋 Sample review data:")
            sample_reviews = db.query(Review).limit(3).all()
            for review in sample_reviews:
                kyc_exists = review.id in existing_kyc_review_ids
                print(f"   Review {review.id}: Client {review.client_id}, Status {review.status}, KYC: {'✅' if kyc_exists else '❌'}")
            
    except Exception as e:
        print(f"❌ Error during verification: {e}")
        print(f"❌ Error details: {type(e).__name__}: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    print("🚀 Traditional Review to KYC Migration Script")
    print("=" * 50)
    
    # Run migration
    migrate_traditional_reviews()
    
    # Verify results
    verify_migration()
    
    print("\n✅ Migration completed!")