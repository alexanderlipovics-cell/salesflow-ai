import React, { useState, useEffect } from 'react';
import { MessageSquare, Search, Copy, Check, Plus, ThumbsUp, ThumbsDown, Sparkles, BookOpen } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const ObjectionsPage = () => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [myObjections, setMyObjections] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [activeTab, setActiveTab] = useState('search'); // search, templates, my
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveData, setSaveData] = useState({ objection_text: '', best_response: '', category: '', notes: '' });
    
    const token = localStorage.getItem('access_token');
    
    useEffect(() => {
        fetchTemplates();
        fetchMyObjections();
    }, []);
    
    const fetchTemplates = async () => {
        try {
            const res = await fetch(`${API_URL}/api/objections/templates`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setTemplates(data.templates || []);
        } catch (err) {
            console.error(err);
        }
    };
    
    const fetchMyObjections = async () => {
        try {
            const res = await fetch(`${API_URL}/api/objections/my-objections`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setMyObjections(data.objections || []);
        } catch (err) {
            console.error(err);
        }
    };
    
    const handleSearch = async () => {
        if (!query.trim()) return;
        
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/objections/handle`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ objection_text: query })
            });
            const data = await res.json();
            setResult(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };
    
    const handleSave = async () => {
        try {
            await fetch(`${API_URL}/api/objections/save`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(saveData)
            });
            setShowSaveModal(false);
            setSaveData({ objection_text: '', best_response: '', category: '', notes: '' });
            fetchMyObjections();
        } catch (err) {
            console.error(err);
        }
    };
    
    const getCategoryLabel = (cat) => {
        const labels = {
            price: '💰 Preis',
            time: '⏰ Zeit',
            trust: '🤝 Vertrauen',
            need: '❓ Bedarf',
            authority: '👥 Entscheidung',
            other: '📝 Sonstiges'
        };
        return labels[cat] || cat;
    };
    
    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-purple-400" />
                    Einwand-Handling
                </h1>
                <p className="text-gray-400 text-sm">Finde die beste Antwort auf jeden Einwand</p>
            </div>
            
            {/* Search Bar */}
            <div className="mb-6">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Was sagt dein Lead? z.B. 'Das ist mir zu teuer'"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 pr-12 focus:border-purple-500 focus:outline-none"
                        />
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={isLoading}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {isLoading ? '...' : 'Antwort finden'}
                    </button>
                </div>
            </div>
            
            {/* Result */}
            {result && (
                <div className="mb-6 bg-gray-800 rounded-xl border border-purple-500/30 overflow-hidden">
                    <div className="p-4 bg-purple-500/10 border-b border-gray-700">
                        <div className="flex items-center justify-between">
                            <span className="text-purple-400 font-medium">"{result.objection}"</span>
                            <span className="text-sm px-2 py-1 bg-gray-700 rounded">
                                {getCategoryLabel(result.category)}
                            </span>
                        </div>
                    </div>
                    
                    <div className="p-4 space-y-4">
                        {/* AI Suggestion */}
                        {result.ai_suggestion && (
                            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-4 border border-purple-500/20">
                                <div className="flex items-center gap-2 text-purple-400 text-sm mb-2">
                                    <Sparkles className="w-4 h-4" />
                                    AI Vorschlag
                                </div>
                                <p className="text-white">{result.ai_suggestion}</p>
                                <button
                                    onClick={() => handleCopy(result.ai_suggestion, 'ai')}
                                    className="mt-2 text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                >
                                    {copiedIndex === 'ai' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copiedIndex === 'ai' ? 'Kopiert!' : 'Kopieren'}
                                </button>
                            </div>
                        )}
                        
                        {/* Template Responses */}
                        {result.responses.length > 0 && (
                            <div>
                                <p className="text-gray-400 text-sm mb-2">Bewährte Antworten:</p>
                                <div className="space-y-2">
                                    {result.responses.map((r, i) => (
                                        <div key={i} className="bg-gray-700/50 rounded-lg p-3 flex justify-between items-start">
                                            <div>
                                                <p>{r.text}</p>
                                                <span className="text-xs text-gray-500 mt-1">{r.type}</span>
                                            </div>
                                            <button
                                                onClick={() => handleCopy(r.text, i)}
                                                className="text-gray-400 hover:text-white ml-2"
                                            >
                                                {copiedIndex === i ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Tips */}
                        {result.tips && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                <p className="text-yellow-300 text-sm">💡 {result.tips}</p>
                            </div>
                        )}
                        
                        {/* Save Button */}
                        <button
                            onClick={() => {
                                setSaveData({ 
                                    ...saveData, 
                                    objection_text: result.objection,
                                    best_response: result.ai_suggestion || ''
                                });
                                setShowSaveModal(true);
                            }}
                            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" /> Als eigene Vorlage speichern
                        </button>
                    </div>
                </div>
            )}
            
            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b border-gray-700 pb-2">
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`px-4 py-2 rounded-t-lg ${activeTab === 'templates' ? 'bg-gray-800 text-white' : 'text-gray-400'}`}
                >
                    <BookOpen className="w-4 h-4 inline mr-2" />
                    Alle Einwände
                </button>
                <button
                    onClick={() => setActiveTab('my')}
                    className={`px-4 py-2 rounded-t-lg ${activeTab === 'my' ? 'bg-gray-800 text-white' : 'text-gray-400'}`}
                >
                    Meine Vorlagen ({myObjections.length})
                </button>
            </div>
            
            {/* Templates List */}
            {activeTab === 'templates' && (
                <div className="grid gap-4 md:grid-cols-2">
                    {templates.map(t => (
                        <div key={t.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 cursor-pointer"
                             onClick={() => { setQuery(t.objection_text); }}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">"{t.objection_text}"</span>
                                <span className="text-xs px-2 py-1 bg-gray-700 rounded">
                                    {getCategoryLabel(t.category)}
                                </span>
                            </div>
                            <p className="text-gray-400 text-sm">{t.tips}</p>
                            <p className="text-xs text-gray-500 mt-2">{t.usage_count}x verwendet</p>
                        </div>
                    ))}
                </div>
            )}
            
            {/* My Objections */}
            {activeTab === 'my' && (
                <div className="space-y-4">
                    <button
                        onClick={() => setShowSaveModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                        <Plus className="w-4 h-4" /> Neue Vorlage
                    </button>
                    
                    {myObjections.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Noch keine eigenen Vorlagen</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {myObjections.map(o => (
                                <div key={o.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                                    <p className="font-medium mb-2">"{o.objection_text}"</p>
                                    <p className="text-green-400 text-sm mb-2">→ {o.best_response}</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <ThumbsUp className="w-3 h-3" /> {o.success_count}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ThumbsDown className="w-3 h-3" /> {o.fail_count}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
                        <h3 className="text-lg font-bold mb-4">Vorlage speichern</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Einwand</label>
                                <input
                                    type="text"
                                    value={saveData.objection_text}
                                    onChange={(e) => setSaveData({ ...saveData, objection_text: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                                    placeholder="z.B. Das ist mir zu teuer"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Beste Antwort</label>
                                <textarea
                                    value={saveData.best_response}
                                    onChange={(e) => setSaveData({ ...saveData, best_response: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 h-24"
                                    placeholder="Deine bewährte Antwort..."
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Kategorie</label>
                                <select
                                    value={saveData.category}
                                    onChange={(e) => setSaveData({ ...saveData, category: e.target.value })}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2"
                                >
                                    <option value="">Wählen...</option>
                                    <option value="price">💰 Preis</option>
                                    <option value="time">⏰ Zeit</option>
                                    <option value="trust">🤝 Vertrauen</option>
                                    <option value="need">❓ Bedarf</option>
                                    <option value="authority">👥 Entscheidung</option>
                                    <option value="other">📝 Sonstiges</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setShowSaveModal(false)} className="flex-1 py-2 bg-gray-700 rounded-lg">
                                Abbrechen
                            </button>
                            <button onClick={handleSave} className="flex-1 py-2 bg-purple-600 rounded-lg font-medium">
                                Speichern
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ObjectionsPage;

