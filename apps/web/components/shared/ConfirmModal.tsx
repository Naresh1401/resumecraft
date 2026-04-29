"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ConfirmModal({
  open, onOpenChange, title, description, confirmText = "Confirm", danger = false,
  requireText, onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  danger?: boolean;
  requireText?: string;
  onConfirm: () => unknown | Promise<unknown>;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const ok = !requireText || typed === requireText;
  return (
    <Dialog open={open} onOpenChange={(o) => { setTyped(""); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {requireText && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Type <code className="font-mono">{requireText}</code> to confirm.</p>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={requireText} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant={danger ? "destructive" : "default"}
            disabled={!ok || busy}
            onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); onOpenChange(false); } }}
          >
            {busy ? "Working…" : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
