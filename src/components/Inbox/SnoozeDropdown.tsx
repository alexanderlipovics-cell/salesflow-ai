/**
 * Snooze Dropdown Component
 * 
 * Dropdown für "Später" Button mit Zeitoptionen
 */

import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Snooze Options
const SNOOZE_OPTIONS = [
  { label: '1 Stunde', hours: 1 },
  { label: '4 Stunden', hours: 4 },
  { label: 'Morgen früh', hours: 24 },
  { label: '3 Tage', hours: 72 },
  { label: '1 Woche', hours: 168 },
];

interface SnoozeDropdownProps {
  followupId: string;
  onSnooze: (hours: number) => Promise<void>;
  disabled?: boolean;
}

export const SnoozeDropdown: React.FC<SnoozeDropdownProps> = ({
  followupId,
  onSnooze,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSnooze = async (hours: number) => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    try {
      await onSnooze(hours);
      toast.success(`Auf ${SNOOZE_OPTIONS.find(o => o.hours === hours)?.label || `${hours}h`} verschoben`);
      setIsOpen(false);
    } catch (error) {
      console.error('Snooze error:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Verschieben');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Später verschieben"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Clock className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Später</span>
        <ChevronDown 
          size={14} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 bg-[#1A202C] border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 min-w-[180px]">
          {SNOOZE_OPTIONS.map((option) => (
            <button
              key={option.hours}
              onClick={() => handleSnooze(option.hours)}
              disabled={isLoading}
              className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Clock className="w-3 h-3" />
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

