import { z } from "zod";
import { chatJSON } from "../llm/client";
import { SEVERITY_CLASSIFIER_PROMPT } from "../prompt/severity-classifier";

export const SeverityClassification = z.object({
  severity: z.enum(["none", "normal", "serious"]),
  matched_signals: z.array(z.string()),
});
export type SeverityClassification = z.infer<typeof SeverityClassification>;

/**
 * The sole severity detector (Architecture guide §6.1) — no keyword pre-screen, one clear
 * detection path. Callers MUST fail safe on error/timeout (never silently continue to RAG).
 */
export async function classifySeverity(userMessage: string): Promise<SeverityClassification> {
  return chatJSON(SEVERITY_CLASSIFIER_PROMPT, userMessage, SeverityClassification, { temperature: 0 });
}
