"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Settings = {
  aiModel?: string;
  maxFileSizeMb?: number;
  maxTailorPerHour?: number;
  maxApiCallsPerHour?: number;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpFrom?: string | null;
};

export default function SettingsPage() {
  const [s, setS] = useState<Settings>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/admin/settings");
    if (r.ok) { const d = await r.json(); setS(d.settings || {}); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true);
    const payload: any = { ...s };
    if (payload.maxFileSizeMb) payload.maxFileSizeMb = Number(payload.maxFileSizeMb);
    if (payload.maxTailorPerHour) payload.maxTailorPerHour = Number(payload.maxTailorPerHour);
    if (payload.maxApiCallsPerHour) payload.maxApiCallsPerHour = Number(payload.maxApiCallsPerHour);
    if (payload.smtpPort) payload.smtpPort = Number(payload.smtpPort);
    const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setBusy(false);
    if (!r.ok) return toast.error("Save failed");
    toast.success("Settings saved");
    load();
  }

  function bind<K extends keyof Settings>(k: K) {
    return {
      value: (s[k] as any) ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: e.target.value as any }),
    };
  }

  return (
    <div className="container py-8 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">System Settings</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">AI</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>AI Model</Label>
            <select
              className="w-full border rounded-md h-10 bg-background px-3 text-sm"
              value={s.aiModel || "claude-opus-4-5"}
              onChange={(e) => setS({ ...s, aiModel: e.target.value })}
            >
              <option value="claude-opus-4-5">claude-opus-4-5</option>
              <option value="claude-sonnet-4-5">claude-sonnet-4-5</option>
              <option value="claude-haiku-4-5">claude-haiku-4-5</option>
            </select>
          </div>
          <div><Label>Max file size (MB)</Label><Input type="number" {...bind("maxFileSizeMb")} /></div>
          <div><Label>Max tailors / hour</Label><Input type="number" {...bind("maxTailorPerHour")} /></div>
          <div><Label>Max API calls / hour</Label><Input type="number" {...bind("maxApiCallsPerHour")} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">SMTP</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div><Label>Host</Label><Input {...bind("smtpHost")} /></div>
          <div><Label>Port</Label><Input type="number" {...bind("smtpPort")} /></div>
          <div><Label>User</Label><Input {...bind("smtpUser")} /></div>
          <div><Label>From</Label><Input {...bind("smtpFrom")} /></div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
    </div>
  );
}
