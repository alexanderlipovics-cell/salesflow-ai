import React, { useState, useEffect } from 'react';
import { MessageCircle, Phone, Mail, Calendar, FileText, Plus, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Interaction {
  id: string;
  interaction_type: string;
  channel?: string;
  notes?: string;
  raw_notes?: string;
  interaction_at: string;
  created_at: string;
}

interface LeadHistoryProps {
  leadId: string;
}

export function LeadHistory({ leadId }: LeadHistoryProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (leadId) loadHistory();
  }, [leadId]);

  const loadHistory = async () => {
    try {
      const response = await api.get(`/api/leads/${leadId}/interactions`);
      setInteractions(response.data || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);

    try {
      await api.post(`/api/leads/${leadId}/interactions`, {
        interaction_type: 'note',
        notes: newNote.trim(),
        interaction_at: new Date().toISOString()
      });
      toast.success('Notiz hinzugefügt');
      setNewNote('');
      setShowAddNote(false);
      loadHistory();
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const getIcon = (type: string) => {
    const icons: Record<string, any> = {
      call: Phone,
      email: Mail,
      email_sent: Mail,
      message: MessageCircle,
      message_sent: MessageCircle,
      message_prepared: MessageCircle,
      whatsapp_sent: MessageCircle,
      meeting: Calendar,
      note: FileText
    };
    const Icon = icons[type] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getLabel = (type: string) => {
    const labels: Record<string, string> = {
      call: 'Anruf',
      email: 'Email',
      email_sent: 'Email gesendet',
      message_sent: 'Nachricht gesendet',
      message_prepared: 'Nachricht vorbereitet',
      whatsapp_sent: 'WhatsApp gesendet',
      meeting: 'Meeting',
      note: 'Notiz'
    };
    return labels[type] || type;
  };

  const getColor = (type: string) => {
    const colors: Record<string, string> = {
      call: 'bg-purple-100 text-purple-600',
      email: 'bg-blue-100 text-blue-600',
      email_sent: 'bg-blue-100 text-blue-600',
      message_sent: 'bg-green-100 text-green-600',
      whatsapp_sent: 'bg-green-100 text-green-600',
      meeting: 'bg-yellow-100 text-yellow-600',
      note: 'bg-gray-100 text-gray-600'
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  if (loading) return <div className="p-4 text-center text-gray-500">Laden...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Historie & Notizen
        </h3>
        <button
          onClick={() => setShowAddNote(!showAddNote)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Notiz
        </button>
      </div>

      {/* Add Note Form */}
      {showAddNote && (
        <div className="p-3 bg-gray-50 rounded-lg space-y-2 border">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Notiz hinzufügen..."
            className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={addNote}
              disabled={saving || !newNote.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
            <button
              onClick={() => { setShowAddNote(false); setNewNote(''); }}
              className="px-3 py-1.5 bg-gray-200 rounded-lg text-sm hover:bg-gray-300 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {interactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Keine Einträge vorhanden</p>
          <p className="text-sm">Füge die erste Notiz hinzu</p>
        </div>
      ) : (
        <div className="space-y-2">
          {interactions.map((interaction) => (
            <div
              key={interaction.id}
              className="flex gap-3 p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getColor(interaction.interaction_type)}`}>
                {getIcon(interaction.interaction_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-900">
                    {getLabel(interaction.interaction_type)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(parseISO(interaction.interaction_at || interaction.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </span>
                </div>
                {(interaction.notes || interaction.raw_notes) && (
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                    {interaction.notes || interaction.raw_notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
