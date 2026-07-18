import { Pool } from "pg";

let pool: Pool | null = null;

/** Lazily-created singleton pool — serverless-safe (no import-time connection). */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    // Supabase (and most managed Postgres) require TLS; local Docker Postgres doesn't speak it.
    const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
    pool = new Pool({
      connectionString,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool;
}

/** Formats a JS number array as a pgvector literal, e.g. "[0.1,0.2,...]". */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
