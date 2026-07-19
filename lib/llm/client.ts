import { z } from "zod";
import { recordLlmUsage } from "../usage";

/**
 * OpenAI gpt-4.1-mini client — generates answers and powers structured classifiers.
 * Reads OPENAI_API_KEY (separate from FPT's API_KEY/API_BASE_URL, which stay for embeddings/rerank).
 */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResponse {
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

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

function authHeaders(): Record<string, string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * Content extraction. Exported so selfcheck.ts can verify the parsing logic without a live API call.
 * Requires non-empty `message.content` — never silently return "".
 */
export function extractChatContent(body: ChatCompletionResponse): string {
  const choice = body.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content === "string" && content.trim().length > 0) {
    return content;
  }
  throw new Error(
    `Chat API returned empty content (finish_reason=${choice?.finish_reason ?? "unknown"}). ` +
      "Raise maxTokens or check the request.",
  );
}

function extractUsage(body: ChatCompletionResponse) {
  return body.usage;
}

/** Plain chat completion — returns the assistant's text content. Used for generation. */
export async function chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
  const model = process.env.LLM_MODEL;
  if (!model) throw new Error("LLM_MODEL is not set");

  const OPENAI_BASE_URL = "https://api.openai.com/v1";
  const res = await fetchWithRetry(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 1,
      max_tokens: options.maxTokens ?? 1024,
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`OpenAI chat/completions failed: HTTP ${res.status} — ${bodyText.slice(0, 500)}`);
  }

  const body = (await res.json()) as ChatCompletionResponse;
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
    { temperature: 0.2, maxTokens: 1024, ...options },
  );
  const parsed = JSON.parse(extractJson(raw));
  return schema.parse(parsed);
}
