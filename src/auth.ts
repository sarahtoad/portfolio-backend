import crypto from "node:crypto";
import type { CookieOptions, Request } from "express";
import { adminConfigError, config, cookieSameSite, cookieSecure, requireAdminSecret } from "./config";

export const ADMIN_COOKIE = "srsl_admin";

const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const TOKEN_MAX_AGE_MS = TOKEN_MAX_AGE_SECONDS * 1000;

function safeEqual(a: string, b: string) {
  if (a.length === 0 || b.length === 0) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  try {
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function hmac(body: string) {
  return crypto.createHmac("sha256", requireAdminSecret()).update(body).digest("base64url");
}

function signToken() {
  const payload = { admin: true, exp: Date.now() + TOKEN_MAX_AGE_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body)}`;
}

function verifyToken(token?: string) {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  try {
    if (!safeEqual(sig, hmac(body))) return false;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload.admin === true && typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function checkPassword(password: string) {
  if (!config.adminPassword) return false;
  return safeEqual(password, config.adminPassword);
}

function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return undefined;
}

export function verifyAuth(req: Request) {
  const configErr = adminConfigError();
  if (configErr) return false;
  const token = req.cookies?.[ADMIN_COOKIE] ?? bearerToken(req);
  return verifyToken(token);
}

export function sessionCookieValue() {
  return signToken();
}

export function sessionCookieOptions(): CookieOptions {
  const sameSite = cookieSameSite();
  const options: CookieOptions = {
    httpOnly: true,
    sameSite,
    path: "/",
    maxAge: TOKEN_MAX_AGE_SECONDS * 1000,
  };
  if (cookieSecure()) options.secure = true;
  return options;
}

export function clearCookieOptions(): CookieOptions {
  return { ...sessionCookieOptions(), maxAge: 0 };
}
