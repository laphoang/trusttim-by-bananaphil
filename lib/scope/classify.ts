import { z } from "zod";
import { chatJSON } from "../llm/client";
import type { NormalizedQuery } from "../rag/normalize";
import { INTENT_CLASSIFIER_PROMPT } from "../prompt/intent-classifier";

export const Intent = z.enum([
  "booking",
  "bhyt_pricing",
  "procedures",
  "hospital_info",
  "doctor_schedule",
]);
export type Intent = z.infer<typeof Intent>;

export const IntentClassification = z.object({
  in_scope: z.boolean(),
  intents: z.array(Intent),
});
export type IntentClassification = z.infer<typeof IntentClassification>;

/**
 * Deterministic pass-through first (Architecture guide §6.2/§3 step 3): if the dictionary already
 * matched one or more of the five intents, skip the LLM call entirely. The classifier only runs
 * on what that pass didn't resolve.
 */
export async function classifyIntent(
  userMessage: string,
  normalized: NormalizedQuery,
): Promise<IntentClassification> {
  if (normalized.matchedIntents.length > 0) {
    return { in_scope: true, intents: normalized.matchedIntents as Intent[] };
  }
  return chatJSON(INTENT_CLASSIFIER_PROMPT, userMessage, IntentClassification, { temperature: 0.2 });
}
