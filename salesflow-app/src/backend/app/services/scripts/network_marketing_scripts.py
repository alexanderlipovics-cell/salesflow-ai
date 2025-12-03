"""
╔════════════════════════════════════════════════════════════════════════════╗
║  NETWORK MARKETING SCRIPT LIBRARY                                           ║
║  50+ bewährte Scripts für jede Situation im Network Marketing               ║
╚════════════════════════════════════════════════════════════════════════════╝

Version: 1.0 - Dezember 2025
"""

from uuid import uuid4
from .models import (
    Script,
    ScriptCategory,
    ScriptContext,
    RelationshipLevel,
    DISGType,
    ScriptVariant,
)


def generate_id() -> str:
    return str(uuid4())


# =============================================================================
# 1. ERSTKONTAKT SCRIPTS
# =============================================================================

# --- 1.1 Warmer Markt (Familie/Freunde) ---

SCRIPT_01 = Script(
    id=generate_id(),
    number=1,
    name="Der ehrliche Ansatz",
    category=ScriptCategory.ERSTKONTAKT,
    context=ScriptContext.WARM_FAMILIE,
    relationship_level=RelationshipLevel.WARM,
    description="Authentischer Ansatz für Familie und enge Freunde",
    text="""Hey [Name]! 👋

Ich weiß, das kommt jetzt vielleicht überraschend, aber ich hab 
vor kurzem etwas Spannendes angefangen und du bist eine der 
ersten Personen, an die ich gedacht habe.

Es geht um [Produkt/Thema] - und bevor du jetzt denkst "Oh nein, 
will der mir was verkaufen" 😅 - ich würde dir einfach gerne 
kurz zeigen, worum es geht. 

Wenn's nichts für dich ist, völlig okay. Aber ich würde mich 
über deine ehrliche Meinung freuen.

Hättest du diese Woche 15 Minuten Zeit für einen kurzen Call?""",
    variables=["Name", "Produkt", "Thema"],
    tags=["ehrlich", "authentisch", "familie", "freunde"],
)

SCRIPT_02 = Script(
    id=generate_id(),
    number=2,
    name="Die indirekte Methode",
    category=ScriptCategory.ERSTKONTAKT,
    context=ScriptContext.WARM_FREUNDE,
    relationship_level=RelationshipLevel.WARM,
    description="Indirekte Ansprache - fragt nach Empfehlungen",
    text="""Hey [Name], kurze Frage:

Kennst du jemanden, der gerade offen wäre für eine 
Nebeneinkommen-Möglichkeit? 

Mir ist letztens was über den Weg gelaufen, das richtig gut 
funktioniert, und ich suche ein paar motivierte Leute.

Falls dir spontan jemand einfällt - oder du selbst neugierig 
bist - lass es mich wissen! 🙌""",
    variables=["Name"],
    tags=["indirekt", "empfehlung", "nebeneinkommen"],
)

SCRIPT_03 = Script(
    id=generate_id(),
    number=3,
    name="Der Produktfokus",
    category=ScriptCategory.ERSTKONTAKT,
    context=ScriptContext.WARM_FREUNDE,
    relationship_level=RelationshipLevel.WARM,
    description="Fokus auf Produkt-Lösung für bekanntes Problem",
    text="""Hey [Name]! 

Ich erinnere mich, dass du mal erwähnt hast, dass du 
[Problem/Wunsch] hast. 

Ich nutze seit [Zeitraum] etwas, das mir dabei echt geholfen 
hat, und musste sofort an dich denken.

Soll ich dir mal kurz erzählen, was das ist?""",
    variables=["Name", "Problem", "Wunsch", "Zeitraum"],
    tags=["produkt", "lösung", "persönlich"],
)

SCRIPT_04 = Script(
    id=generate_id(),
    number=4,
    name="Nach langer Zeit (Reconnect)",
    category=ScriptCategory.ERSTKONTAKT,
    context=ScriptContext.WARM_FREUNDE,
    relationship_level=RelationshipLevel.LAUWARMER,
    description="Wiederaufnahme nach längerer Pause",
    text="""Hey [Name]! 👋

Lange nicht gehört - ich hoffe, es geht dir gut!

Ich melde mich, weil ich gerade an einem spannenden Projekt 
arbeite und dabei an dich denken musste. Du warst schon immer 
jemand, der [positive Eigenschaft].

Hast du Lust, dich mal kurz auszutauschen? Würde mich freuen 
zu hören, was bei dir so los ist!""",
    variables=["Name", "positive Eigenschaft"],
    tags=["reconnect", "wiederaufnahme", "lange-nicht-gesehen"],
)


# --- 1.2 Kalter Markt (Neue Kontakte) ---

SCRIPT_05 = Script(
    id=generate_id(),
    number=5,
    name="Nach Event/Networking",
    category=ScriptCategory.ERSTKONTAKT,
    context=ScriptContext.KALT_EVENT,
    relationship_level=RelationshipLevel.KALT,
    description="Follow-up nach einem Event oder Networking",
    text="""Hey [Name]!

Schön, dich bei [Event] kennengelernt zu haben! 
Unser Gespräch über [Thema] hat mich echt zum Nachdenken gebracht.

Ich arbeite gerade an etwas, das dazu passen könnte. 
Hättest du Interesse, mehr zu erfahren?

Kein Druck - aber ich glaube, es könnte interessant für dich sein.""",
    variables=["Name", "Event", "Thema"],
    tags=["event", "networking", "cold-approach"],
)

SCRIPT_06 = Script(
    id=generate_id(),
    number=6,
    name="Social Media Interaktion",
    category=ScriptCategory.ERSTKONTAKT,
    context=ScriptContext.KALT_SOCIAL,
    relationship_level=RelationshipLevel.KALT,
    description="Nach Social Media Interaktion (Like, Follow)",
    text="""Hey [Name]! 👋

Danke fürs Folgen/Liken! Ich hab gesehen, dass du dich für 
[Thema aus Profil] interessierst.

Darf ich fragen, was dich daran am meisten begeistert?

Ich frage, weil ich selbst in dem Bereich unterwegs bin und 
immer gerne neue Perspektiven höre! 🙌""",
    variables=["Name", "Thema aus Profil"],
    tags=["social-media", "follow", "like"],
)

SCRIPT_07 = Script(
    id=generate_id(),
    number=7,
    name="Über gemeinsamen Kontakt",
    category=ScriptCategory.ERSTKONTAKT,
    context=ScriptContext.KALT_GEMEINSAM,
    relationship_level=RelationshipLevel.LAUWARMER,
    description="Kontaktaufnahme über gemeinsame Bekannte",
    text="""Hey [Name]!

[Gemeinsamer Kontakt] hat mir von dir erzählt und meinte, 
wir sollten uns unbedingt mal austauschen.

Ich bin gerade auf der Suche nach [Beschreibung] und 
[Gemeinsamer Kontakt] meinte, du könntest genau die 
richtige Person sein.

Hast du kurz Zeit für ein Gespräch?""",
    variables=["Name", "Gemeinsamer Kontakt", "Beschreibung"],
    tags=["empfehlung", "gemeinsamer-kontakt"],
)

SCRIPT_08 = Script(
    id=generate_id(),
    number=8,
    name="Der Kompliment-Opener",
    category=ScriptCategory.ERSTKONTAKT,
    context=ScriptContext.KALT_SOCIAL,
    relationship_level=RelationshipLevel.KALT,
    description="Einstieg mit authentischem Kompliment",
    text="""Hey [Name]!

Ich folge dir schon eine Weile und bin echt beeindruckt von 
[spezifisches Kompliment - Content, Business, etc.].

Ich arbeite selbst im Bereich [Branche/Thema] und würde 
mich gerne mal mit dir austauschen.

Bist du offen für ein kurzes Kennenlernen?""",
    variables=["Name", "spezifisches Kompliment", "Branche", "Thema"],
    tags=["kompliment", "wertschätzung", "cold-approach"],
)


# --- 1.3 Online-Leads (Werbung/Funnel) ---

SCRIPT_09 = Script(
    id=generate_id(),
    number=9,
    name="Schnelle Reaktion auf Anfrage",
    category=ScriptCategory.ERSTKONTAKT,
    context=ScriptContext.ONLINE_LEAD,
    relationship_level=RelationshipLevel.LAUWARMER,
    description="Sofort-Antwort auf Online-Lead",
    text="""Hey [Name]! 🎉

Super, dass du dich für [Thema/Produkt] interessierst!

Bevor ich dir mehr Infos schicke - kurze Frage:
Was hat dich dazu bewogen, dich einzutragen?

So kann ich dir die passenden Infos geben! 👍""",
    variables=["Name", "Thema", "Produkt"],
    tags=["online-lead", "funnel", "schnell"],
)

SCRIPT_10 = Script(
    id=generate_id(),
    number=10,
    name="Webinar/Video Follow-Up",
    category=ScriptCategory.ERSTKONTAKT,
    context=ScriptContext.ONLINE_LEAD,
    relationship_level=RelationshipLevel.LAUWARMER,
    description="Nach Webinar oder Video-Ansicht",
    text="""Hey [Name]!

Ich hab gesehen, dass du dir [Webinar/Video] angeschaut hast.

Was war dein größter Aha-Moment dabei?

Ich frage, weil ich dir gerne helfen möchte, den nächsten 
Schritt zu machen - wenn du bereit bist!""",
    variables=["Name", "Webinar", "Video"],
    tags=["webinar", "video", "follow-up"],
)


# =============================================================================
# 2. FOLLOW-UP SCRIPTS
# =============================================================================

# --- 2.1 Nach Präsentation (Tag 1-3) ---

SCRIPT_11 = Script(
    id=generate_id(),
    number=11,
    name="Sofort-Follow-Up (< 24h)",
    category=ScriptCategory.FOLLOW_UP,
    context=ScriptContext.NACH_PRAESENTATION,
    relationship_level=RelationshipLevel.HEISS,
    description="Innerhalb 24 Stunden nach Präsentation",
    text="""Hey [Name]! 

Danke nochmal, dass du dir die Zeit genommen hast! 🙏

Ich wollte kurz nachfragen: Was hat dich am meisten angesprochen?

Und gibt es noch offene Fragen, die ich dir beantworten kann?""",
    variables=["Name"],
    tags=["follow-up", "schnell", "24h"],
)

SCRIPT_12 = Script(
    id=generate_id(),
    number=12,
    name="48-Stunden Check-In",
    category=ScriptCategory.FOLLOW_UP,
    context=ScriptContext.NACH_PRAESENTATION,
    relationship_level=RelationshipLevel.HEISS,
    description="Nach 48 Stunden nachhaken",
    text="""Hey [Name]!

Ich wollte mal kurz nachhaken - hast du schon Zeit gehabt, 
über das nachzudenken, was ich dir gezeigt habe?

Falls ja: Was geht dir durch den Kopf?
Falls nein: Kein Problem! Wann passt es dir besser?""",
    variables=["Name"],
    tags=["follow-up", "48h", "check-in"],
)

SCRIPT_13 = Script(
    id=generate_id(),
    number=13,
    name="Mit sanfter Dringlichkeit",
    category=ScriptCategory.FOLLOW_UP,
    context=ScriptContext.NACH_PRAESENTATION,
    relationship_level=RelationshipLevel.HEISS,
    description="Follow-up mit zeitlichem Anreiz",
    text="""Hey [Name]!

Nur kurz: [Aktion/Angebot] läuft noch bis [Datum].

Ich will keinen Druck machen, aber wollte sichergehen, 
dass du das auf dem Schirm hast.

Sollen wir nochmal kurz telefonieren?""",
    variables=["Name", "Aktion", "Angebot", "Datum"],
    tags=["follow-up", "dringlichkeit", "deadline"],
)


# --- 2.2 "Ghosted" - Keine Antwort ---

SCRIPT_14 = Script(
    id=generate_id(),
    number=14,
    name="Der freundliche Reminder (nach 3-5 Tagen)",
    category=ScriptCategory.FOLLOW_UP,
    context=ScriptContext.GHOSTED,
    relationship_level=RelationshipLevel.WARM,
    description="Freundliche Erinnerung nach einigen Tagen",
    text="""Hey [Name]! 👋

Ich hoffe, bei dir ist alles okay! 
Ich wollte nur kurz nachfragen, ob du meine letzte 
Nachricht bekommen hast.

Kein Stress - ich weiß, das Leben ist manchmal hektisch. 
Gib mir einfach Bescheid, wenn du Zeit hast!""",
    variables=["Name"],
    tags=["ghost", "reminder", "freundlich"],
)

SCRIPT_15 = Script(
    id=generate_id(),
    number=15,
    name="Der Take-Away (nach 7-10 Tagen)",
    category=ScriptCategory.FOLLOW_UP,
    context=ScriptContext.GHOSTED,
    relationship_level=RelationshipLevel.WARM,
    description="Wegnehmen der Möglichkeit (Psychologie)",
    text="""Hey [Name]!

Ich merke, gerade ist wohl nicht der richtige Zeitpunkt für dich - 
und das ist völlig okay! 🙌

Ich nehme dich erstmal von meiner aktiven Liste.
Wenn sich bei dir was ändert und du nochmal reden möchtest, 
melde dich einfach.

Alles Gute! 🙏""",
    variables=["Name"],
    tags=["ghost", "take-away", "abschluss"],
)

SCRIPT_16 = Script(
    id=generate_id(),
    number=16,
    name="Der Humor-Versuch",
    category=ScriptCategory.FOLLOW_UP,
    context=ScriptContext.GHOSTED,
    relationship_level=RelationshipLevel.WARM,
    description="Mit Humor die Spannung nehmen",
    text="""Hey [Name]! 

Ich fange an zu glauben, dass meine Nachrichten im 
Bermuda-Dreieck verschwinden 😅

Kurze Frage: Soll ich...
A) Dir nochmal Infos schicken?
B) Später nochmal nachhaken?
C) Dich in Ruhe lassen?

Ein Buchstabe reicht! 😊""",
    variables=["Name"],
    tags=["ghost", "humor", "abc"],
)


# --- 2.3 Langzeit-Follow-Up (30-90+ Tage) ---

SCRIPT_17 = Script(
    id=generate_id(),
    number=17,
    name="Der Check-In nach Monaten",
    category=ScriptCategory.FOLLOW_UP,
    context=ScriptContext.LANGZEIT,
    relationship_level=RelationshipLevel.WARM,
    description="Nach längerer Zeit wieder melden",
    text="""Hey [Name]!

Wir haben vor ein paar Monaten mal über [Thema] gesprochen.
Damals war nicht der richtige Zeitpunkt - wollte mal 
nachfragen, wie es dir geht!

Hat sich bei dir was verändert seitdem?""",
    variables=["Name", "Thema"],
    tags=["langzeit", "check-in", "monate"],
)

SCRIPT_18 = Script(
    id=generate_id(),
    number=18,
    name="Mit News/Update",
    category=ScriptCategory.FOLLOW_UP,
    context=ScriptContext.LANGZEIT,
    relationship_level=RelationshipLevel.WARM,
    description="Langzeit-Follow-up mit Neuigkeit",
    text="""Hey [Name]!

Ich musste gerade an dich denken, weil [relevante Neuigkeit].

Erinnerst du dich, als wir über [Thema] gesprochen haben?
Das könnte jetzt interessant für dich sein!

Hast du kurz Zeit?""",
    variables=["Name", "relevante Neuigkeit", "Thema"],
    tags=["langzeit", "news", "update"],
)

SCRIPT_19 = Script(
    id=generate_id(),
    number=19,
    name="Der Erfolgsgeschichten-Teiler",
    category=ScriptCategory.FOLLOW_UP,
    context=ScriptContext.LANGZEIT,
    relationship_level=RelationshipLevel.WARM,
    description="Erfolgsgeschichte als Aufhänger",
    text="""Hey [Name]!

Kurze Update: [Name eines anderen Kunden/Partners] hat 
gerade [Erfolg] erreicht - und ich musste sofort an 
unser Gespräch von damals denken.

Wäre das nicht auch was für dich?
Lass uns mal quatschen! 🚀""",
    variables=["Name", "Name eines anderen Kunden/Partners", "Erfolg"],
    tags=["langzeit", "erfolgsgeschichte", "social-proof"],
)


# =============================================================================
# 3. EINWAND-BEHANDLUNG
# =============================================================================

# --- 3.1 "Keine Zeit" ---

SCRIPT_20 = Script(
    id=generate_id(),
    number=20,
    name="Zeit-Einwand (Standard)",
    category=ScriptCategory.EINWAND,
    context=ScriptContext.KEINE_ZEIT,
    relationship_level=RelationshipLevel.WARM,
    description="Standard-Antwort auf Keine-Zeit-Einwand",
    text="""Das verstehe ich total! Zeit ist wertvoll.

Darf ich dich was fragen? Wenn du WÜSSTEST, dass das 
funktioniert und dir [gewünschtes Ergebnis] bringen könnte - 
würdest du dir dann die Zeit nehmen?

[Wenn ja]: Super! Dann lass uns schauen, wie wir das in 
deinen Alltag integrieren können. Viele meiner Partner 
arbeiten nur [X] Stunden pro Woche daran.

[Wenn nein]: Kein Problem! Was müsste passieren, damit 
es für dich interessant wird?""",
    variables=["gewünschtes Ergebnis", "X"],
    tags=["einwand", "zeit", "hypothetisch"],
)

SCRIPT_21 = Script(
    id=generate_id(),
    number=21,
    name="Zeit-Einwand (Perspektivwechsel)",
    category=ScriptCategory.EINWAND,
    context=ScriptContext.KEINE_ZEIT,
    relationship_level=RelationshipLevel.WARM,
    description="Zeit-Einwand mit Perspektivwechsel",
    text="""Ich höre dich! "Keine Zeit" ist der Hauptgrund, warum 
Menschen bei sowas zögern.

Aber lass mich dich was fragen: Wie viel Zeit verbringst 
du aktuell damit, Geld zu verdienen, das nie mehr wird?

Was wäre, wenn du [X] Stunden pro Woche investierst, 
um langfristig MEHR Zeit zu haben?""",
    variables=["X"],
    tags=["einwand", "zeit", "perspektive"],
)


# --- 3.2 "Kein Geld" ---

SCRIPT_22 = Script(
    id=generate_id(),
    number=22,
    name="Geld-Einwand (Standard)",
    category=ScriptCategory.EINWAND,
    context=ScriptContext.KEIN_GELD,
    relationship_level=RelationshipLevel.WARM,
    description="Standard-Antwort auf Kein-Geld-Einwand",
    text="""Das verstehe ich. Geld ist gerade bei vielen knapp.

Aber genau deshalb zeige ich dir das ja! 
Es geht darum, eine zusätzliche Einnahmequelle aufzubauen.

Die Startkosten sind [X] - das ist weniger als [Vergleich: 
ein Abendessen, ein Tankfüllung, etc.].

Und das Beste: Du kannst das Geld oft schon im ersten 
Monat wieder reinholen. Sollen wir mal rechnen?""",
    variables=["X", "Vergleich"],
    tags=["einwand", "geld", "roi"],
)

SCRIPT_23 = Script(
    id=generate_id(),
    number=23,
    name="Geld-Einwand (Prioritäten)",
    category=ScriptCategory.EINWAND,
    context=ScriptContext.KEIN_GELD,
    relationship_level=RelationshipLevel.WARM,
    description="Geld-Einwand mit Prioritäten-Vergleich",
    text="""Ich verstehe, dass Geld ein Thema ist.

Aber lass mich dich was fragen: Wie viel gibst du im 
Monat für [Netflix, Kaffee, etc.] aus?

Was wäre, wenn du einen Teil davon für einen Monat 
in dich selbst investierst - und dann entscheidest, 
ob es sich lohnt?""",
    variables=["Netflix", "Kaffee"],
    tags=["einwand", "geld", "prioritäten"],
)


# --- 3.3 "Muss mit Partner/Familie sprechen" ---

SCRIPT_24 = Script(
    id=generate_id(),
    number=24,
    name="Partner-Einwand (Standard)",
    category=ScriptCategory.EINWAND,
    context=ScriptContext.PARTNER_FRAGEN,
    relationship_level=RelationshipLevel.WARM,
    description="Standard-Antwort auf Partner-Einwand",
    text="""Absolut! Wichtige Entscheidungen sollte man zusammen treffen. 👍

Was genau möchtest du mit [Partner] besprechen? 
Vielleicht kann ich dir helfen, die richtigen Punkte 
zusammenzufassen.

Oder besser noch: Sollen wir einen Termin machen, bei dem 
[Partner] dabei sein kann? Dann können alle Fragen direkt 
geklärt werden!""",
    variables=["Partner"],
    tags=["einwand", "partner", "familie"],
)

SCRIPT_25 = Script(
    id=generate_id(),
    number=25,
    name="Partner-Einwand (Verständnis)",
    category=ScriptCategory.EINWAND,
    context=ScriptContext.PARTNER_FRAGEN,
    relationship_level=RelationshipLevel.WARM,
    description="Partner-Einwand mit tieferem Verständnis",
    text="""Das respektiere ich total!

Kurze Frage: Brauchst du die Erlaubnis - oder möchtest 
du die Meinung hören?

[Wenn Meinung]: Was denkst DU denn darüber? 
Ist es grundsätzlich interessant für dich?

[Wenn Erlaubnis]: Was glaubst du, wird [Partner] sagen?""",
    variables=["Partner"],
    tags=["einwand", "partner", "erlaubnis"],
)


# --- 3.4 "Ist das MLM / Pyramidensystem?" ---

SCRIPT_26 = Script(
    id=generate_id(),
    number=26,
    name="Der direkte Konter",
    category=ScriptCategory.EINWAND,
    context=ScriptContext.MLM_PYRAMIDE,
    relationship_level=RelationshipLevel.WARM,
    description="Direkte Antwort auf MLM/Pyramiden-Vorwurf",
    text="""Gute Frage! Ich mag Menschen, die kritisch hinterfragen. 🙌

Kurze Antwort: Nein, es ist kein Pyramidensystem.

Der Unterschied: Bei einem Pyramidensystem verdient man 
NUR durch Rekrutierung. Bei uns verdienen Menschen mit 
echten Produkten, die echte Probleme lösen.

Ich selbst [konkrete Erfolgsgeschichte mit Produkt].

Darf ich dir zeigen, wie das genau funktioniert?""",
    variables=["konkrete Erfolgsgeschichte mit Produkt"],
    tags=["einwand", "mlm", "pyramide", "aufklärung"],
)

SCRIPT_27 = Script(
    id=generate_id(),
    number=27,
    name="Die FTC-Erklärung",
    category=ScriptCategory.EINWAND,
    context=ScriptContext.MLM_PYRAMIDE,
    relationship_level=RelationshipLevel.WARM,
    description="Faktenbasierte Antwort mit behördlicher Referenz",
    text="""Ich verstehe die Bedenken - es gibt leider schwarze Schafe.

Aber hier sind die Fakten: Die FTC (und in DE die IHK) 
unterscheidet ganz klar zwischen illegalem Pyramidensystem 
und legalem Network Marketing.

Der Schlüssel: Bei uns steht das PRODUKT im Vordergrund.
[X]% unseres Umsatzes kommt von echten Endkunden, die 
das Produkt lieben - nicht von Partnern.

Soll ich dir mal zeigen, was das Produkt kann?""",
    variables=["X"],
    tags=["einwand", "mlm", "fakten", "ftc"],
)

SCRIPT_28 = Script(
    id=generate_id(),
    number=28,
    name="Die persönliche Story",
    category=ScriptCategory.EINWAND,
    context=ScriptContext.MLM_PYRAMIDE,
    relationship_level=RelationshipLevel.WARM,
    description="Persönliche Geschichte als Überzeugung",
    text="""Ich hab am Anfang genauso gedacht wie du! 😅

Dann hab ich mir die Zahlen angeschaut:
- Unser Unternehmen ist [X] Jahre alt
- [X] Millionen Kunden weltweit
- Börsennotiert / Mitglied bei [Verband]

Und das Wichtigste: Ich kenne persönlich [X] Menschen, 
die damit [konkreter Erfolg] erreicht haben.

Willst du einen davon kennenlernen?""",
    variables=["X", "Verband", "konkreter Erfolg"],
    tags=["einwand", "mlm", "story", "zahlen"],
)


# --- 3.5 "Ich kenne niemanden" ---

SCRIPT_29 = Script(
    id=generate_id(),
    number=29,
    name="Netzwerk-Einwand",
    category=ScriptCategory.EINWAND,
    context=ScriptContext.KENNE_NIEMANDEN,
    relationship_level=RelationshipLevel.WARM,
    description="Antwort auf Ich-kenne-niemanden-Einwand",
    text="""Das höre ich oft! Und weißt du was? Die meisten 
erfolgreichen Partner haben auch so angefangen.

Hier ist die Wahrheit: Du kennst mehr Menschen als du denkst.
Allein auf Social Media hast du wahrscheinlich [X] Kontakte.

Aber noch wichtiger: Ich zeige dir, wie du NEUE Menschen 
kennenlernst - Menschen, die aktiv nach sowas suchen!""",
    variables=["X"],
    tags=["einwand", "netzwerk", "kontakte"],
)

SCRIPT_30 = Script(
    id=generate_id(),
    number=30,
    name="Die Zahlen-Perspektive",
    category=ScriptCategory.EINWAND,
    context=ScriptContext.KENNE_NIEMANDEN,
    relationship_level=RelationshipLevel.WARM,
    description="Mit konkreten Zahlen überzeugen",
    text="""Interessant! Lass uns mal rechnen:

- Wie viele Kontakte hast du im Handy? [X]
- Wie viele Facebook/Instagram Freunde? [X]
- Wie viele Kollegen/Ex-Kollegen? [X]

Das sind wahrscheinlich [Summe] Menschen.

Wenn nur 5% davon offen wären... das wären [Zahl] Gespräche!

Und das Beste: Du musst nicht mit allen reden. 
Wir fangen mit 10 an. Deal?""",
    variables=["X", "Summe", "Zahl"],
    tags=["einwand", "netzwerk", "zahlen", "rechnen"],
)


# --- 3.6 "Ich bin nicht der Verkäufer-Typ" ---

SCRIPT_31 = Script(
    id=generate_id(),
    number=31,
    name="Anti-Verkäufer Response",
    category=ScriptCategory.EINWAND,
    context=ScriptContext.NICHT_VERKAUFER,
    relationship_level=RelationshipLevel.WARM,
    description="Für Menschen die sich nicht als Verkäufer sehen",
    text="""Perfekt! Ich auch nicht. 😊

Hier ist das Geheimnis: Die besten Network Marketer 
VERKAUFEN nicht - sie TEILEN.

Du teilst ja auch deinen Lieblingsfilm oder ein gutes 
Restaurant mit Freunden, oder?

Genau das machen wir hier - nur dass du dafür bezahlt wirst!""",
    variables=[],
    tags=["einwand", "verkäufer", "teilen"],
)

SCRIPT_32 = Script(
    id=generate_id(),
    number=32,
    name="System-Fokus",
    category=ScriptCategory.EINWAND,
    context=ScriptContext.NICHT_VERKAUFER,
    relationship_level=RelationshipLevel.WARM,
    description="Das System macht die Arbeit",
    text="""Das Gute ist: Du musst gar kein Verkäufer sein!

Unser System macht die "Verkaufsarbeit":
- Videos erklären das Produkt
- Webinare beantworten Fragen
- Ich helfe bei den ersten Gesprächen

Deine Aufgabe? Einfach Menschen einladen. 
Das ist alles. Kannst du das?""",
    variables=[],
    tags=["einwand", "verkäufer", "system"],
)


# --- 3.7 Weitere Einwände ---

SCRIPT_33 = Script(
    id=generate_id(),
    number=33,
    name="Ich hab schon mal MLM probiert",
    category=ScriptCategory.EINWAND,
    context=ScriptContext.SCHON_VERSUCHT,
    relationship_level=RelationshipLevel.WARM,
    description="Für Menschen mit negativer MLM-Erfahrung",
    text="""Das ist wertvoll! Du hast also schon Erfahrung.

Darf ich fragen, was damals nicht funktioniert hat?

[Zuhören]

Das macht Sinn. Bei uns ist das anders, weil [konkreter Unterschied].
Aber noch wichtiger: Ich werde dich nicht alleine lassen.
Mein Job ist es, sicherzustellen, dass du erfolgreich wirst.""",
    variables=["konkreter Unterschied"],
    tags=["einwand", "erfahrung", "mlm"],
)

SCRIPT_34 = Script(
    id=generate_id(),
    number=34,
    name="Es funktioniert nur für die oben",
    category=ScriptCategory.EINWAND,
    context=ScriptContext.NUR_OBEN,
    relationship_level=RelationshipLevel.WARM,
    description="Gegen das 'Nur die oben verdienen'-Argument",
    text="""Ich verstehe, woher dieser Eindruck kommt.

Aber hier ist die Realität: Ich hab erst vor [X] Monaten 
angefangen und [konkreter Erfolg].

Und ich kenne [Name], der erst [kürzlich] gestartet ist 
und schon [Erfolg] erreicht hat.

Das "Oben" wird jeden Tag von Menschen aufgebaut, 
die irgendwann angefangen haben. Warum nicht du?""",
    variables=["X", "konkreter Erfolg", "Name", "kürzlich", "Erfolg"],
    tags=["einwand", "oben", "timing"],
)

SCRIPT_35 = Script(
    id=generate_id(),
    number=35,
    name="Lass mich drüber nachdenken",
    category=ScriptCategory.EINWAND,
    context=ScriptContext.NACHDENKEN,
    relationship_level=RelationshipLevel.WARM,
    description="Wenn jemand nachdenken will",
    text="""Klar! Worüber genau möchtest du nachdenken?

[Zuhören für echten Einwand]

Ich frage, weil ich dir vielleicht jetzt schon helfen 
kann, Klarheit zu bekommen. Und dann kannst du eine 
fundierte Entscheidung treffen.

Was würdest du gerne wissen?""",
    variables=[],
    tags=["einwand", "nachdenken", "klarheit"],
)


# =============================================================================
# 4. CLOSING SCRIPTS
# =============================================================================

# --- 4.1 Soft Close ---

SCRIPT_36 = Script(
    id=generate_id(),
    number=36,
    name="Der Fragen-Close",
    category=ScriptCategory.CLOSING,
    context=ScriptContext.SOFT_CLOSE,
    relationship_level=RelationshipLevel.HEISS,
    description="Sanfter Abschluss mit Skalenfrage",
    text="""Basierend auf allem, was du gehört hast...

Auf einer Skala von 1-10: Wie interessiert bist du?

[Wenn 7+]: Super! Was fehlt noch zum 10er?
[Wenn <7]: Was müsste passieren, damit es interessanter wird?""",
    variables=[],
    tags=["closing", "soft", "skala"],
)

SCRIPT_37 = Script(
    id=generate_id(),
    number=37,
    name="Der Zusammenfassungs-Close",
    category=ScriptCategory.CLOSING,
    context=ScriptContext.SOFT_CLOSE,
    relationship_level=RelationshipLevel.HEISS,
    description="Zusammenfassung und sanfter Abschluss",
    text="""Lass mich kurz zusammenfassen, was wir besprochen haben:

Du willst [Ziel], und [Produkt/Opportunity] kann dir 
dabei helfen, weil [Gründe].

Die einzige Frage ist: Willst du es versuchen?

Was meinst du?""",
    variables=["Ziel", "Produkt", "Opportunity", "Gründe"],
    tags=["closing", "soft", "zusammenfassung"],
)


# --- 4.2 Assumptive Close ---

SCRIPT_38 = Script(
    id=generate_id(),
    number=38,
    name="Der Nächste-Schritte-Close",
    category=ScriptCategory.CLOSING,
    context=ScriptContext.ASSUMPTIVE_CLOSE,
    relationship_level=RelationshipLevel.HEISS,
    description="Assumptive Close mit nächsten Schritten",
    text="""Super! Ich freu mich, dass du dabei bist! 🎉

Der nächste Schritt ist ganz einfach:
1. [Schritt 1]
2. [Schritt 2]
3. [Schritt 3]

Sollen wir das jetzt zusammen durchgehen, oder 
schickst du mir kurz [benötigte Info]?""",
    variables=["Schritt 1", "Schritt 2", "Schritt 3", "benötigte Info"],
    tags=["closing", "assumptive", "schritte"],
)

SCRIPT_39 = Script(
    id=generate_id(),
    number=39,
    name="Der Wahl-Close",
    category=ScriptCategory.CLOSING,
    context=ScriptContext.ASSUMPTIVE_CLOSE,
    relationship_level=RelationshipLevel.HEISS,
    description="Zwei Optionen zur Auswahl",
    text="""Perfekt! Du hast zwei Optionen:

Option A: [Starter-Paket] - ideal für [Situation]
Option B: [Größeres Paket] - perfekt für [Situation]

Was passt besser zu dir?""",
    variables=["Starter-Paket", "Größeres Paket", "Situation"],
    tags=["closing", "assumptive", "optionen"],
)


# --- 4.3 Urgency Close ---

SCRIPT_40 = Script(
    id=generate_id(),
    number=40,
    name="Der Deadline-Close",
    category=ScriptCategory.CLOSING,
    context=ScriptContext.URGENCY_CLOSE,
    relationship_level=RelationshipLevel.HEISS,
    description="Abschluss mit Deadline",
    text="""Ich will ehrlich sein: [Angebot/Aktion] gibt es nur noch 
bis [Datum].

Danach [was sich ändert].

Ich will keinen Druck machen - aber ich will auch nicht, 
dass du das verpasst.

Was sagst du?""",
    variables=["Angebot", "Aktion", "Datum", "was sich ändert"],
    tags=["closing", "urgency", "deadline"],
)

SCRIPT_41 = Script(
    id=generate_id(),
    number=41,
    name="Der Morgen-Close",
    category=ScriptCategory.CLOSING,
    context=ScriptContext.URGENCY_CLOSE,
    relationship_level=RelationshipLevel.HEISS,
    description="Warum heute besser als morgen ist",
    text="""Lass mich dich was fragen:

Wenn du HEUTE startest, bist du [Zeitraum] früher am Ziel.

Was ist der Unterschied zwischen heute und morgen?
Nur eine Entscheidung.

Bist du bereit, diese Entscheidung zu treffen?""",
    variables=["Zeitraum"],
    tags=["closing", "urgency", "entscheidung"],
)


# =============================================================================
# 5. TEAM-ONBOARDING
# =============================================================================

# --- 5.1 Willkommen im Team ---

SCRIPT_42 = Script(
    id=generate_id(),
    number=42,
    name="Erste Nachricht nach Sign-Up",
    category=ScriptCategory.ONBOARDING,
    context=ScriptContext.WILLKOMMEN,
    relationship_level=RelationshipLevel.HEISS,
    description="Willkommensnachricht für neue Teammitglieder",
    text="""🎉 WILLKOMMEN IM TEAM, [Name]! 🎉

Das war die beste Entscheidung! Ich bin so excited, 
mit dir zu arbeiten.

Hier ist, was als nächstes passiert:

1️⃣ HEUTE: Ich schicke dir unseren Quick-Start Guide
2️⃣ MORGEN: Wir haben unseren ersten Call (15 Min)
3️⃣ DIESE WOCHE: Du machst deine ersten 5 Kontakte

Eine Sache noch: Du bist NICHT alleine. Ich bin für dich da.
Bei Fragen - schreib mir einfach!

Lass uns das rocken! 🚀""",
    variables=["Name"],
    tags=["onboarding", "willkommen", "start"],
)

SCRIPT_43 = Script(
    id=generate_id(),
    number=43,
    name="Quick-Start Anleitung",
    category=ScriptCategory.ONBOARDING,
    context=ScriptContext.WILLKOMMEN,
    relationship_level=RelationshipLevel.HEISS,
    description="Quick-Start Guide für die ersten 48 Stunden",
    text="""Hey [Name]! 

Hier dein Quick-Start für die ersten 48 Stunden:

✅ SCHRITT 1: Produkt bestellen/nutzen
   → Du musst es kennen und lieben!

✅ SCHRITT 2: Liste mit 20 Namen erstellen
   → Jeder, der dir einfällt (nicht filtern!)

✅ SCHRITT 3: Deine "Warum" aufschreiben
   → Warum machst du das? Was ist dein Ziel?

✅ SCHRITT 4: Ersten 3 Menschen schreiben
   → Ich gebe dir das Script!

Fragen? Ich bin hier! 💪""",
    variables=["Name"],
    tags=["onboarding", "quick-start", "anleitung"],
)


# --- 5.2 Erste Schritte Coaching ---

SCRIPT_44 = Script(
    id=generate_id(),
    number=44,
    name="Vor dem ersten Gespräch",
    category=ScriptCategory.ONBOARDING,
    context=ScriptContext.ERSTE_SCHRITTE,
    relationship_level=RelationshipLevel.HEISS,
    description="Coaching vor dem ersten Verkaufsgespräch",
    text="""Hey [Name]!

Morgen ist dein erstes Gespräch mit [Prospect] - aufgeregt? 😊

Hier sind meine Top-Tipps:

1. ENTSPANN DICH - es ist nur ein Gespräch
2. STELL FRAGEN - finde heraus, was SIE wollen
3. HÖREN - 80% zuhören, 20% reden
4. KEIN DRUCK - du lädst ein, mehr nicht

Und das Wichtigste: Egal wie es läuft - es ist Übung!

Du schaffst das! Melde dich danach bei mir! 🙌""",
    variables=["Name", "Prospect"],
    tags=["onboarding", "coaching", "erstes-gespräch"],
)

SCRIPT_45 = Script(
    id=generate_id(),
    number=45,
    name="Nach erstem Gespräch (egal wie es lief)",
    category=ScriptCategory.ONBOARDING,
    context=ScriptContext.ERSTE_SCHRITTE,
    relationship_level=RelationshipLevel.HEISS,
    description="Follow-up nach dem ersten Gespräch",
    text="""Hey [Name]! Wie lief es? 🎉

Egal ob Ja, Nein oder Vielleicht - du hast es GEMACHT!

Das alleine ist schon ein Erfolg. Viele Menschen 
trauen sich nie, das erste Gespräch zu führen.

Was hast du gelernt?
Was würdest du nächstes Mal anders machen?

Ich bin stolz auf dich! Weiter so! 💪""",
    variables=["Name"],
    tags=["onboarding", "coaching", "feedback"],
)


# --- 5.3 Team-Motivation ---

SCRIPT_46 = Script(
    id=generate_id(),
    number=46,
    name="Wöchentlicher Check-In",
    category=ScriptCategory.ONBOARDING,
    context=ScriptContext.TEAM_MOTIVATION,
    relationship_level=RelationshipLevel.HEISS,
    description="Wöchentlicher Team-Check-In",
    text="""Hey [Name]! 

Wie war deine Woche? 📊

Schneller Check:
- Wie viele Gespräche hattest du?
- Wie viele davon waren positiv?
- Was war deine größte Herausforderung?
- Was war dein größter Win?

Ich frage, weil ich dir helfen will, nächste Woche 
noch besser zu werden!""",
    variables=["Name"],
    tags=["onboarding", "check-in", "wöchentlich"],
)

SCRIPT_47 = Script(
    id=generate_id(),
    number=47,
    name="Bei Frustration",
    category=ScriptCategory.ONBOARDING,
    context=ScriptContext.TEAM_MOTIVATION,
    relationship_level=RelationshipLevel.HEISS,
    description="Unterstützung bei Frustration",
    text="""Hey [Name],

Ich merke, dass du gerade frustriert bist. Das ist NORMAL.

Jeder erfolgreiche Network Marketer hat diese Phase durchgemacht.
Ich auch. Mehrmals. 😅

Hier ist die Wahrheit: Erfolg kommt nicht über Nacht.
Aber er KOMMT - wenn du dranbleibst.

Lass uns telefonieren. Ich möchte dir helfen, 
durch dieses Tief zu kommen.

Du bist nicht alleine! ❤️""",
    variables=["Name"],
    tags=["onboarding", "motivation", "frustration"],
)


# =============================================================================
# 6. REAKTIVIERUNG
# =============================================================================

# --- 6.1 Inaktive Kunden ---

SCRIPT_48 = Script(
    id=generate_id(),
    number=48,
    name="Kunden-Reaktivierung",
    category=ScriptCategory.REAKTIVIERUNG,
    context=ScriptContext.INAKTIVE_KUNDEN,
    relationship_level=RelationshipLevel.WARM,
    description="Reaktivierung inaktiver Kunden",
    text="""Hey [Name]! 👋

Ich hab gemerkt, dass du schon eine Weile kein 
[Produkt] mehr bestellt hast.

Ich wollte mal nachfragen: Ist alles okay?
Gibt es etwas, womit ich dir helfen kann?

Falls du einfach vergessen hast nachzubestellen - 
hier ist der Link: [Link]

Oder sollen wir kurz telefonieren?""",
    variables=["Name", "Produkt", "Link"],
    tags=["reaktivierung", "kunde", "inaktiv"],
)


# --- 6.2 Inaktive Partner ---

SCRIPT_49 = Script(
    id=generate_id(),
    number=49,
    name="Partner-Reaktivierung",
    category=ScriptCategory.REAKTIVIERUNG,
    context=ScriptContext.INAKTIVE_PARTNER,
    relationship_level=RelationshipLevel.WARM,
    description="Reaktivierung inaktiver Partner",
    text="""Hey [Name]!

Ich hab an dich gedacht und wollte mal checken, 
wie es dir geht.

Ich weiß, dass du vor [Zeitraum] etwas pausiert hast - 
und das ist völlig okay!

Aber ich wollte dir sagen: Die Tür ist immer offen.

Wir haben gerade [Neuigkeit/Aktion/Momentum], und 
ich glaube, das könnte interessant für dich sein.

Hast du Lust, mal unverbindlich zu quatschen?""",
    variables=["Name", "Zeitraum", "Neuigkeit", "Aktion", "Momentum"],
    tags=["reaktivierung", "partner", "inaktiv"],
)


# =============================================================================
# 7. SOCIAL MEDIA
# =============================================================================

# --- 7.1 Story-Engagement ---

SCRIPT_50 = Script(
    id=generate_id(),
    number=50,
    name="Nach Story-Reaktion",
    category=ScriptCategory.SOCIAL_MEDIA,
    context=ScriptContext.STORY_ENGAGEMENT,
    relationship_level=RelationshipLevel.LAUWARMER,
    description="Follow-up nach Story-Reaktion",
    text="""Hey [Name]! 

Danke fürs Reagieren auf meine Story! 😊

Darf ich fragen, was dich daran angesprochen hat?

Ich bin neugierig!""",
    variables=["Name"],
    tags=["social-media", "story", "engagement"],
)


# --- 7.2 Post-Kommentar Follow-Up ---

SCRIPT_51 = Script(
    id=generate_id(),
    number=51,
    name="Nach Kommentar",
    category=ScriptCategory.SOCIAL_MEDIA,
    context=ScriptContext.POST_FOLLOW_UP,
    relationship_level=RelationshipLevel.LAUWARMER,
    description="Follow-up nach Post-Kommentar",
    text="""Hey [Name]!

Danke für deinen Kommentar bei meinem Post! 🙏

Ich wollte mal direkt nachfragen: Ist [Thema] etwas, 
das dich gerade beschäftigt?

Falls ja, hab ich vielleicht was Spannendes für dich...""",
    variables=["Name", "Thema"],
    tags=["social-media", "kommentar", "post"],
)


# --- 7.3 Neuer Follower ---

SCRIPT_52 = Script(
    id=generate_id(),
    number=52,
    name="Willkommens-DM",
    category=ScriptCategory.SOCIAL_MEDIA,
    context=ScriptContext.NEUER_FOLLOWER,
    relationship_level=RelationshipLevel.KALT,
    description="Willkommensnachricht für neue Follower",
    text="""Hey [Name]! 👋

Danke fürs Folgen! Ich freu mich, dich hier zu haben.

Kurze Frage: Wie bist du auf mich aufmerksam geworden?

Ich bin immer neugierig, was Menschen zu meinem 
Content führt! 😊""",
    variables=["Name"],
    tags=["social-media", "follower", "willkommen"],
)


# =============================================================================
# ALLE SCRIPTS ZUSAMMENFASSEN
# =============================================================================

ALL_NETWORK_MARKETING_SCRIPTS = [
    # 1. Erstkontakt
    SCRIPT_01, SCRIPT_02, SCRIPT_03, SCRIPT_04,  # Warmer Markt
    SCRIPT_05, SCRIPT_06, SCRIPT_07, SCRIPT_08,  # Kalter Markt
    SCRIPT_09, SCRIPT_10,                         # Online-Leads
    
    # 2. Follow-Up
    SCRIPT_11, SCRIPT_12, SCRIPT_13,             # Nach Präsentation
    SCRIPT_14, SCRIPT_15, SCRIPT_16,             # Ghosted
    SCRIPT_17, SCRIPT_18, SCRIPT_19,             # Langzeit
    
    # 3. Einwand-Behandlung
    SCRIPT_20, SCRIPT_21,                         # Keine Zeit
    SCRIPT_22, SCRIPT_23,                         # Kein Geld
    SCRIPT_24, SCRIPT_25,                         # Partner fragen
    SCRIPT_26, SCRIPT_27, SCRIPT_28,             # MLM/Pyramide
    SCRIPT_29, SCRIPT_30,                         # Kenne niemanden
    SCRIPT_31, SCRIPT_32,                         # Nicht Verkäufer
    SCRIPT_33, SCRIPT_34, SCRIPT_35,             # Weitere
    
    # 4. Closing
    SCRIPT_36, SCRIPT_37,                         # Soft Close
    SCRIPT_38, SCRIPT_39,                         # Assumptive Close
    SCRIPT_40, SCRIPT_41,                         # Urgency Close
    
    # 5. Team-Onboarding
    SCRIPT_42, SCRIPT_43,                         # Willkommen
    SCRIPT_44, SCRIPT_45,                         # Erste Schritte
    SCRIPT_46, SCRIPT_47,                         # Motivation
    
    # 6. Reaktivierung
    SCRIPT_48,                                     # Kunden
    SCRIPT_49,                                     # Partner
    
    # 7. Social Media
    SCRIPT_50, SCRIPT_51, SCRIPT_52,             # Social
]


def get_all_scripts() -> list:
    """Gibt alle Network Marketing Scripts zurück."""
    return ALL_NETWORK_MARKETING_SCRIPTS


def get_scripts_by_category(category: ScriptCategory) -> list:
    """Gibt Scripts einer bestimmten Kategorie zurück."""
    return [s for s in ALL_NETWORK_MARKETING_SCRIPTS if s.category == category]


def get_script_by_number(number: int) -> Script | None:
    """Gibt ein Script anhand seiner Nummer zurück."""
    for script in ALL_NETWORK_MARKETING_SCRIPTS:
        if script.number == number:
            return script
    return None


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    "ALL_NETWORK_MARKETING_SCRIPTS",
    "get_all_scripts",
    "get_scripts_by_category",
    "get_script_by_number",
]

