import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, unauthorized, notFound, forbidden, serverError } from "@/lib/auth/rbac";
import { generateDocx } from "@/lib/files/generateDocx";
import { generatePdf } from "@/lib/files/generatePdf";
import { uploadBuffer, getSignedDownloadUrl } from "@/lib/s3/s3Service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: { versionId: string } }) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();

  const version = await prisma.resumeVersion.findUnique({
    where: { id: params.versionId },
    include: { session: true },
  });
  if (!version) return notFound();
  if (version.session.userId !== user.id && user.role !== "ADMIN") return forbidden();

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") || version.session.outputFormat).toUpperCase() as "DOCX" | "PDF";

  try {
    const tailored = version.tailoredJson as any;
    const style = (version.session.styleMetadata as any) || {};

    // Build a friendly filename: "{Candidate Name}_{Role}.{ext}".
    // Falls back to session name if personalInfo or jdTitle are missing.
    const slug = (s: string | null | undefined) =>
      (s || "").trim().replace(/[^\w\s\-]/g, "").replace(/\s+/g, "_").slice(0, 60);
    const candidateName = slug(tailored?.personalInfo?.name);
    const role = slug(version.session.jdTitle || version.session.name);
    const baseParts = [candidateName, role].filter(Boolean);
    const base = baseParts.length ? baseParts.join("_") : slug(version.session.name) || "Tailored_Resume";
    const filename = `${base}.${format.toLowerCase()}`;

    let buf: Buffer;
    let contentType: string;
    if (format === "PDF") {
      buf = await generatePdf(tailored, style);
      contentType = "application/pdf";
    } else {
      buf = await generateDocx(tailored, style);
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    // Persist generated file + log download
    const key = `users/${user.id}/versions/${version.id}.${format.toLowerCase()}`;
    const up = await uploadBuffer({ key, contentType, body: buf, filename });
    await prisma.resumeVersion.update({
      where: { id: version.id },
      data: { fileKey: up.key, fileUrl: up.url },
    });
    await prisma.downloadLog.create({
      data: { userId: user.id, versionId: version.id, format: format as any },
    });

    const inline = searchParams.get("inline") === "1";
    if (inline) {
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }
    const url = await getSignedDownloadUrl(up.key, filename);
    return NextResponse.json({ url, filename });
  } catch (e: any) {
    return serverError(e?.message || "Download generation failed");
  }
}
