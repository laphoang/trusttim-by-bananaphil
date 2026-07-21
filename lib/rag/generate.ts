import { chat } from "../llm/client";
import type { Candidate } from "./retrieve";
import { GENERATE_ANSWER_PROMPT } from "../prompt/generate-answer";

export interface Citation {
  title: string | null;
  sourceUrl: string | null;
  isSynthetic: boolean;
  freshness: string | null;
}

export interface GeneratedAnswer {
  answer: string;
  citations: Citation[];
  promptSent: string;
}

/** LLM output nominally avoids Markdown (see GENERATE_ANSWER_PROMPT) but doesn't always comply — strip it. */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1") // **bold**
    .replace(/(^|[^*])\*(?!\*)([^*\n]+)\*(?!\*)/g, "$1$2") // *italic*
    .replace(/^#{1,6}\s+/gm, "") // # headings
    .replace(/[ \t]+$/gm, ""); // trailing markdown hard-break spaces
}

function formatContext(candidates: Candidate[]): string {
  return candidates
    .map(
      (c, i) =>
        `[${i + 1}] ${c.title ?? c.id}${c.sourceUrl ? ` (${c.sourceUrl})` : ""}${
          c.isSynthetic ? " [minh hoạ/illustrative]" : ""
        }${c.freshness ? ` [${c.freshness}]` : ""}\n${c.content}`,
    )
    .join("\n\n");
}

/** Generation over the grounded, reranked context — the citations are every chunk it was given. */
export async function generateAnswer(
  userMessage: string,
  candidates: Candidate[],
): Promise<GeneratedAnswer> {
  const prompt = `CONTEXT:\n${formatContext(candidates)}\n\nUSER QUESTION:\n${userMessage}`;
  const answer = await chat(
    [
      { role: "system", content: GENERATE_ANSWER_PROMPT },
      { role: "user", content: prompt },
    ],
    { temperature: 0.4, maxTokens: 2048 },
  );

  return {
    answer: stripMarkdown(answer),
    citations: candidates.map((c) => ({
      title: c.title,
      sourceUrl: c.sourceUrl,
      isSynthetic: c.isSynthetic,
      freshness: c.freshness,
    })),
    promptSent: prompt,
  };
}
