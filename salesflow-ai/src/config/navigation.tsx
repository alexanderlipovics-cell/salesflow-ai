/**
 * Navigation Configuration
 * 
 * Centralized navigation items for sidebar
 * 
 * @author Gemini 3 Ultra - Layout Architecture
 */

import { LayoutDashboard, Users, BarChart3, Settings, Zap, MessageSquare, Target, TrendingUp, CreditCard, Sparkles, Video, Trophy, Flame, FileText, DollarSign, Calculator } from "lucide-react";

export const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Mein Team', href: '/network', icon: Users },
  { name: 'Team Coach', href: '/team-coach', icon: Users },
  { name: 'Leads & Kontakte', href: '/crm/leads', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Follow-up Analytics', href: '/follow-up-analytics', icon: TrendingUp },
  { name: 'Meetings', href: '/meetings', icon: Video },
  { name: 'AI Prompts', href: '/ai-prompts', icon: Sparkles },
  { name: 'Challenges', href: '/challenges', icon: Trophy },
  { name: 'Power Hour', href: '/power-hour', icon: Flame },
  { name: 'AI Autopilot', href: '/autopilot', icon: Zap },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Einwände', href: '/objections', icon: MessageSquare },
  { name: 'Follow-ups', href: '/follow-ups', icon: Target },
  { name: 'Sequenzen', href: '/sequences', icon: Zap },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Integrationen', href: '/integrations', icon: Zap },
  { name: 'Finanzen', href: '/finance', icon: DollarSign },
  { name: 'Vergütungsrechner', href: '/compensation-simulator', icon: Calculator },
  { name: 'Angebote', href: '/proposals', icon: FileText },
  { name: 'Einstellungen', href: '/settings', icon: Settings },
];

