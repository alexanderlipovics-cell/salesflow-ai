# ⚡ Backend Quick Start

## 🚀 In 3 Schritten loslegen:

### 1️⃣ Terminal öffnen & zum Backend navigieren

```bash
cd backend
```

### 2️⃣ Dependencies installieren

```bash
pip install -r requirements.txt
```

### 3️⃣ Server starten

```bash
uvicorn app.main:app --reload
```

**Das wars!** 🎉 Server läuft auf: http://localhost:8000

---

## 📱 Testen

### Browser öffnen:
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000

### Mit curl testen:
```bash
curl http://localhost:8000
```

### Chat Endpoint testen:
```bash
curl -X POST http://localhost:8000/api/chat/completion \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Wie handle ich den Einwand: Zu teuer?"}
    ]
  }'
```

---

## 🔑 OpenAI API Key hinzufügen (Optional)

Erstelle eine `.env` Datei im `backend` Ordner:

```env
OPENAI_API_KEY=sk-your-key-here
```

**Ohne API Key:** Server läuft im **Demo-Modus** mit intelligenten Mock-Antworten! ✅

---

## ❌ Troubleshooting

### "uvicorn: command not found"
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Port 8000 bereits belegt
```bash
uvicorn app.main:app --reload --port 8001
```

### Import Fehler
```bash
# Stelle sicher, dass du im backend Ordner bist
cd backend
python -m uvicorn app.main:app --reload
```

---

## 🛑 Server stoppen

**Windows/Mac/Linux:** `Ctrl + C` im Terminal

---

**Ready to go!** 💪 Frontend kann jetzt auf http://localhost:8000 zugreifen.

