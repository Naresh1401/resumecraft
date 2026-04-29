import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import type { TailoredResume } from "@/lib/validators";
import { polishStrings, noOxford } from "./textPolish";

type StyleMeta = {
  fontFamily?: string;
  fontSize?: number;
  margins?: { top: number; right: number; bottom: number; left: number };
};

// Monochrome professional palette — no colored text, only neutral borders.
const TEXT = "000000";
const MUTED = "595959";
const RULE = "9E9E9E";

function heading(text: string, font: string) {
  return new Paragraph({
    spacing: { before: 220, after: 80 },
    keepNext: true, // never separate a heading from the first line that follows
    children: [
      new TextRun({
        text: noOxford(text).toUpperCase(),
        bold: true,
        size: 26, // 13pt
        font,
        color: TEXT,
      }),
    ],
    border: { bottom: { color: TEXT, space: 2, style: BorderStyle.SINGLE, size: 8 } },
  });
}

function bullet(text: string, font: string, size: number) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80, line: 280 },
    alignment: AlignmentType.JUSTIFIED,
    keepLines: true, // never split a single bullet across pages
    children: [new TextRun({ text: noOxford(text), font, size: size * 2, color: TEXT })],
  });
}

function line(
  text: string,
  font: string,
  size: number,
  opts: {
    bold?: boolean;
    italics?: boolean;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    color?: string;
    keepNext?: boolean;
  } = {},
) {
  return new Paragraph({
    spacing: { after: 60 },
    alignment: opts.align ?? AlignmentType.LEFT,
    keepNext: opts.keepNext,
    keepLines: true,
    children: [
      new TextRun({
        text: noOxford(text),
        font,
        size: size * 2,
        bold: opts.bold,
        italics: opts.italics,
        color: opts.color ?? TEXT,
      }),
    ],
  });
}

function skillsTable(
  skills: Record<string, string[]>,
  font: string,
  size: number,
): Table {
  const cellHeader = (text: string, widthPct: number): TableCell =>
    new TableCell({
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [
        new Paragraph({
          keepLines: true,
          children: [new TextRun({ text, bold: true, color: TEXT, font, size: size * 2 })],
        }),
      ],
    });

  const rows: TableRow[] = [];
  rows.push(
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [cellHeader("Category", 28), cellHeader("Skills", 72)],
    }),
  );
  for (const [cat, items] of Object.entries(skills)) {
    if (!items?.length) continue;
    rows.push(
      new TableRow({
        cantSplit: true, // keep each row together across page breaks
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [
              new Paragraph({
                keepLines: true,
                children: [new TextRun({ text: cat, bold: true, font, size: size * 2, color: TEXT })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 72, type: WidthType.PERCENTAGE },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [
              new Paragraph({
                keepLines: true,
                children: [
                  new TextRun({ text: noOxford(items.join(", ")), font, size: size * 2, color: TEXT }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: TEXT },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: TEXT },
      left: { style: BorderStyle.SINGLE, size: 6, color: TEXT },
      right: { style: BorderStyle.SINGLE, size: 6, color: TEXT },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: RULE },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: RULE },
    },
  });
}

export async function generateDocx(rawResume: TailoredResume, style: StyleMeta = {}): Promise<Buffer> {
  const resume = polishStrings(rawResume);
  const font = style.fontFamily || "Calibri";
  const size = style.fontSize || 11;
  const margins = style.margins || { top: 720, right: 720, bottom: 720, left: 720 };

  const children: (Paragraph | Table)[] = [];

  // Header — name + contact info, centered, monochrome.
  const pi = (resume.personalInfo || {}) as {
    name?: string; email?: string; phone?: string; location?: string; links?: string[];
  };
  if (pi.name) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        keepNext: true,
        children: [
          new TextRun({ text: pi.name, font, size: 36, bold: true, color: TEXT }), // 18pt
        ],
      }),
    );
  }
  const contactBits: string[] = [];
  if (pi.email) contactBits.push(pi.email);
  if (pi.phone) contactBits.push(pi.phone);
  if (pi.location) contactBits.push(pi.location);
  for (const l of pi.links || []) contactBits.push(l);
  if (contactBits.length) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        keepNext: true,
        border: { bottom: { color: TEXT, space: 6, style: BorderStyle.SINGLE, size: 6 } },
        children: [new TextRun({ text: contactBits.join("  |  "), font, size: size * 2, color: MUTED })],
      }),
    );
  }

  // Summary — justified for clean alignment, generous line spacing.
  children.push(heading("Professional Summary", font));
  children.push(
    new Paragraph({
      spacing: { after: 80, line: 300 },
      alignment: AlignmentType.JUSTIFIED,
      keepLines: true,
      children: [new TextRun({ text: noOxford(resume.summary), font, size: size * 2, color: TEXT })],
    }),
  );

  // Core Competencies
  if (resume.coreCompetencies?.length) {
    children.push(heading("Core Competencies", font));
    children.push(line(resume.coreCompetencies.join("  •  "), font, size, { align: AlignmentType.LEFT }));
  }

  // Technical Skills — table format
  if (resume.technicalSkills && Object.keys(resume.technicalSkills).length) {
    children.push(heading("Technical Skills", font));
    children.push(skillsTable(resume.technicalSkills, font, size));
  }

  // Experience — keep title + dates + first bullet together.
  if (resume.experience?.length) {
    children.push(heading("Professional Experience", font));
    for (const exp of resume.experience) {
      children.push(
        new Paragraph({
          spacing: { after: 0 },
          keepNext: true,
          keepLines: true,
          children: [
            new TextRun({ text: `${exp.title}`, font, size: size * 2, bold: true, color: TEXT }),
            new TextRun({ text: ` — ${exp.company}`, font, size: size * 2, bold: true, color: TEXT }),
          ],
        }),
      );
      children.push(line(exp.dates, font, size, { italics: true, color: MUTED, keepNext: true }));
      for (const b of exp.bullets) children.push(bullet(b, font, size));
    }
  }

  // Education
  if (resume.education?.length) {
    children.push(heading("Education", font));
    for (const ed of resume.education) {
      children.push(line(`${ed.degree} — ${ed.institution} (${ed.year})`, font, size));
    }
  }

  // Certifications
  if (resume.certifications?.length) {
    children.push(heading("Certifications", font));
    for (const c of resume.certifications) children.push(bullet(c, font, size));
  }

  // Projects
  if (resume.projects?.length) {
    children.push(heading("Projects", font));
    for (const p of resume.projects) {
      children.push(line(p.name, font, size, { bold: true, keepNext: true }));
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          alignment: AlignmentType.JUSTIFIED,
          keepLines: true,
          children: [new TextRun({ text: noOxford(p.description), font, size: size * 2, color: TEXT })],
        }),
      );
      if (p.technologies?.length)
        children.push(
          line(`Tech: ${p.technologies.join(", ")}`, font, size, { italics: true, color: MUTED }),
        );
    }
  }

  const doc = new Document({
    creator: "Resume Tailoring",
    styles: {
      default: {
        document: { run: { font, size: size * 2, color: TEXT } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: margins,
            // Monochrome single-line page borders
            borders: {
              pageBorderTop: { style: BorderStyle.SINGLE, size: 8, color: TEXT, space: 16 },
              pageBorderBottom: { style: BorderStyle.SINGLE, size: 8, color: TEXT, space: 16 },
              pageBorderLeft: { style: BorderStyle.SINGLE, size: 8, color: TEXT, space: 16 },
              pageBorderRight: { style: BorderStyle.SINGLE, size: 8, color: TEXT, space: 16 },
            } as any,
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
