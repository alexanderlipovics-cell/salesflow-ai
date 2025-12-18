import React from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { Button } from './ui/button';
import { openWhatsApp, generateWhatsAppLink, isValidWhatsAppPhone } from '../utils/whatsapp';

interface WhatsAppButtonProps {
  phone: string;
  message?: string;
  variant?: 'icon' | 'button' | 'text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phone,
  message,
  variant = 'button',
  size = 'sm',
  className = '',
  disabled = false,
  children
}) => {
  const isValid = isValidWhatsAppPhone(phone);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click handlers
    openWhatsApp(phone, message);
  };

  if (!isValid) {
    return null; // Don't render if phone is invalid
  }

  const baseClasses = 'inline-flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2';

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`${baseClasses} p-2 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title="WhatsApp öffnen"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`${baseClasses} text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 underline disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {children || 'WhatsApp'}
      </button>
    );
  }

  // Default 'button' variant
  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      size={size}
      className={`bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700 ${className}`}
    >
      <MessageCircle className="w-4 h-4" />
      {children || 'WhatsApp'}
    </Button>
  );
};

// Specialized components for different use cases

export const WhatsAppQuickAction: React.FC<{
  phone: string;
  message?: string;
  className?: string;
}> = ({ phone, message, className = '' }) => (
  <WhatsAppButton
    phone={phone}
    message={message}
    variant="icon"
    className={className}
  />
);

export const WhatsAppCallAction: React.FC<{
  phone: string;
  message?: string;
  className?: string;
}> = ({ phone, message, className = '' }) => (
  <WhatsAppButton
    phone={phone}
    message={message}
    variant="button"
    size="sm"
    className={`flex items-center gap-1 ${className}`}
  >
    <Phone className="w-4 h-4" />
    Anrufen
  </WhatsAppButton>
);

export const WhatsAppMessageLink: React.FC<{
  phone: string;
  message?: string;
  children?: React.ReactNode;
  className?: string;
}> = ({ phone, message, children, className = '' }) => (
  <WhatsAppButton
    phone={message ? phone : ''}
    message={message}
    variant="text"
    className={className}
  >
    {children || message || 'WhatsApp Nachricht'}
  </WhatsAppButton>
);

export default WhatsAppButton;
