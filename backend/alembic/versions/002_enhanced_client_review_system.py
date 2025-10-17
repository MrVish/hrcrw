"""Enhanced Client Review System (SQLite compatible)

Revision ID: 002_enhanced_client_review_system_sqlite
Revises: 001_initial_schema_sqlite
Create Date: 2024-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002_enhanced_client_review_system'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add enhanced client fields, KYC questionnaire table, and review exceptions table (SQLite compatible)."""
    
    # Add enhanced fields to clients table (SQLite doesn't support check constraints on existing tables)
    op.add_column('clients', sa.Column('domicile_branch', sa.String(length=100), nullable=True))
    op.add_column('clients', sa.Column('relationship_manager', sa.String(length=100), nullable=True))
    op.add_column('clients', sa.Column('business_unit', sa.String(length=100), nullable=True))
    op.add_column('clients', sa.Column('aml_risk', sa.String(length=20), nullable=True))
    
    # Create indexes for new client fields
    op.create_index('idx_clients_domicile_branch', 'clients', ['domicile_branch'])
    op.create_index('idx_clients_relationship_manager', 'clients', ['relationship_manager'])
    op.create_index('idx_clients_business_unit', 'clients', ['business_unit'])
    op.create_index('idx_clients_aml_risk', 'clients', ['aml_risk'])
    
    # Create composite indexes for enhanced client filtering
    op.create_index('idx_clients_aml_risk_level', 'clients', ['aml_risk', 'risk_level'])
    op.create_index('idx_clients_business_unit_risk', 'clients', ['business_unit', 'risk_level'])
    op.create_index('idx_clients_rm_business_unit', 'clients', ['relationship_manager', 'business_unit'])
    
    # Create KYC questionnaire table
    op.create_table('kyc_questionnaires',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('review_id', sa.Integer(), nullable=False),
        
        # Question 1: Purpose of account (free text)
        sa.Column('purpose_of_account', sa.Text(), nullable=True),
        
        # Question 2: KYC documents complete (Yes/No/NA)
        sa.Column('kyc_documents_complete', sa.String(length=20), nullable=True),
        
        # Question 3: Missing KYC details (conditional free text)
        sa.Column('missing_kyc_details', sa.Text(), nullable=True),
        
        # Question 4: Account purpose aligned (Yes/No/NA)
        sa.Column('account_purpose_aligned', sa.String(length=20), nullable=True),
        
        # Question 5: Adverse media completed (Yes/No/NA)
        sa.Column('adverse_media_completed', sa.String(length=20), nullable=True),
        sa.Column('adverse_media_evidence', sa.Text(), nullable=True),
        
        # Question 6: Senior management approval (conditional Yes/No)
        sa.Column('senior_mgmt_approval', sa.String(length=20), nullable=True),
        
        # Question 7: PEP approval obtained (Yes/No/NA)
        sa.Column('pep_approval_obtained', sa.String(length=20), nullable=True),
        
        # Question 8: Static data correct (Yes/No/NA)
        sa.Column('static_data_correct', sa.String(length=20), nullable=True),
        
        # Question 9: KYC documents valid (Yes/No/NA)
        sa.Column('kyc_documents_valid', sa.String(length=20), nullable=True),
        
        # Question 10: Regulated business license (Yes/No/NA)
        sa.Column('regulated_business_license', sa.String(length=20), nullable=True),
        
        # Question 11: Remedial actions (conditional free text)
        sa.Column('remedial_actions', sa.Text(), nullable=True),
        
        # Question 12: Source of funds documents (JSON array of document IDs)
        sa.Column('source_of_funds_docs', sa.JSON(), nullable=True),
        
        # Add check constraints for enum-like fields
        sa.CheckConstraint("kyc_documents_complete IN ('yes', 'no', 'not_applicable') OR kyc_documents_complete IS NULL", name='check_kyc_documents_complete'),
        sa.CheckConstraint("account_purpose_aligned IN ('yes', 'no', 'not_applicable') OR account_purpose_aligned IS NULL", name='check_account_purpose_aligned'),
        sa.CheckConstraint("adverse_media_completed IN ('yes', 'no', 'not_applicable') OR adverse_media_completed IS NULL", name='check_adverse_media_completed'),
        sa.CheckConstraint("senior_mgmt_approval IN ('yes', 'no') OR senior_mgmt_approval IS NULL", name='check_senior_mgmt_approval'),
        sa.CheckConstraint("pep_approval_obtained IN ('yes', 'no', 'not_applicable') OR pep_approval_obtained IS NULL", name='check_pep_approval_obtained'),
        sa.CheckConstraint("static_data_correct IN ('yes', 'no', 'not_applicable') OR static_data_correct IS NULL", name='check_static_data_correct'),
        sa.CheckConstraint("kyc_documents_valid IN ('yes', 'no', 'not_applicable') OR kyc_documents_valid IS NULL", name='check_kyc_documents_valid'),
        sa.CheckConstraint("regulated_business_license IN ('yes', 'no', 'not_applicable') OR regulated_business_license IS NULL", name='check_regulated_business_license'),
        
        sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for KYC questionnaire table
    op.create_index('idx_kyc_questionnaires_review_id', 'kyc_questionnaires', ['review_id'], unique=True)
    op.create_index('idx_kyc_questionnaires_created_at', 'kyc_questionnaires', ['created_at'])
    op.create_index('idx_kyc_questionnaires_kyc_complete', 'kyc_questionnaires', ['kyc_documents_complete'])
    op.create_index('idx_kyc_questionnaires_purpose_aligned', 'kyc_questionnaires', ['account_purpose_aligned'])
    
    # Create review_exceptions table (separate from existing exceptions table)
    op.create_table('review_exceptions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('review_id', sa.Integer(), nullable=False),
        sa.Column('exception_type', sa.String(length=30), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, default='open'),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('resolved_by', sa.Integer(), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        
        # Add check constraints for enum-like fields
        sa.CheckConstraint("exception_type IN ('kyc_non_compliance', 'dormant_funded_ufaa', 'dormant_overdrawn_exit')", name='check_review_exception_type'),
        sa.CheckConstraint("status IN ('open', 'in_progress', 'resolved', 'closed')", name='check_review_exception_status'),
        
        sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['resolved_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for review_exceptions table
    op.create_index('idx_review_exceptions_review_id', 'review_exceptions', ['review_id'])
    op.create_index('idx_review_exceptions_type', 'review_exceptions', ['exception_type'])
    op.create_index('idx_review_exceptions_status', 'review_exceptions', ['status'])
    op.create_index('idx_review_exceptions_created_by', 'review_exceptions', ['created_by'])
    op.create_index('idx_review_exceptions_resolved_by', 'review_exceptions', ['resolved_by'])
    op.create_index('idx_review_exceptions_created_at', 'review_exceptions', ['created_at'])
    op.create_index('idx_review_exceptions_resolved_at', 'review_exceptions', ['resolved_at'])
    
    # Create composite indexes for review_exceptions performance optimization
    op.create_index('idx_review_exceptions_status_type', 'review_exceptions', ['status', 'exception_type'])
    op.create_index('idx_review_exceptions_review_status', 'review_exceptions', ['review_id', 'status'])
    op.create_index('idx_review_exceptions_created_status', 'review_exceptions', ['created_by', 'status'])
    op.create_index('idx_review_exceptions_resolved_status', 'review_exceptions', ['resolved_by', 'status'])


def downgrade() -> None:
    """Remove enhanced client review system changes."""
    
    # Drop review_exceptions table
    op.drop_table('review_exceptions')
    
    # Drop KYC questionnaire table
    op.drop_table('kyc_questionnaires')
    
    # Remove enhanced client fields
    op.drop_column('clients', 'aml_risk')
    op.drop_column('clients', 'business_unit')
    op.drop_column('clients', 'relationship_manager')
    op.drop_column('clients', 'domicile_branch')