import { Router } from "express";
import { adminConfigError } from "../config";
import {
  checkPassword,
  clearCookieOptions,
  ADMIN_COOKIE,
  sessionCookieOptions,
  sessionCookieValue,
  verifyAuth,
} from "../auth";
import {
  generateId,
  mutateStore,
  readAbout,
  readStats,
  resetStats,
  updateAbout,
  writeAbout,
} from "../store";
import { asyncHandler, requireAuth, storageError } from "../http";
import { clientIp, rateLimit } from "../ratelimit";
import type {
  AboutContent,
  ArtForm,
  ArtProject,
  Certificate,
  JourneyChapter,
  Message,
  Quest,
} from "../types";

export const adminRouter = Router();

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Auth (public)                                                       */
/* ------------------------------------------------------------------ */

const LOGIN_LIMIT = 6;
const LOGIN_WINDOW = 60;

adminRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const rl = rateLimit(`admin:login:${clientIp(req)}`, LOGIN_LIMIT, LOGIN_WINDOW);
    if (!rl.ok) {
      res.setHeader("Retry-After", String(rl.retryAfterSeconds));
      return res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
    }

    const body = (req.body ?? {}) as { password?: unknown };
    const password = String(body.password ?? "");

    if (!checkPassword(password)) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const configErr = adminConfigError();
    if (configErr) {
      return res.status(503).json({ error: configErr });
    }

    res.cookie(ADMIN_COOKIE, sessionCookieValue(), sessionCookieOptions());
    return res.json({ ok: true });
  }),
);

adminRouter.post("/logout", (_req, res) => {
  res.clearCookie(ADMIN_COOKIE, clearCookieOptions());
  res.json({ ok: true });
});

adminRouter.get("/session", (req, res) => {
  res.json({ ok: verifyAuth(req) });
});

/* Everything below requires a valid admin session. */
adminRouter.use(requireAuth);

/* ------------------------------------------------------------------ */
/* About                                                               */
/* ------------------------------------------------------------------ */

adminRouter.get(
  "/about",
  asyncHandler(async (_req, res) => {
    res.json(await readAbout());
  }),
);

adminRouter.post(
  "/about",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Partial<AboutContent>;
    const current = await readAbout();
    const updated: AboutContent = { ...current, ...body };
    try {
      await writeAbout(updated);
    } catch (e) {
      return storageError(res, e);
    }
    res.json(updated);
  }),
);

/* ------------------------------------------------------------------ */
/* Certificates                                                        */
/* ------------------------------------------------------------------ */

adminRouter.get(
  "/certificates",
  asyncHandler(async (_req, res) => {
    res.json(await mutateRead<Certificate>("certificates"));
  }),
);

adminRouter.post(
  "/certificates",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const hasImage = Object.prototype.hasOwnProperty.call(body, "image");
    const cert = await mutateStore<Certificate, Certificate>("certificates", (certs) => {
      const item: Certificate = {
        id: generateId(String(body.title ?? "cert")),
        title: String(body.title ?? ""),
        issuer: String(body.issuer ?? ""),
        year: String(body.year ?? ""),
        description: String(body.description ?? ""),
        seal: String(body.seal ?? "ᚨ"),
        verifyUrl: String(body.verifyUrl ?? ""),
        image: hasImage ? String(body.image ?? "") : "",
      };
      certs.push(item);
      return item;
    });
    res.status(201).json(cert);
  }),
);

adminRouter.patch(
  "/certificates/:id",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const hasImage = Object.prototype.hasOwnProperty.call(body, "image");
    const result = await mutateStore<Certificate, Certificate | null>("certificates", (certs) => {
      const idx = certs.findIndex((c) => c.id === req.params.id);
      if (idx === -1) return null;
      const updated = { ...certs[idx], ...body, id: req.params.id } as Certificate;
      updated.image = hasImage ? String(body.image ?? "") : certs[idx].image;
      certs[idx] = updated;
      return updated;
    });
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json(result);
  }),
);

adminRouter.delete(
  "/certificates/:id",
  asyncHandler(async (req, res) => {
    await mutateStore<Certificate, void>("certificates", (certs) => {
      const filtered = certs.filter((c) => c.id !== req.params.id);
      certs.length = 0;
      certs.push(...filtered);
    });
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ */
/* Projects (quests)                                                   */
/* ------------------------------------------------------------------ */

adminRouter.get(
  "/projects",
  asyncHandler(async (_req, res) => {
    res.json(await mutateRead<Quest>("projects"));
  }),
);

adminRouter.post(
  "/projects",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const quest = await mutateStore<Quest, Quest>("projects", (quests) => {
      const item: Quest = {
        id: generateId(String(body.name ?? "quest")),
        name: String(body.name ?? ""),
        tagline: String(body.tagline ?? ""),
        status: body.status === "IN PROGRESS" ? "IN PROGRESS" : "COMPLETED",
        difficulty: (["APPRENTICE", "JOURNEYMAN", "EXPERT", "MASTER"] as const).includes(body.difficulty as never)
          ? (body.difficulty as Quest["difficulty"])
          : "APPRENTICE",
        objective: String(body.objective ?? ""),
        description: String(body.description ?? ""),
        technologies: parseList(body.technologies),
        achievements: parseList(body.achievements),
        lessons: parseList(body.lessons),
        image: String(body.image ?? ""),
        demoUrl: String(body.demoUrl ?? ""),
        repoUrl: String(body.repoUrl ?? ""),
      };
      quests.push(item);
      return item;
    });
    res.status(201).json(quest);
  }),
);

adminRouter.patch(
  "/projects/:id",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = await mutateStore<Quest, Quest | null>("projects", (quests) => {
      const idx = quests.findIndex((q) => q.id === req.params.id);
      if (idx === -1) return null;
      const updated = { ...quests[idx], ...body, id: req.params.id } as Quest;
      if (typeof updated.technologies === "string") updated.technologies = parseList(updated.technologies);
      if (typeof updated.achievements === "string") updated.achievements = parseList(updated.achievements);
      if (typeof updated.lessons === "string") updated.lessons = parseList(updated.lessons);
      quests[idx] = updated;
      return updated;
    });
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json(result);
  }),
);

adminRouter.delete(
  "/projects/:id",
  asyncHandler(async (req, res) => {
    await mutateStore<Quest, void>("projects", (quests) => {
      const filtered = quests.filter((q) => q.id !== req.params.id);
      quests.length = 0;
      quests.push(...filtered);
    });
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ */
/* Experience (journey)                                                */
/* ------------------------------------------------------------------ */

adminRouter.get(
  "/experience",
  asyncHandler(async (_req, res) => {
    res.json(await mutateRead<JourneyChapter>("experience"));
  }),
);

adminRouter.post(
  "/experience",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const chapter = await mutateStore<JourneyChapter, JourneyChapter>("experience", (list) => {
      const item: JourneyChapter = {
        id: generateId(String(body.title ?? "chapter")),
        chapter: String(body.chapter ?? ""),
        title: String(body.title ?? ""),
        institution: String(body.institution ?? ""),
        period: String(body.period ?? ""),
        description: String(body.description ?? ""),
        highlights: parseList(body.highlights),
        runeSymbol: String(body.runeSymbol ?? ""),
      };
      list.push(item);
      return item;
    });
    res.status(201).json(chapter);
  }),
);

adminRouter.patch(
  "/experience/:id",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = await mutateStore<JourneyChapter, JourneyChapter | null>("experience", (list) => {
      const idx = list.findIndex((c) => c.id === req.params.id);
      if (idx === -1) return null;
      const updated = { ...list[idx], ...body, id: req.params.id } as JourneyChapter;
      if (typeof updated.highlights === "string") updated.highlights = parseList(updated.highlights);
      list[idx] = updated;
      return updated;
    });
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json(result);
  }),
);

adminRouter.delete(
  "/experience/:id",
  asyncHandler(async (req, res) => {
    await mutateStore<JourneyChapter, void>("experience", (list) => {
      const filtered = list.filter((c) => c.id !== req.params.id);
      list.length = 0;
      list.push(...filtered);
    });
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ */
/* Creative (art forms)                                                */
/* ------------------------------------------------------------------ */

adminRouter.get(
  "/creative",
  asyncHandler(async (_req, res) => {
    res.json(await mutateRead<ArtForm>("creative"));
  }),
);

adminRouter.post(
  "/creative",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const art = await mutateStore<ArtForm, ArtForm>("creative", (list) => {
      const item: ArtForm = {
        id: generateId(String(body.name ?? "art")),
        name: String(body.name ?? ""),
        description: String(body.description ?? ""),
        icon: String(body.icon ?? "sparkles"),
        runeWord: String(body.runeWord ?? ""),
      };
      list.push(item);
      return item;
    });
    res.status(201).json(art);
  }),
);

adminRouter.patch(
  "/creative/:id",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = await mutateStore<ArtForm, ArtForm | null>("creative", (list) => {
      const idx = list.findIndex((a) => a.id === req.params.id);
      if (idx === -1) return null;
      const updated = { ...list[idx], ...body, id: req.params.id } as ArtForm;
      list[idx] = updated;
      return updated;
    });
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json(result);
  }),
);

adminRouter.delete(
  "/creative/:id",
  asyncHandler(async (req, res) => {
    await mutateStore<ArtForm, void>("creative", (list) => {
      const filtered = list.filter((a) => a.id !== req.params.id);
      list.length = 0;
      list.push(...filtered);
    });
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ */
/* Art projects                                                        */
/* ------------------------------------------------------------------ */

adminRouter.get(
  "/artprojects",
  asyncHandler(async (_req, res) => {
    res.json(await mutateRead<ArtProject>("artprojects"));
  }),
);

adminRouter.post(
  "/artprojects",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const project = await mutateStore<ArtProject, ArtProject>("artprojects", (list) => {
      const item: ArtProject = {
        id: generateId(String(body.title ?? "work")),
        artId: String(body.artId ?? ""),
        title: String(body.title ?? ""),
        description: String(body.description ?? ""),
        year: String(body.year ?? ""),
        image: String(body.image ?? ""),
        url: String(body.url ?? ""),
        focalX: typeof body.focalX === "number" ? body.focalX : 50,
        focalY: typeof body.focalY === "number" ? body.focalY : 50,
      };
      list.push(item);
      return item;
    });
    res.status(201).json(project);
  }),
);

adminRouter.patch(
  "/artprojects/:id",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = await mutateStore<ArtProject, ArtProject | null>("artprojects", (list) => {
      const idx = list.findIndex((p) => p.id === req.params.id);
      if (idx === -1) return null;
      const updated = { ...list[idx], ...body, id: req.params.id } as ArtProject;
      list[idx] = updated;
      return updated;
    });
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json(result);
  }),
);

adminRouter.delete(
  "/artprojects/:id",
  asyncHandler(async (req, res) => {
    await mutateStore<ArtProject, void>("artprojects", (list) => {
      const filtered = list.filter((p) => p.id !== req.params.id);
      list.length = 0;
      list.push(...filtered);
    });
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

adminRouter.get(
  "/messages",
  asyncHandler(async (_req, res) => {
    res.json(await mutateRead<Message>("messages"));
  }),
);

adminRouter.patch(
  "/messages/:id",
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = await mutateStore<Message, Message | null>("messages", (list) => {
      const idx = list.findIndex((m) => m.id === req.params.id);
      if (idx === -1) return null;
      const updated = { ...list[idx], ...body, id: req.params.id } as Message;
      list[idx] = updated;
      return updated;
    });
    if (!result) return res.status(404).json({ error: "Not found" });
    res.json(result);
  }),
);

adminRouter.delete(
  "/messages/:id",
  asyncHandler(async (req, res) => {
    await mutateStore<Message, void>("messages", (list) => {
      const filtered = list.filter((m) => m.id !== req.params.id);
      list.length = 0;
      list.push(...filtered);
    });
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

adminRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const stats = await readStats();
    const last14: { day: string; visits: number; unique: number; pageViews: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      last14.push({
        day: key,
        visits: stats.days[key]?.visits ?? 0,
        unique: stats.days[key]?.unique ?? 0,
        pageViews: stats.days[key]?.pageViews ?? 0,
      });
    }
    res.json({ ...stats, last14 });
  }),
);

adminRouter.delete(
  "/stats",
  asyncHandler(async (_req, res) => {
    try {
      await resetStats();
    } catch (e) {
      return storageError(res, e);
    }
    res.json({ ok: true });
  }),
);

/* ------------------------------------------------------------------ */

/** Reads a resource while making sure the seed row is materialised. */
async function mutateRead<T>(resource: Parameters<typeof mutateStore>[0]): Promise<T[]> {
  return mutateStore<T, T[]>(resource, (items) => items);
}

// Exposed for updateAbout route parity (about uses a dedicated POST above).
void updateAbout;
