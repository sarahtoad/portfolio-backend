import "dotenv/config";

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

export const config = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: (process.env.DATABASE_URL ?? "").trim(),
  databaseSsl: bool(process.env.DATABASE_SSL, isProduction),
  adminPassword: (process.env.ADMIN_PASSWORD ?? "").trim(),
  adminSecret: (process.env.ADMIN_SECRET ?? "").trim(),
  publicUrl: (process.env.PUBLIC_URL ?? "").trim().replace(/\/$/, ""),
  maxUploadBytes: Math.max(1, Number(process.env.MAX_UPLOAD_MB ?? 8)) * 1024 * 1024,
  cookieSameSite: (process.env.COOKIE_SAMESITE ?? "auto").trim().toLowerCase(),
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

const PLACEHOLDER_SECRETS = new Set(["srsl-fallback-secret", "change-me-too", "change-me"]);

export function usableSecret(value: string) {
  return value.length >= 16 && !PLACEHOLDER_SECRETS.has(value);
}

/** Returns a human readable reason why admin login is unusable, or null. */
export function adminConfigError(): string | null {
  const missing: string[] = [];
  if (!config.adminPassword) missing.push("ADMIN_PASSWORD");
  if (!usableSecret(config.adminSecret)) missing.push("ADMIN_SECRET (16+ random characters)");
  if (!missing.length) return null;
  return `Admin access is not configured. Add ${missing.join(" and ")} to the backend environment variables.`;
}

export type SameSite = "lax" | "strict" | "none";

/**
 * Cross-site (frontend on Vercel, backend elsewhere) requires SameSite=None and
 * Secure. Same-site local development (localhost:3000 -> localhost:4000) works
 * with Lax.
 */
export function cookieSameSite(): SameSite {
  const value = config.cookieSameSite;
  if (value === "none" || value === "lax" || value === "strict") return value;
  return isProduction ? "none" : "lax";
}

export function cookieSecure(): boolean {
  const sameSite = cookieSameSite();
  if (sameSite === "none") return true;
  return isProduction;
}

/** A non-empty secret is required to sign admin sessions. */
export function requireAdminSecret(): string {
  const secret = config.adminSecret;
  if (!usableSecret(secret)) {
    throw new Error("ADMIN_SECRET must be set to 16+ random characters to sign admin sessions.");
  }
  return secret;
}
