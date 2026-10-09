import type { NextFunction, Request, RequestHandler, Response } from "express";
import { verifyAuth } from "./auth";

export function storageError(res: Response, e: unknown) {
  const message = e instanceof Error ? e.message : "Save failed";
  return res.status(500).json({ error: message });
}

/** Wraps an async handler so rejected promises reach the error middleware. */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** Express middleware equivalent of the old `requireAuth`. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!verifyAuth(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
