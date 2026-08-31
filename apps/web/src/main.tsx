import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { ThemeProvider } from "#components/theme-provider";
import { getRouter } from "./router";
import "@gladia-analytics/ui/globals.css";

const router = getRouter();
const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider defaultTheme="system" storageKey="theme">
        <RouterProvider router={router} />
      </ThemeProvider>
    </StrictMode>,
  );
}
