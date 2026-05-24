---
layout: post
title: "The Art of AI Recon"
date: 2026-05-24 10:00:00 +0200
permalink: /art-of-ai/
description: "A field guide to using agentic models like Claude as a force multiplier for reconnaissance and security research — what they are genuinely good at, where they hallucinate, and how to stay fast, accurate, and in scope."
---

# Thesis

An LLM is not a hacker — it's the fastest junior analyst you've ever had:
encyclopedic, tireless, and prone to stating fiction with total confidence.
As an oracle it wastes your time and pollutes triage queues. As a force
multiplier with a human in the loop, it changes what one researcher covers in
an afternoon. This guide is the second mode — a methodology for folding
agentic models (Claude in particular) into real recon, built on the rigorous
parts of the public literature and honest about the rest.

**Authorized testing only**: a scope you're inside, a system you own, a signed
engagement. AI makes scaling activity trivial — which cuts both ways.

---

## What changed, and what didn't

**Changed:** the unit of work moved from "a model that answers" to "an agent
that runs tools, reads output, and picks the next step." One loop now chains
subdomain enumeration → live-host probing → crawling → fingerprinting →
templated scanning → summary, with the model sequencing it instead of you
copy-pasting between terminals.

**Didn't:** the bottleneck was never *generating* candidate findings — it's
*validating* them. AI makes the easy half faster and leaves the hard half
exactly as hard. The bug bounty economy is now drowning in AI noise
(duplicates, confidently-wrong "findings," triage teams pulling back). The
durable skill isn't prompting; it's judgment — what to trust, verify, discard.

---

## A mental model: where LLMs earn their keep

Anchor: *On the Surprising Efficacy of LLMs for Penetration-Testing* (arXiv,
2025).

**Why it works.** Pentesting is largely pattern matching against a
homogeneous target population — the models' core strength. Enterprise networks
are more uniform than they feel (90%+ of the Fortune 1000 run Active
Directory), so the model's broad prior is a real head start. Off-the-shelf
models carry enough security knowledge to operate without a bolted-on RAG
corpus.

Tasks where AI consistently pays off:

- **Breadth-first synthesis** — cluster subdomains/ASN/headers/CT hits, flag
  outliers, infer tech stacks.
- **Reading code you didn't write** — source-to-sink taint tracing across an
  unfamiliar repo; semantic grep that catches what regex misses.
- **JavaScript archaeology** — endpoints, params, feature flags, leaked refs
  out of minified bundles.
- **Drafting artifacts** — verified notes → clean write-up with repro steps
  and a severity rationale.

## …and where they will burn you

Same paper, the failure modes — quantified:

- **Non-determinism.** "The same LLM-driven prototype will find different
  attack chains within the same testbed across multiple runs." One eval:
  vulns surfaced in **8 of 100** runs. A single pass proves nothing — no
  finding ≠ no bug.
- **Hallucination by default.** Invents endpoints, cites non-existent CVEs,
  describes exploits that don't fire. Some inventions are useful hypotheses;
  you only learn which by testing.
- **Prompt fragility.** Trivial changes — even formatting — caused up to
  **40% variance** in performance.
- **Scope slippage.** Some evaluated models "ignored those instructions and
  attacked systems explicitly forbidden from being targeted." Enforce scope
  *outside* the model.

Throughline: **AI is a hypothesis generator, not an evidence generator.**
Every actionable claim is a lead to verify by hand, not a result to report.

---

## The pipeline

A workflow that survives contact with reality looks like this:

```text
Recon  →  Enrich  →  Hypothesize  →  VALIDATE  →  Report
  │         │            │              │            │
 tools    model        model         HUMAN        model
         clusters     proposes      confirms      drafts
                      leads       (the gate)
```

The model assists at four of the five stages. The fourth stage — validation —
is the one stage where the human is non-negotiable and the model's output is
treated as a suspect, not a witness.

### 1. Recon — let the agent drive the tools

Highest-leverage stage. Use an agent with real tools (via a tool runtime /
MCP-style integration), not a chatbot you paste into: wire it to the standard
kit — subdomain enumeration, `httpx`-style probing, crawler, fingerprinting,
template scanner — and let it sequence and react.

- **Pin scope outside the prompt.** Allowlist domains and rate-limit at the
  *tool layer*, not in instructions the model can rationalize around. The
  sandbox enforces the rules, not the system prompt.
- **Bound the loop.** Stop conditions + a budget. Agentic loops wander, and
  tokens and request quotas aren't free.

### 2. Enrich — noise into a map

Feed raw enumeration back; ask for structure, not conclusions:

> Here are 600 subdomains with their HTTP status, title, and `Server`
> header. Group them by apparent tech stack. Flag anything that looks like
> staging, admin, internal tooling, or a forgotten legacy app. Do not guess
> at vulnerabilities yet — just organize and tell me what's unusual.

The last sentence matters: it keeps the model on synthesis (its strength) and
off inventing bugs (its weakness).

### 3. Hypothesize — ranked leads, with reasoning

Now ask what's worth a closer look. Demand the *reasoning* — it's what you
check:

> For the five hosts you flagged, give me a testable hypothesis for each:
> what the weakness might be, what evidence would confirm or refute it, and
> the single cheapest check to run first. Mark your confidence and say what
> would make you wrong.

### 4. Validate — the gate

Stages above produce leads; this one produces facts, and it's yours. Reproduce
by hand: endpoint exists, parameter behaves, payload fires. Can't reproduce it
deterministically → not a finding, just a deleted line. This single discipline
separates a researcher from a noise generator.

### 5. Report — the one place to let it write

On a *verified* finding the model excels: summary, numbered repro, impact
framed for the recipient, a CVSS rationale you sanity-check. Feed it confirmed
facts only; it invents zero technical details here.

---

## Recon now includes AI surfaces

The inversion to absorb: targets increasingly *contain* LLMs — chatbots,
"ask our docs" boxes, agentic features, RAG pipelines. That's attack surface
with its own methodology and taxonomy.

### PortSwigger's three-step method

The Web Security Academy reduces LLM testing to a loop:

1. **Identify the LLM's inputs** — both direct (the prompt/chat box) and
   indirect (data it ingests: documents, web pages, emails, uploads).
2. **Work out what data and APIs the LLM can reach.**
3. **Probe that attack surface.**

Memorize two definitions. **Indirect prompt injection**: the malicious
instruction rides in on content the model reads — e.g. a hidden prompt on a
page that makes the LLM hand the *user* an XSS payload. **Excessive agency**:
"an LLM has access to APIs that can access sensitive information and can be
persuaded to use those APIs unsafely." Most real LLM bugs are a flavor of
these two.

### OWASP LLM Top 10 as a checklist

Canonical taxonomy (2025) — run it against any AI feature you find:

| ID | Risk |
|----|------|
| LLM01 | Prompt Injection (direct + indirect) |
| LLM02 | Sensitive Information Disclosure |
| LLM03 | Supply Chain |
| LLM04 | Data and Model Poisoning |
| LLM05 | Improper Output Handling |
| LLM06 | Excessive Agency |
| LLM07 | System Prompt Leakage |
| LLM08 | Vector and Embedding Weaknesses |
| LLM09 | Misinformation |
| LLM10 | Unbounded Consumption |

Prompt injection holds #1 for the second edition running; the center of
gravity moved from chat-box "jailbreaks" to **indirect** injection and
cross-modal attacks — exactly what shows up when an agent reads
attacker-influenced data.

### Defenses (= your report's remediation section)

- Treat every API the LLM can reach as **publicly exposed** — enforce authn/z.
- **Don't feed the model sensitive data** it doesn't strictly need.
- **Never rely on prompting as a control.** Guardrails in the system prompt
  are bypassable; defenses must live in the architecture.

---

## Ethics, scope, and not being part of the problem

AI removes the friction that capped one person's output. That makes these
load-bearing, not optional:

- **Authorization is the whole game.** Stay in written scope; the model's
  eagerness isn't consent.
- **Enforce scope mechanically.** Allowlists + rate limits at the tool layer —
  the model itself sometimes ignores "do not touch X."
- **Validate before you submit.** Unverified output is how triage queues
  broke. Send ten real bugs, not a hundred hallucinated ones.
- **Disclose responsibly.** Minimize impact, use the proper channel, don't
  exfiltrate or pivot beyond what confirms the issue.

AI scales your output *and* your mistakes. Aim it at validation, not just
generation — that's the difference between faster and noise.

---

## Appendix: prompt patterns that hold up

Reusable shapes that consistently produce checkable output:

- **Organize, don't conclude:** *"Cluster and flag the unusual — do not
  propose vulnerabilities yet."* Keeps the model on synthesis.
- **Force falsifiability:** *"For each lead, state what evidence would prove
  you wrong and the cheapest check to run first."* Turns guesses into tests.
- **Demand confidence + reasoning:** *"Rate your confidence and show the
  reasoning"* — so you know where to aim your skepticism.
- **Constrain the report:** *"Use only the confirmed facts I gave you. Invent
  no endpoints, parameters, or CVEs."* The single most important sentence at
  write-up time.

---

## Sources & further reading

- [OWASP Top 10 for LLM Applications (2025)](https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf) — the canonical risk taxonomy.
- [PortSwigger Web Security Academy — Web LLM attacks](https://portswigger.net/web-security/llm-attacks) — methodology, definitions, and free hands-on labs.
- [On the Surprising Efficacy of LLMs for Penetration-Testing (arXiv, 2025)](https://arxiv.org/html/2507.00829v1) — strengths, and the reliability/hallucination data cited above.

*Authorized testing only. Nothing here is an invitation to touch systems you
don't have permission to touch.*
