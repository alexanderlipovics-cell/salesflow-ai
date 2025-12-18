"""Events, AI Orchestrator & Domain Architecture

Revision ID: 20250107_events_ai_domain
Revises: 20251206_223629
Create Date: 2025-01-07

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20250107_events_ai_domain'
down_revision: Union[str, None] = '20251206_223629'  # Verweist auf consent_tables Migration
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============ SYSTEM 1: EVENTS ==================
    op.create_table(
        'events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.String(64), nullable=False),
        sa.Column('payload', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('source', sa.String(128), nullable=False),
        sa.Column('status', sa.String(32), nullable=False, server_default='pending'),
        sa.Column('correlation_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('causation_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('request_id', sa.String(64), nullable=True),
        sa.Column('meta', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
    )
    op.create_index('idx_events_tenant_type_created', 'events', ['tenant_id', 'type', sa.text('created_at DESC')])
    op.create_index('idx_events_status', 'events', ['status'])

    # ============ SYSTEM 2: AI ORCHESTRATOR ==========
    op.create_table(
        'ai_prompt_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('scenario_id', sa.String(64), nullable=False),
        sa.Column('version', sa.Integer, nullable=False),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('system_prompt', sa.Text, nullable=False),
        sa.Column('user_template', sa.Text, nullable=False),
        sa.Column('metadata', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(
        'idx_ai_prompt_templates_unique',
        'ai_prompt_templates',
        [sa.text("coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)"), 'scenario_id', 'version'],
        unique=True
    )

    op.create_table(
        'ai_call_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scenario_id', sa.String(64), nullable=False),
        sa.Column('model', sa.String(64), nullable=False),
        sa.Column('request_id', sa.String(64), nullable=True),
        sa.Column('prompt_tokens', sa.Integer, nullable=False),
        sa.Column('completion_tokens', sa.Integer, nullable=False),
        sa.Column('cost_usd', sa.Numeric(12, 6), nullable=False),
        sa.Column('latency_ms', sa.Integer, nullable=False),
        sa.Column('success', sa.Boolean, nullable=False),
        sa.Column('error_type', sa.String(128), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('idx_ai_call_logs_tenant_scenario', 'ai_call_logs', ['tenant_id', 'scenario_id', sa.text('created_at DESC')])

    op.create_table(
        'ai_token_budgets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scenario_id', sa.String(64), nullable=False),
        sa.Column('period_start', sa.Date, nullable=False),
        sa.Column('monthly_token_limit', sa.BigInteger, nullable=False),
        sa.Column('tokens_used', sa.BigInteger, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('idx_ai_token_budgets_unique', 'ai_token_budgets', ['tenant_id', 'scenario_id', 'period_start'], unique=True)

    # ============ SYSTEM 3: DOMAIN LEADS / REVIEW ====
    # Add columns to existing leads table
    op.add_column('leads', sa.Column('raw_context', postgresql.JSONB, nullable=False, server_default='{}'))
    op.add_column('leads', sa.Column('is_confirmed', sa.Boolean, nullable=False, server_default='false'))

    op.create_table(
        'lead_review_tasks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('lead_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('extraction_payload', postgresql.JSONB, nullable=False),
        sa.Column('confidence', postgresql.JSONB, nullable=False),
        sa.Column('status', sa.String(32), nullable=False, server_default='pending'),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewed_by', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index('idx_lead_review_tasks_tenant_status', 'lead_review_tasks', ['tenant_id', 'status', 'created_at'])

    # ============ SYSTEM 4: CONVERSATION ENGINE 2.0 ==========
    op.create_table(
        'channel_identities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('lead_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('channel_type', sa.String, nullable=False),
        sa.Column('identifier', sa.String, nullable=False),
        sa.Column('metadata', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('last_active_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_channel_identities_lead_id', 'channel_identities', ['lead_id'])
    op.create_index('idx_channel_identities_lookup', 'channel_identities', ['channel_type', 'identifier'])

    op.create_table(
        'conversation_summaries',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('lead_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('summary_text', sa.Text, nullable=False),
        sa.Column('key_facts', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('sentiment_snapshot', sa.Float, nullable=True),
        sa.Column('start_message_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('end_message_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_conversation_summaries_lead_id', 'conversation_summaries', ['lead_id', sa.text('created_at DESC')])

    # ============ RLS (Row Level Security) =====
    op.execute("ALTER TABLE events ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE ai_prompt_templates ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE ai_call_logs ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE ai_token_budgets ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE lead_review_tasks ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE channel_identities ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY")

    # RLS Policies
    op.execute("""
        CREATE POLICY tenant_isolation_events
        ON events
        USING (tenant_id::text = current_setting('app.tenant_id', true))
    """)
    op.execute("""
        CREATE POLICY tenant_isolation_ai_prompts
        ON ai_prompt_templates
        USING (tenant_id IS NULL OR tenant_id::text = current_setting('app.tenant_id', true))
    """)
    op.execute("""
        CREATE POLICY tenant_isolation_ai_calls
        ON ai_call_logs
        USING (tenant_id::text = current_setting('app.tenant_id', true))
    """)
    op.execute("""
        CREATE POLICY tenant_isolation_ai_budgets
        ON ai_token_budgets
        USING (tenant_id::text = current_setting('app.tenant_id', true))
    """)
    op.execute("""
        CREATE POLICY tenant_isolation_lead_review_tasks
        ON lead_review_tasks
        USING (tenant_id::text = current_setting('app.tenant_id', true))
    """)
    # RLS Policies - Prüfe ob tenant_id in leads existiert
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'leads' 
                AND column_name = 'tenant_id'
            ) THEN
                EXECUTE 'CREATE POLICY tenant_isolation_channel_identities
                    ON channel_identities
                    USING (
                        lead_id IN (
                            SELECT id FROM leads 
                            WHERE tenant_id::text = current_setting(''app.tenant_id'', true)
                        )
                    )';
                
                EXECUTE 'CREATE POLICY tenant_isolation_conversation_summaries
                    ON conversation_summaries
                    USING (
                        lead_id IN (
                            SELECT id FROM leads 
                            WHERE tenant_id::text = current_setting(''app.tenant_id'', true)
                        )
                    )';
            ELSE
                EXECUTE 'CREATE POLICY tenant_isolation_channel_identities
                    ON channel_identities
                    USING (true)';
                
                EXECUTE 'CREATE POLICY tenant_isolation_conversation_summaries
                    ON conversation_summaries
                    USING (true)';
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # Drop RLS Policies
    op.execute("DROP POLICY IF EXISTS tenant_isolation_conversation_summaries ON conversation_summaries")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_channel_identities ON channel_identities")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_lead_review_tasks ON lead_review_tasks")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_ai_budgets ON ai_token_budgets")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_ai_calls ON ai_call_logs")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_ai_prompts ON ai_prompt_templates")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_events ON events")

    # Drop tables
    op.drop_table('conversation_summaries')
    op.drop_table('channel_identities')
    op.drop_table('lead_review_tasks')
    op.drop_column('leads', 'is_confirmed')
    op.drop_column('leads', 'raw_context')
    op.drop_table('ai_token_budgets')
    op.drop_table('ai_call_logs')
    op.drop_table('ai_prompt_templates')
    op.drop_table('events')

