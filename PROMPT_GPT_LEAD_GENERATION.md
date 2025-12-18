# 🚀 PROMPT FÜR GPT: LEAD-GENERIERUNG SYSTEM

## 🎯 AUFGABE: Vollständiges Lead-Generierung System implementieren

### WAS DU BAUEN SOLLST:

#### 1. Facebook Lead Ads Webhook (1-2 Tage Setup)
- **Backend**: `/backend/app/routers/facebook_webhook.py`
- **Features**:
  - Webhook Endpoint für Facebook Lead Ads
  - Lead-Daten validieren und parsen
  - Automatische Lead-Erstellung in `leads` Tabelle
  - Duplicate-Checking (E-Mail/Phone)
  - Lead-Scoring basierend auf Form-Daten
  - Error Handling & Logging

#### 2. LinkedIn Lead Gen Forms Webhook
- **Backend**: `/backend/app/routers/linkedin_webhook.py`
- **Features**:
  - LinkedIn Lead Gen Forms Integration
  - OAuth2 Flow für LinkedIn API
  - Form-Submission Handling
  - Lead-Qualifikation (ICP Matching)
  - Enrichment mit LinkedIn Daten

#### 3. Instagram DM Webhook (Meta App Review nötig)
- **Backend**: `/backend/app/routers/instagram_webhook.py`
- **Features**:
  - Instagram Business API Integration
  - DM-Monitoring für Keywords/Hashtags
  - Automated Responses
  - Lead-Capture aus Conversations
  - Sentiment Analysis für Intent Detection

#### 4. Lead Processing Pipeline
- **Backend**: `/backend/app/services/lead_processing_service.py`
- **Features**:
  - Lead Enrichment (Company, Industry, Job Title)
  - Scoring Algorithm (P-Score, I-Score, E-Score)
  - Duplicate Detection & Merging
  - Auto-Assignment zu User/Team
  - Notification System

#### 5. Webhook Security & Validation
- **Backend**: `/backend/app/services/webhook_security.py`
- **Features**:
  - HMAC Signature Verification
  - Rate Limiting
  - IP Whitelisting
  - Request Validation
  - Error Response Handling

### TECHNISCHE ANFORDERUNGEN:

#### Datenbank-Tabellen (bereits vorhanden):
- `leads` - Basis Lead-Daten
- `lead_verifications` - Phone/Email Validation
- `lead_intents` - Intent Scoring & Activity
- `lead_enrichments` - Company Data & ICP Matching

#### API Integration:
- Facebook Marketing API
- LinkedIn Marketing API
- Instagram Basic Display API
- Supabase für Datenpersistenz

#### Security:
- JWT Token Validation
- API Key Management
- Webhook Signature Verification
- Rate Limiting (100 req/min pro IP)

### ERFOLGSKRITERIEN:
- ✅ Alle 3 Webhooks funktionieren
- ✅ Leads werden korrekt in DB gespeichert
- ✅ Duplicate Detection arbeitet
- ✅ Lead Scoring läuft automatisch
- ✅ Error Handling robust
- ✅ Logging für Debugging

### ZEIT: 2-3 Tage konzentrierte Arbeit

---

**Starte mit Facebook Webhook, dann LinkedIn, dann Instagram. Gib mir den Code in strukturierten Chunks zurück!**
