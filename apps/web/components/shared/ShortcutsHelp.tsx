"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useShortcuts } from "@/hooks/useShortcuts";

const ITEMS: [string, string][] = [
  ["Ctrl/Cmd + S", "Save resume edits"],
  ["Ctrl/Cmd + D", "Download current version"],
  ["Ctrl/Cmd + R", "Re-tailor resume"],
  ["Ctrl/Cmd + E", "Open email composer"],
  ["?", "Show this help"],
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useShortcuts([
    {
      key: "?",
      handler: (e) => {
        const t = e.target as HTMLElement;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        setOpen((o) => !o);
      },
    },
  ]);

  // Onboarding "tour": mark hasSeenTour the first time user enters the app
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("hasSeenTour")) return;
    setOpen(true);
    localStorage.setItem("hasSeenTour", "1");
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Fly through ResumeTailor without leaving the keyboard.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          {ITEMS.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between border-b last:border-0 pb-1">
              <span>{v}</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono">{k}</kbd>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-3">
          Tip: drag &amp; drop your resume on the upload zone. Click matched keywords to highlight in the preview.
        </p>
      </DialogContent>
    </Dialog>
  );
}
