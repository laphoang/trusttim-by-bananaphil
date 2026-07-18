# Manual Chunking, RAG, and Semantic Retrieval Strategy: Building a Production-Grade University Admissions Chatbot

_A real-world case study from the deployment of the admissions chatbot for Yersin University of Da Lat._

> **Note:** This article is intentionally detailed. It is aimed at practitioners interested in the practical realities of building reliable AI systems beyond demo-level implementations.

## The Myth of "Just Upload the Documents"

Over the past three years, Generative AI has become increasingly accessible. Ask almost anyone how to build an AI chatbot, and you'll likely hear:

_"It's easy."_

Upload some PDFs to ChatGPT, NotebookLM, or a custom GPT. Add a prompt describing the chatbot's role and constraints. Share the chatbot. Done.

For more technical teams, there are frameworks such as LangChain, LangGraph, LangSmith, and countless others. No-code platforms like Make, n8n, and Dify make the process even more accessible.

Today, creating a chatbot is often perceived as no more complicated than launching a WordPress website.

Then I was asked to build an admissions consulting chatbot for Yersin University of Da Lat.

That's when reality began.

## The Challenge

The university provided:

- Marketing brochures in PDF format
- A 200+ page internal admissions handbook
- Documentation covering:
  - 28 undergraduate programs
  - 6 transfer programs
  - 3 graduate programs

- Text, images, explanations, procedures, and admissions policies

During peak admissions season, the chatbot would need to support between **2,000 and 4,000 conversations per day**.

The obvious question was:

> Why not simply feed everything into GPT-4 or GPT-5 and let the model handle it?

After all, modern models offer context windows ranging from hundreds of thousands to millions of tokens. Combined with automatic chunking and semantic search, shouldn't that be enough?

In practice, the answer was **no**.

## The Economics Matter

Let's assume a typical automated RAG pipeline sends approximately 50,000 tokens per interaction after retrieval, prompts, and conversation history are included.

At scale, thousands of conversations per day quickly become expensive.

More importantly, cost is only half of the problem.

The other half is reliability.

A chatbot that occasionally hallucinates admissions requirements is not merely inconvenient—it becomes a business risk.

My target was simple:

- Handle thousands of daily conversations
- Keep operational cost below $2 per day
- Deliver consistently accurate responses

Achieving all three simultaneously required a different approach.

## Start With Human Behavior, Not Documents

Before touching a single PDF, I spent time understanding how admissions consultants actually interacted with students and parents.

I reviewed conversations.

I observed recurring questions.

I studied the language people used.

The objective was not to understand the documents.

The objective was to understand the **knowledge demand distribution**.

Which questions appeared most frequently?

Which information genuinely influenced decisions?

Which parts of the documentation were never referenced?

This analysis revealed something important.

Much of the provided material had little practical value for admissions conversations.

For example:

- University history
- Vision and mission statements
- Organizational structure
- Strategic goals
- Awards and achievements

These sections looked impressive in official documents but were rarely relevant to prospective students.

Students simply do not ask about them.

After discussions with the university, we removed more than thirty pages of information from the knowledge base.

## Understanding User Intent Changes Everything

Another insight emerged quickly.

Most students already have specific fields of study in mind.

They are not looking for an AI career coach to discover their life's purpose.

Instead, they typically ask:

- Can I apply to this major?
- Which programs match my subject combination?
- What are the admission requirements?
- Which admission pathway should I use?

This observation dramatically changed how information should be structured.

Instead of treating every academic program as part of one giant interconnected knowledge graph, many topics could be segmented and handled independently.

This significantly reduced retrieval complexity.

## The Information You Need Often Doesn't Exist

One recurring question was:

> "Given my subject combination, which majors am I eligible for?"

Surprisingly, the source documents did not contain this information in a directly usable format.

The relationship existed implicitly but not explicitly.

Therefore, additional knowledge artifacts had to be created.

We built cross-reference mappings between admission combinations and academic programs.

This information was not extracted.

It was engineered.

## Converting Natural Language Into Logic

Admissions policies introduced another challenge.

The university had four admission pathways.

Each pathway contained:

- General requirements
- Program-specific requirements
- Conditional rules
- Exceptions

The original documentation described these rules across more than a page of prose.

When tested with larger models, the interpretation was often correct.

With smaller and cheaper models, accuracy became inconsistent.

The solution was not a better prompt.

The solution was to transform prose into structured logic.

Once the rules were represented explicitly, even smaller models could reason reliably.

## Language Normalization Matters

Students rarely communicate using formal language.

They use abbreviations.

They use slang.

They ask follow-up questions that depend heavily on previous context.

As a result, we introduced:

- Query normalization
- Context filtering
- Lightweight conversation memory

The goal was to preserve necessary context while minimizing token consumption.

Long conversation histories are expensive and often unnecessary.

Relevant context is far more valuable than large context.

## Manual Chunking: The Month-Long Process

For roughly a month, I reviewed conversations, studied documents, took notes, and continuously refined my understanding of the knowledge domain.

Eventually, a mental map emerged.

Not a vector index.

Not an embedding model.

A human understanding of how information should be organized.

Only then did I begin processing the source material.

The workflow was straightforward:

1. Extract content from PDFs.
2. Use OCR where necessary.
3. Rewrite ambiguous sections.
4. Remove low-value information.
5. Consolidate overlapping content.
6. Validate everything with university stakeholders.

The result was approximately:

- 300 knowledge chunks
- ~700 tokens per chunk on average
- Roughly 210,000 tokens total

A surprisingly small amount of information for such a large domain.

## Retrieval Is Not the Same as Understanding

Many RAG implementations rely heavily on semantic similarity search.

While effective, this approach often retrieves:

- Irrelevant information
- Incomplete information
- Excessive information

Instead, I preferred a multi-stage retrieval strategy.

The first stage used deterministic filtering techniques:

- Dictionaries
- Regular expressions
- Domain-specific rules
- Custom ranking logic

This stage was extremely fast and inexpensive because it operated entirely at the software layer.

Only after reducing the candidate set to a small number of highly relevant records did I involve an LLM.

At that point, even a nano model could reliably identify the correct information.

Because the candidate set was small, the model's task became classification rather than discovery.

This dramatically improved accuracy while reducing cost.

## Small Models Become Powerful When Context Is Clean

Once the correct information was identified, the final response generation stage was straightforward.

The selected knowledge snippets were combined with:

- A carefully designed system prompt
- Minimal conversation history
- A lightweight generation model

Because the context was highly curated and semantically precise, smaller models performed exceptionally well.

The key lesson is simple:

> Model intelligence is only one part of the system.

Context quality often matters more.

## What This Case Study Is—and Isn't

This is not a universal architecture.

It is not a framework.

It is not a blueprint that should be copied blindly.

It is simply one retrieval and semantic processing strategy that worked for one specific domain, one specific customer, and one specific set of requirements.

A different university would likely require a different design.

A legal chatbot would certainly require a different design.

The important takeaway is not the implementation details.

The important takeaway is the mindset:

**Understand the semantics of the domain before designing the retrieval system.**

Do not assume that generic chunking, generic embeddings, and generic retrieval strategies will automatically solve domain-specific problems.

Sometimes the highest-leverage optimization is not a larger model.

Sometimes it is simply understanding the data better than anyone else.

## Results

The chatbot has now successfully supported two consecutive admissions seasons.

It handles thousands of conversations per day while operating at approximately **$2 per day**, even at peak volume.

Not because of a sophisticated framework.

Not because of a larger model.

But because retrieval, semantics, and domain knowledge were treated as first-class engineering problems.
