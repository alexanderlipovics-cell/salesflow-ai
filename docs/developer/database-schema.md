# 📊 Database Schema

SalesFlow AI nutzt **Supabase (PostgreSQL)** mit Row-Level Security (RLS).

---

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ LEADS : owns
    USERS ||--o{ CONTACTS : creates
    USERS ||--o{ DEALS : manages
    
    USERS {
        uuid id PK
        string email UK
        string password_hash
        string first_name
        string last_name
        string company
        string role
        jsonb settings
        timestamp created_at
        timestamp updated_at
    }
    
    LEADS ||--o{ CONTACTS : has
    LEADS ||--o{ DEALS : converts_to
    LEADS ||--o{ MESSAGE_EVENTS : receives
    
    LEADS {
        uuid id PK
        uuid assigned_to FK
        string email
        string first_name
        string last_name
        string company
        string title
        string phone
        enum status
        enum source
        enum priority
        int score
        decimal estimated_value
        text notes
        string[] tags
        jsonb custom_fields
        timestamp last_contacted_at
        timestamp next_follow_up
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }
    
    CONTACTS {
        uuid id PK
        uuid lead_id FK
        string email
        string first_name
        string last_name
        string phone
        string title
        enum contact_type
        boolean is_primary
        string linkedin_url
        text notes
        timestamp created_at
    }
    
    DEALS {
        uuid id PK
        uuid lead_id FK
        uuid assigned_to FK
        string name
        decimal value
        string currency
        enum stage
        int probability
        date expected_close_date
        text description
        string[] products
        timestamp closed_at
        string close_reason
        timestamp created_at
    }
    
    MESSAGE_EVENTS ||--o{ AUTOPILOT_JOBS : triggers
    
    MESSAGE_EVENTS {
        uuid id PK
        uuid user_id FK
        uuid contact_id FK
        enum channel
        enum direction
        text content
        enum status
        jsonb metadata
        timestamp created_at
    }
    
    AUTOPILOT_JOBS {
        uuid id PK
        uuid user_id FK
        uuid contact_id FK
        enum channel
        enum status
        text content
        timestamp scheduled_at
        timestamp sent_at
        int retry_count
        jsonb metadata
    }
    
    AB_TEST_EXPERIMENTS ||--o{ AB_TEST_RESULTS : tracks
    
    AB_TEST_EXPERIMENTS {
        uuid id PK
        string name
        string metric_type
        jsonb variants
        enum status
        timestamp start_date
        timestamp end_date
    }
    
    AB_TEST_RESULTS {
        uuid id PK
        uuid experiment_id FK
        string variant_id
        uuid contact_id FK
        string metric_name
        float metric_value
        timestamp created_at
    }
```

---

## Core Tables

### `users`
Benutzerkonten mit Authentifizierung.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| email | VARCHAR(255) | Unique, Login |
| password_hash | TEXT | bcrypt Hash |
| role | ENUM | admin, manager, user, viewer |
| settings | JSONB | User Preferences |

### `leads`
Potenzielle Kunden (Prospects).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| assigned_to | UUID | FK → users.id |
| status | ENUM | new, contacted, qualified, proposal, negotiation, won, lost |
| source | ENUM | website, referral, linkedin, cold_outreach, etc. |
| priority | ENUM | low, medium, high, urgent |
| score | INT | 0-100, AI-berechnet |

### `deals`
Verkaufschancen (Opportunities).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key |
| lead_id | UUID | FK → leads.id |
| stage | ENUM | discovery, qualification, proposal, negotiation, closed_won, closed_lost |
| value | DECIMAL | Deal-Wert in Währung |
| probability | INT | 0-100%, automatisch nach Stage |

---

## Status Enums

### Lead Status Flow

```mermaid
stateDiagram-v2
    [*] --> new
    new --> contacted
    new --> lost
    contacted --> qualified
    contacted --> lost
    qualified --> proposal
    qualified --> lost
    proposal --> negotiation
    proposal --> lost
    negotiation --> won
    negotiation --> lost
    lost --> new : Reopen
    won --> [*]
```

### Deal Stage Flow

```mermaid
stateDiagram-v2
    [*] --> discovery
    discovery --> qualification
    discovery --> closed_lost
    qualification --> proposal
    qualification --> closed_lost
    proposal --> negotiation
    proposal --> closed_lost
    negotiation --> closed_won
    negotiation --> closed_lost
    closed_lost --> discovery : Reopen
    closed_won --> [*]
```

---

## Row-Level Security (RLS)

```sql
-- Users can only see their own leads (unless admin/manager)
CREATE POLICY leads_user_access ON leads
    FOR ALL
    USING (
        assigned_to = auth.uid()
        OR auth.jwt()->>'role' IN ('admin', 'manager')
    );

-- Users can only modify their own data
CREATE POLICY leads_user_modify ON leads
    FOR UPDATE
    USING (assigned_to = auth.uid())
    WITH CHECK (assigned_to = auth.uid());
```

---

## Indexes

```sql
-- Performance-kritische Indexes
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_score ON leads(score DESC);

CREATE INDEX idx_deals_lead_id ON deals(lead_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_value ON deals(value DESC);

CREATE INDEX idx_contacts_lead_id ON contacts(lead_id);
CREATE INDEX idx_contacts_email ON contacts(email);
```

---

## Migrations

Alle Migrationen befinden sich in `backend/migrations/`:

| File | Description |
|------|-------------|
| `20250105_create_users_table.sql` | Users + Token Blacklist |
| `20250106_autopilot_v2_tables.sql` | Autopilot Jobs, A/B Tests |
| `step4_extend_contacts.sql` | Contact Extensions |

---

## Next Steps

- [Architecture Overview](./architecture.md)
- [API Reference](./api-reference.md)
