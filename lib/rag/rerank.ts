import { rerank as rerankApi } from "../embeddings/client";
import type { Candidate } from "./retrieve";

const TOP_K = 5;
// Tunable via the eval harness (Architecture guide §9b) against faq-cases.json.
const RELEVANCE_THRESHOLD = 0.2;

export interface RerankedResult {
  candidates: Candidate[];
  grounded: boolean;
  degradedToFusionOrder: boolean;
}

/**
 * Reranks fused candidates against the full query (resolves multi-intent queries — the reranker
 * scores every candidate against the whole question, so each intent's best chunk can surface).
 * Falls back to the fusion order if the reranker endpoint is unavailable (Architecture guide §5.7).
 */
export async function rerankCandidates(
  query: string,
  candidates: Candidate[],
): Promise<RerankedResult> {
  if (candidates.length === 0) {
    return { candidates: [], grounded: false, degradedToFusionOrder: false };
  }

  try {
    // Title is included so meta/navigational queries (e.g. "link to X") can match a chunk whose
    // title names X even when the body content (e.g. a schedule table) doesn't lexically overlap.
    const documents = candidates.map((c) => (c.title ? `${c.title}\n${c.content}` : c.content));
    const results = await rerankApi(query, documents, TOP_K);
    const grounded = results.some((r) => r.relevanceScore >= RELEVANCE_THRESHOLD);
    const top = results
      .filter((r) => r.relevanceScore >= RELEVANCE_THRESHOLD)
      .map((r) => candidates[r.index]);
    return { candidates: top, grounded, degradedToFusionOrder: false };
  } catch (err) {
    console.error("rerank failed, degrading to fusion order:", err);
    // ponytail: without the reranker's relevance score we have no real confidence signal — the
    // ceiling here is "grounded whenever fusion found anything at all." Upgrade path: a cheap
    // lexical-overlap heuristic between query and top candidate if this fallback proves too loose.
    return {
      candidates: candidates.slice(0, TOP_K),
      grounded: true,
      degradedToFusionOrder: true,
    };
  }
}
