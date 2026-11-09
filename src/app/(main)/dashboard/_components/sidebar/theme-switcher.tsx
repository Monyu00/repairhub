"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

const THEME_CYCLE = ["light", "dark", "system"] as const;
const THEME_LABELS: Record<(typeof THEME_CYCLE)[number], string> = {
  light: "淺色模式",
  dark: "深色模式",
  system: "跟隨系統",
};

interface ThemeSwitcherProps {
  className?: string;
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { themeMode, setPreference } = usePreferencesStore(
    useShallow((state) => ({
      themeMode: state.values.theme_mode,
      setPreference: state.setPreference,
    })),
  );

  const cycleTheme = () => {
    const currentIndex = THEME_CYCLE.indexOf(themeMode);
    const nextTheme = THEME_CYCLE[(currentIndex + 1) % THEME_CYCLE.length];

    setPreference("theme_mode", nextTheme);
  };

  const nextTheme = THEME_CYCLE[(THEME_CYCLE.indexOf(themeMode) + 1) % THEME_CYCLE.length];
  const label = `目前為${THEME_LABELS[themeMode]}，切換為${THEME_LABELS[nextTheme]}`;

  return (
    <Button size="icon" onClick={cycleTheme} aria-label={label} title={label} className={className}>
      {/* SYSTEM */}
      <Monitor aria-hidden="true" className="hidden [html[data-theme-mode=system]_&]:block" />

      {/* DARK (resolved) */}
      <Sun aria-hidden="true" className="hidden dark:block [html[data-theme-mode=system]_&]:hidden" />

      {/* LIGHT (resolved) */}
      <Moon aria-hidden="true" className="block dark:hidden [html[data-theme-mode=system]_&]:hidden" />
    </Button>
  );
}
