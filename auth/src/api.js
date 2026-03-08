// Firebase Auth + Firestore — replaces the old Express backend auth.
// Demo users are auto-provisioned in Firebase Auth on first sign-in.

import { auth, db } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

// ── Demo user registry ─────────────────────────────────────────
// Used to auto-create accounts on first sign-in so testers don't
// need to manually set up Firebase Auth users.
const DEMO_USERS = {
  "john.doe":     { password: "pass123",   displayName: "John Doe",     avatar: "JD", role: "admin" },
  "jane.smith":   { password: "pass123",   displayName: "Jane Smith",   avatar: "JS", role: "user"  },
  "alex.jones":   { password: "pass123",   displayName: "Alex Jones",   avatar: "AJ", role: "user"  },
  "sarah.wilson": { password: "secure456", displayName: "Sarah Wilson", avatar: "SW", role: "user"  },
  "mike.chen":    { password: "secure456", displayName: "Mike Chen",    avatar: "MC", role: "user"  },
  "emma.davis":   { password: "pass123",   displayName: "Emma Davis",   avatar: "ED", role: "user"  },
  "ryan.taylor":  { password: "pass123",   displayName: "Ryan Taylor",  avatar: "RT", role: "user"  },
  "lisa.brown":   { password: "secret789", displayName: "Lisa Brown",   avatar: "LB", role: "user"  },
  "demo":         { password: "demo",      displayName: "Demo User",    avatar: "DU", role: "user"  },
};

// Convert username → email (append @shopzone.io if no @ present)
const toEmail = (username) =>
  username.includes("@") ? username : `${username}@shopzone.io`;

/**
 * Create or merge a /users/{uid} document.
 * Called after every sign-in so the profile always exists in Firestore.
 * Uses setDoc with merge:true so subsequent logins update stale fields.
 */
const saveProfile = async (firebaseUser, extra = {}) => {
  try {
    const provider = firebaseUser.providerData?.[0]?.providerId || "password";
    const rawName  = extra.displayName || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User";
    const avatar   = extra.avatar || rawName.slice(0, 2).toUpperCase();

    await setDoc(
      doc(db, "users", firebaseUser.uid),
      {
        uid:         firebaseUser.uid,
        email:       firebaseUser.email,
        displayName: rawName,
        photoURL:    extra.photoURL || firebaseUser.photoURL || null,
        avatar,
        role:        extra.role || "user",
        provider,
        updatedAt:   new Date().toISOString(),
        // createdAt only set on first write (merge won't overwrite if exists)
      },
      { merge: true }   // ← safe to call on every login
    );

    // On first ever login, also stamp createdAt
    const snap = await getDoc(doc(db, "users", firebaseUser.uid));
    if (snap.exists() && !snap.data().createdAt) {
      await setDoc(
        doc(db, "users", firebaseUser.uid),
        { createdAt: new Date().toISOString() },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn("[ShopZone] Firestore profile save failed:", err.message);
  }
};

const mapError = (code) => {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-email":
      return "Invalid username or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection.";
    default:
      return "Login failed. Please try again.";
  }
};

export const authApi = {
  // ── Login ──────────────────────────────────────────────────
  login: async (username, password) => {
    const raw   = username.trim();
    const email = toEmail(raw);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await saveProfile(cred.user);                        // resilient — won't throw
      let profile = {};
      try {
        const profileSnap = await getDoc(doc(db, "users", cred.user.uid));
        profile = profileSnap.data() || {};
      } catch (err) {
        console.warn("[ShopZone] Could not read Firestore profile:", err.message);
      }
      return {
        uid:         cred.user.uid,
        email:       cred.user.email,
        displayName: profile.displayName || cred.user.displayName || raw,
        avatar:      profile.avatar || raw.slice(0, 2).toUpperCase(),
        role:        profile.role || "user",
      };
    } catch (err) {
      // Auto-provision demo users that don't exist in Firebase Auth yet
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        const key  = raw.toLowerCase();
        const demo = DEMO_USERS[key];
        if (demo && demo.password === password) {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(cred.user, { displayName: demo.displayName });
          await saveProfile(cred.user, demo);               // resilient
          return { uid: cred.user.uid, email, ...demo };
        }
      }
      throw new Error(mapError(err.code));
    }
  },

  // ── Google Sign-In ─────────────────────────────────────────
  googleLogin: async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    await saveProfile(cred.user, {
      displayName: cred.user.displayName,
      photoURL:    cred.user.photoURL,
      provider:    "google.com",
    });
    return {
      uid:         cred.user.uid,
      email:       cred.user.email,
      displayName: cred.user.displayName,
      photoURL:    cred.user.photoURL,
    };
  },

  // ── Logout ─────────────────────────────────────────────────
  logout: async () => signOut(auth),

  // ── Fetch Firestore profile ─────────────────────────────────
  getProfile: async (uid) => {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  },
};
