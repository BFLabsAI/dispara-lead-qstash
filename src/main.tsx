"use client";

import * as React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes"; // Import do next-themes para tema
import App from "./App.tsx";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem> {/* Provedor de tema: alterna light/dark baseado no sistema ou manual */}
      <App />
    </ThemeProvider>
  </React.StrictMode>
);