import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn("⚠️ GEMINI_API_KEY is not defined. AI functionality will fallback to simulated smart responses.");
}

// Helper to call generateContent with automatic retry and model fallback
async function generateContentWithFallback(
  ai: GoogleGenAI,
  contents: any,
  config: any,
  customModelsList?: string[]
): Promise<any> {
  const modelsToTry = customModelsList || ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`🤖 Requesting model "${modelName}" (attempt ${attempt}/2)...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config,
        });

        if (response && response.text) {
          console.log(`✅ Success with model "${modelName}" on attempt ${attempt}`);
          return response;
        }
        throw new Error("Empty response text from Gemini SDK");
      } catch (error: any) {
        lastError = error;
        const status = error?.status || error?.code || error?.statusCode;
        const msg = (error?.message || "").toLowerCase();
        const isRetryable =
          status === 503 ||
          status === 429 ||
          msg.includes("service unavailable") ||
          msg.includes("resource exhausted") ||
          msg.includes("high demand") ||
          msg.includes("rate limit") ||
          msg.includes("temporary");

        console.warn(`⚠️ Model "${modelName}" attempt ${attempt} failed:`, error.message || error);

        if (isRetryable && attempt < 2) {
          const delay = attempt * 300;
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error("All fallback models exhausted");
}

// 1. Blocker Unblock-Message Drafting Agent
// NOTE: task creation is fully manual now. The user enters the task, the blocker
// reason, and who it's blocked on themselves — the AI's only job here is to turn
// that into a clear, persuasive follow-up message. It never invents the blocker.
app.post("/api/draft-unblock-message", async (req, res) => {
  const { taskTitle, blockedOnName, reason } = req.body;
  if (!taskTitle || !blockedOnName || !reason) {
    return res.status(400).json({ error: "taskTitle, blockedOnName, and reason are required" });
  }

  if (!ai) {
    return res.json(simulateUnblockFallback(taskTitle, blockedOnName, reason));
  }

  try {
    const prompt = `Act as the Blocker Agent for "kairos.ai", the myth-themed time-rebel companion.
A user manually reported the following blocker (do NOT change or reinterpret these facts, only draft a message around them):
Task: "${taskTitle}"
Blocked on: "${blockedOnName}"
Reason: "${reason}"

Draft a short, firm but polite follow-up message asking ${blockedOnName} to unblock this task. Keep it under 80 words. Do not invent any new facts beyond what was given.`;

    const config = {
      systemInstruction: "You are the Blocker Agent for kairos.ai. You only draft follow-up messages for blockers the user has already identified themselves — you never decide what is blocking a task.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          draftedMessage: { type: Type.STRING, description: "A firm but polite follow-up message under 80 words, using the exact task/blocker facts given" }
        },
        required: ["draftedMessage"]
      }
    };

    const response = await generateContentWithFallback(ai, prompt, config);
    const text = response.text;
    if (!text) throw new Error("No response from AI");
    const result = JSON.parse(text.trim());
    return res.json(result);
  } catch (error: any) {
    console.error("Blocker drafting AI error (returning graceful simulated fallback):", error);
    return res.json(simulateUnblockFallback(taskTitle, blockedOnName, reason));
  }
});

// 2. Sprint Mode Agent (10-Minute Save)
app.post("/api/generate-sprint", async (req, res) => {
  const { title, subtasks } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Task title is required" });
  }

  if (!ai) {
    return res.json(simulateSprintFallback(title));
  }

  try {
    const prompt = `Act as the Sprint Mode Agent for kairos.ai.
The user is facing deadline panic for the task: "${title}".
Subtasks were: ${JSON.stringify(subtasks || [])}.

Your objective is the "10-Minute Save Mode". You must strip this task down to its absolute, raw Minimum Viable Product (MVP).
Throw away all secondary operations. Detail 3 to 4 hyper-focused micro-milestones that can be run in a frantic, laser-focused 10-minute countdown sprint.

Express the milestones as intense, high-speed instructions. Keep them brief.`;

    const config = {
      systemInstruction: "You are the alarm agent. You make tasks survival-simple to rescue users from deadline panic.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sprintTitle: { type: Type.STRING, description: "Emergency focus title (e.g. Raw Sketch MVP, Skeleton Compile)" },
          milestones: {
            type: Type.ARRAY,
            items: { type: Type.STRING, description: "Micro action step to perform in 2-3 minutes" }
          }
        },
        required: ["sprintTitle", "milestones"]
      }
    };

    const response = await generateContentWithFallback(ai, prompt, config);
    const text = response.text;
    if (!text) throw new Error("No response");
    const result = JSON.parse(text.trim());
    return res.json(result);
  } catch (error: any) {
    console.error("Sprint Mode AI error (returning graceful simulated fallback):", error);
    // Return status 200 with fallback data directly to keep client fully operational!
    return res.json(simulateSprintFallback(title));
  }
});

// 3. Autopsy Agent (Analysis of Failure)
app.post("/api/autopsy", async (req, res) => {
  const { taskTitle, userExplanation } = req.body;
  if (!taskTitle) {
    return res.status(400).json({ error: "Task title is required" });
  }

  if (!ai) {
    return res.json(simulateAutopsyFallback(taskTitle, userExplanation));
  }

  try {
    const prompt = `Act as the grim, myth-inspired Autopsy Agent for kairos.ai (themed around Charon / Chronos / Kairos).
The user missed their deadline for the task: "${taskTitle}".
Their raw explanation is: "${userExplanation || 'No explanation provided. Silent failure.'}".

Reconstruct why they failed. Identify their likely 'Procrastination DNA' (e.g. 'The Perfectionist Martyr', 'The Externalizing Blamer', 'The Optimism Gambler').
Then write a dramatic, solemn but motivating autopsical analysis.
Conclude with a strict Commitment Contract—a humorous but highly actionable behavioral contract they must bind themselves to next time to prevent this delay.`;

    const config = {
      systemInstruction: "You are the Keeper of the Scythe. You conduct post-mortem examinations on missed deadlines with poetic, high-contrast, mythic drama.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          failureReasonAnalysis: { type: Type.STRING, description: "Solemn mythic breakdown of why the mortal truly failed (probing procrastination DNA)" },
          actionableCommitment: { type: Type.STRING, description: "A humorous but rigid Commitment Contract (behavioral check) to seal with blood/clicks" }
        },
        required: ["failureReasonAnalysis", "actionableCommitment"]
      }
    };

    const response = await generateContentWithFallback(ai, prompt, config);
    const text = response.text;
    if (!text) throw new Error("No response");
    const result = JSON.parse(text.trim());
    return res.json(result);
  } catch (error: any) {
    console.error("Autopsy AI error (returning graceful simulated fallback):", error);
    // Return status 200 with fallback data directly to keep client fully operational!
    return res.json(simulateAutopsyFallback(taskTitle, userExplanation));
  }
});

// 4. Mood-Aware Scheduler Agent
app.post("/api/mood-schedule", async (req, res) => {
  const { energy, focus, tasks } = req.body;
  if (energy === undefined || focus === undefined) {
    return res.status(400).json({ error: "Energy & focus levels are required (1-10)" });
  }

  if (!ai) {
    return res.json(simulateMoodFallback(energy, focus, tasks));
  }

  try {
    const taskDetailsStr = JSON.stringify(tasks || []);
    const prompt = `Act as the wise Scheduler Agent of Kairos. 
The mortal user is checking in with:
Energy: ${energy}/10 (How physically active they feel)
Focus: ${focus}/10 (How mentally alert they feel)
Current Pending Tasks: ${taskDetailsStr}

Provide a mythic Oracle advice tailored to this state. If energy is low, suggest gentle tasks or unblocking messages. If energy and focus are hyper, urge them to strike immediately with great momentum.
Also recommend which tasks should be tackled first. Give us a highly dramatic motivational guideline.`;

    const config = {
      systemInstruction: "You are the Oracle of Kairos. You map the flow of mortal energy to the ticking scythe of time.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          advice: { type: Type.STRING, description: "A wise, dramatic counsel advising how to respect their body's state while defeating procrastination" },
          recommendedTaskIds: {
            type: Type.ARRAY,
            description: "List of Task IDs that match this energy state best",
            items: { type: Type.STRING }
          }
        },
        required: ["advice", "recommendedTaskIds"]
      }
    };

    const response = await generateContentWithFallback(ai, prompt, config);
    const text = response.text;
    if (!text) throw new Error("No Response");
    const result = JSON.parse(text.trim());
    return res.json(result);
  } catch (error: any) {
    console.error("Mood scheduler AI error (returning graceful simulated fallback):", error);
    // Return status 200 with fallback data directly to keep client fully operational!
    return res.json(simulateMoodFallback(energy, focus, tasks));
  }
});

// 5. Voice-Enabled Natural Language Task Input Parser Agent
app.post("/api/voice-task-input", async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) {
    return res.status(400).json({ error: "Voice transcript text is required" });
  }

  if (!ai) {
    return res.json(simulateVoiceFallback(transcript));
  }

  try {
    const prompt = `You are the Voice-Alignment Intake Agent for "kairos.ai".
A rebel has spoken this voice request to schedule a new task:
"${transcript}"

Your job is to structure this spoken message into a detailed, ready-to-use task with:
1. title: Elegant short label (e.g. "Prepare product guidelines")
2. description: Context and main purpose derived from speech
3. priority: "low", "medium", "high", or "critical" (evaluate based on tone and key words like urgent, fast, asap, whenever)
4. estimatedHours: Estimated duration as decimal number of hours (default to 1.5 if not clear)
5. subtasks: Array of subtask objects which represent actual split milestones needed to complete this task. Each has 'title' and 'durationMinutes'.

Respond with ONLY valid structured JSON. Do NOT wrap in markdown or explanation.`;

    const config = {
      systemInstruction: "You capture voice transcripts and convert them into structured Kairos.ai task milestones.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A concise display heading for the task" },
          description: { type: Type.STRING, description: "Detailed action description and motivation" },
          priority: { type: Type.STRING, enum: ["low", "medium", "high", "critical"], description: "The calculated urgency of this temporal node" },
          estimatedHours: { type: Type.NUMBER, description: "Total predicted hour capacity (e.g., 2.5)" },
          subtasks: {
            type: Type.ARRAY,
            description: "Breakdown milestones derived from speech",
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Descriptive label of the subtask block" },
                durationMinutes: { type: Type.NUMBER, description: "Block length (typically 15, 30, or 45 min)" }
              },
              required: ["title", "durationMinutes"]
            }
          }
        },
        required: ["title", "description", "priority", "estimatedHours", "subtasks"]
      }
    };

    const response = await generateContentWithFallback(ai, prompt, config);
    const text = response.text;
    if (!text) throw new Error("No response");
    const result = JSON.parse(text.trim());
    return res.json(result);
  } catch (error: any) {
    console.error("Voice input AI parser error (returning fallback):", error);
    return res.json(simulateVoiceFallback(transcript));
  }
});

// 6. True Context-Hand-Off Multi-Agent Pipeline
app.post("/api/multi-agent-pipeline", async (req, res) => {
  const { userPrompt, energy, focus } = req.body;
  if (!userPrompt) {
    return res.status(400).json({ error: "userPrompt text is required for multi-agent synthesis" });
  }

  const userVigor = energy !== undefined ? Number(energy) : 5;
  const userFocus = focus !== undefined ? Number(focus) : 5;

  if (!ai) {
    return res.json(simulateMultiAgentFallback(userPrompt, userVigor, userFocus));
  }

  try {
    console.log("🦾 Initiating Multi-Agent Temporal Orchestration Pipeline...");

    // Agent 1: Intake & Categorization Agent
    const intakePrompt = `Intake & Categorization Agent:
Parse this raw input from a time-rebel: "${userPrompt}"
Identify:
- A concise, high-impact title
- A helpful description outlining the context
- A template classification (e.g. "Interview Preparation", "Financial Reminder", "Standard Milestone")
- Urgency/Priority: "low", "medium", "high", or "critical"

Respond in strictly valid JSON matching the schema.`;

    const intakeConfig = {
      systemInstruction: "You are the Intake Agent. Categorize tasks and detect priorities.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ["low", "medium", "high", "critical"] }
        },
        required: ["title", "description", "category", "priority"]
      }
    };

    const intakeResp = await generateContentWithFallback(ai, intakePrompt, intakeConfig);
    const intakeText = intakeResp.text;
    if (!intakeText) throw new Error("Intake Agent output empty");
    const intakeResult = JSON.parse(intakeText.trim());

    console.log("➡️ Agent 1 Hand-Off. Intake output:", intakeResult);

    // Agent 2: AI Decomposition Agent
    const decompPrompt = `Decomposition Agent:
Our Intake Agent categorized this task:
Title: "${intakeResult.title}"
Category: "${intakeResult.category}"
Priority: "${intakeResult.priority}"
Context: "${intakeResult.description}"

Decompose this task into 3 to 5 highly structured, actionable subtasks. Ensure each has:
- A clean, specific title
- durationMinutes (usually 15, 30, or 45 min)

Respond in strictly valid JSON matching the schema.`;

    const decompConfig = {
      systemInstruction: "You are the AI Decomposition Agent. Break complex milestones into highly granular actions.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subtasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                durationMinutes: { type: Type.NUMBER }
              },
              required: ["title", "durationMinutes"]
            }
          }
        },
        required: ["subtasks"]
      }
    };

    const decompResp = await generateContentWithFallback(ai, decompPrompt, decompConfig);
    const decompText = decompResp.text;
    if (!decompText) throw new Error("Decomposition Agent output empty");
    const decompResult = JSON.parse(decompText.trim());

    console.log("➡️ Agent 2 Hand-Off. Decomposition output:", decompResult);

    // Agent 3: Mood-Aware Scheduler Agent
    // Incorporates user vigor/focus levels and suggests calendar-ready start/end times.
    const schedulerPrompt = `Scheduler Agent:
We have structured details:
Title: "${intakeResult.title}"
Decomposed Subtasks: ${JSON.stringify(decompResult.subtasks)}
User current state: Physical Vigor (Energy): ${userVigor}/10, Mental Alertness (Focus): ${userFocus}/10

Advise whether we should make mood-aware schedule adjustments or reorder milestones. Suggest a motivational oracle guideline.
Provide estimated hours and recommended calendar bounds starting from now.`;

    const schedulerConfig = {
      systemInstruction: "You are the Scheduler Agent. Restructure and adjust timelines depending on the user's focus/energy parameters.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          oracleAdvice: { type: Type.STRING },
          recommendedEstimatedHours: { type: Type.NUMBER },
          suggestedMilestoneOrder: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["oracleAdvice", "recommendedEstimatedHours"]
      }
    };

    const schedulerResp = await generateContentWithFallback(ai, schedulerPrompt, schedulerConfig);
    const schedulerText = schedulerResp.text;
    if (!schedulerText) throw new Error("Scheduler Agent output empty");
    const schedulerResult = JSON.parse(schedulerText.trim());

    console.log("➡️ Agent 3 Hand-Off. Scheduler output:", schedulerResult);

    // Agent 4: Risk Sentinel Agent (Safeguard)
    const safeguardPrompt = `Risk Sentinel Agent:
Review complete synthesized task nodes prior to final timeline commitment:
Task: "${intakeResult.title}"
Subtasks: ${JSON.stringify(decompResult.subtasks)}
Advice: "${schedulerResult.oracleAdvice}"

Detect potential procrastination risks or external blockage. Pre-draft a firm but polite unblock alert that can be dispatched immediately to collaborators.`;

    const safeguardConfig = {
      systemInstruction: "You are the Risk Sentinel Agent. Preemptively draft blocker alerts and compliance protections.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          procrastinationRisk: { type: Type.STRING, description: "A summary warning on why they might delay this specific task" },
          preDraftedUnblockAlert: { type: Type.STRING, description: "A short, crisp 50-word message to dispatch" }
        },
        required: ["procrastinationRisk", "preDraftedUnblockAlert"]
      }
    };

    const safeguardResp = await generateContentWithFallback(ai, safeguardPrompt, safeguardConfig);
    const safeguardText = safeguardResp.text;
    if (!safeguardText) throw new Error("Safeguard Agent output empty");
    const safeguardResult = JSON.parse(safeguardText.trim());

    console.log("✅ Multi-Agent pipeline orchestration successfully finalized!");

    // Construct unified synthesized response passing from agent to agent!
    return res.json({
      title: intakeResult.title,
      description: intakeResult.description,
      category: intakeResult.category,
      priority: intakeResult.priority,
      subtasks: decompResult.subtasks,
      energy: userVigor,
      focus: userFocus,
      oracleAdvice: schedulerResult.oracleAdvice,
      estimatedHours: schedulerResult.recommendedEstimatedHours || 1.5,
      procrastinationRisk: safeguardResult.procrastinationRisk,
      unblockDraftAlert: safeguardResult.preDraftedUnblockAlert
    });

  } catch (error: any) {
    console.error("Multi-Agent pipeline failure (returning graceful simulated fallback):", error);
    return res.json(simulateMultiAgentFallback(userPrompt, userVigor, userFocus));
  }
});

// --- HELPER FALLBACK GENERATORS (when API keys are missing or error out) ---
function simulateMoodFallback(energy: number, focus: number, tasks: any[] = []) {
  const recommendedTaskIds = (tasks || []).map(t => t.id).slice(0, 3);
  let advice = "The Loom indicates a transition period. Harmonize your vital forces before starting.";
  if (energy <= 4 && focus <= 4) {
    advice = "⚠️ Physical and cognitive energies are dim. The Sentinel advises gentle retrospectives or clearing quick low-cognitive blockers first.";
  } else if (energy >= 7 && focus >= 7) {
    advice = "⚡ Vigor and focus are masterfully aligned! Attack your high-importance critical nodes now; the speed-vessels are yours!";
  } else if (focus >= 7) {
    advice = "🧠 Analytical focus is sharp, but physical energy is reserved. Align quiet code-architecture reviews, drafting specifications, or structured roadmap planning.";
  } else if (energy >= 7) {
    advice = "⚔️ Motor engagement is high, but intellectual focus is drifting. Address physical setup chores, file cleanup sweeps, or quick template reminders.";
  }
  return {
    advice,
    recommendedTaskIds
  };
}

function simulateVoiceFallback(transcript: string) {
  let priority: "low" | "medium" | "high" | "critical" = "medium";
  const lower = transcript.toLowerCase();
  if (lower.includes("urgent") || lower.includes("critical") || lower.includes("asap") || lower.includes("fast")) {
    priority = "critical";
  } else if (lower.includes("high") || lower.includes("priority")) {
    priority = "high";
  } else if (lower.includes("easy") || lower.includes("low")) {
    priority = "low";
  }

  return {
    title: transcript.length > 50 ? transcript.substring(0, 47) + "..." : transcript,
    description: `Parsed from voice feed: "${transcript}"`,
    priority,
    estimatedHours: 1.5,
    subtasks: [
      { title: "Define initial parameters of spoken request", durationMinutes: 30, completed: false },
      { title: "Develop high-integrity prototype block", durationMinutes: 60, completed: false }
    ]
  };
}
function simulateUnblockFallback(taskTitle: string, blockedOnName: string, reason: string) {
  return {
    draftedMessage: `Hi ${blockedOnName}, the scythe of time swings close on "${taskTitle}". I'm stuck because: ${reason}. Could you help unblock this as soon as you're able? Appreciate it!`
  };
}

function simulateSprintFallback(title: string) {
  return {
    sprintTitle: `Raw Skeleton MVP of: ${title}`,
    milestones: [
      "Purge all secondary options. Write a 1-sentence description of the core value.",
      "Sprint 4 minutes: Code/Assemble the bare structure. Absolutely NO style or polishing allowed.",
      "Sprint 3 minutes: Complete the single primary requirement. Do not test corner cases.",
      "Final 3 minutes: Review, zip, and deliver. Outrun the countdown!"
    ]
  };
}

function simulateAutopsyFallback(taskTitle: string, userExplanation?: string) {
  const explanation = userExplanation || "No explanation presented (Silent failure).";
  return {
    failureReasonAnalysis: `Post-Mortem completed on: "${taskTitle}". 
    The subject succumbed to 'The Optimism Gambler' Procrastination DNA. Relying on the false hope of 'plenty of time tomorrow,' you ignored the quiet ticking of the scythe. Your reasoning "${explanation}" reveals a fatal underestimation of external dependencies and active distraction costs. Let it be known: time does not halt.`,
    actionableCommitment: "I commit to breaking all future tasks into sub-60-minute milestones immediately upon receipt, and will message collaborators at least 4 hours before the ultimate deadline under penalty of extreme remorse."
  };
}

function simulateMultiAgentFallback(userPrompt: string, energy: number, focus: number) {
  let category = "Standard Milestone";
  let priority: "low" | "medium" | "high" | "critical" = "medium";
  const lower = userPrompt.toLowerCase();

  if (lower.includes("interview") || lower.includes("job") || lower.includes("prepare")) {
    category = "Interview Preparation";
    priority = "high";
  } else if (lower.includes("bill") || lower.includes("pay") || lower.includes("invoice") || lower.includes("rent")) {
    category = "Financial Reminder";
    priority = "critical";
  }

  const subtasks = category === "Interview Preparation" 
    ? [
        { title: "Review corporate strategy and culture logs", durationMinutes: 30 },
        { title: "Solve key algorithmic focus milestones", durationMinutes: 45 },
        { title: "Formulate rigorous questions for interviewers", durationMinutes: 15 }
      ]
    : category === "Financial Reminder"
    ? [
        { title: "Locate digital ledger/invoice copy", durationMinutes: 15 },
        { title: "Verify transaction ledger balances", durationMinutes: 15 },
        { title: "Dispatch financial tribute draft", durationMinutes: 15 }
      ]
    : [
        { title: "Intake parameters of request", durationMinutes: 30 },
        { title: "Conduct focus block execution", durationMinutes: 45 }
      ];

  const adviceList = [
    "Your current mental stamina supports direct task division. Tackle these sequentially.",
    "A fine breeze. Proceed through milestones with high posture and absolute resolve.",
    "Attention levels are nominal. Avoid stray thoughts of Lethe and focus on the current node."
  ];

  return {
    title: userPrompt.length > 50 ? userPrompt.substring(0, 47) + "..." : userPrompt,
    description: `Multi-agent synthesized context from: "${userPrompt}"`,
    category,
    priority,
    subtasks,
    energy,
    focus,
    oracleAdvice: adviceList[Math.floor(Math.random() * adviceList.length)],
    estimatedHours: Number((subtasks.reduce((sum, st) => sum + st.durationMinutes, 0) / 60).toFixed(1)),
    procrastinationRisk: "Without strict boundaries, mind-wandering or recursive planning may push this schedule outwards by 1.5 focus hours.",
    unblockDraftAlert: `ALERT: I have scheduled work for "${userPrompt.substring(0,25)}...". Please stand by to clear blocks as required.`
  };
}

// 5. Connect Vite middleware in development vs Static assets in Production + WS upgrades
async function startWeb() {
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Handle server upgrade request for `/ws-live` WebSocket endpoint
  server.on("upgrade", (request, socket, head) => {
    const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : "";
    if (pathname === "/ws-live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs) => {
    console.log("🎙️ New client connected to KAIROS Live Vocal Proxy...");

    if (!ai) {
      console.warn("⚠️ Cannot initialize Live API without GEMINI_API_KEY. Activating simulated smart voice oracle.");
      clientWs.on("message", (data) => {
        // Echo simple dummy reply or simulate audio feedback on 2-second timeout
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.text) {
            setTimeout(() => {
              clientWs.send(JSON.stringify({ text: `[Oracle Simulation] Spoken request aligns with your temporal map. I have registered: "${parsed.text}"` }));
            }, 1000);
          }
        } catch {
          // Silent catch for raw binaries
        }
      });
      return;
    }

    try {
      const session: any = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: ["audio" as any],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }
          },
          systemInstruction: "You are the vocal Chronos Alchemist for kairos.ai. You help rebels with high-tension speech alignment and scheduling. Answer concisely, always keeping of the epic myth-theme."
        } as any,
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (text) {
              clientWs.send(JSON.stringify({ text }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          }
        }
      } as any);

      clientWs.on("message", (data: any) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.audio) {
            session.sendRealtimeInput({
              audio: { data: msg.audio, mimeType: "audio/pcm;rate=16000" }
            });
          }
        } catch (err) {
          console.error("Live WebSockets parsing client signal failed:", err);
        }
      });

      clientWs.on("close", () => {
        console.log("🎙️ Client disconnected from Live API, closing proxy.");
        try {
          session.close();
        } catch (e) {
          console.error("Error closing live session:", e);
        }
      });

    } catch (err: any) {
      console.error("Error booting Gemini Live Session:", err);
      clientWs.send(JSON.stringify({ error: err.message || "Failed connecting to Live session on server." }));
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🗡️ KAIROS full-stack engine safely bound and listening on http://0.0.0.0:${PORT}`);
  });
}

startWeb();