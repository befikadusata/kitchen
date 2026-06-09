/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Award, ShieldCheck, Database, RefreshCw, Cpu, PhoneCall, Gift, BookOpen,
  User, CheckCircle, Smartphone, Terminal, HelpCircle
} from 'lucide-react';

import KitchenDashboard from './components/KitchenDashboard';
import DriverApp from './components/DriverApp';
import TelegramMiniApp from './components/TelegramMiniApp';
import EventsTerminal from './components/EventsTerminal';
import { Kitchen, User as UserType, Meal, Menu, Subscription, CalendarException, DeliveryTask, DomainEvent } from './utils/calendar';

export default function App() {
  const [activeTab, setActiveTab] = useState<'kitchen' | 'driver' | 'customer'>('kitchen');
  
  // App state
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [exceptions, setExceptions] = useState<CalendarException[]>([]);
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [events, setEvents] = useState<DomainEvent[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all system state from API endpoints
  const fetchAllState = async () => {
    try {
      setError(null);
      
      const rKitchen = await fetch('/api/kitchen');
      const rUsers = await fetch('/api/users');
      const rMeals = await fetch('/api/meals');
      const rMenu = await fetch('/api/menu');
      const rSubs = await fetch('/api/subscriptions');
      const rEx = await fetch('/api/exceptions');
      const rEvents = await fetch('/api/events');
      
      if (!rKitchen.ok || !rUsers.ok || !rMeals.ok || !rMenu.ok || !rSubs.ok || !rEx.ok || !rEvents.ok) {
        throw new Error("One or more server tables failed to resolve. Verify server.ts connection.");
      }

      const kitchenData = await rKitchen.json();
      const usersData = await rUsers.json();
      const mealsData = await rMeals.json();
      const menuData = await rMenu.json();
      const subsData = await rSubs.json();
      const exData = await rEx.json();
      const eventsData = await rEvents.json();

      setKitchen(kitchenData);
      setUsers(usersData);
      setMeals(mealsData);
      setMenu(menuData);
      setSubscriptions(subsData);
      setExceptions(exData);
      setEvents(eventsData);

      // Collect ALL delivery tasks from subscriptions or fetch specifically for driver manifest list
      // Note: each subscription currently contains its set of tasks pre-calculated!
      // This maps them chronologically
      const allTasks: DeliveryTask[] = subsData.flatMap((s: any) => s.tasks || []);
      
      // Sort tasks chronologically to keep driver lists sequenced
      allTasks.sort((a, b) => a.date.localeCompare(b.date));
      setTasks(allTasks);

    } catch (err: any) {
      console.error("Backend synchronizer issue", err);
      setError(err.message || "Failed to contact Express backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllState();
    
    // Auto sync state every 8 seconds for a lively simulation experience
    const timer = setInterval(() => {
      fetchAllState();
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-mono">
        <Cpu className="w-12 h-12 text-amber-500 animate-spin mb-4" />
        <h1 className="text-sm font-bold tracking-widest uppercase">Connecting to Oz Kitchen Relational Engine...</h1>
        <p className="text-xs text-slate-500 mt-2">Spinning up Express Vite sandbox environment</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-xs font-mono">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl max-w-md space-y-3">
          <h2 className="text-sm text-red-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            ⚠ Connection Error
          </h2>
          <p className="text-slate-300 leading-relaxed font-light">{error}</p>
          <button 
            onClick={fetchAllState}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded font-bold uppercase text-[10px]"
          >
            Retry Connection Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#1A1A1B] flex flex-col lg:flex-row font-sans" id="app-root">
      
      {/* Geometric Sidebar Column */}
      <aside className="w-full lg:w-64 bg-[#0F172A] flex flex-col border-r border-[#1E293B] shrink-0">
        <div className="p-6 border-b border-slate-800 lg:border-b-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center font-black text-white text-xl select-none shadow-sm">
              OZ
            </div>
            <div>
              <h1 className="text-white font-extrabold tracking-tight text-lg leading-tight">OZ KITCHEN</h1>
              <p className="text-slate-400 text-[10px] tracking-widest uppercase font-mono font-bold">Platform Admin</p>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {[
            { id: 'kitchen', label: 'Dashboard Hub', badge: '👑 HQ' },
            { id: 'driver', label: 'Drivers & Fleet', badge: '🚗 DISPATCH' },
            { id: 'customer', label: 'Telegram Mini-App', badge: '📱 CLIENT' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                id={`sidebar-tab-${tab.id}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Account metadata */}
        <div className="p-6 mt-auto border-t border-slate-800 hidden lg:block select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white uppercase">
              HK
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-xs font-semibold truncate">Hanna Kitchen</p>
              <p className="text-slate-500 text-[9px] uppercase tracking-tighter">Head of Operations</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Geometric Navigation / Status Header */}
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
                Fastify API Active
              </span>
            </div>
            <div className="text-slate-400 text-xs font-mono select-none hidden md:block">
              June 8, 2026
            </div>
          </div>
        </header>

        {/* Inner Content Area */}
        <div className="flex-1 p-4 lg:p-8 space-y-6 overflow-y-auto lg:h-[calc(100vh-4rem)]">
          
          {/* Workspace instruction helpers, styled with premium geometric layout */}
          <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
            <div className="space-y-1.5 flex-1">
              <h3 className="font-bold text-slate-800 font-display flex items-center gap-2">
                <span className="w-2 h-2 rounded bg-orange-500 inline-block animate-bounce"></span>
                Prepaid Weekday Dining Compensation Sandbox
              </h3>
              <p className="text-slate-500 font-light leading-relaxed max-w-4xl">
                Observe the live computational extension database at work. Adding calendar holiday exception blocks instantly extends active prepaid subscription agreements, preventing loss of paid delivery cycles for customers. Toggle views under <strong className="font-semibold text-slate-700">Platform Admin</strong> sidebar links above!
              </p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-100 p-2 rounded-lg font-mono font-bold self-start mt-1 shadow-xs shrink-0 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span>DETERMINISTIC REDIRECTS OK</span>
            </div>
          </div>

          {/* Active app views rendered inside the Geometric boundary panel */}
          <div className="space-y-6">
            <div className="w-full">
              {activeTab === 'kitchen' && kitchen && menu && (
                <KitchenDashboard 
                  kitchen={kitchen}
                  users={users}
                  meals={meals}
                  menu={menu}
                  subscriptions={subscriptions}
                  exceptions={exceptions}
                  tasks={tasks}
                  onRefresh={fetchAllState}
                />
              )}

              {activeTab === 'driver' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:p-6">
                  <DriverApp 
                    tasks={tasks}
                    onRefresh={fetchAllState}
                  />
                </div>
              )}

              {activeTab === 'customer' && menu && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:p-6">
                  <TelegramMiniApp 
                    users={users}
                    meals={meals}
                    menu={menu}
                    subscriptions={subscriptions}
                    exceptions={exceptions}
                    tasks={tasks}
                    onRefresh={fetchAllState}
                  />
                </div>
              )}
            </div>

            {/* Audit log event terminal stream */}
            <div className="w-full">
              <EventsTerminal 
                events={events}
                onResetDb={fetchAllState}
              />
            </div>
          </div>

          {/* Clean Footer below the main scroll area */}
          <footer className="pt-6 pb-2 border-t border-slate-200/80 text-center text-[11px] text-slate-400 select-none font-medium flex flex-col sm:flex-row justify-between items-center gap-2">
            <p>© 2026 Oz Kitchen Platform &bull; All Rights Reserved</p>
            <p className="font-mono text-slate-400 text-[10px] bg-slate-200/60 px-2 py-0.5 rounded">
              Deterministic Weekday Dispatch Extension Engine v1.0.0
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
