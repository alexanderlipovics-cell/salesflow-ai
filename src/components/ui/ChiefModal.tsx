import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose} 
      />

      {/* Modal Window */}
      <div 
        className={`relative bg-[#1A202C] border border-gray-700 rounded-2xl shadow-2xl w-full ${maxWidth} flex flex-col max-h-[90vh] overflow-hidden z-50`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto text-gray-200">
          {children}
        </div>

        {/* Footer */}
        {actions && (
          <div className="p-4 bg-[#131825] border-t border-gray-700 flex justify-end gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );

  // TELEPORT to document.body - escapes any overflow:hidden parent!
  return createPortal(modalContent, document.body);
}
