"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProgressStepper } from "@/components/shared/ProgressStepper";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { Loader2, RefreshCw, Save, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Email = { id: string; subject: string; body: string; toEmail: string | null; wordCount: number; status: string };
type Version = { id: string; isCurrent: boolean };
type Session = { id: string; name: string; versions: Version[]; emails: Email[] };

export default function EmailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState<Email | null>(null);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [toEmail, setToEmail] = useState("");

  async function load() {
    const r = await fetch(`/api/tailor/sessions/${sessionId}`);
    const d = await r.json();
    setSession(d.session);
    if (d.session?.emails?.length) {
      const e = d.session.emails[0];
      setEmail(e);
      setToEmail(e.toEmail || "");
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [sessionId]);

  async function generate() {
    if (!session) return;
    const v = session.versions.find((x) => x.isCurrent) || session.versions.at(-1);
    if (!v) return toast.error("No version available");
    setGenerating(true);
    const r = await fetch("/api/email/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, versionId: v.id }),
    });
    setGenerating(false);
    if (!r.ok) return toast.error("Generation failed");
    const d = await r.json();
    setEmail(d.email);
    toast.success("Email drafted");
  }

  async function save() {
    if (!email) return;
    setBusy(true);
    const r = await fetch(`/api/email/${email.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject: email.subject, body: email.body, toEmail: toEmail || null }),
    });
    setBusy(false);
    if (!r.ok) return toast.error("Save failed");
    toast.success("Saved");
    load();
  }

  async function send() {
    if (!email) return;
    if (!toEmail) return toast.error("Recipient required");
    setBusy(true);
    const r = await fetch(`/api/email/${email.id}/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toEmail }),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      return toast.error(d.error || "Send failed");
    }
    toast.success("Email sent");
    load();
  }

  const wc = (email?.body || "").split(/\s+/).filter(Boolean).length;
  const wcOk = wc >= 250 && wc <= 380;

  return (
    <div className="container py-8 space-y-6 max-w-4xl">
      <ProgressStepper current={4} onStepClick={(i) => {
        if (i === 0) router.push("/tailor");
        else if (i < 4) router.push(`/tailor/${sessionId}`);
      }} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cold Email</h1>
        <Button onClick={generate} disabled={generating} variant={email ? "outline" : "default"}>
          {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          {email ? "Regenerate" : "Generate"}
        </Button>
      </div>

      {!email && (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          Click <strong>Generate</strong> to draft a recruiter outreach email tailored to this role.
        </CardContent></Card>
      )}

      {email && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Compose</CardTitle>
            <span className={`text-xs ${wcOk ? "text-emerald-500" : "text-amber-500"}`}>
              {wc} words {wcOk ? "✓" : "(target 250–380)"}
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Recipient</Label><Input type="email" value={toEmail} onChange={(e) => setToEmail(e.target.value)} placeholder="recruiter@company.com" /></div>
            <div><Label>Subject</Label><Input value={email.subject} onChange={(e) => setEmail({ ...email, subject: e.target.value })} /></div>
            <Tabs defaultValue="edit">
              <TabsList><TabsTrigger value="edit">Edit</TabsTrigger><TabsTrigger value="preview">Preview</TabsTrigger></TabsList>
              <TabsContent value="edit">
                <Textarea
                  rows={16}
                  value={email.body}
                  onChange={(e) => setEmail({ ...email, body: e.target.value })}
                  className="font-sans"
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="rounded-md border bg-card p-4 whitespace-pre-wrap text-sm">{email.body}</div>
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={save} disabled={busy}><Save className="h-3 w-3 mr-1" /> Save</Button>
              <Button variant="outline" onClick={generate} disabled={generating}><RefreshCw className="h-3 w-3 mr-1" /> Regenerate</Button>
              <Button onClick={() => setConfirmSend(true)} disabled={busy}><Send className="h-3 w-3 mr-1" /> Send</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmModal
        open={confirmSend}
        onOpenChange={setConfirmSend}
        title={`Send to ${toEmail || "recipient"}?`}
        description="This will send the email immediately."
        confirmText="Send"
        onConfirm={send}
      />
    </div>
  );
}
