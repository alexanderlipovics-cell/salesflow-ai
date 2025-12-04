"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF KNOWLEDGE - Founder Version                                         ║
║  50+ Outreach Skripte, Einwandbehandlung, Deal-Medic, CEO Module          ║
╚════════════════════════════════════════════════════════════════════════════╝
"""

from typing import Dict, List, Any, Optional

# =============================================================================
# CHIEF MODE CONFIGURATION
# =============================================================================

CHIEF_MODE_CONFIG = {
    "enabled_users": [
        "alexander.lipovics@gmail.com",
    ],
    "feature_flags": {
        "all_outreach_scripts": True,
        "advanced_objection_handling": True,
        "deal_medic": True,
        "ceo_module": True,
        "investor_briefs": True,
        "unlimited_api_calls": True,
        "extended_system_prompts": True,
        "bant_analysis": True,
        "pipeline_review": True,
        "cfo_check": True,
    },
    "limits": {
        "api_calls_per_day": None,  # Kein Limit
        "tokens_per_request": None,  # Kein Limit
        "max_context_length": None,  # Kein Limit
    },
}

# =============================================================================
# CHIEF SCRIPTS - 50+ strukturierte Sales-Skripte
# =============================================================================

CHIEF_SCRIPTS = {
    "pitches": {
        "zeit_gegen_geld": {
            "name": "Der Zeit gegen Geld Pitch",
            "channel": ["linkedin", "instagram"],
            "type": "cold",
            "text": """Hallo [Name], mir ist dein professioneller Auftritt bei [MLM Firma] aufgefallen.

Eine Frage: Was ist dir wichtiger - mehr Zeit oder mehr Geld?

Ich kenne viele, die 60+ Stunden die Woche arbeiten und trotzdem nicht das erreichen, was sie wollen.

Dabei geht es nicht darum, härter zu arbeiten - sondern intelligenter.

Hast du 15 Minuten für einen kurzen Austausch, wie du mit Systemen und Automatisierung mehr erreichen kannst?

Grüße
[Dein Name]""",
            "variables": ["Name", "MLM Firma"]
        },
        
        "autonomer_mitarbeiter": {
            "name": "Autonomer Mitarbeiter Pitch",
            "channel": ["linkedin", "email"],
            "type": "cold",
            "text": """Hallo [Name],

Stell dir vor, du hättest einen Mitarbeiter, der:
- 24/7 für dich arbeitet
- Nie müde wird
- Immer die richtige Nachricht zur richtigen Zeit sendet
- Und dabei 100% konsistent ist

Das ist keine Zukunftsmusik - das ist bereits Realität.

Ich zeige dir, wie du mit KI-basierten Systemen dein Sales-Game auf das nächste Level bringst.

Lust auf einen 15-Minuten-Call?

Grüße
[Dein Name]""",
            "variables": ["Name"]
        },
        
        "compliance_angst": {
            "name": "Compliance-Angst Pitch",
            "channel": ["linkedin", "email"],
            "type": "cold",
            "text": """Hallo [Name],

eine Sorge, die ich oft höre: "Ich habe Angst, etwas Falsches zu sagen und Compliance-Probleme zu bekommen."

Das ist verständlich - besonders in unserem Bereich.

Aber: Angst lähmt. Systeme schützen.

Ich zeige dir, wie du mit automatisierten Compliance-Checks sicher kommunizierst - ohne ständig zweifeln zu müssen.

Lust, darüber zu sprechen?

Grüße
[Dein Name]""",
            "variables": ["Name"]
        },
        
        "lead_verlust": {
            "name": "Lead-Verlust Pitch",
            "channel": ["linkedin", "email"],
            "type": "cold",
            "text": """Hallo [Name],

Wusstest du, dass 79% der Leads nie kontaktiert werden - nicht weil sie schlecht sind, sondern weil die Zeit fehlt?

Das bedeutet: Du lässt täglich Geld auf dem Tisch liegen.

Stell dir vor, du hättest ein System, das:
- Jeden Lead automatisch qualifiziert
- Die besten sofort priorisiert
- Und dir die nächsten Schritte zeigt

Das spart dir nicht nur Zeit - es bringt dir mehr Umsatz.

Interessiert?

Grüße
[Dein Name]""",
            "variables": ["Name"]
        },
        
        "mlm_spezialist": {
            "name": "MLM-Spezialist Pitch",
            "channel": ["linkedin", "instagram"],
            "type": "cold",
            "text": """Hallo [Name],

ich sehe, du bist bei [MLM Firma] aktiv.

Die meisten Sales-Tools sind für klassisches B2B gemacht - nicht für Network Marketing.

Deshalb habe ich etwas entwickelt, das speziell für unsere Branche ist:
- MLM-spezifische Templates
- Compensation-Plan-Integration
- Team-Management-Tools
- Compliance für DACH

Interessiert dich, wie das funktioniert?

Grüße
[Dein Name]""",
            "variables": ["Name", "MLM Firma"]
        },
        
        "predictive_insight": {
            "name": "Predictive Insight Pitch",
            "channel": ["linkedin", "email"],
            "type": "warm",
            "text": """Hallo [Name],

Was, wenn du vorhersehen könntest, welcher Lead sich zu einem Kunden entwickelt?

Nicht durch Raten - sondern durch Datenanalyse und KI.

Das ist möglich. Und ich zeige dir, wie.

Hast du 15 Minuten?

Grüße
[Dein Name]""",
            "variables": ["Name"]
        },
        
        "ghostbuster_pitch": {
            "name": "Ghostbuster Pitch",
            "channel": ["linkedin", "email"],
            "type": "cold",
            "text": """Hallo [Name],

Geister zu jagen macht keinen Sinn - aber geghostete Leads zurückzuholen schon.

Ich habe ein System entwickelt, das:
- Erkennt, wann jemand "ghostet"
- Automatisch die richtige Follow-up-Strategie anwendet
- Und so 30% mehr Leads reaktiviert

Klingt interessant? Lass uns kurz sprechen.

Grüße
[Dein Name]""",
            "variables": ["Name"]
        },
        
        "anti_spam": {
            "name": "Anti-Spam Pitch",
            "channel": ["linkedin", "email"],
            "type": "cold",
            "text": """Hallo [Name],

Niemand mag Spam - deshalb arbeiten wir mit einem völlig anderen Ansatz:

Statt 1000x die gleiche Nachricht:
- Personalisierte Messages basierend auf Profilanalyse
- Value-First-Ansatz (erst geben, dann nehmen)
- Timing-Optimierung für maximale Response-Rate

Das Ergebnis: 5x bessere Antwortrate.

Lust, mehr zu erfahren?

Grüße
[Dein Name]""",
            "variables": ["Name"]
        },
        
        "skeptiker": {
            "name": "Skeptiker Pitch",
            "channel": ["linkedin", "email"],
            "type": "cold",
            "text": """Hallo [Name],

ich verstehe deine Skepsis - besonders wenn du schon schlechte Erfahrungen mit "Wunder-Tools" gemacht hast.

Deshalb mein Ansatz:
- 30 Tage kostenlos testen
- Keine langfristige Bindung
- Nur zahlen, wenn du Ergebnisse siehst

Fair?

Dann lass uns kurz sprechen.

Grüße
[Dein Name]""",
            "variables": ["Name"]
        },
        
        "kurze_frage": {
            "name": "Kurze Frage Pitch",
            "channel": ["linkedin", "instagram"],
            "type": "cold",
            "text": """Hey [Name]! 👋

Kurze Frage: Was würdest du tun, wenn du jeden Tag 3 Stunden mehr Zeit hättest?

[Dein Name]""",
            "variables": ["Name"]
        }
    },
    
    "wert_fragen": {
        "zeitwert": {
            "name": "Zeitwert-Frage",
            "channel": ["linkedin", "email", "whatsapp"],
            "type": "discovery",
            "text": """Was ist dir eine Stunde deiner Zeit wert?

Und was wäre, wenn du diese Stunde jeden Tag zurückbekommst?

Dann hättest du 365 Stunden mehr im Jahr - für Familie, Hobbys, Wachstum.

Das ist möglich. Lass uns darüber sprechen.""",
            "variables": []
        },
        
        "verlorener_umsatz": {
            "name": "Verlorener Umsatz-Frage",
            "channel": ["linkedin", "email"],
            "type": "discovery",
            "text": """Wie viele Leads gehen dir durch die Lappen, weil du nicht die Zeit hast, sie alle zu kontaktieren?

Jeder unkontaktierte Lead ist verlorener Umsatz.

Was wäre, wenn du jeden Lead automatisch priorisieren und kontaktieren könntest?

Das könnte dein Geschäft verändern.""",
            "variables": []
        },
        
        "compliance_kosten": {
            "name": "Compliance-Kosten-Frage",
            "channel": ["linkedin", "email"],
            "type": "discovery",
            "text": """Was würde es dich kosten, wenn du eine Compliance-Verletzung hättest?

Nicht nur finanziell - sondern auch an Reputation und Vertrauen.

Was wäre dir ein System wert, das das automatisch verhindert?""",
            "variables": []
        },
        
        "rang_sicherung": {
            "name": "Rang-Sicherung-Frage",
            "channel": ["linkedin", "email", "whatsapp"],
            "type": "discovery",
            "text": """Wie viel ist dir dein aktueller Rang in deinem MLM wert?

Und was kostet es dich, wenn du diesen Rang verlierst, weil du nicht genug verkaufst oder rekrutierst?

Stell dir vor, du hättest ein System, das dir hilft, deinen Rang automatisch zu sichern.""",
            "variables": []
        },
        
        "stress_reduktion": {
            "name": "Stress-Reduktion-Frage",
            "channel": ["linkedin", "email"],
            "type": "discovery",
            "text": """Wie viel ist dir ein stressfreierer Arbeitstag wert?

Statt ständig zu denken "Habe ich alle kontaktiert? Habe ich nichts vergessen?" - einfach wissen, dass alles automatisch läuft.

Was wäre dir das wert?""",
            "variables": []
        }
    },
    
    "einwand_handling": {
        "zu_teuer_zeitwert": {
            "name": "Zu teuer - Zeitwert-Argument",
            "channel": ["linkedin", "email", "whatsapp"],
            "type": "objection",
            "text": """Ich verstehe - €[Preis] wirkt erstmal viel.

Aber lass uns das umrechnen:

Du gewinnst [X] Stunden pro Woche zurück. Bei einem Stundensatz von €[Stundensatz] sind das €[Wert]/Woche.

Das bedeutet: Die Investition hat sich in [Y] Wochen amortisiert.

Und danach? Reiner Gewinn.

Was ist dir deine Zeit wert?""",
            "variables": ["Preis", "X", "Stundensatz", "Wert", "Y"]
        },
        
        "zu_teuer_risiko": {
            "name": "Zu teuer - Risiko-Argument",
            "channel": ["linkedin", "email"],
            "type": "objection",
            "text": """Ich verstehe deine Bedenken.

Aber schauen wir uns an, was es kostet, wenn du NICHT handelst:

- Verlorene Leads: €[Verlorener_Umsatz]/Monat
- Ineffiziente Prozesse: [X] Stunden/Woche verschwendet
- Verpasste Chancen: [Y]% weniger Growth

Das ist deutlich teurer als €[Preis]/Monat.

Plus: Du kannst jederzeit kündigen - kein Risiko für dich.""",
            "variables": ["Verlorener_Umsatz", "X", "Y", "Preis"]
        },
        
        "nutze_excel": {
            "name": "Nutze Excel - Upgrade-Argument",
            "channel": ["linkedin", "email"],
            "type": "objection",
            "text": """Excel ist super - ich nutze es auch noch für viele Dinge!

Aber schauen wir uns an, was Excel NICHT kann:
- Automatische Lead-Qualifizierung
- KI-generierte personalisierte Nachrichten
- Compliance-Checks in Echtzeit
- Multi-Channel-Automatisierung

Excel ist ein Hammer - aber manchmal braucht man eine Nagelpistole.

Was, wenn wir dir zeigen, wie du beides kombinierst?""",
            "variables": []
        },
        
        "mag_keine_ki": {
            "name": "Mag keine KI - Kontrolle-Argument",
            "channel": ["linkedin", "email"],
            "type": "objection",
            "text": """Das kann ich verstehen - KI kann beängstigend wirken.

Aber hier ist der Unterschied: Du behältst die Kontrolle.

- Du bestimmst, was gesendet wird
- Du kannst jeden Schritt überprüfen
- Du kannst jederzeit stoppen oder anpassen

KI ist hier nur dein Assistent - nicht dein Chef.

Du entscheidest. Die KI macht nur die langweilige Arbeit.

Lust, dir das mal anzusehen?""",
            "variables": []
        },
        
        "schlechte_tools": {
            "name": "Schlechte Tools - Vertrauen-Argument",
            "channel": ["linkedin", "email"],
            "type": "objection",
            "text": """Ich verstehe - schlechte Erfahrungen mit Tools sind frustrierend.

Deshalb mache ich es anders:
- 30 Tage kostenlos testen
- Keine Kreditkarte nötig
- Du siehst sofort Ergebnisse - oder nicht
- Einfache Kündigung

Keine Versprechen. Nur Ergebnisse.

Lust, es auszuprobieren?""",
            "variables": []
        },
        
        "keine_zeit": {
            "name": "Keine Zeit - Zeit-Spar-Argument",
            "channel": ["linkedin", "email", "whatsapp"],
            "type": "objection",
            "text": """Genau deshalb brauchst du es!

Wenn du keine Zeit hast, ist das der beste Grund, etwas zu automatisieren.

10 Minuten Setup - dann läuft es automatisch.

Du gewinnst [X] Stunden pro Woche zurück.

Was würdest du mit dieser Zeit machen?""",
            "variables": ["X"]
        },
        
        "nicht_technikaffin": {
            "name": "Nicht technikaffin - Einfachheit-Argument",
            "channel": ["linkedin", "email"],
            "type": "objection",
            "text": """Keine Sorge - das ist auch ohne technisches Wissen möglich!

Das System ist so einfach wie WhatsApp benutzen.

- Klicken, nicht programmieren
- Vorlagen, keine Formeln
- Support, wenn du Hilfe brauchst

Wenn du eine Nachricht schreiben kannst, kannst du das auch nutzen.

Lust, dir zeigen zu lassen, wie einfach es ist?""",
            "variables": []
        },
        
        "mache_selbst": {
            "name": "Mache selbst - Effizienz-Argument",
            "channel": ["linkedin", "email"],
            "type": "objection",
            "text": """Respekt - es selbst zu machen zeigt Eigeninitiative!

Aber schauen wir uns die Zahlen an:

Wenn du [X] Stunden/Woche für [Tätigkeit] brauchst und diese automatisieren könntest:
- Was könntest du in dieser Zeit stattdessen machen?
- Wie viel mehr Umsatz könntest du generieren?
- Wie viel weniger Stress hättest du?

Manchmal ist "selber machen" nicht die beste Strategie - besonders wenn die Zeit besser investiert werden kann.""",
            "variables": ["X", "Tätigkeit"]
        },
        
        "warte_ab": {
            "name": "Warte ab - Opportunitätskosten-Argument",
            "channel": ["linkedin", "email"],
            "type": "objection",
            "text": """Ich verstehe - manchmal ist warten sinnvoll.

Aber schauen wir uns an, was Warten kostet:

Jeden Tag, den du wartest:
- Verlierst du [X] Leads
- Verbringst du [Y] Stunden mit manueller Arbeit
- Verpasst du [Z]€ potenziellen Umsatz

Was, wenn du es 30 Tage kostenlos testest? Dann wartest du mit garantierten Ergebnissen.""",
            "variables": ["X", "Y", "Z"]
        },
        
        "traue_ki_nicht": {
            "name": "Traue KI nicht - Sicherheit-Argument",
            "channel": ["linkedin", "email"],
            "type": "objection",
            "text": """Das ist eine sehr verantwortungsvolle Einstellung - Respekt!

Deshalb:
- Du behältst volle Kontrolle
- Jede Nachricht kann vorher überprüft werden
- Compliance-Checks schützen dich zusätzlich
- Du bestimmst die Regeln

KI ist hier nur ein Werkzeug - wie ein Auto. Du bestimmst, wohin die Fahrt geht.

Lust, dir zu zeigen, wie sicher das ist?""",
            "variables": []
        }
    },
    
    "follow_up": {
        "nach_demo": {
            "name": "Nach Demo Follow-up",
            "channel": ["linkedin", "email"],
            "type": "follow_up",
            "text": """Hallo [Name],

vielen Dank für deine Zeit heute bei der Demo!

Wie versprochen, hier nochmal die wichtigsten Punkte:
- [Punkt 1]
- [Punkt 2]
- [Punkt 3]

Was denkst du - passt das zu deinen Zielen?

Falls ja, können wir gerne den nächsten Schritt besprechen.

Grüße
[Dein Name]""",
            "variables": ["Name", "Punkt 1", "Punkt 2", "Punkt 3"]
        },
        
        "24h_später": {
            "name": "24h später Follow-up",
            "channel": ["linkedin", "email"],
            "type": "follow_up",
            "text": """Hey [Name]! 👋

Gestern haben wir über [Thema] gesprochen.

Hast du noch Fragen? Oder gibt es etwas, das dich noch beschäftigt?

Ich bin hier, um zu helfen.

Grüße
[Dein Name]""",
            "variables": ["Name", "Thema"]
        },
        
        "wert_addieren": {
            "name": "Wert-addierender Follow-up",
            "channel": ["linkedin", "email"],
            "type": "follow_up",
            "text": """Hallo [Name],

ich dachte an unser Gespräch und wollte dir noch einen Tipp geben:

[Tipp/Value Content]

Das könnte auch für dich relevant sein.

Falls du Fragen hast oder mehr wissen willst, sag einfach Bescheid!

Grüße
[Dein Name]""",
            "variables": ["Name", "Tipp/Value Content"]
        },
        
        "nächster_schritt": {
            "name": "Nächster Schritt Follow-up",
            "channel": ["linkedin", "email"],
            "type": "follow_up",
            "text": """Hallo [Name],

um weiterzumachen, wäre der nächste Schritt:

[Nächster Schritt]

Passt dir [Terminvorschlag] dafür? Oder hast du einen anderen Termin?

Grüße
[Dein Name]""",
            "variables": ["Name", "Nächster Schritt", "Terminvorschlag"]
        },
        
        "social_proof": {
            "name": "Social Proof Follow-up",
            "channel": ["linkedin", "email"],
            "type": "follow_up",
            "text": """Hallo [Name],

kurze Info: [Ähnliches_Unternehmen/Person] hat gerade [Erfolg] erreicht - mit unserer Lösung.

Vielleicht interessiert dich, wie?

Falls ja, können wir gerne kurz sprechen.

Grüße
[Dein Name]""",
            "variables": ["Name", "Ähnliches_Unternehmen/Person", "Erfolg"]
        },
        
        "credits_fast_leer": {
            "name": "Credits fast leer Follow-up",
            "channel": ["linkedin", "email"],
            "type": "follow_up",
            "text": """Hallo [Name],

ich sehe, dass deine Test-Credits fast aufgebraucht sind.

Das ist eigentlich ein gutes Zeichen - es bedeutet, dass du das System aktiv nutzt!

Möchtest du upgraden, um weiterzumachen? Oder hast du noch Fragen?

Grüße
[Dein Name]""",
            "variables": ["Name"]
        },
        
        "urgency": {
            "name": "Urgency Follow-up",
            "channel": ["linkedin", "email"],
            "type": "follow_up",
            "text": """Hallo [Name],

kurze Info: [Angebot/Deadline] ist nur noch bis [Datum] verfügbar.

Da du Interesse hattest, dachte ich, ich melde mich kurz.

Sollen wir nochmal kurz sprechen?

Grüße
[Dein Name]""",
            "variables": ["Name", "Angebot/Deadline", "Datum"]
        },
        
        "sanfter_stupser": {
            "name": "Sanfter Stupser Follow-up",
            "channel": ["linkedin", "email"],
            "type": "follow_up",
            "text": """Hey [Name]! 👋

Nur kurz: Wie läuft es mit [Thema]?

Falls du Fragen hast oder Hilfe brauchst, sag einfach Bescheid!

Grüße
[Dein Name]""",
            "variables": ["Name", "Thema"]
        },
        
        "roi": {
            "name": "ROI Follow-up",
            "channel": ["linkedin", "email"],
            "type": "follow_up",
            "text": """Hallo [Name],

ich habe eine kleine ROI-Berechnung für dich gemacht:

[ROI-Berechnung]

Das könnte sich für dich lohnen. Was denkst du?

Grüße
[Dein Name]""",
            "variables": ["Name", "ROI-Berechnung"]
        },
        
        "finaler_checkin": {
            "name": "Finaler Check-in Follow-up",
            "channel": ["linkedin", "email"],
            "type": "follow_up",
            "text": """Hallo [Name],

letzter Check-in: Ist [Thema] für dich noch relevant?

Falls ja, lass uns den nächsten Schritt gehen.
Falls nein, auch okay - dann melde ich mich nicht mehr.

Was denkst du?

Grüße
[Dein Name]""",
            "variables": ["Name", "Thema"]
        }
    },
    
    "ghostbuster": {
        "gelesen_nicht_geantwortet": {
            "name": "Gelesen, nicht geantwortet",
            "channel": ["linkedin", "email"],
            "type": "ghostbuster",
            "text": """Hey [Name]! 👋

Ich sehe, du hast meine Nachricht gelesen, aber noch nicht geantwortet.

Kein Problem - vielleicht hattest du einfach keine Zeit.

Kurze Frage: Ist [Thema] für dich noch interessant?

Falls ja: Lass uns kurz sprechen.
Falls nein: Sag einfach Bescheid - dann melde ich mich nicht mehr.

Alles gut! 😊

[Dein Name]""",
            "variables": ["Name", "Thema"]
        },
        
        "meta_ghostbuster": {
            "name": "Meta Ghostbuster",
            "channel": ["linkedin", "email"],
            "type": "ghostbuster",
            "text": """Hey [Name]! 😄

Okay, ich sehe es - du ghostest mich! 😂

Kleiner Spaß. Aber mal ehrlich: Passiert mir auch ständig - zu viele Nachrichten, zu wenig Zeit.

Vielleicht ist [Thema] einfach nicht der richtige Zeitpunkt für dich?

Falls doch: Sag einfach Bescheid!

Grüße
[Dein Name]""",
            "variables": ["Name", "Thema"]
        },
        
        "multiple_choice": {
            "name": "Multiple Choice Ghostbuster",
            "channel": ["linkedin", "email"],
            "type": "ghostbuster",
            "text": """Hey [Name]! 👋

Schnelle Frage - einfach A, B oder C antworten:

A) Interessiert mich, aber gerade keine Zeit
B) Nicht relevant für mich
C) Lass uns sprechen!

So einfach. 😊

[Dein Name]""",
            "variables": ["Name"]
        },
        
        "prioritäten_check": {
            "name": "Prioritäten-Check Ghostbuster",
            "channel": ["linkedin", "email"],
            "type": "ghostbuster",
            "text": """Hallo [Name],

ich vermute, [Thema] ist gerade einfach nicht deine Priorität.

Das ist völlig okay!

Falls sich das ändert oder du Fragen hast, melde dich einfach.

Ich bin da, wenn du bereit bist.

Grüße
[Dein Name]""",
            "variables": ["Name", "Thema"]
        },
        
        "einfacher_ausweg": {
            "name": "Einfacher Ausweg Ghostbuster",
            "channel": ["linkedin", "email"],
            "type": "ghostbuster",
            "text": """Hey [Name]! 👋

Ich will dir nicht auf die Nerven gehen.

Falls du kein Interesse hast, antworte einfach "Nein danke" - dann melde ich mich nicht mehr.

Falls doch: Lass uns kurz sprechen!

Grüße
[Dein Name]""",
            "variables": ["Name"]
        },
        
        "pattern_interrupt": {
            "name": "Pattern Interrupt Ghostbuster",
            "channel": ["linkedin", "email"],
            "type": "ghostbuster",
            "text": """Hey [Name]! 🤔

Komische Frage, aber: Was war das letzte Mal, als du etwas getan hast, das dein Business wirklich vorangebracht hat?

[Thought-provoking Content]

Falls du Lust auf einen Austausch hast, sag Bescheid!

Grüße
[Dein Name]""",
            "variables": ["Name", "Thought-provoking Content"]
        },
        
        "value_bump": {
            "name": "Value Bump Ghostbuster",
            "channel": ["linkedin", "email"],
            "type": "ghostbuster",
            "text": """Hallo [Name],

ohne Verkaufsdruck - hier ist ein Tipp, den ich gerade teile:

[Value Content/Tipp]

Vielleicht hilft dir das weiter.

Falls du mehr wissen willst, sag Bescheid!

Grüße
[Dein Name]""",
            "variables": ["Name", "Value Content/Tipp"]
        },
        
        "empathisch": {
            "name": "Empathischer Ghostbuster",
            "channel": ["linkedin", "email"],
            "type": "ghostbuster",
            "text": """Hallo [Name],

ich weiß, wie es ist - zu viele Nachrichten, zu wenig Zeit.

Deshalb kurz und schmerzlos: Ist [Thema] für dich noch interessant?

Falls ja: Lass uns einen Termin finden.
Falls nein: Alles gut - dann melde ich mich nicht mehr.

Was denkst du?

Grüße
[Dein Name]""",
            "variables": ["Name", "Thema"]
        },
        
        "archivieren": {
            "name": "Archivieren Ghostbuster",
            "channel": ["linkedin", "email"],
            "type": "ghostbuster",
            "text": """Hallo [Name],

ich vermute, jetzt ist einfach nicht der richtige Zeitpunkt.

Deshalb: Ich werde dich erstmal in Ruhe lassen.

Falls du in Zukunft Interesse an [Thema] hast, melde dich einfach.

Die Tür bleibt offen.

Alles Gute!
[Dein Name]""",
            "variables": ["Name", "Thema"]
        },
        
        "breakup": {
            "name": "Breakup Ghostbuster",
            "channel": ["linkedin", "email"],
            "type": "ghostbuster",
            "text": """Hallo [Name],

ich habe gemerkt, dass du wahrscheinlich gerade andere Prioritäten hast.

Das ist völlig okay - ich verstehe das voll und ganz.

Falls du in Zukunft doch Interesse an [Thema] hast, melde dich einfach.

Die Tür bleibt offen.

Wünsche dir alles Gute!
[Dein Name]""",
            "variables": ["Name", "Thema"]
        }
    },
    
    "closing": {
        "optionen_close": {
            "name": "Optionen Close",
            "channel": ["linkedin", "email", "whatsapp"],
            "type": "closing",
            "text": """Hallo [Name],

super, dass du Interesse hast!

Wir haben zwei Optionen:

Option A: [Option A mit Preis/Vorteilen]
Option B: [Option B mit Preis/Vorteilen]

Welche passt besser zu dir? Oder soll ich dir beide nochmal genauer erklären?

Grüße
[Dein Name]""",
            "variables": ["Name", "Option A mit Preis/Vorteilen", "Option B mit Preis/Vorteilen"]
        },
        
        "ltd_dringlichkeit": {
            "name": "LTD Dringlichkeit Close",
            "channel": ["linkedin", "email"],
            "type": "closing",
            "text": """Hallo [Name],

kurze Info: Wir haben noch [Anzahl] Plätze für unser [Angebot] frei - nur noch bis [Datum].

Da du Interesse hattest, wollte ich dir die Chance geben, dabei zu sein.

Sollen wir das jetzt machen, bevor es zu spät ist?

Grüße
[Dein Name]""",
            "variables": ["Name", "Anzahl", "Angebot", "Datum"]
        },
        
        "kosten_des_wartens": {
            "name": "Kosten des Wartens Close",
            "channel": ["linkedin", "email"],
            "type": "closing",
            "text": """Hallo [Name],

lass uns kurz rechnen:

Jeden Monat, den du wartest, kostet dich das:
- [Verlorener_Umsatz]€ an Umsatz
- [X] Stunden an verschwendeter Zeit
- [Y] verlorene Leads

Das sind [Gesamtkosten]€, die du "verlierst", während du wartest.

Was, wenn wir heute starten?

Grüße
[Dein Name]""",
            "variables": ["Name", "Verlorener_Umsatz", "X", "Y", "Gesamtkosten"]
        },
        
        "choice_close": {
            "name": "Choice Close",
            "channel": ["linkedin", "email", "whatsapp"],
            "type": "closing",
            "text": """Hey [Name]! 👋

Okay, du bist dabei - super!

Nur noch eine Frage: Willst du mit [Option 1] oder [Option 2] starten?

Welche passt besser?

[Dein Name]""",
            "variables": ["Name", "Option 1", "Option 2"]
        },
        
        "onboarding_close": {
            "name": "Onboarding Close",
            "channel": ["linkedin", "email"],
            "type": "closing",
            "text": """Hallo [Name],

perfekt! Willkommen an Bord! 🎉

Als Nächstes:
1. [Schritt 1]
2. [Schritt 2]
3. [Schritt 3]

Ich helfe dir bei jedem Schritt. Falls du Fragen hast, melde dich einfach!

Freue mich auf die Zusammenarbeit!

Grüße
[Dein Name]""",
            "variables": ["Name", "Schritt 1", "Schritt 2", "Schritt 3"]
        }
    }
}

# =============================================================================
# CHIEF OUTREACH SCRIPTS - 50+ Skripte für verschiedene Branchen
# =============================================================================

CHIEF_OUTREACH_SCRIPTS = {
    # ───────────────────────────────────────────────────────────────────────
    # ZINZINO SCRIPTS (Network Marketing)
    # ───────────────────────────────────────────────────────────────────────
    "zinzino": {
        "cold_linkedin": """Hallo {name},

ich sehe, du bist {role} bei {company}.

Als Experte für gesunde Ernährung kennst du sicher die Bedeutung von Omega-3-Fettsäuren für Herz-Kreislauf-Gesundheit.

Ich habe eine Lösung, die wissenschaftlich getestete Omega-3-Produkte mit einem bewährten Geschäftsmodell kombiniert.

Hast du 15 Minuten für einen kurzen Austausch?

Grüße
{your_name}""",

        "cold_whatsapp": """Hey {name}! 👋

Schnelle Frage: Wie wichtig ist dir wissenschaftlich belegte Produktqualität?

Ich habe eine Lösung, die beides verbindet: Premium-Omega-3-Produkte + Geschäftsmodell.

Lust auf einen kurzen Call?

LG
{your_name}""",

        "value_first_email": """Betreff: Omega-3 Studie, die dich interessieren könnte

Hallo {name},

ich habe gerade eine neue Studie über die Auswirkungen von Omega-3 auf kardiovaskuläre Gesundheit gelesen und dachte direkt an dich.

[KURZE ZUSAMMENFASSUNG DER STUDIE]

Falls du Interesse an wissenschaftlich getesteten Omega-3-Produkten hast, können wir gerne kurz sprechen.

Beste Grüße
{your_name}""",

        "warm_referral": """Hallo {name},

{referrer_name} hat mir von dir erzählt und meinte, dass du dich für {topic} interessierst.

Ich führe ein Business mit wissenschaftlich getesteten Omega-3-Produkten - vielleicht passt das zu dir?

Kannst du dir 15 Minuten Zeit nehmen?

Grüße
{your_name}""",
    },

    # ───────────────────────────────────────────────────────────────────────
    # B2B SALES SCRIPTS
    # ───────────────────────────────────────────────────────────────────────
    "b2b": {
        "cold_linkedin": """Hallo {name},

ich sehe, du führst {company} - Respekt!

Als {role} kennst du sicher die Herausforderung: {pain_point}.

Ich habe eine Lösung, die {key_benefit}.

Hättest du 10 Minuten für einen kurzen Austausch?

Grüße
{your_name}""",

        "cold_email": """Betreff: {company} - {key_benefit}

Guten Tag {name},

ich habe {company} recherchiert und sehe, dass {observation}.

Viele ähnliche Unternehmen kämpfen mit {pain_point}.

Meine Lösung: {solution_summary}

Hätten Sie Interesse an einem kurzen Gespräch?

Mit freundlichen Grüßen
{your_name}""",

        "follow_up_1": """Hallo {name},

ich hatte dir letzte Woche geschrieben bezüglich {topic}.

Falls du noch Zeit hast, würde ich gerne kurz mit dir sprechen.

Alternativ: Hier ist ein kurzer Case Study über {similar_company}.

Beste Grüße
{your_name}""",

        "social_proof": """Hallo {name},

ich dachte an dich, weil {similar_company} gerade {achievement} erreicht hat - mit unserer Lösung.

Vielleicht interessiert dich, wie?

Grüße
{your_name}""",
    },

    # ───────────────────────────────────────────────────────────────────────
    # IMMOBILIEN SCRIPTS
    # ───────────────────────────────────────────────────────────────────────
    "immobilien": {
        "cold_linkedin": """Hallo {name},

du bist Makler bei {company} - beeindruckend!

Ich weiß, wie zeitaufwendig Exposé-Erstellung ist. Stunden, die du eigentlich für Besichtigungen brauchst.

Ich habe ein System, das dir dabei hilft, Exposés in 3 Sekunden zu generieren - mehr Zeit für das, was wirklich zählt.

Hast du 10 Minuten?

Grüße
{your_name}""",

        "cold_email": """Betreff: Exposés in 3 Sekunden – mehr Zeit für Besichtigungen

Guten Tag {name},

als Makler bei {company} verbringst du wahrscheinlich viel Zeit mit Exposé-Erstellung.

Zeit, die du eigentlich für Besichtigungen und Verkaufsgespräche brauchst.

Meine Lösung: Automatische Exposé-Generierung in 3 Sekunden.

✅ Mehr Zeit für Kundenkontakte
✅ Professionelle Präsentation
✅ Bessere Conversion

Hätten Sie 10 Minuten für einen kurzen Austausch?

Mit freundlichen Grüßen
{your_name}""",

        "value_first": """Hallo {name},

kostenloser Tipp: Wie du mit einem kleinen Trick deine Exposé-Erstellung um 80% beschleunigst.

[VALUE TIP]

Falls dich die vollständige Lösung interessiert, können wir gerne kurz sprechen.

Grüße
{your_name}""",
    },

    # ───────────────────────────────────────────────────────────────────────
    # HOTEL SCRIPTS
    # ───────────────────────────────────────────────────────────────────────
    "hotel": {
        "cold_email": """Betreff: Ihre Gästebewertungen in 5 Minuten verbessern

Guten Tag {name},

ich habe gesehen, dass Sie {hotel_name} führen.

Gästebewertungen sind das A und O im Hotelgewerbe. Aber die systematische Nachfrage nach Feedback kostet viel Zeit.

Meine Lösung:
✅ Automatische Follow-up-Sequenzen nach Check-out
✅ Höhere Bewertungsquote durch zeitgemäße Kommunikation
✅ Mehr Zeit für Ihre Gäste

Hätten Sie 10 Minuten für einen kurzen Austausch?

Mit freundlichen Grüßen
{your_name}""",

        "cold_linkedin": """Hallo {name},

Sie führen {hotel_name} - Respekt!

Gästebewertungen sind entscheidend, aber die systematische Nachfrage nach Feedback kostet Zeit.

Ich habe eine Lösung, die automatische Follow-up-Sequenzen nach Check-out ermöglicht.

Höhere Bewertungsquote, mehr Zeit für Gäste.

Interessiert?

Grüße
{your_name}""",

        "social_proof": """Hallo {name},

{similar_hotel} hat gerade {achievement} erreicht - mit unserem System für automatische Gästebewertungen.

Vielleicht interessiert Sie, wie?

Grüße
{your_name}""",
    },
}

# =============================================================================
# EINWANDBEHANDLUNG FÜR SALESFLOW AI
# =============================================================================

# Einwandbehandlung speziell für SalesFlow AI
EINWAND_HANDLING_SALESFLOW = {
    "zu_teuer": {
        "framework": "ROI-Argument",
        "responses": [
            """Ich verstehe - €{price} wirkt erstmal viel.

Aber schauen wir uns an, was du dafür bekommst:

✅ Automatische Lead-Qualifizierung → Spart dir {time_saved} Stunden/Woche
✅ KI-generierte Follow-ups → {response_rate}% bessere Antwortrate
✅ Pipeline-Optimierung → {conversion_boost}% mehr Deals

Das bedeutet: Du generierst zusätzliche €{additional_revenue} pro Monat.

ROI: {roi_percentage}% - deine Investition ist in {payback_months} Monaten zurück.""",

            """Was kostet dich das aktuell, wenn du MANUELL arbeitest?

Stunden pro Woche für Lead-Qualifizierung: {current_hours}
Dein Stundensatz: €{hourly_rate}
Kosten pro Monat: €{current_cost}

SalesFlow AI kostet €{price}/Monat - aber du sparst €{savings}/Monat und generierst zusätzlich €{additional_revenue}.

Netto-Gewinn: €{net_benefit}/Monat""",

            """Was, wenn wir es so strukturieren:

✅ Start mit Basis-Paket: €{starter_price}/Monat
✅ Du siehst die ersten Ergebnisse
✅ Dann upgraden wir schrittweise

Oder: Jährliche Zahlung mit 20% Rabatt = €{yearly_price}/Jahr""",
        ],
        "closing_questions": [
            "Wenn der Preis kein Hindernis wäre, würdest du sofort starten?",
            "Was müsste passieren, damit sich €{price}/Monat für dich lohnt?",
            "Was kostet es dich, wenn du noch 3 Monate MANUELL arbeitest?",
        ],
    },

    "hab_schon_chatgpt": {
        "framework": "Spezialisierung",
        "responses": [
            """Super, dass du ChatGPT nutzt! Das zeigt, dass du technikaffin bist.

Aber ChatGPT ist ein GENERALIST - SalesFlow AI ist ein SPEZIALIST für Sales:

✅ ChatGPT: Allgemeine Antworten
✅ SalesFlow AI: Branchen-spezifische Sales-Skripte, BANT-Analyse, Pipeline-Optimierung

Es ist wie der Unterschied zwischen einem Hausarzt und einem Kardiologen - beide sind Ärzte, aber der Spezialist hat tieferes Wissen.""",

            """ChatGPT ist fantastisch für viele Dinge - ich nutze es selbst!

Aber für SALES brauchst du:

✅ CRM-Integration (automatische Lead-Qualifizierung)
✅ Compliance-Checks (DACH-Regularien)
✅ Branchen-spezifische Templates (MLM, Immobilien, etc.)
✅ Automatische Follow-up-Sequenzen

Das kann ChatGPT nicht - SalesFlow AI schon.""",

            """Was, wenn du beides nutzt?

ChatGPT für: Allgemeine Fragen, Content-Erstellung
SalesFlow AI für: Sales-spezifische Aufgaben, CRM-Integration, Automatisierung

So hast du das Beste aus beiden Welten!""",
        ],
        "closing_questions": [
            "Was fehlt dir bei ChatGPT für deine Sales-Arbeit?",
            "Was würde dich überzeugen, SalesFlow AI zusätzlich zu nutzen?",
            "Können wir einen kurzen Vergleich machen?",
        ],
    },

    "keine_zeit": {
        "framework": "Zeit-Spar-Argument",
        "responses": [
            """Wenn du keine Zeit hast, ist das GENAU der Grund, warum du SalesFlow AI brauchst!

Aktuell verbringst du {current_hours} Stunden/Woche mit:
- Lead-Qualifizierung
- Follow-up-Schreiben
- CRM-Pflege

Mit SalesFlow AI: {new_hours} Stunden/Woche

Du gewinnst {time_saved} Stunden/Woche zurück - das sind {hours_per_month} Stunden/Monat mehr Zeit für das, was wirklich zählt.""",

            """10 Minuten Setup, dann läuft es automatisch:

✅ Automatische Lead-Qualifizierung
✅ KI-generierte Follow-ups
✅ Pipeline-Updates

Du musst nur noch das WICHTIGE machen - der Rest läuft automatisch.""",

            """Was, wenn ich dir zeige, wie du in 10 Minuten/Woche mehr erreichst als jetzt in {current_hours} Stunden?

SalesFlow AI macht die Routine-Arbeit, du fokussierst dich auf Closing.""",
        ],
        "closing_questions": [
            "Was würdest du mit {time_saved} extra Stunden/Woche machen?",
            "Was wäre, wenn du dich nur noch auf das Wichtige konzentrieren könntest?",
            "Wie viel ist dir 1 Stunde/Tag mehr Zeit wert?",
        ],
    },

    "muss_ueberlegen": {
        "framework": "Konkretisieren",
        "responses": [
            """Super, dass du dir Zeit nehmen willst - das ist verantwortungsvoll.

Aber lass uns konkretisieren: Was genau möchtest du überdenken?

- Den Preis?
- Die Funktionalität?
- Die Integration?
- Etwas anderes?

Lass uns das jetzt klären, dann kannst du eine fundierte Entscheidung treffen.""",

            """Ich verstehe - große Entscheidungen brauchen Bedenkzeit.

Aber schauen wir uns an: Was passiert, wenn du noch 2 Wochen wartest?

- Du verlierst {leads_lost} Leads, die inaktiv werden
- Du verbringst weiterhin {current_hours} Stunden/Woche mit Routine
- Deine Konkurrenz holt auf

Vielleicht können wir erstmal einen kleinen Test machen? 30 Tage, ohne Risiko.""",

            """Perfekt! Lass uns gemeinsam durchgehen, was dich beschäftigt.

Dann kann ich dir genau die Informationen geben, die du brauchst, um eine fundierte Entscheidung zu treffen.""",
        ],
        "closing_questions": [
            "Was genau lässt dich noch zweifeln?",
            "Was müsste passieren, damit du dir sicher bist?",
            "Was wäre, wenn wir das jetzt klären würden?",
        ],
    },

    "haben_schon_crm": {
        "framework": "Ergänzung, nicht Ersatz",
        "responses": [
            """Perfekt - welches CRM nutzt ihr?

SalesFlow AI ist KEIN Ersatz für euer CRM - es ERGÄNZT es:

✅ Euer CRM: Daten speichern
✅ SalesFlow AI: Daten intelligenter nutzen (KI-Qualifizierung, Automatisierung)

SalesFlow AI integriert sich mit:
- HubSpot
- Salesforce
- Pipedrive
- Und vielen mehr

So macht euer bestehendes CRM noch mehr Sinn!""",

            """SalesFlow AI ist wie ein TURBO für euer bestehendes CRM:

✅ Automatische Lead-Qualifizierung → Bessere Daten im CRM
✅ KI-generierte Follow-ups → Höhere Response-Rate
✅ Pipeline-Optimierung → Mehr Deals aus demselben CRM

Ihr behaltet euer CRM, macht es nur intelligenter.""",

            """Was, wenn ich dir zeige, wie SalesFlow AI mit eurem CRM zusammenarbeitet?

5 Minuten Demo - dann siehst du, wie es euer bestehendes System verbessert.""",
        ],
        "closing_questions": [
            "Welches CRM nutzt ihr aktuell?",
            "Was würdest du an eurem CRM verbessern wollen?",
            "Sollen wir eine kurze Integration-Demo machen?",
        ],
    },
}

CHIEF_OBJECTION_HANDLING = {
    "price_too_high": {
        "framework": "Wert vs. Preis",
        "responses": [
            """Ich verstehe, dass der Preis erstmal hoch wirkt. 

Lass uns das anders betrachten: Was kostet es dich, wenn du nichts änderst?

[ROI-BERECHNUNG]

Das bedeutet, du hast deine Investition in [ZEITRAUM] wieder drin.""",

            """Stimmt, es ist eine Investition. Aber schauen wir uns an, was du dafür bekommst:

✅ [BENEFIT 1]
✅ [BENEFIT 2]
✅ [BENEFIT 3]

Im Vergleich zu [ALTERNATIVE] ist das eigentlich sehr fair.""",

            """Was, wenn ich dir zeige, wie du das in Raten zahlen kannst?

Oder: Wir starten mit einem kleineren Paket - du siehst die Ergebnisse, dann upgraden wir.""",
        ],
        "closing_questions": [
            "Wenn der Preis kein Problem wäre, würdest du sofort starten?",
            "Was müsste passieren, damit sich das für dich lohnt?",
            "Was kostet es dich, wenn du noch 3 Monate wartest?",
        ],
    },

    "no_time": {
        "framework": "Zeit-Investition vs. Zeit-Ersparnis",
        "responses": [
            """Ich verstehe - du hast schon viel zu tun.

Genau deshalb ist unsere Lösung so wichtig: Sie SPART dir Zeit.

Statt [AKTUELLE ZEITAUFWENDUNG] brauchst du nur noch [NEUE ZEITAUFWENDUNG].

Das sind [X] Stunden pro Woche mehr für das, was wirklich zählt.""",

            """Warte - wenn du keine Zeit hast, ist das der Grund, warum du das brauchst!

Ohne Automatisierung wirst du noch weniger Zeit haben.

Mit unserer Lösung gewinnst du [X] Stunden pro Woche zurück.""",

            """Was, wenn ich dir zeige, wie du in 10 Minuten pro Tag alles schaffst?

Das ist machbar, oder?""",
        ],
        "closing_questions": [
            "Wie viel Zeit würdest du investieren, wenn du weißt, dass du danach 10 Stunden pro Woche sparst?",
            "Was wäre, wenn du dich auf die wichtigen Dinge konzentrieren könntest statt auf Routine?",
        ],
    },

    "not_convinced": {
        "framework": "Proof + Risk Reversal",
        "responses": [
            """Das kann ich verstehen - du willst sichergehen.

Schauen wir uns das an:

✅ [PROOF 1]
✅ [PROOF 2]
✅ [PROOF 3]

Plus: [RISK REVERSAL] - du kannst jederzeit kündigen, wenn es nicht passt.""",

            """Was müsste ich dir zeigen, damit du überzeugt bist?

[WARTE AUF ANTWORT]

Okay, dann zeige ich dir genau das. Lass uns einen kurzen Test machen.""",

            """Was, wenn wir es erstmal 30 Tage testen?

Du siehst die Ergebnisse, dann entscheidest du.""",
        ],
        "closing_questions": [
            "Was bräuchtest du, um dir sicher zu sein?",
            "Was wäre das Schlimmste, was passieren könnte?",
            "Und was wäre das Beste, was passieren könnte?",
        ],
    },

    "thinking_about_it": {
        "framework": "Urgency + Clarification",
        "responses": [
            """Super, dass du darüber nachdenkst!

Was genau beschäftigt dich noch?

[WARTE AUF ANTWORT]

Okay, lass uns das klären. [ANTWORT AUF EINWAND]""",

            """Ich verstehe, dass du dir Zeit nehmen willst.

Aber schauen wir uns an: Was passiert, wenn du noch 2 Wochen wartest?

[KOSTE DES NICHT-HANDELNS]

Vielleicht können wir jetzt einen ersten Schritt machen?""",

            """Perfekt! Lass uns gemeinsam durchgehen, was dich beschäftigt.

Dann kannst du eine fundierte Entscheidung treffen.""",
        ],
        "closing_questions": [
            "Was genau lässt dich noch zweifeln?",
            "Was wäre, wenn wir das jetzt klären würden?",
            "Was müsste passieren, damit du dich heute entscheidest?",
        ],
    },

    "competitor": {
        "framework": "Differentiation",
        "responses": [
            """Ah, du nutzt [COMPETITOR]! Das ist gut.

Lass mich dir zeigen, was uns unterscheidet:

✅ [UNIQUE BENEFIT 1]
✅ [UNIQUE BENEFIT 2]
✅ [UNIQUE BENEFIT 3]

[COMPETITOR] macht das nicht.""",

            """Ich verstehe - [COMPETITOR] ist ein gutes Tool.

Aber schau dir das an: [UNTERSCHEID]

Das macht uns einzigartig.""",

            """Was, wenn du beides nutzt?

[COMPETITOR] für [ANWENDUNGSFALL 1], wir für [ANWENDUNGSFALL 2].""",
        ],
        "closing_questions": [
            "Was fehlt dir bei [COMPETITOR]?",
            "Was würde dich überzeugen, zu wechseln?",
            "Was, wenn du beides testen könntest?",
        ],
    },
}

# =============================================================================
# DEAL-MEDIC PROMPTS - Retten von Deals in Gefahr
# =============================================================================

CHIEF_DEAL_MEDIC = {
    "stalled_deal": {
        "diagnosis": "Deal ist ins Stocken geraten - kein Fortschritt in [X] Tagen",
        "action_plan": [
            "1. Identifiziere die echte Blockade (Preis, Zeit, Autorität, Bedarf)",
            "2. Schicke Pattern Interrupt Nachricht",
            "3. Biete konkreten Mehrwert (Case Study, ROI-Rechnung)",
            "4. Erstelle Urgency (Angebot, Deadline)",
            "5. Fokussiere auf schmerzhaften Status Quo",
        ],
        "pattern_interrupt_template": """Hallo {name},

ich habe gerade über {company} nachgedacht und mir ist etwas aufgefallen.

[ÜBERRASCHENDE BE OBSERVATION]

Das hat mich an unser Gespräch erinnert. 

Was denkst du: [THOUGHT-PROVOKING QUESTION]?""",

        "value_add_template": """Hallo {name},

ich habe gerade einen Case Study über {similar_company} gelesen, die {achievement} erreicht haben.

[KURZE ZUSAMMENFASSUNG]

Das könnte auch für {company} relevant sein.

Soll ich dir die vollständige Analyse schicken?""",

        "urgency_template": """Hallo {name},

kurze Info: Wir haben noch [X] Plätze für [OFFER] frei.

Da du Interesse hattest, dachte ich, ich melde mich kurz.

Sollen wir nochmal kurz sprechen?""",
    },

    "price_objection": {
        "diagnosis": "Preis-Einwand blockiert den Deal",
        "action_plan": [
            "1. Verstehe die echte Einwand-Hintergrund (Budget, Wert-Wahrnehmung, Autorität)",
            "2. Zeige ROI mit konkreten Zahlen",
            "3. Biete Payment-Optionen oder kleinere Pakete",
            "4. Vergleiche mit Status Quo Kosten",
            "5. Erstelle Urgency mit Angebot",
        ],
        "roi_template": """Hallo {name},

ich habe eine ROI-Berechnung für {company} gemacht:

Aktuell kostet dich [PROBLEM] etwa [COST PER MONTH].

Mit unserer Lösung:
- Investition: [PRICE]
- Ersparnis: [SAVINGS PER MONTH]
- ROI: [X]% in [TIME]

Das bedeutet, du hast deine Investition in [PAYBACK PERIOD] wieder drin.""",

        "payment_options_template": """Hallo {name},

ich verstehe, dass der Preis erstmal hoch wirkt.

Was, wenn wir das anders strukturieren?

✅ Ratenzahlung: [X]€ / Monat
✅ Oder: Start mit kleinerem Paket [PRICE]
✅ Oder: [SPECIAL OFFER]

Was passt besser zu dir?""",

        "comparison_template": """Hallo {name},

lass uns das in Relation setzen:

[Aktuelle Kosten des Problems] vs. [Lösung Preis]

Oder anders: [COST PER DAY] pro Tag für [ALL BENEFITS].

Das ist fair, oder?""",
    },

    "ghosted": {
        "diagnosis": "Kontakt antwortet nicht mehr",
        "action_plan": [
            "1. Pattern Interrupt Nachricht (völlig anders als vorher)",
            "2. Breakup Email (würdevoll verabschieden mit offener Tür)",
            "3. Wertvollen Content ohne Verkaufsintention",
            "4. Social Proof (Erfolgsgeschichte)",
            "5. Final Ask (letzter Versuch mit klarer Frage)",
        ],
        "pattern_interrupt_template": """Hey {name}! 🤔

Komische Frage, aber: Was war das letzte Mal, als du etwas gemacht hast, das dein Business wirklich vorangebracht hat?

[THOUGHT-PROVOKING CONTENT]

Falls du Lust auf einen kurzen Austausch hast, sag Bescheid!

LG
{your_name}""",

        "breakup_template": """Hallo {name},

ich habe gemerkt, dass du wahrscheinlich gerade andere Prioritäten hast.

Das ist völlig okay - ich verstehe das.

Falls du in Zukunft doch Interesse hast, melde dich einfach.

Die Tür bleibt offen.

Beste Grüße
{your_name}""",

        "final_ask_template": """Hallo {name},

letzte Frage: Ist das Thema {topic} für dich noch relevant?

Falls ja, lass uns kurz sprechen.
Falls nein, sage einfach Bescheid - dann melde ich mich nicht mehr.

Alles Gute
{your_name}""",
    },
}

# =============================================================================
# BANT-ANALYSE TEMPLATE
# =============================================================================

CHIEF_BANT_ANALYSIS = {
    "template": """BANT-Analyse für: {contact_name} ({company_name})

═══════════════════════════════════════════════════════════════════
BUDGET (B)
═══════════════════════════════════════════════════════════════════
• Verfügbares Budget: {budget}
• Budget-Freigabe: {budget_approval}
• Finanzielle Situation: {financial_situation}
• Alternative Investitionen: {alternative_investments}

SCORE: {budget_score}/25


═══════════════════════════════════════════════════════════════════
AUTHORITY (A)
═══════════════════════════════════════════════════════════════════
• Entscheidungsbefugnis: {authority_level}
• Entscheidungsprozess: {decision_process}
• Entscheider: {decision_maker}
• Influencer: {influencers}

SCORE: {authority_score}/25


═══════════════════════════════════════════════════════════════════
NEED (N)
═══════════════════════════════════════════════════════════════════
• Hauptschmerzpunkt: {main_pain_point}
• Aktuelle Lösung: {current_solution}
• Schmerz-Intensität: {pain_intensity}/10
• Business Impact: {business_impact}

SCORE: {need_score}/25


═══════════════════════════════════════════════════════════════════
TIMELINE (T)
═══════════════════════════════════════════════════════════════════
• Entscheidungstermin: {decision_date}
• Start-Termin: {start_date}
• Dringlichkeit: {urgency_level}
• Trigger-Events: {trigger_events}

SCORE: {timeline_score}/25


═══════════════════════════════════════════════════════════════════
GESAMT-SCORE: {total_score}/100
═══════════════════════════════════════════════════════════════════

PRIORITÄT: {priority_level}
NÄCHSTER SCHRITT: {next_step}
RISIKEN: {risks}
""",

    "questions": {
        "budget": [
            "Welches Budget steht für diese Lösung zur Verfügung?",
            "Wie läuft der Budget-Freigabeprozess?",
            "Gibt es alternative Budget-Quellen?",
            "Welche Investitionen wurden in letzter Zeit gemacht?",
        ],
        "authority": [
            "Wer trifft die finale Entscheidung?",
            "Wie läuft der Entscheidungsprozess?",
            "Wer ist noch involviert?",
            "Wer kann die Entscheidung blockieren?",
        ],
        "need": [
            "Was ist der Hauptschmerzpunkt?",
            "Welche Lösung nutzt ihr aktuell?",
            "Wie groß ist das Problem? (1-10)",
            "Was passiert, wenn nichts geändert wird?",
        ],
        "timeline": [
            "Wann soll die Lösung implementiert werden?",
            "Was ist der letzte Termin?",
            "Was macht es dringend?",
            "Gibt es Events, die den Termin beeinflussen?",
        ],
    },
}

# =============================================================================
# PIPELINE-REVIEW PROMPTS
# =============================================================================

CHIEF_PIPELINE_REVIEW = {
    "questions": [
        "Welche Deals sind in den letzten 7 Tagen ins Stocken geraten?",
        "Welche Deals haben die höchste Priorität, aber keinen Fortschritt?",
        "Welche Deals sind überfällig (kein Kontakt seit X Tagen)?",
        "Welche Deals haben ein Budget, aber keine Timeline?",
        "Welche Deals haben eine Timeline, aber keine Autorität?",
        "Welche Deals sind zu groß (Requirement Creep)?",
        "Welche Deals sind zu klein (nicht wertvoll genug)?",
    ],

    "analysis_template": """PIPELINE-REVIEW: {date}

═══════════════════════════════════════════════════════════════════
ÜBERSICHT
═══════════════════════════════════════════════════════════════════
• Gesamt-Pipeline: €{total_pipeline_value}
• Anzahl Deals: {total_deals}
• Durchschnitt Deal-Size: €{avg_deal_size}
• Win-Rate: {win_rate}%

STADIUM-VERTEILUNG:
• Prospecting: {prospecting_count} (€{prospecting_value})
• Qualification: {qualification_count} (€{qualification_value})
• Proposal: {proposal_count} (€{proposal_value})
• Negotiation: {negotiation_count} (€{negotiation_value})


═══════════════════════════════════════════════════════════════════
KRITISCHE DEALS (Handlungsbedarf)
═══════════════════════════════════════════════════════════════════
{critical_deals_list}


═══════════════════════════════════════════════════════════════════
BOTTLENECKS
═══════════════════════════════════════════════════════════════════
• Längste Verweildauer: {longest_stage}
• Meiste Deals stecken in: {bottleneck_stage}
• Durchschnitt Stage-Dauer: {avg_stage_duration} Tage


═══════════════════════════════════════════════════════════════════
EMPFEHLUNGEN
═══════════════════════════════════════════════════════════════════
{recommendations}
""",

    "action_items": {
        "stalled_deals": "Deal-Medic anwenden",
        "missing_bant": "BANT-Analyse durchführen",
        "no_timeline": "Urgency erzeugen",
        "no_authority": "Entscheider identifizieren",
        "no_budget": "Budget-Quellen finden",
    },
}

# =============================================================================
# NACHFASS-STRATEGIE GENERATOR
# =============================================================================

CHIEF_FOLLOWUP_STRATEGY = {
    "day_1": {
        "type": "thank_you",
        "template": """Hallo {name},

vielen Dank für unser Gespräch heute!

Ich fasse kurz zusammen, was wir besprochen haben:
{summary}

Als Nächstes: {next_step}

Falls du Fragen hast, melde dich einfach!

Beste Grüße
{your_name}""",
    },

    "day_3": {
        "type": "value_add",
        "template": """Hallo {name},

ich dachte an unser Gespräch und wollte dir noch einen Tipp geben:

{value_tip}

Falls dich die vollständige Lösung interessiert, können wir gerne nochmal sprechen.

Grüße
{your_name}""",
    },

    "day_7": {
        "type": "social_proof",
        "template": """Hallo {name},

kurze Info: {similar_company} hat gerade {achievement} erreicht - mit unserer Lösung.

Vielleicht interessiert dich, wie?

Grüße
{your_name}""",
    },

    "day_14": {
        "type": "soft_ask",
        "template": """Hallo {name},

ich hoffe, alles läuft gut bei {company}!

Da wir uns vor zwei Wochen ausgetauscht haben, wollte ich kurz nachfragen:

Wie steht es mit {topic}?

Falls du Lust auf einen kurzen Call hast, sag einfach Bescheid!

Grüße
{your_name}""",
    },

    "day_30": {
        "type": "breakup",
        "template": """Hallo {name},

ich habe gemerkt, dass du wahrscheinlich gerade andere Prioritäten hast.

Das ist völlig okay.

Falls du in Zukunft doch Interesse hast, melde dich einfach.

Die Tür bleibt offen.

Beste Grüße
{your_name}""",
    },
}

# =============================================================================
# INVESTOR BRIEF TEMPLATE
# =============================================================================

CHIEF_INVESTOR_BRIEF = {
    "template": """INVESTOR BRIEF - {company_name}
{date}

═══════════════════════════════════════════════════════════════════
EXECUTIVE SUMMARY
═══════════════════════════════════════════════════════════════════
{executive_summary}


═══════════════════════════════════════════════════════════════════
KEY METRICS
═══════════════════════════════════════════════════════════════════
• Monthly Recurring Revenue (MRR): €{mrr}
• Annual Recurring Revenue (ARR): €{arr}
• Customer Acquisition Cost (CAC): €{cac}
• Lifetime Value (LTV): €{ltv}
• LTV:CAC Ratio: {ltv_cac_ratio}:1
• Monthly Growth Rate: {growth_rate}%
• Churn Rate: {churn_rate}%
• Active Customers: {active_customers}


═══════════════════════════════════════════════════════════════════
TRAKTION
═══════════════════════════════════════════════════════════════════
{trend_analysis}


═══════════════════════════════════════════════════════════════════
WACHSTUMS-PLAN
═══════════════════════════════════════════════════════════════════
{growth_plan}


═══════════════════════════════════════════════════════════════════
FINANZIELLE PROGNOSE
═══════════════════════════════════════════════════════════════════
{financial_forecast}
""",
}

# =============================================================================
# CEO MODULE - Executive-Level Insights
# =============================================================================

CHIEF_CEO_MODULE = {
    "strategic_questions": [
        "Was ist dein größter Hebel für Wachstum im nächsten Quartal?",
        "Welche 3 Metriken sind für dein Business am wichtigsten?",
        "Was hält dich nachts wach? (Größte Sorge)",
        "Was wäre, wenn du 2x mehr Zeit hättest?",
        "Was ist dein größtes Bottleneck?",
        "Was macht deine Konkurrenz besser?",
        "Was würde dein Business transformieren?",
        "Wo siehst du dich in 12 Monaten?",
    ],

    "growth_frameworks": {
        "pirate_metrics": {
            "name": "AARRR Framework (Pirate Metrics)",
            "stages": [
                "Acquisition - Wie gewinnst du Kunden?",
                "Activation - Erste positive Erfahrung",
                "Retention - Kunden zurückholen",
                "Revenue - Einnahmen generieren",
                "Referral - Kunden werben Kunden",
            ],
            "questions": [
                "Welche Acquisition-Kanäle funktionieren am besten?",
                "Was ist dein Activation-Moment?",
                "Wie hältst du Kunden langfristig?",
                "Wie maximierst du Customer Lifetime Value?",
                "Wie aktivierst du Referrals?",
            ],
        },
        "flywheel": {
            "name": "Flywheel Model",
            "stages": [
                "Attract - Aufmerksamkeit gewinnen",
                "Engage - Interaktion schaffen",
                "Delight - Kunden begeistern",
            ],
            "questions": [
                "Wie gewinnst du Aufmerksamkeit?",
                "Wie schaffst du echte Interaktion?",
                "Wie begeisterst du deine Kunden?",
            ],
        },
    },

    "decision_frameworks": {
        "impact_effort": {
            "name": "Impact vs. Effort Matrix",
            "quadrants": [
                "High Impact, Low Effort - Quick Wins (Priorität 1)",
                "High Impact, High Effort - Major Projects (Priorität 2)",
                "Low Impact, Low Effort - Fill-ins (Priorität 3)",
                "Low Impact, High Effort - Thankless Tasks (Vermeiden)",
            ],
        },
        "pareto": {
            "name": "80/20 Rule",
            "questions": [
                "Welche 20% deiner Aktivitäten bringen 80% der Ergebnisse?",
                "Welche 20% deiner Kunden bringen 80% des Umsatzes?",
                "Welche 20% deiner Probleme verursachen 80% der Kopfschmerzen?",
            ],
        },
    },

    "leadership_insights": [
        "Delegate everything except your unique value",
        "Systematize what works, eliminate what doesn't",
        "Focus on leverage, not effort",
        "Build systems, not habits",
        "Measure what matters, ignore the rest",
        "Double down on what works",
        "Kill your darlings (if they don't work)",
        "Time is your only non-renewable resource",
    ],
}

# =============================================================================
# QUICK ACCESS FUNCTIONS
# =============================================================================

def get_outreach_script(industry: str, script_type: str, variables: Dict[str, str]) -> str:
    """Gibt ein Outreach-Skript zurück, formatiert mit Variablen."""
    scripts = CHIEF_OUTREACH_SCRIPTS.get(industry, {})
    template = scripts.get(script_type, "")
    
    if not template:
        return ""
    
    try:
        return template.format(**variables)
    except KeyError:
        return template

def get_objection_response(objection_type: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Gibt Einwandbehandlung zurück."""
    objection = CHIEF_OBJECTION_HANDLING.get(objection_type)
    
    if not objection:
        return {}
    
    return {
        "framework": objection.get("framework"),
        "responses": objection.get("responses", []),
        "closing_questions": objection.get("closing_questions", []),
    }

def get_deal_medic_plan(situation: str) -> Dict[str, Any]:
    """Gibt Deal-Medic Action Plan zurück."""
    medic = CHIEF_DEAL_MEDIC.get(situation)
    
    if not medic:
        return {}
    
    return {
        "diagnosis": medic.get("diagnosis"),
        "action_plan": medic.get("action_plan", []),
        "templates": {
            k: v for k, v in medic.items() 
            if k.endswith("_template")
        },
    }

def get_ceo_insight(insight_type: str) -> Any:
    """Gibt CEO Module Insight zurück."""
    module = CHIEF_CEO_MODULE.get(insight_type)
    return module

def get_bant_analysis_template(variables: Dict[str, Any]) -> str:
    """Gibt BANT-Analyse Template formatiert zurück."""
    template = CHIEF_BANT_ANALYSIS.get("template", "")
    try:
        return template.format(**variables)
    except KeyError:
        return template

def get_pipeline_review_questions() -> List[str]:
    """Gibt Pipeline-Review Fragen zurück."""
    return CHIEF_PIPELINE_REVIEW.get("questions", [])

def get_followup_strategy(day: int) -> Dict[str, Any]:
    """Gibt Nachfass-Strategie für bestimmten Tag zurück."""
    day_key = f"day_{day}"
    return CHIEF_FOLLOWUP_STRATEGY.get(day_key, {})

def get_investor_brief_template(variables: Dict[str, Any]) -> str:
    """Gibt Investor Brief Template formatiert zurück."""
    template = CHIEF_INVESTOR_BRIEF.get("template", "")
    try:
        return template.format(**variables)
    except KeyError:
        return template

def get_chief_script(category: str, script_key: str, variables: Optional[Dict[str, str]] = None) -> Optional[Dict[str, Any]]:
    """
    Gibt ein CHIEF Script zurück.
    
    Args:
        category: Kategorie (pitches, wert_fragen, einwand_handling, follow_up, ghostbuster, closing)
        script_key: Key des spezifischen Skripts
        variables: Optional dict mit Variablen zum Ersetzen (z.B. {"Name": "Max", "Thema": "Sales"})
        
    Returns:
        Script-Dictionary mit name, channel, type, text (formatiert) oder None
    """
    variables = variables or {}
    
    category_dict = CHIEF_SCRIPTS.get(category)
    if not category_dict:
        return None
    
    script = category_dict.get(script_key)
    if not script:
        return None
    
    # Format text with variables
    formatted_text = script.get("text", "")
    try:
        # Replace [Variable] format
        for key, value in variables.items():
            formatted_text = formatted_text.replace(f"[{key}]", str(value))
    except Exception:
        pass
    
    return {
        "name": script.get("name"),
        "channel": script.get("channel", []),
        "type": script.get("type"),
        "text": formatted_text,
        "variables": script.get("variables", []),
    }

def get_all_chief_scripts(category: Optional[str] = None) -> Dict[str, Any]:
    """
    Gibt alle CHIEF Scripts zurück, optional gefiltert nach Kategorie.
    
    Args:
        category: Optional - wenn angegeben, nur diese Kategorie zurückgeben
        
    Returns:
        Dictionary mit allen Scripts oder nur die gewählte Kategorie
    """
    if category:
        return CHIEF_SCRIPTS.get(category, {})
    return CHIEF_SCRIPTS

