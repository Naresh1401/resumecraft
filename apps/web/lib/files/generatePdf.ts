import type { TailoredResume } from "@/lib/validators";
import { polishStrings, noOxford } from "./textPolish";

export function renderResumeHtml(rawResume: TailoredResume, style?: { fontFamily?: string; fontSize?: number }): string {
  const resume = polishStrings(rawResume);
  const font = style?.fontFamily || "Helvetica, Arial, sans-serif";
  const size = style?.fontSize || 11;

  const esc = (s: string) =>
    noOxford(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const pi = (resume.personalInfo || {}) as {
    name?: string; email?: string; phone?: string; location?: string; links?: string[];
  };
  const contactBits: string[] = [];
  if (pi.email) contactBits.push(esc(pi.email));
  if (pi.phone) contactBits.push(esc(pi.phone));
  if (pi.location) contactBits.push(esc(pi.location));
  for (const l of pi.links || []) contactBits.push(esc(l));
  const headerHtml = pi.name
    ? `<header>
        <h1>${esc(pi.name)}</h1>
        ${contactBits.length ? `<div class="contact">${contactBits.join("&nbsp;&nbsp;|&nbsp;&nbsp;")}</div>` : ""}
       </header>`
    : "";

  const skillsRows = Object.entries(resume.technicalSkills || {})
    .filter(([, v]) => (v as string[])?.length)
    .map(
      ([k, v]) =>
        `<tr><th scope="row">${esc(k)}</th><td>${esc((v as string[]).join(", "))}</td></tr>`,
    )
    .join("");
  const skillsHtml = skillsRows
    ? `<table class="skills"><thead><tr><th>Category</th><th>Skills</th></tr></thead><tbody>${skillsRows}</tbody></table>`
    : "";

  const expHtml = (resume.experience || [])
    .map(
      (e) => `
      <div class="exp">
        <div class="row"><strong>${esc(e.title)} <span class="company">— ${esc(e.company)}</span></strong><em>${esc(e.dates)}</em></div>
        <ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
      </div>`,
    )
    .join("");

  const eduHtml = (resume.education || [])
    .map((e) => `<div>${esc(e.degree)} — ${esc(e.institution)} (${esc(e.year)})</div>`)
    .join("");

  const certHtml = (resume.certifications || []).length
    ? `<ul class="certs">${resume.certifications.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>`
    : "";

  const projHtml = (resume.projects || [])
    .map(
      (p) => `
      <div class="proj">
        <strong>${esc(p.name)}</strong>
        <div class="proj-desc">${esc(p.description)}</div>
        ${p.technologies?.length ? `<em>Tech: ${esc(p.technologies.join(", "))}</em>` : ""}
      </div>`,
    )
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  @page { size: Letter; margin: 0.5in; }
  body {
    font-family: ${font}; font-size: ${size}pt; color: #000; line-height: 1.4;
    border: 1px solid #000; padding: 18px 22px; box-sizing: border-box;
  }
  header { text-align: center; padding-bottom: 10px; border-bottom: 1px solid #000; margin-bottom: 6px; page-break-after: avoid; break-after: avoid; }
  header h1 { margin: 0 0 4px; font-size: ${size + 8}pt; color: #000; letter-spacing: 0.5px; }
  header .contact { color: #595959; font-size: ${size - 0.5}pt; }
  h2 {
    font-size: ${size + 2}pt; text-transform: uppercase; color: #000;
    border-bottom: 1px solid #000; padding-bottom: 2px; margin: 14px 0 6px; letter-spacing: 0.4px;
    page-break-after: avoid; break-after: avoid;
  }
  p, .summary { text-align: justify; margin: 4px 0 8px; page-break-inside: avoid; break-inside: avoid; }
  ul { margin: 4px 0 8px 18px; padding: 0; }
  li { margin-bottom: 4px; text-align: justify; text-justify: inter-word; page-break-inside: avoid; break-inside: avoid; }
  .row { display: flex; justify-content: space-between; align-items: baseline; page-break-after: avoid; break-after: avoid; }
  .row em { color: #595959; font-style: italic; }
  .row .company { color: #000; }
  .exp, .proj { margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid; }
  .proj-desc { text-align: justify; }
  table.skills { width: 100%; border-collapse: collapse; margin: 4px 0 6px; page-break-inside: avoid; break-inside: avoid; }
  table.skills th, table.skills td { border: 1px solid #9E9E9E; padding: 6px 8px; vertical-align: top; color: #000; }
  table.skills thead th { background: #fff; color: #000; text-align: left; border-color: #000; border-bottom-width: 2px; }
  table.skills tbody th { width: 26%; background: #fff; text-align: left; font-weight: 700; }
  table.skills tr { page-break-inside: avoid; break-inside: avoid; }
</style></head>
<body>
  ${headerHtml}

  <h2>Professional Summary</h2>
  <p class="summary">${esc(resume.summary)}</p>

  ${
    resume.coreCompetencies?.length
      ? `<h2>Core Competencies</h2><div>${esc(resume.coreCompetencies.join("  •  "))}</div>`
      : ""
  }

  ${skillsHtml ? `<h2>Technical Skills</h2>${skillsHtml}` : ""}
  ${expHtml ? `<h2>Professional Experience</h2>${expHtml}` : ""}
  ${eduHtml ? `<h2>Education</h2>${eduHtml}` : ""}
  ${certHtml ? `<h2>Certifications</h2>${certHtml}` : ""}
  ${projHtml ? `<h2>Projects</h2>${projHtml}` : ""}
</body></html>`;
}

export async function generatePdf(resume: TailoredResume, style?: { fontFamily?: string; fontSize?: number }): Promise<Buffer> {
  const html = renderResumeHtml(resume, style);
  // Lazy import to avoid loading puppeteer in routes that don't need it.
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
