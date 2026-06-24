import { Sparkles, Calendar, Clock, ListTodo, AlertTriangle, HelpCircle } from "lucide-react";
import { SubTask } from "../types";

interface VoiceResult {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  estimatedHours: number;
  subtasks: { title: string; durationMinutes: number }[];
}

interface VoiceActionConfirmationProps {
  parsedData: VoiceResult | null;
  onConfirm: (finalTask: {
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "critical";
    subtasks: SubTask[];
    windowStart: string;
    windowEnd: string;
  }) => void;
  onCancel: () => void;
}

export default function VoiceActionConfirmation({
  parsedData,
  onConfirm,
  onCancel
}: VoiceActionConfirmationProps) {
  if (!parsedData) return null;

  // Compute standard default start/end times (From now untill 24 hours later)
  const now = new Date();
  const startISO = now.toISOString().slice(0, 16);
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const endISO = end.toISOString().slice(0, 16);

  const handleCommit = () => {
    const formattedSubtasks: SubTask[] = (parsedData.subtasks || []).map((st, i) => ({
      id: `v-sub-${Date.now()}-${i}`,
      title: st.title || `Milestone ${i + 1}`,
      durationMinutes: st.durationMinutes || 15,
      completed: false,
      order: i + 1
    }));

    onConfirm({
      title: parsedData.title,
      description: parsedData.description,
      priority: parsedData.priority || "medium",
      subtasks: formattedSubtasks,
      windowStart: startISO,
      windowEnd: endISO
    });
  };

  return (
    <div className="fixed inset-0 z-[9990] bg-black/90 backdrop-blur flex items-center justify-center p-4" id="voice-action-modal">
      <div className="max-w-md w-full border border-limeaccent/20 bg-zinc-950 p-6 rounded-2xl relative overflow-hidden shadow-[0_0_40px_rgba(197,255,65,0.06)] space-y-5">
        
        {/* Glow header banner */}
        <div className="absolute top-0 left-0 w-full h-1 bg-limeaccent animate-pulse" />

        <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="text-limeaccent" size={15} />
            <span className="font-mono text-[9px] font-black uppercase text-zinc-300 tracking-wider">
              VOICE RECONSTRUCTION STAGE
            </span>
          </div>
          <span className="font-mono text-[8px] text-limeaccent bg-limeaccent/10 px-1.5 py-0.5 rounded border border-limeaccent/20">
            KAIROS ALCHEMIST
          </span>
        </div>

        <p className="text-[11px] font-sans text-zinc-400 leading-relaxed">
          Gemini Live AI has structured your spoken frequencies into a temporal task milestone node. Review and confirm below to slot it directly onto your timeline:
        </p>

        {/* Structured task breakdown inside scrollbox */}
        <div className="space-y-3.5 bg-black/60 rounded-xl p-4 border border-zinc-900 max-h-[300px] overflow-y-auto">
          
          {/* Title */}
          <div className="space-y-1">
            <span className="font-mono text-[8px] text-zinc-550 block font-black uppercase tracking-wider">TARGET NODE TITLE</span>
            <h3 className="font-display font-black text-sm text-zinc-100 uppercase tracking-tight">
              {parsedData.title || "Unnamed Voice Task"}
            </h3>
          </div>

          {/* Description */}
          {parsedData.description && (
            <div className="space-y-1 border-t border-zinc-900/60 pt-2">
              <span className="font-mono text-[8px] text-zinc-550 block font-block uppercase tracking-wider">ANALYSIS CONTEXT</span>
              <p className="font-sans text-xs text-zinc-300 leading-normal">
                {parsedData.description}
              </p>
            </div>
          )}

          {/* Priority & Capacity */}
          <div className="grid grid-cols-2 gap-3 border-t border-zinc-900/60 pt-2 font-mono text-[10px]">
            <div className="space-y-1">
              <span className="text-zinc-550 block font-bold uppercase tracking-wider">PRIORITY LEVEL</span>
              <span className={`inline-block font-black px-2 py-0.5 rounded uppercase ${
                parsedData.priority === "critical"
                  ? "bg-red-950 text-red-400 border border-red-500/30"
                  : parsedData.priority === "high"
                  ? "bg-amber-950 text-amber-400 border border-amber-500/20"
                  : parsedData.priority === "low"
                  ? "bg-zinc-900 text-zinc-400"
                  : "bg-limeaccent/10 text-limeaccent border border-limeaccent/15"
              }`}>
                {parsedData.priority || "medium"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-550 block font-bold uppercase tracking-wider">PREDICTED CAPACITY</span>
              <div className="flex items-center gap-1 text-zinc-200 font-bold">
                <Clock size={11} className="text-limeaccent" />
                <span>{(parsedData.estimatedHours || 1.5).toFixed(1)} focus hours</span>
              </div>
            </div>
          </div>

          {/* Subtask listing */}
          {parsedData.subtasks && parsedData.subtasks.length > 0 && (
            <div className="space-y-2 border-t border-zinc-900/60 pt-2.5">
              <span className="font-mono text-[8px] text-zinc-550 block font-black uppercase tracking-wider flex items-center gap-1">
                <ListTodo size={10} className="text-limeaccent" />
                Decomposed Milestones ({parsedData.subtasks.length})
              </span>
              <div className="space-y-1.5">
                {parsedData.subtasks.map((st, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] font-sans bg-zinc-900/40 border border-zinc-910 py-1.5 px-2.5 rounded-lg text-zinc-350 hover:bg-zinc-900/70">
                    <span className="truncate pr-1">
                      <strong className="font-mono text-zinc-650 text-[10px] mr-1.5">{idx + 1}.</strong>
                      {st.title}
                    </span>
                    <span className="font-mono text-[9px] text-zinc-500 shrink-0 font-medium">{st.durationMinutes} min</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Trigger controls */}
        <div className="flex items-center gap-3 border-t border-zinc-900 pt-3 flex-wrap">
          <button
            onClick={onCancel}
            className="flex-1 border border-zinc-805 hover:bg-zinc-900 text-zinc-400 font-mono text-xs font-bold uppercase py-2.5 px-4 rounded-xl cursor-pointer select-none transition-all active:scale-[0.98]"
          >
            Decay Transcript
          </button>
          
          <button
            onClick={handleCommit}
            className="flex-grow-[1.5] bg-limeaccent hover:bg-limeaccent-hover text-black font-mono text-xs font-black uppercase py-2.5 px-4 rounded-xl cursor-pointer select-none transition-all flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(197,255,65,0.15)] active:scale-[0.98]"
          >
            <Sparkles size={13} className="text-black" />
            <span>Confirm & Align Node</span>
          </button>
        </div>
      </div>
    </div>
  );
}
