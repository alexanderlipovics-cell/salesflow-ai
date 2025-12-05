export interface Lead {
  id: string;
  name: string;
  status: 'NEW' | 'CONVERSATION' | 'CLOSING' | 'GHOSTING';
  lastMsg: string;
  time: string;
  temperature: number;
  unread: boolean;
}

export interface ScriptOption {
  id: string;
  label: string;
  tone: 'EMPATHIC' | 'DIRECT' | 'CREATIVE';
  content: string;
  tags: string[];
}
