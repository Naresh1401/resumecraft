import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8).max(128).optional(),
});

export const CreateSessionSchema = z.object({
  name: z.string().max(200).optional().nullable(),
  jdTitle: z.string().max(200).optional().nullable(),
  jdCompany: z.string().max(200).optional().nullable(),
  jdText: z.string().min(20).max(50_000),
  userPrompt: z.string().max(4000).optional().nullable(),
  outputFormat: z.enum(["DOCX", "PDF"]).default("DOCX"),
  // file fields are validated via FormData in the route
});

export const RetailorSchema = z.object({
  edits: z.any(), // tailoredJson with user edits
  notes: z.string().max(2000).optional(),
});

export const UpdateSessionSchema = z.object({
  name: z.string().min(1).max(200),
});

export const UpdateVersionSchema = z.object({
  tailoredJson: z.any(),
});

export const GenerateEmailSchema = z.object({
  versionId: z.string().min(1),
  sessionId: z.string().min(1),
});

export const UpdateEmailSchema = z.object({
  toEmail: z.string().email().optional().nullable(),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(20_000).optional(),
});

export const SendEmailSchema = z.object({
  toEmail: z.string().email(),
});

export const AdminUserActionSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

export const ResetAllSchema = z.object({
  confirm: z.literal("CONFIRM DELETE ALL"),
});

export const SystemSettingsSchema = z.object({
  aiModel: z.enum(["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5"]).optional(),
  maxFileSizeMb: z.number().int().min(1).max(50).optional(),
  maxTailorPerHour: z.number().int().min(1).max(1000).optional(),
  maxApiCallsPerHour: z.number().int().min(1).max(10000).optional(),
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.number().int().optional().nullable(),
  smtpUser: z.string().optional().nullable(),
  smtpFrom: z.string().optional().nullable(),
});

export const TailoredResumeSchema = z.object({
  personalInfo: z.object({
    name: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    location: z.string().default(""),
    links: z.array(z.string()).default([]),
  }).default({ name: "", email: "", phone: "", location: "", links: [] })
    .describe("Candidate header — copied VERBATIM from the original resume. Do not invent or omit any field that is present in the source."),
  summary: z.string().min(1).describe("Elaborated 5-7 sentence (80-130 word) professional summary tailored to the target role. Cover years of experience, top 3-5 JD-aligned technical strengths the candidate truly has, 1-2 quantified accomplishments, leadership/mentoring scope if any, and a closing line about the value the candidate brings to the target role."),
  coreCompetencies: z.array(z.string()).max(12).default([]),
  technicalSkills: z.record(z.string(), z.array(z.string())).default({}),
  experience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    dates: z.string(),
    bullets: z.array(z.string()),
  })).default([]),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    year: z.string(),
  })).default([]),
  certifications: z.array(z.string()).default([]),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string(),
    technologies: z.array(z.string()).default([]),
  })).default([]),
  atsScore: z.number().min(0).max(100),
  atsBreakdown: z.object({
    keywordMatch: z.number().min(0).max(40),
    sectionScore: z.number().min(0).max(20),
    actionVerbScore: z.number().min(0).max(20),
    formatScore: z.number().min(0).max(10),
    readabilityScore: z.number().min(0).max(10),
  }),
  changesMade: z.array(z.string()).default([]),
  matchedKeywords: z.array(z.string()).default([]),
  missingKeywords: z.array(z.string()).default([]),
});
export type TailoredResume = z.infer<typeof TailoredResumeSchema>;

export const EmailDraftSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  wordCount: z.number().int().min(0),
});
export type EmailDraft = z.infer<typeof EmailDraftSchema>;
