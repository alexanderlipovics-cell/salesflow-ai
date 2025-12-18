// ============================================
// 🎯 SALESFLOW AI - SHARED TYPES & INTERFACES
// ============================================
// Claude UI Components Types - Compatible with existing system

// ==================== LEAD TYPES ====================

export type LeadSource = 'facebook' | 'instagram' | 'linkedin' | 'manual' | 'referral' | 'website';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type LeadPriority = 'hot' | 'warm' | 'cold';
export type LeadIntent = 'high' | 'medium' | 'low' | 'unknown';

export interface Lead {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // Contact Info
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;

  // Lead Details
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  intent: LeadIntent;
  score: number; // 0-100

  // Business Info
  company?: string;
  position?: string;
  industry?: string;
  website?: string;

  // Engagement
  lastContactedAt?: Date;
  nextFollowUpAt?: Date;
  touchpoints: number;
  responseRate: number;

  // Assignment
  assignedTo?: string;
  teamId?: string;

  // Custom Fields
  tags: string[];
  notes: string;
  customFields: Record<string, unknown>;

  // Social Profiles
  socialProfiles?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export interface LeadActivity {
  id: string;
  leadId: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'status_change' | 'message';
  title: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  metadata?: Record<string, unknown>;
}

// ==================== USER & TEAM TYPES ====================

export type UserRole = 'admin' | 'manager' | 'member' | 'viewer';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  teamId?: string;
  createdAt: Date;
  settings: UserSettings;
  stats: UserStats;
}

export interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
}

export interface UserStats {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  avgResponseTime: number;
  thisMonthRevenue: number;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: TeamMember[];
  createdAt: Date;
  settings: TeamSettings;
  stats: TeamStats;
}

export interface TeamMember {
  userId: string;
  role: UserRole;
  joinedAt: Date;
  user?: User;
}

export interface TeamSettings {
  allowMemberInvites: boolean;
  defaultLeadAssignment: 'round-robin' | 'manual' | 'auto';
  sharingEnabled: boolean;
}

export interface TeamStats {
  totalMembers: number;
  totalLeads: number;
  conversionRate: number;
  monthlyRevenue: number;
}

// ==================== FOLLOW-UP TYPES ====================

export type FollowUpType = 'email' | 'sms' | 'call' | 'whatsapp' | 'linkedin';
export type FollowUpStatus = 'scheduled' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'failed';

export interface FollowUpSequence {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  teamId?: string;
  isActive: boolean;
  isShared: boolean;
  steps: FollowUpStep[];
  stats: SequenceStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowUpStep {
  id: string;
  order: number;
  type: FollowUpType;
  delayDays: number;
  delayHours: number;
  template: FollowUpTemplate;
  conditions?: StepCondition[];
}

export interface FollowUpTemplate {
  id: string;
  name: string;
  subject?: string;
  content: string;
  variables: string[];
  isShared: boolean;
  createdBy: string;
  category?: string;
}

export interface StepCondition {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'exists';
  value: string | number | boolean;
}

export interface SequenceStats {
  totalEnrolled: number;
  completed: number;
  replied: number;
  bounced: number;
  openRate: number;
  replyRate: number;
}

export interface ScheduledFollowUp {
  id: string;
  leadId: string;
  sequenceId: string;
  stepId: string;
  scheduledAt: Date;
  status: FollowUpStatus;
  sentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  repliedAt?: Date;
}

// ==================== CHAT & AI TYPES ====================

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageType = 'text' | 'voice' | 'image' | 'action' | 'suggestion';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  attachments?: Attachment[];
  actions?: QuickAction[];
  createdAt: Date;
  metadata?: {
    leadId?: string;
    templateId?: string;
    isTyping?: boolean;
  };
}

export interface Attachment {
  id: string;
  type: 'image' | 'file' | 'audio';
  url: string;
  name: string;
  size: number;
}

export interface QuickAction {
  id: string;
  label: string;
  icon?: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  userId: string;
  leadId?: string;
  title?: string;
  messages: ChatMessage[];
  context: ConversationContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationContext {
  currentLead?: Lead;
  recentActivities?: LeadActivity[];
  userPreferences?: Record<string, unknown>;
  sessionData?: Record<string, unknown>;
}

// ==================== NOTIFICATION TYPES ====================

export type NotificationType = 'lead_new' | 'lead_hot' | 'followup_due' | 'team_invite' | 'system';
export type NotificationPriority = 'high' | 'medium' | 'low';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

// ==================== ANALYTICS TYPES ====================

export interface DashboardStats {
  leads: {
    total: number;
    new: number;
    hot: number;
    converted: number;
    conversionRate: number;
  };
  followUps: {
    scheduled: number;
    completed: number;
    overdue: number;
    responseRate: number;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    growth: number;
    projected: number;
  };
  performance: {
    avgResponseTime: number;
    avgDealSize: number;
    topSource: LeadSource;
  };
}

export interface PipelineStage {
  id: string;
  name: string;
  count: number;
  value: number;
  color: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: Date;
  category?: string;
}

// ==================== BLUEPRINT / TEMPLATE TYPES ====================

export interface Blueprint {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  teamId?: string;
  isPublic: boolean;
  category: string;
  version: number;
  config: BlueprintConfig;
  stats: BlueprintStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlueprintConfig {
  sequences: FollowUpSequence[];
  templates: FollowUpTemplate[];
  automations: AutomationRule[];
  settings: Record<string, unknown>;
}

export interface BlueprintStats {
  timesCloned: number;
  avgConversionRate: number;
  rating: number;
  reviews: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  conditions: StepCondition[];
  actions: AutomationAction[];
  isActive: boolean;
}

export interface AutomationTrigger {
  type: 'lead_created' | 'status_changed' | 'score_changed' | 'time_based';
  config: Record<string, unknown>;
}

export interface AutomationAction {
  type: 'send_email' | 'send_sms' | 'assign_lead' | 'update_status' | 'notify';
  config: Record<string, unknown>;
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ==================== COMPONENT PROP TYPES ====================

export interface BaseComponentProps {
  className?: string;
  testId?: string;
}

export interface ListProps<T> extends BaseComponentProps {
  items: T[];
  isLoading?: boolean;
  error?: ApiError | null;
  emptyMessage?: string;
  onItemClick?: (item: T) => void;
  onRefresh?: () => void;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export interface FormProps<T> extends BaseComponentProps {
  initialValues?: Partial<T>;
  onSubmit: (values: T) => void | Promise<void>;
  isLoading?: boolean;
  error?: ApiError | null;
}
