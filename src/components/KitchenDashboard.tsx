import React, { useState } from 'react';
import { 
  Plus, Calendar as CalendarIcon, ClipboardList, Users, Package, RefreshCw, 
  CheckCircle, AlertCircle, ShoppingBag, MapPin, Phone, Search, Sliders, DollarSign,
  Maximize2, ArrowRight, Printer, Check, X, ShieldAlert, Award
} from 'lucide-react';
import { Kitchen, User, Meal, Menu, Subscription, CalendarException, DeliveryTask, PaymentRecord } from '../utils/calendar';

interface KitchenDashboardProps {
  kitchen: Kitchen;
  users: User[];
  meals: Meal[];
  menu: Menu;
  subscriptions: Subscription[];
  exceptions: CalendarException[];
  tasks: DeliveryTask[];
  onRefresh: () => void;
}

export default function KitchenDashboard({
  kitchen,
  users,
  meals,
  menu,
  subscriptions,
  exceptions,
  tasks,
  onRefresh
}: KitchenDashboardProps) {

  const [activeSubTab, setActiveSubTab] = useState<'home' | 'menu' | 'calendar' | 'subscriptions' | 'manifest' | 'customers'>('home');
  const [selectedSub, setSelectedSub] = useState<any>(null);
  
  // States for creating a Meal
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState<'fasting' | 'non_fasting'>('non_fasting');
  const [mealIsCombo, setMealIsCombo] = useState(false);
  const [mealPhoto, setMealPhoto] = useState('');
  const [addingMeal, setAddingMeal] = useState(false);

  // States for creating an Exception
  const [exDate, setExDate] = useState('2026-06-12');
  const [exType, setExType] = useState<'holiday' | 'closure' | 'fasting_period'>('holiday');
  const [exReason, setExReason] = useState('Ethiopian Martyrs Day');
  const [exceptionPreviewCount, setExceptionPreviewCount] = useState<number>(0);

  // Search filters
  const [subSearch, setSubSearch] = useState('');
  const [subFilter, setSubFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [custSearch, setCustSearch] = useState('');

  // Editing Customer Address
  const [editingCustId, setEditingCustId] = useState<string | number | null>(null);
  const [editCustName, setEditCustName] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustAddress, setEditCustAddress] = useState('');

  // Daily Manifest Filter
  const [manifestDate, setManifestDate] = useState('2026-06-08');

  // Trigger preview calculations on exception input change
  React.useEffect(() => {
    // Quick look at how many subscriptions are active during this exception date
    const count = subscriptions.filter(sub => {
      return exDate >= sub.start_date && exDate <= sub.end_date;
    }).length;
    setExceptionPreviewCount(count);
  }, [exDate, subscriptions]);

  // Handle adding meal
  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName) return;

    try {
      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mealName,
          type: mealType,
          is_combo: mealIsCombo,
          photo_url: mealPhoto || undefined
        })
      });
      if (response.ok) {
        setMealName('');
        setMealIsCombo(false);
        setMealPhoto('');
        setAddingMeal(false);
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle adding calendar exception
  const handleAddException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exDate || !exReason) return;

    try {
      const response = await fetch('/api/exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: exDate,
          type: exType,
          reason: exReason
        })
      });
      if (response.ok) {
        setExReason('');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle deleting exceptions
  const handleDeleteException = async (id: string | number) => {
    try {
      const response = await fetch(`/api/exceptions/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle recorded payments
  const handleMarkPaid = async (subId: string | number) => {
    try {
      const response = await fetch(`/api/subscriptions/${subId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 3500 // standard subscription price
        })
      });
      if (response.ok) {
        if (selectedSub && selectedSub.subscription.id === subId) {
          fetchSubscriptionDetail(subId);
        }
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch subscription detail
  const fetchSubscriptionDetail = async (id: string | number) => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`);
      if (res.ok) {
        const details = await res.json();
        setSelectedSub(details);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Edit customer details
  const handleSaveCustomer = async (id: string | number) => {
    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCustName,
          phone: editCustPhone,
          address: editCustAddress
        })
      });
      if (response.ok) {
        setEditingCustId(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter subscriptions
  const filteredSubs = subscriptions.filter(sub => {
    const customer = users.find(u => u.id === sub.customer_id);
    const nameMatch = customer?.name?.toLowerCase().includes(subSearch.toLowerCase());
    const statusMatch = subFilter === 'all' || sub.payment_status === subFilter;
    return nameMatch && statusMatch;
  });

  // Calculate stats
  const activeCount = subscriptions.length;
  const pendingPayments = subscriptions.filter(s => s.payment_status !== 'paid').length;
  const holidaysCount = exceptions.filter(e => e.type === 'holiday' || e.type === 'closure').length;
  const todayTasks = tasks.filter(t => t.date === manifestDate);
  const deliveredToday = todayTasks.filter(t => t.status === 'delivered').length;
  const failedToday = todayTasks.filter(t => t.status === 'failed').length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" id="kitchen-dashboard">
      
      {/* Dashboard Top Banner */}
      <div className="bg-slate-900 px-6 py-6 border-b border-slate-800 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-xs uppercase font-semibold font-mono tracking-wider">
              Control Panel
            </span>
            <span className="text-slate-400 text-xs font-mono">• Active Kitchen</span>
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight mt-1">
            {kitchen.name} <span className="font-light text-slate-400">HQ</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-500" /> {kitchen.pickup_address}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onRefresh}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-xs text-white rounded-lg flex items-center gap-2 font-medium border border-slate-700/50"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" /> Synchronization
          </button>
          <div className="text-right hidden sm:block font-mono text-xs text-slate-400">
            <div>UTC Global: 2026-06-08</div>
            <div>Operating: Mon-Fri</div>
          </div>
        </div>
      </div>

      {/* Surface Navigation tabs */}
      <div className="flex border-b border-slate-100 overflow-x-auto select-none bg-slate-50/50">
        {[
          { id: 'home', label: 'Dashboard Hub', icon: Award },
          { id: 'menu', label: 'Menu & Meals', icon: Package },
          { id: 'calendar', label: 'Calendar Exceptions', icon: CalendarIcon },
          { id: 'subscriptions', label: 'Subscriptions Index', icon: ClipboardList },
          { id: 'manifest', label: 'Daily Dispatch Manifest', icon: PrintersButton },
          { id: 'customers', label: 'Customer Profiles', icon: Users }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              id={`tab-btn-${tab.id}`}
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-4 text-xs font-medium border-b-2 whitespace-nowrap transition-all duration-150 ${
                isActive 
                  ? 'border-slate-900 text-slate-900 bg-white font-semibold' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/70'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-6">
        {/* TAB 1: DASHBOARD HOME */}
        {activeSubTab === 'home' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Active Subscriptions */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Active Subscriptions</span>
                  <Package className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-slate-900">{activeCount}</span>
                  <span className="text-emerald-600 text-xs font-bold font-mono">Agreements</span>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full mt-3">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, activeCount * 4)}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400 mt-2 block">Active prepaid consumer subscriptions</span>
              </div>

              {/* Card 2: Pending Payments */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">Pending Payments</span>
                  <DollarSign className="w-5 h-5 text-slate-400 group-hover:text-red-500 transition-colors" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-slate-900">{pendingPayments}</span>
                  <span className="text-rose-500 text-xs font-bold font-mono">{pendingPayments > 0 ? "High" : "Sufficient"}</span>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full mt-3">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, pendingPayments * 10)}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400 mt-2 block">Requires payment confirmation</span>
              </div>

              {/* Card 3: Compensation/Exceptions */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">Compensation Days</span>
                  <CalendarIcon className="w-5 h-5 text-slate-400 group-hover:text-purple-500 transition-colors" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-slate-900">{holidaysCount < 10 ? `0${holidaysCount}` : holidaysCount}</span>
                  <span className="text-slate-400 text-xs font-medium font-mono">This Week</span>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full mt-3">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, holidaysCount * 20)}%` }}></div>
                </div>
                <span className="text-[10px] text-slate-400 mt-2 block">Active holidays and closures</span>
              </div>

              {/* Card 4: Daily dispatch tracker */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    Dispatch
                    <input 
                      type="date" 
                      value={manifestDate} 
                      onChange={e => setManifestDate(e.target.value)} 
                      className="bg-transparent border-0 py-0 pl-1 pr-0 text-slate-700 text-[10px] font-black focus:ring-0 cursor-pointer w-20 outline-none font-mono"
                    />
                  </span>
                  <ClipboardList className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-slate-900">{todayTasks.length}</span>
                  <span className="text-slate-400 text-xs font-semibold font-mono">Stops</span>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full mt-3">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${todayTasks.length > 0 ? (deliveredToday / todayTasks.length) * 100 : 0}%` }}></div>
                </div>
                <div className="text-[9px] text-slate-500 mt-2 flex items-center justify-between select-none font-mono">
                  <span>🟢 {deliveredToday} D</span>
                  <span>🔴 {failedToday} F</span>
                  <span>🟡 {todayTasks.length - deliveredToday - failedToday} P</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Exceptions List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-semibold text-sm text-slate-900">Current Culinary Exceptions</h3>
                  <button 
                    onClick={() => setActiveSubTab('calendar')}
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Manage Calendar Settings &rarr;
                  </button>
                </div>

                {exceptions.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                    No active exception blocks configured at this time.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {exceptions.map(ex => (
                      <div key={ex.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono tracking-wider uppercase ${
                              ex.type === 'holiday' ? 'bg-amber-100 text-amber-800' :
                              ex.type === 'closure' ? 'bg-rose-100 text-rose-800' :
                              ex.type === 'fasting_period' ? 'bg-cyan-100 text-cyan-800' :
                              'bg-indigo-100 text-indigo-800'
                            }`}>
                              {ex.type}
                            </span>
                            <span className="text-slate-400 font-mono font-medium">{ex.date}</span>
                          </div>
                          <p className="text-slate-700 font-medium mt-1">{ex.reason}</p>
                        </div>
                        {ex.type !== 'compensation' && (
                          <button 
                            onClick={() => handleDeleteException(ex.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Remove exception"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Controls Card */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-sm text-slate-900">Platform Demonstration</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Oz Kitchen delivers premium weekday lunch boxes to corporate staff.
                  When holidays or closures fall on weekdays, customers automatically receive <strong>compensation extensions</strong> at the end of their subscription.
                </p>
                <div className="border-t border-slate-200/60 pt-4 space-y-2">
                  <div className="text-[11px] text-slate-400 font-mono">INTEGRITY DIAGNOSTICS:</div>
                  <div className="text-xs font-medium text-slate-700">✓ Event-Sourced Operations</div>
                  <div className="text-xs font-medium text-slate-700">✓ Deterministic Calendar Extensions</div>
                  <div className="text-xs font-medium text-slate-700">✓ Multi-User Client Separation</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MENU MANAGER */}
        {activeSubTab === 'menu' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-semibold text-sm text-slate-900">Current Month's Offerings</h2>
                <p className="text-xs text-slate-400">Valid period: {menu.valid_from} to {menu.valid_to}</p>
              </div>
              <button 
                onClick={() => setAddingMeal(!addingMeal)}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-slate-800 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> {addingMeal ? 'Hide Form' : 'Register New Meal'}
              </button>
            </div>

            {addingMeal && (
              <form onSubmit={handleAddMeal} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-slate-600 font-medium font-mono uppercase text-[10px]">Meal Name</label>
                  <input 
                    type="text" 
                    value={mealName}
                    onChange={e => setMealName(e.target.value)}
                    placeholder="e.g., Gomen Wat" 
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 bg-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-600 font-medium font-mono uppercase text-[10px]">Photo Unsplash URL (Optional)</label>
                  <input 
                    type="url" 
                    value={mealPhoto}
                    onChange={e => setMealPhoto(e.target.value)}
                    placeholder="https://..." 
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-600 font-medium font-mono uppercase text-[10px]">Dietary / Fasting Type</label>
                  <select 
                    value={mealType}
                    onChange={e => setMealType(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500 bg-white"
                  >
                    <option value="non_fasting">Non-Fasting (Meat/Poultry)</option>
                    <option value="fasting">Fasting (Vegan/Grains)</option>
                  </select>
                </div>
                <div className="flex items-end gap-3">
                  <label className="flex items-center gap-1.5 pb-2.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={mealIsCombo}
                      onChange={e => setMealIsCombo(e.target.checked)}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-slate-600 font-medium">Is Combo Meal</span>
                  </label>
                  <button 
                    type="submit"
                    className="ml-auto px-4 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all text-white font-medium rounded-lg text-xs"
                  >
                    Submit
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {meals.map(m => (
                <div key={m.id} className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col group hover:border-slate-200 transition-all">
                  <div className="h-32 overflow-hidden relative bg-slate-100">
                    <img 
                      src={m.photo_url} 
                      alt={m.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                    <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider font-mono uppercase text-white ${
                      m.type === 'fasting' ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}>
                      {m.type === 'fasting' ? 'Fasting' : 'Non-Fasting'}
                    </span>
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-semibold text-xs text-slate-800 line-clamp-1">{m.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{m.is_combo ? 'Combo Premium Special' : 'Single Meal option'}</p>
                    </div>
                    {m.is_combo && (
                      <span className="mt-2 text-[9px] bg-amber-100 text-amber-800 self-start px-1 rounded font-medium">
                        ✦ Combo Included
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CALENDAR EXCEPTIONS CONFIG */}
        {activeSubTab === 'calendar' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-semibold text-sm text-slate-900 font-display">Declare Calendar Exceptions</h2>
                <p className="text-xs text-slate-400">Introduce holidays, fasting periods, or kitchen shutdowns to test computational extension model.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form to declare */}
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl text-xs space-y-4">
                <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Define Exception
                </h3>

                <form onSubmit={handleAddException} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase text-slate-400 font-semibold">Exception Date (Weekday only)</label>
                    <input 
                      type="date" 
                      value={exDate}
                      onChange={e => setExDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-amber-500 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase text-slate-400 font-semibold">Exception Type</label>
                    <select 
                      value={exType}
                      onChange={e => setExType(e.target.value as any)}
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-amber-500 text-xs"
                    >
                      <option value="holiday">Holiday (Mon-Fri Off, extended duration)</option>
                      <option value="closure">Closure (Kitchen Shutdown, extended duration)</option>
                      <option value="fasting_period">Declare Hybrid Fasting Range Cover</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase text-slate-400 font-semibold">Reason</label>
                    <input 
                      type="text" 
                      value={exReason}
                      onChange={e => setExReason(e.target.value)}
                      placeholder="e.g. Ethiopian Martyrs Day"
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-none focus:border-amber-500 text-xs"
                      required
                    />
                  </div>

                  {/* Impact preview */}
                  <div className="bg-amber-100/30 border border-amber-500/20 p-3 rounded-lg text-slate-700">
                    <h4 className="font-semibold text-[10px] text-amber-800 uppercase tracking-widest font-mono">Live Compensation Preview</h4>
                    <p className="mt-1 leading-snug">
                      Adding this exception on <strong className="font-mono text-slate-900">{exDate}</strong> affects <strong>{exceptionPreviewCount}</strong> active customer subscriptions.
                    </p>
                    {exceptionPreviewCount > 0 && (
                      <p className="text-[10px] text-slate-500 mt-1.5 font-light">
                        Saving will extend active subscriptions to the next open working day and log appropriate auto-grafted compensation tasks.
                      </p>
                    )}
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-all font-display text-xs"
                  >
                    Commit Exception Block
                  </button>
                </form>
              </div>

              {/* Exception rules and definitions */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-semibold text-xs text-slate-900 uppercase font-mono tracking-widest text-slate-500">Configured Calendar Settings</h3>
                {exceptions.length === 0 ? (
                  <div className="py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                    Clean calendar. No exception records registered.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {exceptions.map(ex => (
                      <div key={ex.id} className="p-3 bg-white border border-slate-100 rounded-xl flex justify-between items-center text-xs shadow-sm hover:border-slate-200 transition-all">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold font-mono tracking-wider uppercase text-white ${
                              ex.type === 'holiday' ? 'bg-amber-500' :
                              ex.type === 'closure' ? 'bg-red-500' :
                              ex.type === 'fasting_period' ? 'bg-cyan-500' : 
                              'bg-indigo-500'
                            }`}>
                              {ex.type}
                            </span>
                            <span className="text-slate-500 font-mono font-medium">{ex.date}</span>
                          </div>
                          <span className="text-slate-800 font-medium block">{ex.reason}</span>
                        </div>
                        {ex.type !== 'compensation' && (
                          <button 
                            onClick={() => handleDeleteException(ex.id)}
                            className="text-xs text-rose-500 font-medium px-2 py-1 bg-rose-50 hover:bg-rose-100 rounded"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SUBSCRIPTIONS INDEX */}
        {activeSubTab === 'subscriptions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-semibold text-sm text-slate-900">Active Weekday Subscriptions</h2>
                <p className="text-xs text-slate-400">Prepaid corporate dining dispatch models.</p>
              </div>

              {/* Filters search */}
              <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
                <div className="relative flex-1 sm:w-48 bg-slate-50 rounded-lg border border-slate-200">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    value={subSearch}
                    onChange={e => setSubSearch(e.target.value)}
                    placeholder="Search client..."
                    className="w-full pl-8 pr-3 py-1 bg-transparent text-xs focus:ring-0 focus:outline-none text-slate-700"
                  />
                </div>
                <select
                  value={subFilter}
                  onChange={e => setSubFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
                >
                  <option value="all">All States</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
            </div>

            {filteredSubs.length === 0 ? (
              <div className="py-12 bg-slate-50 rounded-xl text-center text-slate-400 border border-dashed border-slate-200 text-xs">
                No matching subscription records found.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      <th className="p-4">Customer Name</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Period Range</th>
                      <th className="p-4">Preference</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4">Deliveries</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubs.map((sub: any) => (
                      <tr key={sub.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-slate-900">{sub.customer_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{sub.customer_phone}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            sub.type === 'fasting' ? 'bg-emerald-100 text-emerald-800' :
                            sub.type === 'non_fasting' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {sub.type}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-mono">{sub.start_date}</span> to <span className="font-mono">{sub.end_date}</span>
                        </td>
                        <td className="p-4 uppercase font-mono text-[10px] font-semibold text-slate-500">
                          {sub.combo_preference}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 font-semibold ${
                            sub.payment_status === 'paid' ? 'text-emerald-600' : 'text-rose-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sub.payment_status === 'paid' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {sub.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500">
                          {sub.tasks ? sub.tasks.length : 0} dates scheduled
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => fetchSubscriptionDetail(sub.id)}
                            className="px-2.5 py-1 bg-slate-950 text-white rounded text-[10px] font-medium hover:bg-slate-800 transition-all font-mono inline-flex items-center gap-1"
                          >
                            Timeline <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Selected Subscription Timeline Detail Modal */}
            {selectedSub && (
              <div className="p-5 border border-slate-200/80 rounded-xl bg-slate-50 relative">
                <button 
                  onClick={() => setSelectedSub(null)}
                  className="absolute top-4 right-4 p-1.5 hover:bg-white rounded border border-slate-200 shadow-sm transition-all"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>

                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold">Prepaid Customer Timeline Detail</span>
                    <h3 className="text-base font-bold text-slate-900 mt-1 font-display">
                      {selectedSub.customer?.name || "Client Timeline"}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <Phone className="w-3 h-3 text-amber-500" /> {selectedSub.customer?.phone} 
                      <span className="text-slate-300">|</span> 
                      <MapPin className="w-3 h-3 text-slate-500 inline" /> {selectedSub.subscription?.delivery_address}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {selectedSub.subscription?.payment_status !== 'paid' && (
                      <button 
                        onClick={() => handleMarkPaid(selectedSub.subscription.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium flex items-center gap-1.5"
                      >
                        <DollarSign className="w-3.5 h-3.5" /> Confirm Telebirr Transfer
                      </button>
                    )}
                    <span className="text-xs font-mono font-semibold px-2 py-1 bg-white border border-slate-200 rounded">
                      ID: {selectedSub.subscription?.id}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
                  {/* Left stats summary */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-xs text-slate-500 uppercase tracking-widest font-mono">Summary Meta</h4>
                    
                    <div className="p-3.5 bg-white border border-slate-100 rounded-lg space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Fasting Category:</span>
                        <span className="font-semibold text-slate-900 uppercase font-mono">{selectedSub.subscription?.type}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Box Size:</span>
                        <span className="font-semibold text-slate-900 uppercase font-mono">{selectedSub.subscription?.combo_preference}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Activation Date:</span>
                        <span className="font-semibold text-slate-900 font-mono">{selectedSub.subscription?.start_date}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Original Expiry:</span>
                        <span className="font-semibold text-slate-900 font-mono">{selectedSub.subscription?.end_date}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-500/10 text-amber-900 rounded-lg text-xs border border-amber-500/20 leading-relaxed font-light">
                      <strong>Automatic Exception Extend Engine:</strong> When a kitchen exception (like a holiday) falls in this subscriber's period, a compensation task is generated, appending next weekday without reducing delivery credits.
                    </div>
                  </div>

                  {/* Right tasks chronological lists */}
                  <div className="md:col-span-2 space-y-3">
                    <h4 className="font-semibold text-xs text-slate-500 uppercase tracking-widest font-mono">
                      Calculated Dispatch Chronology Tasks ({selectedSub.tasks?.length || 0})
                    </h4>

                    <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                      {selectedSub.tasks?.map((task: any) => {
                        const sel = selectedSub.selections?.find((s: any) => s.date === task.date);
                        return (
                          <div key={task.id} className={`p-3 rounded-lg border flex justify-between items-center text-xs shadow-sm bg-white ${
                            task.is_compensation 
                              ? 'border-indigo-200 bg-indigo-50/20' 
                              : 'border-slate-100'
                          }`}>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-800">{task.date}</span>
                                {task.is_compensation && (
                                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase font-mono">
                                    COMPENSATION
                                  </span>
                                )}
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                                  task.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                                  task.status === 'failed' ? 'bg-rose-100 text-rose-800' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {task.status}
                                </span>
                              </div>
                              <div className="mt-1 text-slate-500 text-xs flex items-center gap-1.5">
                                <span className="font-bold text-slate-700 font-display">Assigned Option:</span> 
                                {sel?.meal ? (
                                  <span className="text-amber-800 font-medium">{sel.meal.name} ({sel.meal.type === 'fasting' ? 'Fasting 🌿' : 'Meat 🍖'})</span>
                                ) : (
                                  <span className="italic text-slate-400">Unspecified meal option selected</span>
                                )}
                              </div>
                              {task.is_compensation && (
                                <p className="text-[10px] text-indigo-600 mt-1 font-mono italic">
                                  {task.compensation_reason || "Compensation Extension"}
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 bg-slate-50 px-1.5 py-1 border border-slate-200 text-slate-600 rounded">
                              {selectedSub.subscription?.combo_preference}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: DAILY MANIFEST (PRINTABLE) */}
        {activeSubTab === 'manifest' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-semibold text-sm text-slate-900 font-display">Daily Dispatch Manifest</h2>
                <p className="text-xs text-slate-400">Morning driver checklist. Sorted and grouped for optimal delivery.</p>
              </div>

              {/* Date controller and print buttons */}
              <div className="flex items-center gap-3 w-full sm:w-auto text-xs">
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-xs font-mono select-none">Target:</span>
                  <input 
                    type="date" 
                    value={manifestDate}
                    onChange={e => setManifestDate(e.target.value)}
                    className="bg-transparent border-0 py-0 text-xs font-bold font-mono focus:ring-0 cursor-pointer w-28"
                  />
                </div>
                <button 
                  onClick={() => {
                    const printContents = document.getElementById('printable-manifest')?.innerHTML;
                    const originalContents = document.body.innerHTML;
                    
                    if (printContents) {
                      // Compact quick print logic for demonstration
                      const win = window.open('', '_blank');
                      win?.document.write(`
                        <html>
                          <head>
                            <title>Oz Kitchen Dispatch Manifest</title>
                            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                          </head>
                          <body class="p-8 text-black text-xs" onload="window.print()">
                            <div class="border-b-2 border-black pb-4 mb-4">
                              <h1 class="text-2xl font-bold font-mono">OZ KITCHEN ETHIOPIA - DISPATCH MANIFEST</h1>
                              <p class="font-mono">${manifestDate} | OPERATING WORKDAY</p>
                            </div>
                            ${printContents}
                          </body>
                        </html>
                      `);
                      win?.document.close();
                    }
                  }}
                  className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 transition-all text-white font-medium rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Export/Print Manifest
                </button>
              </div>
            </div>

            {/* Print Target */}
            <div id="printable-manifest" className="p-4 bg-white border border-slate-200/80 rounded-2xl relative">
              <div className="absolute top-4 right-4 text-xs font-mono text-slate-300">MANIFEST_GEN_V1</div>
              <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 font-mono mb-4">Routing Dispatch Log - {manifestDate}</h3>

              {todayTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">
                  No active delivery tasks scheduled for weekday date: {manifestDate}.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Print group - grouped by neighborhood */}
                  {[
                    { name: 'Bole / Edna Mall Route', keywords: ['bole', 'edna'] },
                    { name: 'Wollo Sefer / Kasanchis Route', keywords: ['wollo', 'kasanchis', 'sefer', 'kazanchis'] },
                    { name: 'General Deliveries', keywords: [] }
                  ].map(route => {
                    // filter to category keyword
                    const isGeneral = route.keywords.length === 0;
                    const groupTasks = todayTasks.filter((task: any) => {
                      const addr = task.delivery_address?.toLowerCase() || '';
                      const matchesKeyword = route.keywords.some(k => addr.includes(k));
                      if (isGeneral) {
                        // General catches everything that didn't match previous groups
                        const matchedPrevious = ['bole', 'edna', 'wollo', 'kasanchis', 'sefer', 'kazanchis'].some(k => addr.includes(k));
                        return !matchedPrevious;
                      }
                      return matchesKeyword;
                    });

                    if (groupTasks.length === 0) return null;

                    return (
                      <div key={route.name} className="space-y-3">
                        <div className="bg-slate-100 p-2 rounded-lg font-mono text-[10px] uppercase font-bold text-slate-700 border border-slate-200/60">
                          {route.name} ({groupTasks.length} drops)
                        </div>
                        <div className="divide-y divide-slate-100">
                          {groupTasks.map((task: any) => (
                            <div key={task.id} className="py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs leading-relaxed">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{task.customer_name}</span>
                                  <span className="font-mono text-slate-400">({task.customer_phone})</span>
                                  <span className={`px-1 rounded text-[9px] font-bold font-mono tracking-wider ${
                                    task.meal_type === 'fasting' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {task.meal_type === 'fasting' ? 'VEG' : 'MEAT'}
                                  </span>
                                  <span className="px-1 bg-amber-100 text-amber-800 rounded font-mono text-[9px] tracking-widest font-bold">
                                    {task.combo_preference}
                                  </span>
                                </div>
                                <p className="text-slate-600 flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 inline" /> 
                                  <span>Dropoff: <strong>{task.delivery_address}</strong></span>
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  Pickup: {task.pickup_address}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="font-mono bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-100 font-bold">
                                  {task.meal_name}
                                </span>
                                {task.is_compensation && (
                                  <div className="text-[9px] text-indigo-500 font-mono mt-1 italic font-semibold">
                                    ★ Compensation Extension
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: CUSTOMERS LIST */}
        {activeSubTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-semibold text-sm text-slate-900 font-display">Registered Customer Profiles</h2>
                <p className="text-xs text-slate-400">Edit core delivery profiles, addresses and synchronize active contracts.</p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64 bg-slate-50 rounded-lg border border-slate-200">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={custSearch}
                  onChange={e => setCustSearch(e.target.value)}
                  placeholder="Search profile name or phone..."
                  className="w-full pl-8 pr-3 py-1.5 bg-transparent text-xs focus:ring-0 focus:outline-none text-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users
                .filter(u => u.role === 'customer' && (u.name?.toLowerCase().includes(custSearch.toLowerCase()) || u.phone.includes(custSearch)))
                .map(cust => {
                  const isEditing = editingCustId === cust.id;
                  return (
                    <div key={cust.id} className="p-4 bg-white border border-slate-100 shadow-sm rounded-xl hover:border-slate-200 transition-all text-xs">
                      {isEditing ? (
                        <div className="space-y-3.5">
                          <h4 className="font-semibold text-slate-800">Edit Customer Account</h4>
                          <div className="space-y-2">
                            <input 
                              type="text" 
                              value={editCustName} 
                              onChange={e => setEditCustName(e.target.value)} 
                              placeholder="Customer Name"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                            />
                            <input 
                              type="text" 
                              value={editCustPhone} 
                              onChange={e => setEditCustPhone(e.target.value)} 
                              placeholder="Phone Number"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                            />
                            <textarea 
                              value={editCustAddress} 
                              onChange={e => setEditCustAddress(e.target.value)} 
                              placeholder="Delivery Workplace/Desk Address"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none h-14"
                            />
                          </div>
                          <div className="flex justify-end gap-2 text-xs">
                            <button 
                              onClick={() => setEditingCustId(null)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleSaveCustomer(cust.id)}
                              className="px-3 py-1 bg-slate-900 text-white rounded font-medium"
                            >
                              Save Address
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col h-full justify-between gap-4">
                          <div className="space-y-1.5">
                            <h4 className="font-bold text-sm text-slate-800">{cust.name}</h4>
                            <p className="text-slate-400 font-mono text-[10px] mt-0.5 uppercase tracking-wide">Customer Account Profile</p>
                            <div className="space-y-1 text-slate-600 mt-2">
                              <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-amber-500" /> {cust.phone}</p>
                              <p className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {cust.address || 'Address unconfigured'}</p>
                            </div>
                            {cust.telegram_user_id && (
                              <p className="mt-2.5 text-[10px] bg-sky-50 text-sky-800 inline-block px-1.5 py-0.5 rounded font-mono font-medium">
                                Telegram Authenticated ID: {cust.telegram_user_id}
                              </p>
                            )}
                          </div>

                          <button 
                            onClick={() => {
                              setEditingCustId(cust.id);
                              setEditCustName(cust.name || '');
                              setEditCustPhone(cust.phone || '');
                              setEditCustAddress(cust.address || '');
                            }}
                            className="mt-2 text-xs text-slate-600 font-medium px-2.5 py-1 bg-slate-50 border border-slate-200/60 rounded hover:bg-slate-100 inline-self-start mr-auto"
                          >
                            Edit Workplace Destination
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Separate printable manifest button to avoid compile issues
function PrintersButton({ className }: { className?: string }) {
  return <Printer className={className} />;
}
