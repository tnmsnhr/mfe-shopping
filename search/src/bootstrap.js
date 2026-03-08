import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useNavigate } from "react-router-dom";
import Search from "./Search";
import "./Search.css";

// Standalone shell — gives Search a router context + a fake navigate
// that shows where it would navigate in the full app.
const StandaloneApp = () => {
  return (
    <div className="search-standalone">
      {/* Mini navbar */}
      <header className="standalone-header">
        <span className="standalone-logo">🛍️ ShopZone</span>
        <Search />
      </header>

      {/* Body */}
      <main className="standalone-body">
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#282c3f" }}>
          Search Module — Standalone Mode
        </h2>
        <p className="standalone-tagline">
          Running on <strong>http://localhost:3005</strong> &nbsp;·&nbsp;
          Type in the search box above to see results
        </p>

        <div className="standalone-search-area">
          <div
            style={{
              background: "white",
              border: "1px solid #eaeaec",
              borderRadius: 8,
              padding: "2rem",
              textAlign: "center",
              color: "#696b79",
              fontSize: "0.9rem",
            }}
          >
            <p style={{ marginBottom: "0.5rem" }}>🔍 &nbsp;<strong>How to test:</strong></p>
            <p>Type a product name, brand, or category (e.g. <em>"Sony"</em>, <em>"Gaming"</em>, <em>"Watch"</em>).</p>
            <p style={{ marginTop: "0.75rem" }}>
              Clicking a result navigates to <code>/product/:id</code> (handled by the host router in production).
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <StandaloneApp />
    </BrowserRouter>
  </React.StrictMode>
);
