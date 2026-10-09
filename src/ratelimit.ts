import type { Request } from "express";

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window limiter held in process memory.
 *
 * The original implementation used Redis. The backend now runs as a long-lived
 * process (Render/Railway/Fly), so an in-memory bucket is sufficient and removes
 * a dependency. Behind multiple instances the limit applies per instance.
 */
export function rateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    if (buckets.size > 5000) buckets.clear();
    return { ok: true, remaining: limit - 1, retryAfterSeconds: windowSeconds };
  }
  bucket.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds,
  };
}

/** Client IP as seen by a reverse proxy (Render/Railway/etc.). */
export function clientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (raw) {
    const first = String(raw).split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers["x-real-ip"];
  if (typeof real === "string" && real.trim()) return real.trim();
  return req.ip || "unknown";
}

/** Sanitises a page path so client input cannot pollute the analytics data. */
export function safePath(input: string) {
  const raw = String(input ?? "").split("?")[0].split("#")[0].slice(0, 64);
  if (!raw.startsWith("/")) return "/";
  if (!/^\/[a-zA-Z0-9/_-]*$/.test(raw)) return "/";
  if (raw.includes("..")) return "/";
  return raw;
}
