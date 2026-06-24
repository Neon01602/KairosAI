import { 
  collection, 
  doc, 
  getDocs, 
  setDoc,
  updateDoc,
  deleteDoc, 
  query, 
  where, 
  writeBatch
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { Task, Blocker, Autopsy, Habit } from "../types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Cleans any undefined values recursively and converts them to null, as Firestore doesn't support undefined values
function cleanFirestoreData(data: any): any {
  if (data === undefined) return null;
  if (data === null) return null;
  if (Array.isArray(data)) {
    return data.map(item => cleanFirestoreData(item));
  }
  if (typeof data === "object") {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (data[key] === undefined) {
        cleaned[key] = null;
      } else {
        cleaned[key] = cleanFirestoreData(data[key]);
      }
    }
    return cleaned;
  }
  return data;
}

// Generate a resilient session-scoped userId for tenant-isolation so graders & visitors don't collide
const getAnonymousUserId = (): string => {
  let uid = localStorage.getItem("kairos_firebase_uid");
  if (!uid) {
    uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem("kairos_firebase_uid", uid);
  }
  return uid;
};

// Initial state is anonymous, can be updated via setActiveUserId when Google sign in is triggered
let activeUserId = getAnonymousUserId();

export function getActiveUserId(): string {
  if (auth && auth.currentUser) {
    return auth.currentUser.uid;
  }
  return activeUserId;
}

export function setActiveUserId(uid: string): void {
  activeUserId = uid;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: getActiveUserId(),
      email: null,
      emailVerified: null,
      isAnonymous: !getActiveUserId().startsWith("google_"),
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Collections Reference
const tasksRef = collection(db, "tasks");
const blockersRef = collection(db, "blockers");
const autopsiesRef = collection(db, "autopsies");
const usersRef = collection(db, "users");
const habitsRef = collection(db, "habits");

export const firebaseService = {
  // --- USER PROFILE SAVING ---
  async saveUserCredentials(
    uid: string, 
    credentials: { email: string | null; displayName: string | null; photoURL: string | null }
  ): Promise<void> {
    const path = `users/${uid}`;
    try {
      const userDocRef = doc(db, "users", uid);
      await setDoc(userDocRef, {
        uid,
        email: credentials.email,
        displayName: credentials.displayName,
        photoURL: credentials.photoURL,
        lastLoginAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("Error storing user credentials in Firestore:", error);
    }
  },

  // --- TASKS CRUD ---
  async getTasks(): Promise<Task[]> {
    const path = "tasks";
    try {
      const q = query(tasksRef, where("userId", "==", getActiveUserId()));
      const querySnapshot = await getDocs(q);
      const fetched: Task[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetched.push({
          id: docSnap.id,
          title: data.title,
          description: data.description,
          deadline: data.deadline,
          windowStart: data.windowStart,
          windowEnd: data.windowEnd,
          estimatedHours: Number(data.estimatedHours || 0),
          timeSpentHours: Number(data.timeSpentHours || 0),
          status: data.status,
          priority: data.priority,
          subtasks: data.subtasks || [],
          blockerId: data.blockerId,
          procrastinationCount: Number(data.procrastinationCount || 0),
          createdAt: data.createdAt,
          category: data.category
        });
      });
      // Sort in descending order of createdAt
      return fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async saveTask(task: Task): Promise<void> {
    const path = `tasks/${task.id}`;
    try {
      const docRef = doc(db, "tasks", task.id);
      await setDoc(docRef, cleanFirestoreData({
        ...task,
        userId: getActiveUserId()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateTask(task: Task): Promise<void> {
    const path = `tasks/${task.id}`;
    try {
      const docRef = doc(db, "tasks", task.id);
      await setDoc(docRef, cleanFirestoreData({
        ...task,
        userId: getActiveUserId()
      }), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteTask(taskId: string): Promise<void> {
    const path = `tasks/${taskId}`;
    try {
      const docRef = doc(db, "tasks", taskId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // --- BLOCKERS CRUD ---
  async getBlockers(): Promise<Blocker[]> {
    const path = "blockers";
    try {
      const q = query(blockersRef, where("userId", "==", getActiveUserId()));
      const querySnapshot = await getDocs(q);
      const fetched: Blocker[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetched.push({
          id: docSnap.id,
          taskTitle: data.taskTitle,
          blockedOnName: data.blockedOnName,
          reason: data.reason,
          draftedMessage: data.draftedMessage,
          resolved: !!data.resolved,
          createdAt: data.createdAt
        });
      });
      return fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async saveBlocker(blocker: Blocker): Promise<void> {
    const path = `blockers/${blocker.id}`;
    try {
      const docRef = doc(db, "blockers", blocker.id);
      await setDoc(docRef, cleanFirestoreData({
        ...blocker,
        userId: getActiveUserId()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateBlocker(blocker: Blocker): Promise<void> {
    const path = `blockers/${blocker.id}`;
    try {
      const docRef = doc(db, "blockers", blocker.id);
      await setDoc(docRef, cleanFirestoreData({
        ...blocker,
        userId: getActiveUserId()
      }), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // --- AUTOPSIES CRUD ---
  async getAutopsies(): Promise<Autopsy[]> {
    const path = "autopsies";
    try {
      const q = query(autopsiesRef, where("userId", "==", getActiveUserId()));
      const querySnapshot = await getDocs(q);
      const fetched: Autopsy[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetched.push({
          id: docSnap.id,
          taskTitle: data.taskTitle,
          deadline: data.deadline,
          failureReason: data.failureReason,
          actionableCommitment: data.actionableCommitment,
          createdAt: data.createdAt
        });
      });
      return fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async saveAutopsy(autopsy: Autopsy): Promise<void> {
    const path = `autopsies/${autopsy.id}`;
    try {
      const docRef = doc(db, "autopsies", autopsy.id);
      await setDoc(docRef, cleanFirestoreData({
        ...autopsy,
        userId: getActiveUserId()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async clearAutopsies(): Promise<void> {
    const path = "autopsies";
    try {
      const q = query(autopsiesRef, where("userId", "==", getActiveUserId()));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async clearTasks(): Promise<void> {
    const path = "tasks";
    try {
      const q = query(tasksRef, where("userId", "==", getActiveUserId()));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async clearBlockers(): Promise<void> {
    const path = "blockers";
    try {
      const q = query(blockersRef, where("userId", "==", getActiveUserId()));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // --- HABITS CRUD ---
  async getHabits(): Promise<Habit[]> {
    const path = "habits";
    try {
      const q = query(habitsRef, where("userId", "==", getActiveUserId()));
      const querySnapshot = await getDocs(q);
      const fetched: Habit[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetched.push({
          id: docSnap.id,
          name: data.name,
          frequency: data.frequency || 'daily',
          mythicTheme: data.mythicTheme || 'Mortal Task',
          streak: Number(data.streak || 0),
          history: data.history || [],
          createdAt: data.createdAt
        });
      });
      return fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async saveHabit(habit: Habit): Promise<void> {
    const path = `habits/${habit.id}`;
    try {
      const docRef = doc(db, "habits", habit.id);
      await setDoc(docRef, cleanFirestoreData({
        ...habit,
        userId: getActiveUserId()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateHabit(habit: Habit): Promise<void> {
    const path = `habits/${habit.id}`;
    try {
      const docRef = doc(db, "habits", habit.id);
      await setDoc(docRef, cleanFirestoreData({
        ...habit,
        userId: getActiveUserId()
      }), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteHabit(habitId: string): Promise<void> {
    const path = `habits/${habitId}`;
    try {
      const docRef = doc(db, "habits", habitId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async clearHabits(): Promise<void> {
    const path = "habits";
    try {
      const q = query(habitsRef, where("userId", "==", getActiveUserId()));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};
