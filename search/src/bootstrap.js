import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Search from "./Search";
import theme from "./theme";

// Standalone shell — gives Search a router context + a nice MUI-styled wrapper
const StandaloneApp = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      {/* Mini navbar */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          px: 3,
          height: 60,
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800, color: "primary.main", whiteSpace: "nowrap" }}>
          🛍️ ShopZone
        </Typography>
        <Search />
      </Paper>

      {/* Body */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", pt: 8, px: 3, gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Search Module — Standalone Mode
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Running on <strong>http://localhost:3005</strong> · Type in the search box above to see results
        </Typography>

        <Paper
          elevation={0}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 3, mt: 2, maxWidth: 540, textAlign: "center" }}
        >
          <Typography variant="body2" color="text.secondary" gutterBottom>
            🔍 <strong>How to test:</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Type a product name, brand, or category (e.g. <em>"Sony"</em>, <em>"Gaming"</em>, <em>"Watch"</em>).
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Clicking a result navigates to <code>/product/:id</code> (handled by the host router in production).
          </Typography>
        </Paper>
      </Box>
    </Box>
  </ThemeProvider>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <StandaloneApp />
    </BrowserRouter>
  </React.StrictMode>
);
