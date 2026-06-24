import { useState } from "react";
import { Hammer, History, PenTool, Check, Trash2, HeartCrack, ListFilter, RotateCcw } from "lucide-react";
import { Task, Autopsy } from "../types";

interface InsightsPanelProps {
  tasks: Task[];
  autopsies: Autopsy[];
  onPerformAutopsy: (taskId: string, explanation: string) => Promise<{ analysis: string, commitment: string }>;
  onClearHistory?: () => void;
}

export default function InsightsPanel({ tasks, autopsies, onPerformAutopsy, onClearHistory }: InsightsPanelProps) {
  const [selectedTaskToAutopsy, setSelectedTaskToAutopsy] = useState<string>("");
  const [userReason, setUserReason] = useState<string>("");
  const [isAutopsying, setIsAutopsying] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<{ analysis: string; commitment: string } | null>(null);
  const [isSigned, setIsSigned] = useState<boolean>(false);

  // Filter tasks that are missed (expired deadlines and incomplete) and don't have an autopsy yet
  const tasksAwaitingAutopsy = tasks.filter(
    t => (t.status === "missed" || (new Date(t.deadline) < new Date() && t.status !== "completed")) &&
    !autopsies.some(a => a.taskTitle === t.title)
  );

  const triggerAutopsy = async () => {
    if (!selectedTaskToAutopsy || !userReason) return;
    setIsAutopsying(true);
    setCurrentResult(null);
    setIsSigned(false);

    try {
      const selectedTask = tasks.find(t => t.id === selectedTaskToAutopsy);
      if (!selectedTask) return;
      
      const result = await onPerformAutopsy(selectedTask.id, userReason);
      setCurrentResult({
        analysis: result.analysis,
        commitment: result.commitment
      });
    } catch (err) {
      console.error("Autopsy performance failed:", err);
    } finally {
      setIsAutopsying(false);
    }
  };

  const handleSignContract = () => {
    setIsSigned(true);
    // clear input fields
    setUserReason("");
    setSelectedTaskToAutopsy("");
  };

  // Real procrastination heatmap, built from each task's actual openLog
  // timestamps (logged once per day per untouched task — see App.tsx). No
  // synthetic/mock numbers are used here.
  const hoursGroup = ["Morning (08-12)", "Afternoon (12-16)", "Evening (16-20)", "Night (20-00)"];
  const daysGroup = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getHourBucket = (hour: number) => {
    if (hour >= 8 && hour < 12) return 0;
    if (hour >= 12 && hour < 16) return 1;
    if (hour >= 16 && hour < 20) return 2;
    return 3; // 20:00 - 08:00 (Night)
  };

  // JS getDay(): 0=Sun..6=Sat -> map to Mon-first index used by daysGroup
  const getDayBucket = (jsDay: number) => (jsDay === 0 ? 6 : jsDay - 1);

  const heatmapData: number[][] = daysGroup.map(() => [0, 0, 0, 0]);
  let totalLoggedEvents = 0;

  tasks.forEach(task => {
    (task.openLog || []).forEach(ts => {
      const date = new Date(ts);
      if (isNaN(date.getTime())) return;
      heatmapData[getDayBucket(date.getDay())][getHourBucket(date.getHours())] += 1;
      totalLoggedEvents += 1;
    });
  });

  const getColorIntensity = (val: number) => {
    if (val === 0) return "bg-zinc-950 border-zinc-900 text-zinc-800";
    if (val <= 2) return "bg-limeaccent/10 border-limeaccent/20 text-limeaccent/70";
    if (val <= 5) return "bg-limeaccent/30 border-limeaccent/40 text-limeaccent";
    return "bg-limeaccent border-limeaccent-dark text-black font-black animate-pulse shadow-[0_0_12px_rgba(197,255,65,0.3)]";
  };

  return (
    <div id="insights-panel-canvas" className="space-y-8 animate-fade-in">
      
      {/* 2 Grid top components */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Procrastination Map */}
        <div className="lg:col-span-7 bg-zinc-950 p-6 rounded-xl border border-zinc-900">
          <div className="flex items-center gap-2 mb-4 border-b border-zinc-900 pb-3">
            <span className="w-1.5 h-3 bg-limeaccent rounded-sm" />
            <h3 className="font-display text-lg font-black tracking-tight uppercase text-white">
              Procrastination DNA Heatmap
            </h3>
            <span className="ml-auto font-mono text-[9px] text-zinc-500">REPEAT-OPEN PATTERNS</span>
          </div>
          
          <p className="text-xs font-mono text-zinc-400 mb-4 leading-relaxed">
            Each cell is real: once a day, any pending task you haven't touched in over an hour logs a genuine "opened but not started" timestamp. Peak intensity represents real recurring procrastination windows.
          </p>

          {totalLoggedEvents === 0 && (
            <div className="mb-4 p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-500">
              No procrastination data logged yet. Create a task and let an hour pass without touching it — this map fills in with real activity, not mock numbers.
            </div>
          )}

          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              {/* Heatmap header cells */}
              <div className="grid grid-cols-5 gap-2 mb-2">
                <div className="col-span-1" />
                {hoursGroup.map((hr, idx) => (
                  <div key={idx} className="font-mono text-[9px] text-zinc-500 uppercase text-center font-bold">
                    {hr.split(" ")[0]}
                  </div>
                ))}
              </div>

              {/* Heatmap Matrix rows */}
              {daysGroup.map((day, dIdx) => (
                <div key={dIdx} className="grid grid-cols-5 gap-2 items-center mb-1.5">
                  <div className="font-mono text-[10px] text-zinc-400 font-bold col-span-1 uppercase">
                    {day}
                  </div>
                  {heatmapData[dIdx].map((val, hIdx) => (
                    <div
                      key={hIdx}
                      className={`h-10 rounded border flex items-center justify-center font-mono text-xs transition-all ${getColorIntensity(val)}`}
                      title={`${day} -- ${hoursGroup[hIdx]}: ${val} procrastination delays detected`}
                    >
                      {val > 0 && val}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 font-mono text-[9px] text-zinc-500 mt-4 justify-end border-t border-zinc-900 pt-3">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-zinc-950 border border-zinc-900 rounded" />
              <span>Zero Friction</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-limeaccent/10 border border-limeaccent/20 rounded" />
              <span>Mild Delay (1-2)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-limeaccent/30 border border-limeaccent/40 rounded" />
              <span>Heavy Hesitation (3-5)</span>
            </div>
            <div className="flex items-center gap-1 text-limeaccent font-bold">
              <span className="w-2.5 h-2.5 bg-limeaccent border border-limeaccent-dark rounded animate-pulse" />
              <span>CRITICAL FAILURE DANGER (6+)</span>
            </div>
          </div>
        </div>

        {/* Deadline Autopsy Intake */}
        <div className="lg:col-span-5 bg-zinc-950 p-6 rounded-xl border border-zinc-900">
          <div className="flex items-center gap-2 mb-4 border-b border-zinc-900 pb-3">
            <span className="w-1.5 h-3 bg-red-500 rounded-sm animate-pulse" />
            <h3 className="font-display text-lg font-black tracking-tight uppercase text-white flex items-center gap-2">
              Deadline Autopsies Awaiting
            </h3>
          </div>

          {tasksAwaitingAutopsy.length === 0 ? (
            <div className="py-12 text-center">
              <Check className="text-limeaccent/40 mx-auto mb-2" size={24} />
              <h4 className="font-display text-sm font-black tracking-tight uppercase text-zinc-300">Clean Ledger of Time</h4>
              <p className="text-[11px] font-mono text-zinc-500 mt-1">
                You have no outstanding un-diagnosed missed tasks. Your mortality is aligned.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs font-mono text-zinc-400 leading-relaxed font-semibold">
                Choose a task that survived your deadline. Present your case to the Autopsy Agent to reconstruct why it decayed and generate a protective Commitment Contract.
              </p>

              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[9px] text-zinc-500 font-bold uppercase">SELECT DECAYED TASK NODE</label>
                  <select
                    value={selectedTaskToAutopsy}
                    onChange={(e) => {
                      setSelectedTaskToAutopsy(e.target.value);
                      setCurrentResult(null);
                    }}
                    className="bg-black border border-zinc-850 hover:border-zinc-700 p-2.5 rounded-lg text-xs font-mono text-zinc-200 outline-none cursor-pointer w-full"
                  >
                    <option value="">-- Choose Task --</option>
                    {tasksAwaitingAutopsy.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title} (Missed: {new Date(t.deadline).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[9px] text-zinc-500 font-bold uppercase">WHY EXPLICITLY DID IT FAIL?</label>
                  <textarea
                    rows={2.5}
                    placeholder="Provide your excuses (e.g. 'I didn't open it because I got stuck on Sarah's metrics' or 'I put it off because I feared it wouldn't look perfect')"
                    value={userReason}
                    onChange={(e) => setUserReason(e.target.value)}
                    className="bg-black border border-zinc-850 hover:border-zinc-700 p-2.5 rounded-lg text-xs font-mono text-zinc-200 outline-none w-full resize-none"
                  />
                </div>

                <button
                  onClick={triggerAutopsy}
                  disabled={isAutopsying || !selectedTaskToAutopsy || !userReason}
                  className="w-full flex items-center justify-center gap-1.5 bg-red-950/20 hover:bg-red-900/40 hover:border-red-500/40 border border-red-950 text-red-400 font-display font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isAutopsying ? (
                    <>
                      <Hammer className="animate-spin text-red-400" size={14} />
                      <span>Conducting Autopsy Agent...</span>
                    </>
                  ) : (
                    <>
                      <HeartCrack size={14} />
                      <span>Assemble Autopsy Agent</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic current autopsy result module */}
      {currentResult && (
        <div id="active-autopsy-scroll" className="p-6 rounded-xl border border-limeaccent/30 bg-zinc-950 relative overflow-hidden shadow-[0_0_20px_rgba(197,255,65,0.04)]">
          {/* Decorative parchment background elements */}
          <div className="absolute top-0 right-0 p-4 font-mono text-[10px] text-zinc-800 tracking-widest select-none pointer-events-none">
            CHRONOS DECREE
          </div>

          <h3 className="font-display text-xl font-black text-limeaccent tracking-tight uppercase mb-4">
            DEATH AUDIT COMPLETE
          </h3>

          <div className="space-y-4">
            <div>
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-extrabold block mb-1">
                Solemn Post-Mortem Analysis
              </span>
              <p className="bg-black/40 border border-zinc-900 rounded p-4 font-mono text-xs leading-relaxed text-zinc-305 whitespace-pre-wrap">
                {currentResult.analysis}
              </p>
            </div>

            <div className="relative border border-zinc-805 bg-black/40 rounded-lg p-5">
              <span className="absolute -top-2 left-4 bg-zinc-950 text-limeaccent font-bold font-mono text-[8px] tracking-widest px-1.5 uppercase">
                BINDING COMMITMENT CONTRACT
              </span>
              <p className="font-sans font-semibold text-sm text-zinc-200 leading-relaxed mb-4">
                "{currentResult.commitment}"
              </p>

              <div className="flex items-center justify-end">
                {isSigned ? (
                  <div className="flex items-center gap-1.5 text-limeaccent font-mono text-xs font-bold bg-limeaccent/10 border border-limeaccent/20 px-3 py-1 rounded">
                    <Check size={12} />
                    <span>SEALED WITH CLICK-BLOOD</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSignContract}
                    className="flex items-center gap-1.5 bg-limeaccent hover:bg-limeaccent-hover text-black font-display text-xs font-black py-2 px-4 rounded tracking-wider uppercase transition-all cursor-pointer"
                  >
                    <PenTool size={12} />
                    <span>Agree & Sign Decree</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ancient Scroll Archive History */}
      <div id="autopsy-history-shelf" className="border-t border-zinc-900 pt-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="font-display text-xl font-black text-white flex items-center gap-2 uppercase tracking-tight">
            <History size={18} className="text-zinc-400" />
            Ancient Scroll Archive ({autopsies.length})
          </h3>
          {onClearHistory && autopsies.length > 0 && (
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-all bg-zinc-950 border border-zinc-900 hover:border-zinc-850 px-2 py-1 rounded cursor-pointer"
            >
              <RotateCcw size={10} name="Reset scroll history" />
              <span>Purge Archive</span>
            </button>
          )}
        </div>

        {autopsies.length === 0 ? (
          <div className="py-12 border border-dashed border-zinc-900 rounded-xl bg-zinc-950/5 text-center font-mono text-xs text-zinc-500">
            No past deceased task nodes diagnosed yet. Perform an Autopsy above to populate the ledger.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {autopsies.map((autopsy) => (
              <div
                key={autopsy.id}
                className="p-4 border border-zinc-900 bg-zinc-950/40 rounded-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <h4 className="font-display text-sm font-black text-zinc-200 uppercase tracking-tight">
                      {autopsy.taskTitle}
                    </h4>
                    <span className="font-mono text-[9px] text-zinc-600 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900">
                      DEADLINE EXPIRED
                    </span>
                  </div>
                  <p className="font-mono text-xs text-zinc-400 leading-relaxed mb-3 italic">
                    "{autopsy.failureReason}"
                  </p>
                </div>
                <div className="border-t border-zinc-900/60 pt-3 mt-2 bg-zinc-950/10 font-sans text-xs text-zinc-350">
                  <span className="font-mono text-[9.5px] not-italic text-zinc-500 block mb-1 uppercase tracking-wider">
                    DECREE AGREED:
                  </span>
                  "{autopsy.actionableCommitment}"
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}