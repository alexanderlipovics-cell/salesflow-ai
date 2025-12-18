import React, { useState } from 'react';
import { Phone, MessageSquare, CheckCircle, AlertTriangle, Flame, Clock, MoreVertical } from 'lucide-react';
import { Button } from '../ui/button';
import WhatsAppButton from '../WhatsAppButton';

interface TodayLead {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  status: string;
  score?: number;
  last_contact?: string;
  next_follow_up?: string;
  reason: string;
  reason_text: string;
  priority: number;
}

interface TodayLeadItemProps {
  lead: TodayLead;
  onClick: () => void;
  onMarkContacted: (leadId: string, notes?: string) => void;
}

const TodayLeadItem: React.FC<TodayLeadItemProps> = ({ lead, onClick, onMarkContacted }) => {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [isMarking, setIsMarking] = useState(false);

  const getReasonIcon = () => {
    switch (lead.reason) {
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'hot':
        return <Flame className="w-4 h-4 text-orange-500" />;
      case 'today':
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getReasonColor = () => {
    switch (lead.reason) {
      case 'overdue':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'hot':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'today':
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastContact = (lastContact?: string) => {
    if (!lastContact) return 'Noch nie kontaktiert';

    try {
      const date = new Date(lastContact);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) return 'Gestern';
      if (diffDays < 7) return `Vor ${diffDays} Tagen`;
      if (diffDays < 30) return `Vor ${Math.floor(diffDays / 7)} Wochen`;
      return date.toLocaleDateString('de-DE');
    } catch {
      return 'Unbekannt';
    }
  };

  const handleMarkContacted = async () => {
    setIsMarking(true);
    try {
      await onMarkContacted(lead.id, notes.trim() || undefined);
      setShowNotes(false);
      setNotes('');
    } catch (error) {
      console.error('Error marking lead contacted:', error);
    } finally {
      setIsMarking(false);
    }
  };

  const handleCallClick = () => {
    if (lead.phone) {
      window.location.href = `tel:${lead.phone}`;
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {getInitials(lead.name)}
          </div>

          {/* Lead Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {lead.name}
              </h3>
              {lead.score && (
                <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                  {lead.score}
                </span>
              )}
            </div>

            {lead.company && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-1">
                {lead.company}
              </p>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
              {formatLastContact(lead.last_contact)}
            </p>

            {/* Reason Badge */}
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getReasonColor()}`}>
              {getReasonIcon()}
              {lead.reason_text}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 ml-4">
          {lead.phone && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCallClick();
                }}
                className="p-2"
                title="Anrufen"
              >
                <Phone className="w-4 h-4" />
              </Button>

              <WhatsAppButton
                phone={lead.phone}
                message={`Hallo ${lead.name}, wie geht es Ihnen?`}
                variant="icon"
                className="p-2"
              />
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setShowNotes(!showNotes);
            }}
            className="p-2"
            title="Als kontaktiert markieren"
          >
            <CheckCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mark Contacted Section */}
      {showNotes && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notizen (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Kurze Notiz zum Gespräch..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={2}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotes(false);
                  setNotes('');
                }}
                disabled={isMarking}
              >
                Abbrechen
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkContacted();
                }}
                disabled={isMarking}
                className="bg-green-600 hover:bg-green-700"
              >
                {isMarking ? 'Speichere...' : 'Als kontaktiert markieren'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayLeadItem;
