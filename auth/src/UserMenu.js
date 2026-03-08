import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getUser, getToken, clearAuth, isLoggedIn } from "./authUtils";
import { authApi } from "./api";
import "./UserMenu.css";

const UserMenu = () => {
  const navigate     = useNavigate();
  const dropdownRef  = useRef(null);

  const [user,    setUser]    = useState(getUser());
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);

  // Re-read auth state whenever authChanged fires (login / logout in another MFE)
  useEffect(() => {
    const onAuthChange = () => setUser(getUser());
    window.addEventListener("authChanged", onAuthChange);
    return () => window.removeEventListener("authChanged", onAuthChange);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Esc
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    setOpen(false);
    try {
      await authApi.logout(getToken());
    } catch {/* ignore network errors on logout */}
    clearAuth();
    setLoading(false);
    navigate("/");
  };

  const goTo = (path) => { setOpen(false); navigate(path); };

  /* ── Logged OUT state ─────────────────────────────────── */
  if (!user) {
    return (
      <button className="user-menu-login-btn" onClick={() => navigate("/login")}>
        <span className="login-icon">👤</span>
        <span className="login-label">Login</span>
      </button>
    );
  }

  /* ── Logged IN state ──────────────────────────────────── */
  return (
    <div className="user-menu" ref={dropdownRef}>
      {/* Trigger */}
      <button
        className={`user-menu-trigger ${open ? "active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div className="user-avatar">{user.avatar}</div>
        <div className="user-trigger-info">
          <span className="user-trigger-name">{user.displayName.split(" ")[0]}</span>
          <span className="user-trigger-label">My Account</span>
        </div>
        <span className={`user-chevron ${open ? "up" : ""}`}>›</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="user-dropdown" role="menu">
          {/* Header */}
          <div className="dropdown-header">
            <div className="dropdown-avatar">{user.avatar}</div>
            <div>
              <div className="dropdown-name">{user.displayName}</div>
              <div className="dropdown-email">{user.email}</div>
              {user.role === "admin" && (
                <span className="dropdown-role-badge">Admin</span>
              )}
            </div>
          </div>

          <div className="dropdown-divider" />

          {/* Menu items */}
          <button className="dropdown-item" onClick={() => goTo("/")} role="menuitem">
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

          <button
            className="dropdown-item logout-item"
            onClick={handleLogout}
            role="menuitem"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
