"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileDropzone({
  label,
  accept = ".pdf,.docx",
  maxBytes = 5 * 1024 * 1024,
  onFile,
  file,
}: {
  label: string;
  accept?: string;
  maxBytes?: number;
  onFile: (f: File | null) => void;
  file: File | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (f: File | null) => {
      setError(null);
      if (!f) return onFile(null);
      const ok = accept.split(",").some((a) => f.name.toLowerCase().endsWith(a.trim().replace(/^\*/, "")));
      if (!ok) return setError("Unsupported file type.");
      if (f.size > maxBytes) return setError(`File exceeds ${(maxBytes / 1024 / 1024).toFixed(0)}MB.`);
      onFile(f);
    },
    [accept, maxBytes, onFile],
  );

  return (
    <div className="space-y-2">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setHover(true); }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => { e.preventDefault(); setHover(false); handleFile(e.dataTransfer.files?.[0] ?? null); }}
        className={cn(
          "rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors min-h-[180px] flex flex-col items-center justify-center gap-2",
          hover ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/40",
        )}
      >
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <div className="font-medium text-sm">{file.name}</div>
            <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
            <button
              type="button"
              className="text-xs text-rose-500 inline-flex items-center gap-1"
              onClick={(e) => { e.stopPropagation(); handleFile(null); }}
            >
              <X className="h-3 w-3" /> Remove
            </button>
          </div>
        ) : (
          <>
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <div className="font-medium">{label}</div>
            <div className="text-xs text-muted-foreground">Drop a file here or click to browse ({accept})</div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {error && <div className="text-xs text-rose-500">{error}</div>}
    </div>
  );
}
