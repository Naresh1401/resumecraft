"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { toast } from "sonner";
import Link from "next/link";

// Recharts is client only
const Chart = dynamic(() => import("./Chart").then((m) => m.Chart), { ssr: false });

type Analytics = {
  totals: { users: number; sessions: number; emails: number; apiCalls: number };
  apiByDay: { date: string; count: number }[];
  sessionsByDay: { date: string; count: number }[];
  topKeywords: { token: string; count: number }[];
};

export default function AdminOverview() {
  const [data, setData] = useState<Analytics | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  async function load() {
    const r = await fetch("/api/admin/analytics");
    if (r.ok) setData(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function resetAll() {
    const r = await fetch("/api/admin/reset-all-history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: "CONFIRM DELETE ALL" }),
    });
    if (!r.ok) return toast.error("Reset failed");
    toast.success("All history wiped");
    load();
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/admin/users">Users</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/admin/audit-logs">Audit Logs</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/admin/settings">Settings</Link></Button>
          <Button variant="destructive" size="sm" onClick={() => setResetOpen(true)}>Reset all history</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Users", v: data?.totals.users },
          { label: "Sessions", v: data?.totals.sessions },
          { label: "Emails", v: data?.totals.emails },
          { label: "API Calls", v: data?.totals.apiCalls },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-5">
            <div className="text-xs uppercase text-muted-foreground">{s.label}</div>
            {data ? <div className="text-3xl font-bold mt-1">{s.v}</div> : <Skeleton className="h-8 w-20 mt-2" />}
          </CardContent></Card>
        ))}
      </div>

      {data && <Chart apiByDay={data.apiByDay} sessionsByDay={data.sessionsByDay} topKeywords={data.topKeywords} />}

      <ConfirmModal
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Wipe ALL user history?"
        description="This deletes every session, version, email, and download log. Users remain."
        danger
        requireText="CONFIRM DELETE ALL"
        confirmText="Wipe everything"
        onConfirm={resetAll}
      />
    </div>
  );
}
