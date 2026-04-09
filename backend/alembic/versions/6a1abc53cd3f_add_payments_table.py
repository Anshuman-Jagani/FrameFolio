"""add payments table

Revision ID: 6a1abc53cd3f
Revises: 
Create Date: 2026-04-05

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = '6a1abc53cd3f'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'payments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('stripe_payment_intent_id', sa.String(length=255), nullable=True),
        sa.Column('stripe_session_id', sa.String(length=255), nullable=True),
        sa.Column(
            'amount',
            sa.Integer(),
            nullable=False,
            comment='Amount in cents (e.g. 1000 = $10.00)',
        ),
        sa.Column(
            'currency',
            sa.String(length=3),
            nullable=False,
            comment='ISO 4217 lowercase currency code',
        ),
        sa.Column(
            'status',
            sa.Enum('pending', 'succeeded', 'failed', 'canceled', name='paymentstatus'),
            nullable=False,
        ),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_payments_id'), 'payments', ['id'], unique=False)
    op.create_index(op.f('ix_payments_status'), 'payments', ['status'], unique=False)
    op.create_index(
        op.f('ix_payments_stripe_payment_intent_id'),
        'payments',
        ['stripe_payment_intent_id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_payments_stripe_session_id'),
        'payments',
        ['stripe_session_id'],
        unique=True,
    )
    op.create_index(op.f('ix_payments_user_id'), 'payments', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_payments_user_id'), table_name='payments')
    op.drop_index(op.f('ix_payments_stripe_session_id'), table_name='payments')
    op.drop_index(op.f('ix_payments_stripe_payment_intent_id'), table_name='payments')
    op.drop_index(op.f('ix_payments_status'), table_name='payments')
    op.drop_index(op.f('ix_payments_id'), table_name='payments')
    op.drop_table('payments')
    op.execute("DROP TYPE IF EXISTS paymentstatus")
