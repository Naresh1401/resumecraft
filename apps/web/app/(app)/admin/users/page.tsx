"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { toast } from "sonner";
import { formatDateTime, maskApiKey } from "@/lib/utils";

type U = {
  id: string; name: string; email: string; role: "USER" | "ADMIN"; isActive: boolean;
  apiKeyPrefix: string | null; lastLogin: string | null; createdAt: string;
  _count: { sessions: number; apiLogs: number };
};

export default function UsersPage() {
  const [users, setUsers] = useState<U[]>([]);
  const [search, setSearch] = useState("");
  const [resetUser, setResetUser] = useState<U | null>(null);
  const [revokeUser, setRevokeUser] = useState<U | null>(null);

  async function load() {
    const r = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
    if (r.ok) { const d = await r.json(); setUsers(d.items); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [search]); // eslint-disable-line

  async function update(u: U, patch: Partial<U>) {
    const r = await fetch(`/api/admin/users/${u.id}`, {
      method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(patch),
    });
    if (!r.ok) return toast.error("Update failed");
    toast.success("Updated");
    load();
  }

  async function reset(u: U) {
    const r = await fetch(`/api/admin/users/${u.id}/history`, { method: "DELETE" });
    if (!r.ok) return toast.error("Reset failed");
    toast.success("History cleared");
    load();
  }

  async function revoke(u: U) {
    const r = await fetch(`/api/admin/users/${u.id}/api-key/revoke`, { method: "POST" });
    if (!r.ok) return toast.error("Revoke failed");
    toast.success("API key revoked");
    load();
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Users</h1>
        <Input className="max-w-xs" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All users</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                <tr><th className="py-2 pr-2">User</th><th className="py-2 pr-2">Role</th><th className="py-2 pr-2">Active</th><th className="py-2 pr-2">API Key</th><th className="py-2 pr-2">Sessions</th><th className="py-2 pr-2">Last login</th><th className="py-2 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="py-2 pr-2">
                      <select value={u.role} onChange={(e) => update(u, { role: e.target.value as any })} className="bg-transparent border rounded-md px-2 py-1 text-xs">
                        <option value="USER">USER</option><option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <Badge variant={u.isActive ? "success" : "danger"} className="cursor-pointer" onClick={() => update(u, { isActive: !u.isActive })}>
                        {u.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-2 font-mono text-xs">{u.apiKeyPrefix ? maskApiKey(u.apiKeyPrefix) : "—"}</td>
                    <td className="py-2 pr-2">{u._count.sessions}</td>
                    <td className="py-2 pr-2 text-muted-foreground text-xs">{u.lastLogin ? formatDateTime(u.lastLogin) : "—"}</td>
                    <td className="py-2 text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setRevokeUser(u)}>Revoke key</Button>
                      <Button size="sm" variant="destructive" onClick={() => setResetUser(u)}>Reset history</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmModal
        open={!!resetUser} onOpenChange={(o) => !o && setResetUser(null)}
        title={`Reset history for ${resetUser?.email}?`}
        description="Deletes all sessions, versions, emails." danger confirmText="Reset"
        onConfirm={() => resetUser && reset(resetUser)}
      />
      <ConfirmModal
        open={!!revokeUser} onOpenChange={(o) => !o && setRevokeUser(null)}
        title={`Revoke API key for ${revokeUser?.email}?`}
        description="A new key will be generated; the old key will stop working." danger confirmText="Revoke"
        onConfirm={() => revokeUser && revoke(revokeUser)}
      />
    </div>
  );
}
