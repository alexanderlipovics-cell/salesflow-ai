# 🌍 INTERNATIONALIZATION (i18n) SYSTEM

## Overview

Das **Sales Flow AI i18n System** ermöglicht vollständige Mehrsprachigkeit für:
- ✅ UI Translations (Frontend)
- ✅ Email Templates
- ✅ WhatsApp Templates  
- ✅ GPT Prompts (language-aware)
- ✅ Follow-up Messages
- ✅ Database Content

## Supported Languages

| Code | Language | Native Name | Status |
|------|----------|-------------|--------|
| `de` | German | Deutsch | ✅ Default |
| `en` | English | English | ✅ Active |
| `fr` | French | Français | ✅ Active |
| `es` | Spanish | Español | ✅ Active |
| `it` | Italian | Italiano | ✅ Active |
| `nl` | Dutch | Nederlands | ✅ Active |
| `pt` | Portuguese | Português | ✅ Active |
| `pl` | Polish | Polski | ✅ Active |

---

## 🗄️ Database Schema

### Tables

```sql
-- 1. Supported Languages
supported_languages (
  code VARCHAR(5) PRIMARY KEY,
  name TEXT,
  native_name TEXT,
  is_active BOOLEAN,
  is_default BOOLEAN
)

-- 2. UI Translations
translations (
  id UUID PRIMARY KEY,
  key TEXT NOT NULL,              -- 'dashboard.title'
  language VARCHAR(5),
  value TEXT NOT NULL,
  category TEXT                   -- 'ui', 'email', 'system'
)

-- 3. Template Translations
template_translations (
  id UUID PRIMARY KEY,
  template_id UUID,
  language VARCHAR(5),
  name TEXT,
  body_template TEXT NOT NULL,
  subject_template TEXT,
  reminder_template TEXT,
  fallback_template TEXT
)

-- 4. Playbook Translations
playbook_translations (
  id UUID PRIMARY KEY,
  playbook_id TEXT,
  language VARCHAR(5),
  message_template TEXT NOT NULL
)
```

### RPC Functions

```sql
-- Get translation with fallback
get_translation(p_key TEXT, p_language VARCHAR) → TEXT

-- Get template in language
get_template_in_language(p_template_id UUID, p_language VARCHAR) → JSON

-- Get all translations for language
get_translations_for_language(p_language VARCHAR, p_category TEXT) → JSON
```

---

## 🐍 Backend Usage

### Python Service

```python
from app.services.i18n_service import i18n_service

# Get translation
text = await i18n_service.get_translation(
    key='dashboard.title',
    language='en'
)
# → "Dashboard"

# Get user's language
user_lang = await i18n_service.get_user_language(user_id)
# → "de"

# Get template in language
template = await i18n_service.get_template_in_language(
    template_id='uuid-here',
    language='fr'
)
# → { body_template: "...", subject_template: "..." }

# GPT in user's language
system_prompt = await i18n_service.get_gpt_system_prompt_in_language('es')
# → "Eres un asistente de ventas..."
```

### GPT Service

```python
from app.services.gpt_service import gpt_service

# Chat in user's language
response = await gpt_service.chat(
    messages=[{"role": "user", "content": "Help me"}],
    user_id=user_id
)
# GPT responds in user's preferred language

# Translate template
result = await gpt_service.translate_template(
    template_text="Hello {{first_name}}",
    from_language='en',
    to_language='de',
    user_id=user_id
)
# → "Hallo {{first_name}}"
```

---

## 📱 Frontend Usage

### React Native Setup

```typescript
// 1. Import i18n config
import './i18n/config';

// 2. Use in components
import { useTranslation } from 'react-i18next';

export default function MyComponent() {
  const { t, i18n } = useTranslation();
  
  return (
    <View>
      <Text>{t('dashboard.title')}</Text>
      <Text>{t('lead_status.new')}</Text>
      <Text>{t('common.save')}</Text>
    </View>
  );
}
```

### Language Switcher

```typescript
import LanguageSwitcher from '@/components/LanguageSwitcher';

<LanguageSwitcher 
  showLabel={true}
  onLanguageChange={(lang) => console.log(lang)}
/>
```

### Translation Keys

**Common:**
- `common.loading` → "Loading..." / "Lädt..."
- `common.save` → "Save" / "Speichern"
- `common.cancel` → "Cancel" / "Abbrechen"

**Dashboard:**
- `dashboard.title` → "Dashboard"
- `dashboard.leads` → "Leads"
- `dashboard.activities` → "Activities" / "Aktivitäten"

**Leads:**
- `leads.title` → "Leads"
- `leads.new_lead` → "New Lead" / "Neuer Lead"
- `lead_status.new` → "New" / "Neu"
- `lead_status.won` → "Won" / "Gewonnen"

**Follow-ups:**
- `followups.title` → "Follow-ups"
- `followups.send_followup` → "Send Follow-up" / "Follow-up senden"

---

## 🌐 API Endpoints

### Get Supported Languages

```http
GET /api/i18n/languages

Response:
{
  "success": true,
  "languages": [
    { "code": "de", "name": "German", "native_name": "Deutsch" },
    { "code": "en", "name": "English", "native_name": "English" }
  ]
}
```

### Get Translations

```http
GET /api/i18n/translations/en?category=ui

Response:
{
  "success": true,
  "language": "en",
  "translations": {
    "dashboard.title": "Dashboard",
    "leads.title": "Leads",
    ...
  }
}
```

### Update User Language

```http
POST /api/i18n/users/language
{
  "language": "en"
}

Response:
{
  "success": true,
  "language": "en"
}
```

### Get Template in Language

```http
GET /api/i18n/template/{template_id}/en

Response:
{
  "success": true,
  "template": {
    "body_template": "Hey {{first_name}}, how are you doing?",
    "subject_template": "Follow-up",
    "reminder_template": "...",
    "language": "en"
  }
}
```

### Translate Text (GPT)

```http
POST /api/i18n/translate
{
  "text": "Hello {{first_name}}",
  "from_language": "en",
  "to_language": "de"
}

Response:
{
  "success": true,
  "translated_text": "Hallo {{first_name}}",
  "tokens_used": 15
}
```

---

## 🔄 Workflow Examples

### 1. User Changes Language

```yaml
FRONTEND:
  1. User clicks Language Switcher
  2. Selects "English"
  3. i18n.changeLanguage('en')
  4. POST /api/i18n/users/language { language: 'en' }

BACKEND:
  1. UPDATE users SET language = 'en' WHERE id = user_id
  2. Return { success: true }

RESULT:
  ✅ All UI text now in English
  ✅ GPT responds in English
  ✅ Follow-ups sent in English
  ✅ Email templates in English
```

### 2. Automatic Follow-up (Language-Aware)

```yaml
CRON JOB:
  1. Find leads needing follow-up
  2. Get user.language = 'fr'
  3. Load template in French
  4. Render: "Salut {{first_name}}..."
  5. Send via WhatsApp
  
RESULT:
  ✅ Follow-up sent in French
  ✅ Respects user's language preference
```

### 3. GPT Coaching in User's Language

```yaml
USER ASKS:
  "Give me tips for this lead"

BACKEND:
  1. Load user.language = 'es'
  2. System Prompt: "Eres un asistente de ventas..."
  3. GPT generates response in Spanish
  
RESULT:
  ✅ Coaching tips in Spanish
  ✅ Natural language interaction
```

---

## 🎯 Adding New Language

### 1. Database

```sql
INSERT INTO supported_languages (code, name, native_name) VALUES
('ru', 'Russian', 'Русский');
```

### 2. Frontend Translations

Create `sales-flow-ai/i18n/locales/ru.json`:

```json
{
  "dashboard": {
    "title": "Панель управления",
    "leads": "Лиды"
  },
  ...
}
```

Update `sales-flow-ai/i18n/config.ts`:

```typescript
import ru from './locales/ru.json';

const resources = {
  de: { translation: de },
  en: { translation: en },
  ru: { translation: ru }  // Add here
};
```

### 3. GPT System Prompt

Update `backend/app/services/i18n_service.py`:

```python
async def get_gpt_system_prompt_in_language(self, language: str) -> str:
    prompts = {
        'de': "Du bist...",
        'en': "You are...",
        'ru': "Ты являешься..."  # Add here
    }
```

### 4. Template Translations

```sql
INSERT INTO template_translations (template_id, language, body_template) VALUES
('uuid-here', 'ru', 'Привет {{first_name}}...');
```

---

## 🧪 Testing

### Manual Test

```bash
# 1. Change user language
curl -X POST http://localhost:8000/api/i18n/users/language \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}'

# 2. Get translations
curl http://localhost:8000/api/i18n/translations/en

# 3. Test template
curl http://localhost:8000/api/i18n/template/{template_id}/en
```

### Frontend Test

```typescript
// In React Native:
import { useTranslation } from 'react-i18next';

const { t, i18n } = useTranslation();

// Test keys
console.log(t('dashboard.title'));        // Dashboard
console.log(t('lead_status.new'));        // New

// Change language
i18n.changeLanguage('de');

console.log(t('dashboard.title'));        // Dashboard
console.log(t('lead_status.new'));        // Neu
```

---

## 🚀 Deployment

### 1. Run Migration

```bash
psql $DATABASE_URL < backend/database/i18n_migration.sql
```

### 2. Verify Tables

```sql
SELECT COUNT(*) FROM supported_languages;
-- Should be 8

SELECT COUNT(*) FROM translations WHERE language = 'de';
-- Should be 50+
```

### 3. Update Backend

```bash
pip install --break-system-packages
# i18n_service, gpt_service already installed
```

### 4. Update Frontend

```bash
cd sales-flow-ai
npm install i18next react-i18next expo-localization
```

---

## 📊 Performance

- **Translation Cache**: 5 minute TTL
- **Database Queries**: < 10ms avg
- **GPT Translation**: ~2-3 seconds
- **Language Switch**: < 100ms

---

## 🔒 Security

- ✅ RLS Policies on all tables
- ✅ SECURITY DEFINER on functions
- ✅ Input validation (Pydantic)
- ✅ SQL injection prevention
- ✅ Auth required for updates

---

## 📝 Translation Guidelines

### Keys Format

```
category.subcategory.item
```

Examples:
- `dashboard.title`
- `lead_status.new`
- `common.save`
- `validation.required`

### Variables

Use `{{variable}}` syntax:

```json
{
  "greeting": "Hello {{first_name}}!",
  "stats": "You have {{count}} leads"
}
```

### Pluralization

```json
{
  "leads_count": "{{count}} Lead",
  "leads_count_plural": "{{count}} Leads"
}
```

---

## 🐛 Troubleshooting

### Translation Missing

```typescript
// Returns key if translation not found
t('nonexistent.key')  // → "nonexistent.key"
```

### Fallback Order

```
1. Requested Language (e.g., 'fr')
2. Default Language ('de')
3. Key itself
```

### Backend Language Not Updating

Check:
1. User authenticated?
2. Valid language code?
3. Database connection?

```python
# Debug
user_lang = await i18n_service.get_user_language(user_id)
print(f"User language: {user_lang}")
```

---

## 🎉 Success!

Your Sales Flow AI app now speaks **8 languages**! 🌍

- ✅ UI automatically translates
- ✅ GPT responds in user's language
- ✅ Follow-ups sent in correct language
- ✅ Templates available in multiple languages
- ✅ Easy to add more languages

**Ready for global expansion!** 🚀

