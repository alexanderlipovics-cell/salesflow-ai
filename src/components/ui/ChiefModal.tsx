import React, { useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

interface ChiefModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: string;
}

export default function ChiefModal({
  isOpen,
  onClose,
  title,
  children,
  icon,
  actions,
  maxWidth = 'max-w-2xl'
}: ChiefModalProps) {
  
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // BACKDROP - Fixed über dem ganzen Screen
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-opacity duration-200">
      
      {/* Click Outside Listener */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* MODAL FENSTER */}
      <div 
        className={`relative bg-[#1A202C] border border-gray-700 rounded-2xl shadow-2xl w-full ${maxWidth} flex flex-col max-h-[90vh] overflow-hidden transition-all duration-200 transform`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* HEADER */}
        <div className="bg-[#131825] p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            {icon || <Sparkles className="text-cyan-500 w-5 h-5" />}
            {title}
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENT - Scrollbar nur hier */}
        <div className="p-6 overflow-y-auto text-gray-200">
          {children}
        </div>

        {/* FOOTER (Optional) */}
        {actions && (
          <div className="p-4 bg-[#131825] border-t border-gray-700 flex justify-end gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

