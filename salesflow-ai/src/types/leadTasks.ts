export interface Lead {
  id: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  instagram: string | null;
  vertical: string | null;
  status: string | null;
  email?: string | null;
  notes?: string | null;
  source?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type LeadTaskStatus = "open" | "done" | "skipped";

export interface LeadTaskWithLead {
  id: string;
  lead_id?: string | null;
  task_type: "hunter" | "follow_up" | string;
  status: LeadTaskStatus;
  template_key?: string | null;
  due_at: string | null;
  note: string | null;
  lead: Lead | null;
}

