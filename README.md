# ResumeTailor

AI-powered resume tailoring SaaS. Upload a resume + a job description, and get back an ATS-optimized rewrite, scored by a custom ATS engine, plus an AI-drafted recruiter outreach email — all wrapped in a polished Next.js app with admin controls, audit logging, RBAC, and an API.

> Built end-to-end: Next.js 14 (App Router), TypeScript, Tailwind, ShadCN-style primitives, NextAuth v5, Prisma + PostgreSQL, Redis (rate limiting), AWS S3 (file storage with local FS fallback), Nodemailer (with `jsonTransport` fallback), the `ai` SDK + `@ai-sdk/openai`, Recharts, Framer Motion, TipTap-style inline editing, diff-match-patch, Puppeteer + `docx` for exports.

---

## ✨ Features

- **Tailor**: AI rewrites your resume to a JD while preserving your style. Style metadata is extracted from your DOCX.
- **ATS Scoring** (server-authoritative, 100-pt scale):
  - Keyword Match (40)
  - Section Score (20)
  - Action Verbs / Quantification (20)
  - Format (10)
  - Readability (10)
- **Diff View** with `diff-match-patch` highlights.
- **Versioning**: every re-tailor creates a new version. Switch and download any.
- **Inline Editing** of the tailored resume; edits trigger a recompute.
- **Cold Email Composer**: GPT generates a 250–380 word recruiter outreach you can edit, save, and send.
- **DOCX & PDF Export**: high-fidelity DOCX via `docx`; print-perfect PDF via Puppeteer.
- **API Access**: every user gets a `rt_…` API key (`Authorization: Bearer rt_…`).
- **Rate Limiting**: 10 tailors/hr, 100 API calls/hr per user (Upstash Redis with in-memory fallback).
- **Admin Console**: analytics, user management, audit logs, system settings, full-history reset.
- **Security**: bcrypt password hashing, sha256-hashed API keys, CORS allowlist, security headers (HSTS, X-Frame-Options, etc.), magic-byte file validation.
- **DX**: Prisma migrations + seed, Docker Compose, dark/light theme, keyboard shortcuts, onboarding tooltip.

---

## 🚀 Quick Start

### Prerequisites
- Node 20+
- pnpm 9+
- PostgreSQL 15 (or use the included Docker Compose)
- An `OPENAI_API_KEY`

### 1. Install
```bash
pnpm install
```

### 2. Configure environment
```bash
cp apps/web/.env.example apps/web/.env
# edit apps/web/.env  →  set DATABASE_URL, NEXTAUTH_SECRET, OPENAI_API_KEY at minimum
```

### 3. Database
```bash
pnpm --filter web prisma migrate dev
pnpm db:seed
```

Seed creates:
- `admin@app.com / Admin@123` (ADMIN)
- `user1@app.com / User@123`
- `user2@app.com / User@123`

The seed script prints each user's raw API key once — copy it from the console.

### 4. Run
```bash
pnpm dev          # http://localhost:3000
```

### 5. (Optional) Docker
```bash
docker compose up --build
```
Brings up Postgres, Redis, and the Next.js app together.

---

## 🏗️ Architecture

```
apps/web
├── app/                       Next.js App Router (server components by default)
│   ├── (auth)/                public auth pages
│   ├── (app)/                 authenticated layout + sidebar
│   │   ├── dashboard/
│   │   ├── tailor/
│   │   │   └── [sessionId]/email/
│   │   ├── profile/
│   │   └── admin/
│   └── api/                   route handlers (runtime: nodejs)
├── components/                ShadCN primitives + feature components
├── lib/
│   ├── ai/                    AI prompts + streaming
│   ├── ats/                   custom ATS scoring engine
│   ├── auth/                  NextAuth + RBAC + API key
│   ├── files/                 PDF/DOCX parse + generate
│   ├── s3/                    S3 with local FS fallback
│   ├── email/                 Nodemailer wrapper
│   ├── validators/            Zod schemas + types
│   └── prisma.ts, rateLimit.ts, security.ts, utils.ts
├── prisma/                    schema + seed
└── middleware.ts              CORS + auth guard
```

### Tailoring flow
1. Client uploads resume + JD via `POST /api/tailor/sessions` (multipart).
2. Magic-byte validation (`%PDF-`, `PK\x03\x04`).
3. Resume parsed (mammoth/pdf-parse) → text + style metadata.
4. AI tailor prompt → strict JSON resume.
5. ATS scorer recomputes authoritative score.
6. Version 1 saved with score, breakdown, matched/missing keywords, changes log.

### Versions
- Re-tailoring (`POST /api/tailor/sessions/:id/retailor`) creates a new version, marks the previous `isCurrent=false`.
- Editing (`PUT /api/versions/:id`) recomputes ATS in-place.

### Email
- `POST /api/email/generate` calls a separate prompt that returns `{ subject, body, wordCount }`.
- `POST /api/email/:id/send` validates word count and emails via Nodemailer (or logs JSON in dev).

---

## 🔐 Authentication

Two-tier auth on every protected route:

1. **Session** (NextAuth credentials) — used by the web app.
2. **API Key** — `Authorization: Bearer rt_xxxxxxxx…`. Hashed with sha256; only the prefix is stored for masked display.

`getAuthedUser(req)` checks the API key first, then falls back to NextAuth.

---

## 📡 API Reference (selected)

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create user + initial API key |
| POST | `/api/auth/[...nextauth]` | NextAuth (sign in / sign out) |
| GET/PUT | `/api/user/profile` | Read / update profile |
| GET | `/api/user/api-key` | Masked key |
| POST | `/api/user/api-key/regenerate` | New key (returns raw once) |
| GET/POST | `/api/tailor/sessions` | List / create |
| GET/PUT/DELETE | `/api/tailor/sessions/:id` | Session detail |
| POST | `/api/tailor/sessions/:id/retailor` | New version |
| GET | `/api/tailor/sessions/:id/versions` | All versions |
| PUT | `/api/versions/:id` | Edit + rescore |
| GET | `/api/versions/:id/download?format=DOCX\|PDF` | Download |
| POST | `/api/email/generate` | Draft email |
| GET | `/api/email/session/:sessionId` | List emails |
| PUT | `/api/email/:id` | Update draft |
| POST | `/api/email/:id/send` | Send |
| GET | `/api/admin/analytics` | Totals + 14-day buckets + top keywords |
| GET | `/api/admin/users` | Paginated users |
| PUT | `/api/admin/users/:id` | Role / activation |
| DELETE | `/api/admin/users/:id/history` | Reset user history |
| POST | `/api/admin/users/:id/api-key/revoke` | Revoke + regenerate |
| POST | `/api/admin/reset-all-history` | Wipe everything (`confirm: "CONFIRM DELETE ALL"`) |
| GET | `/api/admin/audit-logs` | Audit trail |
| GET/PUT | `/api/admin/settings` | System singleton |

A Postman collection is included at the repo root: [`postman_collection.json`](postman_collection.json).

---

## ⚙️ Environment Variables

See [`apps/web/.env.example`](apps/web/.env.example). Highlights:

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL |
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | e.g. `http://localhost:3000` |
| `OPENAI_API_KEY` | ✅ | for AI tailoring + email |
| `OPENAI_MODEL` |  | default `gpt-4o` |
| `AWS_*` |  | omit to use local `.uploads/` directory |
| `UPSTASH_REDIS_*` |  | omit to use in-memory limiter |
| `SMTP_*` |  | omit to use Nodemailer `jsonTransport` (dev) |
| `MAX_FILE_SIZE_MB` |  | default 5 |
| `NEXT_PUBLIC_APP_URL` |  | used for CORS allowlist |

---

## 🧪 Test the system

```bash
# 1. Sign in as admin@app.com / Admin@123 → /admin
# 2. Sign in as user1@app.com / User@123 → /dashboard → /tailor
# 3. Upload any DOCX/PDF resume + paste a JD → tailor
# 4. Edit inline → Save → re-score; Re-tailor → new version
# 5. Download DOCX and PDF; open Email tab → Generate → Send (jsonTransport prints to console in dev)
```

---

## ⌨️ Keyboard Shortcuts

| Combo | Action |
|---|---|
| `Ctrl/Cmd + S` | Save edits |
| `Ctrl/Cmd + D` | Download current version |
| `Ctrl/Cmd + R` | Re-tailor |
| `Ctrl/Cmd + E` | Open email composer |
| `?` | Show shortcut help |

---

## 🐳 Docker

```bash
docker compose up --build
# postgres → :5432
# redis    → :6379
# web      → :3000
```

The web container runs `prisma migrate deploy && next start`. Seed manually after first start:
```bash
docker compose exec web pnpm --filter web prisma db seed
```

> **Note:** Puppeteer in Alpine needs Chromium installed. If you hit a missing-browser error, install `chromium` in the Dockerfile and set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`.

---

## 📜 License

MIT.
