import clsx from "clsx";
import { NavLink, Outlet } from "react-router-dom";
import {
  AppWindow,
  Camera,
  Command,
  Copy,
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
import { PLAN_LABELS } from "../lib/plans";

const primaryLinks = [
  {
    label: "Sales Flow AI · Chat",
    description: "Lead-Gespräche & Follow-ups",
    to: "/chat",
    icon: MessageSquare,
  },
];

const navSections = [
  {
    title: "Heute",
    items: [
      { label: "Daily Command", to: "/daily-command", icon: Command },
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Network",
    items: [
      { label: "Mein Team", to: "/network/team", icon: Users },
      { label: "Duplikation", to: "/network/duplication", icon: Copy },
    ],
  },
  {
    title: "Import",
    items: [
      { label: "Screenshot AI", to: "/screenshot-ai", icon: Camera },
      { label: "CSV Import", to: "/import/csv", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Sales Power",
    items: [
      { label: "Speed-Hunter", to: "/speed-hunter", icon: Zap },
      { label: "Phönix", to: "/phoenix", icon: Flame },
      { label: "Einwand-Killer", to: "/einwand-killer", icon: ShieldCheck },
      { label: "Alle Tools", to: "/tools", icon: AppWindow },
    ],
  },
  {
    title: "Pipeline",
    items: [
      { label: "Interessenten", to: "/leads/prospects", icon: UserSearch },
      { label: "Kunden", to: "/leads/customers", icon: UserCheck },
    ],
  },
];

const AppShell = () => {
  const user = useUser();
  const { plan } = useSubscription();
  const { openPricing } = usePricingModal();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-950 via-gray-950/80 to-black text-gray-50">
      <aside className="hidden w-72 flex-col border-r border-white/5 bg-black/40 px-5 py-8 backdrop-blur xl:flex">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-gray-500">
            Sales Flow AI
          </p>
          <p className="text-lg font-semibold text-white">Deal Operating System</p>
        </div>

        <div className="mt-8 space-y-10">
          {primaryLinks.map((link) => (
            <SidebarLink key={link.to} {...link} accent />
          ))}

          {navSections.map((section) => (
            <div key={section.title}>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
                {section.title}
              </p>
              <div className="mt-3 space-y-2">
                {section.items.map((item) => (
                  <SidebarLink key={item.to} {...item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-4">
          <div className="rounded-2xl border border-white/5 bg-gray-950/80 p-4">
            <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
              Aktueller Plan
            </p>
            <p className="mt-2 text-xl font-semibold text-white">
              {PLAN_LABELS[plan] || plan}
            </p>
            <button
              onClick={() => openPricing(plan === "free" ? "starter" : "pro")}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-salesflow-accent to-salesflow-accent-strong px-4 py-2 text-sm font-semibold text-black shadow-glow transition hover:scale-[1.02]"
            >
              Upgrade entdecken
            </button>
          </div>

          <div className="rounded-2xl border border-white/5 bg-gray-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.4em] text-gray-600">
              Eingeloggt
            </p>
            <p className="mt-2 text-base font-semibold text-white">{user.name}</p>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="border-b border-white/5 bg-black/30 px-4 py-4 backdrop-blur xl:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
                Sales Flow AI
              </p>
              <p className="text-base font-semibold text-white">Deal OS</p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-gray-400">
              {PLAN_LABELS[plan] || plan}
            </span>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {primaryLinks.map((link) => (
              <SidebarLink key={link.to} compact {...link} />
            ))}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const SidebarLink = ({
  to,
  label,
  icon: Icon,
  description,
  accent = false,
  compact = false,
}) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      clsx(
        "group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
        accent
          ? "border-salesflow-accent/30 bg-salesflow-accent/10 text-white"
          : "border-white/5 bg-white/0",
        compact && "flex-1 min-w-[220px]",
        isActive
          ? "border-salesflow-accent/50 bg-salesflow-accent/15 text-white shadow-glow"
          : "text-gray-400 hover:text-white hover:border-white/20"
      )
    }
  >
    {({ isActive }) => (
      <>
        {Icon && (
          <Icon
            className={clsx(
              "h-4 w-4 transition",
              accent ? "text-salesflow-accent" : "text-gray-500",
              (isActive || accent) && "text-salesflow-accent",
              !isActive && !accent && "group-hover:text-salesflow-accent"
            )}
          />
        )}
        <div className="flex flex-col">
          <span className="font-semibold">{label}</span>
          {description && (
            <span className="text-xs text-gray-500 group-hover:text-gray-300">
              {description}
            </span>
          )}
        </div>
      </>
    )}
  </NavLink>
);

export default AppShell;
