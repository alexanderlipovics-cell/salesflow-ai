import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Download, Play, ExternalLink, Loader2 } from 'lucide-react';

const PublicFreebiePage = () => {
  const { slug } = useParams();
  
  const [freebie, setFreebie] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: ''
  });

  useEffect(() => {
    loadFreebie();
  }, [slug]);

  const loadFreebie = async () => {
    try {
      setLoading(true);
      // Public endpoint - kein Auth nötig
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://salesflow-ai.onrender.com';
      const response = await fetch(`${API_BASE_URL}/api/freebies/public/${slug}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('not_found');
        } else {
          setError('server_error');
        }
        return;
      }
      
      const data = await response.json();
      setFreebie(data);
      // Backend tracked view automatisch beim GET
      
    } catch (err) {
      console.error('Error loading freebie:', err);
      setError('network_error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.email) {
      alert('Bitte fülle alle Pflichtfelder aus.');
      return;
    }

    try {
      setSubmitting(true);
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://salesflow-ai.onrender.com';
      const urlParams = new URLSearchParams(window.location.search);
      
      const response = await fetch(`${API_BASE_URL}/api/freebies/public/${slug}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${formData.first_name} ${formData.last_name || ''}`.trim(),
          email: formData.email,
          phone: formData.phone || '',
          company: formData.company || '',
          utm_source: urlParams.get('utm_source') || '',
          utm_medium: urlParams.get('utm_medium') || '',
          utm_campaign: urlParams.get('utm_campaign') || ''
        })
      });

      if (!response.ok) throw new Error('Submission failed');
      
      const result = await response.json();
      setSubmitResult(result);
      setSubmitted(true);
      
      // Wenn PDF, automatisch Download starten
      if (result.file_url && freebie.type === 'pdf') {
        window.open(result.file_url, '_blank');
      }
      
      // Wenn Link, nach kurzer Pause redirecten
      if (freebie.type === 'link' && freebie.external_link) {
        setTimeout(() => {
          window.location.href = freebie.external_link;
        }, 2000);
      }
      
    } catch (err) {
      console.error('Submit error:', err);
      alert('Es ist ein Fehler aufgetreten. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  // Error States
  if (error === 'not_found') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Seite nicht gefunden</h1>
          <p className="text-gray-600">Dieses Freebie existiert nicht oder wurde deaktiviert.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Fehler</h1>
          <p className="text-gray-600">Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.</p>
        </div>
      </div>
    );
  }

  // Success State
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vielen Dank!</h1>
          <p className="text-gray-600 mb-6">
            {freebie.type === 'pdf' && 'Dein Download startet gleich...'}
            {freebie.type === 'video' && 'Du wirst gleich zum Video weitergeleitet...'}
            {freebie.type === 'link' && 'Du wirst gleich weitergeleitet...'}
          </p>
          
          {freebie.type === 'pdf' && (submitResult?.file_url || freebie.file_url) && (
            <a
              href={submitResult?.file_url || freebie.file_url}
              download
              className="inline-flex items-center gap-2 bg-teal-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-700 transition-colors"
            >
              <Download size={20} />
              Jetzt herunterladen
            </a>
          )}
          
          {freebie.type === 'video' && freebie.video_url && (
            <a
              href={freebie.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-teal-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-700 transition-colors"
            >
              <Play size={20} />
              Video ansehen
            </a>
          )}
        </div>
      </div>
    );
  }

  // Main Landing Page (LIGHT MODE!)
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      
      {/* Minimal Navbar */}
      <nav className="p-4 md:p-6 flex justify-center md:justify-start">
        <span className="font-bold text-xl tracking-tight text-gray-900">
          {freebie.brand_name || 'Al Sales Systems'}
        </span>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-16 grid md:grid-cols-2 gap-12 items-center">
        
        {/* LEFT: Value Proposition */}
        <div className="space-y-6 order-2 md:order-1">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-gray-900">
            {freebie.headline}
          </h1>
          
          {freebie.subheadline && (
            <p className="text-lg text-gray-600 leading-relaxed">
              {freebie.subheadline}
            </p>
          )}
          
          {/* Bullet Points */}
          {freebie.bullet_points && freebie.bullet_points.length > 0 && (
            <ul className="space-y-3 mt-4">
              {freebie.bullet_points.map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-700">
                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          )}

          {/* Trust Indicators */}
          {freebie.download_count > 10 && (
            <div className="pt-6 flex items-center gap-4 opacity-70">
              <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white" />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                Bereits {freebie.download_count}+ Downloads
              </span>
            </div>
          )}
        </div>

        {/* RIGHT: Form */}
        <div className="order-1 md:order-2 relative z-10">
          {/* Decorative blur */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-teal-400/20 rounded-full blur-3xl hidden md:block" />
          
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 md:p-8 border border-gray-100 relative">
            
            {/* Cover Image */}
            {freebie.cover_image && (
              <div className="mb-6 rounded-lg overflow-hidden h-48 bg-gray-100">
                <img 
                  src={freebie.cover_image} 
                  alt={freebie.headline}
                  className="w-full h-full object-cover" 
                />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* First Name - Always required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dein Vorname *
                </label>
                <input 
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all" 
                  placeholder="Max" 
                />
              </div>
              
              {/* Last Name - Optional */}
              {freebie.collect_last_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dein Nachname
                  </label>
                  <input 
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all" 
                    placeholder="Mustermann" 
                  />
                </div>
              )}
              
              {/* Email - Always required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deine E-Mail Adresse *
                </label>
                <input 
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all" 
                  placeholder="max@beispiel.de" 
                />
              </div>

              {/* Phone - Optional */}
              {freebie.collect_phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefonnummer
                  </label>
                  <input 
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all" 
                    placeholder="+49 123 456789" 
                  />
                </div>
              )}

              {/* Company - Optional */}
              {freebie.collect_company && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Firma
                  </label>
                  <input 
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all" 
                    placeholder="Deine Firma" 
                  />
                </div>
              )}

              <button 
                type="submit"
                disabled={submitting}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-teal-600/20 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    {freebie.type === 'pdf' && <Download size={20} />}
                    {freebie.type === 'video' && <Play size={20} />}
                    {freebie.type === 'link' && <ExternalLink size={20} />}
                    {freebie.button_text || 'Jetzt kostenlos herunterladen'}
                  </>
                )}
              </button>
              
              <p className="text-xs text-center text-gray-400 mt-4">
                100% Gratis. Deine Daten sind sicher.
              </p>
            </form>
          </div>
        </div>

      </main>
      
      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 text-sm">
        Powered by Al Sales Systems
      </footer>
    </div>
  );
};

export default PublicFreebiePage;

