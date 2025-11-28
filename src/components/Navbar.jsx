import { NavLink } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useSubscription } from "../hooks/useSubscription";
import { useUser } from "../context/UserContext";
import { usePricingModal } from "../context/PricingModalContext";
import { PLAN_LABELS } from "../lib/plans";

const Navbar = () => {
  const { plan } = useSubscription();
  const user = useUser();
  const { openPricing } = usePricingModal();
  const showUpgrade = plan === "free" || plan === "starter";

  return (
    <nav className="sticky top-0 z-30 border-b border-white/5 bg-gray-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-white">
            <span className="text-2xl font-black text-salesflow-accent">S</span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-400">
                SalesFlow
              </p>
              <p className="text-xs text-gray-500">AI Platform</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 text-sm text-gray-400 md:flex">
            <NavItem to="/">Dashboard</NavItem>
            <NavItem to="/pricing">Pricing</NavItem>
            <NavItem to="/settings">Settings</NavItem>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
            {PLAN_LABELS[plan] || plan}
          </span>
          {showUpgrade && (
            <button
              onClick={() => openPricing(plan === "free" ? "starter" : "pro")}
              className="hidden items-center gap-2 rounded-2xl bg-gradient-to-r from-salesflow-accent to-salesflow-accent-strong px-4 py-2 text-sm font-semibold text-black shadow-glow hover:scale-[1.02] sm:flex"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade
            </button>
          )}
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-salesflow-accent/20 text-center leading-8 text-salesflow-accent">
              {user.name?.charAt(0) ?? "U"}
            </div>
            <div className="text-xs">
              <p className="font-semibold text-white">{user.name}</p>
              <p className="text-gray-500">{user.email}</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

const NavItem = ({ to, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `rounded-xl px-3 py-1 ${isActive ? "text-white" : "hover:text-white"}`
    }
  >
    {children}
  </NavLink>
);

export default Navbar;
