/**
 * ponytail self-check: one runnable, assert-based check (no test framework/fixtures) covering the
 * pipeline logic that must never silently break: RRF fusion, dictionary normalization, Zod
 * validation, and the fail-safe path. Run with `npm run selfcheck`.
 */
import assert from "node:assert/strict";
import { reciprocalRankFusion } from "../lib/rag/retrieve";
import { normalizeQuery } from "../lib/rag/normalize";
import { extractChatContent, extractJson, type ChatCompletionResponse } from "../lib/llm/client";
import { SeverityClassification } from "../lib/emergency/classify";
import { IntentClassification } from "../lib/scope/classify";
import { CLASSIFIER_FAILSAFE_MESSAGE } from "../lib/emergency/responses";
import { runChatPipeline } from "../lib/chat/pipeline";

async function main() {
  // 1. RRF fusion: an id ranked #1 in both lists must outrank one appearing in only one list.
  {
    const dense = ["a", "b", "c"];
    const keyword = ["b", "a", "d"];
    const fused = reciprocalRankFusion([dense, keyword]);
    assert.equal(fused[0], "a", "top of both lists must fuse to rank 1");
    assert.ok(fused.includes("d"), "an id present in only one list must still surface");
    assert.ok(
      fused.indexOf("a") < fused.indexOf("d"),
      "an id ranked in both lists must outrank one ranked in only one",
    );
    console.log("✅ RRF fusion");
  }

  // 2. Dictionary normalization: BHYT should expand + hint the bhyt_pricing intent.
  {
    const result = normalizeQuery("Thẻ BHYT của tôi có được thanh toán không?");
    assert.ok(result.expanded.includes("bảo hiểm y tế"), "BHYT must expand to bảo hiểm y tế");
    assert.deepEqual(result.matchedIntents, ["bhyt_pricing"]);
    console.log("✅ dictionary normalization");
  }

  // 3. Chat response parsing: empty content must throw, never silently return "".
  {
    const response: ChatCompletionResponse = {
      choices: [{ index: 0, message: { role: "assistant", content: "xin chào" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    };
    assert.equal(extractChatContent(response), "xin chào");

    assert.throws(
      () =>
        extractChatContent({
          choices: [{ index: 0, message: { role: "assistant", content: "" }, finish_reason: "stop" }],
        }),
      "empty content must throw, not silently return empty",
    );

    assert.equal(extractJson('```json\n{"a":1}\n```'), '{"a":1}');
    assert.equal(extractJson('Sure, here you go: {"a":1} thanks!'), '{"a":1}', "stray prose around JSON must be stripped");
    console.log("✅ Chat response parsing");
  }

  // 4. Zod validation: schemas accept the documented shape and reject an invalid enum value.
  {
    SeverityClassification.parse({ severity: "serious", matched_signals: ["đau ngực"] });
    assert.throws(() => SeverityClassification.parse({ severity: "urgent", matched_signals: [] }));
    IntentClassification.parse({ in_scope: true, intents: ["booking", "bhyt_pricing"] });
    assert.throws(() => IntentClassification.parse({ in_scope: true, intents: ["unknown_intent"] }));
    console.log("✅ Zod structured-output validation");
  }

  // 5. Fail-safe path: with no OpenAI credentials configured, the pipeline must show the safety
  // notice — never silently proceed to retrieval/generation. Runs offline (chat() throws
  // synchronously on missing env vars, before any network call).
  {
    const savedLlmModel = process.env.LLM_MODEL;
    const savedOpenaiKey = process.env.OPENAI_API_KEY;
    delete process.env.LLM_MODEL;
    delete process.env.OPENAI_API_KEY;
    try {
      const result = await runChatPipeline("tôi đang đau ngực");
      assert.equal(result.responseType, "classifier_failsafe");
      assert.equal(result.message, CLASSIFIER_FAILSAFE_MESSAGE);
    } finally {
      if (savedLlmModel) process.env.LLM_MODEL = savedLlmModel;
      if (savedOpenaiKey) process.env.OPENAI_API_KEY = savedOpenaiKey;
    }
    console.log("✅ fail-safe path (classifier error never silently proceeds)");
  }

  // 6. History summarization fails soft: with no credentials, summarizing prior turns must NOT
  // throw uncaught — it should degrade to no conversation context and the pipeline should still
  // reach (and correctly hit) the severity classifier's own fail-safe path, same as with no history.
  {
    const savedLlmModel = process.env.LLM_MODEL;
    const savedOpenaiKey = process.env.OPENAI_API_KEY;
    delete process.env.LLM_MODEL;
    delete process.env.OPENAI_API_KEY;
    try {
      const result = await runChatPipeline("tôi đang đau ngực", [
        { role: "user", text: "Tôi muốn hỏi về giá khám tim mạch" },
        { role: "assistant", text: "Chi phí khám tim mạch dao động tuỳ gói khám..." },
      ]);
      assert.equal(result.responseType, "classifier_failsafe");
      assert.equal(result.message, CLASSIFIER_FAILSAFE_MESSAGE);
    } finally {
      if (savedLlmModel) process.env.LLM_MODEL = savedLlmModel;
      if (savedOpenaiKey) process.env.OPENAI_API_KEY = savedOpenaiKey;
    }
    console.log("✅ history summarization fails soft (never blocks the safety guardrail)");
  }

  console.log("\nAll self-checks passed.");
}

main().catch((err) => {
  console.error("❌ selfcheck failed:", err);
  process.exit(1);
});
