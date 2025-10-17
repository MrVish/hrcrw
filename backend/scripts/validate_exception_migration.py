#!/usr/bin/env python3
"""
Validation script for exception model enhancement migration.

This script provides utilities to validate the migration 006_enhance_exception_model
before and after execution to ensure data integrity and proper constraint application.
"""

import sys
import os
import argparse
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, MetaData, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class ExceptionMigrationValidator:
    """Validator for exception model enhancement migration."""
    
    def __init__(self, database_url: str):
        """Initialize the validator with database connection."""
        self.database_url = database_url
        self.engine = create_engine(database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def validate_pre_migration_state(self) -> Dict[str, Any]:
        """Validate the database state before migration."""
        logger.info("Validating pre-migration state...")
        
        validation_results = {
            'timestamp': datetime.utcnow().isoformat(),
            'phase': 'pre-migration',
            'checks': {},
            'errors': [],
            'warnings': []
        }
        
        try:
            with self.engine.connect() as conn:
                # Check if review_exceptions table exists
                inspector = inspect(self.engine)
                tables = inspector.get_table_names()
                
                if 'review_exceptions' not in tables:
                    validation_results['errors'].append("review_exceptions table does not exist")
                    return validation_results
                
                validation_results['checks']['table_exists'] = True
                
                # Check current schema
                columns = inspector.get_columns('review_exceptions')
                column_names = [col['name'] for col in columns]
                
                validation_results['checks']['current_columns'] = column_names
                
                # Verify new columns don't exist yet
                new_columns = ['title', 'priority', 'due_date']
                for col in new_columns:
                    if col in column_names:
                        validation_results['warnings'].append(f"Column {col} already exists - migration may have been run before")
                
                validation_results['checks']['new_columns_absent'] = all(col not in column_names for col in new_columns)
                
                # Count existing exceptions
                result = conn.execute(text("SELECT COUNT(*) FROM review_exceptions")).fetchone()
                exception_count = result[0] if result else 0
                validation_results['checks']['existing_exception_count'] = exception_count
                
                # Check existing exception types
                result = conn.execute(text("SELECT DISTINCT exception_type FROM review_exceptions")).fetchall()
                existing_types = [row[0] for row in result]
                validation_results['checks']['existing_exception_types'] = existing_types
                
                # Validate existing data integrity
                integrity_check = self._check_data_integrity(conn, pre_migration=True)
                validation_results['checks']['data_integrity'] = integrity_check
                
                logger.info(f"Pre-migration validation completed. Found {exception_count} existing exceptions.")
                
        except SQLAlchemyError as e:
            validation_results['errors'].append(f"Database error during pre-migration validation: {str(e)}")
            logger.error(f"Database error: {e}")
        
        return validation_results
    
    def validate_post_migration_state(self) -> Dict[str, Any]:
        """Validate the database state after migration."""
        logger.info("Validating post-migration state...")
        
        validation_results = {
            'timestamp': datetime.utcnow().isoformat(),
            'phase': 'post-migration',
            'checks': {},
            'errors': [],
            'warnings': []
        }
        
        try:
            with self.engine.connect() as conn:
                # Check if new columns exist
                inspector = inspect(self.engine)
                columns = inspector.get_columns('review_exceptions')
                column_names = [col['name'] for col in columns]
                
                validation_results['checks']['current_columns'] = column_names
                
                # Verify new columns exist
                new_columns = ['title', 'priority', 'due_date']
                missing_columns = [col for col in new_columns if col not in column_names]
                
                if missing_columns:
                    validation_results['errors'].append(f"Missing columns after migration: {missing_columns}")
                else:
                    validation_results['checks']['new_columns_present'] = True
                
                # Check column properties
                column_details = {col['name']: col for col in columns}
                
                # Validate title column
                if 'title' in column_details:
                    title_col = column_details['title']
                    validation_results['checks']['title_column'] = {
                        'nullable': title_col.get('nullable', True),
                        'type': str(title_col.get('type', '')),
                        'max_length': getattr(title_col.get('type'), 'length', None)
                    }
                
                # Validate priority column
                if 'priority' in column_details:
                    priority_col = column_details['priority']
                    validation_results['checks']['priority_column'] = {
                        'nullable': priority_col.get('nullable', True),
                        'type': str(priority_col.get('type', ''))
                    }
                
                # Check default values were set
                default_check = self._check_default_values(conn)
                validation_results['checks']['default_values'] = default_check
                
                # Check new enum values
                enum_check = self._check_enum_values(conn)
                validation_results['checks']['enum_values'] = enum_check
                
                # Check indexes
                index_check = self._check_indexes(conn)
                validation_results['checks']['indexes'] = index_check
                
                # Check constraints
                constraint_check = self._check_constraints(conn)
                validation_results['checks']['constraints'] = constraint_check
                
                # Validate data integrity after migration
                integrity_check = self._check_data_integrity(conn, pre_migration=False)
                validation_results['checks']['data_integrity'] = integrity_check
                
                logger.info("Post-migration validation completed successfully.")
                
        except SQLAlchemyError as e:
            validation_results['errors'].append(f"Database error during post-migration validation: {str(e)}")
            logger.error(f"Database error: {e}")
        
        return validation_results
    
    def _check_data_integrity(self, conn, pre_migration: bool = True) -> Dict[str, Any]:
        """Check data integrity before or after migration."""
        integrity_results = {}
        
        try:
            # Count total exceptions
            result = conn.execute(text("SELECT COUNT(*) FROM review_exceptions")).fetchone()
            integrity_results['total_exceptions'] = result[0] if result else 0
            
            # Check for orphaned exceptions (no matching review)
            result = conn.execute(text("""
                SELECT COUNT(*) FROM review_exceptions re 
                LEFT JOIN reviews r ON re.review_id = r.id 
                WHERE r.id IS NULL
            """)).fetchone()
            integrity_results['orphaned_exceptions'] = result[0] if result else 0
            
            # Check for exceptions with invalid user references
            result = conn.execute(text("""
                SELECT COUNT(*) FROM review_exceptions re 
                LEFT JOIN users u ON re.created_by = u.id 
                WHERE u.id IS NULL
            """)).fetchone()
            integrity_results['invalid_created_by'] = result[0] if result else 0
            
            if not pre_migration:
                # Post-migration specific checks
                
                # Check for null titles (should not exist after migration)
                result = conn.execute(text("SELECT COUNT(*) FROM review_exceptions WHERE title IS NULL")).fetchone()
                integrity_results['null_titles'] = result[0] if result else 0
                
                # Check for null priorities (should not exist after migration)
                result = conn.execute(text("SELECT COUNT(*) FROM review_exceptions WHERE priority IS NULL")).fetchone()
                integrity_results['null_priorities'] = result[0] if result else 0
                
                # Check default values were applied
                result = conn.execute(text("SELECT COUNT(*) FROM review_exceptions WHERE title = 'Legacy Exception'")).fetchone()
                integrity_results['legacy_title_count'] = result[0] if result else 0
                
                result = conn.execute(text("SELECT COUNT(*) FROM review_exceptions WHERE priority = 'medium'")).fetchone()
                integrity_results['medium_priority_count'] = result[0] if result else 0
            
        except SQLAlchemyError as e:
            integrity_results['error'] = str(e)
        
        return integrity_results
    
    def _check_default_values(self, conn) -> Dict[str, Any]:
        """Check that default values were properly set."""
        default_results = {}
        
        try:
            # Check title defaults
            result = conn.execute(text("SELECT COUNT(*) FROM review_exceptions WHERE title = 'Legacy Exception'")).fetchone()
            default_results['legacy_title_count'] = result[0] if result else 0
            
            # Check priority defaults
            result = conn.execute(text("SELECT COUNT(*) FROM review_exceptions WHERE priority = 'medium'")).fetchone()
            default_results['medium_priority_count'] = result[0] if result else 0
            
            # Check for any null values in new required fields
            result = conn.execute(text("SELECT COUNT(*) FROM review_exceptions WHERE title IS NULL OR priority IS NULL")).fetchone()
            default_results['null_required_fields'] = result[0] if result else 0
            
        except SQLAlchemyError as e:
            default_results['error'] = str(e)
        
        return default_results
    
    def _check_enum_values(self, conn) -> Dict[str, Any]:
        """Check that new enum values are available."""
        enum_results = {}
        
        try:
            # Test new exception types
            new_exception_types = ['documentation', 'compliance', 'technical', 'operational']
            enum_results['new_exception_types_available'] = []
            
            for exception_type in new_exception_types:
                try:
                    # Try to insert a test record with the new type
                    conn.execute(text("""
                        INSERT INTO review_exceptions 
                        (review_id, exception_type, title, description, status, priority, created_by)
                        SELECT 
                            MIN(id) as review_id,
                            :exception_type as exception_type,
                            'Test Exception' as title,
                            'Test for enum validation' as description,
                            'open' as status,
                            'medium' as priority,
                            MIN(submitted_by) as created_by
                        FROM reviews
                        LIMIT 1
                    """), {'exception_type': exception_type})
                    
                    # If successful, delete the test record
                    conn.execute(text("DELETE FROM review_exceptions WHERE description = 'Test for enum validation'"))
                    enum_results['new_exception_types_available'].append(exception_type)
                    
                except SQLAlchemyError:
                    # Type not available
                    pass
            
            # Test new priority values
            new_priorities = ['low', 'high', 'critical']
            enum_results['new_priorities_available'] = []
            
            for priority in new_priorities:
                try:
                    # Try to insert a test record with the new priority
                    conn.execute(text("""
                        INSERT INTO review_exceptions 
                        (review_id, exception_type, title, description, status, priority, created_by)
                        SELECT 
                            MIN(id) as review_id,
                            'documentation' as exception_type,
                            'Test Priority' as title,
                            'Test for priority validation' as description,
                            'open' as status,
                            :priority as priority,
                            MIN(submitted_by) as created_by
                        FROM reviews
                        LIMIT 1
                    """), {'priority': priority})
                    
                    # If successful, delete the test record
                    conn.execute(text("DELETE FROM review_exceptions WHERE description = 'Test for priority validation'"))
                    enum_results['new_priorities_available'].append(priority)
                    
                except SQLAlchemyError:
                    # Priority not available
                    pass
            
        except SQLAlchemyError as e:
            enum_results['error'] = str(e)
        
        return enum_results
    
    def _check_indexes(self, conn) -> Dict[str, Any]:
        """Check that new indexes were created."""
        index_results = {}
        
        try:
            # Get index information (database-specific)
            if 'sqlite' in self.database_url.lower():
                # SQLite specific query
                result = conn.execute(text("""
                    SELECT name FROM sqlite_master 
                    WHERE type='index' AND tbl_name='review_exceptions'
                """)).fetchall()
                
                existing_indexes = [row[0] for row in result]
                
            elif 'postgresql' in self.database_url.lower():
                # PostgreSQL specific query
                result = conn.execute(text("""
                    SELECT indexname FROM pg_indexes 
                    WHERE tablename = 'review_exceptions'
                """)).fetchall()
                
                existing_indexes = [row[0] for row in result]
                
            else:
                existing_indexes = []
            
            index_results['existing_indexes'] = existing_indexes
            
            # Check for expected indexes
            expected_indexes = [
                'idx_review_exceptions_priority',
                'idx_review_exceptions_due_date',
                'idx_review_exceptions_priority_status',
                'idx_review_exceptions_type_priority'
            ]
            
            index_results['expected_indexes'] = expected_indexes
            index_results['missing_indexes'] = [idx for idx in expected_indexes if idx not in existing_indexes]
            
        except SQLAlchemyError as e:
            index_results['error'] = str(e)
        
        return index_results
    
    def _check_constraints(self, conn) -> Dict[str, Any]:
        """Check that constraints are properly applied."""
        constraint_results = {}
        
        try:
            # Test invalid exception type constraint
            try:
                conn.execute(text("""
                    INSERT INTO review_exceptions 
                    (review_id, exception_type, title, description, status, priority, created_by)
                    SELECT 
                        MIN(id) as review_id,
                        'invalid_type' as exception_type,
                        'Test Constraint' as title,
                        'Test for constraint validation' as description,
                        'open' as status,
                        'medium' as priority,
                        MIN(submitted_by) as created_by
                    FROM reviews
                    LIMIT 1
                """))
                constraint_results['exception_type_constraint'] = False
            except SQLAlchemyError:
                constraint_results['exception_type_constraint'] = True
            
            # Test invalid priority constraint
            try:
                conn.execute(text("""
                    INSERT INTO review_exceptions 
                    (review_id, exception_type, title, description, status, priority, created_by)
                    SELECT 
                        MIN(id) as review_id,
                        'documentation' as exception_type,
                        'Test Constraint' as title,
                        'Test for constraint validation' as description,
                        'open' as status,
                        'invalid_priority' as priority,
                        MIN(submitted_by) as created_by
                    FROM reviews
                    LIMIT 1
                """))
                constraint_results['priority_constraint'] = False
            except SQLAlchemyError:
                constraint_results['priority_constraint'] = True
            
            # Clean up any test records that might have been inserted
            conn.execute(text("DELETE FROM review_exceptions WHERE description = 'Test for constraint validation'"))
            
        except SQLAlchemyError as e:
            constraint_results['error'] = str(e)
        
        return constraint_results
    
    def generate_validation_report(self, pre_results: Dict[str, Any], post_results: Dict[str, Any]) -> str:
        """Generate a comprehensive validation report."""
        report = []
        report.append("=" * 80)
        report.append("EXCEPTION MODEL ENHANCEMENT MIGRATION VALIDATION REPORT")
        report.append("=" * 80)
        report.append("")
        
        # Pre-migration summary
        report.append("PRE-MIGRATION STATE:")
        report.append("-" * 40)
        if pre_results.get('errors'):
            report.append("❌ ERRORS:")
            for error in pre_results['errors']:
                report.append(f"   • {error}")
        else:
            report.append("✅ No pre-migration errors")
        
        if pre_results.get('warnings'):
            report.append("⚠️  WARNINGS:")
            for warning in pre_results['warnings']:
                report.append(f"   • {warning}")
        
        checks = pre_results.get('checks', {})
        report.append(f"📊 Existing exceptions: {checks.get('existing_exception_count', 0)}")
        report.append(f"📋 Existing types: {', '.join(checks.get('existing_exception_types', []))}")
        report.append("")
        
        # Post-migration summary
        report.append("POST-MIGRATION STATE:")
        report.append("-" * 40)
        if post_results.get('errors'):
            report.append("❌ ERRORS:")
            for error in post_results['errors']:
                report.append(f"   • {error}")
        else:
            report.append("✅ No post-migration errors")
        
        checks = post_results.get('checks', {})
        
        # Column validation
        if checks.get('new_columns_present'):
            report.append("✅ New columns added successfully")
        else:
            report.append("❌ New columns missing")
        
        # Default values validation
        default_values = checks.get('default_values', {})
        if default_values.get('null_required_fields', 0) == 0:
            report.append("✅ Default values set correctly")
        else:
            report.append(f"❌ {default_values.get('null_required_fields', 0)} records with null required fields")
        
        # Enum values validation
        enum_values = checks.get('enum_values', {})
        new_types = enum_values.get('new_exception_types_available', [])
        new_priorities = enum_values.get('new_priorities_available', [])
        
        report.append(f"✅ New exception types available: {', '.join(new_types)}")
        report.append(f"✅ New priorities available: {', '.join(new_priorities)}")
        
        # Index validation
        indexes = checks.get('indexes', {})
        missing_indexes = indexes.get('missing_indexes', [])
        if not missing_indexes:
            report.append("✅ All expected indexes created")
        else:
            report.append(f"❌ Missing indexes: {', '.join(missing_indexes)}")
        
        # Constraint validation
        constraints = checks.get('constraints', {})
        if constraints.get('exception_type_constraint') and constraints.get('priority_constraint'):
            report.append("✅ Constraints working correctly")
        else:
            report.append("❌ Some constraints not working properly")
        
        # Data integrity validation
        integrity = checks.get('data_integrity', {})
        if integrity.get('orphaned_exceptions', 0) == 0 and integrity.get('invalid_created_by', 0) == 0:
            report.append("✅ Data integrity maintained")
        else:
            report.append("❌ Data integrity issues detected")
        
        report.append("")
        report.append("=" * 80)
        report.append(f"Report generated at: {datetime.utcnow().isoformat()}")
        report.append("=" * 80)
        
        return "\n".join(report)


def main():
    """Main function to run migration validation."""
    parser = argparse.ArgumentParser(description='Validate exception model enhancement migration')
    parser.add_argument('--database-url', required=True, help='Database URL for validation')
    parser.add_argument('--phase', choices=['pre', 'post', 'both'], default='both', 
                       help='Validation phase to run')
    parser.add_argument('--output', help='Output file for validation report')
    
    args = parser.parse_args()
    
    validator = ExceptionMigrationValidator(args.database_url)
    
    pre_results = None
    post_results = None
    
    if args.phase in ['pre', 'both']:
        pre_results = validator.validate_pre_migration_state()
        
    if args.phase in ['post', 'both']:
        post_results = validator.validate_post_migration_state()
    
    # Generate report if both phases were run
    if pre_results and post_results:
        report = validator.generate_validation_report(pre_results, post_results)
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(report)
            logger.info(f"Validation report written to {args.output}")
        else:
            print(report)
    
    # Print individual results
    if pre_results and not post_results:
        print("Pre-migration validation results:")
        print(f"Errors: {len(pre_results.get('errors', []))}")
        print(f"Warnings: {len(pre_results.get('warnings', []))}")
        
    if post_results and not pre_results:
        print("Post-migration validation results:")
        print(f"Errors: {len(post_results.get('errors', []))}")
        print(f"New columns present: {post_results.get('checks', {}).get('new_columns_present', False)}")


if __name__ == "__main__":
    main()