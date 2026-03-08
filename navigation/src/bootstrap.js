import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import Navigation from "./Navigation";
import "./index.css";

const App = () => (
  <BrowserRouter>
    <Navigation />
    <div style={{ padding: "2rem", fontFamily: "sans-serif", color: "#555" }}>
      <p>
        👆 Navigation module running standalone on{" "}
        <strong>http://localhost:3004</strong>
      </p>
    </div>
  </BrowserRouter>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
