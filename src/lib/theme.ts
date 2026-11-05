"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function toggleTheme() {
  const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;

  try {
    localStorage.setItem("liqa26-theme", next);
  } catch {
    // Storage can be unavailable in private mode.
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", next === "dark" ? "#0B1020" : "#F1F3F7");
  }

  listeners.forEach((listener) => listener());
}
