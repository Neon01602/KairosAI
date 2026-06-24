import { useState, useEffect } from "react";
import { Plus, Target, Award, Calendar, Trash2, CheckCircle2, ChevronRight, Activity, Sparkles, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { Habit } from "../types";
import { firebaseService } from "../lib/firebaseService";

interface HabitTrackerProps {
  triggerToast: (msg: string, type: "info" | "success" | "warning") => void;
}

const MYTHIC_HABIT_TEMPLATES = [
  { name: "Draft of Lethe", theme: "Consistently hydrated. Drink water every 2 focus hours to refresh focus." },
  { name: "Chronos Scythe Polishing", theme: "Morning review. Align task blocks precisely with daily focus limits." },
  { name: "Altar of restoration", theme: "Deep rest or somatic stretches. Escape screens for 15-minute restoration slots." },
  { name: "Scribe of Necropolis", theme: "At sunset, document learnings and failures. Audit your procrastination DNA." }
];

export default function HabitTracker({ triggerToast }: HabitTrackerProps) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newHabitName, setNewHabitName] = useState<string>("");
  const [newHabitMythic, setNewHabitMythic] = useState<string>("");
  const [newHabitFreq, setNewHabitFreq] = useState<"daily" | "weekly">("daily");

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    try {
      const fetched = await firebaseService.getHabits();
      setHabits(fetched);
    } catch (err) {
      console.error("Failed to load habits:", err);
      triggerToast("Failed loading habits from Firestore database.", "warning");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomHabit = async (name: string, theme: string, freq: "daily" | "weekly") => {
    if (!name.trim()) return;
    const cleanTheme = theme.trim() || "Perform this sacred task daily to keep focus sharp.";
    
    const h: Habit = {
      id: `habit-${Date.now()}`,
      name: name.trim(),
      frequency: freq,
      mythicTheme: cleanTheme,
      streak: 0,
      history: [],
      createdAt: new Date().toISOString()
    };

    try {
      await firebaseService.saveHabit(h);
      setHabits(prev => [h, ...prev]);
      triggerToast(`✨ '${name}' bound to your daily timeline bounds.`, "success");
    } catch (err) {
      console.error(err);
      triggerToast("Error saving habit.", "warning");
    }
  };

  const handleCreateNew = () => {
    if (!newHabitName.trim()) {
      triggerToast("A habit must have a title representation.", "warning");
      return;
    }
    handleAddCustomHabit(newHabitName, newHabitMythic, newHabitFreq);
    setNewHabitName("");
    setNewHabitMythic("");
  };

  const handleDeleteHabit = async (id: string, name: string) => {
    try {
      await firebaseService.deleteHabit(id);
      setHabits(prev => prev.filter(item => item.id !== id));
      triggerToast(`Habit '${name}' dissolved.`, "info");
    } catch (err) {
      console.error(err);
      triggerToast("Could not delete habit.", "warning");
    }
  };

  const handleToggleHabitDay = async (habit: Habit, dateStr: string) => {
    const dates = [...habit.history];
    const index = dates.indexOf(dateStr);
    let updatedHistory = [];
    let updatedStreak = habit.streak;

    if (index > -1) {
      // Untoggle
      dates.splice(index, 1);
      updatedHistory = dates;
      updatedStreak = Math.max(0, updatedStreak - 1);
    } else {
      // Toggle
      dates.push(dateStr);
      updatedHistory = dates;
      updatedStreak = updatedStreak + 1;
    }

    const updatedHabit: Habit = {
      ...habit,
      history: updatedHistory,
      streak: updatedStreak
    };

    // Optimistic update
    setHabits(prev => prev.map(item => item.id === habit.id ? updatedHabit : item));

    try {
      await firebaseService.updateHabit(updatedHabit);
      if (index === -1) {
        triggerToast(`🔥 Habit checked! Streak: ${updatedStreak} days.`, "success");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Failed to update habit on server.", "warning");
      // Rollback
      setHabits(prev => prev.map(item => item.id === habit.id ? habit : item));
    }
  };

  // Helper date lists for the last 7 days of the timeline
  const getPastDates = () => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.toLocaleDateString("en-US", { day: "numeric" });
      list.push({ dateStr: str, label, dayNum });
    }
    return list;
  };

  const pastDates = getPastDates();

  // Prepare Long-Term Analytics of Goal Consistency Rates
  // Let's generate a list of the last 15 days with corresponding aggregated consistency rate (percentage of habits completed)
  const getGoalAnalyticsData = () => {
    const list = [];
    if (habits.length === 0) {
      // Mock historical data so charts aren't completely empty
      for (let i = 14; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        list.push({ dateLabel: label, consistency: 0 });
      }
      return list;
    }

    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      
      const activeHabitsOnDate = habits.filter(h => h.history.includes(str));
      const completedPercent = Math.round((activeHabitsOnDate.length / habits.length) * 100);
      list.push({ dateLabel: label, consistency: completedPercent });
    }
    return list;
  };

  const chartData = getGoalAnalyticsData();

  // Metrics calculations
  const totalStreakSum = habits.reduce((sum, h) => sum + h.streak, 0);
  const averageStreak = habits.length ? Math.round((totalStreakSum / habits.length) * 10) / 10 : 0;
  
  // Calculate average consistency over the past 7 days
  const calculateTotalWeeklyConsistency = () => {
    if (!habits.length) return 0;
    let counts = 0;
    pastDates.forEach(pd => {
      counts += habits.filter(h => h.history.includes(pd.dateStr)).length;
    });
    const totalPossibleSlots = habits.length * 7;
    return Math.round((counts / totalPossibleSlots) * 100);
  };

  const weeklyPercentage = calculateTotalWeeklyConsistency();

  return (
    <div className="space-y-6" id="habit-tracker-viewport">
      {/* Upper Meta Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-xl border border-white/5 bg-zinc-900/30 backdrop-blur-md flex items-center justify-between shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-300 hover:border-white/10">
          <div className="absolute top-0 left-0 w-1 h-full bg-limeaccent" />
          <div className="space-y-1">
            <span className="font-mono text-[9px] text-zinc-550 uppercase tracking-widest block font-black">
              AVERAGE REALIGNMENT STREAK
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-display font-black text-zinc-100">{averageStreak}</span>
              <span className="text-[10px] text-zinc-500 font-sans font-medium">days</span>
            </div>
          </div>
          <Award className="text-limeaccent shrink-0 opacity-60" size={24} />
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl border border-white/5 bg-zinc-900/30 backdrop-blur-md flex items-center justify-between shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-300 hover:border-white/10">
          <div className="absolute top-0 left-0 w-1 h-full bg-limeaccent" />
          <div className="space-y-1">
            <span className="font-mono text-[9px] text-zinc-550 uppercase tracking-widest block font-black">
              7-DAY MOMENTUM RATIO
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-display font-black text-limeaccent">{weeklyPercentage}%</span>
              <span className="text-[10px] text-zinc-500 font-sans font-medium">aligned</span>
            </div>
          </div>
          <Activity className="text-limeaccent shrink-0 opacity-60 animate-pulse" size={24} />
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl border border-white/5 bg-zinc-900/30 backdrop-blur-md flex items-center justify-between shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-300 hover:border-white/10">
          <div className="absolute top-0 left-0 w-1 h-full bg-limeaccent" />
          <div className="space-y-1">
            <span className="font-mono text-[9px] text-zinc-550 uppercase tracking-widest block font-black">
              ACTIVE COVENANTS
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-display font-black text-zinc-100">{habits.filter(h => h.streak > 0).length}</span>
              <span className="text-[10px] text-zinc-500 font-sans font-medium">of {habits.length} streaking</span>
            </div>
          </div>
          <Target className="text-limeaccent shrink-0 opacity-60" size={24} />
        </div>
      </div>

      {/* Main Grid: Create/List Habits & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Habits manager, spans 7 cols */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Create new habit */}
          <div className="p-5 border border-white/5 bg-zinc-900/30 backdrop-blur-md rounded-xl space-y-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-white/10">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
              <Plus className="text-limeaccent" size={15} />
              <h3 className="font-display text-xs uppercase font-black text-zinc-300 tracking-wider">
                Forge Covenant / Custom Habit
              </h3>
            </div>

            <div className="space-y-3.5">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[9px] text-zinc-550 uppercase tracking-wider font-bold">Habit Title</label>
                <input
                  type="text"
                  placeholder="E.g. Hydration Hour"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  className="bg-black/80 border border-zinc-850 px-3.5 py-2 rounded-lg text-xs font-mono text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-limeaccent focus:ring-1 focus:ring-limeaccent/20"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-mono text-[9px] text-zinc-550 uppercase tracking-wider font-bold">Sacred Motivation (Mythic Context)</label>
                <input
                  type="text"
                  placeholder="E.g. Drink clean stream water to wash away lethargy and Charon's mist."
                  value={newHabitMythic}
                  onChange={(e) => setNewHabitMythic(e.target.value)}
                  className="bg-black/80 border border-zinc-850 px-3.5 py-2 rounded-lg text-xs font-sans text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-limeaccent"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    id="freq-daily"
                    name="freq"
                    checked={newHabitFreq === "daily"}
                    onChange={() => setNewHabitFreq("daily")}
                    className="accent-limeaccent"
                  />
                  <label htmlFor="freq-daily" className="font-mono text-[10px] text-zinc-400 font-bold uppercase cursor-pointer select-none">Daily Timeline</label>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    id="freq-weekly"
                    name="freq"
                    checked={newHabitFreq === "weekly"}
                    onChange={() => setNewHabitFreq("weekly")}
                    className="accent-limeaccent"
                  />
                  <label htmlFor="freq-weekly" className="font-mono text-[10px] text-zinc-400 font-bold uppercase cursor-pointer select-none">Weekly Allocation</label>
                </div>

                <button
                  onClick={handleCreateNew}
                  className="ml-auto bg-limeaccent hover:bg-limeaccent-hover text-black font-mono font-black text-[11px] uppercase tracking-wide px-4 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  Save Habit Node
                </button>
              </div>
            </div>

            {/* Mythic Templates list */}
            <div className="border-t border-zinc-900/60 pt-3">
              <span className="font-mono text-[8px] text-zinc-550 font-black block uppercase tracking-wider mb-2">Instant Mythic Covenants (1-Click Add):</span>
              <div className="flex flex-wrap gap-2">
                {MYTHIC_HABIT_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAddCustomHabit(tmpl.name, tmpl.theme, "daily")}
                    className="font-mono text-[9px] hover:text-white text-zinc-400 border border-zinc-800 hover:border-limeaccent/35 bg-black/40 hover:bg-limeaccent/5 px-2.5 py-1.5 rounded transition-all cursor-pointer text-left shrink-0"
                  >
                    🚀 <span className="font-bold underline mr-1">{tmpl.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active habits list block */}
          <div className="space-y-3">
            <h3 className="font-mono text-[10px] font-black uppercase text-zinc-450 tracking-wider">
              YOUR COMMITTED COVENANTS
            </h3>

            {loading ? (
              <div className="space-y-2.5">
                {[1, 2].map(s => (
                  <div key={s} className="h-16 rounded-xl border border-white/5 bg-zinc-900/10 backdrop-blur-md animate-pulse" />
                ))}
              </div>
            ) : habits.length === 0 ? (
              <div className="border border-dashed border-zinc-800 p-7 rounded-xl text-center space-y-2 backdrop-blur-sm bg-zinc-900/5">
                <AlertCircle className="mx-auto text-zinc-750" size={18} />
                <p className="font-sans text-xs text-zinc-600">
                  There are no active covenants. Forge details above or click a mythic template to begin.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {habits.map(habit => (
                  <div
                    key={habit.id}
                    className="relative border border-white/5 bg-zinc-900/30 backdrop-blur-md p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-white/10"
                  >
                    <div className="space-y-1 max-w-sm">
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-black text-xs text-zinc-200 uppercase tracking-tight">
                          {habit.name}
                        </h4>
                        <span className="font-mono text-[8.5px] text-zinc-550 border border-zinc-900 px-1 hover:border-zinc-800 rounded bg-black">
                          {habit.frequency}
                        </span>
                        {habit.streak > 0 && (
                          <span className="font-mono text-[9px] text-limeaccent bg-limeaccent/5 hover:bg-limeaccent/10 border border-limeaccent/20 px-1.5 py-0.5 rounded">
                            🔥 {habit.streak} day streak
                          </span>
                        )}
                      </div>
                      <p className="font-sans text-[11px] text-zinc-500 leading-normal">
                        {habit.mythicTheme}
                      </p>
                    </div>

                    {/* 7 Day check grid */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
                      {pastDates.map(pd => {
                        const isCompleted = habit.history.includes(pd.dateStr);
                        return (
                          <button
                            key={pd.dateStr}
                            onClick={() => handleToggleHabitDay(habit, pd.dateStr)}
                            className={`w-9 h-11 flex flex-col items-center justify-center border rounded-lg transition-all cursor-pointer ${
                              isCompleted
                                ? "bg-limeaccent border-limeaccent text-black"
                                : "bg-black/60 border-zinc-850 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                            }`}
                          >
                            <span className="font-mono text-[7px] uppercase tracking-wider block leading-none font-bold">
                              {pd.label}
                            </span>
                            <span className="font-mono text-[10px] font-black block mt-0.5 leading-none">
                              {pd.dayNum}
                            </span>
                          </button>
                        );
                      })}

                      <button
                        onClick={() => handleDeleteHabit(habit.id, habit.name)}
                        className="ml-2 w-7 h-7 flex items-center justify-center text-zinc-700 hover:text-red-500 transition-colors border border-transparent hover:border-zinc-850 rounded bg-black/20 hover:bg-red-950/20 cursor-pointer shrink-0"
                        title="Decay habit"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Area consistent charts & Analytics, spans 5 cols */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl border border-white/5 bg-zinc-900/30 backdrop-blur-md space-y-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-white/10">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
              <Activity className="text-limeaccent" size={15} />
              <h3 className="font-display text-xs uppercase font-black text-zinc-300 tracking-wider">
                15-Day Temporal Goal consistency
              </h3>
            </div>

            <p className="text-[10px] font-sans text-zinc-500 leading-normal">
              This area chart displays the historical temporal completeness percentage of your habits over a 15-day timeline:
            </p>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorConsistency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C5FF41" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#C5FF41" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="dateLabel" 
                    tick={{ fill: '#71717a', fontSize: 8 }}
                    stroke="#18181b"
                  />
                  <YAxis 
                    tick={{ fill: '#71717a', fontSize: 8 }} 
                    domain={[0, 100]}
                    stroke="#18181b"
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', fontSize: 10, fontFamily: 'monospace' }}
                    labelStyle={{ color: '#a1a1aa' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="consistency"
                    stroke="#C5FF41"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#colorConsistency)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Goal Milestone tracker */}
          <div className="p-4 rounded-xl border border-white/5 bg-zinc-900/30 backdrop-blur-md space-y-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] text-xs transition-all duration-300 hover:border-white/10">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <div className="flex items-center gap-1.5">
                <Target className="text-limeaccent" size={13} />
                <span className="font-mono text-[9px] uppercase tracking-wider font-black text-zinc-400">Survival Milestones</span>
              </div>
              <span className="font-mono text-[8px] text-zinc-650 font-bold uppercase">Chronicle</span>
            </div>

            <ul className="space-y-3.5 font-sans text-zinc-400 text-[11px]">
              <li className="flex items-start gap-2.5">
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[10px] ${weeklyPercentage >= 30 ? 'bg-limeaccent border-limeaccent text-black font-bold' : 'border-zinc-800 bg-zinc-950 font-mono text-zinc-700'}`}>30%</span>
                <div>
                  <span className="font-bold uppercase text-zinc-300 text-[10px] block">Adequate Ritual (30%+)</span>
                  <span className="text-zinc-550 leading-relaxed text-[11px] block">Attain a minimum of 30% weekly consistency to balance Charon's River demands.</span>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[10px] ${weeklyPercentage >= 65 ? 'bg-limeaccent border-limeaccent text-black font-bold' : 'border-zinc-800 bg-zinc-950 font-mono text-zinc-700'}`}>65%</span>
                <div>
                  <span className="font-bold uppercase text-zinc-300 text-[10px] block">Titanic Momentum (65%+)</span>
                  <span className="text-zinc-550 leading-relaxed text-[11px] block">Attain 65% weekly consistency nodes. Temporal focus triggers a defense shield.</span>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 text-[10px] ${weeklyPercentage >= 90 ? 'bg-limeaccent border-limeaccent text-black font-bold' : 'border-zinc-800 bg-zinc-950 font-mono text-zinc-700'}`}>90%</span>
                <div>
                  <span className="font-bold uppercase text-zinc-300 text-[10px] block">Immaculate Ascendancy (90%+)</span>
                  <span className="text-zinc-550 leading-relaxed text-[11px] block">Attain near-absolute mastery over procrastination. Absolute outrun of Time.</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
