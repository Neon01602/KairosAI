import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  projectId: "",
  appId: "",
  apiKey: "",
  authDomain: "",
  firestoreDatabaseId: "",
  storageBucket: "",
  messagingSenderId: ""
};

const app = initializeApp(firebaseConfig);
// Core database initialization utilizing the custom databaseId provided by the platform workspace.
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/calendar.events");
googleProvider.addScope("https://www.googleapis.com/auth/calendar.readonly");

export { app, db, auth, googleProvider };

