"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SkeletonCards } from "@/components/shared/SkeletonCards";
import { Plus, Search, FileText, Trash2, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, scoreColor, maskApiKey } from "@/lib/utils";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

type Session = {
  id: string;
  name: string;
  jdTitle: string;
  jdCompany?: string | null;
  status: string;
  createdAt: string;
  versions: { atsScore: number; versionNumber: number }[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [apiKey, setApiKey] = useState<string>("");
  const [regenerated, setRegenerated] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/tailor/sessions?search=${encodeURIComponent(search)}&pageSize=50`);
    const d = await r.json();
    setSessions(d.items || []);
    setLoading(false);
  }

  async function loadKey() {
    const r = await fetch("/api/user/api-key");
    if (r.ok) {
      const d = await r.json();
      setApiKey(d.apiKeyPrefix ? maskApiKey(d.apiKeyPrefix) : "—");
    }
  }

  useEffect(() => {
    load();
    loadKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function regenerate() {
    const r = await fetch("/api/user/api-key/regenerate", { method: "POST" });
    if (!r.ok) return toast.error("Failed");
    const d = await r.json();
    setRegenerated(d.apiKey);
    toast.success("New API key generated");
    loadKey();
  }

  async function del(id: string) {
    const r = await fetch(`/api/tailor/sessions/${id}`, { method: "DELETE" });
    if (!r.ok) return toast.error("Delete failed");
    toast.success("Deleted");
    load();
  }

  const completed = sessions.filter((s) => s.status === "COMPLETED");
  const avg = completed.length
    ? Math.round(completed.reduce((a, s) => a + (s.versions[0]?.atsScore || 0), 0) / completed.length)
    : 0;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Your tailoring sessions and stats.</p>
        </div>
        <Button asChild><Link href="/tailor"><Plus className="h-4 w-4 mr-1" /> New Tailor</Link></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><div className="text-xs uppercase text-muted-foreground">Sessions</div><div className="text-3xl font-bold mt-1">{sessions.length}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-xs uppercase text-muted-foreground">Completed</div><div className="text-3xl font-bold mt-1">{completed.length}</div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="text-xs uppercase text-muted-foreground">Avg ATS</div><div className={`text-3xl font-bold mt-1 ${scoreColor(avg)}`}>{avg}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Your API Key</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setConfirmRegen(true)}>
            <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
          </Button>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-sm">{apiKey || "—"}</div>
          {regenerated && (
            <div className="mt-3 rounded-md border bg-muted p-3 text-xs font-mono break-all flex items-center justify-between gap-2">
              <span>{regenerated}</span>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(regenerated); toast.success("Copied"); }}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">Use as <code>Authorization: Bearer &lt;key&gt;</code></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Sessions</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-8" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonCards count={3} />
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No sessions yet.</p>
              <Button asChild className="mt-3"><Link href="/tailor">Start your first tailor</Link></Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                  <tr><th className="py-2 pr-2">Name</th><th className="py-2 pr-2">Role</th><th className="py-2 pr-2">Company</th><th className="py-2 pr-2">ATS</th><th className="py-2 pr-2">Status</th><th className="py-2 pr-2">Created</th><th className="py-2"></th></tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const score = s.versions[0]?.atsScore ?? 0;
                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-accent/40">
                        <td className="py-2 pr-2"><Link href={`/tailor/${s.id}`} className="font-medium hover:underline">{s.name}</Link></td>
                        <td className="py-2 pr-2">{s.jdTitle}</td>
                        <td className="py-2 pr-2">{s.jdCompany || "—"}</td>
                        <td className={`py-2 pr-2 font-semibold ${scoreColor(score)}`}>{score}</td>
                        <td className="py-2 pr-2"><Badge variant={s.status === "COMPLETED" ? "success" : s.status === "FAILED" ? "danger" : "outline"}>{s.status}</Badge></td>
                        <td className="py-2 pr-2 text-muted-foreground">{formatDateTime(s.createdAt)}</td>
                        <td className="py-2 text-right">
                          <Button size="sm" variant="ghost" onClick={() => setDelId(s.id)}>
                            <Trash2 className="h-3 w-3 text-rose-500" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg sm:hidden"
        onClick={() => router.push("/tailor")}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <ConfirmModal
        open={confirmRegen}
        onOpenChange={setConfirmRegen}
        title="Regenerate API key?"
        description="Your existing key will stop working immediately."
        danger
        confirmText="Regenerate"
        onConfirm={regenerate}
      />
      <ConfirmModal
        open={!!delId}
        onOpenChange={(o) => !o && setDelId(null)}
        title="Delete session?"
        description="This permanently deletes the session and all versions."
        danger
        confirmText="Delete"
        onConfirm={() => delId && del(delId)}
      />
    </div>
  );
}
