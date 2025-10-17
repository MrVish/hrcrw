#!/usr/bin/env python3
"""
Script to preserve existing document associations during migration.

This script ensures that all existing document-review associations remain intact
and creates backup records for safety during the enhanced client review system migration.
"""

import sys
import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class DocumentAssociationPreserver:
    """Preserves document associations during migration."""
    
    def __init__(self, database_url: str = None):
        """Initialize the document association preserver."""
        if database_url is None:
            settings = get_settings()
            database_url = settings.database_url
        
        self.engine = create_engine(database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def check_document_table_exists(self) -> bool:
        """Check if the documents table exists."""
        with self.SessionLocal() as db:
            try:
                result = db.execute(text("""
                    SELECT COUNT(*) as table_count 
                    FROM information_schema.tables 
                    WHERE table_name = 'documents' AND table_schema = 'public'
                """))
                return result.fetchone()[0] > 0
            except Exception as e:
                logger.error(f"Error checking document table existence: {str(e)}")
                return False
    
    def get_document_associations(self) -> List[Dict[str, Any]]:
        """
        Get all existing document-review associations.
        
        Returns:
            List of document association records
        """
        associations = []
        
        if not self.check_document_table_exists():
            logger.info("Documents table does not exist - no associations to preserve")
            return associations
        
        with self.SessionLocal() as db:
            try:
                result = db.execute(text("""
                    SELECT 
                        d.id as document_id,
                        d.review_id,
                        d.filename,
                        d.file_path,
                        d.file_size,
                        d.content_type,
                        d.uploaded_by,
                        d.created_at,
                        r.client_id,
                        r.status as review_status,
                        r.submitted_by,
                        r.reviewed_by
                    FROM documents d
                    LEFT JOIN reviews r ON d.review_id = r.id
                    WHERE d.review_id IS NOT NULL
                    ORDER BY d.created_at
                """))
                
                for row in result:
                    associations.append({
                        'document_id': row.document_id,
                        'review_id': row.review_id,
                        'filename': row.filename,
                        'file_path': row.file_path,
                        'file_size': row.file_size,
                        'content_type': row.content_type,
                        'uploaded_by': row.uploaded_by,
                        'created_at': row.created_at.isoformat() if row.created_at else None,
                        'client_id': row.client_id,
                        'review_status': row.review_status,
                        'submitted_by': row.submitted_by,
                        'reviewed_by': row.reviewed_by
                    })
                
                logger.info(f"Found {len(associations)} document associations")
                
            except Exception as e:
                logger.error(f"Error retrieving document associations: {str(e)}")
                raise
        
        return associations
    
    def create_backup_file(self, associations: List[Dict[str, Any]]) -> str:
        """
        Create a backup file of document associations.
        
        Args:
            associations: List of document association records
            
        Returns:
            Path to the backup file
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"document_associations_backup_{timestamp}.json"
        backup_path = os.path.join(os.path.dirname(__file__), backup_filename)
        
        backup_data = {
            'backup_created_at': datetime.now().isoformat(),
            'total_associations': len(associations),
            'associations': associations
        }
        
        try:
            with open(backup_path, 'w') as f:
                json.dump(backup_data, f, indent=2, default=str)
            
            logger.info(f"Created backup file: {backup_path}")
            return backup_path
            
        except Exception as e:
            logger.error(f"Error creating backup file: {str(e)}")
            raise
    
    def verify_associations_intact(self) -> Dict[str, Any]:
        """
        Verify that document associations are still intact after migration.
        
        Returns:
            Dictionary with verification results
        """
        verification_results = {
            'total_documents': 0,
            'documents_with_review_id': 0,
            'documents_without_review_id': 0,
            'orphaned_documents': 0,
            'valid_associations': 0,
            'verification_errors': []
        }
        
        if not self.check_document_table_exists():
            verification_results['verification_errors'].append("Documents table does not exist")
            return verification_results
        
        with self.SessionLocal() as db:
            try:
                # Count total documents
                result = db.execute(text("SELECT COUNT(*) FROM documents"))
                verification_results['total_documents'] = result.fetchone()[0]
                
                # Count documents with review_id
                result = db.execute(text("SELECT COUNT(*) FROM documents WHERE review_id IS NOT NULL"))
                verification_results['documents_with_review_id'] = result.fetchone()[0]
                
                # Count documents without review_id
                result = db.execute(text("SELECT COUNT(*) FROM documents WHERE review_id IS NULL"))
                verification_results['documents_without_review_id'] = result.fetchone()[0]
                
                # Count orphaned documents (review_id points to non-existent review)
                result = db.execute(text("""
                    SELECT COUNT(*) 
                    FROM documents d 
                    LEFT JOIN reviews r ON d.review_id = r.id 
                    WHERE d.review_id IS NOT NULL AND r.id IS NULL
                """))
                verification_results['orphaned_documents'] = result.fetchone()[0]
                
                # Count valid associations
                result = db.execute(text("""
                    SELECT COUNT(*) 
                    FROM documents d 
                    INNER JOIN reviews r ON d.review_id = r.id
                """))
                verification_results['valid_associations'] = result.fetchone()[0]
                
                logger.info("Document association verification completed")
                
            except Exception as e:
                error_msg = f"Error during verification: {str(e)}"
                logger.error(error_msg)
                verification_results['verification_errors'].append(error_msg)
        
        return verification_results
    
    def fix_orphaned_documents(self) -> int:
        """
        Fix orphaned documents by setting their review_id to NULL.
        
        Returns:
            Number of documents fixed
        """
        if not self.check_document_table_exists():
            logger.info("Documents table does not exist - no orphaned documents to fix")
            return 0
        
        with self.SessionLocal() as db:
            try:
                # Find orphaned documents
                result = db.execute(text("""
                    SELECT d.id, d.filename, d.review_id
                    FROM documents d 
                    LEFT JOIN reviews r ON d.review_id = r.id 
                    WHERE d.review_id IS NOT NULL AND r.id IS NULL
                """))
                
                orphaned_docs = result.fetchall()
                
                if not orphaned_docs:
                    logger.info("No orphaned documents found")
                    return 0
                
                logger.info(f"Found {len(orphaned_docs)} orphaned documents")
                
                # Fix orphaned documents by setting review_id to NULL
                for doc in orphaned_docs:
                    logger.warning(f"Fixing orphaned document: {doc.filename} (ID: {doc.id}, invalid review_id: {doc.review_id})")
                
                result = db.execute(text("""
                    UPDATE documents 
                    SET review_id = NULL 
                    WHERE id IN (
                        SELECT d.id 
                        FROM documents d 
                        LEFT JOIN reviews r ON d.review_id = r.id 
                        WHERE d.review_id IS NOT NULL AND r.id IS NULL
                    )
                """))
                
                fixed_count = result.rowcount
                db.commit()
                
                logger.info(f"Fixed {fixed_count} orphaned documents")
                return fixed_count
                
            except Exception as e:
                db.rollback()
                logger.error(f"Error fixing orphaned documents: {str(e)}")
                raise
    
    def get_association_statistics(self) -> Dict[str, Any]:
        """
        Get detailed statistics about document associations.
        
        Returns:
            Dictionary with association statistics
        """
        stats = {
            'total_documents': 0,
            'documents_by_content_type': {},
            'documents_by_review_status': {},
            'documents_by_month': {},
            'average_file_size': 0,
            'largest_file_size': 0,
            'statistics_errors': []
        }
        
        if not self.check_document_table_exists():
            stats['statistics_errors'].append("Documents table does not exist")
            return stats
        
        with self.SessionLocal() as db:
            try:
                # Total documents
                result = db.execute(text("SELECT COUNT(*) FROM documents"))
                stats['total_documents'] = result.fetchone()[0]
                
                # Documents by content type
                result = db.execute(text("""
                    SELECT content_type, COUNT(*) as count 
                    FROM documents 
                    GROUP BY content_type 
                    ORDER BY count DESC
                """))
                for row in result:
                    stats['documents_by_content_type'][row.content_type or 'unknown'] = row.count
                
                # Documents by review status
                result = db.execute(text("""
                    SELECT r.status, COUNT(d.id) as count 
                    FROM documents d 
                    LEFT JOIN reviews r ON d.review_id = r.id 
                    GROUP BY r.status 
                    ORDER BY count DESC
                """))
                for row in result:
                    stats['documents_by_review_status'][row.status or 'no_review'] = row.count
                
                # Documents by month
                result = db.execute(text("""
                    SELECT 
                        DATE_TRUNC('month', created_at) as month,
                        COUNT(*) as count 
                    FROM documents 
                    WHERE created_at IS NOT NULL
                    GROUP BY DATE_TRUNC('month', created_at) 
                    ORDER BY month DESC 
                    LIMIT 12
                """))
                for row in result:
                    month_str = row.month.strftime("%Y-%m") if row.month else 'unknown'
                    stats['documents_by_month'][month_str] = row.count
                
                # File size statistics
                result = db.execute(text("""
                    SELECT 
                        AVG(file_size) as avg_size,
                        MAX(file_size) as max_size
                    FROM documents 
                    WHERE file_size IS NOT NULL
                """))
                row = result.fetchone()
                if row:
                    stats['average_file_size'] = int(row.avg_size) if row.avg_size else 0
                    stats['largest_file_size'] = row.max_size or 0
                
                logger.info("Document association statistics generated")
                
            except Exception as e:
                error_msg = f"Error generating statistics: {str(e)}"
                logger.error(error_msg)
                stats['statistics_errors'].append(error_msg)
        
        return stats


def main():
    """Main execution function."""
    print("Enhanced Client Review System - Preserve Document Associations")
    print("=" * 65)
    
    try:
        preserver = DocumentAssociationPreserver()
        
        # Check if documents table exists
        print("\n1. Checking document table existence...")
        if not preserver.check_document_table_exists():
            print("   ⚠️  Documents table does not exist - no associations to preserve")
            return 0
        
        # Get current associations
        print("\n2. Retrieving document associations...")
        associations = preserver.get_document_associations()
        print(f"   Found {len(associations)} document associations")
        
        # Create backup
        print("\n3. Creating backup file...")
        backup_path = preserver.create_backup_file(associations)
        print(f"   Backup created: {backup_path}")
        
        # Verify associations
        print("\n4. Verifying associations...")
        verification = preserver.verify_associations_intact()
        print(f"   Total documents: {verification['total_documents']}")
        print(f"   Documents with review ID: {verification['documents_with_review_id']}")
        print(f"   Documents without review ID: {verification['documents_without_review_id']}")
        print(f"   Orphaned documents: {verification['orphaned_documents']}")
        print(f"   Valid associations: {verification['valid_associations']}")
        
        # Fix orphaned documents if any
        if verification['orphaned_documents'] > 0:
            print("\n5. Fixing orphaned documents...")
            fixed_count = preserver.fix_orphaned_documents()
            print(f"   Fixed {fixed_count} orphaned documents")
        
        # Show statistics
        print("\n6. Document association statistics:")
        stats = preserver.get_association_statistics()
        
        print(f"   Total documents: {stats['total_documents']}")
        print(f"   Average file size: {stats['average_file_size']:,} bytes")
        print(f"   Largest file size: {stats['largest_file_size']:,} bytes")
        
        if stats['documents_by_content_type']:
            print("\n   Documents by content type:")
            for content_type, count in stats['documents_by_content_type'].items():
                print(f"     {content_type}: {count}")
        
        if stats['documents_by_review_status']:
            print("\n   Documents by review status:")
            for status, count in stats['documents_by_review_status'].items():
                print(f"     {status}: {count}")
        
        # Check for errors
        all_errors = verification['verification_errors'] + stats['statistics_errors']
        if all_errors:
            print("\n⚠️  Errors encountered:")
            for error in all_errors:
                print(f"   - {error}")
            return 1
        
        print("\n✅ Document associations preserved successfully!")
        return 0
        
    except Exception as e:
        print(f"\n❌ Error preserving document associations: {str(e)}")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)