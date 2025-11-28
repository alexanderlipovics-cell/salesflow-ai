# salesflow-ai
KI-gestütztes Vertriebs-CRM

## KI-Cloud-Bridge Test

Manueller Test der Netlify Function mit Lead-Kontext:

```
curl -X POST https://<netlify-url>/.netlify/functions/ai \
  -H "Content-Type: application/json" \
  -d '{"message":"Schreib mir ein Follow-up","leadId":"<lead_id>","userId":"<user_id>"}'
```

Optional kannst du statt `leadId` auch `leadName` mitsenden. Die Response enthält stets `reply` und `leadContext`.
