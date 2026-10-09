import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { config } from "./config";

if (!config.databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add your Postgres (Neon / Vercel Postgres) connection string.");
}

/**
 * A single shared pool. Neon works best with its *pooled* connection string
 * (the host ending in `-pooler`). `DATABASE_SSL=false` disables TLS for local
 * Postgres instances.
 */
export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  console.error("[db] idle client error:", err.message);
});

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as never[]);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

let schemaReady: Promise<void> | null = null;

/**
 * Idempotent schema creation. Content is intentionally stored as JSONB
 * documents keyed by resource name — the site's data is small and always read
 * as a whole array/document, so this keeps the migration trivial while still
 * giving us real transactions, row locks and serverless-friendly connectivity.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS content (
          key        TEXT PRIMARY KEY,
          data       JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}
