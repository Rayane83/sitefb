"""initial schema

Revision ID: 001_init
Revises: 
Create Date: 2025-08-31 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001_init'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table('users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('discord_id', sa.String(length=32), nullable=False),
        sa.Column('username', sa.String(length=64)),
        sa.Column('global_name', sa.String(length=64)),
        sa.Column('email', sa.String(length=120)),
        sa.Column('avatar', sa.String(length=128)),
        sa.Column('verified', sa.Boolean(), server_default=sa.text('0')),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('1')),
        sa.Column('access_token', sa.Text()),
        sa.Column('refresh_token', sa.Text()),
        sa.Column('token_expires_at', sa.DateTime()),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
        sa.Column('last_login', sa.DateTime()),
        sa.UniqueConstraint('discord_id'),
    )
    op.create_index('ix_users_discord_id', 'users', ['discord_id'])

    op.create_table('guilds',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('discord_guild_id', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('icon', sa.String(length=128)),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
        sa.UniqueConstraint('discord_guild_id'),
    )
    op.create_index('ix_guilds_discord_guild_id', 'guilds', ['discord_guild_id'])

    op.create_table('guild_roles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('guild_id', sa.Integer(), sa.ForeignKey('guilds.id', ondelete='CASCADE'), nullable=False),
        sa.Column('discord_role_id', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('color', sa.Integer(), server_default='0'),
        sa.Column('position', sa.Integer(), server_default='0'),
        sa.Column('permissions', sa.String(length=32)),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
        sa.UniqueConstraint('guild_id', 'discord_role_id', name='uq_guild_role'),
    )

    op.create_table('user_guild_memberships',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('guild_id', sa.Integer(), sa.ForeignKey('guilds.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('joined_at', sa.DateTime()),
    )

    op.create_table('user_roles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role_id', sa.Integer(), sa.ForeignKey('guild_roles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('assigned_at', sa.DateTime()),
        sa.UniqueConstraint('user_id', 'role_id', name='uq_user_role'),
    )

    # Domain tables subset to start
    op.create_table('enterprises',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('guild_id', sa.Integer(), sa.ForeignKey('guilds.id'), nullable=False),
        sa.Column('key', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('role_id', sa.String(length=32)),
        sa.Column('employee_role_id', sa.String(length=32)),
        sa.Column('enterprise_guild_id', sa.String(length=32)),
    )

    op.create_table('dotation_data',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('guild_id', sa.Integer(), sa.ForeignKey('guilds.id'), nullable=False),
        sa.Column('entreprise', sa.String(length=128), nullable=False),
        sa.Column('solde_actuel', sa.Float(), server_default='0'),
        sa.Column('expenses', sa.Float(), server_default='0'),
        sa.Column('withdrawals', sa.Float(), server_default='0'),
        sa.Column('commissions', sa.Float(), server_default='0'),
        sa.Column('inter_invoices', sa.Float(), server_default='0'),
    )

    op.create_table('dotation_rows',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('dotation_data_id', sa.Integer(), sa.ForeignKey('dotation_data.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('run', sa.Float(), server_default='0'),
        sa.Column('facture', sa.Float(), server_default='0'),
        sa.Column('vente', sa.Float(), server_default='0'),
        sa.Column('ca_total', sa.Float(), server_default='0'),
        sa.Column('salaire', sa.Float(), server_default='0'),
        sa.Column('prime', sa.Float(), server_default='0'),
    )

    op.create_table('dashboard_summaries',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('guild_id', sa.Integer(), sa.ForeignKey('guilds.id'), nullable=False),
        sa.Column('entreprise', sa.String(length=128), nullable=False),
        sa.Column('ca_brut', sa.Float(), server_default='0'),
        sa.Column('depenses', sa.Float(), server_default='0'),
        sa.Column('benefice', sa.Float(), server_default='0'),
        sa.Column('taux_imposition', sa.Float(), server_default='0'),
        sa.Column('montant_impots', sa.Float(), server_default='0'),
        sa.Column('employee_count', sa.Integer(), server_default='0'),
    )

    op.create_table('archive_entries',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('guild_id', sa.Integer(), sa.ForeignKey('guilds.id'), nullable=False),
        sa.Column('date', sa.String(length=32), nullable=False),
        sa.Column('type', sa.String(length=64), nullable=False),
        sa.Column('employe', sa.String(length=128)),
        sa.Column('entreprise', sa.String(length=128)),
        sa.Column('montant', sa.Float(), server_default='0'),
        sa.Column('statut', sa.String(length=32), server_default='En attente'),
    )

    op.create_table('documents',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('guild_id', sa.Integer(), sa.ForeignKey('guilds.id'), nullable=False),
        sa.Column('entreprise', sa.String(length=128), nullable=False),
        sa.Column('filename', sa.String(length=256), nullable=False),
        sa.Column('content_type', sa.String(length=64), nullable=False),
        sa.Column('size', sa.Integer(), nullable=False),
        sa.Column('file_data_base64', sa.Text(), nullable=False),
        sa.Column('uploaded_by', sa.String(length=32)),
        sa.Column('document_type', sa.String(length=64)),
    )

    op.create_table('staff_configs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('guild_id', sa.Integer(), sa.ForeignKey('guilds.id'), nullable=False),
        sa.Column('paliers_json', sa.Text()),
    )

    op.create_table('tax_brackets',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('guild_id', sa.Integer(), sa.ForeignKey('guilds.id'), nullable=False),
        sa.Column('entreprise', sa.String(length=128)),
        sa.Column('brackets_json', sa.Text()),
        sa.Column('wealth_json', sa.Text()),
    )

    op.create_table('company_configs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('guild_id', sa.Integer(), sa.ForeignKey('guilds.id'), nullable=False),
        sa.Column('entreprise_id', sa.Integer(), sa.ForeignKey('enterprises.id')),
        sa.Column('identification_json', sa.Text()),
        sa.Column('salaire_json', sa.Text()),
        sa.Column('parametres_json', sa.Text()),
        sa.Column('grade_rules_json', sa.Text()),
    )

    op.create_table('blanchiment_states',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('scope', sa.String(length=64), nullable=False),
        sa.Column('enabled', sa.Boolean(), server_default=sa.text('0')),
        sa.Column('use_global', sa.Boolean(), server_default=sa.text('1')),
        sa.Column('perc_entreprise', sa.Float(), server_default='0'),
        sa.Column('perc_groupe', sa.Float(), server_default='0'),
    )

    op.create_table('blanchiment_global',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('guild_id', sa.Integer(), sa.ForeignKey('guilds.id'), nullable=False),
        sa.Column('perc_entreprise', sa.Float(), server_default='0'),
        sa.Column('perc_groupe', sa.Float(), server_default='0'),
    )

    op.create_table('discord_configs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('client_id', sa.String(length=64), nullable=False),
        sa.Column('principal_guild_id', sa.String(length=32), nullable=False),
        sa.Column('config_json', sa.Text()),
    )


def downgrade() -> None:
    op.drop_table('discord_configs')
    op.drop_table('blanchiment_global')
    op.drop_table('blanchiment_states')
    op.drop_table('company_configs')
    op.drop_table('tax_brackets')
    op.drop_table('staff_configs')
    op.drop_table('documents')
    op.drop_table('archive_entries')
    op.drop_table('dashboard_summaries')
    op.drop_table('dotation_rows')
    op.drop_table('dotation_data')
    op.drop_table('enterprises')
    op.drop_table('user_roles')
    op.drop_table('user_guild_memberships')
    op.drop_table('guild_roles')
    op.drop_table('guilds')
    op.drop_table('users')