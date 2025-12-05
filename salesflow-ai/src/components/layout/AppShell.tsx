/**
 * AppShell - Main Application Layout
 * 
 * Responsive layout with:
 * - Fixed sidebar (desktop)
 * - Slide-over sidebar (mobile)
 * - Top navbar
 * - Content area with Outlet
 * - Global Aura OS background effects
 * 
 * @author Gemini 3 Ultra - Layout Architecture
 */

import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Menu, X, Bell } from "lucide-react";
import { Button } from "../ui/Button";

export const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* A. Global Aura OS Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         {/* Dunkler Hintergrund */}
        <div className="absolute inset-0 bg-[#0a0a0a]" />
        {/* Glow Effects (Orbs) */}
        <div className="absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      {/* B. Mobile Sidebar Overlay & Drawer */}
      {/* Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Mobile Drawer */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
        {/* Close Button Mobile */}
        <button 
          onClick={() => setSidebarOpen(false)}
          className="absolute right-[-3rem] top-4 rounded-lg bg-white/10 p-2 text-white backdrop-blur-md hover:bg-white/20 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* C. Desktop Sidebar (Fixed) */}
      <div className="hidden fixed inset-y-0 z-30 md:flex md:w-64 md:flex-col">
        <Sidebar />
      </div>

      {/* D. Main Content Area */}
      <div className="relative z-10 flex flex-1 flex-col md:pl-64">
        
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 flex h-16 flex-shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-4 shadow-sm backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="text-gray-400 hover:text-white md:hidden transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            {/* Breadcrumbs könnten hier stehen */}
            <h2 className="text-lg font-semibold text-white md:hidden">SalesFlow</h2>
          </div>

          <div className="flex items-center gap-4">
             {/* Notifications Icon */}
             <button className="relative text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
               <Bell size={20} />
               <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Hier rendert der React Router die Pages (Dashboard, Leads, etc.) */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

// Helper function (inline for simplicity)
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

