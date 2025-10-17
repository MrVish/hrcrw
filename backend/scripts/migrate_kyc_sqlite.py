#!/usr/bin/env python3
"""
SQLite-specific migration script to convert traditional reviews to KYC questionnaire format.
This version directly uses the SQLite database file without relying on .env loading.
"""

import sys
import os
import traceback
import sqlite3

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def main():
    """Main migration function with direct SQLite access."""
    
    print("🚀 KYC Migration Script for SQLite (Direct)")
    print("=" * 50)
    
    # Direct SQLite database path
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "hrcrw_dev.db")
    
    if not os.path.exists(db_path):
        print(f"❌ Database file not found: {db_path}")
        print("💡 Make sure you're running this from the correct directory")
        return
    
    print(f"✅ Found database: {db_path}")
    
    try:
        # Connect to SQLite database directly
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        print("✅ Connected to SQLite database")
        
        # Check current state
        cursor.execute("SELECT COUNT(*) FROM reviews")
        total_reviews = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM kyc_questionnaires")
        total_kyc = cursor.fetchone()[0]
        
        print(f"\n📊 Current Database State:")
        print(f"   Total reviews: {total_reviews}")
        print(f"   Total KYC questionnaires: {total_kyc}")
        
        if total_reviews == 0:
            print("⚠️  No reviews found in database. Nothing to migrate.")
            return
        
        # Find reviews without KYC questionnaires
        cursor.execute("""
            SELECT r.id, r.client_id, r.status, r.comments 
            FROM reviews r 
            LEFT JOIN kyc_questionnaires k ON r.id = k.review_id 
            WHERE k.review_id IS NULL
        """)
        reviews_without_kyc = cursor.fetchall()
        
        print(f"\n🔍 Migration Analysis:")
        print(f"   Reviews without KYC: {len(reviews_without_kyc)}")
        
        if len(reviews_without_kyc) == 0:
            print("✅ All reviews already have KYC questionnaires!")
            return
        
        # Show what we'll migrate
        print(f"\n📋 Reviews to migrate:")
        for review in reviews_without_kyc[:5]:  # Show first 5
            review_id, client_id, status, comments = review
            print(f"   - Review {review_id}: Client {client_id}, Status {status}")
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
                review_id, client_id, status, comments = review
                print(f"   Migrating Review {review_id}...", end="")
                
                # Extract information from comments field if available
                comments = comments or ""
                purpose = extract_purpose_from_comments(comments)
                remedial = extract_remedial_actions_from_comments(comments)
                
                # Insert KYC questionnaire
                cursor.execute("""
                    INSERT INTO kyc_questionnaires (
                        review_id, purpose_of_account, kyc_documents_complete,
                        account_purpose_aligned, adverse_media_completed,
                        senior_mgmt_approval, pep_approval_obtained,
                        static_data_correct, kyc_documents_valid,
                        regulated_business_license, remedial_actions,
                        source_of_funds_docs, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                """, (
                    review_id,
                    purpose,
                    'yes',  # kyc_documents_complete
                    'yes',  # account_purpose_aligned
                    'yes',  # adverse_media_completed
                    'yes',  # senior_mgmt_approval
                    'yes',  # pep_approval_obtained
                    'yes',  # static_data_correct
                    'yes',  # kyc_documents_valid
                    'yes',  # regulated_business_license
                    remedial,
                    '[]'    # source_of_funds_docs (empty JSON array)
                ))
                
                migrated_count += 1
                print(" ✅")
                
            except Exception as e:
                print(f" ❌ Error: {e}")
                continue
        
        # Commit changes
        print(f"\n💾 Committing {migrated_count} changes...")
        conn.commit()
        
        # Verify results
        cursor.execute("SELECT COUNT(*) FROM kyc_questionnaires")
        final_kyc_count = cursor.fetchone()[0]
        
        print(f"\n🎉 Migration completed!")
        print(f"   Migrated: {migrated_count} reviews")
        print(f"   Total KYC questionnaires now: {final_kyc_count}")
        
        if final_kyc_count == total_reviews:
            print("✅ All reviews now have KYC questionnaires!")
        else:
            print(f"⚠️  {total_reviews - final_kyc_count} reviews still missing KYC questionnaires")
        
        # Show sample data
        cursor.execute("""
            SELECT r.id, r.client_id, r.status, 
                   CASE WHEN k.review_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_kyc
            FROM reviews r 
            LEFT JOIN kyc_questionnaires k ON r.id = k.review_id 
            LIMIT 5
        """)
        sample_data = cursor.fetchall()
        
        print(f"\n📋 Sample data after migration:")
        for row in sample_data:
            review_id, client_id, status, has_kyc = row
            print(f"   Review {review_id}: Client {client_id}, Status {status}, KYC: {has_kyc}")
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        print(f"❌ Error type: {type(e).__name__}")
        print(f"❌ Traceback:")
        traceback.print_exc()
    finally:
        try:
            conn.close()
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