"""Initial schema with all models (SQLite compatible)

Revision ID: 001_initial_schema_sqlite
Revises: 
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create all tables for the High Risk Client Review Workflow (SQLite compatible)."""
    
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.CheckConstraint("role IN ('maker', 'checker', 'admin')", name='check_user_role'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_is_active'), 'users', ['is_active'], unique=False)
    op.create_index(op.f('ix_users_name'), 'users', ['name'], unique=False)
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)
    
    # Create clients table
    op.create_table('clients',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('client_id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('risk_level', sa.String(length=20), nullable=False),
        sa.Column('country', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('last_review_date', sa.Date(), nullable=True),
        sa.CheckConstraint("risk_level IN ('low', 'medium', 'high')", name='check_client_risk_level'),
        sa.CheckConstraint("status IN ('active', 'inactive', 'suspended', 'under_review')", name='check_client_status'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_clients_client_id'), 'clients', ['client_id'], unique=True)
    op.create_index(op.f('ix_clients_country'), 'clients', ['country'], unique=False)
    op.create_index(op.f('ix_clients_id'), 'clients', ['id'], unique=False)
    op.create_index(op.f('ix_clients_name'), 'clients', ['name'], unique=False)
    op.create_index(op.f('ix_clients_risk_level'), 'clients', ['risk_level'], unique=False)
    op.create_index(op.f('ix_clients_status'), 'clients', ['status'], unique=False)
    op.create_index(op.f('ix_clients_last_review_date'), 'clients', ['last_review_date'], unique=False)
    
    # Create composite indexes for clients
    op.create_index('idx_client_risk_country', 'clients', ['risk_level', 'country'])
    op.create_index('idx_client_status_risk', 'clients', ['status', 'risk_level'])
    op.create_index('idx_client_review_date', 'clients', ['last_review_date'])
    
    # Create reviews table
    op.create_table('reviews',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('client_id', sa.String(length=50), nullable=False),
        sa.Column('submitted_by', sa.Integer(), nullable=False),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('comments', sa.Text(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.CheckConstraint("status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')", name='check_review_status'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.client_id'], ),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['submitted_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reviews_client_id'), 'reviews', ['client_id'], unique=False)
    op.create_index(op.f('ix_reviews_id'), 'reviews', ['id'], unique=False)
    op.create_index(op.f('ix_reviews_reviewed_by'), 'reviews', ['reviewed_by'], unique=False)
    op.create_index(op.f('ix_reviews_status'), 'reviews', ['status'], unique=False)
    op.create_index(op.f('ix_reviews_submitted_at'), 'reviews', ['submitted_at'], unique=False)
    op.create_index(op.f('ix_reviews_submitted_by'), 'reviews', ['submitted_by'], unique=False)
    op.create_index(op.f('ix_reviews_reviewed_at'), 'reviews', ['reviewed_at'], unique=False)
    
    # Create composite indexes for reviews
    op.create_index('idx_review_status_submitted', 'reviews', ['status', 'submitted_at'])
    op.create_index('idx_review_client_status', 'reviews', ['client_id', 'status'])
    op.create_index('idx_review_submitter_status', 'reviews', ['submitted_by', 'status'])
    op.create_index('idx_review_reviewer_status', 'reviews', ['reviewed_by', 'status'])
    
    # Create exceptions table
    op.create_table('exceptions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('review_id', sa.Integer(), nullable=False),
        sa.Column('assigned_to', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.CheckConstraint("type IN ('documentation', 'compliance', 'technical', 'regulatory', 'operational', 'other')", name='check_exception_type'),
        sa.CheckConstraint("priority IN ('low', 'medium', 'high', 'critical')", name='check_exception_priority'),
        sa.CheckConstraint("status IN ('open', 'in_progress', 'resolved', 'closed', 'escalated')", name='check_exception_status'),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_exceptions_assigned_to'), 'exceptions', ['assigned_to'], unique=False)
    op.create_index(op.f('ix_exceptions_created_by'), 'exceptions', ['created_by'], unique=False)
    op.create_index(op.f('ix_exceptions_due_date'), 'exceptions', ['due_date'], unique=False)
    op.create_index(op.f('ix_exceptions_id'), 'exceptions', ['id'], unique=False)
    op.create_index(op.f('ix_exceptions_priority'), 'exceptions', ['priority'], unique=False)
    op.create_index(op.f('ix_exceptions_resolved_at'), 'exceptions', ['resolved_at'], unique=False)
    op.create_index(op.f('ix_exceptions_review_id'), 'exceptions', ['review_id'], unique=False)
    op.create_index(op.f('ix_exceptions_status'), 'exceptions', ['status'], unique=False)
    op.create_index(op.f('ix_exceptions_title'), 'exceptions', ['title'], unique=False)
    op.create_index(op.f('ix_exceptions_type'), 'exceptions', ['type'], unique=False)
    
    # Create composite indexes for exceptions
    op.create_index('idx_exception_status_priority', 'exceptions', ['status', 'priority'])
    op.create_index('idx_exception_assigned_status', 'exceptions', ['assigned_to', 'status'])
    op.create_index('idx_exception_type_status', 'exceptions', ['type', 'status'])
    op.create_index('idx_exception_due_date', 'exceptions', ['due_date'])
    
    # Create documents table
    op.create_table('documents',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('review_id', sa.Integer(), nullable=False),
        sa.Column('uploaded_by', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=False),
        sa.Column('content_type', sa.String(length=100), nullable=False),
        sa.Column('checksum', sa.String(length=64), nullable=True),
        sa.Column('document_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('is_sensitive', sa.Boolean(), nullable=False),
        sa.Column('retention_date', sa.DateTime(), nullable=True),
        sa.Column('access_count', sa.Integer(), nullable=False),
        sa.Column('last_accessed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_documents_document_type'), 'documents', ['document_type'], unique=False)
    op.create_index(op.f('ix_documents_file_path'), 'documents', ['file_path'], unique=True)
    op.create_index(op.f('ix_documents_filename'), 'documents', ['filename'], unique=False)
    op.create_index(op.f('ix_documents_id'), 'documents', ['id'], unique=False)
    op.create_index(op.f('ix_documents_is_sensitive'), 'documents', ['is_sensitive'], unique=False)
    op.create_index(op.f('ix_documents_retention_date'), 'documents', ['retention_date'], unique=False)
    op.create_index(op.f('ix_documents_review_id'), 'documents', ['review_id'], unique=False)
    op.create_index(op.f('ix_documents_status'), 'documents', ['status'], unique=False)
    op.create_index(op.f('ix_documents_uploaded_by'), 'documents', ['uploaded_by'], unique=False)
    
    # Create composite indexes for documents
    op.create_index('idx_document_review_type', 'documents', ['review_id', 'document_type'])
    op.create_index('idx_document_status_sensitive', 'documents', ['status', 'is_sensitive'])
    op.create_index('idx_document_retention_date', 'documents', ['retention_date'])
    op.create_index('idx_document_uploader_created', 'documents', ['uploaded_by', 'created_at'])
    
    # Create audit_logs table
    op.create_table('audit_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('entity_type', sa.String(length=20), nullable=False),
        sa.Column('entity_id', sa.String(length=50), nullable=True),
        sa.Column('action', sa.String(length=20), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('session_id', sa.String(length=255), nullable=True),
        sa.Column('success', sa.String(length=10), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.CheckConstraint("entity_type IN ('user', 'client', 'review', 'exception', 'document', 'system')", name='check_audit_entity_type'),
        sa.CheckConstraint("action IN ('create', 'update', 'delete', 'login', 'logout', 'submit', 'approve', 'reject', 'assign', 'resolve', 'upload', 'download', 'access', 'export', 'archive', 'restore')", name='check_audit_action'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_entity_id'), 'audit_logs', ['entity_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_entity_type'), 'audit_logs', ['entity_type'], unique=False)
    op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)
    op.create_index(op.f('ix_audit_logs_ip_address'), 'audit_logs', ['ip_address'], unique=False)
    op.create_index(op.f('ix_audit_logs_session_id'), 'audit_logs', ['session_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_success'), 'audit_logs', ['success'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)
    
    # Create composite indexes for audit_logs
    op.create_index('idx_audit_user_action', 'audit_logs', ['user_id', 'action'])
    op.create_index('idx_audit_entity_action', 'audit_logs', ['entity_type', 'entity_id', 'action'])
    op.create_index('idx_audit_timestamp_action', 'audit_logs', ['created_at', 'action'])
    op.create_index('idx_audit_success_timestamp', 'audit_logs', ['success', 'created_at'])
    op.create_index('idx_audit_ip_timestamp', 'audit_logs', ['ip_address', 'created_at'])


def downgrade() -> None:
    """Drop all tables."""
    
    # Drop tables in reverse order of creation (to handle foreign key constraints)
    op.drop_table('audit_logs')
    op.drop_table('documents')
    op.drop_table('exceptions')
    op.drop_table('reviews')
    op.drop_table('clients')
    op.drop_table('users')