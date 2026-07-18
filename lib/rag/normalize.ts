import { loadDictionary } from "./dictionary";

const SCOPE_INTENTS = new Set([
  "booking",
  "bhyt_pricing",
  "procedures",
  "hospital_info",
  "doctor_schedule",
]);

export interface NormalizedQuery {
  original: string;
  /** original + matched dictionary expansions appended, for retrieval recall on abbreviations/slang. */
  expanded: string;
  /** dictionary intent_hints matched against one of the five scope intents — deterministic pass-through signal. */
  matchedIntents: string[];
}

/** Expands Vietnamese abbreviations/slang via the doctor-curated dictionary (Architecture guide §5.6). */
export function normalizeQuery(query: string): NormalizedQuery {
  const lower = query.toLowerCase();
  const extras: string[] = [];
  const matchedIntents = new Set<string>();

  for (const entry of loadDictionary()) {
    if (lower.includes(entry.term.toLowerCase())) {
      extras.push(...entry.expansions);
      if (entry.intent_hint && SCOPE_INTENTS.has(entry.intent_hint)) {
        matchedIntents.add(entry.intent_hint);
      }
    }
  }

  return {
    original: query,
    expanded: extras.length ? `${query} ${extras.join(" ")}` : query,
    matchedIntents: [...matchedIntents],
  };
}
