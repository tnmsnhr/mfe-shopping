import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Cart from "./Cart";
import "./index.css";

const App = () => (
  <BrowserRouter>
    <div style={{ background: "#2c3e50", padding: "0.75rem 1.5rem" }}>
      <span style={{ color: "white", fontWeight: "bold", fontSize: "1.2rem" }}>
        🛒 Cart — Standalone Mode (port 3002)
      </span>
    </div>
    <Routes>
      <Route path="*" element={<Cart />} />
    </Routes>
  </BrowserRouter>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
