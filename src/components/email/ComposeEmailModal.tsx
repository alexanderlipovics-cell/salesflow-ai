import { useState } from 'react';
import { X, Send, Paperclip } from 'lucide-react';

interface ComposeEmailModalProps {
  onClose: () => void;
  onSent: () => void;
  replyTo?: {
    to: string;
    subject: string;
    thread_id?: string;
  };
  leadId?: string;
}

export const ComposeEmailModal = ({
  onClose,
  onSent,
  replyTo,
  leadId,
}: ComposeEmailModalProps) => {
  const [to, setTo] = useState(replyTo?.to || '');
  const [subject, setSubject] = useState(replyTo?.subject ? `Re: ${replyTo.subject}` : '');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'https://salesflow-ai.onrender.com';

  const handleSend = async () => {
    if (!to || !subject || !body) {
      alert('Bitte alle Felder ausfüllen');
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/emails/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          body,
          lead_id: leadId,
          thread_id: replyTo?.thread_id,
        }),
      });

      if (!response.ok) throw new Error('Failed to send email');

      onSent();
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Fehler beim Senden der Email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Neue Email</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 flex-1 overflow-auto">
          <div>
            <label className="block text-sm text-gray-600 mb-1">An</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="email@beispiel.de"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Betreff</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Betreff eingeben..."
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Nachricht</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Deine Nachricht..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Paperclip className="w-4 h-4" />
            Anhang
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              Abbrechen
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Senden...' : 'Senden'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComposeEmailModal;

