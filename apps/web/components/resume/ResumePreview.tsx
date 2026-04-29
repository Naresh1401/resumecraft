"use client";

import type { TailoredResume } from "@/lib/validators";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ResumePreview({
  resume,
  editable = false,
  onChange,
  highlightKeyword,
}: {
  resume: TailoredResume;
  editable?: boolean;
  onChange?: (next: TailoredResume) => void;
  highlightKeyword?: string | null;
}) {
  function set<K extends keyof TailoredResume>(k: K, v: TailoredResume[K]) {
    if (!onChange) return;
    onChange({ ...resume, [k]: v });
  }

  function highlight(text: string) {
    if (!highlightKeyword) return text;
    const i = text.toLowerCase().indexOf(highlightKeyword.toLowerCase());
    if (i === -1) return text;
    return (
      <>
        {text.slice(0, i)}
        <mark className="bg-amber-300/50 dark:bg-amber-500/40">{text.slice(i, i + highlightKeyword.length)}</mark>
        {text.slice(i + highlightKeyword.length)}
      </>
    );
  }

  const Editable = ({
    value, onChange: oc, multiline,
  }: { value: string; onChange?: (v: string) => void; multiline?: boolean }) => {
    if (!editable) return <span>{highlight(value)}</span>;
    return multiline ? (
      <textarea
        defaultValue={value}
        onBlur={(e) => oc?.(e.target.value)}
        className="w-full bg-transparent border border-dashed border-border rounded-md p-2 text-sm focus:outline-none focus:border-primary"
        rows={Math.max(2, value.split("\n").length)}
      />
    ) : (
      <input
        defaultValue={value}
        onBlur={(e) => oc?.(e.target.value)}
        className="bg-transparent border-b border-dashed border-border focus:outline-none focus:border-primary text-sm w-full"
      />
    );
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Tailored Resume</CardTitle></CardHeader>
      <CardContent className="space-y-5 text-sm">
        <section>
          <h3 className="font-semibold text-xs uppercase tracking-wider mb-1">Summary</h3>
          <Editable
            value={resume.summary || ""}
            multiline
            onChange={(v) => set("summary", v)}
          />
        </section>

        {resume.coreCompetencies?.length > 0 && (
          <section>
            <h3 className="font-semibold text-xs uppercase tracking-wider mb-1">Core Competencies</h3>
            <Editable
              value={resume.coreCompetencies.join(", ")}
              onChange={(v) => set("coreCompetencies", v.split(",").map((s) => s.trim()).filter(Boolean))}
            />
          </section>
        )}

        {resume.technicalSkills && Object.keys(resume.technicalSkills).length > 0 && (
          <section>
            <h3 className="font-semibold text-xs uppercase tracking-wider mb-1">Technical Skills</h3>
            <div className="space-y-1">
              {Object.entries(resume.technicalSkills).map(([cat, skills]) => (
                <div key={cat}>
                  <strong>{cat}:</strong>{" "}
                  <Editable
                    value={(skills as string[]).join(", ")}
                    onChange={(v) =>
                      set("technicalSkills", {
                        ...resume.technicalSkills,
                        [cat]: v.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {resume.experience?.length > 0 && (
          <section>
            <h3 className="font-semibold text-xs uppercase tracking-wider mb-1">Experience</h3>
            <div className="space-y-3">
              {resume.experience.map((e, i) => (
                <div key={i}>
                  <div className="font-medium">
                    <Editable value={e.title} onChange={(v) => {
                      const next = [...resume.experience]; next[i] = { ...e, title: v }; set("experience", next);
                    }} /> — <Editable value={e.company} onChange={(v) => {
                      const next = [...resume.experience]; next[i] = { ...e, company: v }; set("experience", next);
                    }} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <Editable value={e.dates} onChange={(v) => {
                      const next = [...resume.experience]; next[i] = { ...e, dates: v }; set("experience", next);
                    }} />
                  </div>
                  <ul className="list-disc ml-5 mt-1 space-y-1">
                    {e.bullets.map((b, j) => (
                      <li key={j}>
                        <Editable
                          value={b}
                          multiline
                          onChange={(v) => {
                            const next = [...resume.experience];
                            const bullets = [...e.bullets];
                            bullets[j] = v;
                            next[i] = { ...e, bullets };
                            set("experience", next);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {resume.education?.length > 0 && (
          <section>
            <h3 className="font-semibold text-xs uppercase tracking-wider mb-1">Education</h3>
            {resume.education.map((e, i) => (
              <div key={i}>
                {e.degree} — {e.institution} ({e.year})
              </div>
            ))}
          </section>
        )}

        {resume.certifications?.length > 0 && (
          <section>
            <h3 className="font-semibold text-xs uppercase tracking-wider mb-1">Certifications</h3>
            <ul className="list-disc ml-5">{resume.certifications.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </section>
        )}

        {resume.projects?.length > 0 && (
          <section>
            <h3 className="font-semibold text-xs uppercase tracking-wider mb-1">Projects</h3>
            {resume.projects.map((p, i) => (
              <div key={i} className="mb-2">
                <div className="font-medium">{p.name}</div>
                <div>{p.description}</div>
                {p.technologies?.length > 0 && <div className="text-xs text-muted-foreground">Tech: {p.technologies.join(", ")}</div>}
              </div>
            ))}
          </section>
        )}
      </CardContent>
    </Card>
  );
}
