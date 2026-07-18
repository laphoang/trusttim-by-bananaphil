import { z } from "zod";
import { recordLlmUsage } from "../usage";

/**
 * FPT AI Factory gpt-oss-20b client — one OpenAI-compatible base URL + key.
 *
 * Verified against the live endpoint (the docs' claim of a wrapping {code, message, data}
 * envelope does not match reality): the response is the standard top-level OpenAI shape. We stay
 * tolerant of an optional `.data` envelope anyway in case a future account/region wraps it.
 *
 * gpt-oss-20b is a reasoning model: its chain-of-thought comes back in `message.reasoning`, and
 * `message.content` is null until reasoning finishes. A too-small max_tokens makes it hit
 * finish_reason "length" while still reasoning, leaving content permanently null — always budget
 * enough tokens for reasoning + the actual answer.
 */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface FptChatPayload {
  choices: Array<{
    index: number;
    message: { role: string; content: string | null; reasoning?: string };
    finish_reason: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export type FptChatResponse = FptChatPayload | { code: number; message: string; data: FptChatPayload };

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (res.ok) return res;
      if (res.status < 500 || attempt === MAX_RETRIES) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
  }
  throw lastError;
}

function fptHeaders(): Record<string, string> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY is not set");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** gpt-oss-20b reasoning budget — "low" for classifiers, generation can afford more. */
  reasoningEffort?: "low" | "medium" | "high";
}

/**
 * Pure unwrap + content extraction. Exported so selfcheck.ts can verify the parsing logic without
 * a live API call. Unwraps an optional `.data` envelope, then requires non-empty `message.content`
 * — a reasoning model that ran out of tokens mid-thought leaves content null, which must surface
 * as an error (never silently return "").
 */
export function extractChatContent(body: FptChatResponse): string {
  const payload: FptChatPayload = "data" in body ? body.data : body;
  const choice = payload.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content === "string" && content.trim().length > 0) {
    return content;
  }
  throw new Error(
    `gpt-oss-20b returned empty content (finish_reason=${choice?.finish_reason ?? "unknown"}) — ` +
      "likely ran out of max_tokens while reasoning; raise maxTokens.",
  );
}

function extractUsage(body: FptChatResponse) {
  const payload: FptChatPayload = "data" in body ? body.data : body;
  return payload.usage;
}

/** Plain chat completion — returns the assistant's text content. Used for generation. */
export async function chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
  const baseUrl = process.env.API_BASE_URL;
  const model = process.env.LLM_MODEL;
  if (!baseUrl || !model) throw new Error("API_BASE_URL / LLM_MODEL are not set");

  const res = await fetchWithRetry(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: fptHeaders(),
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 1,
      max_tokens: options.maxTokens ?? 1024,
      top_p: 1,
      top_k: 40,
      presence_penalty: 0,
      frequency_penalty: 0,
      stream: false,
      ...(options.reasoningEffort ? { reasoning_effort: options.reasoningEffort } : {}),
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`gpt-oss-20b chat/completions failed: HTTP ${res.status} — ${bodyText.slice(0, 500)}`);
  }

  const body = (await res.json()) as FptChatResponse;
  const content = extractChatContent(body);
  const usage = extractUsage(body);
  if (usage) recordLlmUsage(usage.prompt_tokens, usage.completion_tokens);
  return content;
}

/**
 * Strips markdown code fences a model sometimes wraps JSON in, despite "respond ONLY with JSON",
 * then falls back to slicing the first "{" to the last "}" so stray prose around the JSON (a
 * reasoning model occasionally echoes a stray word before/after) doesn't break JSON.parse.
 */
export function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return candidate.slice(start, end + 1);
    }
    return candidate;
  }
}

/**
 * Structured-output helper: calls the LLM with a system+user prompt, parses the JSON response,
 * and validates it against the given Zod schema. Throws on failure — callers decide the fail-safe
 * fallback (Architecture guide §3 step 2: a classifier error must never silently proceed).
 */
export async function chatJSON<T>(
  systemPrompt: string,
  userMessage: string,
  schema: z.ZodType<T>,
  options: ChatOptions = {},
): Promise<T> {
  const raw = await chat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    { temperature: 0.2, maxTokens: 1024, reasoningEffort: "low", ...options },
  );
  const parsed = JSON.parse(extractJson(raw));
  return schema.parse(parsed);
}
