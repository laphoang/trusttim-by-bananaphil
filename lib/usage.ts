/**
 * Cumulative token/cost tracker across the three FPT endpoints (Architecture guide §9d/§12).
 * ponytail: a module-level accumulator, correct for the single-threaded eval script this is built
 * for; ceiling: not safe for concurrent request tracking. Upgrade path: thread usage through
 * request-scoped context if per-conversation cost ever needs to be shown in the live UI.
 */

export interface UsageSummary {
  llmPromptTokens: number;
  llmCompletionTokens: number;
  embeddingTokens: number;
  rerankTokens: number;
  calls: { llm: number; embedding: number; rerank: number };
}

function emptyUsage(): UsageSummary {
  return {
    llmPromptTokens: 0,
    llmCompletionTokens: 0,
    embeddingTokens: 0,
    rerankTokens: 0,
    calls: { llm: 0, embedding: 0, rerank: 0 },
  };
}

let usage = emptyUsage();

export function resetUsage(): void {
  usage = emptyUsage();
}

export function getUsage(): UsageSummary {
  return usage;
}

export function recordLlmUsage(promptTokens: number, completionTokens: number): void {
  usage.llmPromptTokens += promptTokens || 0;
  usage.llmCompletionTokens += completionTokens || 0;
  usage.calls.llm += 1;
}

export function recordEmbeddingUsage(totalTokens: number): void {
  usage.embeddingTokens += totalTokens || 0;
  usage.calls.embedding += 1;
}

export function recordRerankUsage(totalTokens: number): void {
  usage.rerankTokens += totalTokens || 0;
  usage.calls.rerank += 1;
}

// Per-token pricing from hackathon_docs/guide/llm_api_example.md.
const PRICE_PER_MILLION = {
  llmInput: 0.0495,
  llmOutput: 0.198,
  embedding: 0.011,
  rerank: 0.022,
};

export function estimateCostUsd(u: UsageSummary = usage): number {
  return (
    (u.llmPromptTokens / 1_000_000) * PRICE_PER_MILLION.llmInput +
    (u.llmCompletionTokens / 1_000_000) * PRICE_PER_MILLION.llmOutput +
    (u.embeddingTokens / 1_000_000) * PRICE_PER_MILLION.embedding +
    (u.rerankTokens / 1_000_000) * PRICE_PER_MILLION.rerank
  );
}
