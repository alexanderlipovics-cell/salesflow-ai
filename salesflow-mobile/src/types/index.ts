export interface Script {
  id: string;
  title: string;
  content: string;
  category: string;
  company?: string;
  vertical?: string;
  created_at?: string;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: string;
  notes?: string;
  created_at?: string;
  user_id?: string;
}

export interface Objection {
  id: string;
  objection_text: string;
  response: string;
  category: string;
  vertical?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

