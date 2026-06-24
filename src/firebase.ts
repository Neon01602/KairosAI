import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  projectId: "solar-tranquility-2jwpf",
  appId: "1:723870722006:web:b5f2ec974d97275293a677",
  apiKey: "AIzaSyD7erCm2CgMQgmJU7ZbBBYoaYkVRtkrdYg",
  authDomain: "solar-tranquility-2jwpf.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-1ba8eb14-73b3-44b9-ab0a-9bbe44b1701c",
  storageBucket: "solar-tranquility-2jwpf.firebasestorage.app",
  messagingSenderId: "723870722006"
};

const app = initializeApp(firebaseConfig);
// Core database initialization utilizing the custom databaseId provided by the platform workspace.
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/calendar.events");
googleProvider.addScope("https://www.googleapis.com/auth/calendar.readonly");

export { app, db, auth, googleProvider };

