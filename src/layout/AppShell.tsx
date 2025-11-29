import { ReactNode } from "react";
import { NavLink, useOutlet } from "react-router-dom";
import clsx from "clsx";
import { useSubscription } from "../hooks/useSubscription";
import { useUser } from "../context/UserContext";
import { usePricingModal } from "../context/PricingModalContext";

type NavItem = {
  label: string;
  to: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Heute",
    items: [
      { label: "Daily Command", to: "/daily-command" },
      { label: "Dashboard", to: "/dashboard" },
    ],
  },
  {
    title: "Network",
    items: [
      { label: "Mein Team", to: "/network/team" },
      { label: "Duplikation", to: "/network/duplication" },
    ],
  },
  {
    title: "Import",
    items: [
      { label: "Screenshot AI", to: "/screenshot-ai" },
      { label: "CSV Import", to: "/import/csv" },
    ],
  },
  {
    title: "Sales Power",
    items: [
      { label: "Speed-Hunter", to: "/speed-hunter" },
      { label: "Phönix", to: "/phoenix" },
      { label: "Einwand-Killer", to: "/einwand-killer" },
      { label: "Alle Tools", to: "/all-tools" },
    ],
  },
  {
    title: "Pipeline",
    items: [
      { label: "Interessenten", to: "/leads/prospects" },
      { label: "Kunden", to: "/leads/customers" },
    ],
  },
];

interface AppShellProps {
  children?: ReactNode;
}

const AppShell = ({ children }: AppShellProps) => {
  const outlet = useOutlet();
  const content = outlet ?? children;
  const { planLabel } = useSubscription();
  const user = useUser();
  const { openPricing } = usePricingModal();
  const mobileNavItems: NavItem[] = [
    { label: "Chat", to: "/chat" },
    ...navGroups.flatMap((group) => group.items),
  ];

  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100">
      <aside className="hidden w-72 flex-col border-r border-white/5 bg-black/40 px-6 py-8 shadow-2xl lg:flex">
        <div>
          <p className="text-lg font-bold text-white">Sales Flow AI</p>
          <p className="text-sm text-gray-500">Deal Operating System</p>
        </div>

        <NavLink
          to="/chat"
          className={({ isActive }) =>
            clsx(
              "mt-6 inline-flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold",
              isActive
                ? "border-salesflow-accent/60 bg-salesflow-accent/10 text-white"
                : "border-white/10 text-gray-300 hover:border-white/30"
            )
          }
        >
          <span>Sales Flow AI · Chat</span>
          <span className="rounded-full bg-salesflow-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] text-salesflow-accent">
            Live
          </span>
        </NavLink>

        <nav className="mt-8 space-y-8">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-500">
                {group.title}
              </p>
              <div className="mt-3 space-y-1">
                {group.items.map((item) => (
                  <SidebarLink key={item.to} to={item.to} label={item.label} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-xs text-gray-300">
            <p className="uppercase tracking-[0.4em] text-gray-500">Plan</p>
            <p className="mt-1 text-sm font-semibold text-white">{planLabel}</p>
            <button
              type="button"
              onClick={() => openPricing()}
              className="mt-3 w-full rounded-xl border border-salesflow-accent/60 px-3 py-2 text-xs font-semibold text-salesflow-accent hover:bg-salesflow-accent/10"
            >
              Upgrade öffnen
            </button>
          </div>
          <div className="rounded-2xl border border-white/5 bg-black/40 p-4 text-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Account</p>
            <p className="mt-2 font-semibold text-white">{user.name}</p>
            <p className="text-gray-500">{user.email}</p>
          </div>
        </div>
      </aside>

      <div className="flex-1">
        <div className="lg:hidden">
          <div className="sticky top-0 z-20 border-b border-white/5 bg-gray-950/80 px-4 py-4 backdrop-blur">
            <p className="text-sm font-semibold text-white">Sales Flow AI</p>
            <p className="text-xs text-gray-500">Deal Operating System</p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {mobileNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold",
                      isActive
                        ? "border-salesflow-accent/60 bg-salesflow-accent/10 text-white"
                        : "border-white/10 text-gray-400"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
          {content}
        </main>
      </div>
    </div>
  );
};

const SidebarLink = ({ to, label }: { to: string; label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      clsx(
        "block rounded-xl px-4 py-2 text-sm font-medium",
        isActive
          ? "bg-white/10 text-white"
          : "text-gray-400 hover:bg-white/5 hover:text-white"
      )
    }
  >
    {label}
  </NavLink>
);

export default AppShell;
