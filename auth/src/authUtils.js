// Auth state helpers — backed by Firebase Auth.
// Firebase persists session in IndexedDB, so state survives page reloads.
// All MFEs share the same Firebase instance (MF singleton), so
// auth.currentUser is consistent everywhere.

import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

export const getUser    = ()           => auth.currentUser;
export const isLoggedIn = ()           => auth.currentUser !== null;
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);
