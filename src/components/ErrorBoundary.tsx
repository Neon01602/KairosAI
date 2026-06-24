import { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public props!: Props;
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught temporal paradox / error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center p-6 relative select-none">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-red-650" />
          <div className="max-w-md w-full border border-red-500/20 bg-zinc-950/80 p-8 rounded-2xl text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-950/40 flex items-center justify-center border border-red-500/30 animate-pulse">
              <AlertOctagon className="text-red-500" size={24} />
            </div>

            <div className="space-y-2">
              <span className="font-mono text-[9px] font-black uppercase text-red-500 tracking-widest block bg-red-950/30 py-1 rounded border border-red-950/40">
                TEMPORAL PARADOX DETECTED
              </span>
              <h1 className="font-display text-2xl font-black text-zinc-100 tracking-tight uppercase">
                Chronos Alignment Broken
              </h1>
              <p className="font-sans text-xs text-zinc-450 leading-relaxed">
                A rendering divergence in the space-time manifold has occurred. Let us reset the temporal anchor or retry alignment.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 bg-black/80 border border-zinc-900 rounded-lg text-left font-mono text-[10px] text-red-400 overflow-x-auto select-all">
                <span className="font-bold uppercase text-zinc-600 block mb-1 text-[8px]">[DIVERGENCE LOG]</span>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 font-mono font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wide cursor-pointer transition-all hover:border-zinc-750"
            >
              Reset Temporal Coordinates
            </button>
          </div>
        </div>
      );
    }

    return (this.props as any).children;
  }
}
