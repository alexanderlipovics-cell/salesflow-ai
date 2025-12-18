/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  HYBRID APP SHELL - Premium Dark Mode with Nebula Effects                  ║
 * ║  Combines Aura OS aesthetics with full functionality                       ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import clsx from "clsx";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Zap, Sparkles } from "lucide-react";
import { useSubscription } from "../hooks/useSubscription";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { ProductTour } from "@/components/onboarding/ProductTour";
import { navigationItems } from "../config/navigation";
import { useAuth } from "../context/AuthContext";

const getTourAttribute = (href) => {
  const tourMap = {
    "/chat": "ai-chat",
    "/leads": "leads",
    "/leads/prospects": "leads",
    "/follow-ups": "followups",
    "/dashboard": "dashboard",
  };
  return tourMap[href];
};

const AppShell = () => {
  const { plan, planLabel } = useSubscription();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userVertical = user?.vertical || user?.profile?.vertical;

  const filteredNavItems = navigationItems.filter(item => {
    if (item.mlmOnly && userVertical !== 'network' && userVertical !== 'mlm') {
      return false;
    }
    return true;
  });

  const mobileNavItems = filteredNavItems.map(item => ({
    to: item.href,
    label: item.name,
    icon: item.icon
  }));

  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-slate-50 antialiased overflow-hidden">
      <ProductTour />
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
      
      <aside className="relative z-10 hidden h-screen w-72 flex-col border-r border-gray-800/50 bg-gray-900/90 backdrop-blur-xl xl:flex">
        <div className="flex-1 space-y-5 overflow-y-auto py-6 scrollbar-hide">
          {/* Logo / Brand */}
          <div className="px-6">
            <NavLink to="/" className="flex items-center">
              <img 
                src="/alsales-logo-transparent.png" 
                alt="AlSales" 
                className="h-10"
              />
            </NavLink>
          </div>

          <nav className="mt-4 space-y-1 px-3">
            {filteredNavItems.map((item) => (
              <SidebarLink
                key={item.href}
                to={item.href}
                label={item.name}
                icon={item.icon}
              />
            ))}
          </nav>
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
              onClick={() => navigate("/pricing", { state: { focusPlan: plan === "free" ? "starter" : "builder" } })}
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
            <NavLink to="/" className="flex items-center">
              <img 
                src="/alsales-logo-transparent.png" 
                alt="AlSales" 
                className="h-10"
              />
            </NavLink>
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
                data-tour={getTourAttribute(item.to)}
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
        <div
          role="main"
          className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
        >
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
    data-tour={getTourAttribute(to)}
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
