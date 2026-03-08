import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProductDetails from "./ProductDetails";
import "./index.css";

const App = () => (
  <BrowserRouter>
    <div style={{ background: "#2c3e50", padding: "0.75rem 1.5rem" }}>
      <span style={{ color: "white", fontWeight: "bold", fontSize: "1.2rem" }}>
        🛍️ ProductDetails — Standalone Mode (port 3001)
      </span>
    </div>
    <Routes>
      <Route path="*" element={<ProductDetails productId="1" />} />
    </Routes>
  </BrowserRouter>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
