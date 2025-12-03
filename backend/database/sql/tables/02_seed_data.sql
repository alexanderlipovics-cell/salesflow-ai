-- ╔════════════════════════════════════════════════════════════════╗
-- ║  SEED DATA - Follow-up Playbooks & Templates                   ║
-- ╚════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- SEED: 6 FOLLOW-UP PLAYBOOKS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO followup_playbooks (id, name, description, trigger_type, delay_days, preferred_channels, message_template, subject_template, category, priority) VALUES

('proposal_no_response', 'Proposal Follow-up', 'Follow-up wenn nach Angebot keine Reaktion', 'proposal_sent', 3, ARRAY['whatsapp', 'email'], 
'Hey {{first_name}}, ich wollte nur kurz hören, wie dir das Angebot gefallen hat. Gibt es noch offene Fragen? Falls du magst, kann ich dir auch ein kurzes Vergleichsbeispiel zeigen.',
'Dein Angebot - noch Fragen?',
'reminder', 8),

('commitment_no_action', 'Zusage ohne Aktion', 'Follow-up bei Zusage ohne weitere Schritte', 'verbal_commitment', 2, ARRAY['whatsapp', 'in_app'],
'Super, dass du starten willst! 🎯 Ich hab dir mal ein Starter-Setup vorbereitet – brauchst du Hilfe bei den ersten Schritten oder soll ich dir ein kleines Video dazu senden?',
NULL,
'reminder', 9),

('callback_missed', 'Verpasster Rückruf', 'Follow-up wenn Lead sich nicht wie versprochen meldet', 'promised_callback', 1, ARRAY['whatsapp', 'in_app'],
'Hey {{first_name}}, du hattest gesagt, du meldest dich um den {{promised_date}}. Kein Stress, ich wollte nur freundlich checken, ob es zeitlich gerade noch passt oder ob ich nochmal was rausschicken darf? 😊',
NULL,
'reminder', 7),

('ghosted_after_meeting', 'Keine Reaktion nach Meeting', 'Follow-up nach Meeting ohne Antwort', 'meeting_no_response', 4, ARRAY['email', 'whatsapp'],
'Ich wollte nochmal kurz andocken an unser Gespräch – manchmal ist einfach der Alltag dazwischengekommen. Wenn es für dich noch relevant ist, kann ich auch gern nochmal die wichtigsten Punkte zusammenfassen.',
'Kurzes Follow-up zu unserem Gespräch',
'reactivation', 6),

('price_objection_silence', 'Preis-Einwand & Funkstille', 'Follow-up nach Preis-Einwand ohne weitere Reaktion', 'objection_price', 3, ARRAY['whatsapp', 'email'],
'Danke nochmal für deine Offenheit beim Thema Preis. Ich hab eine Mini-Analyse gemacht, was andere mit ähnlichem Budget gemacht haben. Darf ich dir ein Beispiel oder einen Ratenplan schicken?',
'Alternative Optionen für dich',
'objection', 7),

('nurture_30d', 'Langzeit-Nurturing', 'Follow-up nach 30 Tagen Inaktivität', 'long_inactivity', 30, ARRAY['email'],
'Hi {{first_name}}, nur ein kurzes Update: In der Zwischenzeit hat {{success_story}} den ersten Meilenstein erreicht. Falls es bei dir jetzt besser passt, können wir jederzeit locker einsteigen. 🚀',
'Quick Update - vielleicht interessant für dich',
'nurture', 4)

ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- SEED: 3 ADVANCED FOLLOW-UP TEMPLATES
-- ═══════════════════════════════════════════════════════════════

INSERT INTO followup_templates (
  name, trigger_key, channel, category,
  subject_template, short_template, body_template, 
  reminder_template, fallback_template,
  gpt_autocomplete_prompt, preview_context
) VALUES

-- 1. Inaktivität 14 Tage (WhatsApp)
(
  'Inaktivität 14 Tage - WhatsApp',
  'inactivity_14d',
  'whatsapp',
  'reactivation',
  NULL,
  'Hey {{first_name}}, alles gut bei dir? 😊',
  'Hey {{first_name}}, ich hoffe, es ist alles gut bei dir 🙌 

Ich hatte noch im Kopf, dass du Interesse hattest – wenn du Fragen hast oder einen Reminder brauchst, sag gern Bescheid. 

Ich bin da, wenn du bereit bist!',
  'Wollte nur kurz nachhaken, ob du meine Nachricht gesehen hast 😊 

Wenn du magst, können wir auch einfach kurz telefonieren!',
  'Letzter Check-In – wenn du aktuell kein Interesse hast, ist das natürlich vollkommen ok 🙏 

Gib mir einfach kurz Bescheid, dann nehme ich dich aus der Liste.',
  'Generiere für {{first_name}} nach 14 Tagen Inaktivität:
1. Reminder (2 Tage später, falls keine Antwort): freundlich nachfassen
2. Fallback (nach 5 Tagen): letzte Erinnerung, Opt-Out anbieten

Ton: empathisch, nicht drängend, WhatsApp-Stil (Emojis ok)',
  '{"first_name": "Sarah", "last_name": "Müller", "product_name": "Sales Flow AI Starter", "last_contact_days": 14}'::jsonb
),

-- 2. Proposal No Response (Email)
(
  'Proposal versendet - keine Antwort',
  'proposal_no_response',
  'email',
  'reminder',
  'Noch Fragen zum Angebot, {{first_name}}?',
  NULL,
  'Hi {{first_name}},

ich hoffe, du konntest dir das Angebot in Ruhe anschauen. 

Gibt es noch offene Fragen oder Punkte, die wir besprechen sollten?

Ich bin jederzeit für dich da – melde dich einfach!

Beste Grüße',
  'Hi {{first_name}},

ich bin morgen flexibel für ein kurzes Gespräch – sag gern, wann es für dich passt.

Falls das Angebot nicht passt, gib mir auch gerne Feedback – das hilft mir sehr!',
  'Hi {{first_name}},

wenn du erstmal pausieren willst, gib mir einfach ein kurzes Zeichen. Kein Stress 😊

Ich nehme dich dann aus der Follow-up Liste.',
  'Generiere für {{first_name}} nach Proposal-Versand ohne Antwort:
1. Reminder (2 Tage): Angebot nochmal ansprechen, Fragen anbieten
2. Fallback (5 Tage): Pause-Option anbieten, Opt-Out

Ton: professionell, hilfsbereit, Email-Format',
  '{"first_name": "Tom", "last_name": "Schmidt", "offer_name": "Premium Paket", "offer_price": "99€", "proposal_sent_days": 3}'::jsonb
),

-- 3. Zusage ohne Termin (In-App)
(
  'Zusage erhalten - kein Termin gebucht',
  'commitment_no_meeting',
  'in_app',
  'reminder',
  NULL,
  'Hey {{first_name}}, du hattest gesagt, du bist dabei 🙌',
  'Hey {{first_name}}, 

super dass du dabei bist! 🚀

Damit wir konkret weitermachen können, buche dir hier bitte einen Termin:
{{booking_link}}

Dauert nur 30 Sekunden!',
  'Ich block dir gern einen Timeslot – einfach hier klicken 💬
{{booking_link}}',
  'Wenn es doch nicht passt, alles gut – gib mir einfach ein kurzes Zeichen, dann planen wir neu 🙌',
  'Generiere für {{first_name}} bei Zusage ohne gebuchten Termin:
1. Reminder (2 Tage): Termin-Buchung nochmal anbieten
2. Fallback (5 Tage): Alternative anbieten (z.B. anderer Zeitpunkt)

Ton: motivierend, action-oriented, In-App Chat-Stil',
  '{"first_name": "Lena", "last_name": "Weber", "booking_link": "https://calendly.com/salesflow/onboarding", "commitment_date": "2025-11-20"}'::jsonb
)

ON CONFLICT (trigger_key, channel) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- SEED: 12 AI PROMPTS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ai_prompts (name, category, description, prompt_template, input_schema, is_active, is_autonomous, requires_approval) VALUES

('Preis-Einwand Handling', 'objection_handling', 'DISG-angepasste Antwort auf Preis-Einwand',
'Der Lead {{lead_name}} hat einen Preis-Einwand geäußert: "{{objection_text}}".
DISG-Typ: {{personality_type}}
Kontext: {{context_summary}}

Erstelle eine empathische, wertorientierte Antwort die:
- Den Wert statt Preis betont
- DISG-passend formuliert ist
- Eine konkrete nächste Aktion vorschlägt',
'{"lead_name": "string", "objection_text": "string", "personality_type": "string", "context_summary": "string"}'::jsonb,
TRUE, FALSE, TRUE),

('Zeit-Einwand Handling', 'objection_handling', 'Antwort auf "Keine Zeit" Einwand',
'Lead {{lead_name}} sagt: "{{objection_text}}"
Status: {{status}}
DISG: {{personality_type}}

Erstelle eine Antwort die:
- Zeit-Einwand ernst nimmt
- Konkrete Quick-Win-Option bietet
- Nächsten Micro-Schritt vorschlägt',
'{"lead_name": "string", "objection_text": "string", "status": "string", "personality_type": "string"}'::jsonb,
TRUE, FALSE, TRUE),

('Follow-up Generator', 'followup', 'Personalisierte Follow-up Message',
'Erstelle eine Follow-up Nachricht für {{lead_name}}.

Kontext:
- Letzter Kontakt: {{last_contact_days}} Tage her
- Status: {{status}}
- BANT Score: {{bant_score}}
- Personality: {{personality_type}}
- Bisheriger Kontext: {{context_summary}}

Erstelle eine persönliche, nicht-drängelnde Follow-up Nachricht für {{channel}}.',
'{"lead_name": "string", "last_contact_days": "number", "status": "string", "bant_score": "number", "personality_type": "string", "context_summary": "string", "channel": "string"}'::jsonb,
TRUE, TRUE, FALSE),

('Upsell Opportunity Finder', 'upselling', 'Findet Upsell-Möglichkeiten',
'Analysiere Lead {{lead_name}} für Upsell-Potenzial:

Aktueller Deal: {{current_value}}€
BANT Score: {{bant_score}}
Engagement: {{engagement_score}}
Bisherige Käufe: {{purchase_history}}

Empfehle:
1. Passende Upsell-Option
2. Zeitpunkt
3. Kommunikationsstrategie',
'{"lead_name": "string", "current_value": "number", "bant_score": "number", "engagement_score": "number", "purchase_history": "string"}'::jsonb,
TRUE, FALSE, TRUE),

('DISG Personality Analyzer', 'coaching', 'Analysiert Personality aus Conversation',
'Analysiere die Conversation History und bestimme den DISG-Typ:

Lead: {{lead_name}}
Conversation:
{{conversation_history}}

Gib zurück:
1. Primärer DISG-Typ (D/I/S/C)
2. Score für jeden Typ (0-100)
3. Kommunikations-Empfehlungen',
'{"lead_name": "string", "conversation_history": "string"}'::jsonb,
TRUE, TRUE, FALSE),

('Win Probability Analyse', 'coaching', 'Analysiert Deal und gibt Gewinnwahrscheinlichkeit + Empfehlungen',
'Analysiere diesen Lead und gib eine Gewinnwahrscheinlichkeit (0-100%):

Lead: {{lead_name}}
BANT Score: {{bant_score}}
Status: {{status}}
Letzte Aktivität: {{last_activity}}
Einwände: {{objections}}
Kontext: {{context_summary}}

Gib zurück:
1. Win Probability (%)
2. Top 3 Risiken
3. Top 3 nächste Schritte',
'{"lead_name": "string", "bant_score": "number", "status": "string", "last_activity": "string", "objections": "array", "context_summary": "string"}'::jsonb,
TRUE, TRUE, FALSE),

('Next Best Action', 'coaching', 'Empfiehlt nächste beste Aktion',
'Empfehle die nächste beste Aktion für {{lead_name}}:

Status: {{status}}
BANT: {{bant_score}}
Letzte Aktivität: {{last_activity}}
Stage: {{stage}}
Personality: {{personality_type}}

Gib eine konkrete, umsetzbare Empfehlung mit Timing.',
'{"lead_name": "string", "status": "string", "bant_score": "number", "last_activity": "string", "stage": "number", "personality_type": "string"}'::jsonb,
TRUE, TRUE, FALSE),

('Meeting Prep Assistant', 'coaching', 'Bereitet Sales Meeting vor',
'Bereite ein Meeting mit {{lead_name}} vor:

Company: {{company}}
Industry: {{industry}}
BANT: {{bant_score}}
Pain Points: {{pain_points}}
Einwände: {{objections}}
DISG: {{personality_type}}

Erstelle:
1. Top 3 Gesprächspunkte
2. Potenzielle Einwände + Antworten
3. Closing-Strategie',
'{"lead_name": "string", "company": "string", "industry": "string", "bant_score": "number", "pain_points": "array", "objections": "array", "personality_type": "string"}'::jsonb,
TRUE, FALSE, TRUE),

('Email Subject Line Generator', 'followup', 'Generiert überzeugende Email-Betreffzeilen',
'Generiere 5 überzeugende Email-Betreffzeilen für {{lead_name}}:

Kontext: {{context}}
Ziel: {{goal}}
DISG: {{personality_type}}

Erstelle 5 Varianten (kurz, direkt, conversion-optimiert).',
'{"lead_name": "string", "context": "string", "goal": "string", "personality_type": "string"}'::jsonb,
TRUE, FALSE, TRUE),

('Objection Pattern Analyzer', 'coaching', 'Analysiert wiederkehrende Einwand-Muster',
'Analysiere die Einwände des Users:

User: {{user_name}}
Letzte 10 Einwände: {{recent_objections}}

Finde:
1. Häufigste Einwand-Typen
2. Erfolgsrate pro Typ
3. Verbesserungs-Empfehlungen',
'{"user_name": "string", "recent_objections": "array"}'::jsonb,
TRUE, TRUE, FALSE),

('Cold Lead Reactivation', 'followup', 'Strategie für inaktive Leads',
'Erstelle Reactivation-Strategie für {{lead_name}}:

Inaktiv seit: {{inactive_days}} Tagen
Letzter Status: {{last_status}}
BANT: {{bant_score}}
Grund für Inaktivität: {{reason}}

Empfehle:
1. Reactivation Message
2. Channel
3. Incentive/Hook',
'{"lead_name": "string", "inactive_days": "number", "last_status": "string", "bant_score": "number", "reason": "string"}'::jsonb,
TRUE, FALSE, TRUE),

('Lead Scoring Auto-Update', 'coaching', 'Aktualisiert BANT-Score automatisch',
'Aktualisiere BANT-Score für {{lead_name}} basierend auf:

Aktuelle Scores:
- Budget: {{current_budget_score}}
- Authority: {{current_authority_score}}
- Need: {{current_need_score}}
- Timing: {{current_timing_score}}

Neue Informationen:
{{new_context}}

Gib zurück: Aktualisierte BANT-Scores mit Begründung.',
'{"lead_name": "string", "current_budget_score": "number", "current_authority_score": "number", "current_need_score": "number", "current_timing_score": "number", "new_context": "string"}'::jsonb,
TRUE, TRUE, FALSE)

ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- SEED: BADGES
-- ═══════════════════════════════════════════════════════════════

INSERT INTO badges (name, description, category, requirement_type, requirement_value, points, tier) VALUES
('First Blood', 'Ersten Lead gewonnen', 'deals', 'deals_won', 1, 100, 'bronze'),
('Hat Trick', '3 Deals in einer Woche', 'deals', 'deals_week', 3, 300, 'silver'),
('Deal Master', '10 Deals gewonnen', 'deals', 'deals_won', 10, 1000, 'gold'),
('Speed Demon', 'Deal in unter 7 Tagen', 'speed', 'deal_days', 7, 200, 'silver'),
('Perfect Week', '7 Tage Streak ohne Unterbrechung', 'consistency', 'streak_days', 7, 500, 'gold'),
('Network King', '50 Leads erstellt', 'volume', 'leads_created', 50, 500, 'gold'),
('Follow-up Hero', '100 Follow-ups gesendet', 'activity', 'followups_sent', 100, 300, 'silver'),
('BANT Expert', '5 Leads mit BANT > 80', 'qualification', 'high_bant_leads', 5, 400, 'gold'),
('Early Bird', 'First Login vor 8 Uhr', 'habits', 'early_login', 1, 50, 'bronze'),
('Night Owl', 'Deal abgeschlossen nach 20 Uhr', 'habits', 'late_deal', 1, 50, 'bronze'),
('Comeback Kid', '3 Lost-Leads reaktiviert', 'recovery', 'reactivated_leads', 3, 400, 'silver'),
('Objection Crusher', '20 Einwände erfolgreich behandelt', 'skills', 'objections_handled', 20, 300, 'silver')

ON CONFLICT (name) DO NOTHING;

