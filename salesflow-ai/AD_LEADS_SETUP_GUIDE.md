# 🎯 Ad-basierte Lead-Generierung - Vollständige Setup-Anleitung

## Übersicht

Diese Anleitung erklärt, wie du Leads von Facebook, LinkedIn und Instagram automatisch in SalesFlow empfängst.

| Plattform | Setup-Dauer | Kosten Integration | Werbebudget |
|-----------|-------------|-------------------|-------------|
| **Facebook Lead Ads** | 30-60 Min | **0€** | 5-50€/Tag |
| **Instagram Lead Ads** | 30-60 Min | **0€** | 5-50€/Tag |
| **LinkedIn Lead Gen** | 45-90 Min | **0€** | 10-100€/Tag |
| **Web Forms** | 5 Min | **0€** | 0€ |

---

## 📘 1. Facebook Lead Ads Setup

### Schritt 1: Meta Business Account einrichten

1. Gehe zu [business.facebook.com](https://business.facebook.com)
2. Erstelle einen Business Account (falls nicht vorhanden)
3. Verbinde deine Facebook-Seite

### Schritt 2: Meta App erstellen

1. Gehe zu [developers.facebook.com](https://developers.facebook.com)
2. Klicke auf "Meine Apps" → "App erstellen"
3. Wähle "Business" als App-Typ
4. Name: z.B. "SalesFlow Lead Integration"

### Schritt 3: Webhooks konfigurieren

1. In deiner App → "Produkte hinzufügen" → "Webhooks" → "Einrichten"
2. Wähle "Page" als Objekt
3. Trage ein:
   - **Callback URL**: `https://dein-backend.railway.app/api/webhooks/ads/facebook`
   - **Verify Token**: `salesflow_fb_verify` (oder dein eigenes)
4. Klicke "Überprüfen und speichern"
5. Abonniere das Event: `leadgen`

### Schritt 4: Page Access Token generieren

1. Gehe zu [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Wähle deine App aus
3. Klicke "Generate Access Token"
4. Wähle die Berechtigungen:
   - `pages_read_engagement`
   - `pages_manage_ads`
   - `leads_retrieval`
5. Kopiere den Access Token

### Schritt 5: Environment Variables setzen

```bash
# In Railway/Vercel/Render Dashboard
FACEBOOK_APP_SECRET=dein_app_secret
FACEBOOK_PAGE_ACCESS_TOKEN=dein_page_access_token
FACEBOOK_PAGE_ID=deine_page_id
FACEBOOK_WEBHOOK_VERIFY_TOKEN=salesflow_fb_verify
```

### Schritt 6: Lead Ad erstellen

1. Gehe zum [Meta Ads Manager](https://www.facebook.com/adsmanager)
2. Erstelle eine neue Kampagne
3. Ziel: "Lead-Generierung"
4. Erstelle ein Lead-Formular mit gewünschten Feldern
5. Schalte die Anzeige

### ✅ Fertig! Leads fließen jetzt automatisch in SalesFlow.

---

## 📸 2. Instagram Lead Ads Setup

Instagram nutzt die **gleiche Infrastruktur wie Facebook**!

### Voraussetzungen
- Facebook Business Account
- Instagram Business/Creator Account
- Verbundene Konten

### Setup
1. Verbinde Instagram mit deiner Facebook-Seite (falls nicht geschehen)
2. Nutze die **gleichen Webhooks** wie für Facebook
3. Erstelle Lead Ads im Meta Ads Manager mit Instagram als Platzierung

### Webhook URL
```
https://dein-backend.railway.app/api/webhooks/ads/instagram
```

**Hinweis**: Instagram Lead Ads werden technisch wie Facebook Lead Ads behandelt.

---

## 💼 3. LinkedIn Lead Gen Forms Setup

### Schritt 1: LinkedIn Marketing Solutions Account

1. Gehe zu [linkedin.com/campaignmanager](https://www.linkedin.com/campaignmanager/)
2. Erstelle ein Werbekonto (falls nicht vorhanden)

### Schritt 2: LinkedIn App erstellen

1. Gehe zu [linkedin.com/developers](https://www.linkedin.com/developers/)
2. "Create App" klicken
3. App-Details ausfüllen
4. Produkte hinzufügen:
   - Marketing API
   - Lead Gen Forms API

### Schritt 3: API-Zugang beantragen

1. In der App → "Products" → "Lead Gen Forms API" → "Request Access"
2. Fülle das Formular aus (Business Use Case erklären)
3. Warte auf Genehmigung (kann 1-5 Tage dauern)

### Schritt 4: Access Token generieren

1. In der App → "Auth" Tab
2. OAuth 2.0 Settings konfigurieren
3. Redirect URL: `https://dein-backend.railway.app/api/oauth/linkedin/callback`
4. Generiere Access Token

### Schritt 5: Webhook konfigurieren

1. Im Campaign Manager → Settings → Integrations
2. Webhook URL eintragen:
```
https://dein-backend.railway.app/api/webhooks/ads/linkedin
```

### Schritt 6: Environment Variables

```bash
LINKEDIN_CLIENT_ID=deine_client_id
LINKEDIN_CLIENT_SECRET=dein_client_secret
LINKEDIN_ACCESS_TOKEN=dein_access_token
LINKEDIN_WEBHOOK_SECRET=optional_webhook_secret
```

### Schritt 7: Lead Gen Form erstellen

1. Campaign Manager → Kampagne erstellen
2. Ziel: "Lead-Generierung"
3. Lead Gen Form erstellen
4. Anzeige schalten

---

## 🌐 4. Web Forms Setup (Sofort nutzbar!)

### Option A: Embed-Code auf Website

1. In SalesFlow: Gehe zu "Lead Generation" → "Web Form Generator"
2. Konfiguriere dein Formular (Felder, Design, etc.)
3. Kopiere den generierten HTML-Code
4. Füge ihn auf deiner Website ein

### Option B: Direkte API-Nutzung

```javascript
// JavaScript Beispiel
fetch('https://dein-backend.railway.app/api/webhooks/ads/webform', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Max Mustermann',
    email: 'max@example.com',
    phone: '+49123456789',
    company: 'Muster GmbH',
    utm_source: 'website',
    utm_campaign: 'lead_form'
  })
});
```

### Option C: WordPress Plugin

```html
<!-- In WordPress: HTML-Block hinzufügen -->
<form action="https://dein-backend.railway.app/api/webhooks/ads/webform" method="POST">
  <input type="text" name="name" placeholder="Name" required />
  <input type="email" name="email" placeholder="E-Mail" required />
  <input type="tel" name="phone" placeholder="Telefon" />
  <button type="submit">Absenden</button>
</form>
```

---

## 🔧 Environment Variables Übersicht

```bash
# ═══════════════════════════════════════════════════
# FACEBOOK / INSTAGRAM
# ═══════════════════════════════════════════════════
FACEBOOK_APP_SECRET=xxx
FACEBOOK_PAGE_ACCESS_TOKEN=xxx
FACEBOOK_PAGE_ID=123456789
FACEBOOK_WEBHOOK_VERIFY_TOKEN=salesflow_fb_verify

# ═══════════════════════════════════════════════════
# LINKEDIN
# ═══════════════════════════════════════════════════
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx
LINKEDIN_ACCESS_TOKEN=xxx
LINKEDIN_WEBHOOK_SECRET=xxx

# ═══════════════════════════════════════════════════
# OPTIONAL: TIKTOK (Coming Soon)
# ═══════════════════════════════════════════════════
# TIKTOK_APP_ID=xxx
# TIKTOK_APP_SECRET=xxx
```

---

## 📊 Webhook URLs

| Plattform | Webhook URL |
|-----------|-------------|
| **Facebook** | `/api/webhooks/ads/facebook` |
| **Instagram** | `/api/webhooks/ads/instagram` |
| **LinkedIn** | `/api/webhooks/ads/linkedin` |
| **TikTok** | `/api/webhooks/ads/tiktok` (Coming Soon) |
| **Web Forms** | `/api/webhooks/ads/webform` |
| **Status Check** | `/api/webhooks/ads/status` |

---

## 🔍 Troubleshooting

### Facebook Webhook verifiziert nicht
- Verify Token stimmt nicht überein
- Backend nicht erreichbar (HTTP 200 erforderlich)
- Stelle sicher, dass `/api/webhooks/ads/facebook` erreichbar ist

### Keine Leads kommen an
- Prüfe ob Webhook Event "leadgen" abonniert ist
- Access Token abgelaufen? Erneuern!
- Prüfe Logs: `railway logs` oder Backend-Logs

### LinkedIn API Zugang verweigert
- Lead Gen Forms API Zugang noch nicht genehmigt
- Warte auf LinkedIn Review (1-5 Tage)

### CORS-Fehler bei Web Forms
- Backend CORS-Einstellungen prüfen
- `CORS_ALLOWED_ORIGINS` muss deine Website-Domain enthalten

---

## 📈 Best Practices für Lead Ads

### Facebook/Instagram
- **Formular kurz halten**: Nur Name, E-Mail, Telefon
- **Vorausgefüllte Felder nutzen**: Facebook füllt automatisch aus
- **Starker CTA**: "Jetzt Info anfordern" statt "Absenden"
- **Vertrauens-Elemente**: Datenschutz-Hinweis sichtbar

### LinkedIn
- **Professional Context nutzen**: Job-Titel, Firma automatisch erfassen
- **Höhere Lead-Qualität**: B2B-Targeting sehr präzise
- **Budget höher ansetzen**: LinkedIn ist teurer aber qualitativ besser

### Web Forms
- **Auf Landing Pages**: Eigene Landing Page für höhere Conversion
- **Exit Intent**: Popup beim Verlassen der Seite
- **Mobile-Optimierung**: 60%+ kommen von Handy

---

## 💰 Kosten-Übersicht

### Einmalige Kosten
- **Integration**: 0€ (alles selbst machbar)
- **Meta App**: 0€
- **LinkedIn App**: 0€

### Laufende Kosten
| Posten | Minimum | Empfohlen |
|--------|---------|-----------|
| Facebook Ads | 5€/Tag | 20-50€/Tag |
| Instagram Ads | 5€/Tag | 20-50€/Tag |
| LinkedIn Ads | 10€/Tag | 50-100€/Tag |
| **Gesamt** | **20€/Tag** | **90-200€/Tag** |

### Typische Kosten pro Lead
| Plattform | Cost per Lead |
|-----------|---------------|
| Facebook | 3-15€ |
| Instagram | 5-20€ |
| LinkedIn | 20-80€ |
| Web Forms | 0€ (organisch) |

---

## ✅ Checkliste

### Facebook/Instagram
- [ ] Meta Business Account erstellt
- [ ] Meta App erstellt
- [ ] Webhooks konfiguriert
- [ ] Page Access Token generiert
- [ ] Environment Variables gesetzt
- [ ] Erste Test-Lead-Ad erstellt

### LinkedIn
- [ ] Marketing Solutions Account
- [ ] LinkedIn App erstellt
- [ ] Lead Gen Forms API beantragt
- [ ] Access Token generiert
- [ ] Environment Variables gesetzt
- [ ] Erste Test-Kampagne erstellt

### Web Forms
- [ ] Form Generator genutzt
- [ ] Embed-Code auf Website eingefügt
- [ ] Test-Submission durchgeführt
- [ ] Lead in SalesFlow angekommen

---

## 🎉 Geschafft!

Nach Abschluss dieser Anleitung fließen Leads automatisch von:
- ✅ Facebook Lead Ads
- ✅ Instagram Lead Ads
- ✅ LinkedIn Lead Gen Forms
- ✅ Deinen Web-Formularen

Alle Leads landen direkt in deinem SalesFlow CRM und können sofort bearbeitet werden!

---

## 📞 Support

Bei Fragen oder Problemen:
1. Prüfe die Logs im Backend
2. Teste die Webhook-URL mit dem Status-Endpoint
3. Dokumentation der jeweiligen Plattform lesen

**Webhook Status prüfen:**
```
GET https://dein-backend.railway.app/api/webhooks/ads/status
```

---

*Letzte Aktualisierung: Dezember 2024*

