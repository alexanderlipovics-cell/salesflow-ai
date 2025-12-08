import React, { useEffect, useState } from "react";
import { Linkedin, Search, Plus, User } from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000";

const StakeholderCard = ({ name, company, context, leadId, onSaved, onClose }) => {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editData, setEditData] = useState({
    name: name || "",
    company: company || "",
    position: "",
    email: "",
    linkedin: "",
    notes: "",
  });

  const token = localStorage.getItem("access_token");

  const handleLookup = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/stakeholder/lookup`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, company, context }),
      });

      const data = await res.json();
      setResult(data);

      if (data.probable_title) {
        setEditData((prev) => ({ ...prev, position: data.probable_title }));
      }
      if (data.probable_email_pattern) {
        setEditData((prev) => ({ ...prev, email: data.probable_email_pattern }));
      }
    } catch (err) {
      console.error(err);
      setError("Lookup fehlgeschlagen. Bitte später erneut versuchen.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/stakeholder/save-contact`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editData,
          lead_id: leadId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Speichern fehlgeschlagen");
      }
      onSaved?.(data.contact);
    } catch (err) {
      console.error(err);
      setError("Kontakt konnte nicht gespeichert werden.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    handleLookup();
  }, [name, company, context]);

  return (
    <div className="bg-gray-800 rounded-xl border border-blue-500/30 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <User className="w-5 h-5 text-blue-400" />
          Stakeholder: {name}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
          type="button"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="text-gray-400">Recherchiere...</span>
        </div>
      ) : result ? (
        <div className="space-y-4">
          {result.probable_title && (
            <div className="bg-blue-500/10 rounded-lg p-3 text-sm">
              <p className="text-blue-400">
                🤖 Vermutung: {result.probable_title}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Confidence: {Math.round(result.confidence * 100)}%
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <a
              href={result.linkedin_search_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
            >
              <Linkedin className="w-4 h-4" /> LinkedIn suchen
            </a>

            <a
              href={result.google_search_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
            >
              <Search className="w-4 h-4" /> Google
            </a>
          </div>

          {Array.isArray(result.suggestions) && result.suggestions.length > 0 && (
            <ul className="text-sm text-gray-300 list-disc list-inside bg-slate-900/60 rounded-lg p-3">
              {result.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          )}

          <div className="space-y-3 pt-2 border-t border-gray-700">
            <p className="text-sm text-gray-400">Kontakt speichern:</p>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="Name"
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={editData.company}
                onChange={(e) =>
                  setEditData({ ...editData, company: e.target.value })
                }
                placeholder="Firma"
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={editData.position}
                onChange={(e) =>
                  setEditData({ ...editData, position: e.target.value })
                }
                placeholder="Position"
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
              />
              <input
                type="email"
                value={editData.email}
                onChange={(e) =>
                  setEditData({ ...editData, email: e.target.value })
                }
                placeholder="Email"
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={editData.linkedin}
                onChange={(e) =>
                  setEditData({ ...editData, linkedin: e.target.value })
                }
                placeholder="LinkedIn URL"
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm col-span-2"
              />
              <textarea
                value={editData.notes}
                onChange={(e) =>
                  setEditData({ ...editData, notes: e.target.value })
                }
                placeholder="Notizen"
                className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm col-span-2 resize-none"
                rows={2}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium"
              type="button"
            >
              {isSaving ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Als Kontakt speichern
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StakeholderCard;

