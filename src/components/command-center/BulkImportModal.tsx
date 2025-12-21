/**
 * Bulk Import Modal Component - Command Center V3
 * 
 * Erlaubt das Hochladen mehrerer Screenshots und Extraktion/Import aller Leads mit einem Klick.
 */

import { useState, useCallback } from 'react';
import { X, Upload, Image, Check, Loader2, AlertCircle, Users } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface ExtractedLead {
  name: string;
  platform?: string;
  username?: string;
  phone?: string;
  email?: string;
  company?: string;
  bio?: string;
  last_message?: string;
  has_unread?: boolean;
  selected?: boolean;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function BulkImportModal({
  isOpen,
  onClose,
  onImportComplete
}: BulkImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [extractedLeads, setExtractedLeads] = useState<ExtractedLead[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  
  // Default settings
  const [defaultStatus, setDefaultStatus] = useState('new');
  const [defaultTemperature, setDefaultTemperature] = useState('cold');
  const [createFollowup, setCreateFollowup] = useState(true);
  const [followupDays, setFollowupDays] = useState(3);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => 
      f.type.startsWith('image/')
    );
    processFiles(files);
  }, []);

  const processFiles = async (files: File[]) => {
    const newImages: string[] = [];
    const newFiles: File[] = [];
    
    for (const file of files) {
      const base64 = await fileToBase64(file);
      newImages.push(base64);
      newFiles.push(file);
    }
    
    setImages(prev => [...prev, ...newImages]);
    setImageFiles(prev => [...prev, ...newFiles]);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleExtract = async () => {
    if (images.length === 0) return;
    
    setIsExtracting(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/command-center/bulk-extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ images: images })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Alle Leads sind initial ausgewählt
      const leadsWithSelection = (data.leads || []).map((lead: ExtractedLead) => ({
        ...lead,
        selected: true
      }));
      
      setExtractedLeads(leadsWithSelection);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Fehler bei der Analyse');
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleLeadSelection = (index: number) => {
    setExtractedLeads(prev => prev.map((lead, i) => 
      i === index ? { ...lead, selected: !lead.selected } : lead
    ));
  };

  const toggleAll = () => {
    const allSelected = extractedLeads.every(l => l.selected);
    setExtractedLeads(prev => prev.map(lead => ({
      ...lead,
      selected: !allSelected
    })));
  };

  const handleImport = async () => {
    const selectedLeads = extractedLeads.filter(l => l.selected);
    if (selectedLeads.length === 0) return;
    
    setIsImporting(true);
    setStep('importing');
    setError(null);
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/command-center/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leads: selectedLeads,
          default_status: defaultStatus,
          default_temperature: defaultTemperature,
          create_followup: createFollowup,
          followup_days: followupDays
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      setImportResult(data);
      setStep('done');
      
      // Refresh parent
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Fehler beim Import');
      setStep('preview');
    } finally {
      setIsImporting(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index)); // Keep for future use (e.g. showing filename)
  };

  const resetModal = () => {
    setStep('upload');
    setImages([]);
    setImageFiles([]);
    setExtractedLeads([]);
    setError(null);
    setImportResult(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const selectedCount = extractedLeads.filter(l => l.selected).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-[#14202c] to-[#0a0a0f] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-cyan-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Bulk Import</h2>
              <p className="text-sm text-gray-400">
                {step === 'upload' && 'Screenshots hochladen'}
                {step === 'preview' && `${extractedLeads.length} Leads gefunden`}
                {step === 'importing' && 'Importiere...'}
                {step === 'done' && 'Import abgeschlossen!'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-cyan-500/30 rounded-xl p-8 text-center hover:border-cyan-500/60 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
                <p className="text-white font-medium mb-2">
                  Screenshots hierher ziehen oder klicken
                </p>
                <p className="text-gray-400 text-sm">
                  Instagram, WhatsApp, Facebook, LinkedIn - CHIEF findet alle Leads!
                </p>
              </div>

              {/* Preview Grid */}
              {images.length > 0 && (
                <div>
                  <p className="text-white font-medium mb-3">
                    {images.length} Bild{images.length > 1 ? 'er' : ''} hochgeladen
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Screenshot ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-800"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(idx);
                          }}
                          className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-6">
              {/* Settings */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Standard Status</label>
                  <select
                    value={defaultStatus}
                    onChange={(e) => setDefaultStatus(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="new">Neu</option>
                    <option value="contacted">Kontaktiert</option>
                    <option value="qualified">Qualifiziert</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Standard Temperatur</label>
                  <select
                    value={defaultTemperature}
                    onChange={(e) => setDefaultTemperature(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="cold">❄️ Cold</option>
                    <option value="warm">☀️ Warm</option>
                    <option value="hot">🔥 Hot</option>
                  </select>
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="create-followup"
                    checked={createFollowup}
                    onChange={(e) => setCreateFollowup(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#0a0a0f] border-gray-700"
                  />
                  <label htmlFor="create-followup" className="text-white text-sm">
                    Follow-up erstellen in
                  </label>
                  <input
                    type="number"
                    value={followupDays}
                    onChange={(e) => setFollowupDays(parseInt(e.target.value) || 3)}
                    className="w-16 bg-[#0a0a0f] border border-gray-700 rounded-lg px-2 py-1 text-white text-center text-sm"
                    min={1}
                    max={30}
                  />
                  <span className="text-gray-400 text-sm">Tagen</span>
                </div>
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleAll}
                  className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                >
                  {extractedLeads.every(l => l.selected) ? 'Alle abwählen' : 'Alle auswählen'}
                </button>
                <span className="text-gray-400 text-sm">
                  {selectedCount} von {extractedLeads.length} ausgewählt
                </span>
              </div>

              {/* Leads List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {extractedLeads.map((lead, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleLeadSelection(idx)}
                    className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                      lead.selected 
                        ? 'bg-cyan-500/20 border border-cyan-500/30' 
                        : 'bg-gray-900/50 border border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      lead.selected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-500'
                    }`}>
                      {lead.selected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-medium text-sm">
                        {lead.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium truncate">{lead.name}</p>
                        {lead.has_unread && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
                            Ungelesen
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-400 flex-wrap">
                        {lead.platform && (
                          <span className="capitalize">{lead.platform}</span>
                        )}
                        {lead.username && (
                          <span>{lead.username}</span>
                        )}
                        {lead.phone && (
                          <span>{lead.phone}</span>
                        )}
                      </div>
                      {lead.last_message && (
                        <p className="text-xs text-gray-500 truncate mt-1">
                          "{lead.last_message}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
              <p className="text-white font-medium">Importiere {selectedCount} Leads...</p>
              <p className="text-gray-400 text-sm">Das kann einen Moment dauern</p>
            </div>
          )}

          {/* STEP 4: Done */}
          {step === 'done' && importResult && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-white font-medium text-xl mb-2">
                {importResult.imported_count} Leads importiert!
              </p>
              {importResult.failed_count > 0 && (
                <p className="text-yellow-400 text-sm">
                  {importResult.failed_count} konnten nicht importiert werden
                </p>
              )}
              {createFollowup && (
                <p className="text-gray-400 text-sm mt-2">
                  ✓ Follow-ups wurden erstellt
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-cyan-500/10">
          {step === 'upload' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleExtract}
                disabled={images.length === 0 || isExtracting}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analysiere...
                  </>
                ) : (
                  <>
                    <Image className="w-4 h-4" />
                    {images.length} Bild{images.length > 1 ? 'er' : ''} analysieren
                  </>
                )}
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                ← Zurück
              </button>
              <button
                onClick={handleImport}
                disabled={selectedCount === 0 || isImporting}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                {selectedCount} Leads importieren
              </button>
            </>
          )}

          {step === 'done' && (
            <button
              onClick={handleClose}
              className="ml-auto px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium"
            >
              Fertig
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

