import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION || "us-east-1";
const HAS_S3 = !!(
  BUCKET &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
);

const s3 = HAS_S3
  ? new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null;

// Local fallback dir for dev when S3 not configured.
const LOCAL_DIR = path.join(process.cwd(), ".uploads");

async function ensureLocalDir(key: string) {
  const dir = path.join(LOCAL_DIR, path.dirname(key));
  await fs.mkdir(dir, { recursive: true });
}

export async function uploadBuffer(opts: {
  key?: string;
  prefix?: string;
  contentType: string;
  body: Buffer;
  filename?: string;
}) {
  const key =
    opts.key ??
    `${opts.prefix ?? "uploads"}/${randomUUID()}${
      opts.filename ? `-${opts.filename.replace(/[^\w.\-]/g, "_")}` : ""
    }`;

  if (s3 && BUCKET) {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: opts.body,
        ContentType: opts.contentType,
      }),
    );
    const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURIComponent(key)}`;
    return { key, url };
  }

  await ensureLocalDir(key);
  await fs.writeFile(path.join(LOCAL_DIR, key), opts.body);
  return { key, url: `/api/files/${encodeURIComponent(key)}` };
}

export async function getSignedDownloadUrl(key: string, filename?: string) {
  if (s3 && BUCKET) {
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ResponseContentDisposition: filename
          ? `attachment; filename="${filename}"`
          : undefined,
      }),
      { expiresIn: 60 * 10 },
    );
    return url;
  }
  return `/api/files/${encodeURIComponent(key)}${filename ? `?filename=${encodeURIComponent(filename)}` : ""}`;
}

export async function getObject(key: string): Promise<Buffer> {
  if (s3 && BUCKET) {
    const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const chunks: Buffer[] = [];
    // @ts-ignore
    for await (const chunk of r.Body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  return fs.readFile(path.join(LOCAL_DIR, key));
}

export async function deleteObject(key: string) {
  if (s3 && BUCKET) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    return;
  }
  try {
    await fs.unlink(path.join(LOCAL_DIR, key));
  } catch {
    /* ignore */
  }
}
