#!/usr/bin/env python3
"""
Data migration script for Enhanced Client Review System.

This script migrates existing data to maintain compatibility with the new
enhanced client review system while preserving all existing functionality.
"""

import sys
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
import logging

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.models.client import Client, AMLRiskLevel
from app.models.review import Review, ReviewStatus
from app.models.user import User

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class DataMigrator:
    """Handles data migration for enhanced client review system."""
    
    def __init__(self, database_url: Optional[str] = None):
        """Initialize the data migrator."""
        if database_url is None:
            settings = get_settings()
            database_url = settings.database_url
        
        self.engine = create_engine(database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.migration_stats = {
            'clients_updated': 0,
            'reviews_processed': 0,
            'documents_preserved': 0,
            'errors': []
        }
    
    def run_migration(self) -> Dict[str, Any]:
        """
        Run the complete data migration process.
        
        Returns:
            Dictionary containing migration statistics
        """
        logger.info("Starting Enhanced Client Review System data migration...")
        
        try:
            with self.SessionLocal() as db:
                # Step 1: Set default values for new client fields
                self._migrate_client_defaults(db)
                
                # Step 2: Preserve existing review data
                self._preserve_review_data(db)
                
                # Step 3: Ensure document associations remain intact
                self._verify_document_associations(db)
                
                # Step 4: Create backward compatibility records
                self._create_compatibility_records(db)
                
                db.commit()
                logger.info("Migration completed successfully!")
                
        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            self.migration_stats['errors'].append(str(e))
            raise
        
        return self.migration_stats
    
    def _migrate_client_defaults(self, db) -> None:
        """Set default values for new client fields."""
        logger.info("Setting default values for enhanced client fields...")
        
        try:
            # Get all clients that don't have the new fields set
            clients = db.query(Client).filter(
                (Client.domicile_branch.is_(None)) |
                (Client.relationship_manager.is_(None)) |
                (Client.business_unit.is_(None)) |
                (Client.aml_risk.is_(None))
            ).all()
            
            for client in clients:
                # Set default values based on existing data
                if client.domicile_branch is None:
                    client.domicile_branch = self._determine_default_branch(client)
                
                if client.relationship_manager is None:
                    client.relationship_manager = self._determine_default_rm(client)
                
                if client.business_unit is None:
                    client.business_unit = self._determine_default_business_unit(client)
                
                if client.aml_risk is None:
                    client.aml_risk = self._determine_default_aml_risk(client)
                
                self.migration_stats['clients_updated'] += 1
            
            logger.info(f"Updated {len(clients)} clients with default values")
            
        except Exception as e:
            logger.error(f"Error migrating client defaults: {str(e)}")
            raise
    
    def _determine_default_branch(self, client: Client) -> str:
        """Determine default domicile branch based on client country."""
        country_branch_mapping = {
            'US': 'New York Branch',
            'UK': 'London Branch',
            'SG': 'Singapore Branch',
            'HK': 'Hong Kong Branch',
            'AU': 'Sydney Branch',
            'CA': 'Toronto Branch',
            'DE': 'Frankfurt Branch',
            'FR': 'Paris Branch',
            'JP': 'Tokyo Branch',
            'CH': 'Zurich Branch'
        }
        
        return country_branch_mapping.get(client.country, 'Main Branch')
    
    def _determine_default_rm(self, client: Client) -> str:
        """Determine default relationship manager based on client risk level."""
        if client.risk_level.value == 'high':
            return 'Senior RM - High Risk'
        elif client.risk_level.value == 'medium':
            return 'Standard RM - Medium Risk'
        else:
            return 'Junior RM - Low Risk'
    
    def _determine_default_business_unit(self, client: Client) -> str:
        """Determine default business unit based on client characteristics."""
        if client.risk_level.value == 'high':
            return 'Private Banking'
        else:
            return 'Commercial Banking'
    
    def _determine_default_aml_risk(self, client: Client) -> AMLRiskLevel:
        """Determine default AML risk based on existing risk level."""
        risk_mapping = {
            'low': AMLRiskLevel.LOW,
            'medium': AMLRiskLevel.MEDIUM,
            'high': AMLRiskLevel.HIGH
        }
        
        return risk_mapping.get(client.risk_level.value, AMLRiskLevel.MEDIUM)
    
    def _preserve_review_data(self, db) -> None:
        """Preserve existing review data and ensure compatibility."""
        logger.info("Preserving existing review data...")
        
        try:
            # Get all existing reviews
            reviews = db.query(Review).all()
            
            for review in reviews:
                # Ensure review has proper status
                if review.status is None:
                    review.status = ReviewStatus.DRAFT
                
                # Preserve existing comments as legacy data
                if review.comments and review.comments.strip():
                    # Add a marker to indicate this is legacy comment data
                    if not review.comments.startswith('[LEGACY]'):
                        review.comments = f"[LEGACY] {review.comments}"
                
                self.migration_stats['reviews_processed'] += 1
            
            logger.info(f"Processed {len(reviews)} existing reviews")
            
        except Exception as e:
            logger.error(f"Error preserving review data: {str(e)}")
            raise
    
    def _verify_document_associations(self, db) -> None:
        """Verify that existing document associations remain intact."""
        logger.info("Verifying document associations...")
        
        try:
            # Check if documents table exists and has review associations
            result = db.execute(text("""
                SELECT COUNT(*) as doc_count 
                FROM information_schema.tables 
                WHERE table_name = 'documents'
            """))
            
            table_exists = result.fetchone()[0] > 0
            
            if table_exists:
                # Count existing document-review associations
                result = db.execute(text("""
                    SELECT COUNT(*) as association_count 
                    FROM documents 
                    WHERE review_id IS NOT NULL
                """))
                
                association_count = result.fetchone()[0]
                self.migration_stats['documents_preserved'] = association_count
                
                logger.info(f"Verified {association_count} document associations")
            else:
                logger.info("Documents table not found - no associations to verify")
                
        except Exception as e:
            logger.error(f"Error verifying document associations: {str(e)}")
            # Don't raise here as this is verification, not critical migration
            self.migration_stats['errors'].append(f"Document verification error: {str(e)}")
    
    def _create_compatibility_records(self, db) -> None:
        """Create records to maintain backward compatibility."""
        logger.info("Creating backward compatibility records...")
        
        try:
            # Create a migration log entry
            db.execute(text("""
                INSERT INTO audit_logs (
                    user_id, action, resource_type, resource_id, 
                    details, created_at
                ) VALUES (
                    1, 'SYSTEM_MIGRATION', 'SYSTEM', 'enhanced_client_review', 
                    :details, :created_at
                )
            """), {
                'details': f"Enhanced Client Review System migration completed. "
                          f"Updated {self.migration_stats['clients_updated']} clients, "
                          f"processed {self.migration_stats['reviews_processed']} reviews.",
                'created_at': datetime.utcnow()
            })
            
            logger.info("Created migration audit log entry")
            
        except Exception as e:
            logger.error(f"Error creating compatibility records: {str(e)}")
            # Don't raise here as this is not critical for functionality
            self.migration_stats['errors'].append(f"Compatibility record error: {str(e)}")
    
    def validate_migration(self) -> Dict[str, Any]:
        """
        Validate that the migration was successful.
        
        Returns:
            Dictionary containing validation results
        """
        logger.info("Validating migration results...")
        
        validation_results = {
            'clients_with_defaults': 0,
            'reviews_preserved': 0,
            'documents_intact': 0,
            'validation_errors': []
        }
        
        try:
            with self.SessionLocal() as db:
                # Check that all clients have default values
                clients_without_defaults = db.query(Client).filter(
                    (Client.domicile_branch.is_(None)) |
                    (Client.relationship_manager.is_(None)) |
                    (Client.business_unit.is_(None)) |
                    (Client.aml_risk.is_(None))
                ).count()
                
                if clients_without_defaults > 0:
                    validation_results['validation_errors'].append(
                        f"{clients_without_defaults} clients still missing default values"
                    )
                
                # Count clients with defaults
                validation_results['clients_with_defaults'] = db.query(Client).filter(
                    Client.domicile_branch.isnot(None),
                    Client.relationship_manager.isnot(None),
                    Client.business_unit.isnot(None),
                    Client.aml_risk.isnot(None)
                ).count()
                
                # Count preserved reviews
                validation_results['reviews_preserved'] = db.query(Review).count()
                
                # Check document associations if table exists
                try:
                    result = db.execute(text("""
                        SELECT COUNT(*) as doc_count 
                        FROM documents 
                        WHERE review_id IS NOT NULL
                    """))
                    validation_results['documents_intact'] = result.fetchone()[0]
                except:
                    validation_results['documents_intact'] = 0
                
        except Exception as e:
            validation_results['validation_errors'].append(str(e))
        
        return validation_results


def main():
    """Main migration execution function."""
    print("Enhanced Client Review System - Data Migration")
    print("=" * 50)
    
    try:
        # Initialize migrator
        migrator = DataMigrator()
        
        # Run migration
        stats = migrator.run_migration()
        
        # Validate migration
        validation = migrator.validate_migration()
        
        # Print results
        print("\nMigration Results:")
        print(f"- Clients updated: {stats['clients_updated']}")
        print(f"- Reviews processed: {stats['reviews_processed']}")
        print(f"- Documents preserved: {stats['documents_preserved']}")
        
        print("\nValidation Results:")
        print(f"- Clients with defaults: {validation['clients_with_defaults']}")
        print(f"- Reviews preserved: {validation['reviews_preserved']}")
        print(f"- Documents intact: {validation['documents_intact']}")
        
        if stats['errors'] or validation['validation_errors']:
            print("\nErrors encountered:")
            for error in stats['errors'] + validation['validation_errors']:
                print(f"- {error}")
            return 1
        
        print("\n✅ Migration completed successfully!")
        return 0
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)