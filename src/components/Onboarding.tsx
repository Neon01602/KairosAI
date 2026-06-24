import { useState } from "react";
import { Hourglass, Flame, BrainCircuit, Activity, ChevronRight, Play } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<number>(1);

  const steps = [
    {
      title: "OUTRUN TIME ITSELF",
      subtitle: "The Philosophy of Kairos.ai",
      desc: "Chronos keeps ticking blindly, demanding tribute. Kairos is the moment of decisive action. Here, we do not simply list tasks; we align them with dynamic mental energy levels to defeat the scythe of procrastination.",
      icon: <Hourglass className="text-limeaccent" size={32} />
    },
    {
      title: "THE TIME DEBT METRIC",
      subtitle: "Your Unforgiving Temporal Balance",
      desc: "Every minute a task is overdue increases your 'Time Debt'. When Debt rises, Charon's ferry grows closer, warning of 'catastrophic' delays. Complete tasks actively to pay off your debt and claim pristine focus.",
      icon: <Flame className="text-limeaccent" size={32} />
    },
    {
      title: "MULTI-AGENT ORCHESTRATION",
      subtitle: "AI Intake, Decomposition & Scheduling",
      desc: "Input a raw task description or whisper it to our Gemini Live Alchemist. Your instructions flow through a multi-agent pipeline: an Intake Agent structures it, a Decomposer creates subtasks, a Mood-Aware Scheduler aligns it, and a Safeguard Agent drafts blocker mitigations.",
      icon: <BrainCircuit className="text-limeaccent" size={32} />
    },
    {
      title: "THE 10-MINUTE EMERGENCIES",
      subtitle: "Frantic Countdown Save Mode",
      desc: "Faced with complete paralysis on an imminent deadline? Initiate the emergency '10-Minute Save' Sprint. Our agent strips everything to raw MVP milestones for a high-intensity 10-minute sprint to escape defeat.",
      icon: <Activity className="text-limeaccent" size={32} />
    }
  ];

  const current = steps[step - 1];

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-radial-gradient from-zinc-950 via-black to-black opacity-60" />
      
      <div className="max-w-md w-full border border-zinc-850 bg-zinc-950 p-8 rounded-2xl relative overflow-hidden shadow-[0_0_50px_rgba(197,255,65,0.03)] space-y-7">
        {/* Progress bar */}
        <div className="flex gap-1.5 h-1">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 rounded-full transition-all duration-350 ${
                idx + 1 === step
                  ? "bg-limeaccent w-2/5"
                  : idx + 1 < step
                  ? "bg-limeaccent/40"
                  : "bg-zinc-900"
              }`}
            />
          ))}
        </div>

        {/* Head */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl border border-zinc-900 bg-black/50 flex items-center justify-center">
            {current.icon}
          </div>
          <div>
            <span className="font-mono text-[8px] text-zinc-550 tracking-widest font-black uppercase block">
              REBEL REGIMENT TRANSMISSION
            </span>
            <span className="font-mono text-[10px] text-limeaccent font-semibold">{step} of {steps.length} • TEMPORAL PROTOCOL</span>
          </div>
        </div>

        {/* Core content */}
        <div className="space-y-2.5 min-h-[160px]">
          <h1 className="font-display text-2xl font-black text-zinc-100 tracking-tight uppercase">
            {current.title}
          </h1>
          <h3 className="font-sans text-xs text-zinc-400 font-medium">
            {current.subtitle}
          </h3>
          <p className="font-sans text-xs text-zinc-500 leading-relaxed pt-2">
            {current.desc}
          </p>
        </div>

        {/* Control Footer */}
        <div className="flex items-center justify-between border-t border-zinc-900 pt-4">
          <button
            onClick={onComplete}
            className="font-mono text-[9px] uppercase tracking-wider text-zinc-650 hover:text-zinc-400 cursor-pointer"
          >
            Skip Intro
          </button>

          {step < steps.length ? (
            <button
              onClick={() => setStep(prev => prev + 1)}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-100 border border-zinc-800 px-5 py-2.5 rounded-lg text-xs font-mono font-bold uppercase transition-all tracking-wide cursor-pointer select-none"
            >
              <span>Transmit Coordinates</span>
              <ChevronRight size={13} className="text-limeaccent" />
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="flex items-center gap-2 bg-limeaccent hover:bg-limeaccent-hover text-black px-6 py-2.5 rounded-lg text-xs font-mono font-bold uppercase transition-all tracking-wide shadow-[0_0_20px_rgba(197,255,65,0.2)] cursor-pointer select-none"
            >
              <Play size={11} className="fill-black text-black" />
              <span>Outrun Time</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
