/**
 * Company Knowledge Manager Component
 * 
 * Einfache Upload-Funktion für Firmenwissen.
 * CHIEF nutzt dieses Wissen für bessere, personalisierte Antworten.
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, BookOpen, Loader2, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

export default function CompanyKnowledgeManager() {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newKnowledge, setNewKnowledge] = useState({
    title: '',
    content: '',
    category: 'general'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadKnowledge();
  }, []);

  const loadKnowledge = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/settings/company-knowledge`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setKnowledge(data);
      }
    } catch (error) {
      console.error('Error loading knowledge:', error);
    } finally {
      setLoading(false);
    }
  };

  const addKnowledge = async () => {
    if (!newKnowledge.title.trim() || !newKnowledge.content.trim()) {
      alert('Bitte fülle Titel und Inhalt aus.');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/settings/company-knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newKnowledge)
      });

      if (res.ok) {
        setNewKnowledge({ title: '', content: '', category: 'general' });
        setShowModal(false);
        loadKnowledge();
      } else {
        alert('Fehler beim Speichern.');
      }
    } catch (error) {
      console.error('Error adding knowledge:', error);
      alert('Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  };

  const deleteKnowledge = async (id: string) => {
    if (!confirm('Wirklich löschen?')) return;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/settings/company-knowledge/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        loadKnowledge();
      }
    } catch (error) {
      console.error('Error deleting knowledge:', error);
    }
  };

  const categoryLabels: Record<string, string> = {
    general: 'Allgemein',
    products: 'Produkte',
    objections: 'Einwandbehandlung',
    scripts: 'Skripte',
    faq: 'FAQ'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#14202c] border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              Firmenwissen für CHIEF
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              CHIEF nutzt dieses Wissen für bessere, personalisierte Antworten
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg text-sm font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Hinzufügen
          </button>
        </div>

        {/* Knowledge List */}
        <div className="space-y-3">
          {knowledge.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Noch kein Firmenwissen hinzugefügt</p>
              <p className="text-sm mt-1">Klicke auf "Hinzufügen" um zu starten</p>
            </div>
          ) : (
            knowledge.map((k) => (
              <div
                key={k.id}
                className="flex items-start justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-white text-sm font-medium">{k.title}</h4>
                    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded">
                      {categoryLabels[k.category] || k.category}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2">
                    {k.content}
                  </p>
                  <p className="text-gray-600 text-xs mt-2">
                    {new Date(k.created_at).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <button
                  onClick={() => deleteKnowledge(k.id)}
                  className="ml-4 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#14202c] border border-cyan-500/20 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-white text-lg font-bold">Firmenwissen hinzufügen</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Titel</label>
                <input
                  type="text"
                  value={newKnowledge.title}
                  onChange={(e) => setNewKnowledge({ ...newKnowledge, title: e.target.value })}
                  placeholder="z.B. Produktinfos, Einwandbehandlung..."
                  className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">Kategorie</label>
                <select
                  value={newKnowledge.category}
                  onChange={(e) => setNewKnowledge({ ...newKnowledge, category: e.target.value })}
                  className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="general">Allgemein</option>
                  <option value="products">Produkte</option>
                  <option value="objections">Einwandbehandlung</option>
                  <option value="scripts">Skripte</option>
                  <option value="faq">FAQ</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-1 block">Inhalt</label>
                <textarea
                  value={newKnowledge.content}
                  onChange={(e) => setNewKnowledge({ ...newKnowledge, content: e.target.value })}
                  placeholder="Füge hier dein Firmenwissen ein... CHIEF wird es nutzen um bessere Antworten zu geben."
                  rows={8}
                  className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-4 py-2 text-white resize-none focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-800">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={addKnowledge}
                disabled={!newKnowledge.title.trim() || !newKnowledge.content.trim() || saving}
                className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-cyan-600 hover:to-cyan-700 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Speichert...
                  </>
                ) : (
                  'Speichern'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

