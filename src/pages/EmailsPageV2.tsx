import { useState, useEffect } from 'react';
import { Mail, Search, RefreshCw, Send, Inbox } from 'lucide-react';
import { ComposeEmailModal } from '@/components/email/ComposeEmailModal';
import api from '@/lib/api';

interface Email {
  gmail_id: string;
  thread_id: string;
  subject: string;
  snippet: string;
  from_email: string;
  from_name: string;
  is_read: boolean;
  is_sent: boolean;
  received_at: string;
  labels: string[];
}

export const EmailsPageV2 = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [filter, setFilter] = useState<'inbox' | 'sent' | 'all'>('inbox');

  useEffect(() => {
    fetchEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      console.log('EmailsPage VERSION: v3 - using api client');
      
      let query = '';
      if (filter === 'inbox') query = 'in:inbox';
      if (filter === 'sent') query = 'in:sent';
      if (searchQuery) query += ` ${searchQuery}`;

      const data = await api.get<Email[] | { emails: Email[] }>(`/emails/?query=${encodeURIComponent(query)}&max_results=50`);
      setEmails(Array.isArray(data) ? data : data.emails || []);
    } catch (error: any) {
      console.error('Error fetching emails:', error);
      if (error.response?.status === 401 || error.response?.status === 400) {
        setEmails([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEmails();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Emails
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={fetchEmails} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
              Neue Email
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilter('inbox')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${filter === 'inbox' ? 'bg-white shadow' : ''}`}
            >
              <Inbox className="w-4 h-4" /> Inbox
            </button>
            <button
              onClick={() => setFilter('sent')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${filter === 'sent' ? 'bg-white shadow' : ''}`}
            >
              <Send className="w-4 h-4" /> Gesendet
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${filter === 'all' ? 'bg-white shadow' : ''}`}
            >
              Alle
            </button>
          </div>

          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Emails durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Mail className="w-12 h-12 mb-2" />
            <p>Keine Emails gefunden</p>
            <p className="text-sm">Verbinde Gmail in den Einstellungen</p>
          </div>
        ) : (
          <div className="divide-y">
            {emails.map((email) => (
              <div
                key={email.gmail_id}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${!email.is_read ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${!email.is_read ? 'bg-blue-500' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium truncate ${!email.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                        {email.from_name || email.from_email}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(email.received_at).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${!email.is_read ? 'font-medium' : ''}`}>{email.subject}</p>
                    <p className="text-sm text-gray-500 truncate">{email.snippet}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCompose && (
        <ComposeEmailModal
          onClose={() => setShowCompose(false)}
          onSent={() => {
            setShowCompose(false);
            fetchEmails();
          }}
        />
      )}
    </div>
  );
};

export default EmailsPageV2;

