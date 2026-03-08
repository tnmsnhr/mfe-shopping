import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { authApi } from "./api";

import { ThemeProvider } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import theme from "./theme";

const ensureProfile = async (firebaseUser) => {
  const ref  = doc(db, "users", firebaseUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const provider = firebaseUser.providerData?.[0]?.providerId || "password";
  const rawName  = firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User";
  const avatar   = rawName.slice(0, 2).toUpperCase();

  const profile = {
    uid: firebaseUser.uid, email: firebaseUser.email,
    displayName: rawName, photoURL: firebaseUser.photoURL || null,
    avatar, role: "user", provider,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  await setDoc(ref, profile);
  return profile;
};

const UserMenu = () => {
  const navigate  = useNavigate();
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [anchor,  setAnchor]  = useState(null);
  const open = Boolean(anchor);

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
        } catch {
          const rawName = firebaseUser.displayName || firebaseUser.email || "User";
          setUser({
            uid: firebaseUser.uid, email: firebaseUser.email,
            displayName: rawName, photoURL: firebaseUser.photoURL || null,
            avatar: rawName.slice(0, 2).toUpperCase(), role: "user",
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleClose = () => setAnchor(null);
  const goTo = (path) => { handleClose(); navigate(path); };
  const handleLogout = async () => {
    handleClose();
    await authApi.logout();
    navigate("/");
  };

  if (loading) return null;

  // ── Not logged in ─────────────────────────────────────────
  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PersonOutlineIcon />}
          onClick={() => navigate("/login")}
          sx={{
            color: "#fff",
            borderColor: "rgba(255,255,255,0.6)",
            fontWeight: 700,
            "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.1)" },
          }}
        >
          Login
        </Button>
      </ThemeProvider>
    );
  }

  // ── Avatar helper ─────────────────────────────────────────
  const avatarProps = user.photoURL
    ? { src: user.photoURL, imgProps: { referrerPolicy: "no-referrer" } }
    : { children: user.avatar };

  const firstName = user.displayName.split(" ")[0];

  return (
    <ThemeProvider theme={theme}>
      {/* Trigger */}
      <Box
        component="button"
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          background: "none",
          border: "none",
          cursor: "pointer",
          borderRadius: 1,
          px: 1,
          py: 0.5,
          "&:hover": { bgcolor: "rgba(255,255,255,0.12)" },
          transition: "background .15s",
        }}
      >
        <Avatar
          {...avatarProps}
          sx={{
            width: 32,
            height: 32,
            fontSize: "0.75rem",
            fontWeight: 700,
            bgcolor: "primary.main",
          }}
        />
        <Box sx={{ textAlign: "left" }}>
          <Typography
            variant="body2"
            sx={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem", lineHeight: 1.1 }}
          >
            {firstName}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)", fontSize: "0.6rem", lineHeight: 1 }}>
            My Account
          </Typography>
        </Box>
        <KeyboardArrowDownIcon
          sx={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 18,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .2s",
          }}
        />
      </Box>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          elevation: 4,
          sx: {
            mt: 0.5,
            minWidth: 240,
            borderRadius: 2,
            overflow: "visible",
            border: "1px solid",
            borderColor: "divider",
            "& .MuiMenuItem-root": {
              px: 2,
              py: 1.25,
              gap: 1.5,
              "&:hover": { bgcolor: "rgba(255,63,108,0.06)" },
            },
          },
        }}
      >
        {/* Profile header */}
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            {...avatarProps}
            sx={{
              width: 44, height: 44,
              fontSize: "0.95rem", fontWeight: 700,
              bgcolor: "primary.main",
            }}
          />
          <Box sx={{ overflow: "hidden" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {user.displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {user.email}
            </Typography>
            {user.role === "admin" && (
              <Chip label="Admin" size="small" color="primary" sx={{ mt: 0.25, height: 18, fontSize: "0.6rem" }} />
            )}
          </Box>
        </Box>

        <Divider />

        {/* Admin Portal — only for admins */}
        {user.role === "admin" && (
          <>
            <MenuItem onClick={() => goTo("/admin")}>
              <ListItemIcon><AdminPanelSettingsOutlinedIcon fontSize="small" color="primary" /></ListItemIcon>
              <ListItemText
                primary="Admin Portal"
                primaryTypographyProps={{ fontWeight: 700, color: "primary.main", fontSize: "0.875rem" }}
              />
            </MenuItem>
            <Divider />
          </>
        )}

        <MenuItem onClick={() => goTo("/orders")}>
          <ListItemIcon><ShoppingBagOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="My Orders" primaryTypographyProps={{ fontSize: "0.875rem" }} />
        </MenuItem>

        <MenuItem onClick={() => goTo("/")}>
          <ListItemIcon><FavoriteBorderIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Wishlist" primaryTypographyProps={{ fontSize: "0.875rem" }} />
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
          <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText primary="Sign Out" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
        </MenuItem>
      </Menu>
    </ThemeProvider>
  );
};

export default UserMenu;
