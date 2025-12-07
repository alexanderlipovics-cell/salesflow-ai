/**
 * Beispiel: Sidebar mit Vertical-basierter Route-Filterung
 * 
 * Zeigt, wie man Routes basierend auf config.routes.hidden filtert
 * und custom_labels verwendet.
 */

import { Link, useLocation } from "react-router-dom";
import { useVertical } from "@/context/VerticalContext";
import { Home, Users, Tree, Flame, Map, TrendingUp } from "lucide-react";

interface SidebarItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  feature?: string; // Optional: Feature-Flag für zusätzliche Prüfung
}

const allSidebarItems: SidebarItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: Home },
  { path: "/leads", label: "Leads", icon: Users },
  { path: "/genealogy", label: "Genealogy", icon: Tree, feature: "genealogy" },
  { path: "/power-hour", label: "Power Hour", icon: Flame, feature: "power_hour" },
  { path: "/field-ops", label: "Field Ops", icon: Map, feature: "field_ops" },
  { path: "/analytics", label: "Analytics", icon: TrendingUp },
];

export function VerticalSidebarExample() {
  const { config, hasFeature, t } = useVertical();
  const location = useLocation();

  // 1. Filtere ausgeblendete Routes
  const visibleItems = allSidebarItems.filter((item) => {
    // Prüfe ob Route in hidden-Liste
    if (config.routes.hidden.includes(item.path)) {
      return false;
    }

    // Prüfe Feature-Flag falls vorhanden
    if (item.feature && !hasFeature(item.feature)) {
      return false;
    }

    return true;
  });

  // 2. Sortiere nach Priority
  const sortedItems = [...visibleItems].sort((a, b) => {
    const aPriority = config.routes.priority.indexOf(a.path);
    const bPriority = config.routes.priority.indexOf(b.path);

    // Priority-Routes zuerst
    if (aPriority === -1 && bPriority === -1) return 0;
    if (aPriority === -1) return 1;
    if (bPriority === -1) return -1;
    return aPriority - bPriority;
  });

  return (
    <nav className="space-y-2">
      {sortedItems.map((item) => {
        const Icon = item.icon;
        // Nutze custom_label falls vorhanden, sonst Standard-Label
        const displayLabel =
          config.routes.custom_labels?.[item.path] || item.label;

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              location.pathname === item.path
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{displayLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}

