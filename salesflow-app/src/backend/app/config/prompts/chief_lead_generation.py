"""
╔════════════════════════════════════════════════════════════════════════════╗
║  CHIEF LEAD GENERATION PROMPT MODULE v1.0                                  ║
║  Komplettes System für Lead-Generierung & Erstkontakt                     ║
╚════════════════════════════════════════════════════════════════════════════╝

Module:
1. Lead Discovery - Wo findet man Leads?
2. Profile Qualifier - Passt dieser Lead?
3. Personalized Opener Generator - 3 Varianten erstellen
4. Warm-Up Sequence - Pre-DM Strategie
5. ICP Workshop - Ideal Customer Profile definieren
"""

from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from enum import Enum


# =============================================================================
# ENUMS & TYPES
# =============================================================================

class Platform(str, Enum):
    """Social Media Plattformen"""
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    FACEBOOK = "facebook"
    TIKTOK = "tiktok"
    XING = "xing"
    WHATSAPP = "whatsapp"


class LeadTemperature(str, Enum):
    """Lead-Temperatur"""
    ICE_COLD = "ice_cold"      # Kennt dich nicht, kein Interesse gezeigt
    COLD = "cold"              # Kennt dich nicht, aber potentiell passend
    LUKEWARM = "lukewarm"      # Hat dich gesehen (Story View, Like)
    WARM = "warm"              # Hat interagiert (Kommentar, DM-Reaktion)
    HOT = "hot"                # Hat aktiv Interesse gezeigt


class OpenerStyle(str, Enum):
    """Opener-Stile"""
    CURIOSITY = "curiosity"        # Neugier wecken
    VALUE_FIRST = "value_first"    # Direkt Mehrwert liefern
    COMPLIMENT = "compliment"      # Echtes Kompliment + Überleitung
    COMMON_GROUND = "common_ground" # Gemeinsamkeit betonen
    QUESTION = "question"          # Offene Frage stellen
    STORY = "story"               # Mini-Story teilen


class IndustryVertical(str, Enum):
    """Branchen für ICP"""
    NETWORK_MARKETING = "network_marketing"
    REAL_ESTATE = "real_estate"
    INSURANCE = "insurance"
    FINANCE = "finance"
    COACHING = "coaching"
    B2B_SAAS = "b2b_saas"
    E_COMMERCE = "e_commerce"
    FITNESS = "fitness"
    BEAUTY = "beauty"


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class IdealCustomerProfile:
    """Ideal Customer Profile"""
    industry: str
    demographics: Dict[str, Any]
    psychographics: Dict[str, Any]
    pain_points: List[str]
    goals: List[str]
    objections: List[str]
    buying_triggers: List[str]
    platforms: List[str]
    keywords: List[str]
    disqualifiers: List[str]


@dataclass
class LeadProfile:
    """Profil eines potentiellen Leads"""
    platform: Platform
    username: str
    bio: Optional[str] = None
    post_count: Optional[int] = None
    follower_count: Optional[int] = None
    following_count: Optional[int] = None
    recent_posts: List[str] = field(default_factory=list)
    engagement_signals: List[str] = field(default_factory=list)
    mutual_connections: int = 0
    location: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None


@dataclass
class QualificationResult:
    """Ergebnis der Lead-Qualifizierung"""
    score: int  # 0-100
    temperature: LeadTemperature
    fit_reasons: List[str]
    concerns: List[str]
    recommended_approach: str
    opener_style: OpenerStyle
    personalization_hooks: List[str]


@dataclass
class OpenerVariant:
    """Eine Opener-Variante"""
    style: OpenerStyle
    message: str
    hook: str
    personalization: str
    call_to_action: str
    estimated_reply_rate: str


# =============================================================================
# 1. LEAD DISCOVERY PROMPT
# =============================================================================

LEAD_DISCOVERY_PROMPT = """
[LEAD DISCOVERY ENGINE]

Du hilfst dem User dabei, neue potentielle Leads zu finden.

═══════════════════════════════════════════════════════════════════════════════
ZIELGRUPPE (ICP)
═══════════════════════════════════════════════════════════════════════════════
{icp_summary}

═══════════════════════════════════════════════════════════════════════════════
AKTUELLE PLATTFORM: {platform}
═══════════════════════════════════════════════════════════════════════════════

Basierend auf der Zielgruppe, hier sind die besten Strategien:

### 🔍 HASHTAG-STRATEGIE
Suche nach Personen die diese Hashtags nutzen oder denen folgen:

**Branchen-Hashtags:**
{industry_hashtags}

**Pain-Point Hashtags:**
{pain_hashtags}

**Lifestyle-Hashtags:**
{lifestyle_hashtags}

### 👥 GRUPPEN & COMMUNITIES
Wo sich deine Zielgruppe aufhält:
{communities}

### 🎯 KONKURRENZ-FOLLOWER
Accounts deren Follower zu dir passen könnten:
{competitor_accounts}

### 📅 EVENTS & AKTIONEN
Zeitbasierte Lead-Quellen:
{events}

### 💡 CONTENT-MAGNETEN
Content-Ideen die deine Zielgruppe anziehen:
{content_ideas}

═══════════════════════════════════════════════════════════════════════════════
TÄGLICHE LEAD-ROUTINE ({platform})
═══════════════════════════════════════════════════════════════════════════════

1. **Morgens (10 Min)**
   - 3 Hashtags durchsuchen
   - 5 Profile merken (speichern)
   
2. **Mittags (15 Min)**
   - Gemerkte Profile warm machen (Story reagieren, Kommentare)
   - 2 echte Kommentare bei potentiellen Leads

3. **Abends (10 Min)**
   - 2-3 warme Leads anschreiben
   - Story Views checken → warme Kontakte identifizieren

═══════════════════════════════════════════════════════════════════════════════
DEIN NÄCHSTER SCHRITT
═══════════════════════════════════════════════════════════════════════════════
{next_action}
"""

PLATFORM_SPECIFIC_DISCOVERY = {
    Platform.INSTAGRAM: """
### Instagram-spezifische Strategien:

**Story-Views nutzen:**
- Wer schaut regelmäßig deine Stories?
- Das sind warme Leads → direkt anschreiben!

**Reels-Kommentare:**
- Unter viralen Reels in deiner Nische kommentieren
- Wer dort kommentiert = potentieller Lead

**Explore-Page:**
- Regelmäßig in deiner Nische scrollen
- Algorithmus lernt → zeigt dir ähnliche Profile

**Geotags:**
- Lokale Events, Cafés, Coworking Spaces
- Perfekt für lokale Leads

**Collab-Accounts:**
- Mit Accounts kooperieren die deine Zielgruppe haben
- Gegenseitige Story-Mentions
""",
    Platform.LINKEDIN: """
### LinkedIn-spezifische Strategien:

**Erweiterte Suche:**
- Job-Titel + Branche + Region filtern
- "Kürzlich gepostet" = aktive User

**Post-Engagement:**
- Unter Posts von Influencern in deiner Nische kommentieren
- Wer dort kommentiert = potentieller Lead

**Gruppen:**
- Branchenspezifische Gruppen beitreten
- Aktiv kommentieren (nicht pitchen!)

**Alumni-Netzwerk:**
- Ehemalige Kollegen, Kommilitonen
- Gemeinsamer Hintergrund = warmer Einstieg

**Sales Navigator (Premium):**
- Lead-Listen erstellen
- InMail für Cold Outreach
""",
    Platform.FACEBOOK: """
### Facebook-spezifische Strategien:

**Gruppen sind King:**
- Geschlossene Gruppen in deiner Nische beitreten
- Mehrwert liefern (Posts, Kommentare)
- NICHT pitchen in der Gruppe!

**Gruppen-Mitglieder:**
- Aktive Mitglieder identifizieren
- Profil ansehen → Messenger

**Events:**
- Lokale Business-Events
- Teilnehmerlisten durchgehen

**Marketplace:**
- Für bestimmte Produkte/Services relevant
""",
    Platform.TIKTOK: """
### TikTok-spezifische Strategien:

**Für Dich Seite (FYP):**
- Regelmäßig in deiner Nische scrollen
- Kommentieren und duelle starten

**Creator in deiner Nische:**
- Wer macht ähnlichen Content?
- Deren Follower = deine Zielgruppe

**Live-Streams:**
- In Lives deiner Nische aktiv sein
- Hosts und aktive Zuschauer connecten

**Hashtag-Challenges:**
- An Trends teilnehmen
- Viralität = mehr Sichtbarkeit
""",
}

# Discovery Hashtags by Industry
INDUSTRY_HASHTAGS = {
    IndustryVertical.NETWORK_MARKETING: {
        "industry": ["#networkmarketing", "#mlm", "#homebasedbusiness", "#sidehustle", "#entrepreneurlife", "#workfromhome", "#financialfreedom"],
        "pain": ["#9to5escape", "#mompreneur", "#daddypreneur", "#extraincome", "#residualincome", "#passiveincome"],
        "lifestyle": ["#laptoplifestyle", "#freedomlifestyle", "#travelpreneur", "#worklifebalance"],
    },
    IndustryVertical.REAL_ESTATE: {
        "industry": ["#immobilien", "#realestate", "#immobilienmakler", "#investment", "#kapitalanlage", "#vermögensaufbau"],
        "pain": ["#erstewohnung", "#eigenheim", "#hauskauf", "#mietfrei", "#altersvorsorge"],
        "lifestyle": ["#immobilieninvestor", "#vermögensaufbau", "#financialfreedom"],
    },
    IndustryVertical.INSURANCE: {
        "industry": ["#versicherung", "#finanzberatung", "#altersvorsorge", "#absicherung", "#vorsorge"],
        "pain": ["#berufsunfähigkeit", "#krankenversicherung", "#rentenlücke", "#familienschutz"],
        "lifestyle": ["#finanziellefreiheit", "#sicherheit", "#zukunftplanen"],
    },
    IndustryVertical.COACHING: {
        "industry": ["#coaching", "#lifecoach", "#mindset", "#persönlichkeitsentwicklung", "#transformation"],
        "pain": ["#burnout", "#stressabbau", "#selbstzweifel", "#neustart", "#veränderung"],
        "lifestyle": ["#bestlife", "#growthmindset", "#selfimprovement", "#motivation"],
    },
    IndustryVertical.FITNESS: {
        "industry": ["#fitness", "#personaltrainer", "#healthcoach", "#nutrition", "#workout"],
        "pain": ["#weightloss", "#abnehmen", "#gesundleben", "#fitwerden", "#newyearnewme"],
        "lifestyle": ["#fitfam", "#healthylifestyle", "#transformation", "#fitnessmotivation"],
    },
}


def build_lead_discovery_prompt(
    icp: IdealCustomerProfile,
    platform: Platform,
    user_context: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Baut den Lead Discovery Prompt.
    
    Args:
        icp: Ideal Customer Profile
        platform: Aktuelle Plattform
        user_context: Zusätzlicher Kontext
        
    Returns:
        Formatierter Prompt
    """
    # ICP Summary
    icp_summary = f"""
**Wer:** {icp.demographics.get('age_range', '25-45')}, {icp.demographics.get('gender', 'alle')}
**Was:** {', '.join(icp.goals[:3])}
**Problem:** {', '.join(icp.pain_points[:3])}
**Wo:** {', '.join(icp.platforms)}
**Keywords:** {', '.join(icp.keywords[:5])}
"""
    
    # Industry Hashtags
    industry = icp.industry.lower().replace(" ", "_")
    hashtag_data = INDUSTRY_HASHTAGS.get(
        IndustryVertical(industry) if industry in [e.value for e in IndustryVertical] else IndustryVertical.NETWORK_MARKETING,
        INDUSTRY_HASHTAGS[IndustryVertical.NETWORK_MARKETING]
    )
    
    industry_hashtags = ", ".join(hashtag_data.get("industry", []))
    pain_hashtags = ", ".join(hashtag_data.get("pain", []))
    lifestyle_hashtags = ", ".join(hashtag_data.get("lifestyle", []))
    
    # Communities
    communities = "\n".join([f"- {kw} Gruppen/Communities" for kw in icp.keywords[:5]])
    
    # Competitor Accounts
    competitor_accounts = "- [Hier Accounts eintragen die deine Zielgruppe ansprechen]"
    
    # Events
    events = """
- Branchen-Events und Messen
- Online-Webinare in deiner Nische
- Lokale Meetups und Networking-Events
"""
    
    # Content Ideas
    content_ideas = "\n".join([f"- Content über: {pain}" for pain in icp.pain_points[:4]])
    
    # Next Action
    next_action = f"""
**Jetzt:** Öffne {platform.value.title()} und suche nach einem dieser Hashtags:
→ {industry_hashtags.split(',')[0] if industry_hashtags else '#networking'}

Speichere 5 interessante Profile und mach sie warm (Story, Kommentar).
"""
    
    # Platform specific additions
    platform_additions = PLATFORM_SPECIFIC_DISCOVERY.get(platform, "")
    
    prompt = LEAD_DISCOVERY_PROMPT.format(
        icp_summary=icp_summary,
        platform=platform.value.title(),
        industry_hashtags=industry_hashtags,
        pain_hashtags=pain_hashtags,
        lifestyle_hashtags=lifestyle_hashtags,
        communities=communities,
        competitor_accounts=competitor_accounts,
        events=events,
        content_ideas=content_ideas,
        next_action=next_action,
    )
    
    return prompt + "\n" + platform_additions


# =============================================================================
# 2. PROFILE QUALIFIER PROMPT
# =============================================================================

PROFILE_QUALIFIER_PROMPT = """
[LEAD QUALIFICATION ENGINE]

Analysiere dieses Profil und bewerte ob es ein guter Lead ist.

═══════════════════════════════════════════════════════════════════════════════
PROFIL-DATEN
═══════════════════════════════════════════════════════════════════════════════
Plattform: {platform}
Username: {username}
Bio: {bio}
Follower: {followers} | Following: {following}
Posts: {post_count}
Location: {location}
Job/Titel: {job_title}

Letzte Posts/Content:
{recent_posts}

Engagement-Signale:
{engagement_signals}

═══════════════════════════════════════════════════════════════════════════════
IDEAL CUSTOMER PROFILE (Referenz)
═══════════════════════════════════════════════════════════════════════════════
{icp_reference}

═══════════════════════════════════════════════════════════════════════════════
DEINE AUFGABE
═══════════════════════════════════════════════════════════════════════════════

Analysiere das Profil und gib zurück:

1. **SCORE (0-100)**
   - 80-100: Hot Lead → Sofort anschreiben
   - 60-79: Warm Lead → Erst warm machen, dann anschreiben
   - 40-59: Lukewarm → Beobachten, Content liefern
   - 20-39: Cold → Nicht priorisieren
   - 0-19: Disqualified → Passt nicht

2. **FIT-GRÜNDE**
   Was spricht FÜR diesen Lead? (max. 3)

3. **BEDENKEN**
   Was spricht GEGEN diesen Lead? (max. 2)

4. **PERSONALISIERUNGS-HOOKS**
   Womit kann man das Gespräch starten? (3 konkrete Punkte)

5. **EMPFOHLENE VORGEHENSWEISE**
   Wie sollte man diesen Lead angehen?

6. **OPENER-STYLE**
   Welcher Stil passt am besten?
   - curiosity: Neugier wecken
   - value_first: Direkt Mehrwert
   - compliment: Echtes Kompliment
   - common_ground: Gemeinsamkeit
   - question: Offene Frage
   - story: Mini-Story

═══════════════════════════════════════════════════════════════════════════════
QUALIFIZIERUNGS-CHECKLISTE
═══════════════════════════════════════════════════════════════════════════════

✅ POSITIVE SIGNALE:
- Bio enthält relevante Keywords
- Aktiv (regelmäßige Posts)
- Engagement mit ähnlichem Content
- Passendes Alter/Demografie
- Hat mit dir interagiert (Story View, Like)
- Mutual Connections
- Zeigt Interesse an Thema

❌ DISQUALIFIZIERER:
- Fake/Bot Account
- Kein echtes Profilbild
- Zu viele Following vs. Follower (Spam-Risiko)
- Offensichtlich unpassende Branche
- Bereits Kunde bei Konkurrenz (sichtbar)
- Negative Signale in Bio

═══════════════════════════════════════════════════════════════════════════════
ANALYSE
═══════════════════════════════════════════════════════════════════════════════
"""

def build_profile_qualifier_prompt(
    profile: LeadProfile,
    icp: IdealCustomerProfile,
) -> str:
    """
    Baut den Profile Qualifier Prompt.
    """
    # ICP Reference
    icp_reference = f"""
Zielgruppe: {icp.demographics.get('description', 'Nicht definiert')}
Keywords: {', '.join(icp.keywords[:5])}
Pain Points: {', '.join(icp.pain_points[:3])}
Disqualifizierer: {', '.join(icp.disqualifiers[:3])}
"""
    
    # Recent Posts
    recent_posts = "\n".join([f"- {post[:100]}..." for post in profile.recent_posts[:5]]) or "Keine Posts sichtbar"
    
    # Engagement Signals
    engagement_signals = "\n".join([f"- {signal}" for signal in profile.engagement_signals]) or "Keine bekannt"
    
    return PROFILE_QUALIFIER_PROMPT.format(
        platform=profile.platform.value,
        username=profile.username,
        bio=profile.bio or "Keine Bio",
        followers=profile.follower_count or "?",
        following=profile.following_count or "?",
        post_count=profile.post_count or "?",
        location=profile.location or "Unbekannt",
        job_title=profile.job_title or "Nicht angegeben",
        recent_posts=recent_posts,
        engagement_signals=engagement_signals,
        icp_reference=icp_reference,
    )


# =============================================================================
# 3. PERSONALIZED OPENER GENERATOR
# =============================================================================

OPENER_GENERATOR_PROMPT = """
[PERSONALIZED OPENER GENERATOR]

Erstelle 3 verschiedene Opener für diesen Lead.

═══════════════════════════════════════════════════════════════════════════════
LEAD-PROFIL
═══════════════════════════════════════════════════════════════════════════════
{lead_profile}

═══════════════════════════════════════════════════════════════════════════════
PERSONALISIERUNGS-HOOKS
═══════════════════════════════════════════════════════════════════════════════
{personalization_hooks}

═══════════════════════════════════════════════════════════════════════════════
DEIN PRODUKT/SERVICE
═══════════════════════════════════════════════════════════════════════════════
{product_context}

═══════════════════════════════════════════════════════════════════════════════
OPENER-REGELN
═══════════════════════════════════════════════════════════════════════════════

**DO:**
✅ Maximal 2-3 Sätze (50-80 Wörter)
✅ Persönlich (Name, spezifische Details)
✅ Echte Neugier zeigen
✅ Offene Frage am Ende
✅ Natürlich klingen (wie ein Freund)
✅ Einen Grund nennen WARUM du schreibst

**DON'T:**
❌ Pitch in der ersten Nachricht
❌ "Hey, ich hab gesehen dass du..."
❌ Copy-Paste Feeling
❌ Zu formell oder zu casual
❌ Mehrere Fragen stellen
❌ Link senden
❌ Emojis übertreiben (max. 1-2)

═══════════════════════════════════════════════════════════════════════════════
OPENER-STYLES (Erstelle je 1)
═══════════════════════════════════════════════════════════════════════════════

### VARIANTE 1: CURIOSITY OPENER
Weckt Neugier ohne zu pitchen.
Beispiel-Struktur:
"Hey [Name]! [Spezifische Beobachtung]. [Neugier-Frage]?"

### VARIANTE 2: VALUE-FIRST OPENER
Liefert direkt einen kleinen Mehrwert.
Beispiel-Struktur:
"Hey [Name]! [Kompliment/Observation]. [Kurzer Tipp/Insight]. Würde mich interessieren: [Frage]?"

### VARIANTE 3: COMMON-GROUND OPENER
Betont Gemeinsamkeiten.
Beispiel-Struktur:
"Hey [Name]! [Gemeinsamkeit]. [Was dich daran interessiert]. [Verbindende Frage]?"

═══════════════════════════════════════════════════════════════════════════════
GENERIERE 3 OPENER
═══════════════════════════════════════════════════════════════════════════════

Für jeden Opener:
1. **Style:** [curiosity/value_first/common_ground]
2. **Hook:** Was fängt die Aufmerksamkeit?
3. **Personalisierung:** Welches Detail macht es persönlich?
4. **Nachricht:** Der komplette Text
5. **CTA:** Welche Antwort erwartest du?
6. **Geschätzte Reply-Rate:** [niedrig/mittel/hoch]
"""

OPENER_EXAMPLES = {
    OpenerStyle.CURIOSITY: [
        "Hey {name}! Bin gerade über dein Profil gestolpert und musste direkt mal fragen – wie lange machst du das mit {topic} schon? Wirkt sehr durchdacht! 🙌",
        "Hey {name}! Dein Post über {topic} hat mich zum Nachdenken gebracht. Wie bist du eigentlich dazu gekommen?",
        "Hey {name}! Spannend was du da aufbaust. Eine Frage: Machst du das Vollzeit oder noch nebenbei?",
    ],
    OpenerStyle.VALUE_FIRST: [
        "Hey {name}! Hab gesehen dass du {topic} machst – coole Sache! Kleiner Tipp von jemandem der das auch macht: {tip}. Was ist aktuell deine größte Challenge dabei?",
        "Hey {name}! Dein Content zu {topic} ist echt stark. Wenn ich dir einen Tipp geben dürfte: {tip}. Hast du das schon mal probiert?",
    ],
    OpenerStyle.COMPLIMENT: [
        "Hey {name}! Respekt für {specific_thing} – das sieht man selten so authentisch. Wie lange bist du schon in dem Bereich unterwegs?",
        "Hey {name}! Muss dir einfach sagen: {specific_compliment}. Wie machst du das?",
    ],
    OpenerStyle.COMMON_GROUND: [
        "Hey {name}! Wir scheinen beide {common_interest} zu haben – wie bist du dazu gekommen?",
        "Hey {name}! Hab gesehen wir kennen beide {mutual_connection} – kleine Welt! Wie kennst du {him/her}?",
        "Hey {name}! Du bist auch in {location}? Coole Sache! Wie lange schon?",
    ],
    OpenerStyle.QUESTION: [
        "Hey {name}! Kurze Frage: {specific_question}? Bin neugierig weil ich gerade selbst {context}.",
        "Hey {name}! Darf ich dich was fragen? {question} Frag weil {reason}.",
    ],
    OpenerStyle.STORY: [
        "Hey {name}! Muss dir kurz was erzählen: {mini_story}. Hat mich an dein {profile_thing} erinnert. Wie ist das bei dir?",
    ],
}


def build_opener_generator_prompt(
    lead_profile: LeadProfile,
    personalization_hooks: List[str],
    product_context: str,
    icp: Optional[IdealCustomerProfile] = None,
) -> str:
    """
    Baut den Opener Generator Prompt.
    """
    # Lead Profile Summary
    lead_summary = f"""
Name: {lead_profile.username}
Plattform: {lead_profile.platform.value}
Bio: {lead_profile.bio or 'Keine'}
Location: {lead_profile.location or 'Unbekannt'}
Job: {lead_profile.job_title or 'Nicht angegeben'}
Follower: {lead_profile.follower_count or '?'}
Engagement: {', '.join(lead_profile.engagement_signals[:3]) or 'Keine Signale'}
"""
    
    # Personalization Hooks
    hooks = "\n".join([f"• {hook}" for hook in personalization_hooks]) or "• Keine spezifischen Hooks gefunden"
    
    return OPENER_GENERATOR_PROMPT.format(
        lead_profile=lead_summary,
        personalization_hooks=hooks,
        product_context=product_context,
    )


# =============================================================================
# 4. WARM-UP SEQUENCE PROMPT
# =============================================================================

WARMUP_SEQUENCE_PROMPT = """
[WARM-UP SEQUENCE GENERATOR]

Erstelle eine Warm-Up Strategie bevor du den Lead anschreibst.

═══════════════════════════════════════════════════════════════════════════════
LEAD-PROFIL
═══════════════════════════════════════════════════════════════════════════════
{lead_profile}
Aktuelle Temperatur: {temperature}

═══════════════════════════════════════════════════════════════════════════════
WARUM WARM-UP?
═══════════════════════════════════════════════════════════════════════════════

Cold DM Reply-Rate: ~5-15%
Warm DM Reply-Rate: ~30-50%

Warm-Up = Der Lead hat dich schon gesehen BEVOR du schreibst.
→ Dein Name ist bekannt
→ Du bist keine Gefahr
→ Es fühlt sich natürlicher an

═══════════════════════════════════════════════════════════════════════════════
WARM-UP STRATEGIE (7-Tage Plan)
═══════════════════════════════════════════════════════════════════════════════

### TAG 1-2: SICHTBAR WERDEN
**Ziel:** Der Lead sieht deinen Namen

Aktionen:
- [ ] Story des Leads anschauen (nicht reagieren, nur Views)
- [ ] 1 Post liken (kein Kommentar)
- [ ] Profil besuchen (sie sehen wer schaut)

### TAG 3-4: ERSTE INTERAKTION
**Ziel:** Erster positiver Touchpoint

Aktionen:
- [ ] Auf Story reagieren (Emoji oder kurze Reaktion)
- [ ] Sinnvollen Kommentar unter Post schreiben
  → NICHT: "Toller Post! 🔥"
  → SONDERN: Inhaltlich eingehen, Frage stellen
- [ ] 2-3 weitere Posts liken

### TAG 5-6: ENGAGEMENT VERTIEFEN
**Ziel:** Name brennt sich ein

Aktionen:
- [ ] Weiteren wertigen Kommentar
- [ ] Auf ihre/seine Kommentare woanders reagieren
- [ ] In gleichen Gruppen/unter gleichen Posts aktiv sein

### TAG 7: DM SENDEN
**Ziel:** Natürliches Gespräch starten

Der Lead hat dich jetzt schon mehrfach gesehen.
→ Deine DM fühlt sich nicht wie Cold Outreach an.
→ "Hey, wir haben ja schon ein paar mal interagiert..."

═══════════════════════════════════════════════════════════════════════════════
PERSONALISIERTE ACTIONS FÜR DIESEN LEAD
═══════════════════════════════════════════════════════════════════════════════

Basierend auf dem Profil, hier konkrete Aktionen:

**Kommentar-Vorschläge:**
{comment_suggestions}

**Story-Reaktionen:**
{story_reactions}

**Gesprächs-Starter nach Warm-Up:**
{conversation_starters}

═══════════════════════════════════════════════════════════════════════════════
TRACKING
═══════════════════════════════════════════════════════════════════════════════

Tracke ob der Lead zurück-interagiert:
- [ ] Hat deine Story angeschaut → SIGNAL 🟢
- [ ] Hat deinen Kommentar geliked → SIGNAL 🟢
- [ ] Hat auf Kommentar geantwortet → SIGNAL 🟢🟢
- [ ] Folgt dir → SIGNAL 🟢🟢🟢

Bei Signalen: Früher anschreiben!
"""

def build_warmup_sequence_prompt(
    lead_profile: LeadProfile,
    temperature: LeadTemperature,
) -> str:
    """
    Baut den Warm-Up Sequence Prompt.
    """
    # Lead Profile Summary
    lead_summary = f"""
Name: {lead_profile.username}
Plattform: {lead_profile.platform.value}
Bio: {lead_profile.bio or 'Keine'}
Recent Posts: {', '.join(lead_profile.recent_posts[:2]) if lead_profile.recent_posts else 'Keine sichtbar'}
"""
    
    # Comment Suggestions (would be generated by AI)
    comment_suggestions = """
- Unter Post zu [Thema]: "Spannender Punkt! Wie bist du darauf gekommen?"
- Unter persönlichem Post: "[Authentische Reaktion auf den Inhalt]"
"""
    
    # Story Reactions
    story_reactions = """
- Bei Erfolg/Meilenstein: 🔥 oder 💪
- Bei Frage/Poll: Antworten!
- Bei persönlichem Moment: ❤️
"""
    
    # Conversation Starters
    conversation_starters = """
- "Hey! Dein Kommentar unter [Post] hat mich zum Nachdenken gebracht..."
- "Wir interagieren ja schon eine Weile – wollte mal Hallo sagen!"
"""
    
    return WARMUP_SEQUENCE_PROMPT.format(
        lead_profile=lead_summary,
        temperature=temperature.value,
        comment_suggestions=comment_suggestions,
        story_reactions=story_reactions,
        conversation_starters=conversation_starters,
    )


# =============================================================================
# 5. ICP WORKSHOP PROMPT
# =============================================================================

ICP_WORKSHOP_PROMPT = """
[IDEAL CUSTOMER PROFILE WORKSHOP]

Lass uns gemeinsam dein Ideal Customer Profile (ICP) erstellen.

═══════════════════════════════════════════════════════════════════════════════
WAS IST EIN ICP?
═══════════════════════════════════════════════════════════════════════════════

Dein ICP ist die EINE Person, die perfekt zu deinem Angebot passt.
→ Nicht "alle zwischen 25-55"
→ Sondern: "Sarah, 32, Mama, arbeitet Teilzeit, will mehr Freiheit"

Je spezifischer, desto besser dein Marketing.

═══════════════════════════════════════════════════════════════════════════════
FRAGEN ZU DEINEM ICP
═══════════════════════════════════════════════════════════════════════════════

### 1. DEMOGRAFIE
Beantworte diese Fragen:

- **Alter:** Welche Altersgruppe?
- **Geschlecht:** Hauptsächlich welches?
- **Familienstand:** Single, verheiratet, Kinder?
- **Beruf:** Was arbeiten sie aktuell?
- **Einkommen:** Welche Einkommensklasse?
- **Location:** Stadt, Land, Region?

### 2. PSYCHOGRAFIE
Wie DENKT dein idealer Kunde?

- **Werte:** Was ist ihnen wichtig? (Familie, Freiheit, Status, Sicherheit...)
- **Ängste:** Wovor haben sie Angst?
- **Träume:** Was wollen sie wirklich?
- **Frustrationen:** Was nervt sie gerade?
- **Identität:** Wie sehen sie sich selbst?

### 3. PAIN POINTS
Welche PROBLEME hat dein idealer Kunde?

- Was hält sie nachts wach?
- Was haben sie schon versucht?
- Warum hat es nicht funktioniert?
- Was kostet das Problem sie? (Zeit, Geld, Energie)

### 4. GOALS & DESIRES
Was WOLLEN sie erreichen?

- Kurzfristig (3 Monate)?
- Mittelfristig (1 Jahr)?
- Langfristig (5 Jahre)?
- Geheimes Verlangen, das sie nicht laut sagen?

### 5. KAUFVERHALTEN
Wie KAUFEN sie?

- Impulskäufer oder Recherchierer?
- Preis-sensitiv oder Qualitäts-orientiert?
- Brauchen sie Social Proof?
- Wer beeinflusst ihre Entscheidung?

### 6. ONLINE-VERHALTEN
Wo SIND sie online?

- Welche Plattformen nutzen sie?
- Wann sind sie aktiv?
- Welchen Accounts folgen sie?
- Welchen Content konsumieren sie?

### 7. KEYWORDS & SPRACHE
Wie SPRECHEN sie?

- Welche Wörter nutzen sie für ihr Problem?
- Welche Hashtags nutzen sie?
- Wie beschreiben sie ihr Ziel?

### 8. DISQUALIFIZIERER
Wer passt NICHT?

- Wer sollte NICHT dein Kunde sein?
- Bei welchen Signalen sagst du NEIN?

═══════════════════════════════════════════════════════════════════════════════
BEISPIEL ICP (Network Marketing)
═══════════════════════════════════════════════════════════════════════════════

**Name:** "Stretched Sarah"
**Alter:** 32
**Situation:** Mama von 2 Kindern, arbeitet Teilzeit im Büro
**Einkommen:** 1.800€ netto, Partner verdient 2.500€
**Problem:** Will mehr Zeit für Familie, aber braucht das Geld
**Traum:** Morgens nicht hetzen, Kinder selbst zur Schule bringen
**Angst:** "Was wenn mein Partner den Job verliert?"
**Online:** Instagram 2h/Tag, Pinterest, Facebook-Gruppen für Mamas
**Keywords:** #momlife #workingmom #sidehustle #familyfirst
**Disqualifizierer:** Männer, unter 25, über 45, Singles, Festangestellte die zufrieden sind

═══════════════════════════════════════════════════════════════════════════════
DEIN ICP
═══════════════════════════════════════════════════════════════════════════════

Beantworte die Fragen oben, und ich helfe dir dein ICP zu strukturieren!

{current_answers}
"""

def build_icp_workshop_prompt(
    current_answers: Optional[Dict[str, Any]] = None,
    industry: Optional[str] = None,
) -> str:
    """
    Baut den ICP Workshop Prompt.
    """
    answers_text = ""
    
    if current_answers:
        answers_text = "\n**Bisherige Antworten:**\n"
        for key, value in current_answers.items():
            answers_text += f"- {key}: {value}\n"
    else:
        answers_text = "\n*Noch keine Antworten. Lass uns starten!*"
    
    return ICP_WORKSHOP_PROMPT.format(
        current_answers=answers_text,
    )


# =============================================================================
# QUICK OPENER TEMPLATES (Ready to Use)
# =============================================================================

QUICK_OPENER_TEMPLATES = {
    "instagram_fitness": [
        {
            "template": "Hey {name}! Deine Transformation ist mega inspirierend 💪 Wie lange bist du schon auf dem Weg?",
            "style": OpenerStyle.COMPLIMENT,
            "use_when": "Lead postet Fitness-Content/Progress",
        },
        {
            "template": "Hey {name}! Quick question: Machst du das noch nebenbei oder schon Vollzeit? Bin neugierig weil ich auch überlege...",
            "style": OpenerStyle.CURIOSITY,
            "use_when": "Lead ist Fitness-Creator/Coach",
        },
    ],
    "instagram_business": [
        {
            "template": "Hey {name}! Hab gesehen du baust was auf – Respekt! Was war der Moment wo du gesagt hast 'Jetzt mach ichs'?",
            "style": OpenerStyle.QUESTION,
            "use_when": "Lead ist Entrepreneur/Side-Hustler",
        },
        {
            "template": "Hey {name}! Wir scheinen beide im gleichen Game zu sein 😄 Wie lange machst du das schon?",
            "style": OpenerStyle.COMMON_GROUND,
            "use_when": "Lead ist in ähnlicher Branche",
        },
    ],
    "linkedin_b2b": [
        {
            "template": "Hi {name}, dein Post zu {topic} hat mich zum Nachdenken gebracht. Besonders der Punkt mit {specific_point} – wie bist du darauf gekommen?",
            "style": OpenerStyle.VALUE_FIRST,
            "use_when": "Lead postet thought leadership Content",
        },
        {
            "template": "Hi {name}, ich sehe wir haben {mutual} als gemeinsamen Kontakt. Kleine Welt! Wie kennst du {him/her}?",
            "style": OpenerStyle.COMMON_GROUND,
            "use_when": "Gemeinsame Kontakte vorhanden",
        },
    ],
    "facebook_mlm": [
        {
            "template": "Hey {name}! Bin gerade auf dein Profil gekommen und muss sagen – du strahlst richtig positive Energie aus! Was machst du beruflich?",
            "style": OpenerStyle.COMPLIMENT,
            "use_when": "Lead hat positives, offenes Profil",
        },
        {
            "template": "Hey {name}! Hab gesehen wir sind in der gleichen Gruppe. Was hat dich dazu gebracht da beizutreten?",
            "style": OpenerStyle.COMMON_GROUND,
            "use_when": "Gleiche Facebook-Gruppe",
        },
    ],
}


# =============================================================================
# INTEGRATION HELPER
# =============================================================================

def get_lead_generation_prompt(
    prompt_type: str,
    **kwargs,
) -> str:
    """
    Haupt-Entry-Point für Lead Generation Prompts.
    
    Args:
        prompt_type: "discovery", "qualify", "opener", "warmup", "icp"
        **kwargs: Prompt-spezifische Parameter
        
    Returns:
        Formatierter Prompt
    """
    if prompt_type == "discovery":
        return build_lead_discovery_prompt(
            icp=kwargs.get("icp"),
            platform=kwargs.get("platform", Platform.INSTAGRAM),
            user_context=kwargs.get("user_context"),
        )
    
    elif prompt_type == "qualify":
        return build_profile_qualifier_prompt(
            profile=kwargs.get("profile"),
            icp=kwargs.get("icp"),
        )
    
    elif prompt_type == "opener":
        return build_opener_generator_prompt(
            lead_profile=kwargs.get("lead_profile"),
            personalization_hooks=kwargs.get("personalization_hooks", []),
            product_context=kwargs.get("product_context", ""),
            icp=kwargs.get("icp"),
        )
    
    elif prompt_type == "warmup":
        return build_warmup_sequence_prompt(
            lead_profile=kwargs.get("lead_profile"),
            temperature=kwargs.get("temperature", LeadTemperature.COLD),
        )
    
    elif prompt_type == "icp":
        return build_icp_workshop_prompt(
            current_answers=kwargs.get("current_answers"),
            industry=kwargs.get("industry"),
        )
    
    else:
        raise ValueError(f"Unknown prompt_type: {prompt_type}")


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Enums
    "Platform",
    "LeadTemperature",
    "OpenerStyle",
    "IndustryVertical",
    # Data Classes
    "IdealCustomerProfile",
    "LeadProfile",
    "QualificationResult",
    "OpenerVariant",
    # Prompts
    "LEAD_DISCOVERY_PROMPT",
    "PROFILE_QUALIFIER_PROMPT",
    "OPENER_GENERATOR_PROMPT",
    "WARMUP_SEQUENCE_PROMPT",
    "ICP_WORKSHOP_PROMPT",
    # Templates
    "QUICK_OPENER_TEMPLATES",
    "OPENER_EXAMPLES",
    "INDUSTRY_HASHTAGS",
    "PLATFORM_SPECIFIC_DISCOVERY",
    # Builders
    "build_lead_discovery_prompt",
    "build_profile_qualifier_prompt",
    "build_opener_generator_prompt",
    "build_warmup_sequence_prompt",
    "build_icp_workshop_prompt",
    "get_lead_generation_prompt",
]

