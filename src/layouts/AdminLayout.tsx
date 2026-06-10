import React from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { Cpu } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  user: any;
}

export default function AdminLayout({ children, user }: AdminLayoutProps) {
  const location = useLocation();
  const activeTab = location.pathname.split('/')[2] || 'dashboard';

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login?role=admin" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#1A1A1B] flex flex-col lg:flex-row font-sans">
      <aside className="w-full lg:w-64 bg-[#0F172A] flex flex-col border-r border-[#1E293B] shrink-0">
        <div className="p-6 border-b border-slate-800 lg:border-b-0">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center font-black text-white text-xl select-none shadow-sm">
              OZ
            </div>
            <div>
              <h1 className="text-white font-extrabold tracking-tight text-lg leading-tight">OZ KITCHEN</h1>
              <p className="text-slate-400 text-[10px] tracking-widest uppercase font-mono font-bold">Platform Admin</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {[
            { id: 'kitchen', label: 'Dashboard Hub', badge: '👑 HQ', path: '/admin/kitchen' },
            { id: 'driver', label: 'Drivers & Fleet', badge: '🚗 DISPATCH', path: '/admin/fleet' }
          ].map(tab => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`w-full text-left p-3 rounded-lg flex items-center justify-between font-semibold text-sm transition-all duration-150 cursor-pointer ${
                  isActive 
                    ? 'bg-white/10 text-white shadow-inner' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors ${isActive ? 'bg-orange-500' : 'bg-transparent'}`}></div>
                  <span>{tab.label}</span>
                </div>
                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-500'}`}>
                  {tab.badge}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto border-t border-slate-800 hidden lg:block select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white uppercase">
              {user.name?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-xs font-semibold truncate">{user.name || 'Admin User'}</p>
              <p className="text-slate-500 text-[9px] uppercase tracking-tighter">Admin Access</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 lg:h-16 bg-white border-b border-slate-200 px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 py-3 sm:py-0">
          <h2 className="text-base lg:text-lg font-bold text-slate-800 font-display tracking-tight uppercase flex items-center gap-2">
            <span>Operational Dashboard</span>
            <span className="text-slate-400 text-xs font-light lowercase">/ {activeTab} view</span>
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-medium shadow-sm">
              <span className="font-semibold text-amber-900">System Status:</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                API Connected
              </span>
            </div>
            <div className="text-slate-400 text-xs font-mono select-none hidden md:block">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 space-y-6 overflow-y-auto lg:h-[calc(100vh-4rem)]">
          {children}
        </div>
      </main>
    </div>
  );
}
