import { readFileSync } from "fs";
import path from "path";

export interface DictionaryEntry {
  term: string;
  expansions: string[];
  intent_hint: string | null;
  note?: string;
}

let cached: DictionaryEntry[] | null = null;

/** VI synonym/abbreviation dictionary (Architecture guide §5.6) — doctor-curated, hand-authored. */
export function loadDictionary(): DictionaryEntry[] {
  if (!cached) {
    const filePath = path.join(process.cwd(), "hackathon_docs", "kb", "dictionary.json");
    const raw = JSON.parse(readFileSync(filePath, "utf-8"));
    cached = raw.entries as DictionaryEntry[];
  }
  return cached;
}
