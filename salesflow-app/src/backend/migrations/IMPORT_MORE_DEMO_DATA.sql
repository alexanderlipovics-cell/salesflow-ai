-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  MORE DEMO DATA - Templates & Learning Events                              ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- MEHR TEMPLATES
-- ============================================================================

-- Instagram Templates
INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT c.id, 'Story-Reaktion', 'first_contact', 
    'Hey! 👋 Hab gerade deine Story gesehen - mega cool! Wie lange machst du das schon?', 
    'instagram', true
FROM companies c WHERE c.slug = 'demo_company' ON CONFLICT DO NOTHING;

INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT c.id, 'Kommentar-Follow-up', 'follow_up', 
    'Hey {{name}}! Danke für deinen Kommentar 🙏 Wollte mal fragen, was genau dich interessiert hat?', 
    'instagram', true
FROM companies c WHERE c.slug = 'demo_company' ON CONFLICT DO NOTHING;

INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT c.id, 'Profil-Besuch', 'first_contact', 
    'Hey! Hab gesehen, dass du mein Profil besucht hast 👀 Was hat dich neugierig gemacht?', 
    'instagram', true
FROM companies c WHERE c.slug = 'demo_company' ON CONFLICT DO NOTHING;

-- WhatsApp Templates
INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT c.id, 'Warm-Intro WhatsApp', 'first_contact', 
    'Hi {{name}}! 👋 Hier ist [Name]. Hab deine Nummer von [Kontakt] bekommen - er meinte, wir sollten uns mal austauschen. Hast du kurz Zeit diese Woche?', 
    'whatsapp', true
FROM companies c WHERE c.slug = 'demo_company' ON CONFLICT DO NOTHING;

INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT c.id, 'Info-Nachfrage', 'follow_up', 
    'Hey {{name}}! 😊 Wollte mal fragen, ob du die Infos bekommen hast? Falls Fragen aufkamen, bin ich hier!', 
    'whatsapp', true
FROM companies c WHERE c.slug = 'demo_company' ON CONFLICT DO NOTHING;

INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT c.id, 'Termin-Erinnerung', 'closing', 
    'Hey {{name}}! Kurze Erinnerung an unseren Call morgen um [Uhrzeit]. Freue mich! 🙌', 
    'whatsapp', true
FROM companies c WHERE c.slug = 'demo_company' ON CONFLICT DO NOTHING;

-- Einwand-Templates
INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT c.id, 'Einwand: Muss überlegen', 'objection_handler', 
    'Verstehe ich total! 😊 Was genau möchtest du dir durch den Kopf gehen lassen? Vielleicht kann ich dir dabei helfen.', 
    'whatsapp', true
FROM companies c WHERE c.slug = 'demo_company' ON CONFLICT DO NOTHING;

INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT c.id, 'Einwand: Partner fragen', 'objection_handler', 
    'Klar, wichtige Entscheidungen bespricht man! 👍 Macht es Sinn, dass wir zu dritt kurz telefonieren? Dann kann ich beide Fragen beantworten.', 
    'whatsapp', true
FROM companies c WHERE c.slug = 'demo_company' ON CONFLICT DO NOTHING;

INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT c.id, 'Einwand: Kenne sowas schon', 'objection_handler', 
    'Oh spannend! Was genau hast du schon ausprobiert? Und was war das Ergebnis? 🤔', 
    'whatsapp', true
FROM companies c WHERE c.slug = 'demo_company' ON CONFLICT DO NOTHING;

-- Reaktivierung
INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT c.id, 'Reaktivierung nach Ghost', 'reactivation', 
    'Hey {{name}}! 👋 Lange nichts gehört... Alles gut bei dir? Nur kurz checken, ob ich dich noch auf meiner Liste behalten soll 😊', 
    'instagram', true
FROM companies c WHERE c.slug = 'demo_company' ON CONFLICT DO NOTHING;

INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT c.id, 'News-Reaktivierung', 'reactivation', 
    'Hey {{name}}! Wir haben gerade was Neues gelauncht, das perfekt zu dem passt, worüber wir mal gesprochen haben. Interesse? 🚀', 
    'whatsapp', true
FROM companies c WHERE c.slug = 'demo_company' ON CONFLICT DO NOTHING;

-- ============================================================================
-- TEMPLATE PERFORMANCE DATEN
-- ============================================================================

-- Performance für neue Templates
INSERT INTO template_performance (template_id, company_id, total_uses, total_responses, total_conversions, response_rate, conversion_rate, uses_last_30d, response_rate_30d, conversion_rate_30d, quality_score, trend)
SELECT t.id, t.company_id, 156, 72, 18, 46.2, 11.5, 52, 48.1, 13.5, 84.2, 'improving'
FROM templates t WHERE t.name = 'Story-Reaktion'
ON CONFLICT (template_id) DO UPDATE SET total_uses = 156, quality_score = 84.2;

INSERT INTO template_performance (template_id, company_id, total_uses, total_responses, total_conversions, response_rate, conversion_rate, uses_last_30d, response_rate_30d, conversion_rate_30d, quality_score, trend)
SELECT t.id, t.company_id, 89, 48, 12, 53.9, 13.5, 34, 55.9, 14.7, 87.5, 'improving'
FROM templates t WHERE t.name = 'Kommentar-Follow-up'
ON CONFLICT (template_id) DO UPDATE SET total_uses = 89, quality_score = 87.5;

INSERT INTO template_performance (template_id, company_id, total_uses, total_responses, total_conversions, response_rate, conversion_rate, uses_last_30d, response_rate_30d, conversion_rate_30d, quality_score, trend)
SELECT t.id, t.company_id, 67, 28, 5, 41.8, 7.5, 22, 40.9, 9.1, 72.3, 'stable'
FROM templates t WHERE t.name = 'Profil-Besuch'
ON CONFLICT (template_id) DO UPDATE SET total_uses = 67, quality_score = 72.3;

INSERT INTO template_performance (template_id, company_id, total_uses, total_responses, total_conversions, response_rate, conversion_rate, uses_last_30d, response_rate_30d, conversion_rate_30d, quality_score, trend)
SELECT t.id, t.company_id, 112, 68, 22, 60.7, 19.6, 45, 62.2, 20.0, 92.1, 'improving'
FROM templates t WHERE t.name = 'Warm-Intro WhatsApp'
ON CONFLICT (template_id) DO UPDATE SET total_uses = 112, quality_score = 92.1;

INSERT INTO template_performance (template_id, company_id, total_uses, total_responses, total_conversions, response_rate, conversion_rate, uses_last_30d, response_rate_30d, conversion_rate_30d, quality_score, trend)
SELECT t.id, t.company_id, 78, 42, 8, 53.8, 10.3, 28, 57.1, 10.7, 79.8, 'stable'
FROM templates t WHERE t.name = 'Info-Nachfrage'
ON CONFLICT (template_id) DO UPDATE SET total_uses = 78, quality_score = 79.8;

INSERT INTO template_performance (template_id, company_id, total_uses, total_responses, total_conversions, response_rate, conversion_rate, uses_last_30d, response_rate_30d, conversion_rate_30d, quality_score, trend)
SELECT t.id, t.company_id, 145, 124, 45, 85.5, 31.0, 58, 87.9, 32.8, 95.4, 'improving'
FROM templates t WHERE t.name = 'Termin-Erinnerung'
ON CONFLICT (template_id) DO UPDATE SET total_uses = 145, quality_score = 95.4;

INSERT INTO template_performance (template_id, company_id, total_uses, total_responses, total_conversions, response_rate, conversion_rate, uses_last_30d, response_rate_30d, conversion_rate_30d, quality_score, trend)
SELECT t.id, t.company_id, 56, 38, 14, 67.9, 25.0, 22, 68.2, 27.3, 88.9, 'stable'
FROM templates t WHERE t.name = 'Einwand: Muss überlegen'
ON CONFLICT (template_id) DO UPDATE SET total_uses = 56, quality_score = 88.9;

INSERT INTO template_performance (template_id, company_id, total_uses, total_responses, total_conversions, response_rate, conversion_rate, uses_last_30d, response_rate_30d, conversion_rate_30d, quality_score, trend)
SELECT t.id, t.company_id, 34, 22, 8, 64.7, 23.5, 12, 66.7, 25.0, 86.2, 'improving'
FROM templates t WHERE t.name = 'Einwand: Partner fragen'
ON CONFLICT (template_id) DO UPDATE SET total_uses = 34, quality_score = 86.2;

INSERT INTO template_performance (template_id, company_id, total_uses, total_responses, total_conversions, response_rate, conversion_rate, uses_last_30d, response_rate_30d, conversion_rate_30d, quality_score, trend)
SELECT t.id, t.company_id, 28, 18, 4, 64.3, 14.3, 10, 60.0, 20.0, 76.5, 'stable'
FROM templates t WHERE t.name = 'Einwand: Kenne sowas schon'
ON CONFLICT (template_id) DO UPDATE SET total_uses = 28, quality_score = 76.5;

INSERT INTO template_performance (template_id, company_id, total_uses, total_responses, total_conversions, response_rate, conversion_rate, uses_last_30d, response_rate_30d, conversion_rate_30d, quality_score, trend)
SELECT t.id, t.company_id, 67, 24, 5, 35.8, 7.5, 25, 32.0, 8.0, 62.4, 'declining'
FROM templates t WHERE t.name = 'Reaktivierung nach Ghost'
ON CONFLICT (template_id) DO UPDATE SET total_uses = 67, quality_score = 62.4;

INSERT INTO template_performance (template_id, company_id, total_uses, total_responses, total_conversions, response_rate, conversion_rate, uses_last_30d, response_rate_30d, conversion_rate_30d, quality_score, trend)
SELECT t.id, t.company_id, 45, 22, 6, 48.9, 13.3, 18, 50.0, 16.7, 74.8, 'improving'
FROM templates t WHERE t.name = 'News-Reaktivierung'
ON CONFLICT (template_id) DO UPDATE SET total_uses = 45, quality_score = 74.8;

-- ============================================================================
-- DEMO LEADS
-- ============================================================================

INSERT INTO leads (company_id, name, email, status, temperature, source, instagram_handle, tags)
SELECT c.id, 'Lisa Müller', 'lisa@example.com', 'qualified', 'warm', 'instagram', '@lisa.mueller', ARRAY['interessiert', 'omega-3']
FROM companies c WHERE c.slug = 'demo_company' ON CONFLICT DO NOTHING;

INSERT INTO leads (company_id, name, email, status, temperature, source, instagram_handle, tags)
SELECT c.id, 'Max Schmidt', 'max@example.com', 'contacted', 'hot', 'referral', '@max.schmidt', ARRAY['termin-gebucht', 'test-gemacht']
FROM companies c WHERE c.slug = 'demo_company' ON CONFLICT DO NOTHING;

INSERT INTO leads (company_id, name, email, status, temperature, source, whatsapp_number, tags)
SELECT c.id, 'Anna Weber', 'anna@example.com', 'new', 'cold', 'facebook', '+49123456789', ARRAY['neue-anfrage']
FROM companies c WHERE c.slug = 'demo_company' ON CONFLICT DO NOTHING;

INSERT INTO leads (company_id, name, email, status, temperature, source, instagram_handle, tags)
SELECT c.id, 'Thomas Bauer', 'thomas@example.com', 'proposal', 'hot', 'linkedin', '@thomas.b', ARRAY['business', 'team-aufbau']
FROM companies c WHERE c.slug = 'demo_company' ON CONFLICT DO NOTHING;

INSERT INTO leads (company_id, name, email, status, temperature, source, instagram_handle, tags)
SELECT c.id, 'Sandra Fischer', 'sandra@example.com', 'won', 'hot', 'instagram', '@sandra.f', ARRAY['kunde', 'premium']
FROM companies c WHERE c.slug = 'demo_company' ON CONFLICT DO NOTHING;

SELECT '✅ Demo-Daten importiert!' as status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Templates:' as info, COUNT(*) as count FROM templates;
SELECT 'Template Performance:' as info, COUNT(*) as count FROM template_performance;
SELECT 'Leads:' as info, COUNT(*) as count FROM leads;
SELECT 'Knowledge Items:' as info, COUNT(*) as count FROM knowledge_items;

-- Top Templates nach Quality Score
SELECT name, category, quality_score, total_uses, trend
FROM templates t
JOIN template_performance tp ON tp.template_id = t.id
ORDER BY tp.quality_score DESC
LIMIT 10;

