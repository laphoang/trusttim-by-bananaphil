import { readFileSync } from "fs";
import path from "path";
import type { KbChunk } from "./kb-parser";

export interface StructuredRule {
  rule: string;
  if: Record<string, unknown>;
  then: string;
  source_url: string | null;
  source?: string;
}

let cached: StructuredRule[] | null = null;

/** Prose-to-structured-logic BHYT/procedure rules (Architecture guide §5.4) — doctor-authored. */
export function loadRules(): StructuredRule[] {
  if (!cached) {
    const filePath = path.join(process.cwd(), "hackathon_docs", "kb", "rules.json");
    cached = JSON.parse(readFileSync(filePath, "utf-8")) as StructuredRule[];
  }
  return cached;
}

function renderCondition(condition: Record<string, unknown>): string {
  return Object.entries(condition)
    .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
    .join(", ");
}

/**
 * ponytail: rules have no free-text -> {has_referral, card_code, ...} slot-filler anywhere in the
 * spec, and building one is unscoped work. Ceiling: instead of a bespoke deterministic rule
 * matcher, each rule is rendered as a plain-language chunk and ingested into kb_chunks like any
 * other content — the existing hybrid retrieval + reranker (already built for prose) surfaces it.
 * Upgrade path: a real slot-extraction classifier over `if` keys, once a query needs one.
 */
export function rulesAsKbChunks(): KbChunk[] {
  return loadRules().map((rule, index) => ({
    meta: {
      id: `rule-${rule.rule}-${index}`,
      topic: "bhyt_pricing",
      title: rule.rule,
      keywords: Object.keys(rule.if),
      source_url: rule.source_url,
      is_synthetic: false,
    },
    content: `Điều kiện: ${renderCondition(rule.if)}. Kết quả: ${rule.then}`,
  }));
}
