/**
 * Sidebar Component
 * 
 * Main navigation sidebar with Aura OS glassmorphism design
 * Responsive (desktop fixed, mobile drawer)
 * 
 * @author Gemini 3 Ultra - Layout Architecture
 */

import { Link, NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";
import { navigationItems } from "../../config/navigation";
import { Sparkles } from "lucide-react";
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  className?: string;
  onClose?: () => void; // Für Mobile: Schließt Menu nach Klick
}

export const Sidebar = ({ className, onClose }: SidebarProps) => {
  const { user } = useAuth();
  const userVertical = user?.vertical || user?.profile?.vertical;

  const getTourAttribute = (href: string) => {
    const tourMap: Record<string, string> = {
      '/chat': 'ai-chat',
      '/leads': 'leads',
      '/leads/prospects': 'leads',
      '/follow-ups': 'followups',
      '/dashboard': 'dashboard',
    };
    return tourMap[href];
  };

  const filteredNavItems = navigationItems.filter(item => {
    if (item.mlmOnly && userVertical !== 'network' && userVertical !== 'mlm') {
      return false;
    }
    return true;
  });

  return (
    <div className={cn("flex h-full w-64 flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl", className)}>
      
      {/* 1. Logo Area */}
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <Link to="/" className="flex items-center">
          <img 
            src="/alsales-logo-transparent.png" 
            alt="AlSales" 
            className="h-10"
          />
        </Link>
      </div>

      {/* 2. Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            data-tour={getTourAttribute(item.href)}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]" // Active State (Glowing)
                  : "text-gray-400 hover:bg-white/5 hover:text-white" // Inactive State
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                    isActive ? "text-emerald-400" : "text-gray-500 group-hover:text-gray-300"
                  )}
                />
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 3. User Profile Snippet (Footer) */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500" />
          <div>
            <p className="text-sm font-medium text-white">Demo User</p>
            <p className="text-xs text-gray-500">Pro Plan</p>
          </div>
        </div>
      </div>
    </div>
  );
};

