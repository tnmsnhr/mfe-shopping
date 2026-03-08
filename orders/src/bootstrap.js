import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Orders from "./Orders";
import theme from "./theme";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Box
          sx={{
            bgcolor: "#fff3cd",
            borderBottom: "2px solid #ffc107",
            px: 2, py: 0.75,
          }}
        >
          <Typography variant="caption" sx={{ color: "#856404", fontWeight: 600 }}>
            📦 <strong>Standalone Mode</strong> — Orders MFE · port 3007
          </Typography>
        </Box>
        <Orders />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
