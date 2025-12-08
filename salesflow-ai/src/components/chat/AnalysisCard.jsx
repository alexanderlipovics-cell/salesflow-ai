import React from 'react';
import { Copy, Check, ExternalLink, User, Calendar, MessageSquare, Mail, Phone, Instagram } from 'lucide-react';

const AnalysisCard = ({
    analysis,
    onSaveLead,
    onClose,
    onCopy,
    onMagicSend,
    onOpenLead,
    onImportBulk,
}) => {
    const [copiedField, setCopiedField] = React.useState(null);
    const [selectedContacts, setSelectedContacts] = React.useState([]);

    React.useEffect(() => {
        if (analysis?.contacts?.length) {
            setSelectedContacts(analysis.contacts.map((_, idx) => idx));
        } else {
            setSelectedContacts([]);
        }
    }, [analysis]);

    const handleCopy = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
        onCopy?.(text, field);
    };

    const toggleContact = (index) => {
        setSelectedContacts((prev) =>
            prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
        );
    };

    const handleImportAll = () => {
        if (!analysis?.contacts || !onImportBulk) return;
        const chosen = analysis.contacts.filter((_, idx) => selectedContacts.includes(idx));
        onImportBulk(chosen, analysis);
    };

    if (!analysis) return null;

    const isBulk = Boolean(analysis.is_bulk_list || (analysis.contacts?.length || 0) > 1);
    const { lead, status, waiting_for, conversation_summary, suggested_next_action,
            follow_up_days, customer_message, crm_note, follow_up_draft,
            lead_exists, existing_lead_id, input_type, contacts, total_found, scroll_hint } = analysis;

    if (isBulk) {
        return (
            <div className="mx-4 mb-4 bg-gray-800 rounded-xl border border-green-500/30 overflow-hidden animate-fadeIn">
                <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        📋 Kontakte-Liste erkannt
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-green-400 font-medium">
                            {total_found || contacts?.length || 0} Kontakte erkannt
                        </span>
                        <button
                            onClick={handleImportAll}
                            className="px-4 py-2 bg-green-600 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                            disabled={!onImportBulk || !selectedContacts.length}
                        >
                            Alle importieren
                        </button>
                    </div>

                    {scroll_hint && (
                        <p className="text-xs text-gray-400">{scroll_hint}</p>
                    )}

                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {contacts?.map((contact, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 bg-gray-800 rounded">
                                <input
                                    type="checkbox"
                                    checked={selectedContacts.includes(i)}
                                    onChange={() => toggleContact(i)}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{contact.name || 'Unbekannt'}</p>
                                    <p className="text-xs text-gray-400 truncate">
                                        {(contact.username || '').trim()} {contact.username && contact.title ? '•' : ''} {contact.title || ''}
                                    </p>
                                    {(contact.company || contact.bio) && (
                                        <p className="text-xs text-gray-500 truncate">
                                            {[contact.company, contact.bio].filter(Boolean).join(' • ')}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className={`text-sm ${
                                        (contact.warm_score || 0) > 70 ? 'text-green-400' :
                                        (contact.warm_score || 0) > 40 ? 'text-yellow-400' : 'text-gray-400'
                                    }`}>
                                        {(contact.warm_score ?? 0)}%
                                    </span>
                                    <p className="text-xs text-gray-500">Warm Score</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-4 mb-4 bg-gray-800 rounded-xl border border-blue-500/30 overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-4 py-3 border-b border-gray-700">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        {input_type === 'conversation' ? '💬 Chat analysiert' : '📋 Meeting-Protokoll'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Lead Info */}
                {lead?.name && (
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xl font-bold text-white">
                            {lead.first_name?.[0] || lead.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white truncate">{lead.name}</p>
                            <p className="text-sm text-gray-400 truncate">
                                {lead.platform && `${lead.platform}`}
                                {lead.company && ` • ${lead.company}`}
                                {lead.instagram && ` • @${lead.instagram}`}
                            </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            status === 'hot' ? 'bg-red-500/20 text-red-400' :
                            status === 'warm' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-blue-500/20 text-blue-400'
                        }`}>
                            {status || 'neu'}
                        </span>
                    </div>
                )}

                {/* Contact Info Pills */}
                {lead && (
                    <div className="flex flex-wrap gap-2">
                        {lead.phone && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 rounded text-sm text-gray-300">
                                <Phone className="w-3 h-3" /> {lead.phone}
                            </span>
                        )}
                        {lead.email && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 rounded text-sm text-gray-300">
                                <Mail className="w-3 h-3" /> {lead.email}
                            </span>
                        )}
                        {lead.instagram && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 rounded text-sm text-gray-300">
                                <Instagram className="w-3 h-3" /> @{lead.instagram}
                            </span>
                        )}
                    </div>
                )}

                {/* Status Grid */}
                {waiting_for && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-700/50 rounded-lg p-3">
                            <p className="text-gray-400 text-xs uppercase tracking-wide">Wartet auf</p>
                            <p className="text-white font-medium mt-1">
                                {waiting_for === 'lead_response' ? '⏳ Antwort vom Lead' :
                                 waiting_for === 'my_response' ? '✍️ Deine Antwort' : '—'}
                            </p>
                        </div>
                        <div className="bg-gray-700/50 rounded-lg p-3">
                            <p className="text-gray-400 text-xs uppercase tracking-wide">Follow-up</p>
                            <p className="text-white font-medium mt-1 flex items-center gap-1">
                                <Calendar className="w-4 h-4" /> {follow_up_days} Tage
                            </p>
                        </div>
                    </div>
                )}

                {/* Summary */}
                {conversation_summary && (
                    <div className="bg-gray-700/50 rounded-lg p-3">
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Zusammenfassung</p>
                        <p className="text-white text-sm">{conversation_summary}</p>
                    </div>
                )}

                {/* Next Action */}
                {suggested_next_action && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <p className="text-green-400 text-xs uppercase tracking-wide">💡 Empfohlen</p>
                        <p className="text-white text-sm mt-1">{suggested_next_action}</p>
                    </div>
                )}

                {/* Customer Message */}
                {customer_message && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-blue-400 text-xs uppercase tracking-wide">📧 Nachricht an Kunden</p>
                            <button
                                onClick={() => handleCopy(customer_message, 'customer')}
                                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                {copiedField === 'customer' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copiedField === 'customer' ? 'Kopiert!' : 'Kopieren'}
                            </button>
                        </div>
                        <p className="text-white text-sm whitespace-pre-wrap">{customer_message}</p>
                    </div>
                )}

                {/* Follow-up Draft */}
                {follow_up_draft && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-orange-400 text-xs uppercase tracking-wide">⏰ Follow-up Vorlage</p>
                            <button
                                onClick={() => handleCopy(follow_up_draft, 'followup')}
                                className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                            >
                                {copiedField === 'followup' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copiedField === 'followup' ? 'Kopiert!' : 'Kopieren'}
                            </button>
                        </div>
                        <p className="text-gray-300 text-sm">{follow_up_draft}</p>
                    </div>
                )}

                {/* Magic Send Buttons */}
                {lead && customer_message && (
                    <div className="pt-2">
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">📲 Magic Send</p>
                        <div className="flex flex-wrap gap-2">
                            {lead.phone && (
                                <button
                                    onClick={() => onMagicSend?.('whatsapp', customer_message, lead)}
                                    className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                    📱 WhatsApp
                                </button>
                            )}
                            {lead.instagram && (
                                <button
                                    onClick={() => onMagicSend?.('instagram', customer_message, lead)}
                                    className="flex items-center gap-2 px-3 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                    📷 Instagram
                                </button>
                            )}
                            {lead.email && (
                                <button
                                    onClick={() => onMagicSend?.('email', customer_message, lead)}
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                    📧 Email
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Main Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-700">
                    {!lead_exists ? (
                        <button
                            onClick={() => onSaveLead?.(analysis)}
                            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Check className="w-4 h-4" /> Als Lead speichern
                        </button>
                    ) : (
                        <button
                            onClick={() => onOpenLead?.(existing_lead_id)}
                            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <ExternalLink className="w-4 h-4" /> Lead öffnen
                        </button>
                    )}
                    {customer_message && (
                        <button
                            onClick={() => handleCopy(customer_message, 'main')}
                            className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        >
                            {copiedField === 'main' ? '✓' : '📋'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalysisCard;
