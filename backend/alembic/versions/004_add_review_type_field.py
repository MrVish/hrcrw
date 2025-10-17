"""Add review_type field to reviews table

Revision ID: 004_add_review_type_field
Revises: 003_add_auto_review_flags
Create Date: 2024-01-20 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004_add_review_type_field'
down_revision = '003_add_auto_review_flags'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add review_type and auto_created fields to reviews table."""
    
    # Add review_type field to distinguish different types of reviews
    op.add_column('reviews', sa.Column('review_type', sa.String(length=20), nullable=True))
    
    # Add auto_created field to track auto-generated reviews
    op.add_column('reviews', sa.Column('auto_created', sa.Boolean(), nullable=True))
    
    # Update existing records to have default values
    op.execute("UPDATE reviews SET review_type = 'manual' WHERE review_type IS NULL")
    op.execute("UPDATE reviews SET auto_created = 0 WHERE auto_created IS NULL")
    
    # Create indexes for new fields
    op.create_index('idx_reviews_review_type', 'reviews', ['review_type'])
    op.create_index('idx_reviews_auto_created', 'reviews', ['auto_created'])
    
    # Create composite indexes for efficient querying
    op.create_index('idx_reviews_type_status', 'reviews', ['review_type', 'status'])
    op.create_index('idx_reviews_auto_created_status', 'reviews', ['auto_created', 'status'])


def downgrade() -> None:
    """Remove review_type and auto_created fields from reviews table."""
    
    # Drop indexes first
    op.drop_index('idx_reviews_auto_created_status', table_name='reviews')
    op.drop_index('idx_reviews_type_status', table_name='reviews')
    op.drop_index('idx_reviews_auto_created', table_name='reviews')
    op.drop_index('idx_reviews_review_type', table_name='reviews')
    
    # Drop columns
    op.drop_column('reviews', 'auto_created')
    op.drop_column('reviews', 'review_type')