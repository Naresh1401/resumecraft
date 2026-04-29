"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { ProgressStepper } from "@/components/shared/ProgressStepper";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function TailorStartPage() {
  const router = useRouter();
  const [resume, setResume] = useState<File | null>(null);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [outputFormat, setOutputFormat] = useState<"DOCX" | "PDF">("DOCX");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!resume) return toast.error("Upload your resume.");
    if (!jdFile && jdText.trim().length < 20) return toast.error("Provide a JD file or paste at least 20 chars.");

    const fd = new FormData();
    fd.append("resume", resume);
    if (jdFile) fd.append("jd", jdFile);
    fd.append("jdText", jdText);
    fd.append("userPrompt", userPrompt);
    fd.append("outputFormat", outputFormat);

    setBusy(true);
    try {
      const r = await fetch("/api/tailor/sessions", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) {
        toast.error(d.error || "Failed");
        return;
      }
      toast.success(`Tailored! ATS ${d.atsScore}`);
      router.push(`/tailor/${d.sessionId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container py-8 space-y-6 max-w-5xl">
      <ProgressStepper current={0} />
      <h1 className="text-2xl font-bold">New Tailor</h1>

      <form onSubmit={submit} className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">1. Your Resume</CardTitle></CardHeader>
          <CardContent>
            <FileDropzone label="Upload resume (PDF or DOCX)" onFile={setResume} file={resume} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">2. Job Description</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="paste">
              <TabsList>
                <TabsTrigger value="paste">Paste text</TabsTrigger>
                <TabsTrigger value="upload">Upload file</TabsTrigger>
              </TabsList>
              <TabsContent value="paste">
                <Textarea rows={8} placeholder="Paste the job description…" value={jdText} onChange={(e) => setJdText(e.target.value)} />
              </TabsContent>
              <TabsContent value="upload">
                <FileDropzone label="Upload JD (PDF or DOCX)" onFile={setJdFile} file={jdFile} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">3. Custom prompt (optional)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tell the AI how to tailor (optional)</Label>
              <Textarea
                rows={4}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="e.g. Emphasise backend Go and Kubernetes work. Tone down management claims. Reframe each role's responsibilities to match the JD — but keep my companies, titles and dates exactly as they are."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to let the AI tailor automatically. Either way, your companies, job titles and dates are preserved exactly — only the responsibilities/bullets are rewritten to match the JD.
              </p>
            </div>
            <div>
              <Label>Output format</Label>
              <div className="flex gap-2 mt-1">
                {(["DOCX", "PDF"] as const).map((f) => (
                  <Button key={f} type="button" variant={outputFormat === f ? "default" : "outline"} size="sm" onClick={() => setOutputFormat(f)}>{f}</Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Tailoring…</>) : "Tailor my resume"}
          </Button>
        </div>
      </form>
    </div>
  );
}
