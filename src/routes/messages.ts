import { Router } from "express";
import { generateId, mutateStore } from "../store";
import { asyncHandler, storageError } from "../http";
import { clientIp, rateLimit } from "../ratelimit";
import type { Message } from "../types";

export const messagesRouter = Router();

const PUBLIC_MESSAGE_LIMIT = 5;
const PUBLIC_MESSAGE_WINDOW = 60;

messagesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const rl = rateLimit(`messages:${clientIp(req)}`, PUBLIC_MESSAGE_LIMIT, PUBLIC_MESSAGE_WINDOW);
    if (!rl.ok) {
      res.setHeader("Retry-After", String(rl.retryAfterSeconds));
      return res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
    }

    const body = (req.body ?? {}) as { name?: unknown; email?: unknown; message?: unknown };
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newMsg: Message = {
      id: generateId("raven"),
      name,
      email,
      message,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    try {
      await mutateStore<Message, void>("messages", (messages) => {
        messages.push(newMsg);
      });
    } catch (e) {
      return storageError(res, e);
    }

    return res.status(201).json({ ok: true });
  }),
);
