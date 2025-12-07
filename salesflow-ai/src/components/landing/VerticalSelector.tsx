/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  SALES FLOW AI - VERTICAL SELECTOR                                         ║
 * ║  Landing Page Komponente für Vertical-Auswahl                             ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLandingVerticals, getVerticalLandingPath } from '../../utils/verticalUtils';
import './VerticalSelector.css';

interface VerticalSelectorProps {
  onSelect?: (verticalId: string) => void;
  showDescription?: boolean;
  compact?: boolean;
}

export function VerticalSelector({ 
  onSelect, 
  showDescription = true,
  compact = false 
}: VerticalSelectorProps) {
  const navigate = useNavigate();
  const [selectedVertical, setSelectedVertical] = useState<string | null>(null);
  const verticals = getLandingVerticals();

  const handleSelect = (verticalId: string, slug: string) => {
    setSelectedVertical(verticalId);
    
    if (onSelect) {
      onSelect(verticalId);
    } else {
      // Standard: Navigiere zur Vertical-spezifischen Landing Page
      navigate(getVerticalLandingPath(verticalId), { 
        state: { verticalId, fromSelector: true } 
      });
    }
  };

  return (
    <section className="vertical-selector-section">
      <div className="vertical-selector-inner">
        <div className="vertical-selector-header">
          <h2 className="vertical-selector-title">
            In welcher Branche verkaufst du?
          </h2>
          {showDescription && (
            <p className="vertical-selector-subtitle">
              Wähle deine Branche für personalisierte Features und optimierte Workflows
            </p>
          )}
        </div>

        <div className={`vertical-selector-grid ${compact ? 'compact' : ''}`}>
          {verticals.map((vertical) => {
            const isSelected = selectedVertical === vertical.id;
            return (
              <button
                key={vertical.id}
                type="button"
                onClick={() => handleSelect(vertical.id, vertical.slug)}
                className={`vertical-card ${isSelected ? 'selected' : ''}`}
                style={{ 
                  '--vertical-color': vertical.color,
                } as React.CSSProperties}
                aria-label={`${vertical.label} auswählen`}
              >
                <div className="vertical-icon">{vertical.icon}</div>
                <div className="vertical-content">
                  <h3 className="vertical-label">{vertical.label}</h3>
                  {showDescription && (
                    <p className="vertical-description">{vertical.description}</p>
                  )}
                </div>
                {isSelected && (
                  <div className="vertical-checkmark">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {selectedVertical && (
          <div className="vertical-cta">
            <button
              type="button"
              onClick={() => navigate('/signup', { 
                state: { verticalId: selectedVertical } 
              })}
              className="btn-primary-vertical"
            >
              Kostenlos starten →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default VerticalSelector;

