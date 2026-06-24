import { motion } from "motion/react";
import { Battery, Zap, AlertTriangle, ShieldCheck } from "lucide-react";
import { TimeDebtState } from "../types";

interface TimeDebtMeterProps {
  state: TimeDebtState;
  completedCount: number;
  totalCount: number;
  notificationLogs?: {
    id: string;
    taskId: string;
    taskTitle: string;
    time: string;
    status: 'sent' | 'failed' | 'simulated';
    details?: string;
  }[];
  isGCalConnected?: boolean;
}

export default function TimeDebtMeter({ state, completedCount, totalCount, notificationLogs, isGCalConnected }: TimeDebtMeterProps) {
  const getSeverityStyle = () => {
    switch (state.rating) {
      case 'immaculate':
        return {
          textColor: 'text-limeaccent font-black tracking-tighter uppercase font-display',
          borderColor: 'border-limeaccent/30',
          bgColor: 'bg-zinc-950',
          accentColor: '#C5FF41',
          glowColor: 'shadow-[0_0_25px_rgba(197,255,65,0.15)]',
          label: 'IMMACULATE ALIGNMENT'
        };
      case 'negligible':
        return {
          textColor: 'text-limeaccent/80 font-black tracking-tighter uppercase font-display',
          borderColor: 'border-zinc-800',
          bgColor: 'bg-zinc-950',
          accentColor: '#b2eb2d',
          glowColor: 'shadow-[0_0_15px_rgba(197,255,65,0.08)]',
          label: 'SLIGHT SLIPPAGE'
        };
      case 'concerning':
        return {
          textColor: 'text-orange-400 font-black tracking-tighter uppercase font-display',
          borderColor: 'border-orange-500/20',
          bgColor: 'bg-zinc-950',
          accentColor: '#f97316',
          glowColor: 'shadow-[0_0_20px_rgba(249,115,22,0.15)]',
          label: 'SEVERE OVERDUE DEBT'
        };
      case 'catastrophic':
        return {
          textColor: 'text-red-500 font-black tracking-tighter uppercase font-display animate-pulse',
          borderColor: 'border-red-500/30',
          bgColor: 'bg-zinc-950',
          accentColor: '#ef4444',
          glowColor: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]',
          label: 'CRITICAL CHRONOS FAULT'
        };
    }
  };

  const style = getSeverityStyle();
  // Map debt hours to a visual charge level (0h = 100%, 12h+ = 15%)
  const maxVisualDebt = 12;
  const percentage = Math.max(10, Math.min(100, Math.round(((maxVisualDebt - state.currentDebtHours) / maxVisualDebt) * 100)));

  return (
    <div id="time-debt-meter-card" className={`p-6 rounded-xl border ${style.borderColor} ${style.bgColor} bg-zinc-950/75 backdrop-blur-md relative transition-all duration-500 ${style.glowColor} overflow-hidden`}>
      {/* Decorative subtle background icon */}
      <div className="absolute right-2 -bottom-2 opacity-5 text-gold-500 border-none select-none pointer-events-none">
        <Battery size={140} className="stroke-1" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        {/* Visual Battery Graphic */}
        <div className="flex items-center gap-8">
          <div className="relative w-16 h-28 bg-zinc-900 border-2 border-zinc-700 rounded-lg p-1 flex flex-col justify-end overflow-hidden shadow-inner shrink-0">
            {/* Battery Terminal Tip */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[4px] w-5 h-1 bg-zinc-700 rounded-t-sm" />
            
            {/* Dynamic Liquid Level */}
            <motion.div
              initial={{ height: "0%" }}
              animate={{ height: `${percentage}%` }}
              transition={{ type: "spring", stiffness: 40, damping: 10 }}
              className="w-full rounded-md relative overflow-hidden"
              style={{ backgroundColor: style.accentColor }}
            >
              {/* Shiny Liquid Top layer */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/30 animate-pulse" />
              
              {/* Wave flow animations */}
              <motion.div 
                animate={{ y: [-2, 2, -2] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute inset-x-0 top-0 h-1 bg-black/10"
              />
            </motion.div>

            {/* Battery Core Percentage Indicator */}
            <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              {percentage}%
            </div>
          </div>

          <div className="pl-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-zinc-400 tracking-wider">CHRONOS ENERGY CODES</span>
              {state.rating === 'immaculate' ? (
                <ShieldCheck size={14} className="text-limeaccent" />
              ) : (
                <AlertTriangle size={14} className={style.textColor} />
              )}
            </div>
            <h3 className={`font-serif text-2xl font-bold tracking-wide ${style.textColor}`}>
              {style.label}
            </h3>
            <p className="text-zinc-300 font-mono text-sm mt-1">
              Time Debt: <span className="font-bold text-white text-lg">{state.currentDebtHours.toFixed(1)} hrs</span> behind
            </p>
          </div>
        </div>

        {/* Informational warning message / Real-time Alert Stream */}
        <div className="flex-1 md:max-w-md bg-black/40 border border-zinc-900 p-4 rounded-lg font-mono text-xs leading-relaxed text-zinc-400">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2">
            <span className="text-[10px] font-bold text-zinc-450 tracking-wider">GCAL TIME-WINDOW ALERTS</span>
            {isGCalConnected ? (
              <span className="text-[9px] text-limeaccent font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-limeaccent animate-ping" />
                <span>LIVE SCANNING</span>
              </span>
            ) : (
              <span className="text-[9px] text-zinc-500">LOCAL ALERTS</span>
            )}
          </div>

          <div className="space-y-1.5 mb-3.5 max-h-[85px] overflow-y-auto pr-0.5" id="energy-alerts-list">
            {!notificationLogs || notificationLogs.length === 0 ? (
              <div className="text-zinc-550 py-1 font-mono text-[10px]">
                No task 2/3 limits crossed yet. System operating within scheduled bounds.
              </div>
            ) : (
              notificationLogs.slice(0, 2).map(log => (
                <div key={log.id} className="flex flex-col gap-0.5 text-[10px] border-b border-zinc-900/30 pb-1 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-zinc-200 truncate font-sans">{log.taskTitle}</span>
                    <span className="text-[9px] text-zinc-500 shrink-0">{log.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-zinc-450">
                    <span className={`w-1 h-1 rounded-full shrink-0 ${log.status === 'sent' ? 'bg-limeaccent' : 'bg-amber-400'}`} />
                    <span className="truncate flex-1 text-zinc-450">{log.details || 'Time-limit alert pushed.'}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {state.warningMessage && (
            <div className="mb-2 text-[11px] text-zinc-350 border-t border-zinc-900/60 pt-2 leading-relaxed">
              {state.warningMessage}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-zinc-900/80 pt-2 mt-2">
            <span>Scythe Calibration:</span>
            <span className="text-white bg-zinc-850 px-2 py-0.5 rounded text-[10px]">
              {completedCount} of {totalCount} Task Nodes Bound
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
