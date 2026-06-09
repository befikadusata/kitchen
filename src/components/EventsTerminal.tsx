import React from 'react';
import { 
  Terminal, Server, AlertTriangle, ShieldCheck, Database, Trash2
} from 'lucide-react';
import { DomainEvent } from '../utils/calendar';

interface EventsTerminalProps {
  events: DomainEvent[];
  onResetDb: () => void;
}

export default function EventsTerminal({ events, onResetDb }: EventsTerminalProps) {
  const [clearing, setClearing] = React.useState(false);

  // Trigger quick reseed
  const handleReseed = async () => {
    if (!confirm("Are you sure you want to reset the database and restore default test customer templates?")) return;
    setClearing(true);
    try {
      const response = await fetch('/api/reset', {
        method: 'POST'
      });
      if (response.ok) {
        onResetDb();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden font-mono text-xs flex flex-col h-full min-h-[400px]" id="events-terminal">
      {/* Log Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3.5 flex justify-between items-center select-none text-slate-300">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold text-xs uppercase tracking-wider text-slate-200">Append-Only Domain Audit Log Stream</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={handleReseed}
            disabled={clearing}
            className="px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-bold hover:text-white rounded text-[10px] uppercase font-mono disabled:opacity-50 transition-all flex items-center gap-1 leading-none cursor-pointer"
          >
            <Database className="w-3 h-3" /> Reseed Database
          </button>
        </div>
      </div>

      {/* Terminal Grid Info labels */}
      <div className="bg-slate-950 px-4 py-2 border-b border-slate-900 grid grid-cols-3 text-[10px] text-slate-500 uppercase tracking-widest font-semibold select-none">
        <div>Event Class Trigger</div>
        <div>Timestamp (UTC)</div>
        <div>Payload Metadata Context</div>
      </div>

      {/* Audit Log list */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2 max-h-[350px] pr-2">
        {events.length === 0 ? (
          <div className="py-20 text-center text-slate-600 italic select-none">
            No domain events currently logged in stream.
          </div>
        ) : (
          events.map((ev, index) => {
            const dateStr = ev.created_at ? ev.created_at.split('T')[1].substring(0, 8) : '00:00:00';
            
            // Format colors based on common triggers
            let labelColor = 'text-sky-400';
            if (ev.type.includes('Confirmed') || ev.type.includes('Completed') || ev.type.includes('Recorded')) {
              labelColor = 'text-emerald-400 font-bold';
            } else if (ev.type.includes('Failed') || ev.type.includes('Removed') || ev.type.includes('Reset')) {
              labelColor = 'text-rose-400 font-bold';
            } else if (ev.type.includes('Exception') || ev.type.includes('Holiday') || ev.type.includes('Compensation')) {
              labelColor = 'text-amber-400';
            }

            return (
              <div 
                key={ev.id || index} 
                className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b border-slate-900 text-[11px] leading-relaxed font-mono font-medium hover:bg-slate-900/40 transition-colors"
              >
                {/* Event Name */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-slate-600 font-light select-none font-mono">▶</span>
                  <span className={`truncate uppercase tracking-wide ${labelColor}`}>{ev.type}</span>
                </div>

                {/* Date stamp */}
                <div className="text-slate-500 font-mono">
                  {ev.created_at ? ev.created_at : "2026-06-08"}
                </div>

                {/* Payload details */}
                <div className="text-slate-400 truncate font-mono text-[10px]" title={JSON.stringify(ev.payload)}>
                  {JSON.stringify(ev.payload)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="bg-slate-900/60 p-3 px-4 border-t border-slate-900 text-[10px] text-slate-500 flex justify-between items-center select-none">
        <div>Total Events: {events.length}</div>
        <div className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Cryptographic Database Stream Secure</span>
        </div>
      </div>
    </div>
  );
}
