import clsx from "clsx";
import { NavLink, Outlet } from "react-router-dom";
import {
  AppWindow,
  BookOpen,
  Camera,
  Command,
  FileSpreadsheet,
  Flame,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  UserSearch,
  Users,
  Zap,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { useSubscription } from "../hooks/useSubscription";
import { usePricingModal } from "../context/PricingModalContext";

const navGroups = [
  {
    title: "HEUTE",
    items: [
      { label: "Daily Command", to: "/daily-command", icon: Command },
      { label: "Chat / KI-Assistent", to: "/chat", icon: MessageSquare },
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "TOOLS",
    items: [
      { label: "Screenshot AI / Scanner", to: "/screenshot-ai", icon: Camera },
      { label: "CSV-Import", to: "/import/csv", icon: FileSpreadsheet },
      { label: "Speed-Hunter", to: "/speed-hunter", icon: Zap },
      { label: "Phönix", to: "/phoenix", icon: Flame },
      { label: "Einwand-Killer", to: "/einwand-killer", icon: ShieldCheck },
      { label: "Alle Tools", to: "/all-tools", icon: AppWindow },
    ],
  },
  {
    title: "KONTAKTE",
    items: [
      { label: "Leads", to: "/leads/prospects", icon: UserSearch },
      { label: "Kunden", to: "/leads/customers", icon: UserCheck },
      { label: "Partner", to: "/network/team", icon: Users },
    ],
  },
  {
    title: "WISSEN",
    items: [
      {
        label: "Playbooks / Knowledge Base",
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
    <div className="flex min-h-screen bg-slate-950 text-slate-50 antialiased">
      <aside className="hidden h-screen w-64 flex-col space-y-6 border-r border-slate-900 bg-slate-950/95 py-6 xl:flex">
        <div className="flex-1 space-y-6 overflow-y-auto">
          <div className="px-6">
            <p className="text-lg font-semibold text-slate-50">Sales Flow AI</p>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Deal Operating System
            </p>
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-600">
              Network Marketing Pro
            </p>
          </div>

          {navGroups.map((section) => (
            <div key={section.title} className="mt-4">
              <div className="px-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {section.title}
              </div>
              <nav className="mt-2 space-y-1 px-2">
                {section.items.map((item) => (
                  <SidebarLink key={item.to} {...item} />
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="space-y-4 border-t border-slate-900/60 px-6 pt-4">
          <div className="card-surface bg-slate-900/70 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Aktueller Plan
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-50">{planLabel}</p>
            <button
              onClick={() => openPricing(plan === "free" ? "starter" : "pro")}
              className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              Upgrade entdecken
            </button>
          </div>

          <div className="card-surface bg-slate-900/70 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Eingeloggt
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-100">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="border-b border-slate-900 bg-slate-950/90 px-4 py-4 backdrop-blur xl:hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Sales Flow AI
              </p>
              <p className="text-base font-semibold text-slate-50">
                Network Marketing Pro
              </p>
            </div>
            <span className="rounded-full border border-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
              {planLabel}
            </span>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {mobileNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition",
                    isActive
                      ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30"
                      : "bg-slate-900/80 text-slate-400 hover:text-slate-100"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        <div role="main" className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-6 py-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

const SidebarLink = ({ to, label, icon: Icon }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      clsx(
        "flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition",
        isActive
          ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
          : "text-slate-300 hover:bg-slate-800/80 hover:text-slate-50"
      )
    }
  >
    {({ isActive }) => (
      <>
        <span
          className={clsx(
            "flex h-7 w-7 items-center justify-center rounded-full text-xs",
            isActive
              ? "bg-slate-950/80 text-slate-50"
              : "bg-slate-800/80 text-slate-300"
          )}
        >
          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        </span>
        <span>{label}</span>
      </>
    )}
  </NavLink>
);

export default AppShell;
