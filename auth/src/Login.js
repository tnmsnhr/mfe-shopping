import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { authApi } from "./api";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
const DEMO_CREDENTIALS = [
  { username: "john.doe",     password: "pass123",   displayName: "John Doe",     isAdmin: true  },
  { username: "jane.smith",   password: "pass123",   displayName: "Jane Smith",   isAdmin: false },
  { username: "sarah.wilson", password: "secure456", displayName: "Sarah Wilson", isAdmin: false },
  { username: "mike.chen",    password: "secure456", displayName: "Mike Chen",    isAdmin: false },
  { username: "emma.davis",   password: "pass123",   displayName: "Emma Davis",   isAdmin: false },
  { username: "demo",         password: "demo",      displayName: "Demo User",    isAdmin: false },
];

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const [username,      setUsername]      = useState("");
  const [password,      setPassword]      = useState("");
  const [showPass,      setShowPass]      = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,         setError]         = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) navigate(from, { replace: true });
    });
    return unsub;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      await authApi.login(username.trim(), password);
    } catch (err) {
      setError(err.message || "Invalid username or password.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError("");
      await authApi.googleLogin();
    } catch (err) {
      setError(err.message || "Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const fillDemo = (cred) => {
    setUsername(cred.username);
    setPassword(cred.password);
    setError("");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
          display: "flex",
          bgcolor: "background.default",
        }}
      >
        {/* ── Left brand panel ── */}
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "flex-start",
            width: 380,
            flexShrink: 0,
            background: "linear-gradient(160deg, #282c3f 0%, #1a1d2e 100%)",
            px: 5,
            py: 6,
          }}
        >
          <Typography sx={{ fontSize: "3rem", mb: 1 }}>🛍️</Typography>
          <Typography
            variant="h4"
            sx={{ color: "#fff", fontWeight: 800, mb: 1, letterSpacing: "-0.5px" }}
          >
            ShopZone
          </Typography>
          <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.65)", mb: 4, lineHeight: 1.6 }}>
            Your one-stop shop for<br />electronics, audio &amp; more
          </Typography>
          {[
            "32+ curated products across 6 categories",
            "Free delivery on all orders",
            "30-day easy returns",
            "Cart & wishlist synced to cloud",
          ].map((perk) => (
            <Box key={perk} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <CheckCircleOutlineIcon sx={{ color: "primary.main", fontSize: 18 }} />
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem" }}>
                {perk}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* ── Right form panel ── */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: { xs: 2, sm: 4 },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              maxWidth: 440,
              p: { xs: 3, sm: 4 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              Welcome back 👋
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sign in to your ShopZone account
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                fullWidth
                label="Username"
                placeholder="e.g. john.doe"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                disabled={loading}
                autoFocus
                autoComplete="username"
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPass ? "text" : "password"}
                placeholder="Your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                disabled={loading}
                autoComplete="current-password"
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPass((v) => !v)}
                        edge="end"
                        size="small"
                        tabIndex={-1}
                      >
                        {showPass
                          ? <VisibilityOffOutlinedIcon fontSize="small" />
                          : <VisibilityOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                disabled={loading || googleLoading}
                sx={{ mb: 2, height: 48 }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : "Sign In"}
              </Button>
            </Box>

            <Divider sx={{ my: 2 }}>
              <Typography variant="caption" color="text.secondary">or</Typography>
            </Divider>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              startIcon={googleLoading ? <CircularProgress size={18} /> : <GoogleIcon />}
              sx={{
                height: 48,
                mb: 3,
                borderColor: "divider",
                color: "text.primary",
                "&:hover": { borderColor: "#dadce0", bgcolor: "#f8f9fa" },
              }}
            >
              Continue with Google
            </Button>

            {/* Demo accounts */}
            <Box sx={{ bgcolor: "background.default", borderRadius: 2, p: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", textAlign: "center", mb: 1.5, fontWeight: 600, letterSpacing: "0.5px" }}
              >
                DEMO ACCOUNTS
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, justifyContent: "center" }}>
                {DEMO_CREDENTIALS.map((cred) => (
                  <Chip
                    key={cred.username}
                    label={cred.displayName}
                    size="small"
                    color={cred.isAdmin ? "primary" : "default"}
                    variant={cred.isAdmin ? "filled" : "outlined"}
                    onClick={() => fillDemo(cred)}
                    sx={{ cursor: "pointer", fontWeight: 600, fontSize: "0.75rem" }}
                  />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", mt: 1.5 }}>
                Click any chip to auto-fill → then Sign In
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>
  );
};

export default Login;
