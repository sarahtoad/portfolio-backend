import { query, withTransaction } from "./db";
import {
  seedAbout,
  seedArtForms,
  seedCertificates,
  seedJourneyChapters,
  seedQuests,
} from "./seed";
import type {
  AboutContent,
  ArtForm,
  ArtProject,
  Certificate,
  DayStat,
  JourneyChapter,
  Message,
  Quest,
  Stats,
} from "./types";

export type Resource = "certificates" | "projects" | "experience" | "messages" | "creative" | "artprojects";

const STORE_PREFIX = "store:";

function storeKey(resource: Resource) {
  return STORE_PREFIX + resource;
}

function seedFor<T>(resource: Resource): T[] {
  switch (resource) {
    case "certificates":
      return seedCertificates as unknown as T[];
    case "projects":
      return seedQuests as unknown as T[];
    case "experience":
      return seedJourneyChapters as unknown as T[];
    case "creative":
      return seedArtForms as unknown as T[];
    default:
      return [];
  }
}

function asArray<T>(value: unknown): T[] | null {
  return Array.isArray(value) ? (value as T[]) : null;
}

export async function readStore<T>(resource: Resource): Promise<T[]> {
  const { rows } = await query<{ data: unknown }>("SELECT data FROM content WHERE key = $1", [
    storeKey(resource),
  ]);
  const stored = asArray<T>(rows[0]?.data);
  if (stored) return stored;
  return seedFor<T>(resource);
}

export async function writeStore<T>(resource: Resource, items: T[]): Promise<void> {
  await query(
    `INSERT INTO content (key, data, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [storeKey(resource), JSON.stringify(items)],
  );
}

/**
 * Atomic read-modify-write. The row is locked with `SELECT ... FOR UPDATE` for
 * the duration of the transaction, so two concurrent admin saves (or a contact
 * message racing an edit) cannot clobber each other.
 */
export async function mutateStore<T, R>(
  resource: Resource,
  mutate: (items: T[]) => R | Promise<R>,
): Promise<R> {
  const key = storeKey(resource);
  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO content (key, data) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [key, JSON.stringify(seedFor(resource))],
    );
    const { rows } = await client.query<{ data: unknown }>(
      "SELECT data FROM content WHERE key = $1 FOR UPDATE",
      [key],
    );
    const items = asArray<T>(rows[0]?.data) ?? seedFor<T>(resource);
    const result = await mutate(items);
    await client.query("UPDATE content SET data = $1, updated_at = now() WHERE key = $2", [
      JSON.stringify(items),
      key,
    ]);
    return result;
  });
}

/* ------------------------------------------------------------------ */
/* About                                                               */
/* ------------------------------------------------------------------ */

function mergeAbout(base: AboutContent, patch: Partial<AboutContent> | null | undefined): AboutContent {
  if (!patch) return base;
  return {
    heroTagline: patch.heroTagline ?? base.heroTagline,
    bio: patch.bio ?? base.bio,
    interests: Array.isArray(patch.interests) ? patch.interests : base.interests,
    skillBars: Array.isArray(patch.skillBars) ? patch.skillBars : base.skillBars,
    skillGroups: Array.isArray(patch.skillGroups) ? patch.skillGroups : base.skillGroups,
    education: Array.isArray(patch.education) ? patch.education : base.education,
  };
}

export async function readAbout(): Promise<AboutContent> {
  const { rows } = await query<{ data: unknown }>("SELECT data FROM content WHERE key = 'about'");
  const stored = (rows[0]?.data ?? null) as Partial<AboutContent> | null;
  return mergeAbout(seedAbout, stored);
}

export async function writeAbout(content: AboutContent): Promise<void> {
  await query(
    `INSERT INTO content (key, data, updated_at) VALUES ('about', $1, now())
     ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [JSON.stringify(content)],
  );
}

export async function updateAbout(patch: Partial<AboutContent>): Promise<AboutContent> {
  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO content (key, data) VALUES ('about', $1) ON CONFLICT (key) DO NOTHING`,
      [JSON.stringify(seedAbout)],
    );
    const { rows } = await client.query<{ data: unknown }>(
      "SELECT data FROM content WHERE key = 'about' FOR UPDATE",
    );
    const updated = mergeAbout(mergeAbout(seedAbout, rows[0]?.data as Partial<AboutContent>), patch);
    await client.query("UPDATE content SET data = $1, updated_at = now() WHERE key = 'about'", [
      JSON.stringify(updated),
    ]);
    return updated;
  });
}

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

const STATS_KEY = "stats";

const EMPTY_STATS: Stats = {
  totalVisits: 0,
  uniqueVisitors: 0,
  totalPageViews: 0,
  days: {},
  pageViewsByPath: {},
  referrers: {},
  browsers: {},
  devices: {},
};

const CARDINALITY_LIMITS = { paths: 200, referrers: 150, browsers: 24, devices: 12 } as const;

function toCounter(hash: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!hash || typeof hash !== "object") return out;
  for (const [k, v] of Object.entries(hash as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

function normalizeStats(raw: unknown): Stats {
  const value = (raw ?? {}) as Partial<Stats>;
  const days: Record<string, DayStat> = {};
  for (const [key, entry] of Object.entries((value.days ?? {}) as Record<string, Partial<DayStat>>)) {
    days[key] = {
      visits: Number(entry?.visits) || 0,
      unique: Number(entry?.unique) || 0,
      pageViews: Number(entry?.pageViews) || 0,
    };
  }
  return {
    totalVisits: Number(value.totalVisits) || 0,
    uniqueVisitors: Number(value.uniqueVisitors) || 0,
    totalPageViews: Number(value.totalPageViews) || 0,
    days,
    pageViewsByPath: toCounter(value.pageViewsByPath),
    referrers: toCounter(value.referrers),
    browsers: toCounter(value.browsers),
    devices: toCounter(value.devices),
  };
}

function trimCounter(record: Record<string, number>, limit: number): Record<string, number> {
  const entries = Object.entries(record);
  if (entries.length <= limit) return record;
  entries.sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(entries.slice(0, limit));
}

async function mutateStats<T>(fn: (stats: Stats) => T | Promise<T>): Promise<T> {
  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO content (key, data) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [STATS_KEY, JSON.stringify(EMPTY_STATS)],
    );
    const { rows } = await client.query<{ data: unknown }>(
      "SELECT data FROM content WHERE key = $1 FOR UPDATE",
      [STATS_KEY],
    );
    const stats = normalizeStats(rows[0]?.data);
    const result = await fn(stats);
    await client.query("UPDATE content SET data = $1, updated_at = now() WHERE key = $2", [
      JSON.stringify(stats),
      STATS_KEY,
    ]);
    return result;
  });
}

export type VisitInput = {
  day: string;
  referrer: string;
  browser: string;
  device: string;
  unique: boolean;
};

export async function recordVisit(input: VisitInput): Promise<void> {
  await mutateStats((stats) => {
    stats.totalVisits += 1;
    const day = (stats.days[input.day] ??= { visits: 0, unique: 0, pageViews: 0 });
    day.visits += 1;
    if (input.unique) {
      stats.uniqueVisitors += 1;
      day.unique += 1;
    }
    stats.referrers[input.referrer] = (stats.referrers[input.referrer] ?? 0) + 1;
    stats.browsers[input.browser] = (stats.browsers[input.browser] ?? 0) + 1;
    stats.devices[input.device] = (stats.devices[input.device] ?? 0) + 1;

    stats.referrers = trimCounter(stats.referrers, CARDINALITY_LIMITS.referrers);
    stats.browsers = trimCounter(stats.browsers, CARDINALITY_LIMITS.browsers);
    stats.devices = trimCounter(stats.devices, CARDINALITY_LIMITS.devices);
  });
}

export async function recordPageView(day: string, pathname: string): Promise<void> {
  await mutateStats((stats) => {
    stats.totalPageViews += 1;
    const bucket = (stats.days[day] ??= { visits: 0, unique: 0, pageViews: 0 });
    bucket.pageViews += 1;
    stats.pageViewsByPath[pathname] = (stats.pageViewsByPath[pathname] ?? 0) + 1;
    stats.pageViewsByPath = trimCounter(stats.pageViewsByPath, CARDINALITY_LIMITS.paths);
  });
}

export async function readStats(): Promise<Stats> {
  const { rows } = await query<{ data: unknown }>("SELECT data FROM content WHERE key = $1", [STATS_KEY]);
  return normalizeStats(rows[0]?.data);
}

export async function resetStats(): Promise<void> {
  await query(
    `INSERT INTO content (key, data, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [STATS_KEY, JSON.stringify(EMPTY_STATS)],
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function generateId(seed: string) {
  const base = slugify(seed) || "item";
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base}-${suffix}`;
}

export { seedFor };
