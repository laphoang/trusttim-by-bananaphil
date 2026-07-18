import { z } from "zod";
import { chatJSON } from "../llm/client";
import type { NormalizedQuery } from "../rag/normalize";

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

const SYSTEM_PROMPT = `You are an intent classifier for TrustTim, a Hanoi Heart Hospital assistant. Classify which of the
hospital's supported services the user's message is asking about. A message can match MORE THAN
ONE — do not pick only one and stop.

The five intents:
- "booking": the user wants to schedule/book an appointment.
- "bhyt_pricing": BHYT (health insurance) coverage questions, or examination/treatment service
  pricing.
- "procedures": how outpatient reception, examination, or treatment actually works (the process,
  not the price).
- "hospital_info": general hospital information — departments, location, contact, policies.
- "doctor_schedule": doctor availability or schedules.

If the message matches ANY of the five intents, "in_scope" is true and "intents" lists every intent
that applies (booking can co-occur with any informational intent — e.g. "is there a heart check-up
combo? I want to book" matches both "bhyt_pricing" and "booking").

If the message is about something else entirely (unrelated to Hanoi Heart Hospital, or harmful/
abusive), "in_scope" is false and "intents" is an empty array.

When genuinely unsure whether a message is in scope, lean toward "in_scope: true" with your best
guess at the intent — a downstream grounding check will catch it if nothing relevant is found. Do
not turn away a real patient's question over classifier uncertainty.

Respond ONLY with JSON matching this shape:
{ "in_scope": boolean, "intents": ("booking" | "bhyt_pricing" | "procedures" | "hospital_info" | "doctor_schedule")[] }`;

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
  return chatJSON(SYSTEM_PROMPT, userMessage, IntentClassification, { temperature: 0.2 });
}
