import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch {
  redis = null;
}

// In-memory fallback for local dev when Upstash is not configured.
const memBuckets = new Map<string, { count: number; reset: number }>();

function memLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const b = memBuckets.get(key);
  if (!b || b.reset < now) {
    memBuckets.set(key, { count: 1, reset: now + windowMs });
    return { success: true, remaining: max - 1, reset: now + windowMs };
  }
  b.count += 1;
  return { success: b.count <= max, remaining: Math.max(0, max - b.count), reset: b.reset };
}

const tailorLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        Number(process.env.MAX_TAILOR_REQUESTS_PER_HOUR ?? 10),
        "1 h",
      ),
      analytics: false,
      prefix: "rl:tailor",
    })
  : null;

const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        Number(process.env.MAX_API_CALLS_PER_HOUR ?? 100),
        "1 h",
      ),
      analytics: false,
      prefix: "rl:api",
    })
  : null;

export async function checkTailorRate(userId: string) {
  if (tailorLimiter) {
    const r = await tailorLimiter.limit(userId);
    return { ok: r.success, remaining: r.remaining, reset: r.reset };
  }
  const r = memLimit(
    `tailor:${userId}`,
    Number(process.env.MAX_TAILOR_REQUESTS_PER_HOUR ?? 10),
    60 * 60 * 1000,
  );
  return { ok: r.success, remaining: r.remaining, reset: r.reset };
}

export async function checkApiRate(key: string) {
  if (apiLimiter) {
    const r = await apiLimiter.limit(key);
    return { ok: r.success, remaining: r.remaining, reset: r.reset };
  }
  const r = memLimit(
    `api:${key}`,
    Number(process.env.MAX_API_CALLS_PER_HOUR ?? 100),
    60 * 60 * 1000,
  );
  return { ok: r.success, remaining: r.remaining, reset: r.reset };
}
