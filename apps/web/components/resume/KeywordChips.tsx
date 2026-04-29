"use client";

import { Badge } from "@/components/ui/badge";

export function KeywordChips({
  matched,
  missing,
  onChipClick,
}: {
  matched: string[];
  missing: string[];
  onChipClick?: (kw: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Matched ✅</div>
        <div className="flex flex-wrap gap-2">
          {matched.length === 0 && <span className="text-xs text-muted-foreground">None yet</span>}
          {matched.map((k) => (
            <Badge key={k} variant="success" className="cursor-pointer" onClick={() => onChipClick?.(k)}>
              {k}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Missing ❌</div>
        <div className="flex flex-wrap gap-2">
          {missing.length === 0 && <span className="text-xs text-muted-foreground">All covered</span>}
          {missing.map((k) => (
            <Badge key={k} variant="danger" className="cursor-pointer" onClick={() => onChipClick?.(k)}>
              {k}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
