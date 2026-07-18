import { readFileSync } from "fs";
import path from "path";
import { loadEnv } from "../env";
import { getPool } from "./client";

loadEnv();

/** Build-time script (npm run db:setup): creates the kb_chunks table + indexes. */
async function main() {
  const dim = process.env.EMBEDDING_DIM ?? "1024";
  const sqlPath = path.join(process.cwd(), "lib", "db", "schema.sql");
  const sql = readFileSync(sqlPath, "utf-8").replace("vector(1024)", `vector(${dim})`);

  const pool = getPool();
  await pool.query(sql);
  console.log(`kb_chunks table ready (embedding dim=${dim}).`);
  await pool.end();
}

main().catch((err) => {
  console.error("db:setup failed:", err);
  process.exit(1);
});
