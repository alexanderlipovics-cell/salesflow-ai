/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS Dashboard - Main Dashboard Component                              ║
 * ║  Sci-Fi Luxury Dark-Mode SaaS Dashboard                                    ║
 * ║  Tech: React + TypeScript + Tailwind CSS                                   ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState } from 'react';
import { HeaderBar } from './HeaderBar';
import { ModuleCard } from './ModuleCard';
import { StatsBar } from './StatsBar';
import { ChiefAutopilotCard } from './ChiefAutopilotCard';
import { FeatureCard } from './FeatureCard';
import { BottomDock } from './BottomDock';
import type { 
  ModuleCardData, 
  StatItem, 
  FeatureCardData, 
  NavItem, 
  ChiefAgent, 
  ChiefMetric 
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════════════════════

const moduleCards: ModuleCardData[] = [
  { id: '1', title: 'Autopilot', label: 'Module', metric: '24 active', icon: 'autopilot' },
  { id: '2', title: 'AI Chat', label: 'Module', metric: '7 threads', icon: 'chat' },
  { id: '3', title: 'Sequences', label: 'Module', metric: '12 flows', icon: 'sequence' },
];

const statsData: StatItem[] = [
  { value: '3', label: 'Heute' },
  { value: '5', label: 'Offen' },
  { value: '12', label: 'Leads' },
];

const chiefAgents: ChiefAgent[] = [
  { id: '1', name: 'Hunter' },
  { id: '2', name: 'Closer' },
];

const chiefMetrics: ChiefMetric[] = [
  { value: '27', label: 'Automationen' },
  { value: '8', label: 'Fahrtroute' },
  { value: '12', label: 'Antrillor' },
  { value: '142', label: 'Suitor' },
];

const featureCards: FeatureCardData[] = [
  { id: '1', title: 'Outreach', metric: '412 Gesendet', type: 'outreach' },
  { id: '2', title: 'Finanzen', metric: '€ 4.200 Umsatz', trend: '+18% vs. letzte Woche', type: 'finance' },
];

const navItems: NavItem[] = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', active: true },
  { id: 'autopilot', icon: 'autopilot', label: 'Autopilot' },
  { id: 'chat', icon: 'chat', label: 'Chat' },
  { id: 'user', icon: 'user', label: 'Profil' },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const AuraOsDashboard: React.FC = () => {
  const [activeNav, setActiveNav] = useState('dashboard');

  const handleNavClick = (id: string) => {
    setActiveNav(id);
  };

  const currentNavItems = navItems.map(item => ({
    ...item,
    active: item.id === activeNav,
  }));

  return (
    <div className="relative min-h-screen w-full bg-slate-950 overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DEEP SPACE BACKGROUND                                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      
      {/* Base Gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900" />
      
      {/* Nebula Blobs */}
      <div className="fixed top-0 -left-40 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 -right-40 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed top-1/2 left-1/3 w-[400px] h-[400px] bg-cyan-400/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/3 right-1/3 w-[300px] h-[300px] bg-violet-400/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Subtle Noise Texture Overlay */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none" 
           style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-10 pb-32">
        {/* Header */}
        <HeaderBar />
        
        {/* Module Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {moduleCards.map((card) => (
            <ModuleCard key={card.id} data={card} />
          ))}
        </div>
        
        {/* Stats Bar */}
        <div className="mb-8">
          <StatsBar stats={statsData} />
        </div>
        
        {/* CHIEF Autopilot Cockpit */}
        <div className="mb-8">
          <ChiefAutopilotCard agents={chiefAgents} metrics={chiefMetrics} />
        </div>
        
        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featureCards.map((card) => (
            <FeatureCard key={card.id} data={card} />
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FLOATING BOTTOM DOCK                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      
      <BottomDock items={currentNavItems} onItemClick={handleNavClick} />
    </div>
  );
};

export default AuraOsDashboard;

