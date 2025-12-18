import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Copy, Edit, Trash2, Eye, Users, BarChart2, 
  Plus, FileText, Video, Link as LinkIcon,
  Check
} from 'lucide-react';
import { api } from '@/lib/api';

// Freebie Card Komponente
const FreebieCard = ({ freebie, onCopyLink, onEdit, onDelete, onCardClick }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopyLink = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/f/${freebie.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopyLink?.(freebie);
  };

  const handleCardClick = () => {
    onCardClick?.(freebie);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit?.(freebie);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete?.(freebie);
  };

  const cr = freebie.views > 0 ? Math.round((freebie.leads / freebie.views) * 100) : 0;

  return (
    <div 
      onClick={handleCardClick}
      className="group bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-teal-500/50 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Thumbnail Area */}
      <div className="h-40 bg-gray-800 relative overflow-hidden">
        {freebie.thumbnail_url ? (
          <img 
            src={freebie.thumbnail_url} 
            alt={freebie.title} 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {freebie.type === 'pdf' && <FileText size={48} className="text-gray-600" />}
            {freebie.type === 'video' && <Video size={48} className="text-gray-600" />}
            {freebie.type === 'link' && <LinkIcon size={48} className="text-gray-600" />}
          </div>
        )}
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            freebie.active 
              ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' 
              : 'bg-gray-700/50 text-gray-400 border-gray-600'
          }`}>
            {freebie.active ? 'Aktiv' : 'Entwurf'}
          </span>
        </div>
        {/* Type Badge */}
        <div className="absolute top-3 right-3">
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-900/80 text-gray-300">
            {freebie.type === 'pdf' && 'PDF'}
            {freebie.type === 'video' && 'Video'}
            {freebie.type === 'link' && 'Link'}
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-white font-semibold text-lg line-clamp-1" title={freebie.title}>
            {freebie.title}
          </h3>
          <button 
            onClick={handleDeleteClick}
            className="text-gray-500 hover:text-red-400 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{freebie.description}</p>

        {/* Mini Stats Grid */}
        <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-gray-800 mt-auto">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
              <Eye size={12} /> Views
            </div>
            <span className="text-white font-mono font-medium">{freebie.views || 0}</span>
          </div>
          <div className="text-center border-l border-gray-800">
            <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
              <Users size={12} /> Leads
            </div>
            <span className="text-white font-mono font-medium">{freebie.leads || 0}</span>
          </div>
          <div className="text-center border-l border-gray-800">
            <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
              <BarChart2 size={12} /> CR%
            </div>
            <span className={`font-mono font-bold ${cr > 20 ? 'text-teal-400' : cr > 10 ? 'text-yellow-500' : 'text-gray-400'}`}>
              {cr}%
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 mt-4">
          <button 
            onClick={handleEditClick}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm py-2 rounded-lg border border-gray-700 transition-colors"
          >
            <Edit size={14} /> Bearbeiten
          </button>
          <button 
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-sm py-2 rounded-lg border border-teal-500/20 transition-colors"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Kopiert!' : 'Link'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Empty State Komponente
const EmptyState = ({ onCreateNew }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
    <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-6">
      <FileText size={32} className="text-gray-600" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">Noch keine Freebies</h3>
    <p className="text-gray-400 text-center max-w-md mb-6">
      Erstelle dein erstes Freebie und generiere automatisch Leads über deine eigene Landing Page.
    </p>
    <button
      onClick={onCreateNew}
      className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-medium px-6 py-3 rounded-lg transition-colors"
    >
      <Plus size={20} />
      Erstes Freebie erstellen
    </button>
  </div>
);

// Haupt Page
const FreebiesPage = () => {
  const navigate = useNavigate();
  const [freebies, setFreebies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'draft'

  useEffect(() => {
    loadFreebies();
  }, []);

  const loadFreebies = async () => {
    try {
      setLoading(true);
      const result = await api.get('/freebies');
      console.log('[Freebies] API Response:', result);
      
      // Backend gibt { freebies: [...] } zurück
      const freebiesList = result?.freebies || result?.data || (Array.isArray(result) ? result : []);
      console.log('[Freebies] Parsed freebies:', freebiesList);
      setFreebies(freebiesList);
    } catch (error) {
      console.error('[Freebies] Load error:', error);
      setFreebies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    navigate('/freebies/create');
  };

  const handleCardClick = (freebie) => {
    navigate(`/freebies/${freebie.id}`);
  };

  const handleEdit = (freebie) => {
    navigate(`/freebies/${freebie.id}/edit`);
  };

  const handleDelete = async (freebie) => {
    if (!confirm(`"${freebie.title}" wirklich löschen?`)) return;
    try {
      await api.delete(`/freebies/${freebie.id}`);
      setFreebies(prev => prev.filter(f => f.id !== freebie.id));
    } catch (error) {
      console.error('Error deleting freebie:', error);
    }
  };

  const filteredFreebies = freebies.filter(f => {
    if (filter === 'active') return f.active;
    if (filter === 'draft') return !f.active;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Freebies & Lead Magnets</h1>
            <p className="text-gray-400 mt-1">Erstelle Landing Pages und generiere automatisch Leads.</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={20} />
            Neues Freebie
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'all', label: 'Alle' },
            { key: 'active', label: 'Aktiv' },
            { key: 'draft', label: 'Entwürfe' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
              }`}
            >
              {tab.label}
              {tab.key === 'all' && ` (${freebies.length})`}
              {tab.key === 'active' && ` (${freebies.filter(f => f.active).length})`}
              {tab.key === 'draft' && ` (${freebies.filter(f => !f.active).length})`}
            </button>
          ))}
        </div>

        {/* Freebies Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFreebies.length > 0 ? (
              filteredFreebies.map(freebie => (
                <FreebieCard
                  key={freebie.id}
                  freebie={freebie}
                  onCardClick={handleCardClick}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            ) : (
              <EmptyState onCreateNew={handleCreateNew} />
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default FreebiesPage;

