import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FileText, Video, Link as LinkIcon, Upload, ArrowLeft, ArrowRight,
  Check, Image, Rocket
} from 'lucide-react';
import { api } from '@/lib/api';

// Step Indicator
const StepIndicator = ({ currentStep, steps }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {steps.map((step, index) => (
      <React.Fragment key={step.key}>
        <div className={`flex items-center gap-2 ${index <= currentStep ? 'text-teal-400' : 'text-gray-500'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 ${
            index < currentStep 
              ? 'bg-teal-500 border-teal-500 text-white' 
              : index === currentStep 
                ? 'border-teal-500 text-teal-400' 
                : 'border-gray-600 text-gray-500'
          }`}>
            {index < currentStep ? <Check size={16} /> : index + 1}
          </div>
          <span className="hidden md:inline text-sm font-medium">{step.label}</span>
        </div>
        {index < steps.length - 1 && (
          <div className={`w-12 h-0.5 ${index < currentStep ? 'bg-teal-500' : 'bg-gray-700'}`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

// Type Selection Card
const TypeCard = ({ icon: Icon, title, description, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`p-6 rounded-xl border-2 text-left transition-all ${
      selected 
        ? 'border-teal-500 bg-teal-500/10' 
        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
    }`}
  >
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
      selected ? 'bg-teal-500/20 text-teal-400' : 'bg-gray-700 text-gray-400'
    }`}>
      <Icon size={24} />
    </div>
    <h3 className="text-white font-semibold mb-1">{title}</h3>
    <p className="text-gray-400 text-sm">{description}</p>
  </button>
);

// Form Field Toggle
const FieldToggle = ({ label, enabled, required, onChange, disabled }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
    <div>
      <span className="text-white text-sm">{label}</span>
      {required && <span className="text-teal-400 text-xs ml-2">(Pflicht)</span>}
    </div>
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-teal-500' : 'bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-0.5'
      }`} />
    </button>
  </div>
);

// Live Preview Component
const LivePreview = ({ data }) => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-xl max-w-sm mx-auto">
    {/* Preview Header */}
    <div className="bg-gray-100 px-4 py-3 flex items-center gap-2">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
      </div>
      <span className="text-xs text-gray-500 ml-2">alsales.ai/f/{data.slug || 'dein-freebie'}</span>
    </div>
    
    {/* Preview Content */}
    <div className="p-6">
      {data.cover_image ? (
        <img src={data.cover_image} alt="Cover" className="w-full h-32 object-cover rounded-lg mb-4" />
      ) : (
        <div className="w-full h-32 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
          <Image size={32} className="text-gray-400" />
        </div>
      )}
      
      <h2 className="text-gray-900 font-bold text-lg mb-2">
        {data.headline || 'Deine Headline hier...'}
      </h2>
      <p className="text-gray-600 text-sm mb-4">
        {data.description || 'Beschreibung deines Freebies...'}
      </p>
      
      <div className="space-y-3">
        <div className="bg-gray-100 rounded-lg px-4 py-2.5 text-gray-400 text-sm">
          Vorname
        </div>
        <div className="bg-gray-100 rounded-lg px-4 py-2.5 text-gray-400 text-sm">
          E-Mail
        </div>
        {data.fields?.phone && (
          <div className="bg-gray-100 rounded-lg px-4 py-2.5 text-gray-400 text-sm">
            Telefon
          </div>
        )}
      </div>
      
      <button className="w-full mt-4 bg-teal-600 text-white font-semibold py-3 rounded-lg">
        {data.cta_text || 'Jetzt herunterladen'}
      </button>
    </div>
  </div>
);

// Main Wizard Component
const FreebieWizardPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: 'pdf', // 'pdf', 'video', 'link'
    title: '',
    file_url: '',
    video_url: '',
    external_link: '',
    headline: '',
    description: '',
    cover_image: '',
    cta_text: 'Jetzt kostenlos herunterladen',
    slug: '',
    fields: {
      first_name: true,
      email: true,
      last_name: false,
      phone: false,
      company: false
    },
    active: false
  });

  const steps = [
    { key: 'type', label: 'Typ wählen' },
    { key: 'content', label: 'Inhalt' },
    { key: 'design', label: 'Landing Page' },
    { key: 'fields', label: 'Formular' },
    { key: 'publish', label: 'Veröffentlichen' }
  ];

  useEffect(() => {
    if (isEditing) {
      loadFreebie();
    }
  }, [id]);

  const loadFreebie = async () => {
    try {
      const data = await api.get(`/freebies/${id}`);
      setFormData(data);
    } catch (error) {
      console.error('Error loading freebie:', error);
      navigate('/freebies');
    }
  };

  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c]))
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (title) => {
    updateFormData({ 
      title, 
      slug: formData.slug || generateSlug(title),
      headline: formData.headline || title
    });
  };

  const handleSave = async (publish = false) => {
    try {
      setSaving(true);
      
      // Feldnamen an Backend anpassen!
      const payload = {
        title: formData.title,
        headline: formData.headline,
        description: formData.description,
        // file_url je nach Typ
        file_url: formData.type === 'pdf' ? formData.file_url 
                 : formData.type === 'video' ? formData.video_url 
                 : formData.external_link,
        file_type: formData.type,
        // Frontend: cover_image → Backend: thumbnail_url
        thumbnail_url: formData.cover_image || '',
        // Frontend: cta_text → Backend: button_text  
        button_text: formData.cta_text || 'Jetzt herunterladen',
        // Frontend: fields.phone → Backend: collect_phone
        collect_phone: formData.fields?.phone || false,
        collect_company: formData.fields?.company || false,
        collect_last_name: formData.fields?.last_name || false,
        slug: formData.slug,
        is_active: publish
      };

      console.log('[Freebie] Saving:', payload);

      let result;
      if (isEditing && id) {
        result = await api.patch(`/freebies/${id}`, payload);
      } else {
        result = await api.post('/freebies', payload);
      }

      console.log('[Freebie] Result:', result);

      // Backend gibt { success: true, freebie: {...} } zurück
      if (result?.success || result?.freebie) {
        navigate('/freebies');
      } else {
        throw new Error(result?.detail || 'Speichern fehlgeschlagen');
      }
      
    } catch (error) {
      console.error('[Freebie] Error:', error);
      alert('Fehler: ' + (error.message || 'Beim Speichern ist ein Fehler aufgetreten'));
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return formData.type;
      case 1: return formData.title && (formData.file_url || formData.video_url || formData.external_link);
      case 2: return formData.headline;
      case 3: return true;
      case 4: return formData.slug;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/freebies')}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isEditing ? 'Freebie bearbeiten' : 'Neues Freebie erstellen'}
            </h1>
            <p className="text-gray-400">Schritt {currentStep + 1} von {steps.length}</p>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} steps={steps} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left: Form */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            
            {/* Step 0: Type Selection */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white mb-6">Welche Art von Freebie?</h2>
                <div className="grid gap-4">
                  <TypeCard
                    icon={FileText}
                    title="PDF Download"
                    description="E-Book, Guide, Checkliste, Whitepaper"
                    selected={formData.type === 'pdf'}
                    onClick={() => updateFormData({ type: 'pdf' })}
                  />
                  <TypeCard
                    icon={Video}
                    title="Video"
                    description="YouTube, Vimeo oder eigenes Video"
                    selected={formData.type === 'video'}
                    onClick={() => updateFormData({ type: 'video' })}
                  />
                  <TypeCard
                    icon={LinkIcon}
                    title="Externer Link"
                    description="Weiterleitung zu Calendly, Webinar, etc."
                    selected={formData.type === 'link'}
                    onClick={() => updateFormData({ type: 'link' })}
                  />
                </div>
              </div>
            )}

            {/* Step 1: Content */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-6">Dein Freebie Inhalt</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Titel (intern)</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="z.B. Ernährungs-Guide 2025"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none"
                  />
                </div>

                {formData.type === 'pdf' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">PDF Datei</label>
                    <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-teal-500/50 transition-colors cursor-pointer">
                      <Upload size={32} className="mx-auto mb-2 text-gray-500" />
                      <p className="text-gray-400 text-sm">PDF hier hochladen oder URL eingeben</p>
                      <input
                        type="text"
                        value={formData.file_url}
                        onChange={(e) => updateFormData({ file_url: e.target.value })}
                        placeholder="https://example.com/freebie.pdf"
                        className="mt-4 w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-teal-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                {formData.type === 'video' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Video URL</label>
                    <input
                      type="text"
                      value={formData.video_url}
                      onChange={(e) => updateFormData({ video_url: e.target.value })}
                      placeholder="https://youtube.com/watch?v=... oder https://vimeo.com/..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none"
                    />
                  </div>
                )}

                {formData.type === 'link' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Ziel-URL</label>
                    <input
                      type="text"
                      value={formData.external_link}
                      onChange={(e) => updateFormData({ external_link: e.target.value })}
                      placeholder="https://calendly.com/dein-link"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Landing Page Design */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-6">Landing Page Design</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Headline</label>
                  <input
                    type="text"
                    value={formData.headline}
                    onChange={(e) => updateFormData({ headline: e.target.value })}
                    placeholder="z.B. Gratis: 10 Tipps für mehr Energie"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Beschreibung</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateFormData({ description: e.target.value })}
                    placeholder="Erkläre kurz den Mehrwert..."
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Cover Bild URL</label>
                  <input
                    type="text"
                    value={formData.cover_image}
                    onChange={(e) => updateFormData({ cover_image: e.target.value })}
                    placeholder="https://example.com/cover.jpg"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Button Text</label>
                  <input
                    type="text"
                    value={formData.cta_text}
                    onChange={(e) => updateFormData({ cta_text: e.target.value })}
                    placeholder="Jetzt kostenlos herunterladen"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-teal-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Form Fields */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-6">Formular Felder</h2>
                <p className="text-gray-400 text-sm mb-4">Wähle welche Daten du erfassen möchtest.</p>
                
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <FieldToggle 
                    label="Vorname" 
                    enabled={formData.fields.first_name} 
                    required 
                    disabled
                    onChange={() => {}}
                  />
                  <FieldToggle 
                    label="E-Mail" 
                    enabled={formData.fields.email} 
                    required 
                    disabled
                    onChange={() => {}}
                  />
                  <FieldToggle 
                    label="Nachname" 
                    enabled={formData.fields.last_name}
                    onChange={(v) => updateFormData({ fields: { ...formData.fields, last_name: v } })}
                  />
                  <FieldToggle 
                    label="Telefon" 
                    enabled={formData.fields.phone}
                    onChange={(v) => updateFormData({ fields: { ...formData.fields, phone: v } })}
                  />
                  <FieldToggle 
                    label="Firma" 
                    enabled={formData.fields.company}
                    onChange={(v) => updateFormData({ fields: { ...formData.fields, company: v } })}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Publish */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white mb-6">Veröffentlichen</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">URL Slug</label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">alsales.ai/f/</span>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => updateFormData({ slug: generateSlug(e.target.value) })}
                      placeholder="dein-freebie"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-teal-500 outline-none"
                    />
                  </div>
                </div>

                <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-4">
                  <h4 className="text-teal-400 font-medium mb-2">🚀 Bereit zum Start?</h4>
                  <p className="text-gray-400 text-sm">
                    Deine Landing Page wird unter folgender URL erreichbar sein:
                  </p>
                  <p className="text-white font-mono mt-2 bg-gray-800 px-3 py-2 rounded">
                    {window.location.origin}/f/{formData.slug || 'dein-slug'}
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Right: Preview */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 text-sm font-medium">Live Vorschau</h3>
                <span className="text-xs text-gray-600">Aktualisiert automatisch</span>
              </div>
              <LivePreview data={formData} />
            </div>
          </div>

        </div>

        {/* Footer Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-800">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-6 py-2.5 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft size={20} />
            Zurück
          </button>

          <div className="flex gap-3">
            {currentStep === steps.length - 1 ? (
              <>
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="px-6 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Als Entwurf speichern
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving || !canProceed()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-500 disabled:opacity-50 transition-colors"
                >
                  <Rocket size={20} />
                  Veröffentlichen
                </button>
              </>
            ) : (
              <button
                onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-500 disabled:opacity-50 transition-colors"
              >
                Weiter
                <ArrowRight size={20} />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FreebieWizardPage;

