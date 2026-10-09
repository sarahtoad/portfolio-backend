import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config";
import { asyncHandler, requireAuth } from "../http";

export const uploadRouter = Router();

const ALLOWED_FOLDERS = new Set(["certs", "projects", "art"]);

function sanitizeName(name: string) {
  const safe = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return safe || "file";
}

uploadRouter.post(
  "/admin/upload",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as { name?: unknown; data?: unknown; folder?: unknown };
    const folder = ALLOWED_FOLDERS.has(String(body.folder)) ? String(body.folder) : "certs";
    const name = sanitizeName(String(body.name ?? "upload.png"));

    const raw = String(body.data ?? "");
    const base64 = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw;
    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64, "base64");
    } catch {
      return res.status(400).json({ error: "Invalid data" });
    }

    if (buffer.length === 0 || buffer.length > config.maxUploadBytes) {
      return res.status(400).json({ error: `File must be under ${config.maxUploadBytes / (1024 * 1024)} MB` });
    }

    const uploadDir = path.join(process.cwd(), "uploads", folder);
    await fs.promises.mkdir(uploadDir, { recursive: true });
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${name}`;
    await fs.promises.writeFile(path.join(uploadDir, unique), buffer);

    res.status(201).json({ url: `${config.publicUrl}/uploads/${folder}/${unique}` });
  }),
);