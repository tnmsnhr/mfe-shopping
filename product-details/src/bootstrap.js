import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ProductDetails from "./ProductDetails";
import theme from "./theme";
import "./index.css";

const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <Box sx={{ bgcolor: "secondary.main", px: 3, py: 1.25 }}>
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>
          🛍️ ProductDetails — Standalone Mode (port 3001)
        </Typography>
      </Box>
      <Routes>
        <Route path="*" element={<ProductDetails productId="1" />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
