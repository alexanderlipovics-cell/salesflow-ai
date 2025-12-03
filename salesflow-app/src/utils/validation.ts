/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  VALIDATION UTILITIES                                                      ║
 * ║  Input-Validierung für Formulare und API-Anfragen                          ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export type ValidationRule<T = any> = (value: T, fieldName: string) => string | null;

// =============================================================================
// BASIC VALIDATORS
// =============================================================================

export const validators = {
  required: (value: any, fieldName: string): string | null => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      return `${fieldName} ist erforderlich`;
    }
    return null;
  },
  
  email: (value: string, fieldName: string): string | null => {
    if (!value) return null; // Nur validieren wenn vorhanden
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return `${fieldName} muss eine gültige E-Mail-Adresse sein`;
    }
    return null;
  },
  
  phone: (value: string, fieldName: string): string | null => {
    if (!value) return null;
    const phoneRegex = /^[\d\s\-\+\(\)]{8,20}$/;
    if (!phoneRegex.test(value)) {
      return `${fieldName} muss eine gültige Telefonnummer sein`;
    }
    return null;
  },
  
  minLength: (min: number) => (value: string, fieldName: string): string | null => {
    if (!value) return null;
    if (value.length < min) {
      return `${fieldName} muss mindestens ${min} Zeichen haben`;
    }
    return null;
  },
  
  maxLength: (max: number) => (value: string, fieldName: string): string | null => {
    if (!value) return null;
    if (value.length > max) {
      return `${fieldName} darf maximal ${max} Zeichen haben`;
    }
    return null;
  },
  
  min: (minValue: number) => (value: number, fieldName: string): string | null => {
    if (value === null || value === undefined) return null;
    if (value < minValue) {
      return `${fieldName} muss mindestens ${minValue} sein`;
    }
    return null;
  },
  
  max: (maxValue: number) => (value: number, fieldName: string): string | null => {
    if (value === null || value === undefined) return null;
    if (value > maxValue) {
      return `${fieldName} darf maximal ${maxValue} sein`;
    }
    return null;
  },
  
  pattern: (regex: RegExp, message: string) => (value: string, fieldName: string): string | null => {
    if (!value) return null;
    if (!regex.test(value)) {
      return message || `${fieldName} hat ein ungültiges Format`;
    }
    return null;
  },
  
  url: (value: string, fieldName: string): string | null => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return `${fieldName} muss eine gültige URL sein`;
    }
  },
  
  date: (value: string, fieldName: string): string | null => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return `${fieldName} muss ein gültiges Datum sein`;
    }
    return null;
  },
  
  futureDate: (value: string, fieldName: string): string | null => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return `${fieldName} muss ein gültiges Datum sein`;
    }
    if (date <= new Date()) {
      return `${fieldName} muss in der Zukunft liegen`;
    }
    return null;
  },
  
  pastDate: (value: string, fieldName: string): string | null => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return `${fieldName} muss ein gültiges Datum sein`;
    }
    if (date >= new Date()) {
      return `${fieldName} muss in der Vergangenheit liegen`;
    }
    return null;
  },
  
  oneOf: <T>(options: T[]) => (value: T, fieldName: string): string | null => {
    if (!value) return null;
    if (!options.includes(value)) {
      return `${fieldName} muss einer der folgenden Werte sein: ${options.join(', ')}`;
    }
    return null;
  },
};

// =============================================================================
// VALIDATION FUNCTION
// =============================================================================

export function validate<T extends Record<string, any>>(
  data: T,
  schema: Record<keyof T, ValidationRule[]>
): ValidationResult {
  const errors: Record<string, string> = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    const fieldName = formatFieldName(field);
    
    for (const rule of rules as ValidationRule[]) {
      const error = rule(value, fieldName);
      if (error) {
        errors[field] = error;
        break; // Nur ersten Fehler pro Feld
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .replace(/^\w/, c => c.toUpperCase());
}

// =============================================================================
// SANITIZATION
// =============================================================================

export const sanitize = {
  trim: (value: string): string => value?.trim() || '',
  
  toLowerCase: (value: string): string => value?.toLowerCase() || '',
  
  toUpperCase: (value: string): string => value?.toUpperCase() || '',
  
  removeExtraSpaces: (value: string): string => value?.replace(/\s+/g, ' ').trim() || '',
  
  stripHtml: (value: string): string => value?.replace(/<[^>]*>/g, '') || '',
  
  alphanumeric: (value: string): string => value?.replace(/[^a-zA-Z0-9]/g, '') || '',
  
  numeric: (value: string): string => value?.replace(/[^0-9]/g, '') || '',
  
  phone: (value: string): string => value?.replace(/[^\d\+\-\s\(\)]/g, '') || '',
  
  email: (value: string): string => value?.toLowerCase().trim() || '',
};

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const commonSchemas = {
  contact: {
    name: [validators.required, validators.minLength(2), validators.maxLength(100)],
    email: [validators.email],
    phone: [validators.phone],
  },
  
  lead: {
    name: [validators.required, validators.minLength(2)],
    email: [validators.email],
    phone: [validators.phone],
    status: [validators.oneOf(['new', 'contacted', 'qualified', 'converted', 'lost'])],
  },
  
  login: {
    email: [validators.required, validators.email],
    password: [validators.required, validators.minLength(6)],
  },
  
  register: {
    email: [validators.required, validators.email],
    password: [validators.required, validators.minLength(8)],
    fullName: [validators.required, validators.minLength(2)],
  },
};

export default { validators, validate, sanitize, commonSchemas };

