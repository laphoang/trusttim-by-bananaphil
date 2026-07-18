import { z } from "zod";
import { recordLlmUsage } from "../usage";

/**
 * FPT AI Factory gpt-oss-20b client — one OpenAI-compatible base URL + key.
 * The chat/completions response is wrapped in a non-standard {code, message, data} envelope
 * (Implementation Spec §1.1) — never read response.choices directly, always response.data.choices.
 */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface FptChatResponse {
  code: number;
  message: string;
  data: {
    id: string;
    choices: Array<{
      index: number;
      message: { role: string; content: string };
      finish_reason: string;
    }>;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };
}

const TIMEOUT_MS = 15_000;
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
    }),
  });

  if (!res.ok) {
    throw new Error(`gpt-oss-20b chat/completions failed: HTTP ${res.status}`);
  }

  const body = (await res.json()) as FptChatResponse;
  const content = extractChatContent(body);
  if (body.data?.usage) {
    recordLlmUsage(body.data.usage.prompt_tokens, body.data.usage.completion_tokens);
  }
  return content;
}

/** Strips markdown code fences a model sometimes wraps JSON in, despite "respond ONLY with JSON". */
export function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : raw).trim();
}

/**
 * Pure unwrap of the non-standard {code, message, data} envelope (Implementation Spec §1.1).
 * Exported so selfcheck.ts can verify the parsing logic without a live API call.
 */
export function extractChatContent(body: FptChatResponse): string {
  const content = body.data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("gpt-oss-20b response missing data.choices[0].message.content");
  }
  return content;
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
    { temperature: 0.2, maxTokens: 512, ...options },
  );
  const parsed = JSON.parse(extractJson(raw));
  return schema.parse(parsed);
}
