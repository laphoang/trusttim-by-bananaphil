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
export async function classifySeverity(
  userMessage: string,
  conversationSummary?: string,
): Promise<SeverityClassification> {
  const userPrompt = conversationSummary
    ? `Bối cảnh cuộc trò chuyện trước đó:\n${conversationSummary}\n\nTin nhắn hiện tại của bệnh nhân:\n${userMessage}`
    : userMessage;
  return chatJSON(SEVERITY_CLASSIFIER_PROMPT, userPrompt, SeverityClassification, { temperature: 0 });
}
