import api from "@/lib/api";

export type ContactStatus =
  | "lead"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "customer"
  | "lost"
  | "nicht_interessiert"
  | "inactive"
  | "nurture";

export type LifecycleStage =
  | "subscriber"
  | "lead"
  | "mql"
  | "sql"
  | "opportunity"
  | "customer"
  | "evangelist";

export type PreferredChannel = "whatsapp" | "email" | "phone" | "instagram" | "linkedin";

export type Vertical = "network" | "immo" | "finance" | "coaching" | "generic";

export interface ContactListItem {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  city?: string | null;
  status: ContactStatus;
  score: number;
  vertical?: Vertical | null;
  tags: string[];
  last_contact_at?: string | null;
  next_followup_at?: string | null;
  owner_id?: string | null;
}

export interface ContactsResponse {
  items: ContactListItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface Contact extends ContactListItem {
  first_name?: string | null;
  last_name?: string | null;
  phone_secondary?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  website?: string | null;
  position?: string | null;
  company_size?: string | null;
  industry?: string | null;
  address?: string | null;
  district?: string | null;
  postal_code?: string | null;
  country: string;
  lat?: string | number | null;
  lng?: string | number | null;
  lifecycle_stage: LifecycleStage;
  source?: string | null;
  source_detail?: string | null;
  vertical?: Vertical | null;
  segment?: string | null;
  preferred_channel: PreferredChannel;
  formal_address: boolean;
  do_not_contact: boolean;
  custom_fields: Record<string, unknown>;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactQueryParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: ContactStatus[];
  lifecycleStage?: LifecycleStage[];
  vertical?: Vertical[];
  tags?: string[];
  ownerId?: string;
  city?: string;
  minScore?: number;
  maxScore?: number;
  hasPhone?: boolean;
  hasEmail?: boolean;
  followupOverdue?: boolean;
}

export interface ContactPayload {
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: ContactStatus;
  lifecycle_stage?: LifecycleStage;
  vertical?: Vertical;
  owner_id?: string;
  tags?: string[];
  notes?: string;
}

export interface Activity {
  id: string;
  type: string;
  direction?: "inbound" | "outbound";
  subject?: string | null;
  content?: string | null;
  occurred_at: string;
  metadata: Record<string, unknown>;
}

export async function fetchContacts(params: ContactQueryParams = {}): Promise<ContactsResponse> {
  const query = {
    page: params.page,
    per_page: params.perPage,
    sort_by: params.sortBy,
    sort_order: params.sortOrder,
    search: params.search,
    status: params.status,
    lifecycle_stage: params.lifecycleStage,
    vertical: params.vertical,
    tags: params.tags,
    owner_id: params.ownerId,
    city: params.city,
    min_score: params.minScore,
    max_score: params.maxScore,
    has_phone: params.hasPhone,
    has_email: params.hasEmail,
    followup_overdue: params.followupOverdue,
  };

  return api.get<ContactsResponse>("/contacts", { query });
}

export async function fetchContact(contactId: string): Promise<Contact> {
  return api.get<Contact>(`/contacts/${contactId}`);
}

export async function fetchContactActivities(
  contactId: string,
  limit = 50
): Promise<Activity[]> {
  return api.get<Activity[]>(`/contacts/${contactId}/activities`, {
    query: { limit },
  });
}

export async function createContact(payload: ContactPayload): Promise<Contact> {
  return api.post<Contact>("/contacts", payload);
}

export async function updateContact(contactId: string, payload: Partial<ContactPayload>) {
  return api.patch<Contact>(`/contacts/${contactId}`, payload);
}

// Deals ----------------------------------------------------------------------

export type DealStage = "new" | "qualified" | "meeting" | "proposal" | "negotiation" | "won" | "lost";

export interface DealListItem {
  id: string;
  title: string;
  value: string;
  stage: DealStage;
  probability: number;
  weighted_value: string;
  expected_close_date?: string | null;
  contact_id?: string | null;
  contact_name?: string | null;
  owner_id?: string | null;
  stage_entered_at: string;
}

export interface DealsResponse {
  items: DealListItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface DealQueryParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  stage?: DealStage[];
  pipeline?: string;
  ownerId?: string;
  contactId?: string;
  minValue?: number;
  maxValue?: number;
  closingThisMonth?: boolean;
}

export async function fetchDeals(params: DealQueryParams = {}): Promise<DealsResponse> {
  const query = {
    page: params.page,
    per_page: params.perPage,
    sort_by: params.sortBy,
    sort_order: params.sortOrder,
    search: params.search,
    stage: params.stage,
    pipeline: params.pipeline,
    owner_id: params.ownerId,
    contact_id: params.contactId,
    min_value: params.minValue,
    max_value: params.maxValue,
    closing_this_month: params.closingThisMonth,
  };

  return api.get<DealsResponse>("/deals", { query });
}

// Tasks ----------------------------------------------------------------------

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled" | "snoozed";
export type TaskType =
  | "followup"
  | "call"
  | "email"
  | "whatsapp"
  | "meeting"
  | "proposal"
  | "reminder"
  | "custom";
export type TaskPriority = "low" | "normal" | "high" | "urgent";

export interface TaskWithContext {
  id: string;
  type: TaskType;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  due_at: string;
  status: TaskStatus;
  contact_id?: string | null;
  contact_name?: string | null;
  deal_id?: string | null;
  deal_title?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  is_recurring: boolean;
  tags: string[];
}

export interface TasksResponse {
  items: TaskWithContext[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface TaskQueryParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: TaskStatus[];
  types?: TaskType[];
  priority?: TaskPriority[];
  assignedTo?: string;
  contactId?: string;
  dealId?: string;
  dueToday?: boolean;
  overdue?: boolean;
}

export async function fetchTasks(params: TaskQueryParams = {}): Promise<TasksResponse> {
  const query = {
    page: params.page,
    per_page: params.perPage,
    sort_by: params.sortBy,
    sort_order: params.sortOrder,
    status: params.status,
    type: params.types,
    priority: params.priority,
    assigned_to: params.assignedTo,
    contact_id: params.contactId,
    deal_id: params.dealId,
    due_today: params.dueToday,
    overdue: params.overdue,
  };

  return api.get<TasksResponse>("/tasks", { query });
}

