#!/usr/bin/env python3
"""
Database setup script for High Risk Client Review Workflow.
This script handles complete database initialization including migrations and seeding.
"""
import sys
import os
import time
from typing import Optional

# Add the parent directory to the path so we can import our app
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from app.core.config import settings
from manage_migrations import MigrationManager
from seed_database import seed_database, clear_database


class DatabaseSetup:
    """Handles complete database setup and initialization."""
    
    def __init__(self):
        """Initialize the database setup manager."""
        self.migration_manager = MigrationManager()
        self.engine = create_engine(settings.DATABASE_URL)
    
    def wait_for_database(self, max_retries: int = 30, retry_interval: int = 2) -> bool:
        """
        Wait for database to become available.
        
        Args:
            max_retries: Maximum number of connection attempts
            retry_interval: Seconds to wait between attempts
            
        Returns:
            True if database is available, False otherwise
        """
        print("Waiting for database to become available...")
        
        for attempt in range(max_retries):
            try:
                with self.engine.connect() as connection:
                    connection.execute(text("SELECT 1"))
                print("Database is available!")
                return True
            except OperationalError as e:
                if attempt < max_retries - 1:
                    print(f"Attempt {attempt + 1}/{max_retries}: Database not ready, retrying in {retry_interval}s...")
                    time.sleep(retry_interval)
                else:
                    print(f"Failed to connect to database after {max_retries} attempts: {e}")
                    return False
        
        return False
    
    def check_database_exists(self) -> bool:
        """Check if the database exists and is accessible."""
        try:
            with self.engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return True
        except Exception as e:
            print(f"Database check failed: {e}")
            return False
    
    def check_tables_exist(self) -> bool:
        """Check if the required tables exist."""
        try:
            with self.engine.connect() as connection:
                # Check for key tables
                tables_to_check = ['users', 'clients', 'reviews', 'exceptions', 'documents', 'audit_logs']
                
                for table in tables_to_check:
                    result = connection.execute(text(
                        "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = :table_name"
                    ), {"table_name": table})
                    count = result.fetchone()[0]
                    if count == 0:
                        print(f"Table '{table}' not found")
                        return False
                
                print("All required tables exist")
                return True
        except Exception as e:
            print(f"Error checking tables: {e}")
            return False
    
    def check_data_exists(self) -> bool:
        """Check if the database contains any data."""
        try:
            with self.engine.connect() as connection:
                result = connection.execute(text("SELECT COUNT(*) FROM users"))
                count = result.fetchone()[0]
                return count > 0
        except Exception as e:
            print(f"Error checking data: {e}")
            return False
    
    def initialize_database(self, force: bool = False, seed: bool = True) -> bool:
        """
        Initialize the database with migrations and optional seeding.
        
        Args:
            force: Force re-initialization even if database exists
            seed: Whether to seed the database with initial data
            
        Returns:
            True if successful, False otherwise
        """
        print("="*60)
        print("DATABASE INITIALIZATION")
        print("="*60)
        
        # Wait for database to be available
        if not self.wait_for_database():
            return False
        
        # Check current state
        tables_exist = self.check_tables_exist()
        data_exists = self.check_data_exists()
        
        if tables_exist and data_exists and not force:
            print("Database is already initialized with data.")
            print("Use --force to re-initialize or --clear to clear existing data.")
            return True
        
        if force and (tables_exist or data_exists):
            print("Force flag detected. Clearing existing database...")
            if not self.reset_database():
                return False
        
        # Run migrations
        print("\nRunning database migrations...")
        if not self.migration_manager.upgrade_to_head():
            return False
        
        # Validate schema
        print("\nValidating database schema...")
        if not self.migration_manager.validate_database():
            return False
        
        # Seed database if requested
        if seed:
            print("\nSeeding database with initial data...")
            try:
                seed_database()
            except Exception as e:
                print(f"Error seeding database: {e}")
                return False
        
        print("\n" + "="*60)
        print("DATABASE INITIALIZATION COMPLETED SUCCESSFULLY!")
        print("="*60)
        return True
    
    def reset_database(self) -> bool:
        """Reset the database to a clean state."""
        try:
            print("Resetting database...")
            
            # Clear all data first
            clear_database()
            
            # Reset migrations
            current_revision = self.migration_manager.get_current_revision()
            if current_revision:
                self.migration_manager.downgrade_to_revision("base")
            
            print("Database reset completed!")
            return True
        except Exception as e:
            print(f"Error resetting database: {e}")
            return False
    
    def upgrade_database(self) -> bool:
        """Upgrade database to latest schema."""
        print("Upgrading database...")
        return self.migration_manager.upgrade_to_head()
    
    def show_status(self) -> None:
        """Show current database status."""
        print("="*60)
        print("DATABASE STATUS")
        print("="*60)
        
        # Check connectivity
        db_available = self.check_database_exists()
        print(f"Database connectivity: {'✓ Available' if db_available else '✗ Not available'}")
        
        if not db_available:
            print("Cannot check further status - database not available")
            return
        
        # Check tables
        tables_exist = self.check_tables_exist()
        print(f"Required tables: {'✓ Present' if tables_exist else '✗ Missing'}")
        
        # Check data
        data_exists = self.check_data_exists()
        print(f"Initial data: {'✓ Present' if data_exists else '✗ Missing'}")
        
        # Show migration status
        print("\n" + "-"*40)
        self.migration_manager.show_current_status()
        
        # Show table counts if tables exist
        if tables_exist:
            print("\nTable row counts:")
            try:
                with self.engine.connect() as connection:
                    tables = ['users', 'clients', 'reviews', 'exceptions', 'documents', 'audit_logs']
                    for table in tables:
                        result = connection.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        count = result.fetchone()[0]
                        print(f"  {table}: {count}")
            except Exception as e:
                print(f"  Error getting counts: {e}")
        
        print("="*60)
    
    def create_backup(self, backup_file: Optional[str] = None) -> bool:
        """Create a database backup."""
        if not backup_file:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = f"backup_hrcrw_{timestamp}.sql"
        
        return self.migration_manager.backup_database(backup_file)
    
    def restore_backup(self, backup_file: str) -> bool:
        """Restore database from backup."""
        return self.migration_manager.restore_database(backup_file)


def main():
    """Main function to handle command line arguments."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Database setup and management")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Initialize command
    init_parser = subparsers.add_parser('init', help='Initialize database')
    init_parser.add_argument('--force', action='store_true', help='Force re-initialization')
    init_parser.add_argument('--no-seed', action='store_true', help='Skip seeding data')
    
    # Status command
    subparsers.add_parser('status', help='Show database status')
    
    # Reset command
    subparsers.add_parser('reset', help='Reset database (WARNING: Deletes all data!)')
    
    # Upgrade command
    subparsers.add_parser('upgrade', help='Upgrade database to latest schema')
    
    # Backup command
    backup_parser = subparsers.add_parser('backup', help='Create database backup')
    backup_parser.add_argument('--file', help='Backup file path (optional)')
    
    # Restore command
    restore_parser = subparsers.add_parser('restore', help='Restore database from backup')
    restore_parser.add_argument('file', help='Backup file path')
    
    # Wait command (useful for Docker containers)
    wait_parser = subparsers.add_parser('wait', help='Wait for database to become available')
    wait_parser.add_argument('--timeout', type=int, default=30, help='Timeout in seconds')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Initialize database setup
    db_setup = DatabaseSetup()
    
    # Execute commands
    if args.command == 'init':
        success = db_setup.initialize_database(
            force=args.force,
            seed=not args.no_seed
        )
        sys.exit(0 if success else 1)
    
    elif args.command == 'status':
        db_setup.show_status()
    
    elif args.command == 'reset':
        success = db_setup.reset_database()
        sys.exit(0 if success else 1)
    
    elif args.command == 'upgrade':
        success = db_setup.upgrade_database()
        sys.exit(0 if success else 1)
    
    elif args.command == 'backup':
        success = db_setup.create_backup(args.file)
        sys.exit(0 if success else 1)
    
    elif args.command == 'restore':
        success = db_setup.restore_backup(args.file)
        sys.exit(0 if success else 1)
    
    elif args.command == 'wait':
        success = db_setup.wait_for_database(max_retries=args.timeout)
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()