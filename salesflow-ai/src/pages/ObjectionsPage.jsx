import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  Brain,
  BarChart3,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ObjectionCard = ({ objection, onPractice, onEdit }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
    <div className="flex justify-between items-start mb-2">
      <h4 className="font-medium text-red-600 dark:text-red-400">"{objection.title}"</h4>
      {objection.category && (
        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
          {objection.category}
        </span>
      )}
    </div>
    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{objection.response}</p>
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={onPractice}>
        🎭 Üben
      </Button>
      <Button size="sm" variant="ghost" onClick={onEdit}>
        ✏️ Bearbeiten
      </Button>
    </div>
  </div>
);

const ObjectionTrendChart = ({ data }) => (
  <div className="h-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center text-sm text-gray-500">
    {data?.length ? 'Chart Placeholder' : 'Keine Trenddaten vorhanden'}
  </div>
);

export default function ObjectionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'library';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Library
  const [objections, setObjections] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // AI Brain
  const [brainQuery, setBrainQuery] = useState('');
  const [brainResponse, setBrainResponse] = useState('');
  const [recentBrainResponses, setRecentBrainResponses] = useState([]);

  // Analytics
  const [objectionStats, setObjectionStats] = useState([]);
  const [successRates, setSuccessRates] = useState([]);
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    fetchObjections();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', activeTab);
      return next;
    });
  }, [activeTab, setSearchParams]);

  const fetchObjections = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('objections')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setObjections(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Objections laden fehlgeschlagen', err);
      setObjections([]);
    }
  };

  const fetchAnalytics = async () => {
    // Kein Analytics-Endpoint vorhanden – leer lassen
    setObjectionStats([]);
    setSuccessRates([]);
    setTrendData([]);
  };

  const handleAskBrain = async () => {
    if (!brainQuery.trim()) return;
    try {
      const res = await fetch('/api/ai/objection-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ objection: brainQuery }),
      });
      const data = await res.json();
      setBrainResponse(data?.response || '');
      setRecentBrainResponses((prev) => [
        { id: Date.now(), question: brainQuery, answer: data?.response || '' },
        ...prev.slice(0, 4),
      ]);
    } catch (err) {
      console.error('Objection Brain Anfrage fehlgeschlagen', err);
    }
  };

  const handleSaveResponse = () => {
    setShowAddModal(true);
  };

  const handlePracticeResponse = () => {
    alert('Practice-Flow starten (Platzhalter).');
  };

  const handlePractice = () => {
    alert('Üben-Flow starten (Platzhalter).');
  };

  const handleEdit = () => {
    setShowAddModal(true);
  };

  const filteredObjections = useMemo(
    () =>
      (objections || []).filter(
        (o) =>
          o.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.response?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [objections, searchQuery]
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Einwandbehandlung</h1>
          <p className="text-gray-500">Lerne und trainiere Antworten auf häufige Einwände</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Einwand hinzufügen
        </Button>
      </div>

      {/* Search - visible on all tabs */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Einwand suchen... (z.B. 'zu teuer', 'keine Zeit')"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="library" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Bibliothek
          </TabsTrigger>
          <TabsTrigger value="brain" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Brain
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Library */}
        <TabsContent value="library">
          <div className="grid gap-4">
            {filteredObjections.map((objection) => (
              <ObjectionCard
                key={objection.id || objection.title}
                objection={objection}
                onPractice={() => handlePractice(objection)}
                onEdit={() => handleEdit(objection)}
              />
            ))}
            {filteredObjections.length === 0 && (
              <div className="text-sm text-gray-500">Keine Einwände gefunden.</div>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: AI Brain */}
        <TabsContent value="brain">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                Frag das Objection Brain
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Wie antworte ich auf 'Das ist zu teuer'?"
                  className="flex-1 p-3 border rounded-lg"
                  value={brainQuery}
                  onChange={(e) => setBrainQuery(e.target.value)}
                />
                <Button onClick={handleAskBrain}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Fragen
                </Button>
              </div>

              {brainResponse && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="whitespace-pre-wrap">{brainResponse}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={handleSaveResponse}>
                      Zur Bibliothek hinzufügen
                    </Button>
                    <Button size="sm" variant="outline" onClick={handlePracticeResponse}>
                      Üben
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-3">Kürzlich generiert</h3>
              <div className="space-y-2">
                {recentBrainResponses.length === 0 && (
                  <div className="text-sm text-gray-500">Noch keine Brain-Antworten.</div>
                )}
                {recentBrainResponses.map((item) => (
                  <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium">{item.question}</p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Analytics */}
        <TabsContent value="analytics">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Häufigste Einwände</h3>
              <div className="space-y-3">
                {objectionStats.length === 0 && (
                  <div className="text-sm text-gray-500">Keine Daten.</div>
                )}
                {objectionStats.map((stat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm">{stat.objection}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500">{stat.count}x</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Erfolgsrate nach Einwand</h3>
              <div className="space-y-3">
                {successRates.length === 0 && (
                  <div className="text-sm text-gray-500">Keine Daten.</div>
                )}
                {successRates.map((stat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm">{stat.objection}</span>
                    <span
                      className={`text-sm font-medium ${
                        stat.rate > 70 ? 'text-green-500' : stat.rate > 40 ? 'text-yellow-500' : 'text-red-500'
                      }`}
                    >
                      {stat.rate}% überwunden
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Einwände über Zeit</h3>
              <ObjectionTrendChart data={trendData} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Modal (vereinfachter Platzhalter) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Einwand hinzufügen</h3>
            <div className="space-y-3">
              <input className="w-full border rounded-lg p-2" placeholder="Titel" />
              <textarea className="w-full border rounded-lg p-2 h-24" placeholder="Antwort" />
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" className="flex-1" onClick={() => setShowAddModal(false)}>
                Abbrechen
              </Button>
              <Button className="flex-1" onClick={() => setShowAddModal(false)}>
                Speichern
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

