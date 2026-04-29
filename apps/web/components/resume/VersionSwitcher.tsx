"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function VersionSwitcher({
  versions,
  current,
  onSelect,
}: {
  versions: { id: string; versionNumber: number; atsScore: number; createdAt: string | Date }[];
  current: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const cur = versions.find((v) => v.id === current);
  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        Version {cur?.versionNumber ?? "?"} ({cur?.atsScore ?? "—"})
        <ChevronDown className="h-3 w-3 ml-1" />
      </Button>
      {open && (
        <div className="absolute right-0 mt-1 z-20 w-72 rounded-md border bg-popover shadow-lg">
          {versions.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => { onSelect(v.id); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between",
                v.id === current && "bg-accent",
              )}
            >
              <span>Version {v.versionNumber}</span>
              <span className="text-xs text-muted-foreground">
                ATS {v.atsScore} · {new Date(v.createdAt).toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
