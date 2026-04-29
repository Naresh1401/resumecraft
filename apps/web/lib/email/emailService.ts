import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function buildTransporter(): Transporter {
  if (!process.env.SMTP_HOST) {
    // jsonTransport so dev works without SMTP creds.
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export function getTransporter(): Transporter {
  if (!transporter) transporter = buildTransporter();
  return transporter;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  body: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}) {
  const t = getTransporter();
  return t.sendMail({
    from: process.env.EMAIL_FROM || "noreply@resumeapp.com",
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
    attachments: opts.attachments,
  });
}
