import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Tooltip from "@mui/material/Tooltip";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import theme from "./theme";

// Lazy-load nested remotes
const Search   = React.lazy(() => import("searchRemote/Search"));
const UserMenu = React.lazy(() => import("authRemote/UserMenu"));

const SearchFallback = () => (
  <Box
    sx={{
      flex: 1,
      maxWidth: 540,
      mx: 2,
      bgcolor: "rgba(255,255,255,0.15)",
      borderRadius: 1,
      height: 40,
      display: "flex",
      alignItems: "center",
      px: 2,
    }}
  >
    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}>
      🔍&nbsp; Search for products, brands and more
    </Typography>
  </Box>
);

const Navigation = () => {
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  // ── Real-time cart count ──────────────────────────────────
  useEffect(() => {
    let cartUnsub = null;
    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (cartUnsub) { cartUnsub(); cartUnsub = null; }
      if (!user) { setCartCount(0); return; }
      cartUnsub = onSnapshot(
        collection(db, "carts", user.uid, "items"),
        (snap) => {
          const total = snap.docs.reduce((s, d) => s + (d.data().quantity || 0), 0);
          setCartCount(total);
        },
        (err) => console.error("[ShopZone] Cart count error:", err.message)
      );
    });
    return () => { authUnsub(); if (cartUnsub) cartUnsub(); };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar
        position="sticky"
        sx={{ bgcolor: "secondary.main", top: 0, zIndex: 1100 }}
      >
        <Toolbar sx={{ gap: 1, minHeight: { xs: 60, sm: 64 }, px: { xs: 2, md: 3 } }}>
          {/* ── Logo ── */}
          <Box
            component={Link}
            to="/"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              textDecoration: "none",
              mr: 1,
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                fontSize: "1.5rem",
                lineHeight: 1,
              }}
            >
              🛍️
            </Typography>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "1.05rem",
                  letterSpacing: "0.5px",
                  lineHeight: 1.1,
                }}
              >
                ShopZone
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.65)", fontSize: "0.6rem", lineHeight: 1 }}
              >
                India's Fashion Destination
              </Typography>
            </Box>
          </Box>

          {/* ── Search MFE ── */}
          <Box sx={{ flex: 1, maxWidth: 560, mx: { xs: 0.5, md: 2 } }}>
            <React.Suspense fallback={<SearchFallback />}>
              <Search />
            </React.Suspense>
          </Box>

          {/* ── Actions ── */}
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 }, ml: "auto", flexShrink: 0 }}>
            {/* Cart */}
            <Tooltip title="Shopping Bag">
              <IconButton
                component={Link}
                to="/cart"
                sx={{
                  color: "#fff",
                  flexDirection: "column",
                  gap: 0,
                  borderRadius: 1,
                  px: 1,
                  py: 0.5,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
                }}
              >
                <Badge
                  badgeContent={cartCount}
                  max={99}
                  sx={{
                    "& .MuiBadge-badge": {
                      bgcolor: "primary.main",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.65rem",
                    },
                  }}
                >
                  <ShoppingBagOutlinedIcon sx={{ fontSize: 22 }} />
                </Badge>
                <Typography variant="caption" sx={{ color: "#fff", fontSize: "0.65rem", lineHeight: 1, mt: 0.25 }}>
                  Bag
                </Typography>
              </IconButton>
            </Tooltip>

            {/* User Menu from Auth MFE */}
            <React.Suspense
              fallback={
                <Box sx={{ px: 1 }}>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>Loading…</Typography>
                </Box>
              }
            >
              <UserMenu />
            </React.Suspense>
          </Box>
        </Toolbar>
      </AppBar>
    </ThemeProvider>
  );
};

export default Navigation;
