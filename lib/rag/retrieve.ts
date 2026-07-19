import { embed } from "../embeddings/client";
import { getPool, toVectorLiteral } from "../db/client";
import type { NormalizedQuery } from "./normalize";

export interface Candidate {
  id: string;
  topic: string;
  title: string | null;
  content: string;
  sourceUrl: string | null;
  isSynthetic: boolean;
  freshness: string | null;
}

const POOL_SIZE = 20;
const RRF_K = 60;

/** Builds a recall-oriented `simple`-config tsquery: OR across the query's sanitized tokens. */
function buildTsQuery(text: string): string | null {
  const tokens = text
    .split(/\s+/)
    .map((t) => t.replace(/[&|!():*]/g, "").trim())
    .filter(Boolean);
  if (!tokens.length) return null;
  return tokens.join(" | ");
}

async function denseArm(queryText: string): Promise<Candidate[]> {
  const [vector] = await embed([queryText], "query");
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, topic, title, content, source_url, is_synthetic, freshness
     from kb_chunks
     where embedding is not null
     order by embedding <=> $1::vector
     limit $2`,
    [toVectorLiteral(vector), POOL_SIZE],
  );
  return rows.map(rowToCandidate);
}

async function keywordArm(queryText: string): Promise<Candidate[]> {
  const tsQuery = buildTsQuery(queryText);
  if (!tsQuery) return [];
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, topic, title, content, source_url, is_synthetic, freshness,
            ts_rank(fts, to_tsquery('simple', $1)) as rank
     from kb_chunks
     where fts @@ to_tsquery('simple', $1)
     order by rank desc
     limit $2`,
    [tsQuery, POOL_SIZE],
  );
  return rows.map(rowToCandidate);
}

function rowToCandidate(row: {
  id: string;
  topic: string;
  title: string | null;
  content: string;
  source_url: string | null;
  is_synthetic: boolean;
  freshness: string | null;
}): Candidate {
  return {
    id: row.id,
    topic: row.topic,
    title: row.title,
    content: row.content,
    sourceUrl: row.source_url,
    isSynthetic: row.is_synthetic,
    freshness: row.freshness,
  };
}

/** Reciprocal Rank Fusion over any number of ranked id lists (recall-oriented, no score-scale tuning). */
export function reciprocalRankFusion(rankedLists: string[][]): string[] {
  const scores = new Map<string, number>();
  for (const list of rankedLists) {
    list.forEach((id, rank) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (RRF_K + rank + 1));
    });
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

export interface RetrievalResult {
  candidates: Candidate[];
  degradedToKeywordOnly: boolean;
}

/**
 * Hybrid retrieval: dense (pgvector) ⊕ keyword (FTS), fused via RRF. Matched informational intents
 * are a soft ranking boost (a 3rd RRF list), never a hard single-topic filter — a misclassified
 * intent can still surface the right chunk instead of excluding it outright (Architecture guide
 * §5.7). Degrades to keyword-only if the embedding endpoint is unavailable.
 */
export async function retrieveCandidates(
  normalized: NormalizedQuery,
  informationalIntents: string[],
): Promise<RetrievalResult> {
  const keywordResults = await keywordArm(normalized.expanded);
  const byId = new Map(keywordResults.map((c) => [c.id, c]));
  let denseResults: Candidate[] = [];
  let degradedToKeywordOnly = false;

  try {
    denseResults = await denseArm(normalized.expanded);
    for (const c of denseResults) byId.set(c.id, c);
  } catch (err) {
    console.error("dense retrieval failed, degrading to keyword-only:", err);
    degradedToKeywordOnly = true;
  }

  const topicSet = new Set(informationalIntents);
  const topicBoostIds = [...byId.values()].filter((c) => topicSet.has(c.topic)).map((c) => c.id);

  const fusedIds = reciprocalRankFusion([
    denseResults.map((c) => c.id),
    keywordResults.map((c) => c.id),
    topicBoostIds,
  ]);

  return {
    candidates: fusedIds.map((id) => byId.get(id)!).filter(Boolean),
    degradedToKeywordOnly,
  };
}
