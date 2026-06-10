import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Cpu, ArrowRight } from 'lucide-react';

import { AppProvider, useApp } from './context/AppContext';
import AdminLayout from './layouts/AdminLayout';
import DriverLayout from './layouts/DriverLayout';
import TelegramLayout from './layouts/TelegramLayout';

import KitchenDashboard from './components/KitchenDashboard';
import DriverApp from './components/DriverApp';
import TelegramMiniApp from './components/TelegramMiniApp';
import EventsTerminal from './components/EventsTerminal';
import FleetTracker from './components/FleetTracker';

function AppRoutes() {
  const { 
    kitchen, users, meals, menu, subscriptions, exceptions, tasks, events,
    loading, error, currentUser, refreshState 
  } = useApp();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-mono">
        <Cpu className="w-12 h-12 text-amber-500 animate-spin mb-4" />
        <h1 className="text-sm font-bold tracking-widest uppercase">Initializing Oz Kitchen Engine...</h1>
      </div>
    );
  }

  if (error && !kitchen) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-mono">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl max-w-md text-center">
          <h2 className="text-red-400 font-bold uppercase mb-2">⚠ System Error</h2>
          <p className="text-slate-300 text-xs mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-1.5 bg-red-600 text-white rounded text-[10px] uppercase font-bold">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Root Landing Page */}
      <Route path="/" element={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-mono">
          <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3 text-center mb-8">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center font-black text-white text-3xl mx-auto mb-4 shadow-lg">OZ</div>
              <h1 className="text-white text-2xl font-black tracking-widest uppercase">Oz Kitchen Unified Portal</h1>
              <p className="text-slate-500 text-xs mt-2 uppercase tracking-tighter font-bold">Select operational surface to begin</p>
            </div>

            {[
              { 
                title: 'Platform HQ', 
                desc: 'Kitchen manifest, user management, and fleet tracking.', 
                path: '/admin/kitchen', 
                color: 'bg-amber-500',
                badge: 'Admin'
              },
              { 
                title: 'Driver Surface', 
                desc: 'GPS tracking, delivery checklists, and status updates.', 
                path: '/driver', 
                color: 'bg-emerald-500',
                badge: 'Driver'
              },
              { 
                title: 'Customer Mini-App', 
                desc: 'Telegram interface for meals, rotations, and payments.', 
                path: '/telegram', 
                color: 'bg-sky-500',
                badge: 'Telegram'
              }
            ].map(surface => (
              <a 
                key={surface.path}
                href={surface.path}
                className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-all group"
              >
                <div className={`w-10 h-10 ${surface.color} rounded-lg mb-4 flex items-center justify-center font-black text-white text-xs`}>
                  {surface.badge.charAt(0)}
                </div>
                <h2 className="text-white font-bold uppercase tracking-wide group-hover:text-orange-400 transition-colors">{surface.title}</h2>
                <p className="text-slate-400 text-[10px] mt-2 leading-relaxed">{surface.desc}</p>
                <div className="mt-6 flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  Enter Surface <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            ))}
          </div>
        </div>
      } />

      {/* Admin Surface */}
      <Route path="/admin/*" element={
        <AdminLayout user={currentUser || { role: 'admin', name: 'Demo Admin' }}>
          <Routes>
            <Route path="kitchen" element={
              kitchen && menu ? (
                <KitchenDashboard 
                  kitchen={kitchen}
                  users={users}
                  meals={meals}
                  menu={menu}
                  subscriptions={subscriptions}
                  exceptions={exceptions}
                  tasks={tasks}
                  onRefresh={refreshState}
                />
              ) : <div>Loading Dashboard...</div>
            } />
            <Route path="fleet" element={
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <FleetTracker />
              </div>
            } />
            <Route path="*" element={<Navigate to="kitchen" replace />} />
          </Routes>
          <div className="mt-8">
            <EventsTerminal events={events} onResetDb={refreshState} />
          </div>
        </AdminLayout>
      } />

      {/* Driver Surface */}
      <Route path="/driver" element={
        <DriverLayout user={currentUser || { role: 'driver', name: 'Demo Driver' }}>
          <div className="p-4">
            <DriverApp 
              user={currentUser || { role: 'driver', name: 'Demo Driver' }}
              tasks={tasks} 
              onRefresh={refreshState} 
            />
          </div>
        </DriverLayout>
      } />

      {/* Telegram Surface */}
      <Route path="/telegram" element={
        <TelegramLayout>
          {menu ? (
            <TelegramMiniApp 
              users={users}
              meals={meals}
              menu={menu}
              subscriptions={subscriptions}
              exceptions={exceptions}
              tasks={tasks}
              onRefresh={refreshState}
            />
          ) : <div>Loading...</div>}
        </TelegramLayout>
      } />

      {/* Login Page (placeholder) */}
      <Route path="/login" element={
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full space-y-4">
             <h1 className="text-2xl font-black text-center text-slate-900">OZ LOGIN</h1>
             <p className="text-slate-500 text-xs text-center">Production hardening in progress. Use sidebar in admin for now.</p>
             <button 
               onClick={() => {
                 const role = new URLSearchParams(location.search).get('role') || 'admin';
                 localStorage.setItem('oz_user', JSON.stringify({ id: 1, role, name: `Demo ${role}` }));
                 window.location.href = role === 'admin' ? '/admin/kitchen' : '/driver';
               }}
               className="w-full py-3 bg-orange-500 text-white rounded-lg font-bold"
             >
               Enter Demo Session
             </button>
          </div>
        </div>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
