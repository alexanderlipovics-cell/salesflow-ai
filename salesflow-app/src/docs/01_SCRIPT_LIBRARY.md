# 📜 Script Library - Sales Flow AI

> **⚠️ HINWEIS: Diese Dokumentation ist veraltet!**
> 
> **Bitte nutze die neue [SCRIPT_LIBRARY_V2.md](./SCRIPT_LIBRARY_V2.md)**
> 
> Die neue Version enthält:
> - 52 professionelle Scripts (statt weniger)
> - Dynamische DISG-Anpassung
> - Performance-Tracking
> - API unter `/api/v2/scripts`

---

> **Referenzdokumentation für AI-Agenten & Entwickler**  
> Verkaufs-Scripts, Einwandbehandlung & Nachrichtenvorlagen

---

## 📑 Inhaltsverzeichnis

1. [Übersicht](#-übersicht)
2. [Einwandbehandlung](#-einwandbehandlung)
3. [Cold Outreach Templates](#-cold-outreach-templates)
4. [Follow-Up Sequenzen](#-follow-up-sequenzen)
5. [Ghost-Buster Scripts](#-ghost-buster-scripts)
6. [Closing Scripts](#-closing-scripts)
7. [Vertical-spezifische Scripts](#-vertical-spezifische-scripts)

---

## 🎯 Übersicht

Die Script Library enthält alle bewährten Verkaufs-Scripts für:
- **Erstansprache** (Cold Outreach)
- **Einwandbehandlung** (Objection Handling)
- **Follow-ups** (Nachfass-Sequenzen)
- **Ghost-Busting** (Reaktivierung)
- **Closing** (Abschluss)

### Nutzung durch AI-Agenten

```typescript
// CHIEF greift auf Scripts zu via:
const scripts = await getScriptsForVertical(vertical, situation);

// Beispiel Response:
{
  situation: "objection_no_time",
  scripts: [
    { style: "empathic", text: "Verstehe ich total! Die Frage ist..." },
    { style: "direct", text: "Kurze Frage: Wenn du die Zeit hättest..." }
  ]
}
```

---

## 🛡️ Einwandbehandlung

### Kern-Einwände & Reaktionen

#### 1️⃣ "Keine Zeit"

| Stil | Script |
|------|--------|
| **Empathisch** | "Verstehe ich total! Die Frage ist nicht ob du jetzt Zeit hast – sondern ob dir 10 Minuten wert sind, um zu checken ob das was für dich sein könnte." |
| **Direkt** | "Kurze Frage: Wenn du die Zeit hättest – wäre das Thema grundsätzlich interessant?" |
| **Termin-Anker** | "Absolut nachvollziehbar. Wann passt es besser – eher morgens oder abends?" |

#### 2️⃣ "Kein Geld"

| Stil | Script |
|------|--------|
| **ROI-Fokus** | "Verstehe. Kurze Frage: Wenn du wüsstest, dass sich das in 3 Monaten amortisiert – wäre es dann interessant?" |
| **Priorisierung** | "Das höre ich oft. Die Frage ist: Wie viel kostet es dich, nichts zu verändern?" |
| **Flexibilität** | "Gibt es denn ein Budget-Limit, mit dem wir arbeiten können?" |

#### 3️⃣ "Muss nachdenken"

| Stil | Script |
|------|--------|
| **Konkretisieren** | "Absolut. Was genau möchtest du nochmal durchdenken? Vielleicht kann ich dir direkt die Info geben." |
| **Termin setzen** | "Verstehe. Wann macht es Sinn, dass ich mich nochmal melde?" |
| **Klarheit** | "Klar. Was wäre denn der nächste Schritt, wenn du dich entscheiden würdest?" |

#### 4️⃣ "Zu teuer"

| Stil | Script |
|------|--------|
| **Wert-Vergleich** | "Verstehe. Im Vergleich wozu ist es dir zu teuer?" |
| **Aufschlüsselung** | "Lass uns das mal aufschlüsseln: Das sind nur X€ pro Tag – weniger als ein Kaffee." |
| **Alternativ** | "Welcher Preis wäre für dich machbar?" |

#### 5️⃣ "Ich kenne jemanden der..."

| Stil | Script |
|------|--------|
| **Interesse zeigen** | "Oh spannend! Was hat diese Person erlebt?" |
| **Individualisieren** | "Jede Situation ist einzigartig. Was wäre für DICH wichtig?" |
| **Validieren** | "Das kommt vor. Die Frage ist: Hat diese Person die gleiche Situation wie du?" |

---

## 📨 Cold Outreach Templates

### DM Opener (Social Media)

#### Curiosity-Based
```
Hey [NAME]! 👋

Ich hab mir dein Profil angeschaut und dachte direkt an dich – 
kennst du das: [PAIN POINT]?

Hab was Spannendes für dich – kurzer Austausch?
```

#### Value-First
```
Hey [NAME],

Kurze Frage: Beschäftigst du dich gerade mit [THEMA]?

Hab einen Tipp der [KONKRET VORTEIL] – kostenlos.
Interesse?
```

#### Social Proof
```
Hi [NAME]!

[MUTUAL CONNECTION] hat mir erzählt, du bist auch in [BRANCHE].
Arbeite gerade mit ein paar Leuten wie dir und die Ergebnisse sind krass.

Lust auf 10 Min Austausch?
```

### Email Opener

```markdown
Betreff: Kurze Frage zu [THEMA]

Hi [NAME],

ich sehe dass du [BEOBACHTUNG].

Viele [ROLLE] in [BRANCHE] haben das gleiche Problem: [PAIN].

Wir helfen dabei, [LÖSUNG] – in [ZEITRAUM].

Kurzer Call diese Woche?

Beste Grüße,
[DEIN NAME]
```

---

## 🔄 Follow-Up Sequenzen

### Standard 5-Touch Sequenz

| Tag | Nachricht |
|-----|-----------|
| **Tag 0** | Erste Nachricht (Opener) |
| **Tag 2** | "Hey! Hast du meine Nachricht gesehen? 🙂" |
| **Tag 5** | Value-Add: Artikel, Tipp, oder Case Study |
| **Tag 8** | "Kurzes Update: [Neuer Benefit]. Noch relevant?" |
| **Tag 14** | Break-Up: "Falls kein Interesse – kein Problem! Nur ein letzter Check..." |

### Aggressive Sequenz (für heiße Leads)

| Zeitpunkt | Nachricht |
|-----------|-----------|
| **Sofort** | Erste Nachricht |
| **+4h** | "PS: Hab gerade das hier gesehen – dachte an dich: [Link]" |
| **+24h** | "Hey, kurze Frage: Hast du 10 Min diese Woche?" |
| **+48h** | Sprachnachricht |
| **+72h** | "Letzte Frage: Ja oder Nein?" |

---

## 👻 Ghost-Buster Scripts

### Soft Ghost (< 7 Tage)

```
Hey [NAME], alles gut bei dir?
Wollte nur kurz checken ob du meine Nachricht gesehen hast 🙂
```

```
Hi! Nur ein kurzer Ping – bist du noch interessiert an [THEMA]?
Falls nicht, kein Problem – sag einfach Bescheid!
```

### Medium Ghost (7-14 Tage)

```
Hey [NAME], ich seh du warst online aber hast nicht geantwortet...
Ist ok – vielleicht passt das Timing nicht.
Kurze Frage: Soll ich in 2 Wochen nochmal schreiben oder ist das Thema erledigt für dich?
```

### Hard Ghost (> 14 Tage) - Pattern Interrupt

```
[NAME], ich merk du bist beschäftigt. Letzte Nachricht von mir:
Falls [THEMA] komplett uninteressant ist – sag einfach "Nein".
Kein Drama, versprochen 🙂
```

```
Kurze Frage [NAME]:
Auf einer Skala von 1-10, wie relevant ist [THEMA] für dich gerade?
(1 = Vergiss es, 10 = Lass uns reden)
```

### Humor-Based (für I-Typen)

```
Hey [NAME]! 👋
Ich hoffe du wurdest nicht von Aliens entführt... 👽

Falls du noch auf der Erde bist – hier mein letzter Versuch:
Interesse an [THEMA]? Ja/Nein?
```

---

## 🎯 Closing Scripts

### Soft Close

```
"Basierend auf allem was wir besprochen haben – 
was spricht dagegen, dass wir jetzt starten?"
```

### Assumptive Close

```
"Super! Dann lass uns das festmachen.
Wollen wir Montag oder Dienstag mit dem Onboarding starten?"
```

### Urgency Close

```
"Aktuell haben wir [ANGEBOT] noch verfügbar.
Ab [DATUM] ändert sich das. Macht es Sinn, das jetzt zu sichern?"
```

### Takeaway Close

```
"Weißt du was, vielleicht ist das gerade einfach nicht das Richtige für dich.
Das ist ok – ich will dich zu nichts überreden.
Was denkst du?"
```

---

## 🏢 Vertical-spezifische Scripts

### Network Marketing

| Situation | Script |
|-----------|--------|
| **Partner-Gewinnung** | "Ich baue gerade ein Team auf und such Leute die [EIGENSCHAFT]. Bist du offen für neue Einkommensmöglichkeiten?" |
| **Produkt-Intro** | "Nutze seit [X] Wochen [PRODUKT] und die Ergebnisse sind krass. Kennst du das?" |
| **Einwand: Pyramide** | "Gute Frage! Der Unterschied ist: Bei uns verdienst du durch echte Produkte, nicht durch Recruiting. Darf ich dir zeigen wie?" |

### Immobilien

| Situation | Script |
|-----------|--------|
| **Eigentümer-Akquise** | "Planen Sie in den nächsten 12 Monaten, Ihre Immobilie zu verkaufen? Ich hab gerade mehrere Interessenten für [LAGE]." |
| **Emotionales Exposé** | "Diese Wohnung ist nicht nur 85m² – es ist Ihr zukünftiges Zuhause mit [EMOTIONALER BENEFIT]." |
| **Einwand: Provision** | "Verstehe. Die Provision ist eine Investition in einen schnelleren Verkauf zum Höchstpreis. Darf ich Ihnen zeigen, was wir anders machen?" |

### Coaching/Beratung

| Situation | Script |
|-----------|--------|
| **Discovery Call** | "Was müsste passieren, damit du in 90 Tagen sagst: Das war die beste Entscheidung?" |
| **Transformation** | "Stell dir vor, du bist in 6 Monaten an Punkt [ZIEL]. Was wäre anders?" |
| **Investment-Einwand** | "Investierst du gerade in dein Problem oder in deine Lösung?" |

---

## 📊 Script-Performance Tracking

Die Script Library trackt automatisch:

```typescript
interface ScriptPerformance {
  script_id: string;
  usage_count: number;
  reply_rate: number;      // % die geantwortet haben
  positive_rate: number;   // % positive Antworten
  conversion_rate: number; // % die convertiert sind
  avg_response_time: number;
  best_for_disc_type: 'D' | 'I' | 'S' | 'G';
  best_for_channel: 'instagram' | 'linkedin' | 'email';
}
```

### A/B Testing

CHIEF wählt automatisch die beste Script-Variante basierend auf:
1. **DISC-Profil** des Leads
2. **Kanal** (Instagram, LinkedIn, Email)
3. **Historische Performance**

---

## 🔧 Script anpassen

### Variablen

| Variable | Beschreibung |
|----------|--------------|
| `[NAME]` | Name des Leads |
| `[THEMA]` | Aktuelles Gesprächsthema |
| `[PAIN POINT]` | Schmerzpunkt des Leads |
| `[BENEFIT]` | Hauptvorteil |
| `[ZEITRAUM]` | Zeitrahmen für Ergebnis |
| `[PRODUKT]` | Produktname |
| `[LAGE]` | Standort (Immobilien) |

### Tonalität-Anpassung (DISC)

| DISC-Typ | Anpassung |
|----------|-----------|
| **D** | Kurz, direkt, ergebnisorientiert |
| **I** | Enthusiastisch, Emojis, beziehungsorientiert |
| **S** | Sanft, sicherheitsgebend, geduldig |
| **G** | Faktenbasiert, detailliert, strukturiert |

---

> **Sales Flow AI** | Script Library v1.0 | 2024

