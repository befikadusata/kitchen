import React, { useState, useEffect } from 'react';
import { 
  Send, Menu as HamMenu, CheckCircle, Shield, ShoppingCart, Calendar, Grid, 
  Settings, Loader, Star, Compass, ArrowRightLeft, Info, HelpCircle, User, 
  MapPin, RefreshCw, AlertCircle, Sparkles, DollarSign
} from 'lucide-react';
import { Meal, Menu, Subscription, CalendarException, DeliveryTask } from '../utils/calendar';

const MEAL_INGREDIENTS: Record<string, string[]> = {
  m1: ['Chickpeas powder', 'Berbere spice', 'Onions', 'Garlic', 'Vegetable oil', 'Injera'],
  m2: ['Red lentils', 'Berbere spice', 'Onions', 'Garlic', 'Ginger', 'Vegetable oil', 'Injera'],
  m3: ['Misir wat', 'Shiro', 'Yellow split peas', 'Cabbage', 'Collard greens', 'Beetroot', 'Injera'],
  m4: ['Torn injera', 'Berbere spice', 'Onions', 'Tomatoes', 'Garlic', 'Vegetable oil'],
  m5: ['Chicken', 'Red onions', 'Berbere spice', 'Spiced butter', 'Garlic', 'Ginger', 'Hard-boiled eggs', 'Injera'],
  m6: ['Beef chunks', 'Onions', 'Garlic', 'Rosemary', 'Green chili pepper', 'Spiced butter', 'Injera'],
  m7: ['Beef chunks', 'Potatoes', 'Turmeric', 'Garlic', 'Ginger', 'Onions', 'Injera'],
  m8: ['Beef tibs', 'Doro wat', 'Lamb stew', 'Collard greens with beef', 'Cottage cheese', 'Injera']
};

interface TelegramMiniAppProps {
  users: any[];
  meals: Meal[];
  menu: Menu;
  subscriptions: Subscription[];
  exceptions: CalendarException[];
  tasks: DeliveryTask[];
  onRefresh: () => void;
}

export default function TelegramMiniApp({
  users,
  meals,
  menu,
  subscriptions,
  exceptions,
  tasks,
  onRefresh
}: TelegramMiniAppProps) {
  // Simulator User Selector
  const [selectedSimUserId, setSelectedSimUserId] = useState<number>(3); // Deborah Mezmur
  const [activeUser, setActiveUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [subTab, setSubTab] = useState<'menu' | 'rotation' | 'calendar' | 'account'>('calendar');
  const [searchQuery, setSearchQuery] = useState('');

  // Customer rotation picker state
  const [selectedMealIdsForRotation, setSelectedMealIdsForRotation] = useState<string[]>([]);
  const [rotationPreview, setRotationPreview] = useState<any[]>([]);
  const [previewingRotation, setPreviewingRotation] = useState(false);

  // Meal swap modal
  const [swappingDate, setSwappingDate] = useState<string | null>(null);
  const [swapCandidates, setSwapCandidates] = useState<Meal[]>([]);

  // Telebirr upload simulator
  const [simPaymentAmount, setSimPaymentAmount] = useState('3500');
  const [simPaymentRef, setSimPaymentRef] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Create Sub Form Sim
  const [simSubType, setSimSubType] = useState<'fasting' | 'hybrid' | 'non_fasting'>('hybrid');
  const [simComboPref, setSimComboPref] = useState<'combo' | 'single'>('combo');
  const [creatingSub, setCreatingSub] = useState(false);

  // Authenticate current user on simulation change
  const authenticateUser = async (userId: number) => {
    setLoadingUser(true);
    try {
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bypass: true,
          mockUserId: userId
        })
      });
      if (response.ok) {
        const payload = await response.json();
        setActiveUser(payload.user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    authenticateUser(selectedSimUserId);
  }, [selectedSimUserId]);

  // Find primary active subscription for this user
  const userSub = subscriptions.find(s => s.customer_id === activeUser?.id);
  const subTasks = tasks.filter(t => t.subscription_id === userSub?.id);

  // Filter menu meals matching user subscription bounds
  const getFastingStyleForBrowsing = () => {
    if (!userSub) return 'all';
    return userSub.type;
  };

  const browsableMeals = meals.filter(m => {
    const style = getFastingStyleForBrowsing();
    if (style === 'fasting') return m.type === 'fasting';
    if (style === 'non_fasting') return m.type === 'non_fasting';
    return true; // hybrid browses both
  });

  const filteredBrowsableMeals = browsableMeals.filter(m => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const nameMatch = m.name.toLowerCase().includes(query);
    const idStr = String(m.id);
    const ingredients = MEAL_INGREDIENTS[idStr] || [];
    const ingredientMatch = ingredients.some(ing => ing.toLowerCase().includes(query));
    return nameMatch || ingredientMatch;
  });

  // Handle Favorite Star toggle for Meal rotation formulation
  const handleToggleMealForRotation = (mealId: string) => {
    if (selectedMealIdsForRotation.includes(mealId)) {
      setSelectedMealIdsForRotation(prev => prev.filter(id => id !== mealId));
    } else {
      if (selectedMealIdsForRotation.length >= 5) {
        alert("You may select a maximum of 5 favorite rotation meals.");
        return;
      }
      setSelectedMealIdsForRotation(prev => [...prev, mealId]);
    }
  };

  // Compute rotation live preview using API
  const handlePreviewRotation = async () => {
    if (!userSub) return;
    if (selectedMealIdsForRotation.length === 0) {
      alert("Please select at least one favorite meal to begin rotation mapping.");
      return;
    }
    setPreviewingRotation(true);

    try {
      const response = await fetch('/api/subscriptions/rotation-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_meal_ids: selectedMealIdsForRotation,
          type: userSub.type,
          start_date: userSub.start_date,
          end_date: userSub.end_date
        })
      });
      if (response.ok) {
        const preview = await response.json();
        setRotationPreview(preview);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPreviewingRotation(false);
    }
  };

  // Commit favorite rotation to active subscription
  const handleCommitRotation = async () => {
    if (!userSub || rotationPreview.length === 0) return;
    try {
      const selectionsPayload = rotationPreview.map(p => ({
        date: p.date,
        meal_id: p.meal.id
      }));

      const response = await fetch(`/api/subscriptions/${userSub.id}/confirm-meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections: selectionsPayload
        })
      });

      if (response.ok) {
        alert("Subscription rotation selections set and confirmed!");
        setRotationPreview([]);
        setSelectedMealIdsForRotation([]);
        onRefresh();
        setSubTab('calendar');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Swap candidate meals when customer taps on calendar date
  const handleOpenSwapDialog = (dateStr: string, isFastingDayOnDate: boolean) => {
    if (!userSub) return;
    setSwappingDate(dateStr);
    
    // Constraint: "Every MealSelection must match the fasting type of its date (fasting meal on fasting days, non-fasting meal on non-fasting days)"
    const requiredType = isFastingDayOnDate ? 'fasting' : 'non_fasting';
    const matches = meals.filter(m => m.type === requiredType);
    setSwapCandidates(matches);
  };

  // Swap meal for date
  const handleCommitSwap = async (mealId: string | number) => {
    if (!userSub || !swappingDate) return;
    try {
      const response = await fetch(`/api/subscriptions/${userSub.id}/meals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: swappingDate,
          meal_id: mealId
        })
      });
      if (response.ok) {
        setSwappingDate(null);
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Telebirr simulation payment action
  const handleTelebirrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSub) return;
    setPaymentSubmitting(true);
    
    const txnRef = simPaymentRef || `ETH${Math.floor(Math.random() * 899999 + 100000)}`;

    try {
      const response = await fetch(`/api/subscriptions/${userSub.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(simPaymentAmount),
          telebirr_ref: txnRef,
          screenshot_url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=400'
        })
      });
      if (response.ok) {
        alert(`Payment transfer mock uploaded and confirmed! Txn: ${txnRef}`);
        setSimPaymentRef('');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Create sub demo simulator
  const handleCreateSubSim = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingSub(true);

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: activeUser.id,
          type: simSubType,
          combo_preference: simComboPref,
          start_date: '2026-06-08',
          end_date: '2026-06-19',
          delivery_address: activeUser.address || 'Central Addis Office'
        })
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingSub(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-slate-100 text-slate-800 min-h-[600px] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-300 flex flex-col font-sans" id="tg-mini-app">
      
      {/* Telegram App Header bar */}
      <div className="bg-[#2481cc] text-white p-3 pt-4 flex justify-between items-center select-none shadow-sm relative">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 shrink-0 rotate-12" />
          <div>
            <h2 className="text-xs font-bold leading-none">Oz Kitchen Bot</h2>
            <span className="text-[9px] text-[#86c4f5] block mt-0.5">Mini-App Portal</span>
          </div>
        </div>

        {/* Sim User login drawer */}
        <select 
          value={selectedSimUserId} 
          onChange={e => setSelectedSimUserId(Number(e.target.value))}
          className="bg-[#1c6fae] hover:bg-[#165a8e] transition-colors border-0 py-1 px-2.5 rounded text-[10px] font-mono focus:ring-0 leading-none cursor-pointer outline-none font-bold text-white max-w-[130px]"
        >
          {users.map(u => (
            <option key={u.id} value={u.id} className="text-slate-900 bg-white font-sans text-xs">
              🤖 {u.name || u.role}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-[#2481cc] text-white px-4 pb-2 flex justify-between items-center text-[10px] select-none text-sky-100 font-mono">
        <div>Active: {activeUser ? activeUser.name : 'Resolving Telegram...'}</div>
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-[#53d053]" />
          <span>TMA SECURE</span>
        </div>
      </div>

      {loadingUser ? (
        <div className="flex-1 flex flex-col justify-center items-center text-slate-400 bg-slate-50">
          <Loader className="w-8 h-8 animate-spin text-[#2481cc]" />
          <span className="text-xs font-mono mt-2 uppercase tracking-widest text-[#2481cc]">Validating Auth Token...</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
          
          {/* Active Navigation Tabs */}
          <div className="bg-white border-b border-slate-200/60 grid grid-cols-4 select-none">
            {[
              { id: 'calendar', label: 'My Calendar', icon: Calendar },
              { id: 'rotation', label: 'Rotations', icon: Compass },
              { id: 'menu', label: 'Browse', icon: Grid },
              { id: 'account', label: 'Invoice', icon: Shield }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSubTab(tab.id as any)}
                  className={`py-3 flex flex-col items-center gap-1 border-b-2 text-[10px] font-medium transition-all ${
                    isActive ? 'border-[#2481cc] text-[#2481cc]' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* TAB: CALENDAR */}
            {subTab === 'calendar' && (
              <div className="space-y-4">
                {/* Subscription summary panel */}
                {!userSub ? (
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
                    <div className="flex items-start gap-2 text-xs">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-slate-800">No active lunch subscription found</h4>
                        <p className="text-slate-500 text-[11px] leading-relaxed mt-1">
                          Register a test subscription to cycle, extend compensation, or swap fresh meals.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleCreateSubSim} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono font-bold text-slate-400 uppercase">Fasting Class</label>
                          <select 
                            value={simSubType} 
                            onChange={e => setSimSubType(e.target.value as any)}
                            className="bg-white border text-xs focus:ring-0 w-full"
                          >
                            <option value="hybrid">Hybrid (Fast Wed/Fri)</option>
                            <option value="fasting">Fasting 100%</option>
                            <option value="non_fasting">Non-Fasting 100%</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono font-bold text-slate-400 uppercase">Combo Preference</label>
                          <select 
                            value={simComboPref} 
                            onChange={e => setSimComboPref(e.target.value as any)}
                            className="bg-white border text-xs focus:ring-0 w-full"
                          >
                            <option value="combo">Combo Lunch</option>
                            <option value="single">Single Plate</option>
                          </select>
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        disabled={creatingSub}
                        className="w-full py-1.5 bg-[#2481cc] text-white rounded font-bold hover:bg-[#1a6fae]"
                      >
                        {creatingSub ? 'Activating...' : 'Setup Test Subscription'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-[#2481cc]/10 border border-[#2481cc]/20 p-3.5 rounded-2xl text-xs space-y-2">
                      <div className="flex justify-between items-center font-bold text-slate-800">
                        <span>Prepaid Weekday Plan</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold ${
                          userSub.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800 animate-pulse'
                        }`}>
                          {userSub.payment_status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 leading-normal space-y-1">
                        <p>Type: <strong className="text-slate-800 uppercase font-semibold">{userSub.type}</strong> ({userSub.combo_preference})</p>
                        <p>Period: <span className="font-mono">{userSub.start_date}</span> to <span className="font-mono">{userSub.end_date}</span></p>
                        <p className="flex items-start gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Workplace: {userSub.delivery_address}</p>
                      </div>
                    </div>

                    {/* Subscription chronological task checklist */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-semibold tracking-wider font-mono uppercase text-slate-400">Scheduled Deliveries ({subTasks.length})</h4>
                      <div className="space-y-2 text-xs">
                        {subTasks.map((t: any) => {
                          const exception = exceptions.find(ex => ex.date === t.date && (ex.type === 'holiday' || ex.type === 'closure'));
                          const isCancelled = !!exception;
                          
                          // Determine fasting or meat style of this specific date
                          const dayDate = new Date(t.date);
                          const dayOfWeek = dayDate.getDay();
                          const isFasting = userSub.type === 'fasting' || 
                            (userSub.type === 'hybrid' && (dayOfWeek === 3 || dayOfWeek === 5 || exceptions.some(ex => ex.type === 'fasting_period' && ex.date === t.date)));
                          
                          // Find user meal assigned for tasks
                          const selection = userSub ? subscriptions.find(() => true) /* fallback dummy */ : null;
                          const taskSel = tasks.find(tsk => tsk.id === t.id);

                          return (
                            <div 
                              key={t.id} 
                              onClick={() => !isCancelled && handleOpenSwapDialog(t.date, isFasting)}
                              className={`bg-white p-3 border rounded-xl flex justify-between items-center shadow-sm cursor-pointer hover:border-slate-300 transition-all ${
                                t.is_compensation ? 'border-indigo-200 bg-indigo-50/15' : 'border-slate-100'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 font-mono">{t.date}</span>
                                  {t.is_compensation && (
                                    <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded font-extrabold uppercase font-mono">
                                      Compensation
                                    </span>
                                  )}
                                  <span className={`text-[8px] font-extrabold font-mono tracking-wider uppercase px-1 py-0.5 rounded ${
                                    isFasting ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                    {isFasting ? 'Veg 🌿' : 'Meat 🍖'}
                                  </span>
                                </div>
                                
                                {isCancelled ? (
                                  <p className="text-[11px] text-rose-500 font-medium mt-1">
                                    Skipped: {exception.reason}
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                    <span className="font-semibold text-slate-700">Meal:</span> 
                                    <span className="text-amber-800 hover:underline">{taskSel ? "Shiro / Doro Option Set" : "Standard Rotating Option"}</span>
                                  </p>
                                )}
                              </div>
                              
                              {!isCancelled && (
                                <span className="text-[10px] text-sky-600 hover:text-sky-700 font-bold flex items-center gap-0.5 bg-sky-50 px-1.5 py-1 rounded">
                                  <ArrowRightLeft className="w-3.5 h-3.5" /> Swap
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: ROTATION */}
            {subTab === 'rotation' && (
              <div className="space-y-4">
                {!userSub ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    Please activate a test subscription to configure rotation.
                  </div>
                ) : (
                  <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-xs space-y-4">
                    <div>
                      <h3 className="font-bold text-slate-900 flex items-center gap-1 text-sm">
                        <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                        Configure Rotation Favorites
                      </h3>
                      <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                        Pick up to 5 preferred meals. The server will cycle through them automatically.
                      </p>
                    </div>

                    {/* Checkbox grid */}
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {browsableMeals.map(m => {
                        const isSelected = selectedMealIdsForRotation.includes(m.id as string);
                        return (
                          <div 
                            key={m.id}
                            onClick={() => handleToggleMealForRotation(m.id as string)}
                            className={`p-2 rounded-lg border text-xs flex justify-between items-center cursor-pointer transition-all ${
                              isSelected ? 'border-[#2481cc] bg-sky-50/20 font-semibold' : 'border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <span className="text-slate-800">{m.name}</span>
                            <Star className={`w-4 h-4 ${isSelected ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={handlePreviewRotation}
                        className="flex-1 py-1.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 transition-all font-display text-xs"
                      >
                        Preview Rotation Flow
                      </button>
                      {rotationPreview.length > 0 && (
                        <button 
                          onClick={handleCommitRotation}
                          className="flex-1 py-1.5 bg-amber-500 text-white font-semibold rounded hover:bg-amber-600 transition-all text-xs"
                        >
                          Confirm & Activate
                        </button>
                      )}
                    </div>

                    {/* Preview Table list */}
                    {rotationPreview.length > 0 && (
                      <div className="border border-slate-100 rounded-lg p-2 bg-slate-50 space-y-1.5 text-[11px]">
                        <p className="font-bold text-slate-500 uppercase tracking-widest font-mono text-[9px]">Grafted Subscription Preview Log</p>
                        {rotationPreview.map((p, idx) => (
                          <div key={idx} className="flex justify-between items-center border-b border-white-50/50 py-1.5 last:border-0 font-mono">
                            <span>{p.date}</span>
                            <span className="font-semibold text-amber-800 truncate max-w-[150px]">{p.meal.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: MENU BROWSER */}
            {subTab === 'menu' && (
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-xs font-display">Active Menu Browser</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Filter based on diet requirements</p>
                  </div>
                  <span className="text-[10px] uppercase font-mono font-bold bg-[#2481cc]/10 text-[#2481cc] px-2 py-0.5 rounded">
                    Active Menu
                  </span>
                </div>

                {/* Filter / Search input field at the top of the Browse tab */}
                <div className="relative bg-white border border-slate-200 rounded-xl shadow-xs px-3 py-1.5 flex items-center gap-1.5 focus-within:border-[#2481cc] focus-within:ring-1 focus-within:ring-[#2481cc]/15 transition-all">
                  <span className="text-slate-400 text-xs shrink-0 select-none">🔍</span>
                  <input
                    id="menu-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search meals or ingredients..."
                    className="w-full bg-transparent border-0 p-0 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 hover:text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  {filteredBrowsableMeals.length === 0 ? (
                    <div className="col-span-2 py-8 text-center text-slate-400 text-xs italic bg-white border border-slate-150 rounded-2xl p-4">
                      No dishes matched your search.
                    </div>
                  ) : (
                    filteredBrowsableMeals.map(m => (
                      <div key={m.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:border-slate-300 transition-all">
                        <div className="h-20 bg-slate-100 overflow-hidden relative">
                          <img 
                            src={m.photo_url} 
                            alt={m.name} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5">
                          <div>
                            <h4 className="font-bold text-[11px] text-slate-800 leading-tight line-clamp-1">{m.name}</h4>
                            <span className={`text-[8px] font-extrabold uppercase font-mono tracking-wider inline-block mt-1 px-1 py-0.5 rounded ${
                              m.type === 'fasting' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {m.type === 'fasting' ? '🌿 Veg' : '🍖 Meat'}
                            </span>
                          </div>
                          
                          {/* Display full ingredients list */}
                          <div className="pt-1.5 border-t border-slate-50 text-[9px] text-slate-505">
                            <p className="font-bold text-slate-400 uppercase tracking-wider text-[7.5px] mb-0.5">Ingredients</p>
                            <p className="line-clamp-2 leading-tight font-sans text-slate-500">
                              {(MEAL_INGREDIENTS[String(m.id)] || []).join(', ')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: ACCOUNT INVOICE & PAYMENTS */}
            {subTab === 'account' && (
              <div className="space-y-4">
                {!userSub ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    Please activate a test subscription to view invoices.
                  </div>
                ) : (
                  <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-xs space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Invoice Payments</h3>
                        <p className="text-[11px] text-slate-400">Secure Telebirr transaction simulation.</p>
                      </div>
                      <Send className="w-5 h-5 text-[#2481cc] shrink-0" />
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Standard Plan Cost:</span>
                        <span className="font-bold text-slate-800">3500 ETB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Account Status:</span>
                        <span className={`font-bold uppercase ${userSub.payment_status === 'paid' ? 'text-emerald-600' : 'text-rose-500 animate-pulse'}`}>
                          {userSub.payment_status}
                        </span>
                      </div>
                    </div>

                    {userSub.payment_status === 'unpaid' ? (
                      <form onSubmit={handleTelebirrSubmit} className="space-y-3 p-3 bg-[#2481cc]/5 border border-[#2481cc]/15 rounded-xl text-xs">
                        <h4 className="font-bold text-slate-800 text-xs">Mock Transfer Portal</h4>
                        
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Transfer Reference Code</label>
                          <input 
                            type="text"
                            value={simPaymentRef}
                            onChange={e => setSimPaymentRef(e.target.value)}
                            placeholder="e.g. TXN93481239"
                            className="w-full bg-white border border-slate-200 rounded p-1 text-xs"
                            required
                          />
                        </div>

                        <button 
                          type="submit"
                          disabled={paymentSubmitting}
                          className="w-full py-1.5 bg-[#2481cc] text-white font-bold rounded"
                        >
                          {paymentSubmitting ? 'Processing...' : 'Upload Mock Telebirr Receipt'}
                        </button>
                      </form>
                    ) : (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs text-center flex items-center justify-center gap-1 font-semibold leading-normal">
                        ✓ All subscriptions paid on this profile! Thank you.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SWAP MEAL SELECTION SHEET BACKDROP */}
      {swappingDate && (
        <div className="absolute inset-0 bg-slate-950/80 rounded-3xl z-40 flex items-end p-4">
          <div className="w-full bg-white rounded-2xl p-4 text-xs space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-[#2481cc]" />
                Swap Meal Selection
              </h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Choose alternative satisfying dietary rules for <strong>{swappingDate}</strong>.</p>
            </div>

            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {swapCandidates.map(c => (
                <div 
                  key={c.id}
                  onClick={() => handleCommitSwap(c.id)}
                  className="p-2.5 bg-slate-50 border border-slate-100 hover:border-[#2481cc] hover:bg-sky-50/10 rounded-xl cursor-pointer text-xs flex justify-between items-center"
                >
                  <span className="font-semibold text-slate-800">{c.name}</span>
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded uppercase font-mono">{c.is_combo ? 'Combo' : 'Plate'}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setSwappingDate(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold font-mono"
            >
              Cancel Swap
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
