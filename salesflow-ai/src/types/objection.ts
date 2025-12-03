// ─────────────────────────────────────────────────────────────────
// Objection Brain Types
// ─────────────────────────────────────────────────────────────────

export type ObjectionCategory = 
  | 'price' 
  | 'timing' 
  | 'need' 
  | 'trust' 
  | 'competition' 
  | 'authority' 
  | 'other';

export type ResponseType = 'reframe' | 'question' | 'story' | 'fallback';

export interface Objection {
  id: string;
  text: string;
  category: ObjectionCategory;
  created_at?: string;
  updated_at?: string;
}

export interface ObjectionResponse {
  id: string;
  objection_id: string;
  response_text: string;
  response_type: ResponseType;
  follow_up_question?: string | null;
  success_rate?: number | null;
  vertical?: string | null;
  created_at?: string;
}

// View: objection_with_responses
export interface ObjectionWithResponses extends Objection {
  responses: ObjectionResponse[];
}

// Kategorie-Display-Konfiguration
export interface CategoryConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

// Response Type Display-Konfiguration
export interface ResponseTypeConfig {
  label: string;
  icon: string;
  color: string;
}

