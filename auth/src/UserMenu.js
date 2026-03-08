import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { authApi } from "./api";
import "./UserMenu.css";

/** Auto-create a Firestore user profile if one does not exist yet.
 *  Handles both email/password users and Google (or any OAuth) users. */
const ensureProfile = async (firebaseUser) => {
  const ref  = doc(db, "users", firebaseUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const provider = firebaseUser.providerData?.[0]?.providerId || "password";
  const rawName  = firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User";
  const avatar   = rawName.slice(0, 2).toUpperCase();

  const profile = {
    uid:         firebaseUser.uid,
    email:       firebaseUser.email,
    displayName: rawName,
    photoURL:    firebaseUser.photoURL || null,
    avatar,
    role:        "user",
    provider,
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  };

  await setDoc(ref, profile);
  console.log("[ShopZone] ✅ Created Firestore profile for", firebaseUser.email);
  return profile;
};

const UserMenu = () => {
  const navigate    = useNavigate();
  const dropdownRef = useRef(null);

  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);

  // ── Subscribe to Firebase Auth state ───────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await ensureProfile(firebaseUser);
          setUser({
            uid:         firebaseUser.uid,
            email:       firebaseUser.email,
            displayName: profile.displayName,
            photoURL:    profile.photoURL || firebaseUser.photoURL || null,
            avatar:      profile.avatar,
            role:        profile.role || "user",
          });
        } catch (err) {
          console.warn("[ShopZone] Profile load error:", err.message);
          // Graceful fallback — still show the user as logged in
          const rawName = firebaseUser.displayName || firebaseUser.email || "User";
          setUser({
            uid:         firebaseUser.uid,
            email:       firebaseUser.email,
            displayName: rawName,
            photoURL:    firebaseUser.photoURL || null,
            avatar:      rawName.slice(0, 2).toUpperCase(),
            role:        "user",
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Close dropdown on outside click ────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Close on Esc ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await authApi.logout();
    navigate("/");
  };

  const goTo = (path) => { setOpen(false); navigate(path); };

  if (loading) return null;

  /* ── Logged OUT ────────────────────────────────────────────── */
  if (!user) {
    return (
      <button className="user-menu-login-btn" onClick={() => navigate("/login")}>
        <span className="login-icon">👤</span>
        <span className="login-label">Login</span>
      </button>
    );
  }

  /* ── Avatar: Google photo or initials ──────────────────────── */
  const AvatarDisplay = ({ size = 36, className = "" }) =>
    user.photoURL ? (
      <img
        src={user.photoURL}
        alt={user.displayName}
        referrerPolicy="no-referrer"
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
        className={className}
      />
    ) : (
      <div className={`user-avatar ${className}`}>{user.avatar}</div>
    );

  /* ── Logged IN ─────────────────────────────────────────────── */
  return (
    <div className="user-menu" ref={dropdownRef}>
      <button
        className={`user-menu-trigger ${open ? "active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <AvatarDisplay size={34} />
        <div className="user-trigger-info">
          <span className="user-trigger-name">{user.displayName.split(" ")[0]}</span>
          <span className="user-trigger-label">My Account</span>
        </div>
        <span className={`user-chevron ${open ? "up" : ""}`}>›</span>
      </button>

      {open && (
        <div className="user-dropdown" role="menu">
          <div className="dropdown-header">
            <AvatarDisplay size={42} className="dropdown-avatar-img" />
            <div>
              <div className="dropdown-name">{user.displayName}</div>
              <div className="dropdown-email">{user.email}</div>
              {user.role === "admin" && (
                <span className="dropdown-role-badge">Admin</span>
              )}
            </div>
          </div>

          <div className="dropdown-divider" />

          {user.role === "admin" && (
            <>
              <button className="dropdown-item admin-item" onClick={() => goTo("/admin")} role="menuitem">
                <span>🛠️</span> Admin Portal
              </button>
              <div className="dropdown-divider" />
            </>
          )}

          <button className="dropdown-item" onClick={() => goTo("/orders")} role="menuitem">
            <span>📦</span> My Orders
          </button>
          <button className="dropdown-item" onClick={() => goTo("/")} role="menuitem">
            <span>♡</span> Wishlist
          </button>
          <button className="dropdown-item" onClick={() => goTo("/")} role="menuitem">
            <span>🏠</span> Saved Addresses
          </button>
          <button className="dropdown-item" onClick={() => goTo("/")} role="menuitem">
            <span>💳</span> Payments
          </button>

          <div className="dropdown-divider" />

          <button className="dropdown-item logout-item" onClick={handleLogout} role="menuitem">
            <span>🚪</span> Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
