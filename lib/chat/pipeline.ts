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
import { rerankCandidates, RELEVANCE_THRESHOLD } from "../rag/rerank";
import { generateAnswer, type Citation } from "../rag/generate";
import { SEVERITY_CLASSIFIER_PROMPT } from "../prompt/severity-classifier";
import { INTENT_CLASSIFIER_PROMPT } from "../prompt/intent-classifier";
import { GENERATE_ANSWER_PROMPT } from "../prompt/generate-answer";

const CHUNK_LOG_PREVIEW_LENGTH = 200;

function createStepLogger() {
  const reqId = Math.random().toString(36).slice(2, 8);
  let n = 0;
  return function logStep(label: string, data: unknown) {
    n += 1;
    console.log(`[chat:${reqId}] Step ${n} — ${label}`);
    console.log(JSON.stringify(data, null, 2));
  };
}

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
  const log = createStepLogger();
  const normalized = normalizeQuery(userMessage);
  log("Input received", { userMessage, normalized });

  // 1. Symptom & emergency guardrail — runs before anything else, fails safe on error.
  let severity: "none" | "normal" | "serious";
  let matchedSignals: string[] = [];
  try {
    const verdict = await classifySeverity(userMessage);
    severity = verdict.severity;
    matchedSignals = verdict.matched_signals;
    log("Severity classification", {
      systemPrompt: SEVERITY_CLASSIFIER_PROMPT,
      userMessage,
      result: verdict,
    });
  } catch (err) {
    log("Severity classification FAILED — fail-safe", {
      systemPrompt: SEVERITY_CLASSIFIER_PROMPT,
      userMessage,
      error: String(err),
    });
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
  const usedDictionaryPassThrough = normalized.matchedIntents.length > 0;
  try {
    const verdict = await classifyIntent(userMessage, normalized);
    inScope = verdict.in_scope;
    intents = verdict.intents;
    log("Intent & scope classification", {
      source: usedDictionaryPassThrough ? "dictionary pass-through (no LLM call)" : "LLM classifier",
      systemPrompt: usedDictionaryPassThrough ? undefined : INTENT_CLASSIFIER_PROMPT,
      userMessage,
      result: verdict,
    });
  } catch (err) {
    log("Intent & scope classification FAILED — biasing toward answering", {
      systemPrompt: INTENT_CLASSIFIER_PROMPT,
      userMessage,
      error: String(err),
    });
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
  log("Retrieval", {
    query: normalized.expanded,
    informationalIntents,
    degradedToKeywordOnly: retrieval.degradedToKeywordOnly,
    chunksRetrieved: retrieval.candidates.map((c) => ({
      id: c.id,
      topic: c.topic,
      title: c.title,
      sourceUrl: c.sourceUrl,
      isSynthetic: c.isSynthetic,
      freshness: c.freshness,
      contentPreview:
        c.content.length > CHUNK_LOG_PREVIEW_LENGTH
          ? `${c.content.slice(0, CHUNK_LOG_PREVIEW_LENGTH)}…`
          : c.content,
    })),
  });

  const reranked = await rerankCandidates(normalized.original, retrieval.candidates);
  log("Rerank", {
    query: normalized.original,
    relevanceThreshold: RELEVANCE_THRESHOLD,
    scored: reranked.scored,
    grounded: reranked.grounded,
    degradedToFusionOrder: reranked.degradedToFusionOrder,
    passedCandidateIds: reranked.candidates.map((c) => c.id),
  });

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
  log("Generation prompt sent to LLM", {
    systemPrompt: GENERATE_ANSWER_PROMPT,
    prompt: generated.promptSent,
  });
  log("LLM response received", {
    answer: generated.answer,
    citations: generated.citations,
  });
  return respond(
    "grounded_answer",
    generated.answer,
    startedAt,
    { citations: generated.citations, bookingCta: bookingRequested },
    debugExtra,
  );
}
