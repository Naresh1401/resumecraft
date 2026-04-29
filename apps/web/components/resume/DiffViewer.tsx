"use client";

import { useMemo } from "react";
import DiffMatchPatch from "diff-match-patch";

const dmp = new DiffMatchPatch();

export function DiffViewer({
  before,
  after,
  showHighlights = true,
}: {
  before: string;
  after: string;
  showHighlights?: boolean;
}) {
  const html = useMemo(() => {
    const diffs = dmp.diff_main(before || "", after || "");
    dmp.diff_cleanupSemantic(diffs);
    return diffs
      .map(([op, data]) => {
        const text = data.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
        if (!showHighlights) return op === -1 ? "" : text;
        if (op === 1) return `<mark class="bg-emerald-500/20">${text}</mark>`;
        if (op === -1) return `<del class="opacity-50 line-through">${text}</del>`;
        return text;
      })
      .join("");
  }, [before, after, showHighlights]);

  return (
    <pre
      className="whitespace-pre-wrap break-words text-sm leading-relaxed font-sans"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
