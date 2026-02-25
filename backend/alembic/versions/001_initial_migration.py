"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2026-02-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # Create learning_items table
    op.create_table('learning_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('normalized_content', sa.String(), nullable=True),
        sa.Column('example', sa.Text(), nullable=True),
        sa.Column('tags', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('seen_count', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_learning_items_created_at'), 'learning_items', ['created_at'], unique=False)
    op.create_index(op.f('ix_learning_items_id'), 'learning_items', ['id'], unique=False)
    op.create_index(op.f('ix_learning_items_normalized_content'), 'learning_items', ['normalized_content'], unique=False)
    op.create_index('ix_user_normalized', 'learning_items', ['user_id', 'normalized_content'], unique=False)

    # Create review_sessions table
    op.create_table('review_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=True),
        sa.Column('mode', sa.String(), nullable=False),
        sa.Column('score', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_review_sessions_date'), 'review_sessions', ['date'], unique=False)
    op.create_index(op.f('ix_review_sessions_id'), 'review_sessions', ['id'], unique=False)

    # Create srs_states table
    op.create_table('srs_states',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('interval', sa.Integer(), nullable=True),
        sa.Column('ease', sa.Float(), nullable=True),
        sa.Column('repetitions', sa.Integer(), nullable=True),
        sa.Column('next_review', sa.DateTime(), nullable=True),
        sa.Column('last_review', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['item_id'], ['learning_items.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('item_id')
    )
    op.create_index(op.f('ix_srs_states_id'), 'srs_states', ['id'], unique=False)
    op.create_index(op.f('ix_srs_states_next_review'), 'srs_states', ['next_review'], unique=False)

    # Create mistakes table
    op.create_table('mistakes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('original', sa.Text(), nullable=False),
        sa.Column('corrected', sa.Text(), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['item_id'], ['learning_items.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mistakes_id'), 'mistakes', ['id'], unique=False)

    # Create review_items table
    op.create_table('review_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('result', sa.String(), nullable=False),
        sa.Column('score', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['item_id'], ['learning_items.id'], ),
        sa.ForeignKeyConstraint(['session_id'], ['review_sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_review_items_id'), 'review_items', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_review_items_id'), table_name='review_items')
    op.drop_table('review_items')
    op.drop_index(op.f('ix_mistakes_id'), table_name='mistakes')
    op.drop_table('mistakes')
    op.drop_index(op.f('ix_srs_states_next_review'), table_name='srs_states')
    op.drop_index(op.f('ix_srs_states_id'), table_name='srs_states')
    op.drop_table('srs_states')
    op.drop_index(op.f('ix_review_sessions_id'), table_name='review_sessions')
    op.drop_index(op.f('ix_review_sessions_date'), table_name='review_sessions')
    op.drop_table('review_sessions')
    op.drop_index('ix_user_normalized', table_name='learning_items')
    op.drop_index(op.f('ix_learning_items_normalized_content'), table_name='learning_items')
    op.drop_index(op.f('ix_learning_items_id'), table_name='learning_items')
    op.drop_index(op.f('ix_learning_items_created_at'), table_name='learning_items')
    op.drop_table('learning_items')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
