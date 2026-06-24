import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Check } from "lucide-react";
import { Task } from "../types";

interface TaskCalendarProps {
  tasks: Task[];
  selectedDateString: string | null; // formatted as "YYYY-MM-DD"
  onSelectDate: (dateString: string | null) => void;
}

export default function TaskCalendar({ tasks, selectedDateString, onSelectDate }: TaskCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Helper arrays
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  // Get days in current month
  const firstDay = new Date(year, month, 1);
  // Get day of week for the 1st day (0 = Sunday, 1 = Monday, etc.)
  const rawStartDay = firstDay.getDay();
  const startDayIndex = rawStartDay === 0 ? 6 : rawStartDay - 1;

  const totalDays = new Date(year, month + 1, 0).getDate();

  // Tasks mapped by date string "YYYY-MM-DD"
  const getTasksForDate = (dateNum: number): Task[] => {
    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dateNum).padStart(2, "0")}`;
    return tasks.filter(task => {
      const tDate = new Date(task.deadline).toISOString().slice(0, 10);
      return tDate === dStr;
    });
  };

  const handleDayClick = (dateNum: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dateNum).padStart(2, "0")}`;
    if (selectedDateString === dStr) {
      onSelectDate(null); // toggle off
    } else {
      onSelectDate(dStr);
    }
  };

  // Render month cells
  const cells = [];
  // Fills from previous month
  for (let i = 0; i < startDayIndex; i++) {
    cells.push(<div key={`prev-${i}`} className="h-16 md:h-20 bg-black/40 border border-white/5 opacity-20" />);
  }

  // Active month days
  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    const dayTasks = getTasksForDate(dayNum);
    const isSelected = selectedDateString === dStr;
    const isToday = new Date().toDateString() === new Date(year, month, dayNum).toDateString();

    cells.push(
      <button
        key={`day-${dayNum}`}
        onClick={() => handleDayClick(dayNum)}
        className={`h-16 md:h-20 p-1.5 border font-mono text-left relative flex flex-col justify-between transition-all select-none cursor-pointer ${
          isSelected 
            ? "bg-[#5227FF]/30 border-[#5227FF] text-white shadow-[0_0_15px_rgba(82,39,255,0.25)]" 
            : isToday 
            ? "bg-[#5227FF]/15 border-purple-500/40 text-[#5227FF] font-black" 
            : "bg-black/95 border-white/5 text-white hover:bg-[#5227FF]/10 hover:border-white/20"
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className={`text-[11px] leading-none ${isToday ? "text-[#5227FF] underline underline-offset-2" : ""}`}>
            {dayNum}
          </span>
          {isSelected && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          )}
        </div>

        {/* Task lists indicator within cell */}
        <div className="mt-1 space-y-1 w-full overflow-hidden flex-1 shrink-0 flex flex-col justify-end">
          {dayTasks.length > 0 && (
            <div className="hidden sm:block space-y-0.5 max-h-[44px] overflow-hidden">
              {dayTasks.slice(0, 2).map(task => {
                const isCompleted = task.status === "completed";
                const isMissed = task.status === "missed";
                const isFinished = isCompleted || isMissed;
                let styleClasses = "bg-purple-950/40 border-purple-800/40 text-purple-100";
                
                if (isCompleted) {
                  styleClasses = "bg-zinc-950 border-white/5 text-white/30 line-through decoration-white/20";
                } else if (isMissed) {
                  styleClasses = "bg-red-950/30 border-red-900/20 text-red-400/50 line-through decoration-red-500/20";
                }

                return (
                  <div
                    key={task.id}
                    className={`text-[8px] px-1 py-0.5 rounded truncate tracking-normal font-sans border flex items-center gap-0.5 ${styleClasses}`}
                  >
                    {isCompleted && <Check size={7} className="text-white opacity-60 shrink-0" />}
                    {isMissed && <span className="text-[7px] text-red-500 font-bold shrink-0">✕</span>}
                    <span>{task.title}</span>
                  </div>
                );
              })}
              {dayTasks.length > 2 && (
                <div className="text-[7px] text-white/60 font-semibold tracking-wider font-mono pl-1">
                  +{dayTasks.length - 2} NODES
                </div>
              )}
            </div>
          )}

          {/* Mobile tiny dot indicators */}
          {dayTasks.length > 0 && (
            <div className="flex sm:hidden items-center gap-0.5 h-1">
              {dayTasks.map(t => {
                let dotColor = t.status === "completed" 
                  ? "bg-white/30" 
                  : t.status === "missed"
                  ? "bg-red-550/40"
                  : "bg-purple-500 animate-pulse";
                return (
                  <span
                    key={t.id}
                    className={`w-1 h-1 rounded-full ${dotColor}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </button>
    );
  }

  // Fills for next month
  const totalCells = cells.length;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 0; i < remainingCells; i++) {
    cells.push(<div key={`next-${i}`} className="h-16 md:h-20 bg-black/40 border border-white/5 opacity-20" />);
  }

  // Summary stats for active month
  const monthlyTasks = tasks.filter(task => {
    const mDate = new Date(task.deadline);
    return mDate.getFullYear() === year && mDate.getMonth() === month;
  });
  const completedMonthly = monthlyTasks.filter(t => t.status === "completed").length;

  return (
    <div id="chrono-calendar-component" className="p-5 rounded-xl border border-white/10 bg-black shadow-2xl relative overflow-hidden">
      {/* Subtle purple gradient background bloom */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#5227FF]/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#5227FF]/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-white/10 pb-3 relative z-10">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-white" />
          <h4 className="font-display text-sm font-black uppercase tracking-tight text-white">
            Chronos Calendar alignment
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1 border border-white/10 hover:border-white/20 bg-black rounded text-white hover:bg-zinc-900 transition-all cursor-pointer"
          >
            <ChevronLeft size={12} />
          </button>
          <span className="font-mono text-[11px] font-bold text-white min-w-28 text-center bg-black border border-white/10 py-1 px-2.5 rounded">
            {months[month].toUpperCase()} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 border border-white/10 hover:border-white/20 bg-black rounded text-white hover:bg-zinc-900 transition-all cursor-pointer"
          >
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 text-center border-b border-white/5 pb-1.5 mb-1 text-white/70 font-mono text-[9px] font-semibold tracking-wider uppercase relative z-10">
        {weekdays.map(day => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 bg-black/50 p-2.5 rounded-lg border border-white/10 relative z-10">
        {cells}
      </div>

      {/* Mini Legend / Filter Status Info */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 font-mono text-[9.5px] relative z-10 border-t border-white/5 pt-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-white/60">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-purple-950/40 border border-purple-800/40" />
            <span>Active Node</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-zinc-950 border border-white/5 text-[6px] text-white/60 inline-flex items-center justify-center font-sans">✓</span>
            <span>Completed</span>
          </span>
        </div>

        <div className="text-white/80">
          Month Node Weight: <strong className="text-[#5227FF]">{completedMonthly}/{monthlyTasks.length} Done</strong>
        </div>
      </div>

      {selectedDateString && (
        <div className="mt-4 p-3 border border-[#5227FF]/20 bg-[#5227FF]/5 rounded-lg flex items-center justify-between animate-fade-in text-[11px] font-mono relative z-10">
          <div className="flex items-center gap-2 text-white">
            <span className="w-2 h-2 rounded bg-white animate-pulse" />
            <span>Filtering timeline to date bounds: <strong className="text-white font-bold">{selectedDateString}</strong></span>
          </div>
          <button
            onClick={() => onSelectDate(null)}
            className="text-[#5227FF] hover:text-white hover:underline cursor-pointer font-bold"
          >
            [ Clear Date Filter ]
          </button>
        </div>
      )}
    </div>
  );
}
