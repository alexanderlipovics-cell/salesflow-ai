/**
 * Utility-Funktionen für Formatierung
 */

/**
 * Formatiert eine Zahl als Währung (EUR)
 */
export const formatCurrency = (value?: number): string => {
  if (!value) return '-';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(value);
};

/**
 * Formatiert ein Datum relativ zu heute
 */
export const formatRelativeDate = (dateString?: string): string => {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Gestern';
  if (diffDays < 7) return `Vor ${diffDays} Tagen`;
  if (diffDays < 30) return `Vor ${Math.floor(diffDays / 7)} Wochen`;
  if (diffDays < 365) return `Vor ${Math.floor(diffDays / 30)} Monaten`;
  
  return date.toLocaleDateString('de-DE', { 
    day: '2-digit', 
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formatiert eine Telefonnummer
 */
export const formatPhoneNumber = (phone?: string): string => {
  if (!phone) return '-';
  
  // Entferne alle Nicht-Ziffern
  const cleaned = phone.replace(/\D/g, '');
  
  // Deutsche Telefonnummer
  if (cleaned.startsWith('49')) {
    const areaCode = cleaned.substring(2, 5);
    const firstPart = cleaned.substring(5, 8);
    const secondPart = cleaned.substring(8);
    return `+49 ${areaCode} ${firstPart}${secondPart}`;
  }
  
  return phone;
};

/**
 * Kürzt einen langen Text
 */
export const truncate = (text: string, maxLength: number = 50): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Formatiert eine Prozentzahl
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Validiert eine E-Mail Adresse
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generiert Initialen aus einem Namen
 */
export const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

