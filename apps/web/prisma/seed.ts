import { PrismaClient, Role, OutputFormat, SessionStatus, EmailStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID, createHash } from "crypto";

const prisma = new PrismaClient();

function makeApiKey() {
  const raw = `rt_${randomUUID().replace(/-/g, "")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash, prefix: raw.slice(0, 8) };
}

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.systemSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      aiModel: "claude-opus-4-5",
      maxFileSizeMb: 5,
      maxTailorPerHour: 10,
      maxApiCallsPerHour: 100,
    },
  });

  // Admin
  const adminKey = makeApiKey();
  const admin = await prisma.user.upsert({
    where: { email: "admin@app.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@app.com",
      passwordHash: await bcrypt.hash("Admin@123", 12),
      role: Role.ADMIN,
      apiKeyHash: adminKey.hash,
      apiKeyPrefix: adminKey.prefix,
      hasSeenTour: true,
    },
  });
  console.log(`  Admin: admin@app.com / Admin@123  (apiKey: ${adminKey.raw})`);

  // Two regular users
  for (let i = 1; i <= 2; i++) {
    const k = makeApiKey();
    const u = await prisma.user.upsert({
      where: { email: `user${i}@app.com` },
      update: {},
      create: {
        name: `Demo User ${i}`,
        email: `user${i}@app.com`,
        passwordHash: await bcrypt.hash("User@123", 12),
        role: Role.USER,
        apiKeyHash: k.hash,
        apiKeyPrefix: k.prefix,
      },
    });
    console.log(`  User: ${u.email} / User@123  (apiKey: ${k.raw})`);

    const session = await prisma.tailoringSession.create({
      data: {
        userId: u.id,
        name: `Senior Engineer @ Acme ${i}`,
        jdTitle: "Senior Software Engineer",
        jdCompany: `Acme ${i}`,
        jdText: "Looking for a senior engineer with React, Node, AWS, TypeScript experience.",
        originalResumeKey: `seed/user${i}/original.docx`,
        originalResumeUrl: "https://example.com/seed.docx",
        originalResumeText: "Jane Doe — Software Engineer with 8+ years building React/Node systems.",
        outputFormat: OutputFormat.DOCX,
        status: SessionStatus.COMPLETED,
      },
    });

    const v = await prisma.resumeVersion.create({
      data: {
        sessionId: session.id,
        versionNumber: 1,
        tailoredJson: {
          summary: "Senior engineer specializing in React, Node, and AWS-native systems.",
          coreCompetencies: ["React", "Node.js", "AWS", "TypeScript"],
          technicalSkills: { Languages: ["TypeScript", "JavaScript"], Cloud: ["AWS"] },
          experience: [{ company: `Acme ${i}`, title: "Sr Engineer", dates: "2020–Present", bullets: ["Led platform migration to AWS"] }],
          education: [{ institution: "State University", degree: "BS CS", year: "2015" }],
          certifications: [],
          projects: [],
        },
        atsScore: 82 + i,
        atsBreakdown: { keywordMatch: 34, sectionScore: 18, actionVerbScore: 16, formatScore: 9, readabilityScore: 6 },
        changesMade: ["Rewrote summary", "Added AWS keywords", "Quantified bullets"],
        matchedKeywords: ["React", "Node", "AWS"],
        missingKeywords: ["Kubernetes"],
        isCurrent: true,
      },
    });

    await prisma.email.create({
      data: {
        sessionId: session.id,
        versionId: v.id,
        toEmail: "recruiter@acme.com",
        subject: "Senior Software Engineer — React/AWS Specialist",
        body: "Hello,\n\nI'm reaching out regarding the Senior Software Engineer role...",
        wordCount: 280,
        status: EmailStatus.DRAFT,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      action: "SEED",
      metadata: { note: "Initial database seed" },
    },
  });

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
