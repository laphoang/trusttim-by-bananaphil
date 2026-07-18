/**
 * ponytail self-check: one runnable, assert-based check (no test framework/fixtures) covering the
 * pipeline logic that must never silently break: RRF fusion, dictionary normalization, the FPT
 * envelope unwrap, Zod validation, and the fail-safe path. Run with `npm run selfcheck`.
 */
import assert from "node:assert/strict";
import { reciprocalRankFusion } from "../lib/rag/retrieve";
import { normalizeQuery } from "../lib/rag/normalize";
import { extractChatContent, extractJson, type FptChatResponse } from "../lib/llm/client";
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

  // 3. FPT envelope unwrap: the real payload sits inside .data, not the top level.
  {
    const body: FptChatResponse = {
      code: 200,
      message: "Chat completion successful",
      data: {
        id: "chatcmpl-test",
        choices: [{ index: 0, message: { role: "assistant", content: "xin chào" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      },
    };
    assert.equal(extractChatContent(body), "xin chào");
    assert.throws(() => extractChatContent({ code: 200, message: "", data: { id: "", choices: [], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } } }));
    assert.equal(extractJson('```json\n{"a":1}\n```'), '{"a":1}');
    console.log("✅ FPT envelope unwrap");
  }

  // 4. Zod validation: schemas accept the documented shape and reject an invalid enum value.
  {
    SeverityClassification.parse({ severity: "serious", matched_signals: ["đau ngực"] });
    assert.throws(() => SeverityClassification.parse({ severity: "urgent", matched_signals: [] }));
    IntentClassification.parse({ in_scope: true, intents: ["booking", "bhyt_pricing"] });
    assert.throws(() => IntentClassification.parse({ in_scope: true, intents: ["unknown_intent"] }));
    console.log("✅ Zod structured-output validation");
  }

  // 5. Fail-safe path: with no FPT credentials configured, the pipeline must show the safety
  // notice — never silently proceed to retrieval/generation. Runs offline (chat() throws
  // synchronously on missing env vars, before any network call).
  {
    const savedBaseUrl = process.env.API_BASE_URL;
    const savedApiKey = process.env.API_KEY;
    delete process.env.API_BASE_URL;
    delete process.env.API_KEY;
    try {
      const result = await runChatPipeline("tôi đang đau ngực");
      assert.equal(result.responseType, "classifier_failsafe");
      assert.equal(result.message, CLASSIFIER_FAILSAFE_MESSAGE);
    } finally {
      if (savedBaseUrl) process.env.API_BASE_URL = savedBaseUrl;
      if (savedApiKey) process.env.API_KEY = savedApiKey;
    }
    console.log("✅ fail-safe path (classifier error never silently proceeds)");
  }

  console.log("\nAll self-checks passed.");
}

main().catch((err) => {
  console.error("❌ selfcheck failed:", err);
  process.exit(1);
});
