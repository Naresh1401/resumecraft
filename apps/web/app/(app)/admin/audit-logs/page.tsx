"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

type Log = {
  id: string;
  action: string;
  targetUserId: string | null;
  metadata: any;
  ipAddress: string | null;
  createdAt: string;
  admin: { name: string | null; email: string };
  targetUser?: { name: string | null; email: string } | null;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [action, setAction] = useState("");
  async function load() {
    const r = await fetch(`/api/admin/audit-logs?action=${encodeURIComponent(action)}&pageSize=100`);
    if (r.ok) { const d = await r.json(); setLogs(d.items); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [action]); // eslint-disable-line

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <Input className="max-w-xs" placeholder="Filter by action…" value={action} onChange={(e) => setAction(e.target.value)} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs.length === 0 && <div className="text-sm text-muted-foreground">No logs.</div>}
            {logs.map((l) => (
              <div key={l.id} className="flex items-start justify-between gap-3 border-b pb-2">
                <div>
                  <div className="text-sm flex items-center gap-2">
                    <Badge variant="outline">{l.action}</Badge>
                    {l.targetUser && <span className="text-xs text-muted-foreground">→ {l.targetUser.email}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{l.admin?.email || "system"}{l.ipAddress ? ` · ${l.ipAddress}` : ""}</div>
                  {l.metadata && Object.keys(l.metadata).length > 0 && (
                    <pre className="text-[10px] text-muted-foreground mt-1 max-w-2xl overflow-x-auto">{JSON.stringify(l.metadata, null, 2)}</pre>
                  )}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(l.createdAt)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
