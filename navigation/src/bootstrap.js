import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Navigation from "./Navigation";
import theme from "./theme";
import "./index.css";

const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <Navigation />
      <Box sx={{ p: 3, color: "text.secondary", fontFamily: "sans-serif" }}>
        <Typography variant="body2">
          👆 Navigation module running standalone on <strong>http://localhost:3004</strong>
        </Typography>
      </Box>
    </BrowserRouter>
  </ThemeProvider>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
