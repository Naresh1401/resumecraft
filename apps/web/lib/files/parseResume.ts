import mammoth from "mammoth";
// pdf-parse has a quirky entrypoint; require the lib directly.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse: (b: Buffer) => Promise<{ text: string; numpages: number; info: any }> = require("pdf-parse/lib/pdf-parse.js");

export type FileKind = "docx" | "pdf";

export type ParsedResume = {
  text: string;
  kind: FileKind;
  styleMetadata: {
    fontFamily: string;
    fontSize: number;
    margins: { top: number; right: number; bottom: number; left: number };
    sections: string[];
  };
};

const SECTION_HEADERS = [
  "summary", "professional summary", "objective",
  "core competencies", "skills", "technical skills",
  "experience", "professional experience", "work experience", "employment",
  "education",
  "certifications", "certificates",
  "projects",
  "awards", "publications",
];

function detectSections(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const found = new Set<string>();
  for (const raw of lines) {
    const line = raw.trim().toLowerCase();
    if (!line || line.length > 60) continue;
    for (const h of SECTION_HEADERS) {
      if (line === h || line === `${h}:`) found.add(h);
    }
  }
  return Array.from(found);
}

// Magic-bytes validation. PDF: %PDF-, DOCX (zip): PK\x03\x04
export function detectKind(buf: Buffer): FileKind | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "pdf";
  if (buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05) && (buf[3] === 0x04 || buf[3] === 0x06)) return "docx";
  return null;
}

export async function parseResumeBuffer(buf: Buffer, declaredMime?: string): Promise<ParsedResume> {
  const kind = detectKind(buf);
  if (!kind) throw new Error("Unsupported or corrupt file. Only DOCX and PDF are accepted.");

  let text = "";
  if (kind === "docx") {
    const r = await mammoth.extractRawText({ buffer: buf });
    text = r.value;
  } else {
    const r = await pdfParse(buf);
    text = r.text;
  }

  text = text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();

  return {
    text,
    kind,
    styleMetadata: {
      fontFamily: kind === "docx" ? "Calibri" : "Helvetica",
      fontSize: 11,
      margins: { top: 720, right: 720, bottom: 720, left: 720 },
      sections: detectSections(text),
    },
  };
}

export async function parseJDBuffer(buf: Buffer): Promise<string> {
  const kind = detectKind(buf);
  if (kind === "docx") {
    const r = await mammoth.extractRawText({ buffer: buf });
    return r.value.trim();
  }
  if (kind === "pdf") {
    const r = await pdfParse(buf);
    return r.text.trim();
  }
  throw new Error("Unsupported JD file format.");
}
