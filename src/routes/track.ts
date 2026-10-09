import { Router } from "express";
import type { CookieOptions } from "express";
import { generateId, recordPageView, recordVisit } from "../store";
import { asyncHandler } from "../http";
import { cookieSameSite, cookieSecure } from "../config";
import { safePath } from "../ratelimit";

export const trackRouter = Router();

const VISITOR_COOKIE = "srsl_uid";

function visitorCookieOptions(): CookieOptions {
  const options: CookieOptions = {
    path: "/",
    httpOnly: true,
    sameSite: cookieSameSite(),
    maxAge: 60 * 60 * 24 * 365 * 1000,
  };
  if (cookieSecure()) options.secure = true;
  return options;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function referrerHost(referrer?: string) {
  if (!referrer) return "direct";
  try {
    const u = new URL(referrer);
    return u.hostname || "direct";
  } catch {
    return "direct";
  }
}

function profile(userAgent?: string | null): { browser: string; device: string } {
  const ua = userAgent ?? "";
  const low = ua.toLowerCase();
  const device = /ipad|tablet/.test(low)
    ? "Tablet"
    : /mobile|android|iphone|ipod|windows phone/.test(low)
      ? "Mobile"
      : "Desktop";
  const browser = /edg(e|iaos)?\//.test(low)
    ? "Edge"
    : /opera|opr\//.test(low)
      ? "Opera"
      : /firefox|fxios/.test(low)
        ? "Firefox"
        : /samsungbrowser/.test(low)
          ? "Samsung Internet"
          : /chrome|crios/.test(low)
            ? "Chrome"
            : /safari\//.test(low)
              ? "Safari"
              : "Other";
  return { browser, device };
}

trackRouter.post(
  "/visit",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as { referrer?: string };
    const day = todayKey();
    const ref = referrerHost(body.referrer);
    const { browser, device } = profile(req.headers["user-agent"]);

    const visitorId = req.cookies?.[VISITOR_COOKIE] as string | undefined;
    if (!visitorId) {
      res.cookie(VISITOR_COOKIE, generateId("visitor"), visitorCookieOptions());
    }

    try {
      await recordVisit({ day, referrer: ref, browser, device, unique: !visitorId });
    } catch {
      /* never break the visitor experience */
    }
    res.json({ ok: true });
  }),
);

trackRouter.patch(
  "/visit",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as { page?: string };
    const day = todayKey();
    const page = safePath(body.page || "/");

    try {
      await recordPageView(day, page);
    } catch {
      /* never break the visitor experience */
    }
    res.json({ ok: true });
  }),
);
