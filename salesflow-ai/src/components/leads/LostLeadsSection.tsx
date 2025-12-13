import React from 'react';
import { UserMinus, RefreshCw, Calendar, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  instagram_handle?: string;
  status: string;
  lost_reason?: string;
  updated_at: string;
  last_contact_date?: string;
}

interface LostLeadsSectionProps {
  leads: Lead[];
  onReactivate: (leadId: string) => void;
}

export function LostLeadsSection({ leads, onReactivate }: LostLeadsSectionProps) {
  const handleReactivate = async (leadId: string) => {
    try {
      await api.patch(`/api/leads/${leadId}`, {
        status: 'new',
        lost_reason: null
      });
      toast.success('Lead reaktiviert! 🧟');
      onReactivate(leadId);
    } catch (error) {
      toast.error('Fehler beim Reaktivieren');
    }
  };

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <UserMinus className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Keine verlorenen Leads</p>
        <p className="text-sm">Das ist gut so! 🎉</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="bg-red-50 border border-red-100 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-red-600">{leads.length}</p>
            <p className="text-sm text-red-700">Verlorene Leads</p>
          </div>
          <UserMinus className="h-8 w-8 text-red-400" />
        </div>
        <p className="text-xs text-red-600 mt-2">
          💡 Tipp: Nach 30-60 Tagen können "kalte" Leads oft reaktiviert werden
        </p>
      </div>

      {/* Lead Liste */}
      <div className="space-y-2">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{lead.name}</h4>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  {lead.email && <span>{lead.email}</span>}
                  {lead.phone && <span>{lead.phone}</span>}
                  {lead.instagram_handle && <span>@{lead.instagram_handle}</span>}
                </div>

                {/* Lost Info */}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Verloren {formatDistanceToNow(new Date(lead.updated_at), {
                      addSuffix: true,
                      locale: de
                    })}
                  </span>
                  {lead.lost_reason && (
                    <span className="text-red-500">
                      Grund: {lead.lost_reason}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReactivate(lead.id)}
                  className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reaktivieren
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
