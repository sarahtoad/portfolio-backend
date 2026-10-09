import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { config } from "./config";
import { ensureSchema } from "./db";
import { contentRouter } from "./routes/content";
import { messagesRouter } from "./routes/messages";
import { trackRouter } from "./routes/track";
import { adminRouter } from "./routes/admin";
import { uploadRouter } from "./routes/upload";

const app = express();

function isAllowedOrigin(origin: string) {
  if (config.corsOrigins.includes("*")) return true;
  return config.corsOrigins.some((allowed) => origin === allowed || origin.endsWith(`//${allowed}`));
}

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "12mb" }));
app.use(cookieParser());

const uploadsDir = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsDir));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "portfolio-backend", env: config.nodeEnv });
});

app.use("/api/content", contentRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/track", trackRouter);
app.use("/api/admin", uploadRouter); // POST /api/admin/upload
app.use("/api/admin", adminRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[error]", err);
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  res.status(500).json({ error: err.message ?? "Internal server error" });
});

async function start() {
  await ensureSchema();
  app.listen(config.port, () => {
    console.log(`[server] portfolio-backend listening on http://localhost:${config.port}`);
  });
}

if (require.main === module) {
  start().catch((e) => {
    console.error("[server] failed to start:", e);
    process.exit(1);
  });
}

export { app };