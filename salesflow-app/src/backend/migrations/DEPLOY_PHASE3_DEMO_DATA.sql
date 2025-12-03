-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 3: DEMO-DATEN                                                       ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Demo Templates einfügen
INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT 
    c.id,
    'Erstkontakt - Neugierig machen',
    'first_contact'::template_category,
    'Hey {{name}}! 👋 Bin gerade auf dein Profil gestoßen und finde toll, was du machst! Wollte nur kurz Hallo sagen 😊',
    'instagram',
    true
FROM companies c WHERE c.slug = 'demo_company'
ON CONFLICT DO NOTHING;

INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT 
    c.id,
    'Follow-up nach Story',
    'follow_up'::template_category,
    'Hey {{name}}! Hab gesehen, dass du meine Story angeschaut hast 👀 Was hat dich neugierig gemacht?',
    'instagram',
    true
FROM companies c WHERE c.slug = 'demo_company'
ON CONFLICT DO NOTHING;

INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT 
    c.id,
    'Terminvereinbarung',
    'closing'::template_category,
    'Super, dass dich das interessiert! 🙌 Wann passt es dir diese Woche für einen kurzen Call? 15-20 Min reichen völlig.',
    'whatsapp',
    true
FROM companies c WHERE c.slug = 'demo_company'
ON CONFLICT DO NOTHING;

INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT 
    c.id,
    'Einwand: Keine Zeit',
    'objection_handler'::template_category,
    'Verstehe total! Gerade deshalb ist das so spannend - dauert wirklich nur 15 Minuten und du siehst, ob es für dich passt.',
    'whatsapp',
    true
FROM companies c WHERE c.slug = 'demo_company'
ON CONFLICT DO NOTHING;

INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT 
    c.id,
    'Reaktivierung - Warm Lead',
    'reactivation'::template_category,
    'Hey {{name}}! 👋 Lang nichts gehört - wie gehts dir? Hab mich neulich an unser Gespräch erinnert...',
    'instagram',
    true
FROM companies c WHERE c.slug = 'demo_company'
ON CONFLICT DO NOTHING;

-- Demo Template Performance
INSERT INTO template_performance (template_id, company_id, total_uses, total_responses, total_conversions, 
    response_rate, conversion_rate, uses_last_30d, response_rate_30d, conversion_rate_30d, quality_score, trend)
SELECT 
    t.id, t.company_id, 127, 48, 12, 37.8, 9.4, 45, 40.0, 11.1, 78.5, 'improving'
FROM templates t WHERE t.name = 'Erstkontakt - Neugierig machen'
ON CONFLICT (template_id) DO UPDATE SET
    total_uses = 127, total_responses = 48, quality_score = 78.5;

INSERT INTO template_performance (template_id, company_id, total_uses, total_responses, total_conversions, 
    response_rate, conversion_rate, uses_last_30d, response_rate_30d, conversion_rate_30d, quality_score, trend)
SELECT 
    t.id, t.company_id, 89, 42, 8, 47.2, 9.0, 32, 50.0, 12.5, 82.3, 'stable'
FROM templates t WHERE t.name = 'Follow-up nach Story'
ON CONFLICT (template_id) DO UPDATE SET
    total_uses = 89, total_responses = 42, quality_score = 82.3;

INSERT INTO template_performance (template_id, company_id, total_uses, total_responses, total_conversions, 
    response_rate, conversion_rate, uses_last_30d, response_rate_30d, conversion_rate_30d, quality_score, trend)
SELECT 
    t.id, t.company_id, 64, 38, 22, 59.4, 34.4, 28, 60.7, 35.7, 91.2, 'improving'
FROM templates t WHERE t.name = 'Terminvereinbarung'
ON CONFLICT (template_id) DO UPDATE SET
    total_uses = 64, total_responses = 38, quality_score = 91.2;

INSERT INTO template_performance (template_id, company_id, total_uses, total_responses, total_conversions, 
    response_rate, conversion_rate, uses_last_30d, response_rate_30d, conversion_rate_30d, quality_score, trend)
SELECT 
    t.id, t.company_id, 45, 28, 11, 62.2, 24.4, 18, 66.7, 27.8, 85.7, 'stable'
FROM templates t WHERE t.name = 'Einwand: Keine Zeit'
ON CONFLICT (template_id) DO UPDATE SET
    total_uses = 45, total_responses = 28, quality_score = 85.7;

INSERT INTO template_performance (template_id, company_id, total_uses, total_responses, total_conversions, 
    response_rate, conversion_rate, uses_last_30d, response_rate_30d, conversion_rate_30d, quality_score, trend)
SELECT 
    t.id, t.company_id, 33, 14, 4, 42.4, 12.1, 12, 41.7, 16.7, 68.9, 'declining'
FROM templates t WHERE t.name = 'Reaktivierung - Warm Lead'
ON CONFLICT (template_id) DO UPDATE SET
    total_uses = 33, total_responses = 14, quality_score = 68.9;

SELECT '✅ PHASE 3 COMPLETE: Demo-Daten erstellt!' as status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '📊 Erstellte Tabellen:' as info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
AND tablename IN ('companies', 'templates', 'template_performance', 'learning_events', 'knowledge_items');

SELECT '📋 Demo Templates:' as info;
SELECT name, category, quality_score 
FROM templates t
LEFT JOIN template_performance tp ON tp.template_id = t.id
ORDER BY tp.quality_score DESC NULLS LAST;

SELECT '🎉 DEPLOYMENT COMPLETE!' as status;

