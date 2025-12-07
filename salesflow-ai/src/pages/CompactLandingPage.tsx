/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - COMPACT LANDING PAGE                                     ║
 * ║  Conversion-optimierte, kompakte Landing Page                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useNavigate } from 'react-router-dom';
import { getLandingVerticals } from '../utils/verticalUtils';
import '../styles/compact-landing.css';

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function CompactLandingPage() {
  const navigate = useNavigate();
  const verticals = getLandingVerticals();

  const handleCTAClick = () => {
    navigate('/signup');
  };

  return (
    <div className="compact-landing">
      {/* Hero Section */}
      <section className="compact-hero">
        <div className="compact-hero-inner">
          <div className="compact-logo">🚀 SalesFlow AI</div>
          <h1 className="compact-headline">
            "Verkaufen ohne Zeitfresser."
          </h1>
          <p className="compact-subheadline">
            Die KI übernimmt Listen, Protokolle, Follow-ups.
            <br />
            Du hast Zeit für das, was zählt.
          </p>
          <button onClick={handleCTAClick} className="compact-cta-primary">
            Kostenlos starten
            <ArrowIcon />
          </button>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="compact-values">
        <div className="compact-values-inner">
          <h2 className="compact-section-title">Was du zurückbekommst:</h2>
          
          <div className="compact-value-grid">
            <div className="compact-value-card">
              <div className="compact-value-icon">⏱️</div>
              <h3 className="compact-value-title">5+ Stunden pro Woche</h3>
              <p className="compact-value-description">
                Keine manuellen Listen mehr
              </p>
            </div>

            <div className="compact-value-card">
              <div className="compact-value-icon">🧠</div>
              <h3 className="compact-value-title">Null Denkarbeit bei Follow-ups</h3>
              <p className="compact-value-description">
                KI schreibt, du klickst "Senden"
              </p>
            </div>

            <div className="compact-value-card">
              <div className="compact-value-icon">📱</div>
              <h3 className="compact-value-title">Alle Kanäle an einem Ort</h3>
              <p className="compact-value-description">
                WhatsApp, E-Mail, LinkedIn – eine Inbox
              </p>
            </div>

            <div className="compact-value-card">
              <div className="compact-value-icon">💬</div>
              <h3 className="compact-value-title">Nie wieder sprachlos</h3>
              <p className="compact-value-description">
                KI-Copilot für jedes Gespräch
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Verticals Section */}
      <section className="compact-verticals">
        <div className="compact-verticals-inner">
          <h2 className="compact-section-title">Funktioniert für:</h2>
          
          <div className="compact-verticals-grid">
            {verticals.map((vertical) => (
              <div 
                key={vertical.id} 
                className="compact-vertical-item"
                onClick={() => navigate(`/${vertical.slug}`)}
              >
                <span className="compact-vertical-icon">{vertical.icon}</span>
                <span className="compact-vertical-label">{vertical.label}</span>
              </div>
            ))}
          </div>

          <p className="compact-verticals-note">
            ... und jeden anderen, der verkauft.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="compact-final-cta">
        <div className="compact-final-cta-inner">
          <button onClick={handleCTAClick} className="compact-cta-secondary">
            Jetzt kostenlos testen
            <ArrowIcon />
          </button>
          <p className="compact-cta-note">
            Keine Kreditkarte. In 2 Minuten startklar.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="compact-footer">
        <div className="compact-footer-inner">
          <div className="compact-footer-links">
            <a href="/">Hauptseite</a>
            <a href="#">Impressum</a>
            <a href="#">Datenschutz</a>
          </div>
          <p className="compact-footer-copy">
            © 2025 Sales Flow AI. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  );
}

