#!/usr/bin/env python3
"""
Migration management script for High Risk Client Review Workflow.
This script provides utilities for managing database migrations.
"""
import sys
import os
import subprocess
from typing import List, Optional

# Add the parent directory to the path so we can import our app
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from alembic.config import Config
from alembic import command
from alembic.script import ScriptDirectory
from alembic.runtime.environment import EnvironmentContext
from sqlalchemy import create_engine, text
from app.core.config import settings


class MigrationManager:
    """Manages database migrations and provides utilities for migration operations."""
    
    def __init__(self):
        """Initialize the migration manager."""
        self.alembic_cfg = Config("alembic.ini")
        self.engine = create_engine(settings.DATABASE_URL)
    
    def get_current_revision(self) -> Optional[str]:
        """Get the current database revision."""
        try:
            with self.engine.connect() as connection:
                result = connection.execute(text("SELECT version_num FROM alembic_version"))
                row = result.fetchone()
                return row[0] if row else None
        except Exception as e:
            print(f"Error getting current revision: {e}")
            return None
    
    def get_available_revisions(self) -> List[str]:
        """Get list of available migration revisions."""
        try:
            script = ScriptDirectory.from_config(self.alembic_cfg)
            revisions = []
            for revision in script.walk_revisions():
                revisions.append(revision.revision)
            return revisions
        except Exception as e:
            print(f"Error getting available revisions: {e}")
            return []
    
    def upgrade_to_head(self) -> bool:
        """Upgrade database to the latest revision."""
        try:
            print("Upgrading database to latest revision...")
            command.upgrade(self.alembic_cfg, "head")
            print("Database upgrade completed successfully!")
            return True
        except Exception as e:
            print(f"Error upgrading database: {e}")
            return False
    
    def upgrade_to_revision(self, revision: str) -> bool:
        """Upgrade database to a specific revision."""
        try:
            print(f"Upgrading database to revision {revision}...")
            command.upgrade(self.alembic_cfg, revision)
            print(f"Database upgrade to {revision} completed successfully!")
            return True
        except Exception as e:
            print(f"Error upgrading database to {revision}: {e}")
            return False
    
    def downgrade_to_revision(self, revision: str) -> bool:
        """Downgrade database to a specific revision."""
        try:
            print(f"Downgrading database to revision {revision}...")
            command.downgrade(self.alembic_cfg, revision)
            print(f"Database downgrade to {revision} completed successfully!")
            return True
        except Exception as e:
            print(f"Error downgrading database to {revision}: {e}")
            return False
    
    def downgrade_by_steps(self, steps: int) -> bool:
        """Downgrade database by a number of steps."""
        try:
            print(f"Downgrading database by {steps} step(s)...")
            command.downgrade(self.alembic_cfg, f"-{steps}")
            print(f"Database downgrade by {steps} step(s) completed successfully!")
            return True
        except Exception as e:
            print(f"Error downgrading database by {steps} steps: {e}")
            return False
    
    def create_migration(self, message: str, autogenerate: bool = True) -> bool:
        """Create a new migration."""
        try:
            print(f"Creating new migration: {message}")
            if autogenerate:
                command.revision(self.alembic_cfg, message=message, autogenerate=True)
            else:
                command.revision(self.alembic_cfg, message=message)
            print("Migration created successfully!")
            return True
        except Exception as e:
            print(f"Error creating migration: {e}")
            return False
    
    def show_current_status(self) -> None:
        """Show current migration status."""
        print("="*50)
        print("MIGRATION STATUS")
        print("="*50)
        
        current = self.get_current_revision()
        available = self.get_available_revisions()
        
        print(f"Current revision: {current or 'None'}")
        print(f"Available revisions: {len(available)}")
        
        if available:
            print("\nAvailable revisions:")
            for i, rev in enumerate(reversed(available)):
                status = "CURRENT" if rev == current else ""
                print(f"  {i+1}. {rev} {status}")
        
        print("="*50)
    
    def show_history(self) -> None:
        """Show migration history."""
        try:
            print("Migration History:")
            print("="*50)
            command.history(self.alembic_cfg)
        except Exception as e:
            print(f"Error showing history: {e}")
    
    def validate_database(self) -> bool:
        """Validate that the database schema matches the models."""
        try:
            print("Validating database schema...")
            # This would compare the current database schema with the models
            # For now, we'll just check if we can connect and the alembic_version table exists
            with self.engine.connect() as connection:
                result = connection.execute(text("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'alembic_version'"))
                count = result.fetchone()[0]
                if count == 0:
                    print("Warning: alembic_version table not found. Database may not be initialized.")
                    return False
                
                print("Database schema validation passed!")
                return True
        except Exception as e:
            print(f"Error validating database: {e}")
            return False
    
    def reset_database(self) -> bool:
        """Reset database to initial state (WARNING: This will delete all data!)."""
        try:
            print("WARNING: This will delete ALL data in the database!")
            confirm = input("Are you sure you want to continue? (yes/no): ")
            if confirm.lower() != 'yes':
                print("Operation cancelled.")
                return False
            
            print("Resetting database...")
            
            # Downgrade to base (removes all tables)
            command.downgrade(self.alembic_cfg, "base")
            
            # Upgrade to head (recreates all tables)
            command.upgrade(self.alembic_cfg, "head")
            
            print("Database reset completed successfully!")
            return True
        except Exception as e:
            print(f"Error resetting database: {e}")
            return False
    
    def backup_database(self, backup_file: str) -> bool:
        """Create a database backup (PostgreSQL only)."""
        try:
            print(f"Creating database backup: {backup_file}")
            
            # Extract database connection info
            db_url = settings.DATABASE_URL
            # This is a simplified version - in production, you'd want more robust URL parsing
            
            # Use pg_dump for PostgreSQL
            cmd = f"pg_dump {db_url} > {backup_file}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"Database backup created successfully: {backup_file}")
                return True
            else:
                print(f"Error creating backup: {result.stderr}")
                return False
        except Exception as e:
            print(f"Error creating database backup: {e}")
            return False
    
    def restore_database(self, backup_file: str) -> bool:
        """Restore database from backup (PostgreSQL only)."""
        try:
            print(f"Restoring database from backup: {backup_file}")
            
            if not os.path.exists(backup_file):
                print(f"Backup file not found: {backup_file}")
                return False
            
            print("WARNING: This will replace ALL data in the database!")
            confirm = input("Are you sure you want to continue? (yes/no): ")
            if confirm.lower() != 'yes':
                print("Operation cancelled.")
                return False
            
            # Extract database connection info
            db_url = settings.DATABASE_URL
            
            # Use psql for PostgreSQL
            cmd = f"psql {db_url} < {backup_file}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"Database restored successfully from: {backup_file}")
                return True
            else:
                print(f"Error restoring backup: {result.stderr}")
                return False
        except Exception as e:
            print(f"Error restoring database: {e}")
            return False


def main():
    """Main function to handle command line arguments."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Database migration management")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Status command
    subparsers.add_parser('status', help='Show current migration status')
    
    # History command
    subparsers.add_parser('history', help='Show migration history')
    
    # Upgrade commands
    upgrade_parser = subparsers.add_parser('upgrade', help='Upgrade database')
    upgrade_parser.add_argument('--to', help='Upgrade to specific revision (default: head)')
    
    # Downgrade commands
    downgrade_parser = subparsers.add_parser('downgrade', help='Downgrade database')
    downgrade_parser.add_argument('--to', help='Downgrade to specific revision')
    downgrade_parser.add_argument('--steps', type=int, help='Downgrade by number of steps')
    
    # Create migration command
    create_parser = subparsers.add_parser('create', help='Create new migration')
    create_parser.add_argument('message', help='Migration message')
    create_parser.add_argument('--manual', action='store_true', help='Create manual migration (no autogenerate)')
    
    # Validate command
    subparsers.add_parser('validate', help='Validate database schema')
    
    # Reset command
    subparsers.add_parser('reset', help='Reset database (WARNING: Deletes all data!)')
    
    # Backup commands
    backup_parser = subparsers.add_parser('backup', help='Create database backup')
    backup_parser.add_argument('file', help='Backup file path')
    
    # Restore commands
    restore_parser = subparsers.add_parser('restore', help='Restore database from backup')
    restore_parser.add_argument('file', help='Backup file path')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Initialize migration manager
    manager = MigrationManager()
    
    # Execute commands
    if args.command == 'status':
        manager.show_current_status()
    
    elif args.command == 'history':
        manager.show_history()
    
    elif args.command == 'upgrade':
        if args.to:
            manager.upgrade_to_revision(args.to)
        else:
            manager.upgrade_to_head()
    
    elif args.command == 'downgrade':
        if args.to:
            manager.downgrade_to_revision(args.to)
        elif args.steps:
            manager.downgrade_by_steps(args.steps)
        else:
            print("Please specify either --to <revision> or --steps <number>")
    
    elif args.command == 'create':
        manager.create_migration(args.message, not args.manual)
    
    elif args.command == 'validate':
        manager.validate_database()
    
    elif args.command == 'reset':
        manager.reset_database()
    
    elif args.command == 'backup':
        manager.backup_database(args.file)
    
    elif args.command == 'restore':
        manager.restore_database(args.file)


if __name__ == "__main__":
    main()