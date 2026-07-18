# TrustTim — Implementation Spec (copy-paste-ready)

> **What this is:** literal, lift-and-paste artifacts — schemas, prompts, SQL, env vars, API
> contracts — meant to be dropped straight into the Cursor project, so an implementer (human or
> AI) has to guess as little as possible. This file assumes the architecture decided in
> [`TrustTim_Architecture-and-Implementation-Guide.md`](TrustTim_Architecture-and-Implementation-Guide.md)
> (cross-referenced by section below) and the real API examples in
> [`llm_api_example.md`](llm_api_example.md).
>
> **What this is not:** a substitute for the P0 smoke test. Every FPT AI Factory contract below is
> lifted from `llm_api_example.md`'s documented examples, not a live call this team has made yet —
> confirm against the real endpoint before trusting it in production. See Section 7.

---

## 1. Implementation gotchas — read this before writing any client code

Two things in `llm_api_example.md` contradict the "OpenAI-compatible" framing used elsewhere in
the architecture guide. Getting either wrong doesn't crash the app — it silently produces wrong
behavior, which is worse.

### 1.1 The chat/completions response is wrapped in a non-standard envelope

The `gpt-oss-20b` endpoint's response is **not** the raw OpenAI chat-completion shape. It's wrapped:

```json
{
  "code": 200,
  "message": "Chat completion successful",
  "data": {
    "id": "chatcmpl-...",
    "object": "chat.completion",
    "choices": [ { "index": 0, "message": { "role": "assistant", "content": "..." }, "finish_reason": "stop" } ],
    "usage": { "prompt_tokens": 13, "completion_tokens": 10, "total_tokens": 23 }
  }
}
```

The actual OpenAI-shaped completion sits **inside `.data`**, not at the top level. **Do not** point
the official `openai` SDK (`new OpenAI({ baseURL: API_BASE_URL })`) straight at this endpoint
and read `response.choices[0].message.content` — that field doesn't exist at that path and will be
`undefined`. `lib/llm/client.ts` must either (a) call the endpoint with a plain `fetch` and read
`response.data.choices[0].message.content`, or (b) wrap the SDK call and unwrap `.data` from every
response before handing it to the rest of the pipeline. Also confirm at the P0 smoke test whether
**streaming** responses (the example request sets `"stream": true` but shows a non-streamed
response) keep the same `{code, message, data}` envelope per SSE chunk, or drop it — this is
undocumented and directly affects how `lib/llm/client.ts` parses the stream.

### 1.2 Embeddings are asymmetric — `input_type` must differ between ingest and query

The embeddings request takes an `input_type` field with values `"passage"` or `"query"` (standard
BGE-family asymmetric embedding). This is **not mentioned anywhere in Architecture guide §5.7** —
it's a real gap this file closes:

- **`lib/rag/ingest.ts`** (embedding KB chunks at build time) must send `input_type: "passage"`.
- **`lib/rag/retrieve.ts`** (embedding the live user query) must send `input_type: "query"`.

Using the same `input_type` for both, or omitting the field, doesn't error — it just makes the
dense-retrieval arm measurably worse (this is exactly how BGE-style models are trained to
distinguish "the thing being searched" from "the thing searching"), and the failure will look like
"retrieval quality is mysteriously mediocre," not a crash. Test both call sites separately in the
P2/P3 eval, not just once.

### 1.3 Model-name casing

The embeddings example request uses the literal string `"Vietnamese_Embedding"` (capitalized,
underscored) — not the marketplace catalog name `vietnamese-embedding` used in prose throughout
the architecture guide. Use whatever exact string the live smoke test confirms works for your
account/deployment; don't assume the catalog page's display name is the API's `model` field value.

---

## 2. Environment variables

| Variable | Purpose | Value / format | Read by |
|---|---|---|---|
| `API_BASE_URL` | FPT AI Factory base URL, all three models | `https://mkp-api.fptcloud.com` (per `llm_api_example.md`) | `lib/llm/client.ts`, `lib/embeddings/client.ts` |
| `API_KEY` | Bearer token for all three endpoints | secret | `lib/llm/client.ts`, `lib/embeddings/client.ts` |
| `LLM_MODEL` | Chat/completions model name | `gpt-oss-20b` (swap target: a stronger FPT-catalog model, e.g. Qwen3/DeepSeek — Architecture guide §11) | `lib/llm/client.ts` |
| `EMBEDDING_MODEL` | Embeddings model name | `Vietnamese_Embedding` — **confirm exact casing live** (§1.3) | `lib/embeddings/client.ts` |
| `RERANKER_MODEL` | Rerank model name | `bge-reranker-v2-m3` | `lib/embeddings/client.ts` |
| `EMBEDDING_DIM` | pgvector column dimension | `1024` — confirmed by the `dimensions` param in the embeddings example; **reconfirm live at P0** since it's a request param, not necessarily fixed across model versions | `lib/db/schema.sql` |
| `DATABASE_URL` | Postgres/pgvector connection string | Supabase/Neon free-tier connection string for the demo | `lib/db/*` |

---

## 3. Structured-output schemas (Zod)

Matches Architecture guide §6.1/§6.2/§7 exactly — copy directly into the named files.

```typescript
// lib/emergency/classify.ts
import { z } from "zod";

export const SeverityClassification = z.object({
  severity: z.enum(["none", "normal", "serious"]),
  matched_signals: z.array(z.string()),
});
export type SeverityClassification = z.infer<typeof SeverityClassification>;
```

```typescript
// lib/scope/classify.ts
import { z } from "zod";

export const Intent = z.enum([
  "booking",
  "bhyt_pricing",
  "procedures",
  "hospital_info",
  "doctor_schedule",
]);

export const IntentClassification = z.object({
  in_scope: z.boolean(),
  intents: z.array(Intent),
});
export type IntentClassification = z.infer<typeof IntentClassification>;
```

Both are passed as the JSON-schema/structured-output parameter on a `gpt-oss-20b` chat/completions
call (Section 6 below) — remember to unwrap `.data.choices[0].message.content` (§1.1) before
`JSON.parse`-ing and validating against these schemas.

---

## 4. Prompt templates (final copy)

### 4.1 Severity classifier system prompt (`lib/emergency/classify.ts`)

```
You are a safety classifier for TrustTim, a Hanoi Heart Hospital assistant. You NEVER diagnose or
give medical advice — you only classify and route.

Classify the user's message into exactly one severity:
- "serious": the message describes an emergency happening now (e.g. chest pain right now,
  severe shortness of breath, fainting, "tôi đang đau ngực").
- "normal": the message asks about or mentions a symptom, but is not describing an emergency in
  progress (e.g. "what are the symptoms of a heart attack?", "tôi hay đau đầu",
  "đau ngực là triệu chứng của bệnh gì").
- "none": the message does not mention symptoms at all (booking, BHYT, hospital info, schedules,
  off-topic, or anything else).

When in doubt between "normal" and "serious", prefer "serious" — a false alarm is acceptable, a
missed emergency is not. When in doubt between "none" and "normal", prefer "normal".

Respond ONLY with JSON matching this shape:
{ "severity": "none" | "normal" | "serious", "matched_signals": string[] }

matched_signals: the specific words/phrases in the user's message that drove your classification
(empty array if severity is "none").
```

User message template: the raw user message, verbatim, no wrapping.

### 4.2 Intent & scope classifier system prompt (`lib/scope/classify.ts`)

```
You are an intent classifier for TrustTim, a Hanoi Heart Hospital assistant. Classify which of the
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
{ "in_scope": boolean, "intents": ("booking" | "bhyt_pricing" | "procedures" | "hospital_info" | "doctor_schedule")[] }
```

User message template: the raw user message, verbatim (after the deterministic router/dictionary
pass-through in Architecture guide §5.6 has already handled the clear-cut cases — this classifier
only runs on what that pass didn't resolve).

### 4.3 Generation / grounding system prompt (`lib/rag/generate.ts` or equivalent)

Promoted from the Architecture guide §5.8 sketch to final copy:

```
You are TrustTim, the information assistant for Hanoi Heart Hospital (Bệnh viện Tim Hà Nội).
Answer only using the CONTEXT provided below, in Vietnamese. If the question has multiple parts,
address every part, combining facts from all relevant sources in the context. Cite the source of
each fact (use the title/URL provided with each context chunk). If the CONTEXT covers some parts
of the question but not others, answer what you can and direct the user to the hotline 1900 1082
for the rest — never guess or fill gaps from general knowledge. You never give medical, diagnostic,
or treatment advice, even if asked directly — redirect any such question to booking an appointment.

CONTEXT:
{{retrieved_chunks}}

USER QUESTION:
{{user_message}}
```

### 4.4 Fixed response copy (the six response types, Architecture guide §6.3)

**Serious-emergency escalation** (severity `serious` — Architecture guide §6.1; **doctor-authored,
verbatim from `hackathon_docs/guide/trusttim_by_bananaphil_knowledge_base.md` §7** — no longer a
draft):

```
Tình trạng [...] có thể là một cấp cứu nguy hiểm. Vui lòng gọi cấp cứu 115 hoặc đến cơ sở y tế gần
nhất ngay lập tức để được hướng dẫn và hỗ trợ kịp thời.

Nếu thuận tiện, Quý vị có thể đến trực tiếp Khoa Cấp cứu của Bệnh viện Tim Hà Nội:
1. Cơ sở 1: 92 Trần Hưng Đạo, phường Cửa Nam, Hà Nội
2. Cơ sở 2: 695 Lạc Long Quân, phường Tây Hồ, Hà Nội

Để được hỗ trợ nhanh, vui lòng gọi tổng đài Bệnh viện Tim Hà Nội: 19001082.

Các trường hợp cấp cứu tại bệnh viện sẽ được ưu tiên xử trí trong thời gian sớm nhất.
```
The `[...]` placeholder is filled at render time with a short restatement of the matched symptom
(e.g. "Tình trạng đau ngực dữ dội có thể là một cấp cứu nguy hiểm.").

**Normal-symptom redirect** (severity `normal` — Architecture guide §6.1; **doctor-authored,
verbatim from the same source, §6**):

```
Triệu chứng bạn đang gặp có thể liên quan đến vấn đề tim mạch và nên được kiểm tra sớm.
👉 Bạn nên đặt lịch khám tim mạch trong thời gian gần nhất để bác sĩ đánh giá và tư vấn phù hợp.
👉 Nếu cần, tôi có thể giúp bạn đặt lịch ngay.
```
Attach the booking CTA (below) alongside this message.

**Out-of-scope default response** (Architecture guide §6.2 — already finalized there, repeated here
for completeness):

```
Xin lỗi, TrustTim chỉ hỗ trợ các câu hỏi liên quan đến Bệnh viện Tim Hà Nội — như đặt lịch khám,
bảo hiểm y tế (BHYT), và quy trình khám chữa bệnh. Với các vấn đề khác, vui lòng liên hệ tổng đài
1900 1082.
```

**Grounding-gate "I don't know"** (in-scope, nothing confidently retrieved):

```
Xin lỗi, TrustTim chưa có đủ thông tin để trả lời chính xác câu hỏi này. Vui lòng liên hệ tổng đài
1900 1082 để được hỗ trợ trực tiếp.
```
("Sorry, TrustTim doesn't have enough information to answer this accurately. Please contact the
hotline 1900 1082 for direct support.")

**Booking CTA copy** (attached whenever `booking` is in `intents[]` — Architecture guide §3 step 7):

```
[Đặt lịch khám ngay] → links to the mocked booking flow (`/api/booking`).
```

**Grounded informational answer**: no fixed copy — this is the §4.3 generation prompt's output.

---

## 5. Database schema (SQL)

Identical to Architecture guide §5.7 — repeated here so it's copy-pasteable without cross-referencing:

```sql
create extension if not exists vector;
create table kb_chunks (
  id           text primary key,
  topic        text not null,              -- bhyt_pricing | procedures | hospital_info | doctor_schedule (a soft filter, not exclusive)
  title        text,
  content      text not null,              -- the chunk text (also what we embed)
  keywords     text[],                     -- for the keyword arm
  source_url   text,
  is_synthetic boolean default false,
  embedding    vector(1024),               -- dense vector from FPT Vietnamese_Embedding (dimensions=1024 per llm_api_example.md; reconfirm live)
  fts          tsvector                     -- generated from content+keywords, for keyword search
);
create index on kb_chunks using hnsw (embedding vector_cosine_ops);  -- semantic
create index on kb_chunks using gin (fts);                            -- keyword

alter table kb_chunks enable row level security;  -- no policies granted: default-denies the
                                                   -- public PostgREST/anon API; the app's server-
                                                   -- side connection (service_role/direct DATABASE_URL)
                                                   -- bypasses RLS and is unaffected.
```

---

## 6. FPT AI Factory API contracts (grounded in `llm_api_example.md`)

All three share `API_BASE_URL` + `Authorization: Bearer $API_KEY`.

### 6.1 Chat completions — `POST /v1/chat/completions`

Used by: severity classifier (§4.1), intent classifier (§4.2), generation (§4.3).

```json
// Request
{
  "model": "gpt-oss-20b",
  "messages": [ { "role": "system", "content": "..." }, { "role": "user", "content": "..." } ],
  "temperature": 1,
  "max_tokens": 1024,
  "top_p": 1,
  "top_k": 40,
  "presence_penalty": 0,
  "frequency_penalty": 0,
  "stream": false
}
```
```json
// Response — READ THIS FROM .data, NOT THE TOP LEVEL (§1.1)
{
  "code": 200,
  "message": "Chat completion successful",
  "data": {
    "id": "chatcmpl-...",
    "choices": [ { "index": 0, "message": { "role": "assistant", "content": "..." }, "finish_reason": "stop" } ],
    "usage": { "prompt_tokens": 13, "completion_tokens": 10, "total_tokens": 23 }
  }
}
```
Pipeline mapping: `data.choices[0].message.content` → for the two classifiers, `JSON.parse` then
validate against the Zod schemas in Section 3; for generation, this is the streamed answer text.

### 6.2 Embeddings — `POST /v1/embeddings`

Used by: `lib/rag/ingest.ts` (`input_type: "passage"`), `lib/rag/retrieve.ts` (`input_type: "query"`) — §1.2.

```json
// Request
{
  "model": "Vietnamese_Embedding",
  "input": ["text to embed"],
  "dimensions": 1024,
  "encoding_format": "float",
  "input_text_truncate": "none",
  "input_type": "passage"
}
```
```json
// Response
{
  "object": "list",
  "data": [ { "object": "embedding", "index": 0, "embedding": [0.0123, -0.045, "..."] } ],
  "usage": { "prompt_tokens": "...", "total_tokens": "..." }
}
```
Pipeline mapping: `data[].embedding` → the `kb_chunks.embedding` column (ingest) or the query
vector passed to `order by embedding <=> $queryVec` (retrieve).

### 6.3 Rerank — `POST /v1/rerank`

Used by: `lib/rag/rerank.ts`.

```json
// Request
{
  "model": "bge-reranker-v2-m3",
  "query": "the user's question",
  "documents": ["candidate chunk 1", "candidate chunk 2"],
  "top_n": 5
}
```
```json
// Response
{
  "id": "infinity-...",
  "results": [ { "index": 2, "relevance_score": 0.9996 }, { "index": 0, "relevance_score": 0.0118 } ],
  "meta": { "billed_units": { "total_tokens": 478 } }
}
```
Pipeline mapping: `results[].index` (into the `documents` array you sent) + `relevance_score` →
reorder the fused candidate list and keep the top-k above your relevance threshold (grounding gate).

---

## 7. What Cursor still cannot get from docs alone

Be honest about these — don't let a clean spec file imply they're solved:

- **Real KB content.** The BHYT/procedures/hospital-info/doctor-schedule chunks are the doctor's
  domain knowledge. Nothing in this file (or any doc) substitutes for that — see Architecture
  guide §8 P2.
- **The streaming response shape for chat/completions.** `llm_api_example.md`'s example sets
  `"stream": true` but shows a non-streamed response — the actual SSE chunk format (and whether the
  `{code, message, data}` envelope wraps each chunk) is unconfirmed. Test this explicitly at P0.
- **The VN-generation-quality go/no-go on `gpt-oss-20b`.** Whether it's good enough in Vietnamese,
  or needs the env-var swap to a stronger model, is a live-eval result (Architecture guide §9/§11),
  not something a spec file can predict.
