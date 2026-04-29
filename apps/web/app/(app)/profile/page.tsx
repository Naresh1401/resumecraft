"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, RefreshCw } from "lucide-react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { maskApiKey } from "@/lib/utils";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [keyMask, setKeyMask] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);

  async function load() {
    const r = await fetch("/api/user/profile");
    if (r.ok) {
      const d = await r.json();
      setName(d.user.name || "");
      setEmail(d.user.email || "");
    }
    const k = await fetch("/api/user/api-key");
    if (k.ok) {
      const d = await k.json();
      setKeyMask(d.apiKeyPrefix ? maskApiKey(d.apiKeyPrefix) : "—");
    }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true);
    const body: any = { name, email };
    if (newPassword) { body.currentPassword = currentPassword; body.newPassword = newPassword; }
    const r = await fetch("/api/user/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!r.ok) { const d = await r.json().catch(() => ({})); return toast.error(d.error || "Update failed"); }
    setCurrentPassword(""); setNewPassword("");
    toast.success("Profile updated");
  }

  async function regen() {
    const r = await fetch("/api/user/api-key/regenerate", { method: "POST" });
    if (!r.ok) return toast.error("Failed");
    const d = await r.json();
    setNewKey(d.apiKey);
    load();
  }

  return (
    <div className="container py-8 max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Email</Label><Input value={email} type="email" onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Current password</Label><Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></div>
            <div><Label>New password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
          </div>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">API Key</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setConfirmRegen(true)}>
            <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
          </Button>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-sm">{keyMask}</div>
          {newKey && (
            <div className="mt-3 rounded-md border bg-muted p-3 text-xs font-mono break-all flex items-center justify-between gap-2">
              <span>{newKey}</span>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(newKey); toast.success("Copied"); }}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmModal
        open={confirmRegen}
        onOpenChange={setConfirmRegen}
        title="Regenerate API key?"
        description="Your current key will be revoked immediately."
        danger
        confirmText="Regenerate"
        onConfirm={regen}
      />
    </div>
  );
}
