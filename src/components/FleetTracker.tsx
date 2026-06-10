import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, User, Clock, RefreshCw } from 'lucide-react';

export default function FleetTracker() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/driver/locations');
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    const timer = setInterval(fetchLocations, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Real-Time Fleet Dispatch</h2>
          <p className="text-xs text-slate-500">Live GPS tracking of active delivery drivers across Addis Ababa.</p>
        </div>
        <button 
          onClick={fetchLocations}
          className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-all"
        >
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-100 rounded-2xl border border-slate-200 h-[400px] relative overflow-hidden flex items-center justify-center text-slate-400 font-mono text-xs">
          {/* Mock Map Visual */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]"></div>
          </div>
          
          <div className="relative z-10 text-center space-y-2">
            <Navigation className="w-8 h-8 mx-auto mb-2 animate-pulse text-amber-500" />
            <p>ADDIS ABABA LIVE DISPATCH GRID</p>
            <p className="text-[10px] text-slate-500">Coordinate System: 9.01, 38.75</p>
          </div>

          {/* Render Driver Pins */}
          {locations.map(loc => (
            <div 
              key={loc.driver_id}
              className="absolute transition-all duration-1000 ease-in-out"
              style={{
                left: `${50 + (loc.longitude - 38.75) * 500}%`,
                top: `${50 - (loc.latitude - 9.01) * 500}%`
              }}
            >
              <div className="relative group">
                <MapPin className="w-6 h-6 text-amber-600 fill-amber-200" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-xl">
                  {loc.driver_name}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Active Units</h3>
          {locations.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 italic">
              No active drivers online.
            </div>
          ) : (
            <div className="space-y-2">
              {locations.map(loc => (
                <div key={loc.driver_id} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-800">{loc.driver_name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Lat: {loc.latitude.toFixed(4)}, Lng: {loc.longitude.toFixed(4)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
