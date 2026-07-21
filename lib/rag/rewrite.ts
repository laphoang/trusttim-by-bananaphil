import { chat } from "../llm/client";
import { QUERY_REWRITE_PROMPT } from "../prompt/query-rewrite";

/**
 * Formalizes colloquial Vietnamese phrasing into the standard medical/administrative terminology
 * the retrieval reranker responds to (diagnosed: same candidates, same meaning, but the reranker
 * scores colloquial phrasing far lower than formal phrasing — see plan). Throws on failure; callers
 * MUST fail soft and fall back to the dictionary-expanded/raw query (same convention as
 * `summarizeHistory`) rather than block retrieval.
 */
export async function rewriteQuery(
  userMessage: string,
  dictionaryExpanded: string,
  conversationSummary?: string,
): Promise<string> {
  const parts: string[] = [`Câu hỏi gốc của bệnh nhân:\n${userMessage}`];
  if (dictionaryExpanded !== userMessage) {
    parts.push(`Từ điển đã khớp và mở rộng:\n${dictionaryExpanded}`);
  }
  if (conversationSummary) {
    parts.push(`Bối cảnh cuộc trò chuyện trước đó:\n${conversationSummary}`);
  }

  const rewritten = await chat(
    [
      { role: "system", content: QUERY_REWRITE_PROMPT },
      { role: "user", content: parts.join("\n\n") },
    ],
    { temperature: 0.2, maxTokens: 300 },
  );
  return rewritten.trim();
}
