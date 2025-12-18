import React, { useState, useEffect } from 'react';
import { X, Send, MessageCircle, Mail, Instagram, Linkedin, Copy, Check, ExternalLink } from 'lucide-react';

export default function SendMessageModal({ isOpen, onClose, message, lead }) {
  const [editedMessage, setEditedMessage] = useState(message || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEditedMessage(message || '');
    setCopied(false);
  }, [message, isOpen]);

  // Markiere Nachricht als gesendet im Backend
  const markMessageAsSent = async (channel) => {
    if (!lead?.id) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/leads/${lead.id}/message-sent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: editedMessage,
          channel: channel,
        }),
      });
      
      if (response.ok) {
        console.log('Message marked as sent, lead status updated to contacted');
      } else {
        console.warn('Could not mark message as sent:', await response.text());
      }
    } catch (error) {
      console.warn('Error marking message as sent (non-critical):', error);
    }
  };

  if (!isOpen) return null;

  const channels = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-600 hover:bg-green-700',
      available: !!lead?.phone,
      action: async () => {
        const phone = lead.phone.replace(/[^0-9+]/g, '');
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(editedMessage)}`;
        window.open(url, '_blank');
        await markMessageAsSent('whatsapp');
      }
    },
    {
      id: 'email',
      name: 'Email',
      icon: Mail,
      color: 'bg-blue-600 hover:bg-blue-700',
      available: !!lead?.email,
      action: () => {
        const subject = encodeURIComponent('Nachricht von ' + (lead?.company || 'mir'));
        const body = encodeURIComponent(editedMessage);
        window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`, '_blank');
      }
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: Instagram,
      color: 'bg-pink-600 hover:bg-pink-700',
      available: !!lead?.instagram,
      action: () => {
        navigator.clipboard.writeText(editedMessage);
        const handle = lead.instagram.replace('@', '');
        window.open(`https://instagram.com/${handle}`, '_blank');
      }
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-700 hover:bg-blue-800',
      available: !!lead?.linkedin,
      action: () => {
        navigator.clipboard.writeText(editedMessage);
        window.open(lead.linkedin, '_blank');
      }
    }
  ];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1f2e] rounded-xl w-full max-w-lg mx-4 shadow-2xl border border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Nachricht senden</h2>
            {lead?.name && (
              <p className="text-sm text-gray-400">An: {lead.name}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4">
          <textarea
            value={editedMessage}
            onChange={(e) => setEditedMessage(e.target.value)}
            className="w-full h-48 p-3 bg-[#0d111d] border border-gray-600 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nachricht bearbeiten..."
          />
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{editedMessage.length} Zeichen</span>
            <span>WhatsApp max: 65.536</span>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 mb-3">Kanal wählen:</p>

          <div className="grid grid-cols-2 gap-2">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={channel.action}
                disabled={!channel.available}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  channel.available
                    ? `${channel.color} text-white`
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <channel.icon className="w-5 h-5" />
                {channel.name}
                {channel.available && <ExternalLink className="w-3 h-3 opacity-60" />}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-all"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? 'Kopiert!' : 'Text kopieren'}
          </button>
        </div>

        {(!lead?.phone && !lead?.email) && (
          <div className="px-4 pb-4">
            <p className="text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded">
              💡 Füge Telefon oder Email zum Lead hinzu um direkt zu senden
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

