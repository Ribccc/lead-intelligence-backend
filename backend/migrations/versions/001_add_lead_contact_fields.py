"""Add website, email, phone fields to Lead model

Revision ID: 001_add_lead_contact_fields
Revises: 
Create Date: 2026-06-04 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001_add_lead_contact_fields'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add website, email, phone fields to leads table."""
    op.add_column('leads', sa.Column('website', sa.String(), nullable=True))
    op.add_column('leads', sa.Column('email', sa.String(), nullable=True))
    op.add_column('leads', sa.Column('phone', sa.String(), nullable=True))
    
    # Create index on website field for faster lookups
    op.create_index('ix_leads_website', 'leads', ['website'], unique=False)


def downgrade() -> None:
    """Remove website, email, phone fields from leads table."""
    op.drop_index('ix_leads_website', table_name='leads')
    op.drop_column('leads', 'phone')
    op.drop_column('leads', 'email')
    op.drop_column('leads', 'website')
