# Project Pitch — TrustTim

## Project Name

### **TrustTim** — by Team BananaPhil

*"Tim"* means **heart** in Vietnamese — the hospital is literally "Bệnh viện **Tim** Hà Nội" (Hanoi **Heart** Hospital). Paired with "Trust," the name does double duty: it names the #1 judged risk in the brief (the AI must never hallucinate) and the #1 asset the team brings (a real doctor validating every answer). It's short, easy to say out loud in a pitch, and the bilingual pun lands instantly with Vietnamese judges without needing explanation.

**Full attribution for slides/submission:** *TrustTim, by Team BananaPhil.*

---

## Solution Brief

**What we're building:** A grounded, RAG-based AI customer care assistant embedded directly on the Hanoi Heart Hospital website. It answers the hospital's most common questions — appointment booking, exam/treatment procedures, BHYT insurance benefits, service pricing, doctor schedules — using *only* the hospital's official knowledge base, hands users off to real booking channels (Website, Zalo Mini App, hotline), and explicitly says "I don't know, here's who to ask" instead of guessing.

**Who it's for:** The ~2,500–3,000 outpatients and family members who show up at Hanoi Heart Hospital every single day with the same handful of questions, currently forced to wait on an overloaded hotline or queue at reception. Secondarily, it's for the hospital's customer-service staff — freeing them from repetitive FAQ traffic so they can focus on the cases that actually need a human.

**What stands out — clinical safety rigor, not just another chatbot:** Every generic team at this hackathon can wire an LLM to a FAQ document. What almost none of them can do correctly is the one requirement that actually matters most at a *cardiac* hospital: recognizing when a "question" is actually an emergency. Our emergency-detection and escalation logic — the rule that severe chest pain, shortness of breath, or fainting must *never* get a chatbot answer and must *always* trigger an immediate redirect to emergency care — is designed by a real physician on the team, not inferred by an engineer guessing at symptom lists. At a cardiac hospital, mishandling that one interaction is the single highest-stakes failure mode in the entire brief. That's the one place "just wire up an LLM" isn't safe, and it's exactly where our team has an unfair advantage.

---

## Elevator Pitch (verbal, ~20 seconds)

> "We're Team BananaPhil, and this is **TrustTim** — an AI assistant for Hanoi Heart Hospital that answers the questions 2,500 patients a day are already asking, grounded entirely in the hospital's own knowledge base so it never makes things up. But the part that matters most at a *heart* hospital is knowing when *not* to answer — when someone describes chest pain or can't breathe, TrustTim doesn't chat, it escalates immediately to emergency care. That emergency logic was designed by an actual doctor on our team, not guessed at by engineers — because at this hospital, that's the one mistake you can't afford to make."
