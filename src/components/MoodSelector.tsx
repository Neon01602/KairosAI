import { useState } from "react";
import { Sliders, RefreshCw, Sparkles, BrainCircuit } from "lucide-react";
import { Task, MoodState } from "../types";

interface MoodSelectorProps {
  tasks: Task[];
  onMoodAligned: (mood: MoodState, recommendedTaskIds: string[]) => void;
}

export default function MoodSelector({ tasks, onMoodAligned }: MoodSelectorProps) {
  const [energy, setEnergy] = useState<number>(5);
  const [focus, setFocus] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(false);
  const [oracleTip, setOracleTip] = useState<string>("");

  const handleAlign = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/mood-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          energy,
          focus,
          tasks: tasks.map(t => ({ id: t.id, title: t.title, priority: t.priority, status: t.status }))
        })
      });

      const data = await response.json();
      if (response.ok) {
        setOracleTip(data.advice);
        onMoodAligned(
          {
            energy,
            focus,
            lastCheckedIn: new Date().toISOString(),
            advice: data.advice
          },
          data.recommendedTaskIds || []
        );
      } else {
        console.error("Mood response failed:", data);
      }
    } catch (err) {
      console.error("Failed to connect mood schedule alignment:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="mood-selector-card" className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-md shadow-lg relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-limeaccent" />
      
      <div className="flex items-center gap-2 mb-4 border-b border-zinc-900 pb-3">
        <BrainCircuit size={18} className="text-limeaccent animate-pulse" />
        <h4 className="font-display text-lg font-black tracking-tight uppercase text-zinc-100">
          10-Sec Vitality Check-in
        </h4>
        <span className="ml-auto font-mono text-[9px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">
          DECRETUM
        </span>
      </div>

      <div className="space-y-4">
        {/* Physical Vigor slider */}
        <div>
          <div className="flex justify-between font-mono text-xs text-zinc-400 mb-1">
            <span>PHYSICAL VIGOR (ENERGY)</span>
            <span className="font-bold text-limeaccent">{energy}/10</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={energy}
            onChange={(e) => setEnergy(parseInt(e.target.value))}
            className="w-full accent-limeaccent h-1.5 bg-zinc-900 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between font-mono text-[9px] text-zinc-600 mt-1">
            <span>Soporific / Sluggish</span>
            <span>Hyper-Vibrant / Unstoppable</span>
          </div>
        </div>

        {/* Mental Alertness slider */}
        <div>
          <div className="flex justify-between font-mono text-xs text-zinc-400 mb-1">
            <span>MENTAL ALERTNESS (FOCUS)</span>
            <span className="font-bold text-limeaccent">{focus}/10</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={focus}
            onChange={(e) => setFocus(parseInt(e.target.value))}
            className="w-full accent-limeaccent h-1.5 bg-zinc-900 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between font-mono text-[9px] text-zinc-600 mt-1">
            <span>Chaotic Distraction</span>
            <span>Laser Zen Sharpness</span>
          </div>
        </div>

        {/* Align trigger button */}
        <button
          onClick={handleAlign}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-limeaccent hover:bg-limeaccent-hover disabled:bg-zinc-800 text-black font-black font-display py-2 px-4 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer"
        >
          {loading ? (
            <>
              <RefreshCw size={14} className="animate-spin text-black animate-infinite" />
              <span>Seeking the Oracle's Will...</span>
            </>
          ) : (
            <>
              <Sparkles size={14} className="text-black" />
              <span>Align Today's Flow</span>
            </>
          )}
        </button>

        {/* Oracle's interactive myth advice output */}
        {oracleTip && (
          <div className="mt-3 bg-limeaccent/5 border border-limeaccent/20 rounded-lg p-3 relative font-mono text-xs leading-relaxed text-zinc-300">
            <span className="absolute -top-2 left-3 bg-zinc-950 px-1.5 text-[8px] text-limeaccent select-none tracking-widest font-bold">
              ORACLE'S INSTRUCTION
            </span>
            <p className="italic">
              "{oracleTip}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
