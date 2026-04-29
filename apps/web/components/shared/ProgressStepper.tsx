"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Upload", "Analyze", "Preview", "Export", "Email"];

export function ProgressStepper({
  current,
  onStepClick,
}: {
  current: number; // 0..4
  onStepClick?: (index: number) => void;
}) {
  return (
    <div className="w-full flex items-center justify-between gap-2 py-3">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = !!onStepClick && (done || active);
        return (
          <div key={label} className="flex items-center flex-1">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(i)}
              className={cn(
                "flex items-center gap-2 group",
                clickable ? "cursor-pointer" : "cursor-default",
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-full grid place-items-center text-xs font-semibold border transition-colors",
                  done && "bg-emerald-500 border-emerald-500 text-white",
                  active && "bg-primary border-primary text-primary-foreground",
                  !done && !active && "bg-muted border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-sm hidden sm:block", active ? "font-medium" : "text-muted-foreground")}>{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn("flex-1 h-px mx-2", i < current ? "bg-emerald-500/60" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
