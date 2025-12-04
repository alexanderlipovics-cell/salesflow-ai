# 🔗 Frontend-Backend Verbindung - CSV Import

## ✅ Verbindung hergestellt

### 1. Access Token Handling
- ✅ **Supabase Session Token** wird korrekt geladen
- ✅ Token wird in `useEffect` geholt wenn User eingeloggt ist
- ✅ Token wird in API-Requests verwendet

### 2. API URLs korrigiert
- ✅ **Preview Endpoint**: `/api/v1/mlm-import/preview`
- ✅ **Execute Endpoint**: `/api/v1/mlm-import/execute`
- ✅ Base URL wird korrekt aus `API_CONFIG` verwendet

### 3. FormData Handling
- ✅ **Kein Content-Type Header** für FormData (Browser setzt automatisch)
- ✅ File wird korrekt als FormData übergeben
- ✅ Alle Parameter werden korrekt angehängt

### 4. Error Handling
- ✅ Fehler werden korrekt abgefangen
- ✅ Toast-Nachrichten für User-Feedback
- ✅ Loading States werden korrekt verwaltet

## 📋 API Endpoints

### Preview
```
POST /api/v1/mlm-import/preview
Headers:
  Authorization: Bearer <token>
Body (FormData):
  file: <CSV File>
  mlm_company: <company_id>
```

### Execute
```
POST /api/v1/mlm-import/execute
Headers:
  Authorization: Bearer <token>
Body (FormData):
  file: <CSV File>
  mlm_company: <company_id>
  field_mapping: <JSON string>
  skip_duplicates: <boolean string>
  sync_mode: <"once" | "weekly">
```

## 🔧 Technische Details

### Access Token
```typescript
// Token wird aus Supabase Session geholt
const { data: { session } } = await supabase.auth.getSession();
const accessToken = session?.access_token;
```

### API URL Konstruktion
```typescript
// baseUrl enthält bereits /api/v1, also ersetzen wir es
const apiUrl = `${API_CONFIG.baseUrl.replace('/api/v1', '')}/api/v1/mlm-import/preview`;
```

### FormData
```typescript
const formData = new FormData();
formData.append('file', {
  uri: file.uri,
  name: file.name,
  type: 'text/csv',
});
formData.append('mlm_company', selectedCompany);
```

## ✅ Status

- ✅ Access Token korrekt geladen
- ✅ API URLs korrekt konstruiert
- ✅ FormData korrekt erstellt
- ✅ Headers korrekt gesetzt
- ✅ Error Handling implementiert
- ✅ Loading States verwaltet

Die Frontend-Backend Verbindung ist vollständig hergestellt!

