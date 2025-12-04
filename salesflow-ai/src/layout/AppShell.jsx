/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  HYBRID APP SHELL - Premium Dark Mode with Nebula Effects                  ║
 * ║  Combines Aura OS aesthetics with full functionality                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import clsx from "clsx";
import { NavLink, Outlet } from "react-router-dom";
import {
  AppWindow,
  BookOpen,
  Camera,
  Clock3,
  Command,
  FileSpreadsheet,
  Flame,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  MessageSquare,
  ShieldCheck,
  Target,
  UserCheck,
  UserSearch,
  Users,
  Zap,
  BarChart3,
  Brain,
  FileText,
  Sparkles,
  PenLine,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { useSubscription } from "../hooks/useSubscription";
import { usePricingModal } from "../context/PricingModalContext";
import LanguageSwitcher from "../components/LanguageSwitcher";

const navGroups = [
  {
    title: "COMMAND CENTER",
    items: [
      { label: "Daily Command", to: "/daily-command", icon: Command },
      { label: "Next Best Actions", to: "/next-best-actions", icon: Target },
      { label: "Hunter Board", to: "/hunter", icon: Target },
      { label: "AI Copilot", to: "/chat", icon: MessageSquare },
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "POWER TOOLS",
    items: [
      { label: "Screenshot AI", to: "/screenshot-ai", icon: Camera },
      { label: "Import", to: "/import", icon: FileSpreadsheet },
      { label: "Lead Hunter", to: "/lead-hunter", icon: Users },
      { label: "Delay Master", to: "/delay-master", icon: Clock3 },
      { label: "Follow-ups", to: "/follow-ups", icon: MessageCircle },
      { label: "Field Ops", to: "/field-ops", icon: MapPin },
      { label: "Speed Hunter", to: "/speed-hunter", icon: Zap },
      { label: "Phoenix", to: "/phoenix", icon: Flame },
      { label: "Objection Killer", to: "/objections", icon: Brain },
      { label: "GTM Copy", to: "/gtm-copy", icon: PenLine },
      { label: "All Tools", to: "/all-tools", icon: AppWindow },
    ],
  },
  {
    title: "ANALYTICS",
    items: [
      { label: "Analytics Hub", to: "/analytics", icon: LayoutDashboard },
      { label: "Objection Analytics", to: "/manager/objections", icon: BarChart3 },
      { label: "Template Manager", to: "/manager/followup-templates", icon: FileText },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { label: "AI Settings", to: "/settings/ai", icon: Sparkles },
    ],
  },
  {
    title: "CONTACTS",
    items: [
      { label: "Leads", to: "/leads/prospects", icon: UserSearch },
      { label: "Customers", to: "/leads/customers", icon: UserCheck },
      { label: "Partners", to: "/network/team", icon: Users },
    ],
  },
  {
    title: "KNOWLEDGE",
    items: [
      {
        label: "Playbooks",
        to: "/knowledge-base",
        icon: BookOpen,
      },
    ],
  },
];

const AppShell = () => {
  const user = useUser();
  const { plan, planLabel } = useSubscription();
  const { openPricing } = usePricingModal();
  const mobileNavItems = navGroups.flatMap((group) => group.items);

  return (
    <div className="relative flex min-h-screen bg-slate-950 text-slate-50 antialiased overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* NEBULA BACKGROUND                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      
      <div className="nebula-bg">
        <div className="nebula-blob-cyan" />
        <div className="nebula-blob-violet" />
        <div className="nebula-blob-center" />
      </div>
      <div className="noise-overlay" />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SIDEBAR                                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      
      <aside className="relative z-10 hidden h-screen w-72 flex-col border-r border-slate-800/50 bg-slate-950/80 backdrop-blur-xl xl:flex">
        <div className="flex-1 space-y-5 overflow-y-auto py-6 scrollbar-hide">
          {/* Logo / Brand */}
          <div className="px-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shadow-lg glow-cyan">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold gradient-text">NEXUS</p>
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  Sales Intelligence
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Groups */}
          {navGroups.map((section) => (
            <div key={section.title} className="mt-4">
              <div className="px-6 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/70">
                {section.title}
              </div>
              <nav className="mt-2 space-y-1 px-3">
                {section.items.map((item) => (
                  <SidebarLink key={item.to} {...item} />
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="space-y-4 border-t border-slate-800/50 px-4 py-4">
          {/* Plan Card */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Current Plan
                </p>
                <p className="mt-1 text-lg font-bold text-white">{planLabel}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center glow-cyan">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </div>
            <button
              onClick={() => openPricing(plan === "free" ? "starter" : "pro")}
              className="btn-premium mt-4 w-full"
            >
              ✨ Upgrade Now
            </button>
          </div>

          {/* Language Switcher */}
          <div className="flex justify-center">
            <LanguageSwitcher />
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      
      <div className="relative z-10 flex flex-1 flex-col">
        {/* Mobile Header */}
        <div className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl px-4 py-4 xl:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center glow-cyan">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-base font-bold gradient-text">NEXUS</p>
                <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
                  Sales Intelligence
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher variant="minimal" />
              <span className="badge-neon badge-cyan">
                {planLabel}
              </span>
            </div>
          </div>
          
          {/* Mobile Nav Scroll */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {mobileNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    "whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 shadow-lg glow-cyan"
                      : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Page Content */}
        <div role="main" className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-6 py-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/* SIDEBAR LINK COMPONENT                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

const SidebarLink = ({ to, label, icon: Icon }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      clsx(
        "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 shadow-lg glow-cyan"
          : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
      )
    }
  >
    {({ isActive }) => (
      <>
        <span
          className={clsx(
            "flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-all duration-200",
            isActive
              ? "bg-slate-950/30 text-white"
              : "bg-slate-800/60 text-slate-400 group-hover:text-white"
          )}
        >
          {Icon ? <Icon className="h-4 w-4" /> : null}
        </span>
        <span>{label}</span>
      </>
    )}
  </NavLink>
);

export default AppShell;
