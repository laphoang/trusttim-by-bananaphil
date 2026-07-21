import { chat } from "../llm/client";
import { SUMMARIZE_HISTORY_PROMPT } from "../prompt/summarize-history";

export interface HistoryTurn {
  role: "user" | "assistant";
  text: string;
}

/** Condenses prior turns into short context for this turn's classifiers/retrieval/generation
 * (Architecture guide: "minimal history" — relevant context over large context). Callers must fail
 * soft: a summarization error should never block the pipeline, just degrade to no context. */
export async function summarizeHistory(history: HistoryTurn[]): Promise<string> {
  const transcript = history
    .map((t) => `${t.role === "user" ? "Bệnh nhân" : "TrustTim"}: ${t.text}`)
    .join("\n");
  return chat(
    [
      { role: "system", content: SUMMARIZE_HISTORY_PROMPT },
      { role: "user", content: transcript },
    ],
    { temperature: 0.2, maxTokens: 300 },
  );
}
