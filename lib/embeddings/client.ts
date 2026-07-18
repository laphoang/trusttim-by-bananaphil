import { recordEmbeddingUsage, recordRerankUsage } from "../usage";

/**
 * FPT AI Factory embeddings + reranker client — same base URL/key as lib/llm/client.ts.
 * Embeddings are asymmetric (Implementation Spec §1.2): ingest must send input_type="passage",
 * live queries must send input_type="query". Getting this backwards doesn't error, it just makes
 * dense retrieval silently worse.
 */

const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (res.ok) return res;
      if (res.status < 500 || attempt === MAX_RETRIES) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
  }
  throw lastError;
}

function fptHeaders(): Record<string, string> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY is not set");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

export type InputType = "passage" | "query";

interface EmbeddingsResponse {
  object: string;
  data: Array<{ object: string; index: number; embedding: number[] }>;
}

/** Embeds a batch of texts. input_type MUST be "passage" at ingest, "query" at retrieval time. */
export async function embed(texts: string[], inputType: InputType): Promise<number[][]> {
  const baseUrl = process.env.API_BASE_URL;
  const model = process.env.EMBEDDING_MODEL;
  const dimensions = Number(process.env.EMBEDDING_DIM ?? "1024");
  if (!baseUrl || !model) throw new Error("API_BASE_URL / EMBEDDING_MODEL are not set");

  const res = await fetchWithRetry(`${baseUrl}/v1/embeddings`, {
    method: "POST",
    headers: fptHeaders(),
    body: JSON.stringify({
      model,
      input: texts,
      dimensions,
      encoding_format: "float",
      input_text_truncate: "none",
      input_type: inputType,
    }),
  });

  if (!res.ok) {
    throw new Error(`vietnamese-embedding failed: HTTP ${res.status}`);
  }

  const body = (await res.json()) as EmbeddingsResponse & {
    usage?: { total_tokens?: number | string };
  };
  if (body.usage?.total_tokens) recordEmbeddingUsage(Number(body.usage.total_tokens));
  return body.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

export interface RerankResult {
  index: number;
  relevanceScore: number;
}

interface RerankResponse {
  id: string;
  results: Array<{ index: number; relevance_score: number }>;
}

/** Reranks candidate documents against the query. Returns results sorted by relevance desc. */
export async function rerank(
  query: string,
  documents: string[],
  topN: number,
): Promise<RerankResult[]> {
  const baseUrl = process.env.API_BASE_URL;
  const model = process.env.RERANKER_MODEL;
  if (!baseUrl || !model) throw new Error("API_BASE_URL / RERANKER_MODEL are not set");

  const res = await fetchWithRetry(`${baseUrl}/v1/rerank`, {
    method: "POST",
    headers: fptHeaders(),
    body: JSON.stringify({ model, query, documents, top_n: topN }),
  });

  if (!res.ok) {
    throw new Error(`bge-reranker-v2-m3 failed: HTTP ${res.status}`);
  }

  const body = (await res.json()) as RerankResponse & {
    meta?: { billed_units?: { total_tokens?: number } };
  };
  if (body.meta?.billed_units?.total_tokens) {
    recordRerankUsage(body.meta.billed_units.total_tokens);
  }
  return body.results
    .map((r) => ({ index: r.index, relevanceScore: r.relevance_score }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
