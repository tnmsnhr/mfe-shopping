/**
 * Shared theme configuration — zero dependencies, pure JS object.
 *
 * Each MFE's src/theme.js imports this and calls createTheme() locally,
 * so @mui/material resolves from each MFE's own node_modules.
 */
const themeConfig = {
  palette: {
    primary:    { main: "#ff3f6c", light: "#ff6e94", dark: "#c9004c", contrastText: "#fff" },
    secondary:  { main: "#282c3f", light: "#3d4263", dark: "#0f111a", contrastText: "#fff" },
    success:    { main: "#03a685", light: "#e6f7f4", dark: "#02846a" },
    warning:    { main: "#f47e3c", light: "#fff3ee", dark: "#c55e1c" },
    error:      { main: "#dd4444", light: "#fce4ec", dark: "#bb0000" },
    background: { default: "#f4f4f5", paper: "#ffffff" },
    text:       { primary: "#282c3f", secondary: "#696b79", disabled: "#94969f" },
    divider:    "#eaeaec",
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.5px" },
    h2: { fontWeight: 700, letterSpacing: "-0.3px" },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 600 },
    button:    { textTransform: "none", fontWeight: 700, letterSpacing: "0.3px" },
    caption:   { color: "#94969f" },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { boxShadow: "none", "&:hover": { boxShadow: "none" }, borderRadius: 4 },
        containedPrimary:   { "&:hover": { boxShadow: "0 3px 10px rgba(255,63,108,.35)" } },
        containedSecondary: { "&:hover": { boxShadow: "0 3px 10px rgba(40,44,63,.35)" } },
        sizeLarge:  { padding: "12px 28px", fontSize: "0.95rem" },
        sizeMedium: { padding: "9px 22px" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 4px rgba(0,0,0,.06)",
          transition: "box-shadow .2s, transform .15s",
          "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,.1)" },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: { root: { boxShadow: "0 1px 6px rgba(0,0,0,.12)" } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, borderRadius: 4 } },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, fontSize: "0.875rem" },
      },
    },
    MuiPaper: {
      defaultProps:    { elevation: 0 },
      styleOverrides:  { rounded: { borderRadius: 8 } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: "#eaeaec" } },
    },
    MuiSkeleton: {
      defaultProps: { animation: "wave" },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 4, height: 6 } },
    },
  },
};

export default themeConfig;
