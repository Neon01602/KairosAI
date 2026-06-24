import { useState } from "react";
import { Link, Clipboard, Check, ShieldAlert, CheckCircle, ExternalLink, Plus, Sparkles, RefreshCw } from "lucide-react";
import { Blocker, Task } from "../types";

interface BlockerBoardProps {
  blockers: Blocker[];
  tasks: Task[];
  onResolveBlocker: (blockerId: string) => void;
  onReportBlocker: (taskId: string, blockedOnName: string, reason: string, draftedMessage: string) => void;
}

export default function BlockerBoard({ blockers, tasks, onResolveBlocker, onReportBlocker }: BlockerBoardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Manual blocker report form state — the user decides the task, who it's
  // blocked on, and why. AI is only used, on demand, to draft the message text.
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportTaskId, setReportTaskId] = useState("");
  const [reportBlockedOnName, setReportBlockedOnName] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportDraftedMessage, setReportDraftedMessage] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);

  // Tasks not already linked to an unresolved blocker
  const blockableTasks = tasks.filter(
    t => !blockers.some(b => !b.resolved && b.taskTitle === t.title) && t.status !== "completed"
  );

  const handleDraftMessage = async () => {
    const task = tasks.find(t => t.id === reportTaskId);
    if (!task || !reportBlockedOnName.trim() || !reportReason.trim()) return;
    setIsDrafting(true);
    try {
      const res = await fetch("/api/draft-unblock-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: task.title,
          blockedOnName: reportBlockedOnName.trim(),
          reason: reportReason.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.draftedMessage) {
        setReportDraftedMessage(data.draftedMessage);
      }
    } catch (err) {
      console.error("Failed to draft unblock message:", err);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSubmitReport = () => {
    if (!reportTaskId || !reportBlockedOnName.trim() || !reportReason.trim()) return;
    const finalMessage = reportDraftedMessage.trim() || `Hi ${reportBlockedOnName}, following up on this — ${reportReason}`;
    onReportBlocker(reportTaskId, reportBlockedOnName.trim(), reportReason.trim(), finalMessage);
    setReportTaskId("");
    setReportBlockedOnName("");
    setReportReason("");
    setReportDraftedMessage("");
    setShowReportForm(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const activeBlockers = blockers.filter(b => !b.resolved);
  const resolvedBlockers = blockers.filter(b => b.resolved);

  return (
    <div id="blocker-board-canvas" className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
        <div>
          <h2 className="font-display text-3xl font-black tracking-tighter uppercase text-white flex items-center gap-2">
            Blocker Board
          </h2>
          <p className="text-sm font-mono text-zinc-400 mt-1">
            "We wait for no one. Purge the gates, unblock the flow."
          </p>
        </div>
        <div className="flex gap-4 text-xs font-mono">
          <div className="bg-limeaccent/5 border border-limeaccent/20 px-3 py-1.5 rounded-md flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-limeaccent animate-pulse" />
            <span className="text-zinc-300 font-bold">{activeBlockers.length} Active Barriers</span>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-md flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-zinc-600" />
            <span className="text-zinc-500 font-bold">{resolvedBlockers.length} Disarmed</span>
          </div>
        </div>
      </div>

      {/* Manual blocker report trigger / form */}
      <div className="border border-zinc-900 bg-zinc-950/60 rounded-xl p-5">
        {!showReportForm ? (
          <button
            onClick={() => setShowReportForm(true)}
            disabled={blockableTasks.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-limeaccent font-mono text-xs font-bold py-2.5 rounded-lg transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>{blockableTasks.length === 0 ? "No open tasks available to report" : "Report a Blocker"}</span>
          </button>
        ) : (
          <div className="space-y-3">
            <h4 className="font-display text-sm font-black uppercase tracking-tight text-white">Report a Blocker</h4>
            <p className="text-[10px] font-mono text-zinc-500">
              You decide the task, who it's blocked on, and why. AI only drafts the follow-up message below.
            </p>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] text-zinc-500 font-bold uppercase">Which task is blocked?</label>
              <select
                value={reportTaskId}
                onChange={(e) => setReportTaskId(e.target.value)}
                className="bg-black border border-zinc-850 hover:border-zinc-700 p-2.5 rounded-lg text-xs font-mono text-zinc-200 outline-none cursor-pointer w-full"
              >
                <option value="">-- Choose Task --</option>
                {blockableTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] text-zinc-500 font-bold uppercase">Blocked on (person/entity)</label>
              <input
                type="text"
                placeholder="e.g., Sarah, Dev Team, Client"
                value={reportBlockedOnName}
                onChange={(e) => setReportBlockedOnName(e.target.value)}
                className="bg-black border border-zinc-850 hover:border-zinc-700 p-2.5 rounded-lg text-xs font-mono text-zinc-100 outline-none w-full"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] text-zinc-500 font-bold uppercase">Reason</label>
              <textarea
                rows={2}
                placeholder="Why is this task stuck?"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="bg-black border border-zinc-850 hover:border-zinc-700 p-2.5 rounded-lg text-xs font-mono text-zinc-100 outline-none w-full resize-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[9px] text-zinc-500 font-bold uppercase">Follow-up message</label>
                <button
                  onClick={handleDraftMessage}
                  disabled={isDrafting || !reportTaskId || !reportBlockedOnName.trim() || !reportReason.trim()}
                  className="text-[9px] font-mono font-bold text-limeaccent bg-limeaccent/10 hover:bg-limeaccent/20 border border-limeaccent/20 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-all uppercase disabled:opacity-40"
                >
                  {isDrafting ? <RefreshCw className="animate-spin" size={10} /> : <Sparkles size={10} />}
                  <span>{isDrafting ? "Drafting..." : "Draft with AI"}</span>
                </button>
              </div>
              <textarea
                rows={3}
                placeholder="Write your own, or let AI draft it from the fields above."
                value={reportDraftedMessage}
                onChange={(e) => setReportDraftedMessage(e.target.value)}
                className="bg-black border border-zinc-850 hover:border-zinc-700 p-2.5 rounded-lg text-xs font-mono text-zinc-100 outline-none w-full resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowReportForm(false)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 font-mono text-xs font-bold py-2 rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={!reportTaskId || !reportBlockedOnName.trim() || !reportReason.trim()}
                className="flex-1 bg-limeaccent hover:bg-limeaccent-hover disabled:opacity-40 text-black font-display text-xs font-black uppercase py-2 rounded-lg transition-all cursor-pointer"
              >
                Save Blocker
              </button>
            </div>
          </div>
        )}
      </div>

      {activeBlockers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-zinc-800 rounded-xl bg-zinc-950/20 text-center">
          <CheckCircle className="text-limeaccent/40 mb-3" size={32} />
          <h3 className="font-display font-black tracking-tight uppercase text-zinc-350">Absolute Clearance</h3>
          <p className="text-xs font-mono text-zinc-500 mt-1 max-w-sm">
            All paths are open. No active blockade blocks your momentum. Report a blocker above if something is stuck.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeBlockers.map((blocker) => (
            <div
              key={blocker.id}
              className="p-5 rounded-xl border border-zinc-850 bg-zinc-950 hover:border-zinc-700 transition-all shadow-inner relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-md">
                    <ShieldAlert className="text-limeaccent" size={18} />
                  </div>
                  <div className="flex-1">
                    <span className="font-mono text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded tracking-wide uppercase">
                      DEPENDENCY ON {blocker.blockedOnName.toUpperCase()}
                    </span>
                    <h4 className="font-display text-lg font-black tracking-tight uppercase text-white mt-1">
                      {blocker.taskTitle}
                    </h4>
                  </div>
                </div>

                <div className="bg-black/40 border border-zinc-900 rounded p-3 mb-4 text-xs font-mono leading-relaxed text-zinc-400">
                  <span className="text-limeaccent font-bold block mb-1">BARRIER CLAUSE:</span>
                  {blocker.reason}
                </div>

                <div className="relative border border-zinc-90 w-full rounded-lg p-3.5 bg-zinc-900/40 font-mono text-xs text-zinc-300 mb-4 h-36 overflow-y-auto">
                  <span className="absolute top-1.5 right-2 text-[8px] text-zinc-500 font-bold tracking-widest">
                    AI DRAFTED UNBLOCK SIGNAL
                  </span>
                  <p className="italic leading-relaxed whitespace-pre-line select-all pr-4">
                    {blocker.draftedMessage}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end border-t border-zinc-900 pt-4">
                <button
                  onClick={() => copyToClipboard(blocker.draftedMessage, blocker.id)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-100 font-mono text-xs font-semibold py-2 px-3 rounded-md transition-all cursor-pointer"
                >
                  {copiedId === blocker.id ? (
                    <>
                      <Check size={14} className="text-limeaccent" />
                      <span className="text-limeaccent font-bold">Unblock Code Copied!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard size={14} className="text-limeaccent" />
                      <span>Copy Draft Message</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onResolveBlocker(blocker.id)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-limeaccent hover:bg-limeaccent-hover text-black font-black font-display text-xs py-2 px-3 rounded-md transition-all cursor-pointer"
                >
                  <span>Resolve Node</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolvedBlockers.length > 0 && (
        <div id="resolved-blockers-drawer" className="pt-6 border-t border-zinc-900">
          <h3 className="font-serif text-lg font-bold text-zinc-500 mb-4">
            Disarmed Barriers ({resolvedBlockers.length})
          </h3>
          <div className="space-y-2">
            {resolvedBlockers.map((blocker) => (
              <div
                key={blocker.id}
                className="flex items-center justify-between p-3.5 border border-zinc-900 bg-zinc-950/20 rounded-lg text-xs font-mono text-zinc-500"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>
                    Unblocked: <strong className="text-zinc-400">{blocker.taskTitle}</strong> waiting on <strong className="text-zinc-400">{blocker.blockedOnName}</strong>
                  </span>
                </div>
                <div className="text-[10px] text-zinc-600">
                  Cleared: {new Date(blocker.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}