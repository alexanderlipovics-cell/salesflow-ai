# Sales Flow AI - ER Diagram (Speed Hunter System)

## Overview
This document describes the database schema for the Speed Hunter gamified lead contact system with compliance checking and DISG profiling.

---

## 2.1 Entities & Key Fields

### auth.users
- `id` (PK) - UUID, primary key
- Standard Supabase auth table

### user_profiles
- `id` (PK, FK → auth.users.id)
- `default_company_id` (FK → mlm_companies.id)

### user_company_members
- `id` (PK)
- `user_id` (FK → auth.users.id)
- `company_id` (FK → mlm_companies.id)
- `role` ('member','leader','admin')

### mlm_companies
- `id` (PK)
- `slug`
- `display_name`
- `default_language`
- `compliance_profile`
- `risk_level`

### leads
- `id` (PK)
- `owner_user_id` (FK → auth.users.id)
- `company_id` (FK → mlm_companies.id)
- `disc_primary`, `disc_secondary`, `disc_confidence`
- `stage`
- `last_contact_at`, `next_contact_due_at`

### disc_analyses
- `id` (PK)
- `lead_id` (FK → leads.id)
- `user_id` (FK → auth.users.id)
- `source` ('ai_chat', 'manual', 'survey')
- `disc_primary`, `disc_secondary`
- `confidence`
- `rationale`

### templates
- `id` (PK)
- `company_id` (FK → mlm_companies.id)
- `funnel_stage`, `channel`, `use_case`, `persona_hint`

### template_translations
- `id` (PK)
- `template_id` (FK → templates.id)
- `language_code`, `body`, `tone_variation`

### template_performance
- `id` (PK)
- `template_id` (FK → templates.id)
- `translation_id` (FK → template_translations.id)
- `company_id` (FK → mlm_companies.id)
- Metrics: `open_rate`, `reply_rate`, `conversion_rate`

### speed_hunter_sessions
- `id` (PK)
- `user_id` (FK → auth.users.id)
- `company_id` (FK → mlm_companies.id)
- `daily_goal`
- `mode` ('points' | 'contacts')
- `created_at`, `updated_at`

### speed_hunter_actions
- `id` (PK)
- `session_id` (FK → speed_hunter_sessions.id)
- `user_id` (FK → auth.users.id)
- `lead_id` (FK → leads.id)
- `action_type` ('call','message','snooze','done')
- `outcome` ('no_answer','interested','follow_up_scheduled',...)
- `points`
- `template_id`, `translation_id`
- `channel`
- `created_at`

### objection_templates
- `id` (PK)
- `company_id` (FK → mlm_companies.id)
- `objection_key`
- `response_script`
- `success_rate`
- `tone`

### objection_logs
- `id` (PK)
- `lead_id` (FK → leads.id)
- `user_id` (FK → auth.users.id)
- `company_id` (FK → mlm_companies.id)
- `objection_key`
- `funnel_stage`
- `disc_type`
- `template_id` (FK → objection_templates.id)
- `language_code`
- `response_style`
- `outcome` ('won','lost','pending')
- `notes`
- `created_at`

### compliance_rules
- `id` (PK)
- `company_id` (FK → mlm_companies.id, optional - NULL = global rule)
- `locale`
- `category`
- `pattern` (regex or keyword)
- `pattern_type` ('keyword' | 'regex')
- `severity` ('warn' | 'block')
- `is_active`

### compliance_violations
- `id` (PK)
- `user_id` (FK → auth.users.id)
- `company_id` (FK → mlm_companies.id)
- `rule_id` (FK → compliance_rules.id)
- `category`, `severity`
- `locale`
- `original_text`
- `suggested_text`
- `metadata` (JSONB)
- `created_at`

---

## 2.2 Relationships (ER Notation)

```
[auth.users] 1 ─── 1 [user_profiles]

[auth.users] 1 ───< [user_company_members] >─── 1 [mlm_companies]

[auth.users] 1 ───< [leads]
[mlm_companies] 1 ───< [leads]

[leads] 1 ───< [disc_analyses]
[auth.users] 1 ───< [disc_analyses]

[mlm_companies] 1 ───< [templates]
[templates] 1 ───< [template_translations]
[templates] 1 ───< [template_performance]
[mlm_companies] 1 ───< [template_performance]

[auth.users] 1 ───< [speed_hunter_sessions]
[mlm_companies] 1 ───< [speed_hunter_sessions]

[auth.users] 1 ───< [speed_hunter_actions]
[leads] 1 ───< [speed_hunter_actions]
[speed_hunter_sessions] 1 ───< [speed_hunter_actions]

[mlm_companies] 1 ───< [objection_templates]
[leads] 1 ───< [objection_logs]
[auth.users] 1 ───< [objection_logs]
[objection_templates] 1 ───< [objection_logs]
[mlm_companies] 1 ───< [objection_logs]

[mlm_companies] 1 ───< [compliance_rules]
[compliance_rules] 1 ───< [compliance_violations]
[auth.users] 1 ───< [compliance_violations]
[mlm_companies] 1 ───< [compliance_violations]
```

---

## Visual Layout (for draw.io / Lucidchart)

### Left Side:
- `auth.users`
- `user_profiles`
- `user_company_members`

### Center:
- `mlm_companies` (hub)
- `leads`
- `templates`
- `template_translations`
- `template_performance`

### Right Side:
- `speed_hunter_sessions`
- `speed_hunter_actions`
- `disc_analyses`
- `objection_templates`
- `objection_logs`
- `compliance_rules`
- `compliance_violations`

---

## Notes

- All foreign keys should have appropriate CASCADE or SET NULL behavior
- Indexes should be created on frequently queried fields (user_id, company_id, lead_id, etc.)
- JSONB fields (metadata) allow flexible schema evolution
- Timestamps (created_at, updated_at) should be auto-managed via triggers

