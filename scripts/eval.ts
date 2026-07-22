import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { loadEnv } from "../lib/env";

loadEnv();

import { classifySeverity } from "../lib/emergency/classify";
import { classifyIntent } from "../lib/scope/classify";
import { normalizeQuery } from "../lib/rag/normalize";
import { rewriteQuery } from "../lib/rag/rewrite";
import { retrieveCandidates } from "../lib/rag/retrieve";
import { rerankCandidates } from "../lib/rag/rerank";
import { generateAnswer } from "../lib/rag/generate";
import { runChatPipeline } from "../lib/chat/pipeline";
import { estimateCostUsd, getUsage, resetUsage } from "../lib/usage";
import { getPool } from "../lib/db/client";

const DATA_DIR = path.join(process.cwd(), "data", "eval");

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(DATA_DIR, file), "utf-8")) as T;
}

interface EmergencyCase {
  id: string;
  message: string;
  expectedSeverity: "none" | "normal" | "serious";
}

interface ScopeCase {
  id: string;
  message: string;
  expectedInScope: boolean | null;
  expectedIntents?: string[];
  note?: string;
}

interface FaqCase {
  id: string;
  message: string;
  topic: string;
  expectedChunkIds: string[];
}

function setEquals(a: string[], b: string[]): boolean {
  const sa = new Set(a);
  const sb = new Set(b);
  return sa.size === sb.size && [...sa].every((x) => sb.has(x));
}

async function evalEmergency() {
  const cases = readJson<EmergencyCase[]>("emergency-cases.json");
  const rows: string[] = [];
  let seriousTotal = 0;
  let seriousCaught = 0;
  let missedSerious: string[] = [];

  for (const c of cases) {
    let predicted: string;
    try {
      predicted = (await classifySeverity(c.message)).severity;
    } catch (err) {
      predicted = `ERROR: ${(err as Error).message}`;
    }
    if (c.expectedSeverity === "serious") {
      seriousTotal++;
      if (predicted === "serious") seriousCaught++;
      else missedSerious.push(c.id);
    }
    rows.push(`| ${c.id} | ${c.message} | ${c.expectedSeverity} | ${predicted} | ${
      predicted === c.expectedSeverity ? "✅" : "⚠️"
    } |`);
  }

  const recall = seriousTotal ? (seriousCaught / seriousTotal) * 100 : NaN;
  return { rows, recall, seriousTotal, seriousCaught, missedSerious };
}

async function evalScope() {
  const cases = readJson<ScopeCase[]>("scope-cases.json");
  const rows: string[] = [];
  let correct = 0;
  let scored = 0;

  for (const c of cases) {
    if (c.expectedInScope === null) {
      // Precedence case: must be caught by guardrail 1, not scope-classified as off-topic.
      const result = await runChatPipeline(c.message);
      const ok = result.responseType === "emergency" || result.responseType === "normal_symptom_redirect";
      rows.push(`| ${c.id} | ${c.message} | guardrail-1 precedence | responseType=${result.responseType} | ${ok ? "✅" : "❌"} |`);
      continue;
    }
    const normalized = normalizeQuery(c.message);
    let verdict;
    try {
      verdict = await classifyIntent(c.message, normalized);
    } catch (err) {
      verdict = { in_scope: false, intents: [] as string[] };
    }
    const inScopeOk = verdict.in_scope === c.expectedInScope;
    const intentsOk = c.expectedIntents ? setEquals(verdict.intents, c.expectedIntents) : true;
    const ok = inScopeOk && intentsOk;
    scored++;
    if (ok) correct++;
    rows.push(
      `| ${c.id} | ${c.message} | in_scope=${c.expectedInScope}, intents=${JSON.stringify(c.expectedIntents ?? [])} | in_scope=${verdict.in_scope}, intents=${JSON.stringify(verdict.intents)} | ${ok ? "✅" : "⚠️"} |`,
    );
  }

  return { rows, accuracy: scored ? (correct / scored) * 100 : NaN };
}

async function evalRetrieval() {
  const cases = readJson<FaqCase[]>("faq-cases.json");
  const rows: string[] = [];
  let fusedHits = 0;
  let rerankHits = 0;

  for (const c of cases) {
    const normalized = normalizeQuery(c.message);
    // Mirror the chat pipeline: rewrite into formal Vietnamese before retrieval/rerank, falling
    // back to the dictionary-expanded/raw query on error (same convention as pipeline.ts).
    const rewritten = await rewriteQuery(c.message, normalized.expanded).catch(() => null);
    const retrievalQuery = rewritten ?? normalized.expanded;
    const rerankQuery = rewritten ?? c.message;

    const retrieval = await retrieveCandidates({ ...normalized, expanded: retrievalQuery }, [c.topic]);
    const fusedIds = retrieval.candidates.map((cand) => cand.id);
    const fusedHit = c.expectedChunkIds.some((id) => fusedIds.includes(id));
    if (fusedHit) fusedHits++;

    const reranked = await rerankCandidates(rerankQuery, retrieval.candidates);
    const rerankIds = reranked.candidates.map((cand) => cand.id);
    const rerankHit = c.expectedChunkIds.some((id) => rerankIds.includes(id));
    if (rerankHit) rerankHits++;

    rows.push(
      `| ${c.id} | ${c.message} | ${c.expectedChunkIds.join(", ")} | ${fusedHit ? "✅" : "❌"} | ${rerankHit ? "✅" : "❌"} |`,
    );
  }

  return {
    rows,
    fusedRecall: cases.length ? (fusedHits / cases.length) * 100 : NaN,
    rerankPrecision: cases.length ? (rerankHits / cases.length) * 100 : NaN,
  };
}

interface GoldenCase {
  id: string;
  question: string;
  topic: string;
  relevantChunkIds: string[];
  groundTruthAnswer: string;
  note?: string;
}

/**
 * Runs the real pipeline stages (same chain as evalRetrieval) plus generation, and dumps one JSON
 * trace per golden case to data/eval/runs/latest.jsonl. Feeds rag_eval/ (Python/RAGAS), which has
 * no way to get chunk ids/context/scores out of the chat route by design (see ARCHITECTURE.md).
 */
async function dumpRuns() {
  const cases = readJson<GoldenCase[]>("golden-answers.json");
  const outDir = path.join(process.cwd(), "data", "eval", "runs");
  mkdirSync(outDir, { recursive: true });
  const lines: string[] = [];

  for (const c of cases) {
    const normalized = normalizeQuery(c.question);
    const rewritten = await rewriteQuery(c.question, normalized.expanded).catch(() => null);
    const retrievalQuery = rewritten ?? normalized.expanded;
    const rerankQuery = rewritten ?? c.question;

    const retrieval = await retrieveCandidates({ ...normalized, expanded: retrievalQuery }, [c.topic]);
    const reranked = await rerankCandidates(rerankQuery, retrieval.candidates);
    const generated = await generateAnswer(rerankQuery, reranked.candidates);

    lines.push(
      JSON.stringify({
        id: c.id,
        question: c.question,
        topic: c.topic,
        groundTruthAnswer: c.groundTruthAnswer,
        relevantChunkIds: c.relevantChunkIds,
        retrievedIds: retrieval.candidates.map((cand) => cand.id),
        rerankedIds: reranked.candidates.map((cand) => cand.id),
        rerankedScored: reranked.scored,
        contexts: reranked.candidates.map((cand) => cand.content),
        answer: generated.answer,
        citations: generated.citations,
        grounded: reranked.grounded,
        degradedToKeywordOnly: retrieval.degradedToKeywordOnly,
        degradedToFusionOrder: reranked.degradedToFusionOrder,
      }),
    );
    console.log(`dumped ${c.id}`);
  }

  writeFileSync(path.join(outDir, "latest.jsonl"), lines.join("\n") + "\n");
  console.log(`Wrote ${cases.length} traces to data/eval/runs/latest.jsonl`);
  await getPool().end();
}

function missingEnvVars(): string[] {
  return ["API_BASE_URL", "API_KEY", "LLM_MODEL", "EMBEDDING_MODEL", "RERANKER_MODEL", "DATABASE_URL"].filter(
    (v) => !process.env[v],
  );
}

async function main() {
  if (process.argv.includes("--dump")) {
    const missing = missingEnvVars();
    if (missing.length) throw new Error(`Missing env vars: ${missing.join(", ")}`);
    await dumpRuns();
    return;
  }

  const missing = missingEnvVars();
  if (missing.length) {
    const stub = `# TrustTim — Eval Results

**Not yet run.** Missing env vars: ${missing.join(", ")}.

Copy \`.env.example\` to \`.env\`, fill in the FPT AI Factory key and a pgvector-enabled
\`DATABASE_URL\`, run \`npm run db:setup && npm run ingest\`, then \`npm run eval\`.
`;
    writeFileSync(path.join(process.cwd(), "RESULTS.md"), stub);
    console.log("Missing env vars — wrote a stub RESULTS.md. " + missing.join(", "));
    return;
  }

  resetUsage();
  const startedAt = Date.now();

  console.log("Running emergency eval...");
  const emergency = await evalEmergency();
  console.log("Running scope eval...");
  const scope = await evalScope();
  console.log("Running retrieval eval...");
  const retrieval = await evalRetrieval();

  const elapsedSec = (Date.now() - startedAt) / 1000;
  const usage = getUsage();
  const cost = estimateCostUsd(usage);

  const report = `# TrustTim — Eval Results

Generated ${new Date().toISOString()} by \`npm run eval\` against the held-out sets in \`data/eval/\`.

## (a) Emergency eval — the one that matters most

**Recall on \`serious\` = ${emergency.recall.toFixed(1)}%** (${emergency.seriousCaught}/${emergency.seriousTotal}).
${emergency.missedSerious.length ? `Missed cases: ${emergency.missedSerious.join(", ")} — investigate before demo.` : "No missed emergencies in this set."}

| id | message | expected | predicted | ok |
|---|---|---|---|---|
${emergency.rows.join("\n")}

## (a2) Scope eval

Accuracy (excluding the two guardrail-precedence rows below): **${scope.accuracy.toFixed(1)}%**

| id | message | expected | actual | ok |
|---|---|---|---|---|
${scope.rows.join("\n")}

## (b) Retrieval — fused recall vs. rerank precision

Fused recall@N: **${retrieval.fusedRecall.toFixed(1)}%** · Precision@k after rerank: **${retrieval.rerankPrecision.toFixed(1)}%**

| id | message | expected chunk(s) | in fused pool | in reranked top-k |
|---|---|---|---|---|
${retrieval.rows.join("\n")}

## (d) Cost & latency

- LLM calls: ${usage.calls.llm} (prompt tokens: ${usage.llmPromptTokens}, completion tokens: ${usage.llmCompletionTokens})
- Embedding calls: ${usage.calls.embedding} (tokens: ${usage.embeddingTokens})
- Rerank calls: ${usage.calls.rerank} (tokens: ${usage.rerankTokens})
- Estimated cost for this eval run: **$${cost.toFixed(4)}**
- Wall-clock time: ${elapsedSec.toFixed(1)}s across ${
    emergency.rows.length + scope.rows.length + retrieval.rows.length
  } eval turns

Projected at hospital scale (~2,500–3,000 conversations/day, 3 FPT calls/turn): see
\`hackathon_docs/guide/TrustTim_Architecture-and-Implementation-Guide.md\` §12 for the illustrative
model; this run's per-call average is the real, measured input to that projection.
`;

  writeFileSync(path.join(process.cwd(), "RESULTS.md"), report);
  console.log("Wrote RESULTS.md");
  console.log(`Emergency recall on serious: ${emergency.recall.toFixed(1)}%`);

  await getPool().end();
}

main().catch((err) => {
  console.error("eval failed:", err);
  process.exit(1);
});
