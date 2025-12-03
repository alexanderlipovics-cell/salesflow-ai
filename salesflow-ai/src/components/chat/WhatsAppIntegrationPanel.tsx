import React, { useState, useEffect } from 'react';

interface WhatsAppStatus {
  provider: string;
  configured: boolean;
  ready: boolean;
}

interface WhatsAppIntegrationPanelProps {
  leadPhone?: string;
  onSendWhatsApp: (message: string) => void;
}

export default function WhatsAppIntegrationPanel({ 
  leadPhone, 
  onSendWhatsApp 
}: WhatsAppIntegrationPanelProps) {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadWhatsAppStatus();
  }, []);

  const loadWhatsAppStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error loading WhatsApp status:', error);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !leadPhone) return;

    setSending(true);
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: leadPhone,
          message: message
        })
      });

      const result = await response.json();
      
      if (result.success) {
        onSendWhatsApp(message);
        setMessage('');
      } else {
        alert('Fehler beim Senden: ' + result.error);
      }
    } catch (error) {
      alert('Fehler beim Senden der WhatsApp-Nachricht');
    } finally {
      setSending(false);
    }
  };

  if (!status) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">📱 WhatsApp</h3>
        <span className={`
          px-3 py-1 rounded-full text-xs font-semibold
          ${status.ready 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
          }
        `}>
          {status.ready ? '✅ Verbunden' : '❌ Nicht konfiguriert'}
        </span>
      </div>

      {status.ready ? (
        <>
          <div className="mb-3">
            <p className="text-sm text-gray-600 mb-1">Provider: <strong>{status.provider}</strong></p>
            {leadPhone && (
              <p className="text-sm text-gray-600">An: <strong>{leadPhone}</strong></p>
            )}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="WhatsApp Nachricht schreiben..."
            className="
              w-full p-3 border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-green-500 focus:border-transparent
              resize-none
            "
            rows={4}
            disabled={!leadPhone}
          />

          <button
            onClick={handleSend}
            disabled={sending || !message.trim() || !leadPhone}
            className="
              w-full mt-3 py-3 px-4
              bg-green-500 hover:bg-green-600
              text-white font-semibold rounded-lg
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            {sending ? '📤 Sende...' : '✅ Über WhatsApp senden'}
          </button>
        </>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ WhatsApp Integration ist nicht konfiguriert.
            Bitte füge die Umgebungsvariablen hinzu:
          </p>
          <ul className="text-xs text-yellow-700 mt-2 space-y-1">
            <li>• WHATSAPP_PROVIDER</li>
            <li>• ULTRAMSG_INSTANCE_ID + ULTRAMSG_TOKEN</li>
            <li>• oder DIALOG360_API_KEY</li>
            <li>• oder TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN</li>
          </ul>
        </div>
      )}
    </div>
  );
}

