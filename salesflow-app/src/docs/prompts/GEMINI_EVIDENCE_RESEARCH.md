# GEMINI PROMPT: Evidence Hub Research

Du bist Research-Assistant für ein KI-Sales-OS im Gesundheits-/Wellness-Bereich.

## ZIEL

Erstelle eine strukturierte Wissensbasis zu:

### 1. Omega-3-Fettsäuren
- Herz-Kreislauf
- Entzündungsmarker
- Omega-6:3-Ratio
- Relevante Biomarker (Omega-3-Index, AA:EPA)

### 2. Darmgesundheit
- Ballaststoffe, Präbiotika, Probiotika
- Mikrobiom & Immunsystem
- Darmbarriere ("Leaky Gut")

### 3. Lifestyle-Faktoren
- Bewegung, Schlaf, Stress
- Entzündung & Gesundheit
- Vitamin D

---

## OUTPUT FORMAT

### TEIL 1: Deutsche Zusammenfassung (400-600 Wörter)

- Wissenschaftlich fundiert
- Keine Heilversprechen
- Formulierungen: "Studien deuten darauf hin", "kann unterstützen"
- Disclaimer: "Ersetzt keine medizinische Beratung"

### TEIL 2: JSON für Datenbank-Import

```json
[
  {
    "domain": "evidence",
    "type": "study_summary",
    "topic": "omega3",
    "subtopic": "cardiovascular",
    "title": "Omega-3-Fettsäuren und kardiovaskuläre Gesundheit: Meta-Analyse 2020",
    "content": "Eine Meta-Analyse aus dem Jahr 2020, die 13 randomisierte kontrollierte Studien mit insgesamt 127.477 Teilnehmern untersuchte, kam zu folgendem Ergebnis: Die Supplementierung mit marinen Omega-3-Fettsäuren (EPA und DHA) war mit einer signifikanten Reduktion des Risikos für Myokardinfarkt (-8%) und koronare Herzkrankheit (-7%) assoziiert. Die Effekte waren dosisabhängig, mit stärkeren Vorteilen bei höheren EPA-Dosierungen.",
    "content_short": "Meta-Analyse 2020: EPA/DHA-Supplementierung reduziert Herzinfarkt-Risiko um 8% (127.477 Teilnehmer).",
    "study_year": 2020,
    "study_authors": ["Hu Y", "Hu FB", "Manson JE"],
    "study_type": "meta_analysis",
    "study_population": "127.477 Erwachsene aus 13 RCTs",
    "study_outcomes": "Signifikante Reduktion kardiovaskulärer Events, besonders bei höherer EPA-Dosierung",
    "nutrients_or_factors": ["EPA", "DHA", "omega3"],
    "health_outcome_areas": ["cardiovascular", "mortality"],
    "evidence_level": "high",
    "source_type": "peer_reviewed",
    "source_reference": "JAMA Cardiology. 2020;5(8):867-877. doi:10.1001/jamacardio.2020.1127",
    "compliance_level": "normal",
    "requires_disclaimer": true,
    "disclaimer_text": "Diese Information ersetzt keine medizinische Beratung.",
    "usage_notes_for_ai": "Nutzen für allgemeine Erklärungen zu Omega-3 und Herzgesundheit. Bei konkreten Dosierungsempfehlungen auf individuelle Beratung verweisen.",
    "keywords": ["omega3", "herz", "EPA", "DHA", "kardiovaskulär", "meta-analyse"]
  },
  {
    "domain": "evidence",
    "type": "health_claim",
    "topic": "omega3",
    "subtopic": "efsa_claims",
    "title": "EFSA zugelassene Health Claims für Omega-3",
    "content": "Die Europäische Behörde für Lebensmittelsicherheit (EFSA) hat folgende Health Claims für Omega-3-Fettsäuren zugelassen:\n\n1. EPA und DHA tragen zu einer normalen Herzfunktion bei (bei 250 mg EPA+DHA/Tag)\n2. DHA trägt zur Erhaltung einer normalen Gehirnfunktion bei (bei 250 mg DHA/Tag)\n3. DHA trägt zur Erhaltung einer normalen Sehkraft bei (bei 250 mg DHA/Tag)\n4. Die Aufnahme von DHA durch die Mutter trägt zur normalen Entwicklung des Gehirns und der Augen beim Fötus und beim gestillten Säugling bei (bei 200 mg DHA zusätzlich zu 250 mg EPA+DHA/Tag)\n5. EPA und DHA tragen zur Aufrechterhaltung eines normalen Triglyceridspiegels im Blut bei (bei 2g EPA+DHA/Tag)",
    "content_short": "EFSA: EPA+DHA unterstützen Herzfunktion (250mg/Tag), DHA unterstützt Gehirn & Sehkraft.",
    "evidence_level": "high",
    "source_type": "guideline",
    "source_reference": "EFSA Journal 2012;10(7):2815",
    "source_url": "https://efsa.onlinelibrary.wiley.com/doi/epdf/10.2903/j.efsa.2012.2815",
    "compliance_level": "strict",
    "requires_disclaimer": false,
    "usage_notes_for_ai": "Diese Claims sind offiziell zugelassen und dürfen so kommuniziert werden. Exakte Formulierungen verwenden!",
    "keywords": ["omega3", "EFSA", "health_claim", "EPA", "DHA", "zugelassen"]
  },
  {
    "domain": "evidence",
    "type": "study_summary",
    "topic": "omega3",
    "subtopic": "omega_6_3_ratio",
    "title": "Omega-6:3-Ratio und Gesundheitsoutcomes",
    "content": "Das Verhältnis von Omega-6 zu Omega-3-Fettsäuren in der westlichen Ernährung liegt typischerweise bei 15:1 bis 20:1, während unsere Vorfahren ein Verhältnis von etwa 1:1 hatten. Forschungsergebnisse deuten darauf hin, dass ein erhöhtes Omega-6:3-Verhältnis mit verstärkten Entzündungsprozessen assoziiert ist. Laut einer Übersichtsarbeit von Simopoulos (2008) ist ein Verhältnis von 4:1 oder niedriger mit einer 70% geringeren kardiovaskulären Mortalität assoziiert. Ein Verhältnis von 2-3:1 zeigte positive Effekte bei rheumatoider Arthritis.",
    "content_short": "Omega-6:3-Ratio von unter 4:1 ist mit 70% geringerer kardiovaskulärer Mortalität assoziiert.",
    "study_year": 2008,
    "study_authors": ["Simopoulos AP"],
    "study_type": "review",
    "nutrients_or_factors": ["omega6", "omega3", "ratio"],
    "health_outcome_areas": ["inflammation", "cardiovascular"],
    "evidence_level": "moderate",
    "source_type": "peer_reviewed",
    "source_reference": "Biomed Pharmacother. 2008;62(9):554-563",
    "compliance_level": "normal",
    "requires_disclaimer": true,
    "disclaimer_text": "Individuelle Ergebnisse können variieren. Bei gesundheitlichen Bedenken Arzt konsultieren.",
    "usage_notes_for_ai": "Gut für Erklärungen, warum Ratio wichtig ist. Nicht als Diagnose-Tool verwenden.",
    "keywords": ["ratio", "omega6", "omega3", "entzündung", "balance"]
  },
  {
    "domain": "evidence",
    "type": "study_summary",
    "topic": "gut_health",
    "subtopic": "microbiome",
    "title": "Darm-Mikrobiom und systemische Gesundheit",
    "content": "Das menschliche Darmmikrobiom beherbergt etwa 100 Billionen Mikroorganismen und beeinflusst zahlreiche Körperfunktionen. Studien zeigen Verbindungen zwischen Mikrobiom-Zusammensetzung und: 1) Immunfunktion (70% der Immunzellen befinden sich im Darm), 2) Stoffwechselgesundheit (Produktion kurzkettiger Fettsäuren), 3) Gehirnfunktion via Darm-Hirn-Achse, 4) Entzündungsregulation. Eine diverse Mikrobiom-Zusammensetzung wird generell als positiv bewertet.",
    "content_short": "Darmmikrobiom beeinflusst Immunsystem (70% der Immunzellen im Darm), Stoffwechsel und Gehirnfunktion.",
    "nutrients_or_factors": ["microbiome", "fiber", "probiotics"],
    "health_outcome_areas": ["immune", "metabolic", "brain"],
    "evidence_level": "moderate",
    "source_type": "peer_reviewed",
    "compliance_level": "normal",
    "requires_disclaimer": true,
    "disclaimer_text": "Forschung entwickelt sich stetig weiter. Keine medizinische Beratung.",
    "keywords": ["darm", "mikrobiom", "immunsystem", "darm-hirn-achse"]
  },
  {
    "domain": "evidence",
    "type": "guideline",
    "topic": "vitamin_d",
    "subtopic": "reference_values",
    "title": "Vitamin D Referenzwerte und Empfehlungen",
    "content": "Die Deutsche Gesellschaft für Ernährung (DGE) empfiehlt bei fehlender endogener Synthese 20 µg (800 IE) Vitamin D pro Tag für Erwachsene. Serumwerte: Mangel < 30 nmol/l (12 ng/ml), Suboptimal 30-50 nmol/l, Optimal > 50 nmol/l (20 ng/ml). Einige Experten empfehlen höhere Zielwerte von 75-125 nmol/l. Vitamin D trägt zur normalen Funktion des Immunsystems bei (EFSA Health Claim).",
    "content_short": "DGE: 800 IE Vitamin D/Tag. Optimal: >50 nmol/l im Serum. Unterstützt Immunsystem (EFSA).",
    "evidence_level": "high",
    "source_type": "guideline",
    "source_url": "https://www.dge.de/wissenschaft/referenzwerte/vitamin-d/",
    "compliance_level": "strict",
    "requires_disclaimer": true,
    "disclaimer_text": "Vitamin D Status sollte bei Bedarf ärztlich überprüft werden.",
    "keywords": ["vitamin_d", "DGE", "immunsystem", "referenzwerte"]
  }
]
```

---

## ANFORDERUNGEN

- **Mindestens 8-12 Studien zu Omega-3**
- **Mindestens 6-8 zu Darmgesundheit**
- **3-5 offizielle Guidelines** (EFSA, WHO, DGE)
- Nur peer-reviewed oder offizielle Quellen
- `evidence_level` ehrlich einschätzen
- Deutsche Sprache für Content
- Keywords für bessere Suche

---

## EVIDENCE LEVEL GUIDE

| Level | Beschreibung | Beispiele |
|-------|--------------|-----------|
| `high` | RCTs, große Meta-Analysen, offizielle Guidelines | EFSA Claims, Cochrane Reviews |
| `moderate` | Kohortenstudien, kleinere RCTs, systematische Reviews | Populationsstudien |
| `limited` | Beobachtungsstudien, Fallberichte, In-vitro | Pilot-Studien |
| `expert_opinion` | Expertenmeinung, Leitlinien ohne starke Evidenz | Konsensus-Papiere |

---

## WICHTIGE HINWEISE

1. **Compliance beachten**: Keine Heilversprechen, keine Diagnosen
2. **Quellen immer angeben**: DOI, PubMed-Link oder offizielle URL
3. **Aktualität**: Bevorzuge Studien der letzten 10 Jahre
4. **Disclaimer**: Bei allen gesundheitsbezogenen Aussagen erforderlich

