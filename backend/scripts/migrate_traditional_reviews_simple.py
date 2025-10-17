#!/usr/bin/env python3
"""
Simple migration script to convert traditional reviews to KYC questionnaire format.
Designed for SQLite local development with better error handling.
"""

import sys
import os
import traceback

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def main():
    """Main migration function with comprehensive error handling."""
    
    print("🚀 KYC Migration Script for SQLite")
    print("=" * 50)
    
    try:
        # Load environment variables first
        from dotenv import load_dotenv
        load_dotenv()
        
        # Import after path setup and env loading
        from app.core.config import settings
        print(f"✅ Loaded settings - Database: {settings.DATABASE_URL}")
        
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        print("✅ SQLAlchemy imported successfully")
        
        from app.models.review import Review
        from app.models.kyc_questionnaire import KYCQuestionnaire, YesNoNA, YesNo
        print("✅ Models imported successfully")
        
        # Create database connection
        engine = create_engine(settings.DATABASE_URL, echo=False)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        print("✅ Database connection established")
        
        # Check current state
        total_reviews = db.query(Review).count()
        total_kyc = db.query(KYCQuestionnaire).count()
        
        print(f"\n📊 Current Database State:")
        print(f"   Total reviews: {total_reviews}")
        print(f"   Total KYC questionnaires: {total_kyc}")
        
        if total_reviews == 0:
            print("⚠️  No reviews found in database. Nothing to migrate.")
            return
        
        # Find reviews without KYC questionnaires
        all_reviews = db.query(Review).all()
        existing_kyc_review_ids = {kyc.review_id for kyc in db.query(KYCQuestionnaire).all()}
        reviews_without_kyc = [review for review in all_reviews if review.id not in existing_kyc_review_ids]
        
        print(f"\n🔍 Migration Analysis:")
        print(f"   Reviews without KYC: {len(reviews_without_kyc)}")
        
        if len(reviews_without_kyc) == 0:
            print("✅ All reviews already have KYC questionnaires!")
            return
        
        # Show what we'll migrate
        print(f"\n📋 Reviews to migrate:")
        for review in reviews_without_kyc[:5]:  # Show first 5
            print(f"   - Review {review.id}: Client {review.client_id}, Status {review.status}")
        if len(reviews_without_kyc) > 5:
            print(f"   ... and {len(reviews_without_kyc) - 5} more")
        
        # Ask for confirmation
        response = input(f"\n❓ Proceed with migrating {len(reviews_without_kyc)} reviews? (y/N): ")
        if response.lower() != 'y':
            print("❌ Migration cancelled by user")
            return
        
        # Perform migration
        print(f"\n🔄 Starting migration...")
        migrated_count = 0
        
        for review in reviews_without_kyc:
            try:
                print(f"   Migrating Review {review.id}...", end="")
                
                # Extract information from comments field if available
                comments = review.comments or ""
                purpose = extract_purpose_from_comments(comments)
                remedial = extract_remedial_actions_from_comments(comments)
                
                # Create KYC questionnaire
                kyc_questionnaire = KYCQuestionnaire(
                    review_id=review.id,
                    purpose_of_account=purpose,
                    kyc_documents_complete=YesNoNA.YES,
                    missing_kyc_details=None,
                    account_purpose_aligned=YesNoNA.YES,
                    adverse_media_completed=YesNoNA.YES,
                    adverse_media_evidence=None,
                    senior_mgmt_approval=YesNo.YES,
                    pep_approval_obtained=YesNoNA.YES,
                    static_data_correct=YesNoNA.YES,
                    kyc_documents_valid=YesNoNA.YES,
                    regulated_business_license=YesNoNA.YES,
                    remedial_actions=remedial,
                    source_of_funds_docs=[]
                )
                
                db.add(kyc_questionnaire)
                migrated_count += 1
                print(" ✅")
                
            except Exception as e:
                print(f" ❌ Error: {e}")
                continue
        
        # Commit changes
        print(f"\n💾 Committing {migrated_count} changes...")
        db.commit()
        
        # Verify results
        final_kyc_count = db.query(KYCQuestionnaire).count()
        print(f"\n🎉 Migration completed!")
        print(f"   Migrated: {migrated_count} reviews")
        print(f"   Total KYC questionnaires now: {final_kyc_count}")
        
        if final_kyc_count == total_reviews:
            print("✅ All reviews now have KYC questionnaires!")
        else:
            print(f"⚠️  {total_reviews - final_kyc_count} reviews still missing KYC questionnaires")
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Make sure you're running this from the backend directory")
        print("💡 Try: cd backend && python scripts/migrate_traditional_reviews_simple.py")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        print(f"❌ Error type: {type(e).__name__}")
        print(f"❌ Traceback:")
        traceback.print_exc()
    finally:
        try:
            db.close()
        except:
            pass


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
    
    # If comments exist but no purpose found, use first meaningful line
    meaningful_lines = [line.strip() for line in lines if line.strip() and len(line.strip()) > 10]
    if meaningful_lines:
        return meaningful_lines[0][:500]
    
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


if __name__ == "__main__":
    main()