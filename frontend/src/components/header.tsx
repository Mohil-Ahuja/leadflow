"use client";

import { Moon, Plus, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "./ui/button";

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      {/* A path that loops back on itself: every lead comes back around for a follow-up. */}
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--primary)" />
        <path
          d="M7 21c3.5 0 4.5-10 9-10 3 0 3 4 0 4s-2.5-6 2-6c3 0 4.5 3 7 3"
          fill="none"
          stroke="var(--primary-ink)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="25" cy="12" r="2" fill="var(--due)" />
      </svg>
      <span className="font-display text-[21px] font-bold tracking-tight text-ink">LeadFlow</span>
    </span>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const saved = document.documentElement.dataset.theme as "light" | "dark" | undefined;
    setTheme(saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("leadflow-theme", next);
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this visit.
    }
    setTheme(next);
  }

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <Button variant="ghost" className="w-10 px-0" onClick={toggle} aria-label={label} title={label}>
      {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </Button>
  );
}

export function Header({ onAddLead }: { onAddLead: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button onClick={onAddLead} title="Add lead (N)">
            <Plus className="size-4" aria-hidden />
            Add lead
            <kbd className="ml-1 hidden rounded border border-primary-ink/30 px-1.5 text-[11px] font-medium sm:inline">N</kbd>
          </Button>
        </div>
      </div>
    </header>
  );
}
