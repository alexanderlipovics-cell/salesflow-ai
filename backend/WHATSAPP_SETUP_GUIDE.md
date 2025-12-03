# 📱 WhatsApp Integration Setup Guide

Sales Flow AI unterstützt **3 WhatsApp-Provider**. Wähle einen aus:

---

## ✅ OPTION 1: UltraMsg (Empfohlen für Schnellstart)

**Vorteile:** Einfachste Einrichtung, günstig, sofort einsatzbereit

### Setup:
1. Gehe zu [ultramsg.com](https://ultramsg.com/)
2. Registriere dich und erstelle eine Instanz
3. Scanne QR-Code mit WhatsApp
4. Kopiere Instance ID + Token

### .env Konfiguration:
```bash
WHATSAPP_PROVIDER=ultramsg
ULTRAMSG_INSTANCE_ID=instance12345
ULTRAMSG_TOKEN=your_ultramsg_token
```

### Test:
```bash
curl -X POST http://localhost:8000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+491234567890",
    "message": "Test von Sales Flow AI"
  }'
```

---

## ✅ OPTION 2: 360dialog (Business API)

**Vorteile:** Offizielles WhatsApp Business API, Templates, bessere Zustellbarkeit

### Setup:
1. Gehe zu [360dialog.com](https://www.360dialog.com/)
2. Erstelle einen Partner-Account
3. Verifiziere dein Business bei Meta
4. Erhalte API Key

### .env Konfiguration:
```bash
WHATSAPP_PROVIDER=360dialog
DIALOG360_API_KEY=your_360dialog_api_key
```

### Test Template Message:
```bash
curl -X POST http://localhost:8000/api/whatsapp/send-template \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+491234567890",
    "template_name": "hello_world",
    "language": "de",
    "variables": ["Max"]
  }'
```

---

## ✅ OPTION 3: Twilio (Enterprise)

**Vorteile:** Bekannter Enterprise-Anbieter, Multi-Channel (SMS + WhatsApp)

### Setup:
1. Gehe zu [twilio.com](https://www.twilio.com/)
2. Erstelle einen Account
3. Aktiviere WhatsApp Sandbox oder beantrage Business-Zugang
4. Kopiere Account SID + Auth Token

### .env Konfiguration:
```bash
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### Test:
```bash
curl -X POST http://localhost:8000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "whatsapp:+491234567890",
    "message": "Test von Sales Flow AI"
  }'
```

---

## 🔍 Status Check

Prüfe, ob WhatsApp konfiguriert ist:

```bash
curl http://localhost:8000/api/whatsapp/status
```

Erwartete Response:
```json
{
  "provider": "ultramsg",
  "configured": true,
  "ready": true
}
```

---

## 📚 API Endpoints

### 1. Send WhatsApp Message
```
POST /api/whatsapp/send
Body: {
  "to": "+491234567890",
  "message": "Hallo Anna, ..."
}
```

### 2. Send Template (nur 360dialog)
```
POST /api/whatsapp/send-template
Body: {
  "to": "+491234567890",
  "template_name": "demo_invitation",
  "language": "de",
  "variables": ["Max", "15:00", "Zoom"]
}
```

### 3. Get Status
```
GET /api/whatsapp/status
```

---

## 🚨 Troubleshooting

### Error: "WhatsApp credentials not configured"
→ Füge die entsprechenden Umgebungsvariablen in `.env` hinzu

### Error: "Invalid phone number"
→ Verwende internationales Format: `+491234567890` (mit `+` und Ländercode)

### Error: "Template not found" (360dialog)
→ Template muss vorher bei Meta/WhatsApp registriert werden

### Error: "Twilio authentication failed"
→ Prüfe Account SID und Auth Token

---

## 🎯 Next Steps

- ✅ GPT Function Calls können jetzt WhatsApp automatisch nutzen
- ✅ AI Prompts können Output direkt per WhatsApp senden
- ✅ Interactive Chat bietet WhatsApp als Auswahl-Option

**WhatsApp ist jetzt vollständig in Sales Flow AI integriert!** 🚀

