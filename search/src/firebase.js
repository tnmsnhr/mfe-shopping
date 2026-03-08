import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyBeDKUh-qMVnjazisfYTo0x7RhEf3uz8X0",
  authDomain:        "mfe-shopping.firebaseapp.com",
  projectId:         "mfe-shopping",
  storageBucket:     "mfe-shopping.firebasestorage.app",
  messagingSenderId: "862304142671",
  appId:             "1:862304142671:web:812619e086f0c48d75713a",
  measurementId:     "G-T7153RNW8S",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export default app;
