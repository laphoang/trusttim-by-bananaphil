import { classifySeverity } from "../emergency/classify";
import { raiseEmergencyCase, type EmergencyCase } from "../emergency/case";
import {
  CLASSIFIER_FAILSAFE_MESSAGE,
  NORMAL_SYMPTOM_REDIRECT_MESSAGE,
  SERIOUS_EMERGENCY_MESSAGE,
} from "../emergency/responses";
import { classifyIntent } from "../scope/classify";
import { BOOKING_ONLY_MESSAGE, GROUNDING_GATE_MESSAGE, OUT_OF_SCOPE_MESSAGE } from "../scope/responses";
import { normalizeQuery } from "../rag/normalize";
import { retrieveCandidates } from "../rag/retrieve";
import { rerankCandidates } from "../rag/rerank";
import { generateAnswer, type Citation } from "../rag/generate";

export type ChatResponseType =
  | "emergency"
  | "normal_symptom_redirect"
  | "classifier_failsafe"
  | "out_of_scope"
  | "grounding_gate"
  | "grounded_answer"
  | "booking_only";

export interface ChatDebug {
  severity?: "none" | "normal" | "serious";
  matchedSignals?: string[];
  inScope?: boolean;
  intents?: string[];
  degradedToKeywordOnly?: boolean;
  degradedToFusionOrder?: boolean;
  latencyMs: number;
}

export interface ChatResult {
  responseType: ChatResponseType;
  message: string;
  citations: Citation[];
  bookingCta: boolean;
  emergencyCase?: EmergencyCase;
  debug: ChatDebug;
}

function respond(
  responseType: ChatResponseType,
  message: string,
  startedAt: number,
  extra: Partial<ChatResult> = {},
  debugExtra: Partial<ChatDebug> = {},
): ChatResult {
  return {
    responseType,
    message,
    citations: [],
    bookingCta: false,
    ...extra,
    debug: { latencyMs: Date.now() - startedAt, ...debugExtra },
  };
}

/**
 * The ordered pipeline (Architecture guide §3): symptom & emergency guardrail first (fails safe),
 * then intent & scope, then hybrid retrieval + rerank + grounding gate + generation, then the
 * booking action attached independently of the informational answer.
 */
export async function runChatPipeline(userMessage: string): Promise<ChatResult> {
  const startedAt = Date.now();
  const normalized = normalizeQuery(userMessage);

  // 1. Symptom & emergency guardrail — runs before anything else, fails safe on error.
  let severity: "none" | "normal" | "serious";
  let matchedSignals: string[] = [];
  try {
    const verdict = await classifySeverity(userMessage);
    severity = verdict.severity;
    matchedSignals = verdict.matched_signals;
  } catch (err) {
    console.error("severity classifier failed — failing safe:", err);
    return respond("classifier_failsafe", CLASSIFIER_FAILSAFE_MESSAGE, startedAt);
  }

  if (severity === "serious") {
    const emergencyCase = raiseEmergencyCase(userMessage, matchedSignals);
    return respond("emergency", SERIOUS_EMERGENCY_MESSAGE, startedAt, { emergencyCase }, {
      severity,
      matchedSignals,
    });
  }
  if (severity === "normal") {
    return respond(
      "normal_symptom_redirect",
      NORMAL_SYMPTOM_REDIRECT_MESSAGE,
      startedAt,
      { bookingCta: true },
      { severity, matchedSignals },
    );
  }

  // 2. Intent & scope guardrail — after guardrail 1, before retrieval. Bias toward answering when
  // the classifier itself is unavailable, rather than wrongly turning away a real patient.
  let inScope: boolean;
  let intents: string[];
  try {
    const verdict = await classifyIntent(userMessage, normalized);
    inScope = verdict.in_scope;
    intents = verdict.intents;
  } catch (err) {
    console.error("intent classifier failed — biasing toward answering:", err);
    inScope = normalized.matchedIntents.length > 0;
    intents = normalized.matchedIntents;
  }

  if (!inScope || intents.length === 0) {
    return respond("out_of_scope", OUT_OF_SCOPE_MESSAGE, startedAt, {}, { severity, inScope, intents });
  }

  const informationalIntents = intents.filter((i) => i !== "booking");
  const bookingRequested = intents.includes("booking");

  // 3. Booking-only message skips retrieval/generation entirely.
  if (informationalIntents.length === 0 && bookingRequested) {
    return respond(
      "booking_only",
      BOOKING_ONLY_MESSAGE,
      startedAt,
      { bookingCta: true },
      { severity, inScope, intents },
    );
  }

  // 4. Hybrid retrieve (soft topic filter = union of matched informational intents) + rerank.
  const retrieval = await retrieveCandidates(normalized, informationalIntents);
  const reranked = await rerankCandidates(normalized.original, retrieval.candidates);

  const debugExtra: ChatDebug = {
    severity,
    inScope,
    intents,
    degradedToKeywordOnly: retrieval.degradedToKeywordOnly,
    degradedToFusionOrder: reranked.degradedToFusionOrder,
    latencyMs: 0,
  };

  // 5. Grounding gate — distinct from the out-of-scope decline (in-scope, but ungrounded).
  if (!reranked.grounded) {
    return respond(
      "grounding_gate",
      GROUNDING_GATE_MESSAGE,
      startedAt,
      { bookingCta: bookingRequested },
      debugExtra,
    );
  }

  // 6. Generate + 7. attach booking CTA alongside the informational answer if also requested.
  const generated = await generateAnswer(userMessage, reranked.candidates);
  return respond(
    "grounded_answer",
    generated.answer,
    startedAt,
    { citations: generated.citations, bookingCta: bookingRequested },
    debugExtra,
  );
}
