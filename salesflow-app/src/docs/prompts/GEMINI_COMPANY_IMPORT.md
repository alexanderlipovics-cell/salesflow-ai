# GEMINI PROMPT: Company Knowledge Import

Du erstellst strukturierte Wissensdatenbanken für Network Marketing Unternehmen.

---

## VARIABLEN

Ersetze diese Platzhalter:
- `{{COMPANY_NAME}}` - z.B. "Zinzino"
- `{{COMPANY_SLUG}}` - z.B. "zinzino"
- `{{REGION}}` - z.B. "DACH", "global"

---

## ZIEL

Strukturierte Erfassung von firmenspezifischem Wissen für:
1. Sales-Unterstützung durch KI
2. Compliance-konforme Kommunikation
3. Produktwissen für Vertriebspartner

---

## OUTPUT FORMAT

### TEIL 1: Deutsche Übersicht (600-800 Wörter)

- Unternehmensprofil
- Produktlinien (Hauptkategorien)
- Vergütungsplan (High-Level)
- Compliance-Richtlinien
- Unique Selling Points

### TEIL 2: JSON für Datenbank-Import

```json
[
  {
    "domain": "company",
    "type": "company_overview",
    "topic": "company_overview",
    "title": "{{COMPANY_NAME}} Unternehmensübersicht",
    "content": "{{COMPANY_NAME}} ist ein [Gründungsjahr] gegründetes Unternehmen aus [Land] mit Fokus auf [Produktkategorie]. Das Unternehmen operiert in [Anzahl] Märkten und ist bekannt für [USP]. Die Philosophie basiert auf [Kernwerte]. Vertrieben werden die Produkte über ein Network-Marketing-Modell mit [Anzahl] aktiven Partnern weltweit.",
    "content_short": "{{COMPANY_NAME}}: [Land]-basiertes Unternehmen für [Produktkategorie], gegründet [Jahr].",
    "source_type": "official_website",
    "source_url": "https://www.{{COMPANY_SLUG}}.com/about",
    "compliance_level": "normal",
    "requires_disclaimer": false,
    "usage_notes_for_ai": "Für allgemeine Firmenvorstellungen nutzen. Bei Zahlen auf Aktualität achten.",
    "keywords": ["{{COMPANY_SLUG}}", "unternehmen", "network_marketing", "profil"]
  },
  {
    "domain": "company",
    "type": "product_line",
    "topic": "products",
    "subtopic": "{{PRODUCT_CATEGORY}}",
    "title": "{{PRODUCT_NAME}} Produktlinie",
    "content": "{{PRODUCT_NAME}} ist die [Kategorie]-Linie von {{COMPANY_NAME}}. Hauptmerkmale:\n\n1. **Inhaltsstoffe**: [Liste der Hauptinhaltsstoffe]\n2. **Zielgruppe**: [Wer profitiert davon]\n3. **Anwendung**: [Wie wird es angewendet]\n4. **Besonderheiten**: [Was macht es einzigartig]\n\nDie Produkte basieren auf [wissenschaftliche Grundlage, falls vorhanden].",
    "content_short": "{{PRODUCT_NAME}}: [Kategorie]-Produkte mit [Hauptmerkmal].",
    "source_type": "official_website",
    "source_url": "https://www.{{COMPANY_SLUG}}.com/products/{{PRODUCT_SLUG}}",
    "compliance_level": "strict",
    "requires_disclaimer": true,
    "disclaimer_text": "Nahrungsergänzungsmittel sind kein Ersatz für eine ausgewogene Ernährung.",
    "usage_notes_for_ai": "Nur offizielle Produktaussagen verwenden. Keine eigenen Behauptungen hinzufügen.",
    "keywords": ["{{COMPANY_SLUG}}", "{{PRODUCT_SLUG}}", "produkt"]
  },
  {
    "domain": "company",
    "type": "compensation_plan",
    "topic": "compensation",
    "subtopic": "overview",
    "title": "{{COMPANY_NAME}} Vergütungsplan Übersicht",
    "content": "Der {{COMPANY_NAME}} Vergütungsplan basiert auf einem [Typ: Unilevel/Binary/Matrix/Hybrid]-System.\n\n**Hauptvergütungsarten:**\n1. Direktvertriebsprovision: [X]% auf persönliche Verkäufe\n2. Team-Bonus: [Beschreibung]\n3. Führungsboni: [Beschreibung]\n4. Weitere Incentives: [Auto-Bonus, Reisen, etc.]\n\n**Rangstufen:**\n- Einstieg: [Name]\n- Mittlere Stufen: [Namen]\n- Top-Ränge: [Namen]\n\nDie Qualifikationen basieren auf [Umsatz, Struktur, Aktivität].",
    "content_short": "{{COMPANY_NAME}}: [Typ]-System mit [Anzahl] Rangstufen und [X]% Direktprovision.",
    "source_type": "official_website",
    "compliance_level": "strict",
    "requires_disclaimer": true,
    "disclaimer_text": "Einkommen variiert je nach individuellem Einsatz. Keine Einkommensgarantie.",
    "usage_notes_for_ai": "Bei Einkommensfragen immer Disclaimer verwenden. Keine konkreten Zahlen nennen ohne offizielle Quelle.",
    "keywords": ["{{COMPANY_SLUG}}", "vergütungsplan", "provision", "bonus", "rang"]
  },
  {
    "domain": "company",
    "type": "compliance_rule",
    "topic": "compliance",
    "subtopic": "health_claims",
    "title": "{{COMPANY_NAME}} Gesundheitsaussagen-Richtlinie",
    "content": "**ERLAUBT:**\n- Zugelassene EFSA Health Claims zitieren\n- Auf Studien verweisen (mit Quelle)\n- 'Kann unterstützen', 'trägt bei zu'\n- Allgemeine Wellness-Aussagen\n\n**VERBOTEN:**\n- Heilversprechen ('heilt', 'kuriert', 'behandelt')\n- Diagnosen stellen\n- Medikamente ersetzen\n- Krankheitsbezogene Aussagen ohne Zulassung\n\n**BEISPIELE RICHTIG:**\n- 'EPA und DHA tragen zur normalen Herzfunktion bei'\n- 'Kann das Wohlbefinden unterstützen'\n\n**BEISPIELE FALSCH:**\n- 'Heilt Herzprobleme'\n- 'Ersetzt Medikamente'",
    "content_short": "Nur zugelassene Health Claims. Keine Heilversprechen. Bei Unsicherheit: weniger sagen.",
    "source_type": "official_website",
    "compliance_level": "strict",
    "requires_disclaimer": false,
    "usage_notes_for_ai": "IMMER beachten bei Produktaussagen. Bei Unsicherheit vorsichtiger formulieren.",
    "keywords": ["{{COMPANY_SLUG}}", "compliance", "health_claims", "regeln", "verboten"]
  },
  {
    "domain": "company",
    "type": "compliance_rule",
    "topic": "compliance",
    "subtopic": "income_claims",
    "title": "{{COMPANY_NAME}} Einkommensaussagen-Richtlinie",
    "content": "**ERLAUBT:**\n- Offizielle Durchschnittseinkommen (mit Quelle)\n- 'Einkommen hängt vom individuellen Einsatz ab'\n- 'Ergebnisse variieren'\n- Allgemeine Möglichkeiten beschreiben\n\n**VERBOTEN:**\n- Konkrete Einkommensversprechen\n- 'Werde schnell reich'\n- 'Passives Einkommen ohne Arbeit'\n- Unrealistische Lifestyle-Versprechen\n\n**DISCLAIMER PFLICHT:**\nBei JEDER Einkommensaussage muss folgender Hinweis erfolgen: 'Einkommen variiert je nach individuellem Einsatz und Marktsituation. Dies ist keine Einkommensgarantie.'",
    "content_short": "Keine Einkommensversprechen. Immer Disclaimer. Ergebnisse variieren.",
    "source_type": "official_website",
    "compliance_level": "strict",
    "requires_disclaimer": true,
    "disclaimer_text": "Einkommen variiert je nach individuellem Einsatz. Keine Einkommensgarantie.",
    "usage_notes_for_ai": "Bei ALLEN Einkommensfragen Disclaimer verwenden. Nie konkrete Zahlen ohne offizielle Quelle.",
    "keywords": ["{{COMPANY_SLUG}}", "compliance", "einkommen", "versprechen", "regeln"]
  },
  {
    "domain": "company",
    "type": "faq",
    "topic": "faq",
    "subtopic": "getting_started",
    "title": "Häufige Fragen: Einstieg bei {{COMPANY_NAME}}",
    "content": "**Q: Was kostet der Einstieg?**\nA: Das Starter-Kit kostet [Preis]. Es enthält [Inhalt].\n\n**Q: Muss ich jeden Monat bestellen?**\nA: [Antwort zur Mindestaktivität]\n\n**Q: Kann ich nebenberuflich starten?**\nA: Ja, [X]% der Partner starten nebenberuflich.\n\n**Q: Wie schnell verdiene ich Geld?**\nA: Das hängt von deinem Einsatz ab. Einige sehen erste Provisionen nach [Zeitraum], aber Ergebnisse variieren.\n\n**Q: Brauche ich Verkaufserfahrung?**\nA: Nein, [Beschreibung des Trainings].",
    "content_short": "FAQ zu Einstieg: Starter-Kit [Preis], nebenberuflicher Start möglich, Training inklusive.",
    "source_type": "official_website",
    "compliance_level": "normal",
    "requires_disclaimer": false,
    "usage_notes_for_ai": "Für häufige Einstiegsfragen nutzen. Bei Einkommensfragen auf Compliance-Regeln achten.",
    "keywords": ["{{COMPANY_SLUG}}", "faq", "einstieg", "start", "kosten", "fragen"]
  }
]
```

---

## LIEFERE PRO COMPANY

| Type | Anzahl | Beschreibung |
|------|--------|--------------|
| `company_overview` | 1-2 | Firmengeschichte, USP, Zahlen |
| `product_line` | 3-5 | Hauptproduktlinien |
| `product_detail` | 5-10 | Einzelprodukte (optional) |
| `compensation_plan` | 2-3 | Übersicht, Rangstufen, Boni |
| `compliance_rule` | 2-4 | Health Claims, Income Claims, Social Media |
| `faq` | 3-5 | Einstieg, Produkte, Geschäft |
| `sales_script` | 2-3 | Gesprächseinstiege, Einwandbehandlung |

---

## COMPLIANCE-CHECKLISTE

- [ ] Keine Heilversprechen
- [ ] Keine Einkommensgarantien
- [ ] Offizielle Quellen verwendet
- [ ] Disclaimer wo nötig
- [ ] `compliance_level: strict` für kritische Inhalte
- [ ] Aktuelle Informationen (Datum prüfen)

---

## BEISPIEL: Zinzino

```json
{
  "domain": "company",
  "type": "product_line",
  "topic": "products",
  "subtopic": "balance_oil",
  "title": "Zinzino BalanceOil - Omega-3 Produktlinie",
  "content": "BalanceOil ist die Kern-Produktlinie von Zinzino für die Omega-3 Supplementierung.\n\n**Produkte:**\n1. BalanceOil+ (Fischöl + Olivenöl)\n2. BalanceOil AquaX (wasserlöslich)\n3. BalanceOil Vegan (Algenöl)\n\n**Besonderheiten:**\n- Testbasiertes Konzept: Vor- und Nachtest möglich\n- Kombination mit Polyphenolen aus Olivenöl\n- Wissenschaftlich validierte Ergebnisse\n\n**Inhaltsstoffe:**\n- EPA und DHA aus Fischöl/Algen\n- Polyphenole aus Olivenöl\n- Vitamin D3\n\nDie Produkte zielen darauf ab, die Omega-6:3-Balance zu optimieren.",
  "content_short": "BalanceOil: Omega-3 + Polyphenole aus Olivenöl. Testbasiertes Konzept mit Vor-/Nachtest.",
  "source_type": "official_website",
  "source_url": "https://www.zinzino.com/products/balance",
  "compliance_level": "strict",
  "requires_disclaimer": true,
  "disclaimer_text": "Nahrungsergänzungsmittel sind kein Ersatz für eine ausgewogene Ernährung.",
  "usage_notes_for_ai": "Kernprodukt von Zinzino. Bei Wirkaussagen nur EFSA-Claims oder offizielle Studien zitieren.",
  "keywords": ["zinzino", "balanceoil", "omega3", "olivenöl", "polyphenole", "test"]
}
```

---

## QUALITÄTSKRITERIEN

1. **Genauigkeit**: Nur verifizierte Informationen von offiziellen Quellen
2. **Aktualität**: Informationen nicht älter als 1 Jahr
3. **Compliance**: Alle Aussagen regelkonform
4. **Nutzbarkeit**: Content direkt für Sales nutzbar
5. **Vollständigkeit**: Alle wichtigen Aspekte abgedeckt

