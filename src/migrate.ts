import { ensureSchema, pool, query } from "./db";
import { seedFor } from "./store";

/**
 * Creates the schema and seeds the content rows from the compiled defaults the
 * first time they are created. Run with `npm run migrate`. It is safe to run
 * repeatedly: existing rows are never overwritten.
 */
async function migrate() {
  await ensureSchema();

  const resources = ["certificates", "projects", "experience", "creative", "artprojects", "messages"] as const;
  for (const resource of resources) {
    await query(
      `INSERT INTO content (key, data) VALUES ($1, $2)
       ON CONFLICT (key) DO NOTHING`,
      [`store:${resource}`, JSON.stringify(seedFor(resource))],
    );
    console.log(`[migrate] seeded ${resource}`);
  }

  await query(
    `INSERT INTO content (key, data) VALUES ('about', $1)
     ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify((await import("./seed")).seedAbout)],
  );
  console.log("[migrate] seeded about");
}

migrate()
  .then(() => console.log("[migrate] done"))
  .catch((e) => {
    console.error("[migrate] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());