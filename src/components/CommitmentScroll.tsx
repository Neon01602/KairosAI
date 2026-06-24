import { useState } from "react";
import { ShieldCheck, HeartCrack, Feather } from "lucide-react";

interface CommitmentScrollProps {
  taskTitle: string;
  autopsyAnalysis: string;
  commitmentContract: string;
  onSign: (signedContract: string) => void;
  onDismiss: () => void;
}

export default function CommitmentScroll({
  taskTitle,
  autopsyAnalysis,
  commitmentContract,
  onSign,
  onDismiss
}: CommitmentScrollProps) {
  const [signature, setSignature] = useState<string>("");
  const [isSealed, setIsSealed] = useState<boolean>(false);

  const handleSeal = () => {
    if (!signature.trim()) return;
    setIsSealed(true);
    setTimeout(() => {
      onSign(signature);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[9990] bg-black/90 backdrop-blur flex items-center justify-center p-4">
      <div className="max-w-md w-full border border-amber-900/[0.25] bg-zinc-950 p-6 rounded-2xl relative overflow-hidden shadow-[0_4px_30px_rgba(217,119,6,0.05)] space-y-6">
        
        {/* Gothic Banner line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-700" />

        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <HeartCrack className="text-amber-500 animate-pulse" size={16} />
            <span className="font-mono text-[9px] font-black uppercase text-amber-500 tracking-widest">
              SACRED COMMITMENT DEED
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="text-zinc-650 hover:text-zinc-400 font-mono text-[10px] cursor-pointer"
          >
            [Close]
          </button>
        </div>

        {/* Scroll Body */}
        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
          <div className="space-y-1">
            <span className="font-mono text-[8px] text-zinc-550 block uppercase">DECEASED NODAL COMPLIANCE FOR:</span>
            <h2 className="font-display text-lg font-black text-zinc-100 tracking-tight uppercase border border-amber-950/40 bg-amber-950/10 px-2.5 py-1.5 rounded">
              "{taskTitle}"
            </h2>
          </div>

          <div className="space-y-2 bg-black/60 rounded-lg p-4 border border-zinc-900">
            <h4 className="font-mono text-[10px] text-zinc-500 uppercase font-black tracking-wider">APOLOGETIC POST-MORTEM</h4>
            <p className="font-serif text-xs leading-relaxed text-zinc-350 italic">
              {autopsyAnalysis || "The mortal remains failed due to unseen temporal friction..."}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-amber-950/5 border border-amber-900/10 space-y-2.5 relative">
            <span className="absolute top-2 right-2 font-mono text-[8.5px] text-amber-500/30 font-black tracking-widest uppercase select-none">
              COVENANT
            </span>
            <div className="flex items-center gap-1.5">
              <Feather className="text-amber-500" size={13} />
              <h4 className="font-mono text-[10px] text-amber-500 uppercase font-black tracking-wider">COMMITMENT CONTRACT TERMS</h4>
            </div>
            <p className="font-sans text-xs leading-relaxed text-amber-100 italic bg-black/30 p-3 rounded border border-zinc-900">
              "{commitmentContract}"
            </p>
          </div>
        </div>

        {/* Signer input */}
        <div className="space-y-3.5 border-t border-zinc-900 pt-4">
          {!isSealed ? (
            <div className="space-y-3">
              <label className="font-mono text-[9px] text-zinc-500 uppercase block font-black max-w-xs">
                To seal this bond, write your name or initials to commit:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="E.g. Rebel Citizen"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="flex-1 bg-black text-zinc-200 border border-zinc-800 rounded-lg py-2 px-3 text-xs font-mono focus:border-amber-700 focus:outline-none"
                />
                <button
                  onClick={handleSeal}
                  disabled={!signature.trim()}
                  className="bg-amber-600 hover:bg-amber-700 disabled:opacity-30 text-white font-mono font-bold uppercase text-xs px-5 py-2.5 rounded-lg tracking-wide border border-amber-500/50 cursor-pointer flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(217,119,6,0.15)]"
                >
                  <ShieldCheck size={14} />
                  <span>Seal Deed</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 text-center animate-pulse space-y-1.5">
              <div className="text-amber-500 font-bold font-mono text-xs uppercase animate-bounce">
                BOND REGISTERED IN BLOOD & CLICKS
              </div>
              <p className="font-serif text-[10px] text-amber-200 italic leading-snug">
                "We hold with grit what has failed today. Temporal memory is restored."
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
