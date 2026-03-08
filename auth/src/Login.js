import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authApi } from "./api";
import { setAuth, isLoggedIn } from "./authUtils";
import "./Login.css";

const DEMO_CREDENTIALS = [
  { username: "john.doe",     password: "pass123",   displayName: "John Doe"     },
  { username: "jane.smith",   password: "pass123",   displayName: "Jane Smith"   },
  { username: "sarah.wilson", password: "secure456", displayName: "Sarah Wilson" },
  { username: "mike.chen",    password: "secure456", displayName: "Mike Chen"    },
  { username: "emma.davis",   password: "pass123",   displayName: "Emma Davis"   },
  { username: "demo",         password: "demo",      displayName: "Demo User"    },
];

const Login = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [shake,    setShake]    = useState(false);

  // Already logged in → redirect
  useEffect(() => {
    if (isLoggedIn()) navigate(from, { replace: true });
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      triggerShake();
      return;
    }
    try {
      setLoading(true);
      setError("");
      const { token, user } = await authApi.login(username.trim(), password);
      setAuth(token, user);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Invalid username or password.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (cred) => {
    setUsername(cred.username);
    setPassword(cred.password);
    setError("");
  };

  return (
    <div className="login-page">
      {/* ── Left brand panel ── */}
      <div className="login-brand">
        <div className="brand-inner">
          <div className="brand-logo">🛍️</div>
          <h1 className="brand-name">ShopZone</h1>
          <p className="brand-tagline">
            Your one-stop shop for<br />electronics, audio &amp; more
          </p>
          <ul className="brand-perks">
            <li>✔ 32+ curated products</li>
            <li>✔ 6 categories</li>
            <li>✔ Free delivery on all orders</li>
            <li>✔ 30-day easy returns</li>
          </ul>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-card-header">
            <h2>Welcome back 👋</h2>
            <p>Sign in to your ShopZone account</p>
          </div>

          <form
            className={`login-form ${shake ? "shake" : ""}`}
            onSubmit={handleSubmit}
            noValidate
          >
            {/* Error banner */}
            {error && (
              <div className="login-error" role="alert">
                ⚠️ {error}
              </div>
            )}

            {/* Username */}
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  id="username"
                  type="text"
                  placeholder="e.g. john.doe"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-login"
              disabled={loading}
            >
              {loading ? <span className="btn-spinner" /> : "Sign In"}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="demo-section">
            <div className="demo-label">
              <span className="demo-line" />
              <span>Demo Accounts</span>
              <span className="demo-line" />
            </div>
            <div className="demo-grid">
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.username}
                  className="demo-chip"
                  onClick={() => fillDemo(cred)}
                  title={`${cred.username} / ${cred.password}`}
                >
                  <span className="demo-name">{cred.displayName}</span>
                  <span className="demo-user">@{cred.username}</span>
                </button>
              ))}
            </div>
            <p className="demo-hint">
              Click any account to auto-fill credentials, then press Sign In.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
