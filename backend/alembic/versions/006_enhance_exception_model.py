"""Enhance exception model with comprehensive fields

Revision ID: 006_enhance_exception_model
Revises: 005
Create Date: 2024-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006_enhance_exception_model'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Enhance review_exceptions table with comprehensive fields."""
    
    # Add new columns to review_exceptions table
    op.add_column('review_exceptions', sa.Column('title', sa.String(length=255), nullable=True))
    op.add_column('review_exceptions', sa.Column('priority', sa.String(length=20), nullable=True))
    op.add_column('review_exceptions', sa.Column('due_date', sa.DateTime(timezone=True), nullable=True))
    
    # Set default values for existing records
    op.execute("UPDATE review_exceptions SET title = 'Legacy Exception' WHERE title IS NULL")
    op.execute("UPDATE review_exceptions SET priority = 'medium' WHERE priority IS NULL")
    
    # Apply not-null constraints after setting defaults
    op.alter_column('review_exceptions', 'title', nullable=False)
    op.alter_column('review_exceptions', 'priority', nullable=False)
    
    # Drop existing check constraints
    op.drop_constraint('check_review_exception_type', 'review_exceptions', type_='check')
    op.drop_constraint('check_review_exception_status', 'review_exceptions', type_='check')
    
    # Add updated check constraints with extended enum values
    op.create_check_constraint(
        'check_review_exception_type',
        'review_exceptions',
        "exception_type IN ('kyc_non_compliance', 'dormant_funded_ufaa', 'dormant_overdrawn_exit', 'documentation', 'compliance', 'technical', 'operational')"
    )
    
    op.create_check_constraint(
        'check_review_exception_status', 
        'review_exceptions',
        "status IN ('open', 'in_progress', 'resolved', 'closed')"
    )
    
    # Add check constraint for priority
    op.create_check_constraint(
        'check_review_exception_priority',
        'review_exceptions', 
        "priority IN ('low', 'medium', 'high', 'critical')"
    )
    
    # Create indexes for new fields
    op.create_index('idx_review_exceptions_priority', 'review_exceptions', ['priority'])
    op.create_index('idx_review_exceptions_due_date', 'review_exceptions', ['due_date'])
    
    # Create composite indexes for performance optimization
    op.create_index('idx_review_exceptions_priority_status', 'review_exceptions', ['priority', 'status'])
    op.create_index('idx_review_exceptions_type_priority', 'review_exceptions', ['exception_type', 'priority'])


def downgrade() -> None:
    """Remove enhanced exception model changes."""
    
    # Drop new indexes
    op.drop_index('idx_review_exceptions_type_priority', 'review_exceptions')
    op.drop_index('idx_review_exceptions_priority_status', 'review_exceptions')
    op.drop_index('idx_review_exceptions_due_date', 'review_exceptions')
    op.drop_index('idx_review_exceptions_priority', 'review_exceptions')
    
    # Drop new check constraints
    op.drop_constraint('check_review_exception_priority', 'review_exceptions', type_='check')
    
    # Restore original check constraints
    op.drop_constraint('check_review_exception_type', 'review_exceptions', type_='check')
    op.drop_constraint('check_review_exception_status', 'review_exceptions', type_='check')
    
    op.create_check_constraint(
        'check_review_exception_type',
        'review_exceptions',
        "exception_type IN ('kyc_non_compliance', 'dormant_funded_ufaa', 'dormant_overdrawn_exit')"
    )
    
    op.create_check_constraint(
        'check_review_exception_status',
        'review_exceptions',
        "status IN ('open', 'in_progress', 'resolved', 'closed')"
    )
    
    # Drop new columns
    op.drop_column('review_exceptions', 'due_date')
    op.drop_column('review_exceptions', 'priority')
    op.drop_column('review_exceptions', 'title')