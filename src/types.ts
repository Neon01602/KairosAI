export interface SubTask {
  id: string;
  title: string;
  durationMinutes: number;
  completed: boolean;
  order: number;
  startTime?: string;
  endTime?: string;
}

export interface Blocker {
  id: string;
  taskTitle: string;
  blockedOnName: string; // e.g. "Sarah" or "API Deployment"
  reason: string;
  draftedMessage: string;
  resolved: boolean;
  createdAt: string;
}

export interface DeadTask {
  id: string;
  title: string;
  deadline: string;
  actualCompletionTime?: string;
  status: 'missed' | 'completed_late';
}

export interface Autopsy {
  id: string;
  taskTitle: string;
  deadline: string;
  failureReason: string;
  actionableCommitment: string; // Commitment contract or behavioral adjustment
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline: string; // ISO string or calendar block
  windowStart?: string;
  windowEnd?: string;
  estimatedHours: number;
  timeSpentHours: number;
  status: 'pending' | 'in_progress' | 'completed' | 'missed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  subtasks: SubTask[];
  blockerId?: string; // Links to blocker if applicable
  procrastinationCount: number; // How many times was "started" or "opened" but closed or delayed
  openLog?: string[]; // ISO timestamps of real "opened but not started" events, powers the heatmap
  createdAt: string;
  category?: 'interview_prep' | 'bill' | 'habit_study' | 'others';
}

export interface MoodState {
  energy: number; // 1 to 5 (or 10)
  focus: number; // 1 to 5
  lastCheckedIn: string;
  advice: string;
}

export interface TimeDebtState {
  currentDebtHours: number; // Positive means behind schedule
  rating: 'immaculate' | 'negligible' | 'concerning' | 'catastrophic';
  warningMessage: string;
}

export interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  mythicTheme: string;
  streak: number;
  history: string[]; // Array of YYYY-MM-DD dates completed
  createdAt: string;
}