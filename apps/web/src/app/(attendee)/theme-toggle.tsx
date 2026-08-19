"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export function AttendeeThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("attendee-theme");
    if (stored === "dark") {
      setDark(true);
      document.getElementById("attendee-root")?.classList.remove("theme-light");
      document.getElementById("attendee-root")?.classList.add("dark");
    }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    const el = document.getElementById("attendee-root");
    if (next) {
      el?.classList.remove("theme-light");
      el?.classList.add("dark");
      localStorage.setItem("attendee-theme", "dark");
    } else {
      el?.classList.remove("dark");
      el?.classList.add("theme-light");
      localStorage.setItem("attendee-theme", "light");
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
