import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Compass, 
  LayoutDashboard, 
  PlusCircle, 
  ShieldAlert, 
  Flame, 
  HelpCircle, 
  CheckCircle, 
  Activity, 
  Clock, 
  User, 
  RefreshCw, 
  Plus, 
  ArrowRight, 
  Calendar, 
  Lock, 
  AlertCircle, 
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  Check,
  LogOut,
  Moon,
  Sun,
  ChevronUp,
  ChevronDown,
  Mic,
  Volume2
} from "lucide-react";
import { Task, SubTask, Blocker, Autopsy, MoodState, TimeDebtState } from "./types";
import TimeDebtMeter from "./components/TimeDebtMeter";
import MoodSelector from "./components/MoodSelector";
import BlockerBoard from "./components/BlockerBoard";
import SprintMode from "./components/SprintMode";
import InsightsPanel from "./components/InsightsPanel";
import TaskCalendar from "./components/TaskCalendar";
import HabitTracker from "./components/HabitTracker";
import Onboarding from "./components/Onboarding";
import CardSwap, { Card } from "./components/CardSwap";
import Carousel from "./components/Carousel";
import StaggeredMenu from "./components/StaggeredMenu";
import CommitmentScroll from "./components/CommitmentScroll";
import VoiceActionConfirmation from "./components/VoiceActionConfirmation";
import Lightfall from "./components/Lightfall";
import { firebaseService, getActiveUserId, setActiveUserId } from "./lib/firebaseService";
import { slotSubtasksInWindow } from "./lib/timeSlotter";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser, GoogleAuthProvider, signInAnonymously } from "firebase/auth";

// --- INITIAL SEED DATA FOR TRIAL ---
const getInitialTasks = (): Task[] => {
  return [];
};

const getInitialBlockers = (): Blocker[] => {
  return [];
};

export default function App() {
  // Navigation tabs: 'landing', 'dashboard', 'planner', 'blockers', 'insights'
  const [activeTab, setActiveTab] = useState<string>("landing");

  const menuItems = useMemo(() => [
    { label: 'Citadel Dashboard', ariaLabel: 'Go to dashboard', onClick: () => setActiveTab("dashboard") },
    { label: 'Task Intake Unit', ariaLabel: 'Go to planner', onClick: () => setActiveTab("planner") },
    { label: 'Blocker Matrix', ariaLabel: 'Go to blockers', onClick: () => setActiveTab("blockers") },
    { label: 'Insights Terminal', ariaLabel: 'Go to insights', onClick: () => setActiveTab("insights") },
    { label: 'Habits Analytics', ariaLabel: 'Go to habits', onClick: () => setActiveTab("habits") }
  ], []);

  const socialItems = useMemo(() => [
    { label: 'Twitter', link: 'https://twitter.com' },
    { label: 'GitHub', link: 'https://github.com' },
    { label: 'LinkedIn', link: 'https://linkedin.com' }
  ], []);

  // Authentication & Google Calendar state managers
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("kairos_dark_theme") !== "false";
  });

  // Track light/dark mode persistence
  useEffect(() => {
    localStorage.setItem("kairos_dark_theme", String(isDarkMode));
  }, [isDarkMode]);

  // Force redirection to landing page if not logged in (no guest option allowed)
  useEffect(() => {
    if (!user) {
      setActiveTab("landing");
    }
  }, [user]);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && !currentUser.isAnonymous) {
        setUser(currentUser);
        setActiveUserId(currentUser.uid);
        
        // Restore Google access token from localStorage if valid
        try {
          const cachedTokenStr = localStorage.getItem("kairos_gcal_token");
          if (cachedTokenStr) {
            const tokenData = JSON.parse(cachedTokenStr);
            if (tokenData && tokenData.token && tokenData.expiresAt > Date.now()) {
              setAccessToken(tokenData.token);
              fetchGoogleCalendarEvents(tokenData.token).then(evs => setGoogleEvents(evs));
            }
          }
        } catch (e) {
          console.warn("Could not parse cached google token:", e);
        }
        
        // Fetch user data from database and update local state
        setFirebaseLoading(true);
        try {
          const fbTasks = await firebaseService.getTasks();
          const fbBlockers = await firebaseService.getBlockers();
          const fbAutopsies = await firebaseService.getAutopsies();
          setTasks(fbTasks);
          setBlockers(fbBlockers);
          setAutopsies(fbAutopsies);
        } catch (err) {
          console.warn("Error fetching logged-in user data:", err);
        } finally {
          setFirebaseLoading(false);
        }
      } else {
        setUser(null);
        setAccessToken(null);
        setGoogleEvents([]);
        localStorage.removeItem("kairos_gcal_token");
        
        // Sign in anonymously in background strictly for firestore rule validation of request.auth
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("Background anonymous login failed:", err);
        }
      }
    });

    return unsubscribe;
  }, []);

  // Fetch Google Calendar primary events
  const fetchGoogleCalendarEvents = async (token: string) => {
    try {
      const nowISO = new Date().toISOString();
      // Fetch maximum 8 upcoming items
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${nowISO}&maxResults=8&singleEvents=true&orderBy=startTime`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        return data.items || [];
      } else {
        console.error("Google Calendar response error:", res.statusText);
        return [];
      }
    } catch (err) {
      console.error("Failed to fetch Google Calendar events:", err);
      return [];
    }
  };

  // Google Sign-In with popup
  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      
      if (result.user) {
        setUser(result.user);
        setActiveUserId(result.user.uid);
        
        if (token) {
          setAccessToken(token);
          try {
            const tokenData = {
              token,
              expiresAt: Date.now() + 3600 * 1000
            };
            localStorage.setItem("kairos_gcal_token", JSON.stringify(tokenData));
          } catch (e) {
            console.warn("Could not cache google token:", e);
          }
          const events = await fetchGoogleCalendarEvents(token);
          setGoogleEvents(events);
        }
        
        // Store user details in Firestore list with Google UID
        await firebaseService.saveUserCredentials(result.user.uid, {
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL
        });
        
        // Direct state refresh
        const fbTasks = await firebaseService.getTasks();
        const fbBlockers = await firebaseService.getBlockers();
        const fbAutopsies = await firebaseService.getAutopsies();
        setTasks(fbTasks);
        setBlockers(fbBlockers);
        setAutopsies(fbAutopsies);
      }
    } catch (error) {
      console.error("Sign-in with Google failed:", error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setAccessToken(null);
      setGoogleEvents([]);
      setUser(null);
      localStorage.removeItem("kairos_gcal_token");
    } catch (error) {
      console.error("Sign-out failed:", error);
    }
  };

  const handleImportCalendarEvent = async (ev: any) => {
    const start = ev.start?.dateTime || ev.start?.date;
    const end = ev.end?.dateTime || ev.end?.date;
    
    if (!ev.summary) return;
    
    const title = ev.summary;
    const alreadyExists = tasks.some(t => t.title === title || t.id === `gcal-${ev.id}`);
    if (alreadyExists) return;

    const durationMs = end && start ? new Date(end).getTime() - new Date(start).getTime() : 60 * 60 * 1000;
    const durationMinutes = Math.max(15, Math.round(durationMs / (60 * 1000)));
    const estimatedHours = Math.round((durationMinutes / 60) * 100) / 100;
    
    const newTask: Task = {
      id: `gcal-${ev.id || Date.now()}`,
      title: title,
      description: ev.description || `Imported Google Calendar Event: ${title}`,
      deadline: end ? new Date(end).toISOString() : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      windowStart: start ? new Date(start).toISOString() : new Date().toISOString(),
      windowEnd: end ? new Date(end).toISOString() : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      estimatedHours: estimatedHours,
      timeSpentHours: 0,
      status: "pending",
      priority: "medium",
      procrastinationCount: 0,
      createdAt: new Date().toISOString(),
      subtasks: [
        {
          id: `sub-gcal-${Date.now()}`,
          title: "Complete calendar objective",
          durationMinutes: durationMinutes,
          completed: false,
          order: 1
        }
      ]
    };

    setTasks(prev => [newTask, ...prev]);
    await firebaseService.saveTask(newTask).catch(console.error);
  };

  const handleSyncAllGCalToTasks = async () => {
    if (googleEvents.length === 0) return;
    const updatedTasks = [...tasks];
    let importedAny = false;
    
    for (const ev of googleEvents) {
      const title = ev.summary || "Workspace Block";
      const start = ev.start?.dateTime || ev.start?.date;
      const end = ev.end?.dateTime || ev.end?.date;
      const id = `gcal-${ev.id || Math.random().toString(36).substring(7)}`;
      
      const alreadyExists = tasks.some(t => t.title === title || t.id === id);
      if (!alreadyExists) {
        const durationMs = end && start ? new Date(end).getTime() - new Date(start).getTime() : 60 * 60 * 1000;
        const durationMinutes = Math.max(15, Math.round(durationMs / (60 * 1000)));
        const estimatedHours = Math.round((durationMinutes / 60) * 100) / 100;

        const newTask: Task = {
          id: id,
          title: title,
          description: ev.description || `Imported Google Calendar Event: ${title}`,
          deadline: end ? new Date(end).toISOString() : new Date(Date.now() + 60 * 60 * 1005).toISOString(),
          windowStart: start ? new Date(start).toISOString() : new Date().toISOString(),
          windowEnd: end ? new Date(end).toISOString() : new Date(Date.now() + 60 * 60 * 1005).toISOString(),
          estimatedHours: estimatedHours,
          timeSpentHours: 0,
          status: "pending",
          priority: "medium",
          procrastinationCount: 0,
          createdAt: new Date().toISOString(),
          subtasks: [
            {
              id: `sub-gcal-${Date.now()}-${Math.random().toString(36).substring(4, 7)}`,
              title: "Complete calendar objective",
              durationMinutes: durationMinutes,
              completed: false,
              order: 1
            }
          ]
        };
        updatedTasks.unshift(newTask);
        await firebaseService.saveTask(newTask).catch(console.error);
        importedAny = true;
      }
    }
    
    if (importedAny) {
      setTasks(updatedTasks);
    }
  };

  // Task builder additions
  const [syncToGCal, setSyncToGCal] = useState<boolean>(true);

  // State managers with LocalStorage recovery and Firebase hydration
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("kairos_tasks");
    return saved ? JSON.parse(saved) : getInitialTasks();
  });

  const [blockers, setBlockers] = useState<Blocker[]>(() => {
    const saved = localStorage.getItem("kairos_blockers");
    return saved ? JSON.parse(saved) : getInitialBlockers();
  });

  const [autopsies, setAutopsies] = useState<Autopsy[]>(() => {
    const saved = localStorage.getItem("kairos_autopsies");
    return saved ? JSON.parse(saved) : [];
  });

  const [firebaseLoading, setFirebaseLoading] = useState<boolean>(true);

  // Toast notification state manager
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: "info" | "warning" | "success" }>>([]);

  const triggerToast = (message: string, type: "info" | "warning" | "success" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  // Date bounds calendar filter (USP: Viewing work datewise)
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Cognitive switch penalty state (USP: Context switch manual reordering cost)
  const [contextSwitchDebtMinutes, setContextSwitchDebtMinutes] = useState<number>(() => {
    const saved = localStorage.getItem("kairos_context_switch_debt");
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem("kairos_context_switch_debt", contextSwitchDebtMinutes.toString());
  }, [contextSwitchDebtMinutes]);

  // Manual Task Builder state — the user decides WHAT and WHEN; nothing here is AI-generated.
  const [builderTitle, setBuilderTitle] = useState<string>("");
  const [builderDescription, setBuilderDescription] = useState<string>("");
  const [builderPriority, setBuilderPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [builderWindowStart, setBuilderWindowStart] = useState<string>("");
  const [builderWindowEnd, setBuilderWindowEnd] = useState<string>("");
  const [builderSubtaskDraft, setBuilderSubtaskDraft] = useState<{ title: string; durationMinutes: string }>({
    title: "",
    durationMinutes: ""
  });
  const [builderSubtasks, setBuilderSubtasks] = useState<SubTask[]>([]);
  const [builderCategory, setBuilderCategory] = useState<'interview_prep' | 'bill' | 'habit_study' | 'others'>("others");
  const [slotPreview, setSlotPreview] = useState<ReturnType<typeof slotSubtasksInWindow> | null>(null);

  // Gemini Voice-Intake capture states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>("");
  const [voiceIsProcessing, setVoiceIsProcessing] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Guided first-time user onboarding state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return localStorage.getItem("kairos_onboarded") !== "true";
  });

  // Active Commitment Covenant Scroll overlay state
  const [activeCommitmentDeed, setActiveCommitmentDeed] = useState<{
    taskId: string;
    taskTitle: string;
    autopsyAnalysis: string;
    commitmentContract: string;
  } | null>(null);

  // Multi-agent Voice Synthesis Stage confirmation state
  const [voiceSynthesisStageResult, setVoiceSynthesisStageResult] = useState<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "critical";
    estimatedHours: number;
    subtasks: { title: string; durationMinutes: number }[];
  } | null>(null);

  // Active Emergency Sprint overlay state
  const [activeSprintTaskId, setActiveSprintTaskId] = useState<string | null>(null);

  // --- Task 2/3 Time Window Notification & Alert States ---
  const [notifiedTwoThirds, setNotifiedTwoThirds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("kairos_notified_twothirds");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notificationLogs, setNotificationLogs] = useState<{
    id: string;
    taskId: string;
    taskTitle: string;
    time: string;
    status: 'sent' | 'failed' | 'simulated';
    details?: string;
  }[]>(() => {
    try {
      const saved = localStorage.getItem("kairos_notification_logs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeInAppAlert, setActiveInAppAlert] = useState<Task | null>(null);

  const addNotificationLog = (log: { taskId: string; taskTitle: string; status: 'sent' | 'failed' | 'simulated'; details?: string }) => {
    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(4, 7)}`,
      taskId: log.taskId,
      taskTitle: log.taskTitle,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: log.status,
      details: log.details
    };
    setNotificationLogs(prev => {
      const next = [newLog, ...prev].slice(0, 50);
      localStorage.setItem("kairos_notification_logs", JSON.stringify(next));
      return next;
    });
  };

  const markTwoThirdsNotified = (taskId: string) => {
    setNotifiedTwoThirds(prev => {
      const next = prev.includes(taskId) ? prev : [...prev, taskId];
      localStorage.setItem("kairos_notified_twothirds", JSON.stringify(next));
      return next;
    });
  };

  const triggerTwoThirdsNotification = async (task: Task) => {
    if (notifiedTwoThirds.includes(task.id)) return;
    markTwoThirdsNotified(task.id);

    if (accessToken) {
      try {
        const startISO = new Date().toISOString();
        const endISO = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        
        const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            summary: `🚨 [2/3 Window Alert] ${task.title}`,
            description: `Kairos Autonomous Alert:\nTask: ${task.title}\nDescription: ${task.description || "No description provided."}\nStart window: ${task.windowStart}\nEnd window: ${task.windowEnd}\n\nYour task has consumed 2/3 of its available scheduled timeframe. Please expedite completion or perform an autopsy!`,
            start: { dateTime: startISO },
            end: { dateTime: endISO },
            colorId: "11", // Bold red urgent color
            reminders: {
              useDefault: false,
              overrides: [
                { method: "popup", minutes: 0 }
              ]
            }
          })
        });

        if (res.ok) {
          addNotificationLog({
            taskId: task.id,
            taskTitle: task.title,
            status: "sent",
            details: "Urgent 2/3 window alert event pushed to your Google Calendar."
          });
          setActiveInAppAlert(task);
        } else {
          const text = await res.text();
          addNotificationLog({
            taskId: task.id,
            taskTitle: task.title,
            status: "failed",
            details: `GCal API failed (${res.status}): ${text.substring(0, 100)}`
          });
          setActiveInAppAlert(task);
        }
      } catch (err: any) {
        addNotificationLog({
          taskId: task.id,
          taskTitle: task.title,
          status: "failed",
          details: `Error calling GCal API: ${err.message || err}`
        });
        setActiveInAppAlert(task);
      }
    } else {
      addNotificationLog({
        taskId: task.id,
        taskTitle: task.title,
        status: "simulated",
        details: "Google account not connected. Local browser audio-visual alert triggered."
      });
      setActiveInAppAlert(task);
    }
  };

  // Run periodic evaluation scanner for the 2/3 task windows
  useEffect(() => {
    const checkTasksWindowProgress = () => {
      const now = Date.now();
      tasks.forEach(task => {
        if (task.status === "completed" || task.status === "missed") return;
        if (!task.windowStart || !task.windowEnd) return;
        if (notifiedTwoThirds.includes(task.id)) return;

        const start = new Date(task.windowStart).getTime();
        if (isNaN(start)) return;

        let limitEnd = 0;
        const windowEndTime = new Date(task.windowEnd || "").getTime();
        if (!isNaN(windowEndTime)) {
          limitEnd = windowEndTime;
        }

        if (task.deadline) {
          const deadlineTime = new Date(task.deadline).getTime();
          if (!isNaN(deadlineTime)) {
            if (limitEnd === 0 || deadlineTime < limitEnd) {
              limitEnd = deadlineTime;
            }
          }
        }

        if (limitEnd <= start) return;

        const duration = limitEnd - start;
        const elapsed = now - start;
        const progress = (elapsed / duration) * 100;

        if (progress >= 66.67 && progress < 100) {
          triggerTwoThirdsNotification(task);
        }
      });
    };

    checkTasksWindowProgress();

    const interval = setInterval(checkTasksWindowProgress, 15000);
    return () => clearInterval(interval);
  }, [tasks, accessToken, notifiedTwoThirds]);

  // Interactive mock calendar block dates (Section 02 calendar pull)
  const [hoveredCalendarBlock, setHoveredCalendarBlock] = useState<string | null>(null);

  // Sync state changes with database/localStorage
  useEffect(() => {
    localStorage.setItem("kairos_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("kairos_blockers", JSON.stringify(blockers));
  }, [blockers]);

  useEffect(() => {
    localStorage.setItem("kairos_autopsies", JSON.stringify(autopsies));
  }, [autopsies]);

  // --- REAL Procrastination Tracking ---
  // Once per session, after data has loaded, any pending task with zero subtask
  // progress that is more than an hour old gets ONE genuine "opened but not
  // started" timestamp logged for today. This is real behavioral data (not a
  // mock matrix) and is what powers the Procrastination DNA heatmap.
  const hasLoggedProcrastinationRef = useRef(false);
  useEffect(() => {
    if (firebaseLoading || hasLoggedProcrastinationRef.current || tasks.length === 0) return;
    hasLoggedProcrastinationRef.current = true;

    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const nowMs = Date.now();
    let changed = false;

    const updatedTasks = tasks.map(task => {
      const isUntouched = task.subtasks.length === 0 || task.subtasks.every(st => !st.completed);
      const isStale = nowMs - new Date(task.createdAt).getTime() > 60 * 60 * 1000; // > 1 hour old
      const alreadyLoggedToday = (task.openLog || []).some(ts => ts.slice(0, 10) === todayKey);

      if (task.status === "pending" && isUntouched && isStale && !alreadyLoggedToday) {
        changed = true;
        const nowIso = new Date().toISOString();
        const updated: Task = {
          ...task,
          procrastinationCount: task.procrastinationCount + 1,
          openLog: [...(task.openLog || []), nowIso]
        };
        firebaseService.updateTask(updated).catch(console.error);
        return updated;
      }
      return task;
    });

    if (changed) setTasks(updatedTasks);
  }, [firebaseLoading, tasks]);

  // Automatically evaluate tasks that have expired past their window and mark them as "missed"
  useEffect(() => {
    if (firebaseLoading || tasks.length === 0) return;

    const now = new Date();
    let changed = false;

    const updatedTasks = tasks.map(task => {
      if (task.status === "completed" || task.status === "missed") return task;

      // Determine end of time window (windowEnd or deadline)
      const windowEndTime = task.windowEnd ? new Date(task.windowEnd) : new Date(task.deadline);
      
      if (!isNaN(windowEndTime.getTime()) && windowEndTime < now) {
        changed = true;
        const updated: Task = {
          ...task,
          status: "missed"
        };
        firebaseService.updateTask(updated).catch(console.error);
        return updated;
      }
      return task;
    });

    if (changed) {
      setTasks(updatedTasks);
    }
  }, [firebaseLoading, tasks]);

  // Self-calculating Time Debt battery levels
  const timeDebt = useMemo((): TimeDebtState => {
    const now = new Date();
    const missedTasks = tasks.filter(t => t.status === "missed" || (t.status !== "completed" && new Date(t.deadline) < now));
    const tasksHoursDebt = missedTasks.reduce((acc, t) => acc + t.estimatedHours, 0);
    // Include 15m penalty per manual context-switch reordering
    const totalHoursDebt = tasksHoursDebt + (contextSwitchDebtMinutes / 60);

    let rating: 'immaculate' | 'negligible' | 'concerning' | 'catastrophic' = 'immaculate';
    let warningMessage = "Temporal alignment secure. No overdue tasks block your momentum.";

    if (totalHoursDebt > 0 && totalHoursDebt <= 2.5) {
      rating = 'negligible';
      warningMessage = "Minor disruption felt. Check off short tasks before decay sinks deep.";
    } else if (totalHoursDebt > 2.5 && totalHoursDebt <= 6) {
      rating = 'concerning';
      warningMessage = `The scythe is sharpening. You are ${totalHoursDebt.toFixed(1)} hours behind schedule. Shift priorities immediately.`;
    } else if (totalHoursDebt > 6) {
      rating = 'catastrophic';
      warningMessage = `TEMPORAL RUPTURE. You have lost ${totalHoursDebt.toFixed(1)} critical hours of focus. Activate 10-Minute Save mode to rescue your day!`;
    }

    if (contextSwitchDebtMinutes > 0) {
      warningMessage += ` (Includes ${contextSwitchDebtMinutes} minutes of Context Switch Penalty from manual reordering.)`;
    }

    return {
      currentDebtHours: totalHoursDebt,
      rating,
      warningMessage
    };
  }, [tasks, contextSwitchDebtMinutes]);

  // Reset database back to default seed coordinates
  const handleResetDB = async () => {
    if (confirm("Are you sure you want to purge all your records and reset your workspace to zero?")) {
      try {
        setFirebaseLoading(true);
        await firebaseService.clearTasks();
        await firebaseService.clearBlockers();
        await firebaseService.clearAutopsies();
      } catch (err) {
        console.error("Purging cloud database failed:", err);
      } finally {
        setTasks([]);
        setBlockers([]);
        setAutopsies([]);
        setFirebaseLoading(false);
        setActiveTab("dashboard");
      }
    }
  };

  // Check off or expand subtasks
  const handleToggleSubTask = (taskId: string, subtaskId: string) => {
    setTasks(prev => {
      const parentTask = prev.find(t => t.id === taskId);
      if (!parentTask) return prev;
      
      if (parentTask.status === "missed") {
        triggerToast("Locked: This task's scheduled window has expired and it is marked as missed.", "warning");
        return prev;
      }
      
      const updatedSubtasks = parentTask.subtasks.map(st => 
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      );
      const allDone = updatedSubtasks.every(st => st.completed);
      const status = allDone ? "completed" as const : "in_progress" as const;
      
      const updatedTask: Task = {
        ...parentTask,
        subtasks: updatedSubtasks,
        status
      };
      
      firebaseService.updateTask(updatedTask).catch(console.error);

      return prev.map(t => t.id === taskId ? updatedTask : t);
    });
  };

  // Mark direct parent task completed
  const handleToggleTaskStatus = (taskId: string) => {
    setTasks(prev => {
      const parentTask = prev.find(t => t.id === taskId);
      if (!parentTask) return prev;

      if (parentTask.status === "missed") {
        triggerToast("Locked: This task's scheduled window has expired and it is marked as missed.", "warning");
        return prev;
      }

      const isCompleted = parentTask.status === "completed";
      const newStatus = isCompleted ? "in_progress" as const : "completed" as const;
      
      const updatedTask: Task = {
        ...parentTask,
        status: newStatus,
        subtasks: parentTask.subtasks.map(st => ({ ...st, completed: !isCompleted }))
      };

      firebaseService.updateTask(updatedTask).catch(console.error);

      return prev.map(t => t.id === taskId ? updatedTask : t);
    });
  };

  // Manual priority reordering with Context Switch Cost Penalty
  const handleMoveTask = async (taskId: string, direction: 'up' | 'down') => {
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) return;

    const task = tasks[index];
    if (task.status === "missed") {
      triggerToast("Locked: This task is marked as missed and cannot be reordered.", "warning");
      return;
    }

    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === tasks.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...tasks];

    // Swap positions
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    // Apply cognitive context switch debt (USP penalty)
    setContextSwitchDebtMinutes(prev => prev + 15);
    setTasks(reordered);
    triggerToast("⚠️ Context Switch logged: +15 minutes of Cognitive Debt. Reordering tasks manually drains productivity focus.", "warning");

    // Persist list sequence adjustments
    for (const t of reordered) {
      await firebaseService.updateTask(t).catch(console.error);
    }
  };

  // Background deadline alarm notifier (pops toast when task is nearing deadline)
  useEffect(() => {
    if (tasks.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      tasks.forEach(task => {
        if (task.status === "pending" || task.status === "in_progress") {
          const deadlineMs = new Date(task.deadline).getTime();
          const diffMs = deadlineMs - now;

          // Warn when deadline is within 1 hour (3600000ms)
          if (diffMs > 0 && diffMs <= 60 * 60 * 1000) {
            const minutesLeft = Math.round(diffMs / 60000);
            const warningKey = `warned-${task.id}-${minutesLeft <= 15 ? "critical" : "warning"}`;
            
            if (!sessionStorage.getItem(warningKey)) {
              sessionStorage.setItem(warningKey, "true");
              triggerToast(
                `⏰ TEMPORAL PRESSURE: "${task.title}" is reaching its deadline in ${minutesLeft} minutes! Act now before Charon calls.`,
                minutesLeft <= 15 ? "warning" : "info"
              );
            }
          }
        }
      });
    }, 20000); // Check every 20 seconds
    return () => clearInterval(interval);
  }, [tasks]);

  // Add a manually-defined subtask (title + duration) to the in-progress task draft
  const handleAddBuilderSubtask = () => {
    const minutes = parseInt(builderSubtaskDraft.durationMinutes, 10);
    if (!builderSubtaskDraft.title.trim() || !minutes || minutes <= 0) return;
    setBuilderSubtasks(prev => [
      ...prev,
      {
        id: `sub-draft-${Date.now()}`,
        title: builderSubtaskDraft.title.trim(),
        durationMinutes: minutes,
        completed: false,
        order: prev.length + 1
      }
    ]);
    setBuilderSubtaskDraft({ title: "", durationMinutes: "" });
    setSlotPreview(null);
  };

  const handleRemoveBuilderSubtask = (id: string) => {
    setBuilderSubtasks(prev =>
      prev.filter(st => st.id !== id).map((st, idx) => ({ ...st, order: idx + 1 }))
    );
    setSlotPreview(null);
  };

  // Acoustic continuous capture voice alignment handler
  const handleToggleVoiceRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      triggerToast("Voice Alignment capture completed. Press interpret to feed fields.", "success");
    } else {
      setVoiceTranscript("");
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        triggerToast("⚠️ Web Speech API is not supported on this device's browser bounds.", "warning");
        return;
      }

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setVoiceTranscript(final || interim);
      };

      rec.onerror = (err: any) => {
        console.error("Speech parsing error:", err);
        triggerToast("Speech alignment coordinate broken. Adjust microphones.", "warning");
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
      rec.start();
      setIsRecording(true);
      triggerToast("🎙️ Speech capturing active. Describe your priority nodes naturally...", "info");
    }
  };

  // Submits the transcribed text to the cascade Multi-Agent Pipeline on the server
  const handleSendVoiceTranscriptSubmitRaw = async (rawText: string) => {
    if (!rawText.trim()) return;

    setVoiceIsProcessing(true);
    triggerToast("⏳ Orchestrating Multi-Agent Temporal Pipeline...", "info");
    try {
      const res = await fetch("/api/multi-agent-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPrompt: rawText, energy: 5, focus: 5 })
      });
      const data = await res.json();
      
      if (data && !data.error) {
        setVoiceSynthesisStageResult(data);
        triggerToast("🔮 Chronos Alchemist has completed Synthesis! Confirm your node.", "success");
      } else {
        triggerToast("⚠️ Multi-Agent error. Try reviewing text parameters manually.", "warning");
      }
    } catch (err) {
      console.error("Multi-Agent pipeline speech alignment error:", err);
      triggerToast("Failed deciphering speech waves securely.", "warning");
    } finally {
      setVoiceIsProcessing(false);
    }
  };

  const handleSendVoiceTranscript = () => {
    handleSendVoiceTranscriptSubmitRaw(voiceTranscript);
  };

  // The ONLY automated step: take the user's own subtasks and the user's own
  // start/end window, and lay them out into time slots. It never invents tasks,
  // deadlines, priorities, or blockers.
  const handleAutoSlotWindow = () => {
    if (!builderWindowStart || !builderWindowEnd || builderSubtasks.length === 0) return;
    const result = slotSubtasksInWindow(builderSubtasks, builderWindowStart, builderWindowEnd);
    setSlotPreview(result);
  };

  const resetTaskBuilder = () => {
    setBuilderTitle("");
    setBuilderDescription("");
    setBuilderPriority("medium");
    setBuilderWindowStart("");
    setBuilderWindowEnd("");
    setBuilderCategory("others");
    setBuilderSubtaskDraft({ title: "", durationMinutes: "" });
    setBuilderSubtasks([]);
    setSlotPreview(null);
  };

  const formatToDatetimeLocal = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const handleSelectCategoryTemplate = (cat: 'interview_prep' | 'bill' | 'habit_study' | 'others') => {
    setBuilderCategory(cat);
    const now = new Date();
    
    if (cat === "interview_prep") {
      setBuilderTitle("Interview Prep Session");
      setBuilderDescription("Review of systems design patterns, structural algorithms, and mock behavioral feedback loops.");
      setBuilderPriority("high");
      
      const startStr = formatToDatetimeLocal(now);
      const nextFriday = new Date();
      const day = nextFriday.getDay();
      const diff = (day <= 5 ? 5 - day : 12 - day);
      nextFriday.setDate(nextFriday.getDate() + diff);
      nextFriday.setHours(17, 0, 0, 0);
      const endStr = formatToDatetimeLocal(nextFriday);
      
      setBuilderWindowStart(startStr);
      setBuilderWindowEnd(endStr);
      
      setBuilderSubtasks([
        { id: `sub-${Date.now()}-1`, title: "Review Systems Architecture & Load Balancer Patterns", durationMinutes: 60, completed: false, order: 1 },
        { id: `sub-${Date.now()}-2`, title: "Practice Mock Behavioral Answers with STAR Structure", durationMinutes: 45, completed: false, order: 2 },
        { id: `sub-${Date.now()}-3`, title: "Execute Visual Canvas Whiteboard Algorithms Practice", durationMinutes: 60, completed: false, order: 3 },
      ]);
      setSlotPreview(null);
    } else if (cat === "bill") {
      setBuilderTitle("Audit & Pay Monthly Liabilities");
      setBuilderDescription("Identify recurring cloud service liabilities, credit invoices, and process pending utility payments.");
      setBuilderPriority("medium");
      
      const startStr = formatToDatetimeLocal(now);
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0); // Last day of current month
      endOfMonth.setHours(17, 0, 0, 0);
      const endStr = formatToDatetimeLocal(endOfMonth);
      
      setBuilderWindowStart(startStr);
      setBuilderWindowEnd(endStr);
      
      setBuilderSubtasks([
        { id: `sub-${Date.now()}-1`, title: "Download cloud server ledger & monthly billing invoices", durationMinutes: 15, completed: false, order: 1 },
        { id: `sub-${Date.now()}-2`, title: "Execute monthly wire transfers & payment settlements", durationMinutes: 15, completed: false, order: 2 },
        { id: `sub-${Date.now()}-3`, title: "Update temporal liability audit sheet & reconcile", durationMinutes: 20, completed: false, order: 3 },
      ]);
      setSlotPreview(null);
    } else if (cat === "habit_study") {
      setBuilderTitle("Habit Study: Deep Skill Mastery");
      setBuilderDescription("Decompose textbook chapters, review active flashcards, and run code-block execution practices.");
      setBuilderPriority("medium");
      
      const startStr = formatToDatetimeLocal(now);
      const tomorrowNight = new Date();
      tomorrowNight.setDate(tomorrowNight.getDate() + 1);
      tomorrowNight.setHours(22, 0, 0, 0);
      const endStr = formatToDatetimeLocal(tomorrowNight);
      
      setBuilderWindowStart(startStr);
      setBuilderWindowEnd(endStr);
      
      setBuilderSubtasks([
        { id: `sub-${Date.now()}-1`, title: "Review active learning materials & digest textbook chapters", durationMinutes: 30, completed: false, order: 1 },
        { id: `sub-${Date.now()}-2`, title: "Implement hands-on code examples & mock exercises", durationMinutes: 45, completed: false, order: 2 },
      ]);
      setSlotPreview(null);
    } else {
      setBuilderTitle("");
      setBuilderDescription("");
      setBuilderPriority("medium");
      setBuilderWindowStart("");
      setBuilderWindowEnd("");
      setBuilderSubtasks([]);
      setSlotPreview(null);
    }
  };

  const handleConfirmVoiceTask = async (finalData: {
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "critical";
    subtasks: SubTask[];
    windowStart: string;
    windowEnd: string;
  }) => {
    const totalMinutes = finalData.subtasks.reduce((sum, st) => sum + st.durationMinutes, 0);
    const estimatedHours = Number((totalMinutes / 60).toFixed(2));

    const newTask: Task = {
      id: `voice-task-${Date.now()}`,
      title: finalData.title,
      description: finalData.description,
      deadline: finalData.windowEnd,
      windowStart: finalData.windowStart,
      windowEnd: finalData.windowEnd,
      estimatedHours,
      timeSpentHours: 0,
      status: "pending",
      priority: finalData.priority,
      procrastinationCount: 0,
      createdAt: new Date().toISOString(),
      subtasks: finalData.subtasks
    };

    setTasks(prev => [newTask, ...prev]);
    setVoiceSynthesisStageResult(null);

    try {
      await firebaseService.saveTask(newTask);
      triggerToast(`✨ Spoken task node "${finalData.title}" committed to your temporal timeline!`, "success");

      // Sync voice task to Google Calendar if token is present
      if (accessToken) {
        const startISO = new Date(finalData.windowStart).toISOString();
        const endISO = new Date(finalData.windowEnd).toISOString();
        fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            summary: `🎙️ ${finalData.title.trim()}`,
            description: finalData.description?.trim() || "Scheduled via Spoken Voice Intake",
            start: { dateTime: startISO },
            end: { dateTime: endISO },
            reminders: {
              useDefault: false,
              overrides: [
                { method: "popup", minutes: 15 },
                { method: "email", minutes: 15 },
                { method: "popup", minutes: 30 },
                { method: "email", minutes: 30 }
              ]
            }
          })
        })
        .then(res => {
          if (res.ok) {
            fetchGoogleCalendarEvents(accessToken).then(evs => setGoogleEvents(evs));
            triggerToast("🗓️ Voice task synced to Google Calendar with reminders!", "success");
          }
        })
        .catch(err => console.error("Post voice task calendar event failed:", err));
      }
    } catch (err) {
      console.error("Save voice task failed:", err);
      triggerToast("Failed writing task to server.", "warning");
    }
  };

  // Commit the fully manually-defined task (with AI-slotted subtask times) to state
  const handleCreateTask = () => {
    if (!builderTitle.trim() || !builderWindowStart || !builderWindowEnd) return;

    const finalSubtasks = slotPreview ? slotPreview.subtasks : builderSubtasks;
    const estimatedHours =
      finalSubtasks.reduce((sum, st) => sum + st.durationMinutes, 0) / 60 || 0;

    const taskId = `task-${Date.now()}`;
    const formattedTask: Task = {
      id: taskId,
      title: builderTitle.trim(),
      description: builderDescription.trim() || undefined,
      deadline: builderWindowEnd,
      windowStart: builderWindowStart,
      windowEnd: builderWindowEnd,
      estimatedHours: Math.round(estimatedHours * 100) / 100,
      timeSpentHours: 0,
      status: "pending",
      priority: builderPriority,
      procrastinationCount: 0,
      createdAt: new Date().toISOString(),
      subtasks: finalSubtasks.map((st, idx) => ({ ...st, order: idx + 1 })),
      category: builderCategory
    };

    setTasks(prev => [formattedTask, ...prev]);
    firebaseService.saveTask(formattedTask).catch(console.error);

    // Sync to Google Calendar primary blocks if toggled and user is certified
    if (syncToGCal && accessToken) {
      const startISO = new Date(builderWindowStart).toISOString();
      const endISO = new Date(builderWindowEnd).toISOString();
      fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          summary: `🎯 ${builderTitle.trim()}`,
          description: builderDescription.trim() || "Scheduled via KAIROS Time-Rebel Planner",
          start: { dateTime: startISO },
          end: { dateTime: endISO },
          reminders: {
            useDefault: false,
            overrides: [
              { method: "popup", minutes: 15 },
              { method: "email", minutes: 15 },
              { method: "popup", minutes: 30 },
              { method: "email", minutes: 30 }
            ]
          }
        })
      })
      .then(res => {
        if (res.ok) {
          // Instantly refresh Google calendar events view list
          fetchGoogleCalendarEvents(accessToken).then(evs => setGoogleEvents(evs));
          triggerToast("🗓️ Task synced to Google Calendar with reminders!", "success");
        }
      })
      .catch(err => console.error("Post calendar block event failed:", err));
    }

    resetTaskBuilder();
    setActiveTab("dashboard");
  };

  // Perform Autopsy Agent Call
  const handlePerformAutopsyAPI = async (taskId: string, explanation: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error("Task target deceased.");

    const response = await fetch("/api/autopsy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskTitle: task.title, userExplanation: explanation })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to process post-mortem autopsy.");
    }

    // Append completed autopsy to store
    const newAutopsy: Autopsy = {
      id: `autopsy-${Date.now()}`,
      taskTitle: task.title,
      deadline: task.deadline,
      failureReason: explanation,
      actionableCommitment: data.actionableCommitment,
      createdAt: new Date().toISOString()
    };

    setAutopsies(prev => [newAutopsy, ...prev]);
    firebaseService.saveAutopsy(newAutopsy).catch(console.error);

    // Trigger the Commitment Scroll Overlay
    setActiveCommitmentDeed({
      taskId,
      taskTitle: task.title,
      autopsyAnalysis: data.failureReasonAnalysis,
      commitmentContract: data.actionableCommitment
    });

    return {
      analysis: data.failureReasonAnalysis,
      commitment: data.actionableCommitment
    };
  };

  // Mood checks & Scheduling adjustments (re-prioritizing tasks)
  const handleOnMoodAligned = (mood: MoodState, recommendedTaskIds: string[]) => {
    if (recommendedTaskIds.length === 0) return;
    
    // Sort tasks so that the recommended task IDs float to the top
    setTasks(prev => {
      const sorted = [...prev];
      sorted.sort((a, b) => {
        const aIndex = recommendedTaskIds.indexOf(a.id);
        const bIndex = recommendedTaskIds.indexOf(b.id);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return 0;
      });
      return sorted;
    });
  };

  // Clear Autopsy Scroll Archive history
  const handleClearHistory = () => {
    setAutopsies([]);
    firebaseService.clearAutopsies().catch(console.error);
  };

  // Manually report a blocker against an existing task. The user supplies the
  // task, who it's blocked on, and why; the AI is only ever used (separately,
  // on demand) to draft the follow-up message text for it.
  const handleReportBlocker = (taskId: string, blockedOnName: string, reason: string, draftedMessage: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.status === "missed") {
      triggerToast("Locked: Cannot report blockers on a missed task.", "warning");
      return;
    }

    const blockerId = `blocker-${Date.now()}`;
    const newBlocker: Blocker = {
      id: blockerId,
      taskTitle: task.title,
      blockedOnName,
      reason,
      draftedMessage,
      resolved: false,
      createdAt: new Date().toISOString()
    };

    setBlockers(prev => [newBlocker, ...prev]);
    firebaseService.saveBlocker(newBlocker).catch(console.error);

    setTasks(prev => {
      const updated = prev.map(t => t.id === taskId ? { ...t, blockerId } : t);
      const target = updated.find(t => t.id === taskId);
      if (target) {
        firebaseService.updateTask(target).catch(console.error);
      }
      return updated;
    });
  };

  // Resolving blocker from Blocker board
  const handleResolveBlockerNode = (blockerId: string) => {
    setBlockers(prev => {
      const updated = prev.map(b => b.id === blockerId ? { ...b, resolved: true } : b);
      const target = updated.find(b => b.id === blockerId);
      if (target) {
        firebaseService.updateBlocker(target).catch(console.error);
      }
      return updated;
    });

    setTasks(prev => {
      const updated = prev.map(t => t.blockerId === blockerId ? { ...t, blockerId: undefined } : t);
      const target = updated.find(t => t.blockerId === blockerId);
      if (target) {
        firebaseService.updateTask(target).catch(console.error);
      }
      return updated;
    });
  };

  // Finish Emergency Sprint complete callback
  const handleSprintModesFinishComplete = (taskId: string) => {
    setTasks(prev => {
      const updated = prev.map(t => 
        t.id === taskId ? { ...t, status: "completed" as const, subtasks: t.subtasks.map(st => ({ ...st, completed: true })) } : t
      );
      const changed = updated.find(t => t.id === taskId);
      if (changed) {
        firebaseService.updateTask(changed).catch(console.error);
      }
      return updated;
    });
    setActiveSprintTaskId(null);
    setActiveTab("dashboard");
  };

  // Active task details undergoing time-saving
  const sptrintTaskTarget = activeSprintTaskId ? tasks.find(t => t.id === activeSprintTaskId) || null : null;

  return (
    <div className={`min-h-screen theme-container ${isDarkMode ? "dark-theme" : "light-theme"} flex flex-col font-sans relative overflow-hidden bg-grid-pattern pt-20`}>
      
      {/* Lightfall WebGL Background animation behind the entire website */}
      <div className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} id="global-lightfall-background">
        <Lightfall
          colors={['#A6C8FF', '#5227FF', '#FF9FFC']}
          backgroundColor="#0A29FF"
          speed={0.5}
          streakCount={2}
          streakWidth={1}
          streakLength={1}
          glow={1}
          density={0.6}
          twinkle={1}
          zoom={3}
          backgroundGlow={0.5}
          opacity={1}
          mouseInteraction={true}
          mouseStrength={0.5}
          mouseRadius={1}
        />
      </div>

      {/* Absolute top thin decorative indicator bar */}
      <div className="w-full h-1.5 bg-limeaccent shadow-[0_1px_15px_rgba(197,255,65,0.4)] relative z-10" />

      {/* --- SITE NAVIGATION TOP HEADER --- */}
      <header className="fixed top-0 left-0 right-0 h-20 border-b border-white/15 bg-black/40 backdrop-blur-xl z-40 px-6 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-4">
          <div 
            onClick={() => setActiveTab("landing")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 bg-limeaccent flex items-center justify-center font-black text-black font-sans text-sm tracking-tighter transition-all">
              G
            </div>
            <div>
              <h1 className="font-sans text-sm font-bold tracking-widest uppercase text-white group-hover:text-limeaccent transition-all leading-none">
                KAIROS<span className="text-limeaccent">.ai</span>
              </h1>
              <p className="font-sans text-[8px] text-zinc-400 tracking-widest uppercase mt-0.5">
                Google Workspace Rebel
              </p>
            </div>
          </div>

          {/* Profile Picture (PFP) after the app name */}
          {user && (
            <div className="relative group/pfp z-50">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || "User"} 
                  className="w-8 h-8 rounded-full border border-white/20 hover:border-white/60 transition-all cursor-pointer shadow-md" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-purple-600 border border-white/20 hover:border-white/60 transition-all flex items-center justify-center font-bold text-white text-xs cursor-pointer shadow-md">
                  {user.displayName ? user.displayName[0].toUpperCase() : "G"}
                </div>
              )}
              {/* Dropdown details card on hover */}
              <div className="absolute left-0 mt-2 w-64 p-4 rounded-xl bg-black/95 backdrop-blur-xl border border-white/25 text-white opacity-0 invisible group-hover/pfp:opacity-100 group-hover/pfp:visible transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-left">
                <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-3">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || "User"} className="w-10 h-10 rounded-full border border-white/20" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-sm">{user.displayName ? user.displayName[0].toUpperCase() : "G"}</div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">{user.displayName || "Rebel User"}</span>
                    <span className="text-[10px] font-mono text-zinc-400 truncate mt-0.5">{user.email}</span>
                  </div>
                </div>
                <button 
                  onClick={handleSignOut} 
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-3 border border-red-500/20 hover:border-red-500/50 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer uppercase tracking-wider"
                  id="google-signout-btn"
                >
                  <LogOut size={11} />
                  <span>Disconnect Account</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Focus Mode & Google Login coordinate buttons */}
        <div className={`flex gap-3 items-center ${activeTab !== "landing" ? "pr-24 lg:pr-28" : ""}`}>
          {!user && (
            <button 
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-white/5 hover:bg-[#5227FF]/10 hover:border-[#5227FF]/40 text-white font-sans text-[10px] font-semibold tracking-wider uppercase transition-all shadow-md cursor-pointer disabled:opacity-50"
              id="google-signin-btn"
            >
              {isSigningIn ? <RefreshCw size={11} className="animate-spin" /> : <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C18.155 2.502 15.39 1.5 12.24 1.5 6.426 1.5 1.7 6.202 1.7 12s4.726 10.5 10.54 10.5c6.07 0 10.105-4.243 10.105-10.285 0-.693-.075-1.22-.165-1.715H12.24z"/></svg>}
              <span>{isSigningIn ? "SYNCING..." : "GOOGLE SYNC"}</span>
            </button>
          )}

          <button
            onClick={handleResetDB}
            className="flex items-center gap-1 text-[10px] font-sans font-semibold tracking-wider uppercase border border-white/20 bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
            title="Clear all data stored"
          >
            <RotateCcw size={11} />
            <span>Reset Data</span>
          </button>
        </div>
      </header>

      {/* --- SITE WORKSPACE LAYOUT (SIDEBAR + MAIN) --- */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        {activeTab !== "landing" && (
          <StaggeredMenu
            items={menuItems}
            socialItems={socialItems}
            displaySocials={false}
            displayItemNumbering={true}
            isFixed={true}
            hideLogo={true}
          />
        )}

        {/* --- MAIN CITADEL VIEW --- */}
        <main className="flex-1 w-full p-6 md:p-8 overflow-y-auto">
        
        {/* VIEW 01: HERO LANDING PAGE */}
        {activeTab === "landing" && (
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center py-8 md:py-20 animate-fade-in text-left">
            
            {/* Left Column: Hero Text & Enter Trigger */}
            <div className="md:col-span-7 space-y-6 flex flex-col items-start">
              <h2 className="font-nohemi text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">
                KAIROS<span className="text-limeaccent">.AI</span>
              </h2>
              <p className="font-sans text-base text-zinc-400 tracking-wide max-w-lg leading-relaxed">
                A hyper-focus command center designed to outrun procrastination, isolate workspace bottlenecks, and race ticking deadlines in real-time.
              </p>

              {/* CTA Enter Button */}
              <div className="pt-4">
                <button
                  onClick={() => {
                    if (user) {
                      setActiveTab("dashboard");
                    } else {
                      handleGoogleSignIn();
                    }
                  }}
                  className="bg-limeaccent hover:bg-limeaccent-hover text-black font-display font-black tracking-widest uppercase py-4 px-8 rounded-lg text-sm flex items-center gap-2.5 transition-all shadow-[0_4px_25px_rgba(197,255,65,0.15)] hover:shadow-[0_4px_30px_rgba(197,255,65,0.25)] cursor-pointer"
                >
                  <span>{user ? "Enter the Citadel" : "Connect Google to Enter"}</span>
                  <ArrowRight size={16} className="text-black stroke-[3px]" />
                </button>
                {!user && (
                  <span className="font-sans text-[10px] text-zinc-500 uppercase tracking-wider block pt-2">
                    🔒 Google Calendar Workspace integration required (No Guest Mode)
                  </span>
                )}
              </div>

              <span className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest block pt-2">
                VIBE2SHIP HACKATHON EDITION · READY FOR PROMPT ACTIONS
              </span>
            </div>

            {/* Right Column: Cards swap deck */}
            <div className="md:col-span-5 h-[360px] md:h-[420px] relative flex items-center justify-center overflow-visible" id="landing-card-swap-wrapper">
              <div className="absolute top-[40%] left-[40%] -translate-x-1/2 -translate-y-1/2 w-[380px] h-[250px] overflow-visible">
                <CardSwap
                  width={380}
                  height={250}
                  cardDistance={25}
                  verticalDistance={20}
                  delay={4500}
                  pauseOnHover={true}
                >
                  <Card className="p-6 text-left border border-zinc-900 bg-zinc-950 flex flex-col justify-between shadow-xl rounded-xl">
                    <div className="space-y-2">
                      <span className="font-mono text-[9px] uppercase font-bold tracking-widest text-limeaccent block">CAPABILITY 01</span>
                      <h3 className="font-display text-lg font-black text-white tracking-tight uppercase">Scythe Tock Focus</h3>
                      <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                        Decompose large operations into high-priority sub-blocks. When slipping behind, engage the 10-Minute emergency sprint mechanism.
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-900/60 pt-3 text-[10px] font-mono text-zinc-500">
                      <span>⚡ WORKFLOW ENZYMES</span>
                      <span>⏱️ EMERGENCY SAVE</span>
                    </div>
                  </Card>

                  <Card className="p-6 text-left border border-zinc-900 bg-zinc-950 flex flex-col justify-between shadow-xl rounded-xl">
                    <div className="space-y-2">
                      <span className="font-mono text-[9px] uppercase font-bold tracking-widest text-limeaccent block">CAPABILITY 02</span>
                      <h3 className="font-display text-lg font-black text-white tracking-tight uppercase">2/3 Time Limits</h3>
                      <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                        Auto-calculates deadlines and logs urgent calendar warnings directly into your Google Calendar once 2/3 of your scheduled window passes.
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-900/60 pt-3 text-[10px] font-mono text-zinc-500">
                      <span>📅 CALENDAR SYNC</span>
                      <span>🔔 66.7% ALERTS</span>
                    </div>
                  </Card>

                  <Card className="p-6 text-left border border-zinc-900 bg-zinc-950 flex flex-col justify-between shadow-xl rounded-xl">
                    <div className="space-y-2">
                      <span className="font-mono text-[9px] uppercase font-bold tracking-widest text-limeaccent block">CAPABILITY 03</span>
                      <h3 className="font-display text-lg font-black text-white tracking-tight uppercase">Blocker Elimination</h3>
                      <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                        Lock workspace bottlenecks with instant friction logging, trace blocker duration windows, and draft customized AI email follow-ups.
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-900/60 pt-3 text-[10px] font-mono text-zinc-500">
                      <span>🛡️ FRICTION ISOLATION</span>
                      <span>✉️ AUTO-NUDGE</span>
                    </div>
                  </Card>
                </CardSwap>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 02: MAIN DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-10 animate-fade-in">
            
            {/* Top Interactive Row: Time Debt Battery meter */}
            <div className="max-w-[90%] mx-auto w-full">
              <TimeDebtMeter 
                state={timeDebt} 
                completedCount={tasks.filter(t => t.status === "completed").length}
                totalCount={tasks.length}
                notificationLogs={notificationLogs}
                isGCalConnected={!!accessToken}
              />
            </div>

            {/* Date-wise Calendar Visualizer */}
            <TaskCalendar 
              tasks={tasks}
              selectedDateString={selectedDateFilter}
              onSelectDate={setSelectedDateFilter}
            />

            {/* Main grid splitter */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left hand list dashboard (Tasks and subtasks) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Dashboard Task Header */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <h3 className="font-display text-xl font-black tracking-tight uppercase text-white flex items-center gap-2">
                    <Clock size={16} className="text-limeaccent" />
                    Today's Temporal Nodes
                  </h3>

                  <button
                    onClick={() => setActiveTab("planner")}
                    className="flex items-center gap-1.5 text-xs font-mono text-limeaccent hover:text-white transition-all border border-zinc-850 bg-zinc-950 px-2.5 py-1.5 rounded-lg cursor-pointer hover:border-zinc-700"
                  >
                    <Plus size={12} className="text-limeaccent" />
                    <span>Intake Task</span>
                  </button>
                </div>

                {(() => {
                  const displayedTasks = selectedDateFilter
                    ? tasks.filter(t => new Date(t.deadline).toISOString().slice(0, 10) === selectedDateFilter)
                    : tasks;

                  if (displayedTasks.length === 0) {
                    return (
                      <div className="py-12 text-center text-zinc-500 font-mono text-xs border border-dashed border-zinc-900 rounded-xl bg-zinc-950/20">
                        {selectedDateFilter 
                          ? `No active task nodes bound on date alignment: ${selectedDateFilter}.` 
                          : "No active tasks currently scheduled. Write a prompt inside the Task Planner to intake."}
                      </div>
                    );
                  }

                  const carouselItems = displayedTasks.map(task => ({
                    id: task.id,
                    content: (
                      <div
                        className={`p-5 h-full rounded-xl border transition-all text-left flex flex-col justify-between ${
                          task.status === "completed"
                            ? "border-zinc-900 bg-zinc-950/10 opacity-60"
                            : task.status === "missed"
                            ? "border-red-500/10 bg-red-950/5 hover:border-red-500/30"
                            : "border-zinc-850 bg-zinc-950 hover:border-zinc-700"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-start gap-3">
                              {task.status === "missed" ? (
                                <div className="mt-0.5 text-zinc-550 flex items-center justify-center w-[18px] h-[18px] bg-red-950/20 border border-red-500/20 rounded-full" title="Locked: Missed Task">
                                  <Lock size={10} className="text-red-400" />
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleToggleTaskStatus(task.id)}
                                  className="mt-0.5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                                >
                                  <CheckCircle 
                                    size={18} 
                                    className={task.status === "completed" ? "text-limeaccent fill-limeaccent/10" : "text-zinc-650 hover:text-zinc-400"} 
                                  />
                                </button>
                              )}

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className={`font-display text-lg font-black uppercase tracking-tight ${(task.status === "completed" || task.status === "missed") ? "line-through text-zinc-500" : "text-white"}`}>
                                    {task.title}
                                  </h4>
                                  
                                  {task.status === "missed" && (
                                    <span className="font-mono text-[8px] font-black bg-red-950 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded tracking-wide uppercase">
                                      MISSED / LOCKED
                                    </span>
                                  )}

                                  {task.priority === "critical" && task.status !== "missed" && (
                                    <span className="font-mono text-[8px] font-black bg-red-950 text-red-550 border border-red-500/30 px-1.5 py-0.5 rounded tracking-wide uppercase animate-pulse">
                                      CRITICAL
                                    </span>
                                  )}

                                  {task.blockerId && (
                                    <span 
                                      onClick={() => setActiveTab("blockers")}
                                      className="font-mono text-[8.5px] bg-limeaccent/10 text-limeaccent border border-limeaccent/20 px-1.5 py-0.5 rounded cursor-pointer hover:bg-limeaccent/20 transition-all uppercase tracking-wide"
                                    >
                                      BLOCKED
                                    </span>
                                  )}
                                </div>
                                
                                {task.description && (
                                  <p className="text-xs text-zinc-400 font-sans mt-0.5 leading-relaxed font-medium">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="text-right flex flex-col items-end gap-1 font-mono text-[10px] shrink-0">
                              <span className="text-zinc-500">
                                Deadline: <span className="text-zinc-300 font-bold">{
                                  new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ", " +
                                  new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                }</span>
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-zinc-550 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-850">
                                  Est: <strong className="text-zinc-350">{task.estimatedHours}h</strong>
                                </span>
                                
                                {task.status !== "missed" && (
                                  <div className="flex items-center bg-zinc-900 border border-zinc-850 rounded overflow-hidden shadow">
                                    <button
                                      onClick={() => handleMoveTask(task.id, 'up')}
                                      title="Move Task Up (Adds +15m Context Switch Debt)"
                                      className="p-1 px-1.5 text-zinc-500 hover:text-limeaccent hover:bg-zinc-850 border-r border-zinc-850 cursor-pointer transition-all"
                                    >
                                      <ChevronUp size={10} />
                                    </button>
                                    <button
                                      onClick={() => handleMoveTask(task.id, 'down')}
                                      title="Move Task Down (Adds +15m Context Switch Debt)"
                                      className="p-1 px-1.5 text-zinc-500 hover:text-limeaccent hover:bg-zinc-850 cursor-pointer transition-all"
                                    >
                                      <ChevronDown size={10} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {task.subtasks.length > 0 && (
                            <div className="bg-black/50 border border-zinc-900 rounded-lg p-3 my-2 space-y-1.5 max-h-[140px] overflow-y-auto">
                              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-black block mb-1">Decomposed Sub-blocks</span>
                              {task.subtasks.map((st) => (
                                <div
                                  key={st.id}
                                  onClick={() => {
                                    if (task.status === "missed") {
                                      triggerToast("Locked: This task's scheduled window has expired and it is marked as missed.", "warning");
                                      return;
                                    }
                                    handleToggleSubTask(task.id, st.id);
                                  }}
                                  className={`flex items-center justify-between text-xs font-mono p-1 rounded transition-all ${
                                    task.status === "missed"
                                      ? "opacity-50 cursor-not-allowed text-zinc-650"
                                      : "hover:bg-zinc-900/30 cursor-pointer " + (st.completed ? "text-zinc-500" : "text-zinc-300")
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {st.completed ? (
                                      <div className="w-3.5 h-3.5 rounded bg-limeaccent/20 border border-limeaccent/40 flex items-center justify-center">
                                        <Check size={10} className="text-limeaccent" />
                                      </div>
                                    ) : (
                                      <div className={`w-3.5 h-3.5 rounded border ${task.status === "missed" ? "border-zinc-800" : "border-zinc-700"}`} />
                                    )}
                                    <span className={st.completed ? "line-through text-zinc-650" : ""}>
                                      {st.title}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 bg-zinc-950/60 px-1.5 py-0.5 rounded border border-zinc-900">
                                    {st.durationMinutes} min
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-3.5 pt-1.5 border-t border-zinc-900/40 mt-3">
                          {task.status !== "completed" && task.status !== "missed" && (
                            <button
                              onClick={() => {
                                setActiveSprintTaskId(task.id);
                              }}
                              className="flex items-center gap-1.5 bg-limeaccent/10 hover:bg-limeaccent/20 border border-limeaccent/20 hover:border-limeaccent/40 text-limeaccent font-mono text-[10px] font-bold tracking-wider py-1.5 px-3 rounded-md transition-all cursor-pointer"
                            >
                              <Flame size={11} className="text-limeaccent" />
                              <span>10-Minute Save</span>
                            </button>
                          )}

                          {task.status === "missed" && (
                            <button
                              onClick={() => setActiveTab("insights")}
                              className="flex items-center gap-1.5 bg-red-950/20 hover:bg-red-900/20 border border-red-500/20 hover:border-red-400/40 text-red-400 font-mono text-[10px] font-bold tracking-wider py-1.5 px-3 rounded-md transition-all cursor-pointer"
                            >
                              <ShieldAlert size={11} className="text-red-400 animate-pulse" />
                              <span>Perform Autopsy</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  }));

                  return (
                    <div className="w-full flex justify-center animate-fade-in py-2">
                      <Carousel items={carouselItems} baseWidth={620} loop={false} />
                    </div>
                  );
                })()}

              </div>

              {/* Right hand list dashboard (Check-is & instructions) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Mood Alignment */}
                <MoodSelector 
                  tasks={tasks}
                  onMoodAligned={handleOnMoodAligned}
                />

                {/* Blocker overview panel */}
                <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-950/60 flex flex-col justify-between">
                  <div>
                    <h4 className="font-display text-sm font-black uppercase tracking-tight text-zinc-300 border-b border-zinc-900 pb-2 mb-3.5 flex items-center justify-between">
                      <span>Barriers Pending</span>
                      <span className="font-mono text-[10px] text-limeaccent bg-limeaccent/10 px-1.5 py-0.5 border border-limeaccent/20 font-bold">
                        {blockers.filter(b => !b.resolved).length} nodes
                      </span>
                    </h4>
                    
                    {blockers.filter(b => !b.resolved).length === 0 ? (
                      <p className="text-xs font-mono text-zinc-500 italic py-4 text-center">
                        All paths clear of blockade.
                      </p>
                    ) : (
                      <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1 text-xs">
                        {blockers.filter(b => !b.resolved).map((blocker) => (
                          <div 
                            key={blocker.id}
                            onClick={() => setActiveTab("blockers")}
                            className="p-2 border border-limeaccent/15 bg-limeaccent/5 hover:border-limeaccent/30 rounded text-[11px] font-mono text-zinc-300 flex items-center justify-between transition-all cursor-pointer"
                          >
                            <span>Blocked on: <strong>{blocker.blockedOnName}</strong></span>
                            <ArrowRight size={10} className="text-limeaccent" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {blockers.filter(b => !b.resolved).length > 0 && (
                    <button
                      onClick={() => setActiveTab("blockers")}
                      className="w-full text-center font-display text-[10px] text-limeaccent hover:text-white font-black uppercase tracking-wider border border-limeaccent/10 hover:border-limeaccent/20 bg-limeaccent/5 py-1.5 rounded mt-4 transition-all cursor-pointer"
                    >
                      Access Blocker Board
                    </button>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

        {/* VIEW 03: TASK PLANNER / MANUAL BUILDER */}
        {activeTab === "planner" && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div className="border-b border-zinc-900 pb-3">
              <h2 className="font-sans text-3xl font-semibold uppercase tracking-tight text-white">
                Manual Task Builder
              </h2>
              <p className="text-sm font-sans text-zinc-400 mt-1">
                "You decide what must be done, and the window it lives in. The Loom only slots the minutes."
              </p>
            </div>

            <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/75 backdrop-blur-md relative overflow-hidden space-y-5">
              

              {/* Chronos Speech Intake Section */}
              <div className="p-4 border border-zinc-900 bg-zinc-950/20 rounded-lg space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="text-limeaccent" size={14} />
                    <span className="font-sans text-[10px] font-black uppercase text-zinc-300">Chronos Voice Alignment Alchemist</span>
                  </div>
                  <span className="font-sans text-[8px] text-zinc-550 border border-zinc-900 px-1 py-0.5 bg-black/40">GEMINI LIVE AI PARSER</span>
                </div>

                <p className="text-[10px] font-sans text-zinc-450 leading-relaxed">
                  Press record, then describe your task naturally <em className="text-zinc-400 not-italic bg-zinc-900/60 p-0.5 block border border-zinc-900 rounded select-all mt-1 font-sans">  Detailed overview here</em>
                </p>
                <div className="flex items-center gap-3.5">
                  <button
                    onClick={handleToggleVoiceRecording}
                    className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-sans font-bold uppercase transition-all tracking-wide cursor-pointer select-none ${
                      isRecording
                        ? "bg-red-650 hover:bg-red-750 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                        : "bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-805"
                    }`}
                  >
                    <Mic size={13} className={isRecording ? "animate-bounce" : ""} />
                    <span>{isRecording ? "Listening..." : "Press To Speak"}</span>
                  </button>

                  {isRecording && (
                    <div className="flex items-center gap-1.5 h-3">
                      {[1, 2, 3, 4, 5, 6].map(barId => (
                        <span 
                          key={barId} 
                          className="w-1 bg-limeaccent rounded-full animate-pulse shrink-0"
                          style={{
                            height: `${Math.random() * 80 + 20}%`,
                            animationDuration: `${0.3 + Math.random() * 0.4}s`
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {voiceTranscript && (
                    <button
                      onClick={handleSendVoiceTranscript}
                      disabled={voiceIsProcessing}
                      className="ml-auto flex items-center gap-1.5 bg-limeaccent hover:bg-limeaccent-hover text-black px-4 py-2 rounded-lg text-xs font-sans font-bold uppercase transition-all shadow-[0_2px_15px_rgba(197,255,65,0.1)] cursor-pointer disabled:opacity-40"
                    >
                      <Sparkles size={11} className={voiceIsProcessing ? "animate-spin" : ""} />
                      <span>{voiceIsProcessing ? "Parsing Transcripts..." : "Interpret Voice -> Feed"}</span>
                    </button>
                  )}
                </div>

                <div className="border-t border-zinc-900/60 pt-3.5 space-y-2">
                  <span className="font-sans text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Instant Temple Templates:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSendVoiceTranscriptSubmitRaw("Prepare high-priority preparatory modules for Google Senior Interview next Friday. Subtasks must list systems architecture, mock behavioral answers, and visual coding exercises.")}
                      className="bg-zinc-900/80 hover:bg-limeaccent/10 border border-zinc-800 hover:border-limeaccent/30 text-zinc-300 hover:text-limeaccent rounded-lg px-2.5 py-1.5 text-[9px] font-sans text-left max-w-xs transition-all cursor-pointer"
                    >
                      👔 Interview Prep Template
                    </button>
                    <button
                      onClick={() => handleSendVoiceTranscriptSubmitRaw("Audit all monthly utility invoices, bills, cloud server hosting liabilities, and credit payments due on the 30th.")}
                      className="bg-zinc-900/80 hover:bg-limeaccent/10 border border-zinc-800 hover:border-limeaccent/30 text-zinc-300 hover:text-limeaccent rounded-lg px-2.5 py-1.5 text-[9px] font-sans text-left max-w-xs transition-all cursor-pointer"
                    >
                      💳 Bill / Payment Reminder
                    </button>
                    <button
                      onClick={() => handleSendVoiceTranscriptSubmitRaw("Establish study goal. Decompose into systems textbook reviewing chapters and mock simulator exercises.")}
                      className="bg-zinc-900/80 hover:bg-limeaccent/10 border border-zinc-800 hover:border-limeaccent/30 text-zinc-300 hover:text-limeaccent rounded-lg px-2.5 py-1.5 text-[9px] font-sans text-left max-w-xs transition-all cursor-pointer"
                    >
                      📚 Habit study blueprint
                    </button>
                  </div>
                </div>

                

                {voiceTranscript && (
                  <div className="p-3 bg-black/60 border border-zinc-900 rounded font-sans text-[11px] text-zinc-350 select-all max-h-24 overflow-y-auto">
                    <strong className="text-zinc-550 mr-1 text-[9px] uppercase font-bold">Heard:</strong>
                    "{voiceTranscript}"
                  </div>
                )}
              </div>

              {/* Task Category Selector Preset */}
              <div className="flex flex-col gap-2 border-b border-zinc-900 pb-4">
                <label className="font-sans text-[10px] text-zinc-450 font-black uppercase tracking-wider block">
                  Select Task Preset / Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectCategoryTemplate("interview_prep")}
                    className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      builderCategory === "interview_prep"
                        ? "bg-limeaccent/15 border-limeaccent/50 text-limeaccent"
                        : "bg-zinc-950/60 border-zinc-900 hover:border-zinc-800 text-zinc-300"
                    }`}
                  >
                    <span className="text-sm">👔</span>
                    <span className="font-sans font-bold text-[11px] leading-tight block">Interview Prep</span>
                    <span className="font-sans text-[8px] text-zinc-500 block">High priority & tasks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectCategoryTemplate("bill")}
                    className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      builderCategory === "bill"
                        ? "bg-limeaccent/15 border-limeaccent/50 text-limeaccent"
                        : "bg-zinc-950/60 border-zinc-900 hover:border-zinc-800 text-zinc-300"
                    }`}
                  >
                    <span className="text-sm">💳</span>
                    <span className="font-sans font-bold text-[11px] leading-tight block">Bill / Payment</span>
                    <span className="font-sans text-[8px] text-zinc-500 block">Liability audits</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectCategoryTemplate("habit_study")}
                    className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      builderCategory === "habit_study"
                        ? "bg-limeaccent/15 border-limeaccent/50 text-limeaccent"
                        : "bg-zinc-950/60 border-zinc-900 hover:border-zinc-800 text-zinc-300"
                    }`}
                  >
                    <span className="text-sm">📚</span>
                    <span className="font-sans font-bold text-[11px] leading-tight block">Habit Study</span>
                    <span className="font-sans text-[8px] text-zinc-500 block">Skill blueprints</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectCategoryTemplate("others")}
                    className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      builderCategory === "others"
                        ? "bg-limeaccent/15 border-limeaccent/50 text-limeaccent"
                        : "bg-zinc-950/60 border-zinc-900 hover:border-zinc-800 text-zinc-300"
                    }`}
                  >
                    <span className="text-sm">🌐</span>
                    <span className="font-sans font-bold text-[11px] leading-tight block">Others / Custom</span>
                    <span className="font-sans text-[8px] text-zinc-500 block">Clean canvas</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] text-zinc-450 font-black uppercase tracking-wider">
                  Task Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Write company product guidelines"
                  value={builderTitle}
                  onChange={(e) => setBuilderTitle(e.target.value)}
                  className="bg-black border border-zinc-850 hover:border-zinc-700 focus:border-limeaccent/40 p-3 rounded-lg text-xs font-sans text-zinc-100 outline-none w-full transition-all"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] text-zinc-450 font-black uppercase tracking-wider">
                  Description (optional)
                </label>
                <textarea
                  rows={2.5}
                  placeholder="Any extra context for yourself."
                  value={builderDescription}
                  onChange={(e) => setBuilderDescription(e.target.value)}
                  className="bg-black border border-zinc-850 hover:border-zinc-700 focus:border-limeaccent/40 p-3 rounded-lg text-xs font-sans text-zinc-100 outline-none w-full resize-none transition-all"
                />
              </div>

              {/* Priority */}
              <div className="flex flex-col gap-1.5">
                <label className="font-sans text-[10px] text-zinc-450 font-black uppercase tracking-wider">
                  Priority
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["low", "medium", "high", "critical"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setBuilderPriority(p)}
                      className={`py-2 rounded-lg text-[10px] font-sans font-bold uppercase tracking-wide border transition-all cursor-pointer ${
                        builderPriority === p
                          ? "bg-limeaccent/15 border-limeaccent/40 text-limeaccent"
                          : "bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Window start/end - the user's own time range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] text-zinc-450 font-black uppercase tracking-wider">
                    Window Start
                  </label>
                  <input
                    type="datetime-local"
                    value={builderWindowStart}
                    onChange={(e) => { setBuilderWindowStart(e.target.value); setSlotPreview(null); }}
                    className="bg-black border border-zinc-850 hover:border-zinc-700 focus:border-limeaccent/40 p-2.5 rounded-lg text-xs font-sans text-zinc-100 outline-none w-full transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-[10px] text-zinc-450 font-black uppercase tracking-wider">
                    Window End / Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={builderWindowEnd}
                    onChange={(e) => { setBuilderWindowEnd(e.target.value); setSlotPreview(null); }}
                    className="bg-black border border-zinc-850 hover:border-zinc-700 focus:border-limeaccent/40 p-2.5 rounded-lg text-xs font-sans text-zinc-100 outline-none w-full transition-all"
                  />
                </div>
              </div>

              <div className="border-t border-zinc-900 pt-4 space-y-3">
                <label className="font-sans text-[10px] text-zinc-450 font-black uppercase tracking-wider">
                  Subtasks (you decide each step)
                </label>

                {builderSubtasks.length > 0 && (
                  <div className="space-y-2">
                    {builderSubtasks.map((st) => (
                      <div key={st.id} className="flex gap-2 items-center text-xs font-sans bg-zinc-950 p-2 rounded border border-zinc-900">
                        <span className="text-zinc-500 w-5 text-right font-sans pr-1 select-none">{st.order}.</span>
                        <input
                          type="text"
                          value={st.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBuilderSubtasks(prev => prev.map(item => item.id === st.id ? { ...item, title: val } : item));
                            setSlotPreview(null);
                          }}
                          className="flex-1 bg-black border border-zinc-900 focus:border-limeaccent/40 p-1.5 rounded text-xs font-sans text-zinc-100 outline-none"
                          placeholder="Subtask name"
                        />
                        <input
                          type="number"
                          min={1}
                          value={st.durationMinutes}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value, 10) || 0);
                            setBuilderSubtasks(prev => prev.map(item => item.id === st.id ? { ...item, durationMinutes: val } : item));
                            setSlotPreview(null);
                          }}
                          className="w-16 bg-black border border-zinc-900 focus:border-limeaccent/40 p-1.5 rounded text-center text-xs font-sans text-zinc-100 outline-none"
                          placeholder="Min"
                        />
                        <span className="text-zinc-600 text-[10px] select-none pr-1">min</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBuilderSubtask(st.id)}
                          className="text-zinc-650 hover:text-red-400 cursor-pointer p-1 transition-all select-none"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Subtask title"
                    value={builderSubtaskDraft.title}
                    onChange={(e) => setBuilderSubtaskDraft(prev => ({ ...prev, title: e.target.value }))}
                    className="flex-1 bg-black border border-zinc-850 hover:border-zinc-700 focus:border-limeaccent/40 p-2.5 rounded-lg text-xs font-sans text-zinc-100 outline-none transition-all"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Min"
                    value={builderSubtaskDraft.durationMinutes}
                    onChange={(e) => setBuilderSubtaskDraft(prev => ({ ...prev, durationMinutes: e.target.value }))}
                    className="w-20 bg-black border border-zinc-850 hover:border-zinc-700 focus:border-limeaccent/40 p-2.5 rounded-lg text-xs font-sans text-zinc-100 outline-none transition-all"
                  />
                  <button
                    onClick={handleAddBuilderSubtask}
                    className="px-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-limeaccent rounded-lg cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleAutoSlotWindow}
                disabled={builderSubtasks.length === 0 || !builderWindowStart || !builderWindowEnd}
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-limeaccent/30 text-limeaccent font-semibold font-sans uppercase py-3 px-4 rounded-lg text-xs tracking-wider transition-all cursor-pointer"
              >
                <Sparkles size={14} className="text-limeaccent" />
                <span>Slot My Subtasks Into This Window</span>
              </button>
              <p className="text-[10px] font-sans text-zinc-500 -mt-1">
                This is the only automated step: it arranges the subtasks you wrote, in order, inside the window you chose. It never adds, removes, or re-prioritizes work.
              </p>

              {user && (
                <div className="flex items-center gap-2 pb-2 pt-1 font-sans text-[11px] text-zinc-400">
                  <input 
                    type="checkbox" 
                    id="sync-to-gcal-checkbox"
                    checked={syncToGCal} 
                    onChange={(e) => setSyncToGCal(e.target.checked)} 
                    className="w-3.5 h-3.5 rounded bg-zinc-950 border border-zinc-900 accent-blue-600 focus:accent-blue-600 cursor-pointer"
                  />
                  <label htmlFor="sync-to-gcal-checkbox" className="cursor-pointer select-none">
                    Sync details to my Google Calendar primary blocks
                  </label>
                </div>
              )}
            </div>

            {/* Slot Preview Widget */}
            {slotPreview && (
              <div className="p-6 rounded-xl border border-limeaccent/30 bg-zinc-950 text-left space-y-4 shadow-[0_0_20px_rgba(197,255,65,0.02)]">
                <div className="flex items-start justify-between border-b border-zinc-900 pb-3">
                  <div>
                    <span className="font-sans text-[9px] bg-limeaccent/10 border border-limeaccent/20 text-limeaccent px-1.5 py-0.5 rounded tracking-wider uppercase font-bold">
                      WINDOW SLOTTED
                    </span>
                    <h3 className="font-sans text-2xl font-semibold uppercase tracking-tight text-white mt-2">
                      {builderTitle || "Untitled Task"}
                    </h3>
                  </div>
                  <div className="text-right font-sans text-xs text-zinc-400">
                    <div>Workload: <strong className="text-white">{slotPreview.totalPlannedMinutes}m</strong></div>
                    <div>Window: <strong className="text-white">{slotPreview.windowMinutes}m</strong></div>
                  </div>
                </div>

                {slotPreview.overflowMinutes > 0 && (
                  <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-lg text-xs font-sans text-red-300">
                    Your subtasks total {slotPreview.overflowMinutes} more minutes than the window allows. Slots below were compressed proportionally to fit — consider widening the window or trimming a subtask.
                  </div>
                )}

                <div className="space-y-1.5">
                  {slotPreview.subtasks.map((st, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-sans bg-zinc-950 p-2 rounded border border-zinc-900">
                      <span className="text-zinc-300">{st.order}. {st.title}</span>
                      <span className="text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded text-[10px]">
                        {st.startTime && new Date(st.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {st.endTime && new Date(st.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 border-t border-zinc-900 pt-4">
                  <button
                    onClick={() => setSlotPreview(null)}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 font-sans text-xs font-bold py-2.5 rounded-lg transition-all cursor-pointer"
                  >
                    Re-slot
                  </button>
                  <button
                    onClick={handleCreateTask}
                    disabled={!builderTitle.trim()}
                    className="flex-1 bg-limeaccent hover:bg-limeaccent-hover disabled:opacity-40 text-black font-sans text-xs font-semibold uppercase py-2.5 rounded-lg text-center transition-all shadow-[0_4px_15px_rgba(197,255,65,0.2)] cursor-pointer"
                  >
                    Commit to Loom of Time
                  </button>
                </div>
              </div>
            )}

            {/* Allow committing without slotting, e.g. a single-block task with no subtasks */}
            {!slotPreview && (
              <button
                onClick={handleCreateTask}
                disabled={!builderTitle.trim() || !builderWindowStart || !builderWindowEnd}
                className="w-full bg-limeaccent hover:bg-limeaccent-hover disabled:opacity-40 text-black font-sans text-xs font-semibold uppercase py-3 rounded-lg text-center transition-all shadow-[0_4px_15px_rgba(197,255,65,0.2)] cursor-pointer"
              >
                Commit Task As-Is
              </button>
            )}
          </div>
        )}

        {/* VIEW 03B: BLOCKER BOARD CANVAS */}
        {activeTab === "blockers" && (
          <BlockerBoard 
            blockers={blockers}
            tasks={tasks}
            onResolveBlocker={handleResolveBlockerNode}
            onReportBlocker={handleReportBlocker}
          />
        )}

        {/* VIEW 04: INSIGHTS & AUTOPSY DIAGNOSTICS */}
        {activeTab === "insights" && (
          <InsightsPanel
            tasks={tasks}
            autopsies={autopsies}
            onPerformAutopsy={handlePerformAutopsyAPI}
            onClearHistory={handleClearHistory}
          />
        )}

        {/* VIEW 05: HABIT TRACKER & GOAL ANALYTICS */}
        {activeTab === "habits" && (
          <HabitTracker triggerToast={triggerToast} />
        )}

      </main>
    </div>

      {/* --- FOOTER SECTIONS --- */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 p-6 text-center text-xs font-mono text-zinc-500 relative z-30">
        <p>
          kairos.ai — AI Productivity Companion
        </p>
        <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-widest leading-relaxed">
          Devour Procrastination Before It Devours You · Powered by Gemini Pro & Google AI Studio
        </p>
      </footer>

      {/* 1. Guided First-Time User Onboarding Guided Screen */}
      {showOnboarding && (
        <Onboarding
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem("kairos_onboarded", "true");
            triggerToast("✨ Welcome to KAIROS. Scroll downward to align your first workspace task node.", "success");
          }}
        />
      )}

      {/* 2. Gothic Sacred Commitment Scroll Contract Overlay */}
      {activeCommitmentDeed && (
        <CommitmentScroll
          taskTitle={activeCommitmentDeed.taskTitle}
          autopsyAnalysis={activeCommitmentDeed.autopsyAnalysis}
          commitmentContract={activeCommitmentDeed.commitmentContract}
          onSign={(sig) => {
            triggerToast(`⚡ Sacred Covenant sealed under witness '${sig}'! Remorse logged.`, "success");
            setActiveCommitmentDeed(null);
          }}
          onDismiss={() => {
            setActiveCommitmentDeed(null);
          }}
        />
      )}

      {/* 3. Multi-agent Voice Synthesis Stage confirmation view */}
      {voiceSynthesisStageResult && (
        <VoiceActionConfirmation
          parsedData={voiceSynthesisStageResult}
          onCancel={() => {
            setVoiceSynthesisStageResult(null);
            triggerToast("Voice synthesis draft decayed.", "info");
          }}
          onConfirm={(finalTask) => {
            handleConfirmVoiceTask(finalTask);
          }}
        />
      )}

      {/* --- ACTIVE EMERGENCY SPRINT OVERLAY --- */}
      {sptrintTaskTarget && (
        <SprintMode
          task={sptrintTaskTarget}
          onSprintComplete={handleSprintModesFinishComplete}
          onExit={() => setActiveSprintTaskId(null)}
        />
      )}

      {/* 2/3 TIME WINDOW LIMIT REAL-TIME ALERT OVERLAY */}
      {activeInAppAlert && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-950 border border-red-500/30 p-6 rounded-2xl max-w-md w-full shadow-2xl relative text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-950/40 border border-red-500/40 flex items-center justify-center text-red-400 text-xl animate-bounce">
              🚨
            </div>
            <div className="space-y-1.5">
              <span className="font-mono text-[10px] text-red-400 font-bold tracking-widest uppercase block">
                2/3 Time Window Consumed
              </span>
              <h3 className="font-display text-lg font-black text-white tracking-tight">
                {activeInAppAlert.title}
              </h3>
              {activeInAppAlert.category && (
                <span className="inline-block font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {activeInAppAlert.category === 'interview_prep' && '👔 Interview Prep'}
                  {activeInAppAlert.category === 'bill' && '💳 Bill Payment'}
                  {activeInAppAlert.category === 'habit_study' && '📚 Habit Study'}
                  {activeInAppAlert.category === 'others' && '🌐 Custom Task'}
                </span>
              )}
            </div>
            
            <p className="text-xs text-zinc-450 leading-relaxed max-w-sm mx-auto">
              This task has reached <span className="text-red-450 font-bold">2/3 (66.7%)</span> of its planned execution window.
              The alert has been automatically logged and synchronized to your Google Calendar to raise situational visibility.
            </p>

            <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-lg text-left text-[11px] font-mono space-y-1 text-zinc-450">
              <div><span className="text-zinc-600">Start:</span> {new Date(activeInAppAlert.windowStart || '').toLocaleString()}</div>
              <div><span className="text-zinc-600">Limit:</span> {new Date(activeInAppAlert.windowEnd || '').toLocaleString()}</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => {
                  // Launch 10-Minute Save emergency sprint mode
                  setActiveSprintTaskId(activeInAppAlert.id);
                  setActiveInAppAlert(null);
                }}
                className="flex-1 py-2 bg-limeaccent hover:bg-limeaccent/90 text-black text-xs font-mono font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Flame size={12} />
                <span>10-Minute Save</span>
              </button>
              
              <button
                onClick={() => {
                  setActiveInAppAlert(null);
                  triggerToast("Alert acknowledged. Settle focus trajectory.", "info");
                }}
                className="flex-1 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-300 hover:text-white text-xs font-mono rounded-lg transition-all cursor-pointer"
              >
                Dismiss Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Alarms Container */}
      <div className="fixed bottom-6 right-6 z-[9999] space-y-3.5 max-w-sm w-full font-mono text-xs">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg border shadow-2xl flex items-start gap-3.5 animate-slide-in transition-all ${
              toast.type === "warning"
                ? "bg-red-950/95 border-red-500/40 text-red-200"
                : toast.type === "success"
                ? "bg-zinc-900/95 border-limeaccent/40 text-limeaccent"
                : "bg-zinc-950/95 border-zinc-800 text-zinc-350"
            }`}
          >
            <span className="shrink-0 font-bold">
              {toast.type === "warning" ? "⚠️" : toast.type === "success" ? "✓" : "⏰"}
            </span>
            <div className="flex-1 leading-relaxed text-[11px] font-medium font-sans">
              {toast.message}
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-zinc-600 hover:text-white transition-all cursor-pointer font-bold font-mono text-[9px]"
            >
              [X]
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}