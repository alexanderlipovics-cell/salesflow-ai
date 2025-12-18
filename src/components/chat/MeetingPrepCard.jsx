import React from 'react';
import { Calendar, CheckCircle, ExternalLink, MapPin, MessageCircle, Sparkles, X } from 'lucide-react';

const SectionTitle = ({ children }) => (
  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{children}</p>
);

const MeetingPrepCard = ({ prep, onClose }) => {
  if (!prep) return null;

  const lead = prep.lead || {};
  const prepDoc = prep.prep || {};
  const talkingPoints = prepDoc.talking_points || [];
  const objections = prepDoc.objections || [];
  const webSources = prep.web_sources || {};

  return (
    <div className="mx-4 mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/20 bg-gradient-to-r from-amber-600/15 to-orange-600/15">
        <div className="flex items-center gap-2 text-amber-200">
          <Sparkles className="w-4 h-4" />
          <span className="font-semibold">Gesprächsvorbereitung</span>
          {lead.name && <span className="text-amber-100">für {lead.name}</span>}
        </div>
        <button onClick={onClose} className="text-amber-200 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {lead.name && (
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg font-bold text-white">
              {lead.first_name?.[0] || lead.name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{lead.name}</p>
              <p className="text-sm text-gray-300 truncate">
                {lead.company && <span>{lead.company}</span>}
                {lead.city && (
                  <>
                    {' '}
                    • <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.city}</span>
                  </>
                )}
              </p>
            </div>
            {lead.status && (
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-200 text-xs font-semibold">
                {lead.status}
              </span>
            )}
          </div>
        )}

        {/* CRM Snapshot */}
        {(lead.notes || lead.last_message || lead.next_follow_up) && (
          <div className="rounded-lg border border-amber-500/20 bg-black/20 p-3">
            <SectionTitle>Was wir im CRM wissen</SectionTitle>
            <div className="space-y-2 text-sm text-gray-100">
              {lead.notes && <p>• {lead.notes}</p>}
              {lead.last_message && (
                <p className="flex items-start gap-2">
                  <MessageCircle className="w-4 h-4 mt-0.5 text-amber-300" />
                  <span>{lead.last_message}</span>
                </p>
              )}
              {lead.next_follow_up && (
                <p className="flex items-center gap-2 text-amber-200">
                  <Calendar className="w-4 h-4" />
                  Nächstes Follow-up: {lead.next_follow_up}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Web Research */}
        {Object.keys(webSources).length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <SectionTitle>Öffentliche Infos</SectionTitle>
            <div className="flex flex-wrap gap-2 text-sm">
              {webSources.google_search && (
                <a href={webSources.google_search} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-amber-600/20 px-3 py-1 text-amber-100 hover:bg-amber-600/30">
                  <ExternalLink className="w-3 h-3" /> Google
                </a>
              )}
              {webSources.linkedin_search && (
                <a href={webSources.linkedin_search} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-blue-600/20 px-3 py-1 text-blue-100 hover:bg-blue-600/30">
                  <ExternalLink className="w-3 h-3" /> LinkedIn
                </a>
              )}
              {webSources.instagram_profile && (
                <a href={webSources.instagram_profile} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-pink-600/20 px-3 py-1 text-pink-100 hover:bg-pink-600/30">
                  <ExternalLink className="w-3 h-3" /> Instagram
                </a>
              )}
              {webSources.company_news && (
                <a href={webSources.company_news} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-emerald-600/20 px-3 py-1 text-emerald-100 hover:bg-emerald-600/30">
                  <ExternalLink className="w-3 h-3" /> Company News
                </a>
              )}
            </div>
          </div>
        )}

        {/* Opener */}
        {prepDoc.opener && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <SectionTitle>Conversation Opener</SectionTitle>
            <p className="text-sm text-white">{prepDoc.opener}</p>
          </div>
        )}

        {/* Talking Points */}
        {talkingPoints.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-black/30 p-3">
            <SectionTitle>Talking Points</SectionTitle>
            <div className="space-y-2 text-sm text-gray-100">
              {talkingPoints.map((tp, idx) => (
                <div key={idx} className="flex gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-amber-300" />
                  <div>
                    <p className="font-semibold text-white">{tp.title}</p>
                    {tp.reason && <p className="text-gray-300">{tp.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Objections */}
        {objections.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-black/30 p-3">
            <SectionTitle>Einwände & Antworten</SectionTitle>
            <div className="space-y-2 text-sm text-gray-100">
              {objections.map((obj, idx) => (
                <div key={idx} className="flex gap-2">
                  <MessageCircle className="w-4 h-4 mt-0.5 text-amber-300" />
                  <div>
                    <p className="font-semibold text-white">{obj.title}</p>
                    {obj.rebuttal && <p className="text-gray-300">{obj.rebuttal}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendation */}
        {prepDoc.recommendation && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <SectionTitle>Empfehlung</SectionTitle>
            <p className="text-sm text-white">{prepDoc.recommendation}</p>
          </div>
        )}

        {prepDoc.summary && (
          <div className="rounded-lg border border-amber-500/10 bg-black/30 p-3">
            <SectionTitle>Zusammenfassung</SectionTitle>
            <p className="text-sm text-gray-200">{prepDoc.summary}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingPrepCard;

