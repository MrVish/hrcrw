"""merge audit and exception enhancements

Revision ID: 45ad50254614
Revises: 005_add_audit_enum_values, 006_enhance_exception_model
Create Date: 2025-10-18 00:26:43.930864

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '45ad50254614'
down_revision: Union[str, None] = ('005_add_audit_enum_values', '006_enhance_exception_model')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
