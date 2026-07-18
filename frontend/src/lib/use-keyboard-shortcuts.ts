import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface ShortcutDef {
  keys: string;
  description: string;
}

const NAV_TARGETS: Record<string, string> = {
  d: "/",
  s: "/subscriptions",
  c: "/calendar",
  t: "/statistics",
  e: "/settings",
};

const SHORTCUTS: ShortcutDef[] = [
  { keys: "N", description: "shortcuts.newSubscription" },
  { keys: "g d", description: "shortcuts.goDashboard" },
  { keys: "g s", description: "shortcuts.goSubscriptions" },
  { keys: "g c", description: "shortcuts.goCalendar" },
  { keys: "g t", description: "shortcuts.goStatistics" },
  { keys: "g e", description: "shortcuts.goSettings" },
  { keys: "?", description: "shortcuts.showHelp" },
];

/**
 * Lightweight keyboard shortcut layer.
 * - N: open new subscription form
 * - g + letter: Gmail-style navigation prefix
 * - ?: show shortcuts help dialog
 *
 * Ignores keypresses when focus is in an input, textarea, select, or
 * contenteditable element.
 */
export function useKeyboardShortcuts(onAddSubscription: () => void) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [gPressed, setGPressed] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when focus is in a text input element
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore modifier combos (Ctrl/Cmd/Alt/Meta)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // g prefix navigation
      if (key === "g" && !gPressed) {
        setGPressed(true);
        // Reset after 1 second if no follow-up key
        window.setTimeout(() => setGPressed(false), 1000);
        e.preventDefault();
        return;
      }

      if (gPressed) {
        const target = NAV_TARGETS[key];
        if (target) {
          navigate(target);
          setGPressed(false);
          e.preventDefault();
          return;
        }
        setGPressed(false);
        return;
      }

      // Single-key shortcuts
      if (key === "n") {
        onAddSubscription();
        e.preventDefault();
        return;
      }

      if (key === "?") {
        setHelpOpen(true);
        e.preventDefault();
        return;
      }
    },
    [gPressed, navigate, onAddSubscription]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { helpOpen, setHelpOpen, shortcuts: SHORTCUTS, t };
}