import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles, FileCheck2, Mail, History, ShieldCheck, KeyRound,
  UploadCloud, Brain, FileText, Download, Send, ArrowRight, Github,
} from "lucide-react";

const SHOWCASE_MODE = process.env.NEXT_PUBLIC_SHOWCASE_MODE === "true";
const REPO_URL = "https://github.com/Naresh1401/resumecraft";

const STEPS = [
  { icon: UploadCloud, title: "Upload", body: "Drop your resume + the job description." },
  { icon: Brain, title: "Analyze", body: "Claude Opus studies the JD and your background." },
  { icon: FileText, title: "Tailor", body: "Get a rewritten, ATS-optimized resume." },
  { icon: Download, title: "Export", body: "Download as DOCX or PDF in your style." },
  { icon: Send, title: "Email", body: "AI drafts a cold outreach you can send." },
];

const FEATURES = [
  { icon: FileCheck2, title: "ATS Optimization", body: "Custom scoring engine inspired by real ATS pipelines." },
  { icon: FileText, title: "Format Preservation", body: "We mirror your resume's style — no template surprises." },
  { icon: Mail, title: "AI Email Composer", body: "260–380 word recruiter outreach, generated for the role." },
  { icon: History, title: "Version History", body: "Every re-tailor saved. Compare and download any version." },
  { icon: ShieldCheck, title: "Admin Controls", body: "Audit logs, RBAC, rate limits, and reset workflows." },
  { icon: KeyRound, title: "API Access", body: "Programmatic tailoring via personal API key." },
];

const TESTIMONIALS = [
  { name: "Priya S.", role: "Sr. Engineer", text: "Got 3x more callbacks. The ATS gauge is brutally useful." },
  { name: "Marcus T.", role: "PM → AI/ML", text: "Pivoted careers in two weeks with these tailored resumes." },
  { name: "Alex R.", role: "DevOps Lead", text: "The keyword matching is uncanny. It just works." },
];

export default function Page() {
  return (
    <>
      <Navbar landing />
      <main className="relative">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 gradient-mesh -z-10" />
          <div className="container py-24 sm:py-32 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3 w-3" /> Powered by Claude Opus
            </div>
            <h1 className="mt-6 text-4xl sm:text-6xl font-bold tracking-tight">
              Land Your Dream Job. <br />
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Tailored by AI. Scored for ATS.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-muted-foreground">
              Upload a resume and a job description. We rewrite it to match the role, score it for ATS,
              and even draft your recruiter outreach email — in seconds.
            </p>
            <div className="mt-8 flex justify-center gap-3 flex-wrap">
              {SHOWCASE_MODE ? (
                <>
                  <Button asChild size="lg">
                    <a href={REPO_URL} target="_blank" rel="noreferrer">
                      <Github className="h-4 w-4 mr-1" /> View on GitHub <ArrowRight className="h-4 w-4 ml-1" />
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline"><Link href="#how">How it works</Link></Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg"><Link href="/register">Get started — it's free <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
                  <Button asChild size="lg" variant="outline"><Link href="#how">How it works</Link></Button>
                </>
              )}
            </div>
            {SHOWCASE_MODE && (
              <p className="mt-6 text-xs text-muted-foreground max-w-xl mx-auto">
                This is a public showcase of the ResumeCraft project. Clone the repo and run <code className="px-1 py-0.5 rounded bg-muted">pnpm dev</code> to use the full app locally with your own database and Anthropic API key.
              </p>
            )}
          </div>
        </section>

        <section id="how" className="container py-20">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 relative">
            {STEPS.map((s, i) => (
              <div key={s.title} className="text-center relative">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 grid place-items-center text-primary">
                  <s.icon className="h-6 w-6" />
                </div>
                <div className="mt-3 font-semibold">{i + 1}. {s.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.body}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="container py-20">
          <h2 className="text-3xl font-bold text-center mb-12">Everything you need</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <CardContent className="p-6">
                  <f.icon className="h-6 w-6 text-primary" />
                  <div className="mt-3 font-semibold">{f.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{f.body}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="testimonials" className="container py-20">
          <h2 className="text-3xl font-bold text-center mb-12">Loved by job seekers</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name}>
                <CardContent className="p-6">
                  <p className="text-sm">“{t.text}”</p>
                  <div className="mt-4 text-xs text-muted-foreground">{t.name} · {t.role}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="cta" className="container py-20">
          <Card className="max-w-2xl mx-auto border-primary">
            <CardContent className="p-8 text-center">
              <div className="text-sm font-semibold uppercase tracking-wide text-primary">{SHOWCASE_MODE ? "Open Source" : "Free for everyone"}</div>
              <h3 className="mt-2 text-2xl font-bold">{SHOWCASE_MODE ? "Self-host the full app — it's MIT licensed." : "No plans, no paywalls, no credit card."}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {SHOWCASE_MODE
                  ? "Clone the repo, add your Anthropic API key + Postgres connection string, and you have your own private resume tailoring service."
                  : "Every feature — unlimited tailoring, ATS scoring, version history, AI email composer, API access — is open to all signed-in users."}
              </p>
              <Button asChild size="lg" className="mt-6">
                {SHOWCASE_MODE ? (
                  <a href={REPO_URL} target="_blank" rel="noreferrer">
                    <Github className="h-4 w-4 mr-1" /> View on GitHub <ArrowRight className="h-4 w-4 ml-1" />
                  </a>
                ) : (
                  <Link href="/register">Create your account <ArrowRight className="h-4 w-4 ml-1" /></Link>
                )}
              </Button>
            </CardContent>
          </Card>
        </section>

        <footer className="border-t py-10 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ResumeTailor.
        </footer>
      </main>
    </>
  );
}
