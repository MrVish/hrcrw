"""Add new audit action enum values

Revision ID: 005_add_audit_enum_values
Revises: 004_add_review_type_field
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005_add_audit_enum_values'
down_revision = '004_add_review_type_field'
branch_labels = None
depends_on = None


def upgrade():
    """Add new audit action and entity type enum values."""
    # Drop the old check constraints
    op.drop_constraint('check_audit_action', 'audit_logs', type_='check')
    op.drop_constraint('check_audit_entity_type', 'audit_logs', type_='check')
    
    # Create new check constraint with additional action enum values
    op.create_check_constraint(
        'check_audit_action',
        'audit_logs',
        "action IN ('create', 'update', 'delete', 'login', 'logout', 'submit', 'approve', 'reject', 'assign', 'resolve', 'upload', 'download', 'access', 'export', 'archive', 'restore', 'auto_review_creation', 'cleanup', 'error')"
    )
    
    # Create new check constraint with additional entity type enum values
    op.create_check_constraint(
        'check_audit_entity_type',
        'audit_logs',
        "entity_type IN ('USER', 'CLIENT', 'REVIEW', 'EXCEPTION', 'DOCUMENT', 'SYSTEM', 'KYC_QUESTIONNAIRE', 'NOTIFICATION', 'NOTIFICATION_QUEUE')"
    )


def downgrade():
    """Remove new audit action and entity type enum values."""
    # Drop the new check constraints
    op.drop_constraint('check_audit_action', 'audit_logs', type_='check')
    op.drop_constraint('check_audit_entity_type', 'audit_logs', type_='check')
    
    # Restore the old check constraints
    op.create_check_constraint(
        'check_audit_action',
        'audit_logs',
        "action IN ('create', 'update', 'delete', 'login', 'logout', 'submit', 'approve', 'reject', 'assign', 'resolve', 'upload', 'download', 'access', 'export', 'archive', 'restore')"
    )
    
    op.create_check_constraint(
        'check_audit_entity_type',
        'audit_logs',
        "entity_type IN ('USER', 'CLIENT', 'REVIEW', 'EXCEPTION', 'DOCUMENT', 'SYSTEM')"
    )