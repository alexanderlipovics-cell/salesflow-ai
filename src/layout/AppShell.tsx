import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Menu,
  X,
  Settings,
  CheckSquare,
  Calendar,
  Mail,
  Inbox
} from 'lucide-react';
import { useFeatures } from '../hooks/useFeatures';
import { setupForegroundHandler } from '../services/pushNotifications';
import toast from 'react-hot-toast';

export const AppShell: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hasFeature } = useFeatures();

  useEffect(() => {
    // Setup foreground notification handler
    const unsubscribe = setupForegroundHandler((payload) => {
      const { title, body } = payload.notification || {};

      // Show toast for foreground notifications
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{title}</p>
                <p className="mt-1 text-sm text-gray-500">{body}</p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              OK
            </button>
          </div>
        </div>
      ), { duration: 5000 });
    });

    return () => unsubscribe();
  }, []);

  // Bereinigte Navigations-Struktur - nur Kern-Items für MLM/Sales Workflow
  const navigation = [
    { 
      category: 'CORE', 
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'AI Copilot', href: '/chat', icon: MessageSquare },
        { name: 'Leads', href: '/leads', icon: Users },
        { name: 'Follow-ups', href: '/follow-ups', icon: CheckSquare },
        { name: 'Inbox', href: '/inbox', icon: Inbox },
        { name: 'Kalender', href: '/calendar', icon: Calendar },
        { name: 'Emails', href: '/emails', icon: Mail },
        { name: 'Kunden', href: '/leads/customers', icon: Users },
        { name: 'Settings', href: '/settings', icon: Settings },
      ]
    }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
      
      {/* MOBILE MENU OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex h-full flex-col">
          
          {/* LOGO AREA */}
          <div className="flex h-16 items-center px-6 border-b border-slate-800">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 mr-3"></div>
            <span className="text-lg font-bold tracking-tight">Sales Flow AI</span>
            <button className="ml-auto lg:hidden" onClick={() => setMobileMenuOpen(false)}>
              <X className="h-6 w-6 text-slate-400" />
            </button>
          </div>

          {/* NAV LINKS */}
          <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-8">
            {navigation.map((group) => {
              const visibleItems = group.items.filter(
                (item) => !item.feature || hasFeature(item.feature)
              );
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.category}>
                  <h3 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {group.category}
                  </h3>
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`
                          group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
                          ${active 
                            ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500' 
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-50 border-l-2 border-transparent'
                          }
                        `}
                        >
                          <item.icon className={`mr-3 h-5 w-5 ${active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* USER FOOTER */}
          <div className="border-t border-slate-800 p-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-800/50 p-3 hover:bg-slate-800 cursor-pointer transition">
              <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                AL
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-white">Alex Lipovics</p>
                <p className="truncate text-xs text-slate-400">Pro Plan ⚡</p>
              </div>
              <Settings className="h-4 w-4 text-slate-500 hover:text-white" />
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* MOBILE HEADER */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 lg:hidden">
          <div className="font-bold text-emerald-400">Sales Flow AI</div>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-slate-400 hover:text-white">
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-4 lg:p-8">
           {/* Hier wird die jeweilige Seite reingeladen */}
           <Outlet />
        </main>
      </div>
    </div>
  );
};
