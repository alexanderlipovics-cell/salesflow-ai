/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - VERTICAL LANDING PAGE                                   ║
 * ║  Branchen-spezifische Landing Pages                                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useParams, useNavigate } from 'react-router-dom';
import { getVerticalFromSlug, getLandingVerticals, VERTICALS_EXPORT as VERTICALS } from '../utils/verticalUtils';
import { VerticalSelector } from '../components/landing/VerticalSelector';
import '../styles/marketing-landing.css';

export default function VerticalLandingPage() {
  const navigate = useNavigate();
  const location = window.location.pathname;
  const slug = location.split('/').pop() || '';
  
  const verticalId = slug ? getVerticalFromSlug(slug) : null;
  const vertical = verticalId ? VERTICALS[verticalId] : null;
  const allVerticals = getLandingVerticals();

  // Falls kein gültiges Vertical gefunden, zeige Haupt-Landing
  if (!vertical || !verticalId) {
    return (
      <div className="marketing-landing">
        <div className="section-inner" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <h1>Vertical nicht gefunden</h1>
          <p>Die angeforderte Branche existiert nicht.</p>
          <a href="/" className="btn-primary">Zur Hauptseite</a>
        </div>
      </div>
    );
  }

  const handleSignup = () => {
    navigate('/signup', { 
      state: { verticalId, fromVerticalLanding: true } 
    });
  };

  return (
    <div className="marketing-landing">
      <div className="bg-gradient" aria-hidden="true" />

      <nav>
        <div className="nav-inner">
          <a href="/" className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-bg)" strokeWidth={2}>
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            Sales Flow AI
          </a>
          <a href="#contact" className="nav-cta">
            Kostenlos starten
          </a>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="hero" id="hero">
          <div className="hero-inner">
            <div className="hero-content">
              <div className="hero-badge" style={{ background: vertical.color + '20', color: vertical.color }}>
                {vertical.label}
              </div>
              <h1>
                Sales Flow AI für
                <br />
                <span className="accent" style={{ color: vertical.color }}>
                  {vertical.label}
                </span>
              </h1>
              <p className="hero-subtitle">
                Dein persönlicher KI-Copilot für {vertical.description.toLowerCase()}. 
                Nie wieder Follow-ups vergessen, perfekte Antworten auf Einwände, 
                und alles in deinem Stil.
              </p>
              <div className="hero-cta-group">
                <button onClick={handleSignup} className="btn-primary">
                  Kostenlos starten
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} style={{ width: 20, height: 20 }}>
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                </button>
                <a href="#features" className="btn-secondary">
                  Mehr erfahren
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Features für dieses Vertical */}
        <section id="features" className="features-section">
          <div className="section-inner">
            <div className="section-header">
              <p className="section-label">Features</p>
              <h2>Was Sales Flow AI für {vertical.label} kann</h2>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🤖</div>
                <h3>KI-Copilot in deinem Stil</h3>
                <p>
                  Schreibt WhatsApp- und E-Mail-Texte genau so, wie du es tust. 
                  Lernt deine Formulierungen und deinen Ton.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📅</div>
                <h3>Follow-ups nie vergessen</h3>
                <p>
                  Automatische Erinnerungen und vorgefertigte Sequenzen. 
                  Kein Lead bleibt mehr liegen.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💬</div>
                <h3>Perfekte Antworten auf Einwände</h3>
                <p>
                  Die häufigsten Einwände in deiner Branche? 
                  Sales Flow AI kennt die besten Antworten.
                </p>
              </div>
              {vertical.hasCompensationPlan && (
                <div className="feature-card">
                  <div className="feature-icon">💰</div>
                  <h3>Provisionen & Compensation Tracking</h3>
                  <p>
                    Übersicht über alle Provisionen, Compensation Plans 
                    und Einkommensprognosen.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Andere Verticals */}
        <section className="other-verticals-section">
          <div className="section-inner">
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>
              Auch für andere Branchen verfügbar
            </h2>
            <VerticalSelector compact showDescription={false} />
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section" id="contact">
          <div className="cta-box">
            <h2>Bereit für mehr Abschlüsse?</h2>
            <p>
              Starte kostenlos und erlebe, wie Sales Flow AI deinen Vertrieb 
              transformiert – speziell für {vertical.label}.
            </p>
            <button onClick={handleSignup} className="btn-primary">
              Kostenlos starten
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} style={{ width: 20, height: 20 }}>
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="logo-icon" style={{ width: 24, height: 24, borderRadius: 6 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-bg)" strokeWidth={2}>
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span>Sales Flow AI</span>
          </div>
          <div className="footer-links">
            <a href="/">Hauptseite</a>
            <a href="#">Impressum</a>
            <a href="#">Datenschutz</a>
          </div>
          <p className="footer-copy">© 2025 Sales Flow AI. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  );
}

