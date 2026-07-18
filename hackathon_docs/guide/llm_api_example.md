# FPT AI Factory — Model API Examples

Reference examples for the three FPT AI Factory models used by TrustTim, all served via one OpenAI-compatible client (`mkp-api.fptcloud.com`).

## 1. bge-reranker-v2-m3

- **Link:** https://marketplace.fptcloud.com/en/models/bge-reranker-v2-m3
- **Description:** Reranker model for re-ranking retrieved documents or passages in semantic search and RAG tasks. Unlike embedding models, it takes a question and a document as input and directly outputs a similarity score, suitable for multilingual environments.
- **Context length:** 8K
- **Input tokens:** $0.022/M

**Sample request:**

```bash
curl -X POST https://mkp-api.fptcloud.com/v1/rerank \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "bge-reranker-v2-m3",
    "query": "What is the capital of the United States?",
    "documents": [
        "Carson City is the capital city of the American state of Nevada.",
        "The Commonwealth of the Northern Mariana Islands is a group of islands in the Pacific Ocean. Its capital is Saipan.",
        "Washington, D.C. is the capital of the United States.",
        "Capital punishment has existed in the United States since before it was a country."
    ],
    "top_n": 2
}'
```

**Sample response:**

```json
{
  "id": "infinity-ff5f20d7-8a75-43fa-891d-6c12c8f29983",
  "results": [
    {
      "index": 2,
      "relevance_score": 0.9996002316474915
    },
    {
      "index": 0,
      "relevance_score": 0.011777843348681927
    }
  ],
  "meta": {
    "billed_units": {
      "total_tokens": 478
    },
    "tokens": {
      "input_tokens": 478,
      "output_tokens": 0
    }
  }
}
```

## 2. vietnamese-embedding

- **Link:** https://marketplace.fptcloud.com/en/models/vietnamese-embedding
- **Description:** Embedding model fine-tuned from BGE-M3 to enhance Vietnamese retrieval capabilities. Trained on ~300K triplets of Vietnamese queries, positive documents, and negative documents. Max sequence length 2048.
- **Context length:** 8K
- **Max output:** 1K
- **Input tokens:** $0.011/M

**Sample request:**

```bash
curl -X POST https://mkp-api.fptcloud.com/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "Vietnamese_Embedding",
    "input": [
        "input 1",
        "input 2"
    ],
    "dimensions": 1024,
    "encoding_format": "float",
    "input_text_truncate": "none",
    "input_type": "passage"
}'
```

**Sample response:**

```json
{
  "object": "list",
  "model": "your-model-name",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [
        -0.026863310486078262,
        0.03624487668275833,
        "...",
        0.02825147658586502
      ]
    }
  ],
  "usage": {
    "prompt_tokens": "tokens",
    "prompt_tokens_details": null,
    "completion_tokens": "tokens",
    "completion_tokens_details": null,
    "total_tokens": "tokens"
  }
}
```

## 3. gpt-oss-20b

- **Link:** https://marketplace.fptcloud.com/en/models/gpt-oss-20b
- **Description:** 21B-parameter open-weight LLM, smaller and more efficient than gpt-oss-120b, designed for deployment in environments with fewer resources (e.g. 16–24GB VRAM). Retains strong reasoning capabilities.
- **Context length:** 128K
- **Max output:** 128K
- **Input tokens:** $0.0495/M
- **Output tokens:** $0.198/M

**Sample request:**

```bash
curl -X POST https://mkp-api.fptcloud.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "gpt-oss-20b",
    "messages": [
        {
            "role": "user",
            "content": "Can you tell me about the creation of blackholes?"
        }
    ],
    "temperature": 1,
    "max_tokens": 1024,
    "top_p": 1,
    "top_k": 40,
    "presence_penalty": 0,
    "frequency_penalty": 0,
    "stream": true
}'
```

**Sample response:**

```json
{
    "code": 200,
    "message": "Chat completion successful",
    "data": {
        "id": "chatcmpl-ef8435055e3341c596d9bc7b212fe7ee",
        "object": "chat.completion",
        "created": 1750390044,
        "model": "your-model-name",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "Hello! How can I help you today?"
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 13,
            "completion_tokens": 10,
            "total_tokens": 23
        },
        "provider": "openai"
    }
}
```
