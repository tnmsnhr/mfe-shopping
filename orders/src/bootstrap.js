import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import Orders from "./Orders";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Standalone dev banner */}
      <div
        style={{
          background: "#fff3cd",
          borderBottom: "2px solid #ffc107",
          padding: "0.55rem 1.25rem",
          fontSize: "0.82rem",
          color: "#856404",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        📦 <strong>Standalone Mode</strong> — Orders MFE · port 3007
      </div>
      <Orders />
    </BrowserRouter>
  </React.StrictMode>
);
