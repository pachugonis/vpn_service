"""add server stats columns

Revision ID: 4c8f2d5e9a03
Revises: 3b7e9a2f1c04
Create Date: 2026-04-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '4c8f2d5e9a03'
down_revision: Union[str, None] = '3b7e9a2f1c04'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('servers', sa.Column('online_clients', sa.Integer(), server_default='0', nullable=False))
    op.add_column('servers', sa.Column('cpu_usage', sa.Float(), server_default='0', nullable=False))
    op.add_column('servers', sa.Column('mem_usage', sa.Float(), server_default='0', nullable=False))


def downgrade() -> None:
    op.drop_column('servers', 'mem_usage')
    op.drop_column('servers', 'cpu_usage')
    op.drop_column('servers', 'online_clients')
