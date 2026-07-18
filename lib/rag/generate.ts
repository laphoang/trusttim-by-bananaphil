import { chat } from "../llm/client";
import type { Candidate } from "./retrieve";

const SYSTEM_PROMPT = `You are TrustTim, the information assistant for Hanoi Heart Hospital (Bệnh viện Tim Hà Nội).
Answer only using the CONTEXT provided below, in Vietnamese. If the question has multiple parts,
address every part, combining facts from all relevant sources in the context. Cite the source of
each fact (use the title/URL provided with each context chunk). If the CONTEXT covers some parts
of the question but not others, answer what you can and direct the user to the hotline 1900 1082
for the rest — never guess or fill gaps from general knowledge. You never give medical, diagnostic,
or treatment advice, even if asked directly — redirect any such question to booking an appointment.
Write in plain conversational text, not Markdown — no "**bold**", no "#" headings, no "*" bullet
markers. For lists, write each item as a plain line starting with "1)", "2)", etc., or as a short
sentence.`;

export interface Citation {
  title: string | null;
  sourceUrl: string | null;
  isSynthetic: boolean;
  freshness: string | null;
}

export interface GeneratedAnswer {
  answer: string;
  citations: Citation[];
}

/** LLM output nominally avoids Markdown (see SYSTEM_PROMPT) but doesn't always comply — strip it. */
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
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    // gpt-oss-20b spends tokens reasoning before the answer — 1024 was too tight and returned
    // empty content on longer contexts (see lib/llm/client.ts).
    { temperature: 0.4, maxTokens: 2048, reasoningEffort: "low" },
  );

  return {
    answer: stripMarkdown(answer),
    citations: candidates.map((c) => ({
      title: c.title,
      sourceUrl: c.sourceUrl,
      isSynthetic: c.isSynthetic,
      freshness: c.freshness,
    })),
  };
}
