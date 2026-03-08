import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";
import "./index.css";

// Standalone wrapper — mimics how the host mounts the Login page.
const StandaloneApp = () => (
  <BrowserRouter>
    <Routes>
      <Route path="*" element={<Login />} />
    </Routes>
  </BrowserRouter>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <StandaloneApp />
  </React.StrictMode>
);
