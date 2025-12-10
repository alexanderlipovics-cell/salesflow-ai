import { useState, useEffect } from 'react';
import { Mail, ChevronDown, ChevronUp } from 'lucide-react';

interface LeadEmailsProps {
  leadId: string;
  leadEmail?: string | null;
}

export const LeadEmails = ({ leadId, leadEmail }: LeadEmailsProps) => {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'https://salesflow-ai.onrender.com';

  useEffect(() => {
    if (expanded && emails.length === 0) {
      void fetchEmails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/emails/lead/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setEmails(data.emails || []);
    } catch (error) {
      console.error('Error fetching lead emails:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!leadEmail) return null;

  return (
    <div className="border rounded-lg mt-4 border-white/10 bg-white/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/10"
      >
        <div className="flex items-center gap-2 text-white">
          <Mail className="w-4 h-4 text-gray-300" />
          <span className="font-medium">Email-Verlauf</span>
          {emails.length > 0 && (
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-200">{emails.length}</span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-200" /> : <ChevronDown className="w-4 h-4 text-gray-200" />}
      </button>

      {expanded && (
        <div className="border-t border-white/10">
          {loading ? (
            <div className="p-4 text-center text-gray-400">Lade Emails...</div>
          ) : emails.length === 0 ? (
            <div className="p-4 text-center text-gray-400">Keine Emails mit diesem Kontakt</div>
          ) : (
            <div className="divide-y divide-white/10 max-h-64 overflow-auto">
              {emails.map((email) => (
                <div key={email.gmail_id} className="p-3 hover:bg-white/10">
                  <div className="flex justify-between text-sm text-white">
                    <span className="font-medium">{email.subject}</span>
                    <span className="text-gray-400">
                      {email.received_at ? new Date(email.received_at).toLocaleDateString('de-DE') : ''}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 truncate">{email.snippet}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeadEmails;

