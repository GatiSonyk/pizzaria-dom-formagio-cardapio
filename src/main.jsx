import React from "react";
import { createRoot } from "react-dom/client";
import AuthRoutes from "./auth/AuthRoutes.jsx";
import "./styles.css";
import "./auth.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthRoutes />
  </React.StrictMode>
);
