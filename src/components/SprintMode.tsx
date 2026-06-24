import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, ShieldAlert, Volume2, VolumeX, CheckSquare, Zap, Smile } from "lucide-react";
import { Task } from "../types";

interface SprintModeProps {
  task: Task | null;
  onSprintComplete: (taskId: string) => void;
  onExit: () => void;
}

export default function SprintMode({ task, onSprintComplete, onExit }: SprintModeProps) {
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes (600 seconds)
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [sprintTitle, setSprintTitle] = useState<string>("Emergency MVP");
  const [milestones, setMilestones] = useState<string[]>([]);
  const [completedMilestones, setCompletedMilestones] = useState<boolean[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAudioOn, setIsAudioOn] = useState<boolean>(true);
  
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play a procedural beeping/ticking sound using browser AudioContext
  const playTickSound = (frequency: number, duration: number) => {
    if (!isAudioOn) return;
    try {
      const audioCtx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioCtxRef.current) audioCtxRef.current = audioCtx;
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context block or unsupported:", e);
    }
  };

  // Generate Sprint Steps from server on load
  useEffect(() => {
    if (!task) return;
    setLoading(true);
    fetch("/api/generate-sprint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: task.title, subtasks: task.subtasks })
    })
      .then(res => res.json())
      .then(data => {
        setSprintTitle(data.sprintTitle || "Raw MVP Draft");
        const list = data.milestones || [];
        setMilestones(list);
        setCompletedMilestones(new Array(list.length).fill(false));
      })
      .catch((err) => {
        console.error("Sprint step retrieval failed, using fallback:", err);
        // Backup milestones
        const fallback = [
          "Banish all styling. Write out a single bulleted outline list.",
          "Code purely the bare skeleton component in 4 minutes flat.",
          "Verify the primary compile output. Deliver before the scythe rings!"
        ];
        setSprintTitle(`Raw MVP of: ${task.title}`);
        setMilestones(fallback);
        setCompletedMilestones(new Array(fallback.length).fill(false));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [task]);

  // Handle countdown ticks
  useEffect(() => {
    if (!isRunning) return;
    if (timeLeft <= 0) {
      // Alarm completed!
      playTickSound(880, 1.2);
      setTimeout(() => playTickSound(1040, 1.0), 300);
      setIsRunning(false);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        // Emit ticking sound on each tick (lower pitch for regular, higher pitch on crunch)
        if (next < 60) {
          playTickSound(440, 0.15); // Critical warning beep last minute
        } else {
          playTickSound(220, 0.05); // Standard clock tick
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeLeft, isAudioOn]);

  const toggleMilestone = (index: number) => {
    const updated = [...completedMilestones];
    updated[index] = !updated[index];
    setCompletedMilestones(updated);
    playTickSound(520, 0.1); // Pluck sound on complete
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinishEarly = () => {
    if (!task) return;
    playTickSound(659.25, 0.4); // E major complete chord
    setTimeout(() => playTickSound(783.99, 0.5), 150);
    onSprintComplete(task.id);
  };

  const allDone = completedMilestones.length > 0 && completedMilestones.every(v => v);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 bg-grid-pattern overflow-y-auto">
      {/* Heavy alert banner header */}
      <div className="w-full max-w-2xl bg-limeaccent text-black py-2 px-4 rounded-t-xl font-mono text-center text-xs font-black tracking-widest flex items-center justify-center gap-2 uppercase">
        <ShieldAlert size={14} className="animate-bounce" />
        EMERGENCY 10-MINUTE SAVE ACTIVE — STAND FAST
      </div>

      <div className="w-full max-w-2xl bg-zinc-950 border-x border-b border-limeaccent/20 p-8 rounded-b-xl shadow-[0_0_50px_rgba(197,255,65,0.08)] relative">
        
        {/* Absolute scythe vector indicator animation in the background */}
        <div className="absolute top-6 right-8 w-20 h-20 opacity-10">
          <svg
            className="w-full h-full text-limeaccent animate-scythe-swing origin-top"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            {/* Scythe handle */}
            <line x1="50" y1="10" x2="50" y2="90" />
            {/* Scythe curved blade */}
            <path d="M50 10 C 20 10, 10 30, 20 50 C 30 70, 48 50, 48 50" />
          </svg>
        </div>

        <div className="flex justify-between items-center mb-6">
          <span className="font-mono text-xs text-zinc-500">TASK: {task?.title}</span>
          <button
            onClick={() => setIsAudioOn(!isAudioOn)}
            className="text-zinc-400 hover:text-white p-1 rounded-md bg-zinc-900 border border-zinc-800 transition-all cursor-pointer"
          >
            {isAudioOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>

        {/* Massive Digit Ticker Countdown */}
        <div className="text-center my-8">
          <div className="font-display text-7xl font-bold tracking-tighter text-limeaccent tabular-nums animate-glow-pulse drop-shadow-[0_4px_12px_rgba(197,255,65,0.2)]">
            {formatTime(timeLeft)}
          </div>
          <p className="font-mono text-[10px] text-zinc-500 tracking-widest mt-2 uppercase">
            SECONDS REMAINING TO SECURE THE MVP
          </p>
        </div>

        {/* Navigation / controls row */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-mono text-xs py-2 px-4 rounded-md transition-all cursor-pointer"
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
            <span>{isRunning ? "Freeze Time" : "Resume Time"}</span>
          </button>
          
          <button
            onClick={() => setTimeLeft(600)}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 font-mono text-xs py-2 px-4 rounded-md transition-all cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset Clock</span>
          </button>
        </div>

        {/* AI Decomposed MVP Milestones */}
        <div className="bg-black/60 border border-zinc-850 rounded-xl p-5 mb-8">
          <h3 className="font-display text-lg font-black tracking-tight uppercase text-zinc-100 flex items-center gap-2 mb-4 border-b border-zinc-900 pb-2">
            <Zap size={16} className="text-limeaccent" />
            {loading ? "Re-engineering MVP tasks..." : sprintTitle}
          </h3>

          {loading ? (
            <div className="py-8 text-center text-xs font-mono text-zinc-500">
              <div className="w-6 h-6 border-2 border-limeaccent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Slicing details down into survival nodes...
            </div>
          ) : (
            <div className="space-y-3.5">
              {milestones.map((milestone, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleMilestone(idx)}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                    completedMilestones[idx]
                      ? 'bg-zinc-950/20 border-limeaccent/15 text-zinc-500'
                      : 'bg-zinc-900/40 border-zinc-800/40 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-300'
                  }`}
                >
                  <div className="mt-0.5">
                    {completedMilestones[idx] ? (
                      <CheckSquare className="text-limeaccent" size={16} />
                    ) : (
                      <div className="w-4 h-4 border border-zinc-600 rounded-sm" />
                    )}
                  </div>
                  <span className={`font-mono text-xs leading-relaxed ${completedMilestones[idx] ? 'line-through text-zinc-600' : ''}`}>
                    {milestone}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Submission Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onExit}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 font-mono text-xs font-bold py-3 px-4 rounded-lg transition-all cursor-pointer"
          >
            Abandon Sprint
          </button>

          <button
            onClick={handleFinishEarly}
            disabled={!allDone && timeLeft > 0}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-display text-xs font-black tracking-wider transition-all uppercase cursor-pointer ${
              allDone || timeLeft <= 0
                ? "bg-limeaccent hover:bg-limeaccent-hover text-black animate-pulse"
                : "bg-zinc-800 border border-zinc-700 text-zinc-500"
            }`}
          >
            <Smile size={14} className="text-black" />
            <span>Secure Completion</span>
          </button>
        </div>

        {/* Completion status reward prompt */}
        {allDone && (
          <div className="mt-4 p-3 bg-limeaccent/10 border border-limeaccent/30 rounded-lg text-center text-xs font-mono text-limeaccent flex items-center justify-center gap-2">
            ✨ BARRIER BROKEN. All MVP milestones completed. Press secure to seal completion.
          </div>
        )}
      </div>
    </div>
  );
}
