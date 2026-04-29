import { anthropic } from "@ai-sdk/anthropic";
import { generateObject, generateText, streamText } from "ai";
import { TailoredResumeSchema, EmailDraftSchema } from "@/lib/validators";
import type { TailoredResume } from "@/lib/validators";

const MODEL = process.env.AI_MODEL || "claude-opus-4-5";

const TAILOR_SYSTEM = `You are a senior resume strategist and ATS expert. Your single most important rule is FAITHFULNESS to the source resume: you must NEVER invent companies, titles, dates, degrees, certifications, metrics, technologies, or accomplishments that are not present in or directly implied by the original resume. You strategically rephrase, reframe, and reorganize the candidate's real experience to maximize alignment with the target job description while preserving 100% factual accuracy.`;

function tailorUserPrompt(resumeText: string, jdText: string, edits?: any, userPrompt?: string) {
  const editsBlock = edits
    ? `\n\nUSER EDITS (incorporate these as the new baseline, then re-tailor):\n${JSON.stringify(edits)}\n`
    : "";
  const guidanceBlock = userPrompt && userPrompt.trim()
    ? `\n\nUSER GUIDANCE (apply where it does not conflict with the GROUNDING RULES below — grounding rules ALWAYS win):\n"""\n${userPrompt.trim()}\n"""\n`
    : "";
  return `INPUTS:
=== ORIGINAL RESUME (source of truth) ===
${resumeText}
=== END ORIGINAL RESUME ===

=== JOB DESCRIPTION (target) ===
${jdText}
=== END JOB DESCRIPTION ===${editsBlock}${guidanceBlock}

GROUNDING RULES (HIGHEST PRIORITY — violating these is a critical failure):
- COPY personalInfo (name, email, phone, location, links) VERBATIM from the contact block at the top of the ORIGINAL RESUME. If a field is missing from the original, leave it as an empty string — never invent. Do not include the address/city for the OUTPUT location field if the original only shows a city/state, you may keep just the city; otherwise copy verbatim.
- Use ONLY facts present in the ORIGINAL RESUME above. If a JD-required skill is not in the resume, list it under "missingKeywords" — do NOT add it to the candidate's skills or experience.
- Preserve EVERY company name, job title, employment date range, education institution, degree, graduation year, and certification EXACTLY as written. Do not paraphrase company or institution names.
- Do not invent metrics. Only quantify a bullet if a number, percentage, scale, or measurable outcome is present or directly implied in the original. If implied (e.g., "led the migration"), you may rephrase but never fabricate a specific number.
- Preserve the same set of jobs and projects. Do not merge, split, drop, or reorder jobs. Keep bullet count per role within ±1 of the original.
- Every keyword you place in matchedKeywords MUST appear in BOTH the JD and somewhere truthful in the candidate's resume.

CONTENT RULES:
- Write an ELABORATED Professional Summary of 5-7 sentences (80-130 words) addressing: (a) total years of relevant experience, (b) the exact target job title, (c) the top 3-5 technical requirements from the JD that the candidate ACTUALLY has, (d) 1-2 quantified accomplishments drawn from the resume, (e) leadership/mentoring scope if applicable, and (f) a closing line on the value delivered to the target role. Avoid first-person pronouns.
- Rewrite each experience bullet using strong action verbs (Led, Architected, Engineered, Optimized, Deployed, Automated, Reduced, Increased, Delivered, Built, Designed, Developed, Implemented, Launched, Migrated, Scaled, Accelerated, Streamlined, Spearheaded, Drove, Owned, Established, Mentored, Refactored, Integrated, Orchestrated, Modernized) — EVERY bullet MUST begin with one of these verbs in past tense. Aim for at least one quantified outcome (number, %, $, scale, time saved) per role.
- Keep individual bullets between 14 and 28 words for ATS readability.
- NARRATIVE COHESION: Within each role, order the bullets so they tell a story — first the scope/architecture decisions, then the implementation details, then the operational/quality outcomes, then the leadership/mentoring impact. Each bullet should feel like a logical next step from the previous one (cause → effect, problem → solution, scope → outcome). Vary sentence openers and structure so the bullets read like a real human wrote them — not a templated list.
- HUMAN VOICE: Avoid robotic patterns like "Engineered solution to X using Y to achieve Z" repeated identically. Use natural connectors (e.g., "which cut", "resulting in", "to support") sparingly to link related work. No buzzword stuffing, no LinkedIn cliches ("results-oriented", "passionate about", "team player").
- PUNCTUATION: Do NOT use the Oxford / serial comma — never put a comma immediately before "and", "or" or "&" in a list. Write "Python, Java and Go" — not "Python, Java, and Go".
- KEYWORD SURFACING: For every JD-required technology, tool, methodology or framework that the candidate genuinely has experience with, ensure it appears verbatim (using the JD's exact spelling/casing) in at least one of: Technical Skills, Core Competencies, Summary, or an experience bullet. Do NOT keyword-stuff — weave naturally.
- Optimize the Skills section: list ONLY skills the candidate actually has, grouped by category (Languages, Frameworks, Cloud, Tools, Databases, Methodologies). Use the exact spelling from the JD when the candidate has the equivalent skill.
- Core Competencies: up to 12 short chips drawn from JD requirements the candidate truly matches.
- Use standard ATS-safe section names: Summary, Core Competencies, Technical Skills, Professional Experience, Education, Certifications, Projects.

EXCLUSIONS (NEVER include any of these in the output):
- Visa status / work authorization
- Pay rate / salary / compensation
- LinkedIn URL or any social link
- Physical address, city, state, country
- Relocation preferences
- "References available upon request" or any references section

ATS SCORING (compute honestly from the tailored resume vs JD):
- keywordMatch (0-40): % of JD keywords present in tailored resume × 40
- sectionScore (0-20): all required sections present and well-formed
- actionVerbScore (0-20): proportion of bullets starting with strong action verbs and containing quantification
- formatScore (0-10): no banned formatting (tables, columns, images, headers/footers)
- readabilityScore (0-10): consistent tense, no run-ons, scannable bullets
- atsScore = sum of all five.

OUTPUT: Return a single JSON object that conforms to the provided TailoredResume schema. matchedKeywords and missingKeywords must be lower-cased deduplicated lists. changesMade must be a concise human-readable list of the most impactful edits you made (e.g., "Reframed Project X bullets around Kubernetes and observability per JD").`;
}

const EMAIL_SYSTEM = `You are an elite technical career coach and professional recruiter communication specialist who writes cold outreach emails that get responses. You write with authority, precision, and technical depth.`;

function emailUserPrompt(tailoredJson: TailoredResume, jdText: string) {
  return `Generate a professional recruiter outreach email using:
1. TAILORED RESUME JSON: ${JSON.stringify(tailoredJson)}
2. JOB DESCRIPTION: ${jdText}

MANDATORY RULES — follow every rule without exception:

WHAT TO INCLUDE:
- Opening line that immediately states the target role and one specific technical requirement from the JD the candidate excels at — NO generic 'I am writing to express interest' openers
- Paragraph 1: Connect the candidate's most relevant technical experience directly to the top 2–3 JD requirements using specific technologies, tools, and measurable outcomes from the resume
- Paragraph 2: Highlight 2 specific technical achievements from the resume that directly address JD needs — include technologies, scale, and impact
- Paragraph 3: Demonstrate knowledge of why this specific role/tech stack is compelling to the candidate — show genuine technical interest
- Closing: Confident, direct call to action (request a 20-minute call, suggest specific availability) — not passive
- Signature: Name | Phone | Email only

STRICT EXCLUSIONS — never mention any of the following:
- Visa status, work authorization, OPT, H1B, green card, citizenship — NEVER under any circumstances
- Pay rate, salary expectations, compensation, hourly rate
- LinkedIn profile URL or any social media links
- Physical location, city, state, zip, country, relocation
- Soft skills as primary selling points (teamwork, communication, hardworking)
- Bullet points or numbered lists anywhere in the email body
- HTML tags or image references
- Attachments mentioned in body text

FORMAT REQUIREMENTS:
- Plain prose paragraphs only
- Length: 260–380 words (strictly enforced)
- Tone: Confident, professional, technically authoritative — not subservient or overly enthusiastic
- Subject line: role-specific, includes job title + top technical skill + action word (max 12 words)

OUTPUT: Return ONLY valid JSON:
{
  "subject": "string",
  "body": "string",
  "wordCount": number
}`;
}

function extractJson<T = any>(text: string): T {
  // Handle ```json fences and extra prose
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI returned non-JSON output");
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function tailorResume(opts: {
  resumeText: string;
  jdText: string;
  edits?: any;
  userPrompt?: string;
}): Promise<TailoredResume> {
  // Structured output via Zod — model is constrained to produce schema-valid JSON.
  // Low temperature + explicit grounding rules in the prompt keep outputs faithful to the input.
  const { object } = await generateObject({
    model: anthropic(MODEL),
    schema: TailoredResumeSchema,
    schemaName: "TailoredResume",
    schemaDescription: "ATS-optimized tailored resume that strictly preserves all factual data from the original.",
    system: TAILOR_SYSTEM,
    prompt: tailorUserPrompt(opts.resumeText, opts.jdText, opts.edits, opts.userPrompt),
    temperature: 0.2,
    maxRetries: 0,
  });
  return object;
}

export function streamTailorResume(opts: { resumeText: string; jdText: string; edits?: any; userPrompt?: string }) {
  return streamText({
    model: anthropic(MODEL),
    system: TAILOR_SYSTEM,
    prompt: tailorUserPrompt(opts.resumeText, opts.jdText, opts.edits, opts.userPrompt),
    temperature: 0.4,
  });
}

export async function generateEmail(opts: {
  tailored: TailoredResume;
  jdText: string;
}): Promise<{ subject: string; body: string; wordCount: number }> {
  const { object } = await generateObject({
    model: anthropic(MODEL),
    schema: EmailDraftSchema,
    schemaName: "RecruiterEmailDraft",
    schemaDescription: "260-380 word professional recruiter outreach email derived from the tailored resume.",
    system: EMAIL_SYSTEM,
    prompt: emailUserPrompt(opts.tailored, opts.jdText),
    temperature: 0.4,
    maxRetries: 0,
  });
  const wc = object.body.trim().split(/\s+/).length;
  return { subject: object.subject, body: object.body, wordCount: wc };
}

export function streamEmail(opts: { tailored: TailoredResume; jdText: string }) {
  return streamText({
    model: anthropic(MODEL),
    system: EMAIL_SYSTEM,
    prompt: emailUserPrompt(opts.tailored, opts.jdText),
    temperature: 0.6,
  });
}

export { extractJson };
