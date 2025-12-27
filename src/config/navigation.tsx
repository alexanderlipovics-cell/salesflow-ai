/**
 * Navigation Configuration
 * 
 * Centralized navigation items for sidebar
 * 
 * @author Gemini 3 Ultra - Layout Architecture
 */

import {
  LayoutDashboard,
  MessageSquare,
  Users,
  CheckSquare,
  Handshake,
  Network,
  DollarSign,
  Settings,
  Building2,
  Mail,
  Calendar,
  Gift,
  Target,
} from 'lucide-react';



// AKTIVE NAVIGATION - Beta Launch

export const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Command Center', href: '/command', icon: Target },
  { name: 'Netzwerk', href: '/network', icon: Users },
  { name: 'AI Copilot', href: '/chat', icon: MessageSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];

// HIDDEN FOR BETA - Routes still work via direct URL
/*
export const hiddenNavigationItems = [
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Follow-ups', href: '/follow-ups', icon: CheckSquare },
  { name: 'Kalender', href: '/calendar', icon: Calendar },
  { name: 'Emails', href: '/emails', icon: Mail },
  { name: 'Approval Inbox', href: '/inbox', icon: MessageSquare },
  { name: 'Kunden', href: '/leads/customers', icon: Handshake },
  { name: 'Freebies', href: '/freebies', icon: Gift },
  { name: 'Finanzen', href: '/finance', icon: DollarSign },
  { name: 'Mein Business', href: '/settings/business', icon: Building2 },
];
*/



// Add this new export for legacy route redirects

export const legacyRouteRedirects: Record<string, string> = {
  '/hunter-board': '/chat?prompt=Zeig%20mir%20meine%20besten%20Leads',
  '/objections': '/chat?prompt=Hilf%20mir%20bei%20Einwänden',
  '/einwände': '/chat?prompt=Hilf%20mir%20bei%20Einwänden',
  '/sequences': '/chat?prompt=Erstelle%20eine%20Follow-up%20Sequenz',
  '/sequenzen': '/chat?prompt=Erstelle%20eine%20Follow-up%20Sequenz',
  '/proposals': '/chat?prompt=Schreibe%20ein%20Angebot',
  '/ai-prompts': '/chat?prompt=Welche%20AI%20Prompts%20hast%20du%20für%20mich',
  '/power-hour': '/chat?prompt=Starte%20meine%20Power%20Hour',
  '/team-coach': '/chat?prompt=Analysiere%20mein%20Team',
  '/challenges': '/chat?prompt=Zeig%20mir%20aktuelle%20Challenges',
  '/analytics': '/dashboard',
  '/follow-up-analytics': '/dashboard',
  '/lead-list': '/leads',
  '/autopilot': '/chat',
  '/meetings': '/chat?prompt=Plane%20meine%20nächsten%20Meetings',
  '/billing': '/settings',
  '/integrationen': '/settings',
  '/integrations': '/settings',
};

