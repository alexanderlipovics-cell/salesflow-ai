/**
 * Navigation Configuration
 * 
 * Centralized navigation items for sidebar
 * 
 * @author Gemini 3 Ultra - Layout Architecture
 */

import { LayoutDashboard, Users, BarChart3, Settings, Zap, MessageSquare, Target, TrendingUp, CreditCard } from "lucide-react";

export const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads & Kontakte', href: '/crm/leads', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Follow-up Analytics', href: '/follow-up-analytics', icon: TrendingUp },
  { name: 'AI Autopilot', href: '/autopilot', icon: Zap },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Follow-ups', href: '/follow-ups', icon: Target },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Einstellungen', href: '/settings', icon: Settings },
];

