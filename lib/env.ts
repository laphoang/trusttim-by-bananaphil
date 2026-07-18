import { existsSync } from "fs";
import path from "path";

/** Loads .env for standalone scripts (Next.js loads its own env at request time). No-op if absent. */
export function loadEnv(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}
