"""site settings

Revision ID: 2a5d1f3c7b01
Revises: 1ca790a7c159
Create Date: 2026-04-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '2a5d1f3c7b01'
down_revision: Union[str, None] = '1ca790a7c159'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'site_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('maintenance_mode', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.execute("INSERT INTO site_settings (id, maintenance_mode) VALUES (1, false)")


def downgrade() -> None:
    op.drop_table('site_settings')
