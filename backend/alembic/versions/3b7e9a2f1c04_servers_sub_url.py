"""servers.sub_url

Revision ID: 3b7e9a2f1c04
Revises: 2a5d1f3c7b01
Create Date: 2026-04-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '3b7e9a2f1c04'
down_revision: Union[str, None] = '2a5d1f3c7b01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'servers',
        sa.Column('sub_url', sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('servers', 'sub_url')
