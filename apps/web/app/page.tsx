"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Upload, Download, Loader2, Github, FileText, Wand2 } from "lucide-react";

const REPO_URL = "https://github.com/Naresh1401/resumecraft";

type Result = {
  tailored: any;
  ats: { before: number; after: number; improvement: number };
  docxBase64: string | null;
  docxFilename: string;
};

export default function Page() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  // Cache the resume text + JD that produced the current result so refine calls
  // don't need a re-upload of the original file.
  const [cached, setCached] = useState<{ resumeText: string; jdText: string } | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");

  async function callApi(fd: FormData) {
    const res = await fetch("/api/quick-tailor", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Tailoring failed");
    return data as Result;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!resumeFile && resumeText.trim().length < 50) {
      setError("Upload a resume file or paste at least 50 characters of resume text.");
      return;
    }
    if (jdText.trim().length < 20) {
      setError("Paste a job description (at least 20 characters).");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      if (resumeFile) fd.append("resume", resumeFile);
      else fd.append("resumeText", resumeText);
      fd.append("jdText", jdText);
      if (userPrompt.trim()) fd.append("userPrompt", userPrompt.trim());

      const data = await callApi(fd);
      setResult(data);
      // Cache the resolved resume text from the API response for refine calls.
      // (We re-derive it from the file on the server, so reuse what we sent.)
      setCached({
        resumeText: resumeFile ? "" : resumeText,
        jdText,
      });
      // If we used a file, we need to keep the file around for refines.
      // resumeFile is already in state, so refines below will re-send it.
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onRefine() {
    if (!result) return;
    setError(null);
    setRefining(true);
    try {
      const fd = new FormData();
      if (resumeFile) fd.append("resume", resumeFile);
      else if (cached?.resumeText) fd.append("resumeText", cached.resumeText);
      else fd.append("resumeText", resumeText);
      fd.append("jdText", cached?.jdText || jdText);
      if (refinePrompt.trim()) fd.append("userPrompt", refinePrompt.trim());
      fd.append("previousTailored", JSON.stringify(result.tailored));

      const data = await callApi(fd);
      setResult(data);
      setRefinePrompt("");
    } catch (err: any) {
      setError(err?.message || "Refine failed");
    } finally {
      setRefining(false);
    }
  }

  function downloadDocx() {
    if (!result?.docxBase64) return;
    const bytes = Uint8Array.from(atob(result.docxBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.docxFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>ResumeCraft</span>
          </div>
          <Button asChild size="sm" variant="outline">
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              <Github className="h-4 w-4 mr-1" /> GitHub
            </a>
          </Button>
        </div>
      </header>

      <section className="container py-10 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Tailor your resume in seconds</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your resume + paste a job description. AI rewrites it for ATS and gives you a ready-to-send .docx.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-3">
              <label className="block text-sm font-medium">1. Your resume</label>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground hover:bg-accent">
                  <input
                    type="file"
                    accept=".docx,.pdf"
                    className="hidden"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  />
                  <Upload className="inline h-4 w-4 mr-2" />
                  {resumeFile ? resumeFile.name : "Upload .docx or .pdf"}
                </label>
                {resumeFile && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setResumeFile(null)}>
                    Clear
                  </Button>
                )}
              </div>
              <div className="text-xs text-muted-foreground">— or paste resume text below —</div>
              <Textarea
                placeholder="Paste your full resume text here..."
                rows={6}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                disabled={!!resumeFile}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-3">
              <label className="block text-sm font-medium">2. Job description</label>
              <Textarea
                placeholder="Paste the full job description here..."
                rows={8}
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-2">
              <label className="block text-sm font-medium">
                3. Custom instructions <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Leave blank for an automatic tailoring that targets a 90–95 ATS score using only the roles and facts from your original resume.
              </p>
              <Textarea
                placeholder='e.g. "Emphasize my AWS work", "Lead with the StartupXYZ role", "Tone down the leadership language"...'
                rows={3}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
              />
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Tailoring (~10 sec)...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" /> Tailor my resume
              </>
            )}
          </Button>
        </form>

        {result && (
          <div className="mt-10 space-y-4">
            <Card className="border-primary">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">ATS Score</div>
                    <div className="mt-1 flex items-baseline gap-3">
                      <span className="text-4xl font-bold">{result.ats.after}</span>
                      <span className="text-sm text-muted-foreground">
                        was {result.ats.before}
                      </span>
                      <span className="text-sm font-semibold text-green-600">
                        +{result.ats.improvement}
                      </span>
                    </div>
                  </div>
                  {result.docxBase64 && (
                    <Button onClick={downloadDocx} size="lg">
                      <Download className="h-4 w-4 mr-2" /> Download .docx
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 font-semibold mb-3">
                  <FileText className="h-4 w-4" /> Tailored Summary
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {result.tailored?.summary || "—"}
                </p>
              </CardContent>
            </Card>

            {Array.isArray(result.tailored?.matchedKeywords) && result.tailored.matchedKeywords.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <div className="font-semibold mb-3">Matched Keywords</div>
                  <div className="flex flex-wrap gap-2">
                    {result.tailored.matchedKeywords.map((k: string) => (
                      <span key={k} className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs">
                        {k}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {Array.isArray(result.tailored?.changesMade) && result.tailored.changesMade.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <div className="font-semibold mb-3">What changed</div>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    {result.tailored.changesMade.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card className="border-dashed">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-2 font-semibold">
                  <Wand2 className="h-4 w-4" /> Refine this resume
                </div>
                <p className="text-xs text-muted-foreground">
                  Tell the AI what to change — it will re-tailor while keeping all the original roles, dates and facts intact.
                </p>
                <Textarea
                  placeholder='e.g. "Make the summary shorter", "Add more focus on Kubernetes", "Remove the mentoring bullet"...'
                  rows={3}
                  value={refinePrompt}
                  onChange={(e) => setRefinePrompt(e.target.value)}
                  disabled={refining}
                />
                <Button onClick={onRefine} disabled={refining || !refinePrompt.trim()} className="w-full sm:w-auto">
                  {refining ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Refining...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" /> Apply changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      <footer className="container py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ResumeCraft · <a href={REPO_URL} className="underline">source</a>
      </footer>
    </main>
  );
}

