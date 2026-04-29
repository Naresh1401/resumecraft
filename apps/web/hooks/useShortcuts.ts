import { useEffect } from "react";

type Combo = { ctrl?: boolean; meta?: boolean; key: string; handler: (e: KeyboardEvent) => void };

export function useShortcuts(combos: Combo[]) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      for (const c of combos) {
        const mod = (c.ctrl || c.meta) ? (e.ctrlKey || e.metaKey) : true;
        if (mod && e.key.toLowerCase() === c.key.toLowerCase()) {
          if (c.ctrl || c.meta) e.preventDefault();
          c.handler(e);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [combos]);
}
