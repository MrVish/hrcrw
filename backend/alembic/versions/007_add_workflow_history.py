"""Add workflow history tracking

Revision ID: 005
Revises: 004
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007_add_workflow_history'
down_revision = '45ad50254614'
branch_labels = None
depends_on = None


def upgrade():
    # Create workflow_history table
    op.create_table('workflow_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('from_status', sa.String(50), nullable=True),
        sa.Column('to_status', sa.String(50), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('user_name', sa.String(255), nullable=False),
        sa.Column('user_role', sa.String(50), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('comments', sa.Text(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for efficient querying
    op.create_index('idx_workflow_history_entity', 'workflow_history', ['entity_type', 'entity_id'])
    op.create_index('idx_workflow_history_user', 'workflow_history', ['user_id'])
    op.create_index('idx_workflow_history_timestamp', 'workflow_history', ['timestamp'])
    op.create_index('idx_workflow_history_action', 'workflow_history', ['action'])
    
    # Add foreign key constraint to users table
    op.create_foreign_key(
        'fk_workflow_history_user_id',
        'workflow_history', 'users',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )


def downgrade():
    # Drop foreign key constraint
    op.drop_constraint('fk_workflow_history_user_id', 'workflow_history', type_='foreignkey')
    
    # Drop indexes
    op.drop_index('idx_workflow_history_action', table_name='workflow_history')
    op.drop_index('idx_workflow_history_timestamp', table_name='workflow_history')
    op.drop_index('idx_workflow_history_user', table_name='workflow_history')
    op.drop_index('idx_workflow_history_entity', table_name='workflow_history')
    
    # Drop table
    op.drop_table('workflow_history')