import React from 'react';
import { Mail, Phone, Calendar, Clock, AlertTriangle, UserPlus } from 'lucide-react';
import LeadQuickActions from './LeadQuickActions';
import WhatsAppButton from '../WhatsAppButton';

interface Lead {
  id: string;
  name: string;
  company?: string;
  status: string;
  score?: number;
  last_contact?: string;
  next_follow_up?: string;
  email?: string;
  phone?: string;
}

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  onConvertClick?: (lead: Lead) => void;
  showConvert?: boolean;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick, onConvertClick, showConvert }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'hot':
      case 'won':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'warm':
      case 'proposal':
      case 'negotiation':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cold':
      case 'new':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'lost':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isOverdue = () => {
    if (!lead.next_follow_up) return false;
    const followUpDate = new Date(lead.next_follow_up);
    const today = new Date();
    return followUpDate < today;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
            {getInitials(lead.name)}
          </div>

          {/* Name & Company */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
              {lead.name}
            </h3>
            {lead.company && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {lead.company}
              </p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
          {lead.status}
        </div>
      </div>

      {/* Score */}
      {lead.score && (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Score:</span>
            <span className={`font-bold text-lg ${getScoreColor(lead.score)}`}>
              {lead.score}
            </span>
          </div>
        </div>
      )}

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        {lead.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Mail className="w-4 h-4" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Phone className="w-4 h-4" />
            <span>{lead.phone}</span>
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="space-y-2 mb-6">
        {lead.last_contact && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>Zuletzt: {formatDate(lead.last_contact)}</span>
          </div>
        )}
        {lead.next_follow_up && (
          <div className={`flex items-center gap-2 text-sm ${isOverdue() ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
            {isOverdue() ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            <span>Nächster Kontakt: {formatDate(lead.next_follow_up)}</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <LeadQuickActions
        leadId={lead.id}
        leadName={lead.name}
        email={lead.email}
        phone={lead.phone}
      />

      {showConvert && onConvertClick && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConvertClick(lead);
          }}
          className="mt-4 inline-flex items-center gap-2 px-3 py-2 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Zu Partner machen
        </button>
      )}
    </div>
  );
};

export default LeadCard;
