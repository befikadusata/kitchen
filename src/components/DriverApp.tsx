import React, { useState } from 'react';
import { 
  Check, X, Phone, MapPin, Navigation, Info, ShieldAlert, CheckCircle2, RefreshCw, XCircle, Sparkles, Route
} from 'lucide-react';
import { DeliveryTask } from '../utils/calendar';

// Simple hash-based coordinate mapper for Addis Ababa
function getCoordinatesForAddress(address: string): { x: number; y: number; lat: number; lng: number } {
  const clean = address.toLowerCase().trim();
  
  if (clean.includes('wollo sefer')) return { x: 1.5, y: -0.8, lat: 9.0012, lng: 38.7681 };
  if (clean.includes('bole')) return { x: 3.2, y: 0.2, lat: 9.0105, lng: 38.7894 };
  if (clean.includes('kazanchis')) return { x: 0.8, y: 1.2, lat: 9.0203, lng: 38.7635 };
  if (clean.includes('mexico')) return { x: -1.8, y: -0.2, lat: 9.0102, lng: 38.7365 };
  if (clean.includes('piassa')) return { x: -0.9, y: 2.2, lat: 9.0354, lng: 38.7521 };
  if (clean.includes('saris')) return { x: -0.7, y: -3.5, lat: 8.9712, lng: 38.7540 };
  if (clean.includes('cmc')) return { x: 5.5, y: 1.5, lat: 9.0224, lng: 38.8251 };
  
  // Deterministic fallback using string hash
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const dx = ((Math.abs(hash) % 80) - 40) / 10;
  const dy = (((Math.abs(hash >> 3)) % 80) - 40) / 10;
  
  const lat = 9.01 + (dy * 0.009);
  const lng = 38.75 + (dx * 0.009);
  
  return { x: dx, y: dy, lat, lng };
}

const KITCHEN_COORDS = { x: 0, y: 0, lat: 9.01, lng: 38.75 };

function calculateDistance(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  const dLat = (p1.lat - p2.lat) * 111;
  const dLng = (p1.lng - p2.lng) * 111 * Math.cos(p1.lat * Math.PI / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function solveTSP(tasks: any[]): { optimizedTasks: any[]; originalDistance: number; optimizedDistance: number } {
  if (tasks.length === 0) return { optimizedTasks: [], originalDistance: 0, optimizedDistance: 0 };
  
  const stops = tasks.map(t => ({
    ...t,
    coords: getCoordinatesForAddress(t.delivery_address || '')
  }));
  
  // 1. Original sequential distance
  let originalDistance = 0;
  let prevPos = KITCHEN_COORDS;
  for (const s of stops) {
    originalDistance += calculateDistance(prevPos, s.coords);
    prevPos = s.coords;
  }
  
  // 2. Greedy Nearest Neighbor TSP
  const optimized: any[] = [];
  const unvisited = [...stops];
  let currentPos = KITCHEN_COORDS;
  
  while (unvisited.length > 0) {
    let closestIndex = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < unvisited.length; i++) {
      const dist = calculateDistance(currentPos, unvisited[i].coords);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }
    
    const nextStop = unvisited.splice(closestIndex, 1)[0];
    optimized.push(nextStop);
    currentPos = nextStop.coords;
  }
  
  // Calc optimized distance
  let optimizedDistance = 0;
  prevPos = KITCHEN_COORDS;
  for (const s of optimized) {
    optimizedDistance += calculateDistance(prevPos, s.coords);
    prevPos = s.coords;
  }
  
  return {
    optimizedTasks: optimized,
    originalDistance,
    optimizedDistance
  };
}

interface DriverAppProps {
  user: any;
  tasks: any[];
  onRefresh: () => void;
}

export default function DriverApp({ user, tasks, onRefresh }: DriverAppProps) {
  const [selectedTaskForFail, setSelectedTaskForFail] = useState<any>(null);
  const [failureReason, setFailureReason] = useState('');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [optimizeRoute, setOptimizeRoute] = useState(false);
  const [hoveredStopId, setHoveredStopId] = useState<string | number | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{lat: number, lng: number} | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'active' | 'error'>('searching');

  // GPS Tracking Effect
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGpsStatus('error');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGpsCoords({ lat: latitude, lng: longitude });
        setGpsStatus('active');
        
        // Sync with backend
        fetch('/api/driver/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude, longitude })
        }).catch(err => console.error('GPS Sync Error:', err));
      },
      (error) => {
        console.error('GPS Error:', error);
        setGpsStatus('error');
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Filter tasks to date
  const todayTasks = tasks.filter(t => t.date === targetDate);

  // Pre-calculate TSP optimized results
  const { optimizedTasks, originalDistance, optimizedDistance } = solveTSP(todayTasks);
  const finalTasksToDisplay = optimizeRoute ? optimizedTasks : todayTasks;
  const fuelSavingsMetric = Math.max(0, originalDistance - optimizedDistance);
  const timeSavingsMins = Math.round(fuelSavingsMetric * 3); // 3 mins per km estimate

  // Mark task delivered
  const handleMarkDelivered = async (taskId: string | number) => {
    try {
      const response = await fetch(`/api/delivery-tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered' })
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Mark task failed
  const handleMarkFailedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForFail || !failureReason) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/delivery-tasks/${selectedTaskForFail.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'failed',
          failure_reason: failureReason
        })
      });
      if (response.ok) {
        setFailureReason('');
        setSelectedTaskForFail(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const pending = todayTasks.filter(t => t.status === 'pending');
  const completed = todayTasks.filter(t => t.status === 'delivered');
  const failed = todayTasks.filter(t => t.status === 'failed');

  // Math calculations for drawing custom dynamic SVG map of routes
  let minX = -1;
  let maxX = 1;
  let minY = -1;
  let maxY = 1;

  const pointsForScale = [KITCHEN_COORDS, ...todayTasks.map(t => getCoordinatesForAddress(t.delivery_address || ''))];
  pointsForScale.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const spanX = Math.max(0.2, maxX - minX);
  const spanY = Math.max(0.2, maxY - minY);

  const getSvgX = (x: number) => 30 + ((x - minX) / spanX) * (320 - 60);
  const getSvgY = (y: number) => 115 - ((y - minY) / spanY) * (115 - 25); // Inverted Y coordinates for SVG


  return (
    <div className="w-full max-w-sm mx-auto bg-slate-900 text-white min-h-[600px] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-700 flex flex-col font-sans" id="driver-app">
      {/* Phone status bar */}
      <div className="bg-slate-950 px-5 pt-3 pb-1 flex justify-between items-center text-[10px] font-mono select-none text-slate-400">
        <div>OzDrive v1.2</div>
        <div className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${
            gpsStatus === 'active' ? 'bg-emerald-500 animate-pulse' : 
            gpsStatus === 'searching' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
          }`}></span>
          <span>{gpsStatus === 'active' ? 'ONLINE GPS' : gpsStatus === 'searching' ? 'SEARCHING GPS' : 'GPS ERROR'}</span>
        </div>
      </div>

      {/* Driver app header */}
      <div className="bg-slate-900 border-b border-slate-800 p-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[9px] font-semibold text-amber-400 tracking-wider font-mono block uppercase">Active Dispatcher</span>
            <h2 className="text-sm font-bold font-display tracking-tight mt-0.5">{user?.name || 'Lead Driver'}</h2>
          </div>
          <button 
            onClick={onRefresh}
            className="p-1.5 hover:bg-slate-800 rounded-lg border border-slate-800"
            title="Refresh Manifest"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Date Selector */}
        <div className="mt-3 flex items-center justify-between gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400">Target Manifest:</span>
          <input 
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            className="bg-transparent border-0 py-0 text-amber-400 font-mono font-bold focus:ring-0 text-right cursor-pointer"
          />
        </div>

        {/* Summary mini pill */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
          <div className="bg-slate-950/50 p-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 uppercase block">Pending</span>
            <span className="text-xs font-bold text-amber-400">{pending.length}</span>
          </div>
          <div className="bg-slate-950/50 p-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 uppercase block">Done</span>
            <span className="text-xs font-bold text-emerald-400">{completed.length}</span>
          </div>
          <div className="bg-slate-950/50 p-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 uppercase block">Failed</span>
            <span className="text-xs font-bold text-rose-400">{failed.length}</span>
          </div>
        </div>

        {/* 🧠 Route Optimizer Dashboard Control Panel */}
        {todayTasks.length > 0 && (
          <div className="mt-3.5 bg-slate-950/65 border border-slate-800 rounded-2xl p-3 space-y-2.5">
            <div className="flex justify-between items-center bg-slate-900/40 p-1 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 pl-2">Routing Engine</span>
              <button
                type="button"
                onClick={() => setOptimizeRoute(!optimizeRoute)}
                className={`py-1 px-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 transition-all ${
                  optimizeRoute 
                    ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-400/25' 
                    : 'bg-slate-800 text-slate-400 hover:text-slate-300'
                }`}
              >
                <Sparkles className="w-3 h-3 animate-pulse" />
                {optimizeRoute ? 'Optimized Tour ON' : 'Optimize Route'}
              </button>
            </div>

            {/* Metrics Section */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800/60 font-mono">
                <span className="text-slate-500 uppercase block text-[8px]">Est. Distance</span>
                {optimizeRoute ? (
                  <span className="font-bold flex items-center gap-1 text-amber-400">
                    <span className="line-through text-slate-600">{originalDistance.toFixed(1)} km</span>
                    <span>➔ {optimizedDistance.toFixed(1)} km</span>
                  </span>
                ) : (
                  <span className="font-bold text-slate-300">{originalDistance.toFixed(1)} km (Standard)</span>
                )}
              </div>
              <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800/60 font-mono">
                <span className="text-slate-500 uppercase block text-[8px]">Optimizer Output</span>
                {optimizeRoute ? (
                  <span className="font-bold text-emerald-400 uppercase tracking-tight text-[9px]">
                    🔥 Save {fuelSavingsMetric.toFixed(1)} km (~{timeSavingsMins} min)
                  </span>
                ) : (
                  <span className="text-slate-500 uppercase tracking-tight text-[9px] block italic leading-tight">
                    Engage optimizer to save fuel & time
                  </span>
                )}
              </div>
            </div>

            {/* SVG Interactive Visual Route Map */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden relative p-1">
              <div className="absolute top-1 left-2 text-[8px] font-mono text-slate-500 uppercase tracking-wide z-10 flex items-center gap-1">
                <Route className="w-2.5 h-2.5 text-amber-400" />
                Live Addis Tour Preview
              </div>
              
              <svg 
                className="w-full h-28 bg-[#0b0f19] rounded-lg relative overflow-hidden" 
                viewBox="0 0 320 120"
              >
                {/* Visual grid overlay for premium vibe */}
                <defs>
                  <pattern id="grid" width="10" width-units="userSpaceOnUse" height="10" height-units="userSpaceOnUse" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255, 255, 255, 0.015)" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Draw Route Paths */}
                {(() => {
                  const pathPoints = [KITCHEN_COORDS, ...finalTasksToDisplay.map(t => getCoordinatesForAddress(t.delivery_address || ''))];
                  let dStr = "";
                  pathPoints.forEach((p, idx) => {
                    const sx = getSvgX(p.x);
                    const sy = getSvgY(p.y);
                    if (idx === 0) dStr += `M ${sx} ${sy}`;
                    else dStr += ` L ${sx} ${sy}`;
                  });

                  return (
                    <>
                      {/* Background route glow path */}
                      <path 
                        d={dStr} 
                        fill="none" 
                        stroke={optimizeRoute ? "rgba(251, 191, 36, 0.15)" : "rgba(148, 163, 184, 0.08)"}
                        strokeWidth="4" 
                        className="transition-all duration-300"
                      />
                      {/* Active path */}
                      <path 
                        d={dStr} 
                        fill="none" 
                        stroke={optimizeRoute ? "#fbbf24" : "#64748b"}
                        strokeWidth="1.5"
                        strokeDasharray={optimizeRoute ? "none" : "3,3"}
                        className="transition-all duration-300"
                      />
                    </>
                  );
                })()}

                {/* Draw Central Kitchen (Oz Pickup Center) */}
                <circle 
                  cx={getSvgX(0)} 
                  cy={getSvgY(0)} 
                  r="7" 
                  className="fill-amber-500 stroke-slate-950 stroke-2 cursor-pointer hover:scale-125 transition-all"
                  title="Oz Central Kitchen"
                />
                <circle 
                  cx={getSvgX(0)} 
                  cy={getSvgY(0)} 
                  r="12" 
                  className="fill-none stroke-amber-500/30 stroke-1 animate-ping pointer-events-none"
                />
                <text 
                  x={getSvgX(0)} 
                  y={getSvgY(0) + 3} 
                  className="font-mono text-[7px] font-extrabold text-slate-950 text-center select-none cursor-pointer" 
                  textAnchor="middle"
                >
                  🏫
                </text>

                {/* Draw Stops */}
                {finalTasksToDisplay.map((t, idx) => {
                  const coords = getCoordinatesForAddress(t.delivery_address || '');
                  const sx = getSvgX(coords.x);
                  const sy = getSvgY(coords.y);
                  const isHovered = hoveredStopId === t.id;
                  const isPending = t.status === 'pending';
                  const isCompleted = t.status === 'delivered';
                  const isFailed = t.status === 'failed';

                  let colorClass = "fill-amber-400 stroke-slate-950";
                  if (isCompleted) colorClass = "fill-emerald-500 stroke-slate-950";
                  if (isFailed) colorClass = "fill-rose-500 stroke-slate-950";

                  return (
                    <g 
                      key={t.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredStopId(t.id)}
                      onMouseLeave={() => setHoveredStopId(null)}
                    >
                      {/* Pulsing ring if selected or hovered */}
                      {isHovered && (
                        <circle 
                          cx={sx} 
                          cy={sy} 
                          r="11" 
                          className="fill-none stroke-amber-400/40 stroke-2 animate-pulse"
                        />
                      )}
                      
                      <circle 
                        cx={sx} 
                        cy={sy} 
                        r={isHovered ? "7" : "6"} 
                        className={`${colorClass} stroke-2 transition-all duration-200`}
                      />

                      <text 
                        x={sx} 
                        y={sy + 2.5} 
                        className="font-mono text-[7.5px] font-extrabold fill-slate-950 text-center pointer-events-none select-none" 
                        textAnchor="middle"
                      >
                        {idx + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Interactive Tooltip showing hovered stop details */}
              <div className="bg-slate-950 px-2 py-1 flex items-center justify-between text-[8px] font-mono text-slate-400 border-t border-slate-800">
                <span>Active Map Node:</span>
                {hoveredStopId ? (
                  (() => {
                    const hTask = todayTasks.find(t => t.id === hoveredStopId);
                    const hIdx = finalTasksToDisplay.findIndex(t => t.id === hoveredStopId) + 1;
                    return hTask ? (
                      <span className="text-amber-400 font-bold max-w-[200px] truncate">
                        Stop #{hIdx}: {hTask.customer_name} ({hTask.delivery_address?.split(',')[0]})
                      </span>
                    ) : (
                      <span>-</span>
                    );
                  })()
                ) : (
                  <span className="italic text-slate-500">Hover over any map node or card below</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manifest Tasks List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
        {finalTasksToDisplay.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs italic">
            No dropoff routes declared for manifest date: {targetDate}.
          </div>
        ) : (
          finalTasksToDisplay.map((task: any, index: number) => {
            const isPending = task.status === 'pending';
            const isCompleted = task.status === 'delivered';
            const isFailed = task.status === 'failed';
            const isHovered = hoveredStopId === task.id;

            return (
              <div 
                key={task.id} 
                className={`bg-slate-900 border rounded-2xl p-3.5 space-y-2.5 transition-all text-xs ${
                  isCompleted ? 'border-emerald-500/20 bg-emerald-950/5' :
                  isFailed ? 'border-rose-500/20 bg-rose-950/5' :
                  task.is_compensation ? 'border-indigo-500/30 bg-indigo-950/10' :
                  'border-slate-800 hover:border-slate-700'
                } ${isHovered ? 'ring-2 ring-amber-400/30 border-amber-400/45 scale-[1.01] bg-slate-800/20 shadow-lg shadow-amber-950/20' : ''}`}
                onMouseEnter={() => setHoveredStopId(task.id)}
                onMouseLeave={() => setHoveredStopId(null)}
              >
                {/* Header Row */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="bg-amber-400 text-slate-950 text-[9px] font-extrabold uppercase font-mono px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                        📍 Stop #{index + 1}
                      </span>
                      {task.is_compensation && (
                        <span className="text-[8px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono px-1 py-0.5 rounded uppercase font-semibold">
                          Comp Day
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-200 text-sm tracking-tight">{task.customer_name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 font-mono text-[9px] uppercase tracking-wider">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                        task.meal_type === 'fasting' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {task.meal_type === 'fasting' ? '🌿 fasting' : '🍖 non-fasting'}
                      </span>
                      <span className="bg-slate-800 border border-slate-700 px-1.5 rounded text-slate-300">
                        {task.combo_preference}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status label */}
                  <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                    isCompleted ? 'bg-emerald-500/10 text-emerald-400' :
                    isFailed ? 'bg-rose-500/10 text-rose-400' :
                    'bg-amber-500/10 text-amber-400'
                  }`}>
                    {task.status}
                  </span>
                </div>

                {/* Addresses */}
                <div className="space-y-1.5 text-slate-300 relative border-l border-slate-800 pl-3 ml-1.5">
                  <div className="relative">
                    <span className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-slate-700 border-2 border-slate-900"></span>
                    <p className="text-[10px] text-slate-500 font-mono uppercase font-semibold">Pickup Central</p>
                    <p className="text-slate-400">{task.pickup_address}</p>
                  </div>
                  <div className="relative pt-1">
                    <span className="absolute -left-5 top-2.5 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-slate-900"></span>
                    <p className="text-[10px] text-slate-500 font-mono uppercase font-semibold">Delivery Workplace</p>
                    <p className="text-slate-100 font-medium">{task.delivery_address}</p>
                  </div>
                </div>

                {/* Specific meal box */}
                <div className="bg-slate-950/45 p-2 rounded-xl flex items-center justify-between text-[11px] border border-slate-800">
                  <span className="text-slate-400 font-medium">Assigned: <span className="text-slate-200">{task.meal_name}</span></span>
                </div>

                {/* Failed Reason if any */}
                {isFailed && task.failure_reason && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl flex items-start gap-1.5 text-rose-400 text-[11px]">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Failure logged:</span> {task.failure_reason}
                    </div>
                  </div>
                )}

                {/* Actions Row */}
                {isPending ? (
                  <div className="pt-1.5 flex items-center gap-2">
                    <a 
                      href={`tel:${task.customer_phone}`}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-center flex items-center justify-center gap-1 border border-slate-700 flex-1 active:scale-95 transition-all"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Call Client
                    </a>
                    <button 
                      onClick={() => setSelectedTaskForFail(task)}
                      className="p-2 bg-rose-600/15 hover:bg-rose-600 border border-rose-500/30 hover:border-transparent text-rose-400 hover:text-white rounded-xl active:scale-95 transition-all text-center"
                      title="Mark Failed"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleMarkDelivered(task.id)}
                      className="p-2 bg-emerald-600 text-white rounded-xl active:scale-95 transition-all text-center flex items-center justify-center gap-1 max-w-[40px] flex-1 hover:bg-emerald-500"
                      title="Confirm Delivered"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 font-semibold font-mono flex items-center gap-1 bg-slate-950/20 p-1.5 rounded-lg justify-center">
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Dispatch completed successfully
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-500" /> Delivery failed
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Failure Reason Drawer Backdrop */}
      {selectedTaskForFail && (
        <div className="absolute inset-0 bg-slate-950/80 rounded-3xl z-40 flex items-end p-4 transition-opacity">
          <form 
            onSubmit={handleMarkFailedSubmit}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-4 animate-slide-up"
          >
            <div>
              <h3 className="font-bold text-sm text-slate-100">Specify Dispatch Failure</h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Please document the issue for customer notification.</p>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold">Driver Failure Log Comment</label>
              <textarea 
                value={failureReason}
                onChange={e => setFailureReason(e.target.value)}
                placeholder="e.g. Offices locked, client did not pick up phone after 3 tries"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-rose-500 text-slate-100 text-xs placeholder:text-slate-600"
                rows={3}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => {
                  setSelectedTaskForFail(null);
                  setFailureReason('');
                }}
                className="w-1/3 py-2 border border-slate-800 bg-transparent hover:bg-slate-800 text-slate-400 rounded-xl font-medium transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={submitting}
                className="w-2/3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {submitting ? 'Logging...' : 'Report Failure'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
