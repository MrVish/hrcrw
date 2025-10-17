"""Add auto-review flags to clients table

Revision ID: 003_add_auto_review_flags
Revises: 002_enhanced_client_review_system
Create Date: 2024-01-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_add_auto_review_flags'
down_revision = '002_enhanced_client_review_system'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add auto-review flags to clients table."""
    
    # Add auto-review flag columns to clients table (SQLite compatible)
    # First add as nullable, then update with defaults, then make non-nullable
    op.add_column('clients', sa.Column('auto_kyc_review', sa.Boolean(), nullable=True))
    op.add_column('clients', sa.Column('auto_aml_review', sa.Boolean(), nullable=True))
    op.add_column('clients', sa.Column('auto_sanctions_review', sa.Boolean(), nullable=True))
    op.add_column('clients', sa.Column('auto_pep_review', sa.Boolean(), nullable=True))
    op.add_column('clients', sa.Column('auto_financial_review', sa.Boolean(), nullable=True))
    
    # Update all existing records to have default values
    op.execute("UPDATE clients SET auto_kyc_review = 0 WHERE auto_kyc_review IS NULL")
    op.execute("UPDATE clients SET auto_aml_review = 0 WHERE auto_aml_review IS NULL")
    op.execute("UPDATE clients SET auto_sanctions_review = 0 WHERE auto_sanctions_review IS NULL")
    op.execute("UPDATE clients SET auto_pep_review = 0 WHERE auto_pep_review IS NULL")
    op.execute("UPDATE clients SET auto_financial_review = 0 WHERE auto_financial_review IS NULL")
    
    # Create indexes for efficient querying of high-risk clients with auto-review flags
    op.create_index('idx_clients_auto_kyc_review', 'clients', ['auto_kyc_review'])
    op.create_index('idx_clients_auto_aml_review', 'clients', ['auto_aml_review'])
    op.create_index('idx_clients_auto_sanctions_review', 'clients', ['auto_sanctions_review'])
    op.create_index('idx_clients_auto_pep_review', 'clients', ['auto_pep_review'])
    op.create_index('idx_clients_auto_financial_review', 'clients', ['auto_financial_review'])
    
    # Create composite index for efficient querying of high-risk clients with any auto-review flags enabled
    op.create_index('idx_clients_high_risk_auto_reviews', 'clients', ['risk_level'], 
                   postgresql_where="risk_level = 'high' AND (auto_kyc_review = true OR auto_aml_review = true OR auto_sanctions_review = true OR auto_pep_review = true OR auto_financial_review = true)")
    
    # Create composite indexes for specific auto-review flag combinations with risk level
    op.create_index('idx_clients_risk_auto_kyc', 'clients', ['risk_level', 'auto_kyc_review'])
    op.create_index('idx_clients_risk_auto_aml', 'clients', ['risk_level', 'auto_aml_review'])
    op.create_index('idx_clients_risk_auto_sanctions', 'clients', ['risk_level', 'auto_sanctions_review'])
    op.create_index('idx_clients_risk_auto_pep', 'clients', ['risk_level', 'auto_pep_review'])
    op.create_index('idx_clients_risk_auto_financial', 'clients', ['risk_level', 'auto_financial_review'])


def downgrade() -> None:
    """Remove auto-review flags from clients table."""
    
    # Drop indexes first
    op.drop_index('idx_clients_risk_auto_financial', table_name='clients')
    op.drop_index('idx_clients_risk_auto_pep', table_name='clients')
    op.drop_index('idx_clients_risk_auto_sanctions', table_name='clients')
    op.drop_index('idx_clients_risk_auto_aml', table_name='clients')
    op.drop_index('idx_clients_risk_auto_kyc', table_name='clients')
    op.drop_index('idx_clients_high_risk_auto_reviews', table_name='clients')
    op.drop_index('idx_clients_auto_financial_review', table_name='clients')
    op.drop_index('idx_clients_auto_pep_review', table_name='clients')
    op.drop_index('idx_clients_auto_sanctions_review', table_name='clients')
    op.drop_index('idx_clients_auto_aml_review', table_name='clients')
    op.drop_index('idx_clients_auto_kyc_review', table_name='clients')
    
    # Drop columns
    op.drop_column('clients', 'auto_financial_review')
    op.drop_column('clients', 'auto_pep_review')
    op.drop_column('clients', 'auto_sanctions_review')
    op.drop_column('clients', 'auto_aml_review')
    op.drop_column('clients', 'auto_kyc_review')