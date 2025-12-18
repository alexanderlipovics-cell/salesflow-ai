import React, { useEffect, useState } from 'react';
import {
  X,
  Save,
  User,
  Building,
  Mail,
  Phone,
  Instagram,
  Linkedin,
  Facebook,
  MessageCircle,
  Globe,
  Tag,
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  notes?: string;
  status?: string;
  score?: number;
  source?: string;
  instagram?: string;
  linkedin?: string;
  whatsapp?: string;
  twitter?: string;
  tiktok?: string;
  facebook?: string;
  website?: string;
  tags?: string[];
}

interface LeadEditModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLead: Partial<Lead>) => Promise<void>;
}

export const LeadEditModal: React.FC<LeadEditModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [stateChangeLoading, setStateChangeLoading] = useState(false);
  const [stateChangeError, setStateChangeError] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
    const parseTemperature = (temp: any): number => {
      if (typeof temp === 'number') return temp;
      if (typeof temp === 'string') {
        const num = parseInt(temp, 10);
        if (!isNaN(num)) return num;
        const mapping: Record<string, number> = {
          hot: 80,
          warm: 60,
          cold: 30,
          frozen: 10,
        };
        return mapping[temp.toLowerCase()] ?? 50;
      }
      return 50;
    };

      setFormData({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        position: lead.position || '',
        notes: lead.notes || '',
        status: lead.status || 'new',
      score: parseTemperature((lead as any).temperature ?? lead.score ?? 0),
        source: lead.source || '',
        instagram: lead.instagram || '',
        linkedin: lead.linkedin || '',
        whatsapp: lead.whatsapp || '',
        twitter: lead.twitter || '',
        facebook: lead.facebook || '',
        website: lead.website || '',
        tags: lead.tags || [],
      });
    }
  }, [lead]);

  if (!isOpen) return null;

  const handleChange = (field: keyof Lead, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((t) => t !== tagToRemove),
    }));
  };

  const handleStateChange = async (newStatus: string) => {
    const oldStatus = formData.status || 'new';
    
    // Update local state immediately for UI feedback
    handleChange('status', newStatus);
    
    // Call the state machine API
    setStateChangeLoading(true);
    setStateChangeError(null);
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/engine/change-state`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lead_id: lead.id,
          new_state: newStatus,
          vertical: 'mlm'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Revert on error
        handleChange('status', oldStatus);
        setStateChangeError(data.detail || 'Status-Wechsel fehlgeschlagen');
      } else if (data.next_followup) {
        // Show success with next follow-up info
        console.log('Next follow-up scheduled:', data.next_followup);
      }
    } catch (err) {
      handleChange('status', oldStatus);
      setStateChangeError('Netzwerkfehler beim Status-Wechsel');
    } finally {
      setStateChangeLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<Lead> & { temperature?: number } = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        position: formData.position,
        status: formData.status,
        temperature: formData.score, // score → temperature (DB-Feld)
        notes: formData.notes,
        source: formData.source,
        whatsapp: formData.whatsapp,
        instagram: formData.instagram,
        linkedin: formData.linkedin,
        facebook: formData.facebook,
        website: formData.website,
        tags: formData.tags,
      };

      Object.keys(payload).forEach((key) => {
        const k = key as keyof typeof payload;
        if (payload[k] === undefined) {
          delete payload[k];
        }
      });

      await onSave(payload);
      onClose();
    } catch (error) {
      console.error('Error saving lead:', error);
      alert('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = [
    { value: 'new', label: '🆕 Neu', color: 'bg-blue-100 text-blue-800' },
    { value: 'engaged', label: '💬 Engaged', color: 'bg-cyan-100 text-cyan-800' },
    { value: 'opportunity', label: '🎯 Opportunity', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'won', label: '✅ Gewonnen', color: 'bg-green-100 text-green-800' },
    { value: 'lost', label: '❌ Verloren', color: 'bg-red-100 text-red-800' },
    { value: 'churned', label: '📉 Churned', color: 'bg-orange-100 text-orange-800' },
    { value: 'dormant', label: '💤 Dormant', color: 'bg-gray-100 text-gray-800' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Lead bearbeiten</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-130px)]">
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4" /> Grunddaten
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Max Mustermann"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Status</label>
                <select
                  value={formData.status || 'new'}
                  onChange={(e) => handleStateChange(e.target.value)}
                  disabled={stateChangeLoading}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {stateChangeLoading && (
                  <p className="text-xs text-blue-600 mt-1">⏳ Follow-up Cycle wird aktualisiert...</p>
                )}
                {stateChangeError && (
                  <p className="text-xs text-red-600 mt-1">⚠️ {stateChangeError}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">E-Mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="max@beispiel.de"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Telefon</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="+49 151 12345678"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Firma</label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.company || ''}
                    onChange={(e) => handleChange('company', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Firma GmbH"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Position</label>
                <input
                  type="text"
                  value={formData.position || ''}
                  onChange={(e) => handleChange('position', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Geschäftsführer"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Score (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.score || 0}
                onChange={(e) => handleChange('score', parseInt(e.target.value) || 0)}
                className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <h3 className="font-medium text-gray-700 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Social Media & Kontakt
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">WhatsApp</label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-2.5 w-4 h-4 text-green-500" />
                  <input
                    type="tel"
                    value={formData.whatsapp || ''}
                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="+49151..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Instagram</label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-2.5 w-4 h-4 text-pink-500" />
                  <input
                    type="text"
                    value={formData.instagram || ''}
                    onChange={(e) => handleChange('instagram', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                    placeholder="@username"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">LinkedIn</label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-2.5 w-4 h-4 text-blue-600" />
                  <input
                    type="url"
                    value={formData.linkedin || ''}
                    onChange={(e) => handleChange('linkedin', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600"
                    placeholder="linkedin.com/in/username"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Facebook</label>
                <div className="relative">
                  <Facebook className="absolute left-3 top-2.5 w-4 h-4 text-blue-500" />
                  <input
                    type="text"
                    value={formData.facebook || ''}
                    onChange={(e) => handleChange('facebook', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Facebook Profil oder Messenger"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Website</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <h3 className="font-medium text-gray-700 flex items-center gap-2">
              <Tag className="w-4 h-4" /> Tags
            </h3>

            <div className="flex flex-wrap gap-2 mb-2">
              {(formData.tags || []).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Neuer Tag..."
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm text-gray-600 mb-1">Notizen</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Notizen zum Lead..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !formData.name}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadEditModal;

