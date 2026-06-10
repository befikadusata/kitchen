import React from 'react';
import { Navigate } from 'react-router-dom';
import { Smartphone } from 'lucide-react';

interface DriverLayoutProps {
  children: React.ReactNode;
  user: any;
}

export default function DriverLayout({ children, user }: DriverLayoutProps) {
  if (!user || (user.role !== 'driver' && user.role !== 'admin')) {
    return <Navigate to="/login?role=driver" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-[#0F172A] text-white p-4 shadow-md sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-orange-500" />
          <h1 className="font-bold tracking-tight">OZ DRIVER</h1>
        </div>
        <div className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 font-mono">
          {user.name || 'Driver'}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <footer className="p-4 bg-white border-t border-slate-200 text-center text-[10px] text-slate-400">
        © 2026 Oz Kitchen Fleet Management
      </footer>
    </div>
  );
}
