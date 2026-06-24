<div align="center">

# ⚡ KAIROS.AI
### *Outrun Time Itself*

**An immersive, myth-themed AI productivity companion that acts before you fail.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Google%20Cloud-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)](https://ai.studio/apps/1ba8eb14-73b3-44b9-ab0a-9bbe44b1701c)
[![Gemini](https://img.shields.io/badge/Powered%20by-Gemini%202.5%20Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

*Built for Vibe2Ship Hackathon — Problem Statement 1: The Last-Minute Life Saver*

</div>

---

## What is KAIROS?

KAIROS is named after the ancient Greek god of the **opportune moment** — the fleeting window between too early and too late. Most productivity apps remind you what you missed. KAIROS intervenes *before* you miss it.

At its core is a **4-agent AI orchestration pipeline** powered by Gemini that takes a raw task idea and — in a single end-to-end flow — categorizes it, decomposes it into timed subtasks, adapts the schedule to your real-time energy and focus levels, detects your procrastination risk, and pre-drafts a blocker message to send collaborators. No passive notifications. Actual intelligent action.

---

## Features

### 🤖 Multi-Agent Temporal Orchestration Pipeline
The flagship feature. Four specialized Gemini agents with real context hand-off:

| Agent | Role |
|---|---|
| **Intake & Categorization** | Parses raw input → title, category, priority (low/medium/high/critical) |
| **Decomposition** | Breaks task into 3–5 timed, actionable subtasks |
| **Mood-Aware Scheduler** | Adapts order & timeline to your current energy + focus levels |
| **Risk Sentinel** | Detects procrastination risk & pre-drafts a collaborator unblock alert |

All agents use Gemini's `responseSchema` for strict JSON contracts — zero freeform text parsing.

### ⏱️ Time Debt Meter
A live urgency gauge that calculates how much "time debt" you've accumulated across all tasks — weighted by priority, deadline proximity, and overdue status. Rated from *Immaculate* to *Catastrophic*.

### 🔥 10-Minute Sprint Save
Emergency mode for imminent deadlines. The Sprint Agent generates a brutally prioritized 10-minute execution plan: timed micro-milestones, zero polish, maximum output.

### 🪦 Autopsy Agent
Missed a deadline? The Autopsy Agent performs a structured post-mortem — identifies your procrastination archetype, analyzes your explanation, and extracts a concrete behavioral commitment to prevent recurrence.

### 🎚️ Mood-Aware Scheduling
Set your current energy (physical vigor) and focus (mental alertness) on a 1–10 scale. The scheduler reorders your tasks and advises whether to tackle deep cognitive work, admin tasks, or rest first.

### 🎙️ Voice-Enabled Task Input
Speak a task naturally. The Voice Parser Agent transcribes and structures it into a titled, prioritized, decomposed task — no typing required.

### 🛑 Blocker Unblock-Message Drafter
Specify who's blocking you and why. The agent writes a clear, persuasive follow-up message ready to send — removing the social friction of chasing collaborators.

### 📅 Google Calendar Integration
Sign in with Google to pull your existing Calendar events into the unified planner view — full context when scheduling new tasks.

### 📊 Insights Terminal + Habit Tracker
Productivity analytics (completion rates, priority distribution, time patterns) and a recurring habit tracker with streaks and mythic themes.

---

## Tech Stack

```
Frontend     React 19 + TypeScript + Vite 6 + Tailwind CSS v4
Backend      Node.js + Express + TypeScript + WebSocket
AI           Gemini 2.5 Flash via @google/genai SDK (structured responseSchema)
Database     Cloud Firestore (Firebase)
Auth         Firebase Auth (Google OAuth + Anonymous)
Animation    GSAP 3 + Framer Motion
3D/WebGL     OGL
Charts       Recharts
Deployment   Google Cloud via AI Studio
```

---

## Architecture

```
User Input
    │
    ▼
┌─────────────────────────────────────────────────┐
│           Multi-Agent Pipeline                  │
│                                                 │
│  [Agent 1: Intake]  ──►  {title, category,      │
│                            priority}            │
│         │                                       │
│         ▼                                       │
│  [Agent 2: Decompose] ──► {subtasks[]}          │
│         │                                       │
│         ▼                                       │
│  [Agent 3: Scheduler] ──► {oracleAdvice,        │
│   + energy/focus input     estimatedHours}      │
│         │                                       │
│         ▼                                       │
│  [Agent 4: Risk Sentinel] ► {risk profile,      │
│                               unblock draft}    │
└─────────────────────────────────────────────────┘
    │
    ▼
Firestore (persist) → React UI (render)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/app/apikey)
- A Firebase project with Firestore + Auth enabled

### Installation

```bash
git clone https://github.com/Neon01602/kairos-ai.git
cd kairos-ai
npm install
```

### Configuration

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

```env
GEMINI_API_KEY=your_gemini_api_key_here
APP_URL=http://localhost:3000
```

For Firebase, update `src/firebase.ts` with your project config from the Firebase Console.

### Run Locally

```bash
npm run dev
```

App runs at `http://localhost:3000`.

### Build for Production

```bash
npm run build
npm start
```

---

## Project Structure

```
kairos-ai/
├── server.ts                   # Express + WebSocket server, all AI agent endpoints
├── src/
│   ├── App.tsx                 # Main app, all navigation + state management
│   ├── firebase.ts             # Firebase init + Google OAuth provider
│   ├── types.ts                # TypeScript interfaces (Task, Blocker, Autopsy, Habit…)
│   ├── index.css               # Global styles + theme variables
│   ├── components/
│   │   ├── BlockerBoard.tsx    # Blocker management + unblock message drafter
│   │   ├── HabitTracker.tsx    # Habit tracking with streaks
│   │   ├── InsightsPanel.tsx   # Analytics + productivity charts
│   │   ├── SprintMode.tsx      # 10-Minute Sprint Save emergency mode
│   │   ├── TaskCalendar.tsx    # Unified calendar (tasks + Google Calendar events)
│   │   ├── TimeDebtMeter.tsx   # Live urgency gauge
│   │   ├── MoodSelector.tsx    # Energy/focus input sliders
│   │   ├── VoiceActionConfirmation.tsx  # Voice input flow
│   │   ├── Onboarding.tsx      # First-time user guided flow
│   │   └── ...                 # CardSwap, Carousel, Lightfall, StaggeredMenu…
│   └── lib/
│       ├── firebaseService.ts  # Firestore CRUD operations
│       └── timeSlotter.ts      # Subtask scheduling within time windows
├── firestore.rules             # Firestore security rules
├── firebase-blueprint.json     # Data model schema
└── vite.config.ts
```

---

## API Endpoints

| Endpoint | Agent | Description |
|---|---|---|
| `POST /api/multi-agent-pipeline` | 4-Agent Pipeline | Full intake → decompose → schedule → risk flow |
| `POST /api/mood-schedule` | Mood Scheduler | Reorder tasks by energy/focus state |
| `POST /api/voice-task-input` | Voice Parser | Transcribe + structure spoken input |
| `POST /api/generate-sprint` | Sprint Agent | 10-minute emergency execution plan |
| `POST /api/autopsy` | Autopsy Agent | Post-deadline failure analysis |
| `POST /api/draft-unblock-message` | Blocker Drafter | Draft collaborator follow-up message |

All AI endpoints include graceful fallback responses when the Gemini API is unavailable.

---

## Google Technologies

| Technology | Usage |
|---|---|
| **Gemini 2.5 Flash** | All 6 AI agents with structured `responseSchema` JSON contracts |
| **Google AI Studio** | Development environment + Google Cloud deployment |
| **Firebase Auth** | Google OAuth (with Calendar scopes) + anonymous auth |
| **Cloud Firestore** | Persistent storage for tasks, blockers, autopsies, habits |
| **Google Calendar API** | Reads user's Calendar events for unified planning view |

---

## Hackathon Context

- **Event:** Vibe2Ship Hackathon
- **Problem Statement:** #1 — The Last-Minute Life Saver
- **Timeline:** 22nd June 2026 (3PM) → 29th June 2026 (2PM)
- **Deployment:** Google Cloud via AI Studio

---

## Author

**Ahmad Abdullah**
B.Tech CSE (AI) — Babu Banarasi Das University, Lucknow (2027)
Co-founder, FounderOS | IEEE Student Branch Event Coordinator

[![Documentation](https://docs.google.com/document/d/1uxT14lXQtUidF39QBB01-Zf6dRIwb7zAVE8xAeDN3bw/edit?usp=sharing)
[![GitHub](https://img.shields.io/badge/GitHub-Neon01602-181717?style=flat&logo=github)](https://github.com/Neon01602)

---

<div align="center">
<i>Time does not halt. Neither should you.</i>
</div>
