"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ATSMeter } from "@/components/resume/ATSMeter";
import { KeywordChips } from "@/components/resume/KeywordChips";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { DiffViewer } from "@/components/resume/DiffViewer";
import { VersionSwitcher } from "@/components/resume/VersionSwitcher";
import { ProgressStepper } from "@/components/shared/ProgressStepper";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import type { TailoredResume } from "@/lib/validators";
import { toast } from "sonner";
import { Download, FileText, RefreshCw, Save, Mail, Trash2, Loader2 } from "lucide-react";
import { useShortcuts } from "@/hooks/useShortcuts";
import { useAppStore } from "@/store/app";
import { Skeleton } from "@/components/ui/skeleton";

type Version = {
  id: string;
  versionNumber: number;
  atsScore: number;
  isCurrent: boolean;
  tailoredJson: TailoredResume;
  matchedKeywords: string[];
  missingKeywords: string[];
  changesMade: string[];
  createdAt: string;
};
type Session = {
  id: string;
  name: string;
  jdTitle: string;
  jdCompany: string | null;
  jdText: string;
  originalResumeText: string;
  outputFormat: "DOCX" | "PDF";
  styleMetadata?: { originalAts?: { total: number; keywordMatch?: number; sectionScore?: number; actionVerbScore?: number; formatScore?: number; readabilityScore?: number } } | null;
  versions: Version[];
};

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [edited, setEdited] = useState<TailoredResume | null>(null);
  const [savingEdits, setSavingEdits] = useState(false);
  const [retailoring, setRetailoring] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const { highlightKeyword, setHighlightKeyword } = useAppStore();

  async function load() {
    const r = await fetch(`/api/tailor/sessions/${sessionId}`);
    if (!r.ok) return toast.error("Failed to load session");
    const d = await r.json();
    setSession(d.session);
    const cur = d.session.versions.find((v: Version) => v.isCurrent) ?? d.session.versions.at(-1);
    setCurrentId(cur?.id ?? null);
    setEdited(cur?.tailoredJson ?? null);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [sessionId]);

  const current = useMemo(() => session?.versions.find((v) => v.id === currentId) ?? null, [session, currentId]);
  useEffect(() => {
    if (current) setEdited(current.tailoredJson);
  }, [currentId]); // eslint-disable-line

  async function saveEdits() {
    if (!current || !edited) return;
    setSavingEdits(true);
    const r = await fetch(`/api/versions/${current.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tailoredJson: edited }),
    });
    setSavingEdits(false);
    if (!r.ok) return toast.error("Save failed");
    toast.success("Saved & re-scored");
    load();
  }

  async function retailor() {
    if (!current || !edited) return;
    setRetailoring(true);
    const r = await fetch(`/api/tailor/sessions/${sessionId}/retailor`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ edits: edited }),
    });
    setRetailoring(false);
    if (!r.ok) return toast.error("Retailor failed");
    toast.success("New version created");
    load();
  }

  async function download(format: "DOCX" | "PDF", inline = false) {
    if (!current) return;
    setDownloading(true);
    try {
      const r = await fetch(`/api/versions/${current.id}/download?format=${format}${inline ? "&inline=1" : ""}`);
      if (!r.ok) { toast.error("Download failed"); return; }
      if (inline) {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        const d = await r.json();
        if (d.url) window.open(d.url, "_blank");
      }
    } finally { setDownloading(false); }
  }

  async function del() {
    const r = await fetch(`/api/tailor/sessions/${sessionId}`, { method: "DELETE" });
    if (!r.ok) return toast.error("Delete failed");
    toast.success("Deleted");
    router.push("/dashboard");
  }

  useShortcuts([
    { ctrl: true, meta: true, key: "s", handler: () => saveEdits() },
    { ctrl: true, meta: true, key: "d", handler: () => download(session?.outputFormat || "DOCX") },
    { ctrl: true, meta: true, key: "r", handler: () => retailor() },
    { ctrl: true, meta: true, key: "e", handler: () => router.push(`/tailor/${sessionId}/email`) },
  ]);

  if (!session) {
    return (
      <div className="container py-8 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <ProgressStepper current={2} onStepClick={(i) => {
        if (i === 0) router.push("/tailor");
        if (i === 4) router.push(`/tailor/${sessionId}/email`);
      }} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{session.name}</h1>
          <p className="text-sm text-muted-foreground">{session.jdTitle}{session.jdCompany ? ` · ${session.jdCompany}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {current && (
            <VersionSwitcher
              versions={session.versions.map((v) => ({ id: v.id, versionNumber: v.versionNumber, atsScore: v.atsScore, createdAt: v.createdAt }))}
              current={current.id}
              onSelect={setCurrentId}
            />
          )}
          <Button variant="outline" size="sm" onClick={saveEdits} disabled={savingEdits}>
            {savingEdits ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
            Save edits
          </Button>
          <Button variant="outline" size="sm" onClick={retailor} disabled={retailoring}>
            {retailoring ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            Re-tailor
          </Button>
          <Button size="sm" onClick={() => download(session.outputFormat)} disabled={downloading}>
            <Download className="h-3 w-3 mr-1" /> Download {session.outputFormat}
          </Button>
          <Button size="sm" variant="outline" onClick={() => download(session.outputFormat === "DOCX" ? "PDF" : "DOCX")}>
            <FileText className="h-3 w-3 mr-1" /> Other format
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/tailor/${sessionId}/email`}><Mail className="h-3 w-3 mr-1" /> Email</Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDel(true)}>
            <Trash2 className="h-3 w-3 text-rose-500" />
          </Button>
        </div>
      </div>

      {current && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Tabs defaultValue="preview">
              <TabsList>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="diff">Diff</TabsTrigger>
                <TabsTrigger value="changes">Changes</TabsTrigger>
                <TabsTrigger value="jd">JD</TabsTrigger>
              </TabsList>
              <TabsContent value="preview">
                {edited && (
                  <ResumePreview
                    resume={edited}
                    editable
                    onChange={setEdited}
                    highlightKeyword={highlightKeyword}
                  />
                )}
              </TabsContent>
              <TabsContent value="diff">
                <Card><CardContent className="p-4">
                  <DiffViewer
                    before={session.originalResumeText}
                    after={JSON.stringify(current.tailoredJson, null, 2)}
                  />
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="changes">
                <Card><CardContent className="p-4">
                  <ul className="list-disc ml-5 space-y-1 text-sm">
                    {current.changesMade?.length === 0 && <li className="text-muted-foreground">No changes recorded.</li>}
                    {current.changesMade?.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="jd">
                <Card><CardContent className="p-4 whitespace-pre-wrap text-sm">{session.jdText}</CardContent></Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">ATS Score — Before vs After</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-around gap-4">
                  <div className="text-center">
                    <div className="text-xs uppercase text-muted-foreground tracking-wide mb-1">Before</div>
                    <ATSMeter score={session.styleMetadata?.originalAts?.total ?? 0} />
                    <div className="text-xs text-muted-foreground mt-1">original resume</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs uppercase text-muted-foreground tracking-wide mb-1">After</div>
                    <ATSMeter score={current.atsScore} />
                    <div className="text-xs text-muted-foreground mt-1">tailored resume</div>
                  </div>
                </div>
                {typeof session.styleMetadata?.originalAts?.total === "number" && (
                  <div className="text-center text-sm font-medium">
                    {(() => {
                      const delta = current.atsScore - (session.styleMetadata?.originalAts?.total ?? 0);
                      const sign = delta > 0 ? "+" : "";
                      const cls = delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-600" : "text-muted-foreground";
                      return <span className={cls}>{sign}{delta} points after tailoring</span>;
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Keywords</CardTitle></CardHeader>
              <CardContent>
                <KeywordChips
                  matched={current.matchedKeywords}
                  missing={current.missingKeywords}
                  onChipClick={(k) => setHighlightKeyword(highlightKeyword === k ? null : k)}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="Delete session?"
        description="This deletes all versions and emails. Cannot be undone."
        danger
        confirmText="Delete"
        onConfirm={del}
      />
    </div>
  );
}
