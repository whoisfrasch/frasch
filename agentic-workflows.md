---
layout: art-of-ai
title: "Agentic Workflows"
date: 2026-06-09 10:00:00 +0200
permalink: /art-of-ai/agentic-workflows/
description: "Moving from copy-paste chat to a model that holds the tools itself — runs the commands, reads the output, decides the next step. Where the loop earns its keep, where it runs off a cliff, and how to keep a hand on it."
tags: [ai, agentic, tooling, methodology]
---

Everywhere else in this collection the model is a thing you talk to. You paste in a bundle, it reads it back to you; you hand it the CT logs, it tells you what it sees. You're the one running the tools and carrying the output across. The agentic version removes that middle step: the model holds the tools itself. It proposes an action, something runs it, the result comes back, and it decides what to do next — without you ferrying every line by hand.

That sounds like a bigger leap than it is. The hype around it certainly thinks so. The "autonomous pentest agent" demos — point it at a box, walk away, come back to a report — are mostly theatre, and the ones that aren't theatre are running against deliberately soft targets in a lab. That's not the value, and chasing it is how you end up with a tool that's impressive in a video and useless on an engagement.

The actual value is duller and far more useful: it takes the loop you already run by hand — look at output, decide the next command, run it, look again — and removes the copy-paste tax on every turn of it. You're not replacing your judgment. You're letting the model drive the parts of the loop that don't need you, and getting out of the typing.

Everything below assumes you have permission. This matters more here than anywhere else in this collection, and the next section is about why.

---

## The blast radius changed

In every other piece here, the worst a wrong answer does is waste your time. The model invents a CVE, you chase it, you find nothing, you move on. The cost lands on you, later, and you catch it because you verify.

An agentic setup breaks that safety margin. The model isn't advising an action anymore — it's *taking* one. A hallucinated command doesn't sit in a chat window waiting for you to notice; it runs. Against scope. Before you've read it. The gap between "the model is wrong" and "the wrong thing happened" collapses to nothing.

So the authorization question stops being paperwork and becomes operational. Every tool you expose is a thing the model can *do* to the target, and the model has no concept of your rules of engagement, your scope boundaries, or which subnet is explicitly out of bounds. It will cheerfully run an aggressive scan against an IP that turns out to be a third party's, because the IP looked in-range and the task said "enumerate the network." That's not the model being reckless. That's you handing it a loaded tool without a safety.

The discipline that follows from this is the spine of the whole approach: **constrain what it can do before you worry about what it can decide.** A model with read-only tools and a tight allowlist can be wrong all day and the worst outcome is noise in your own notes. A model with a shell and your operator credentials is a different category of risk entirely. Most of the engineering here is about staying firmly in the first category and only stepping into the second deliberately, with both hands on it.

---

## Start where it can't hurt anything

The safe place to begin, and where most of the real value lives anyway, is read-only tooling. Give the model tools that *observe* and nothing that *touches*: querying CT logs, resolving DNS, reading WHOIS and ASN data, parsing files you've already pulled down, searching a corpus you collected earlier. The whole passive surface from the recon piece, except now the model drives the queries instead of you pasting results in one at a time.

In that sandbox the loop is genuinely good, because the failure mode is harmless. The model decides to check a subdomain's history, the tool returns it, the model notices something and pivots to the next query — and if it goes down a pointless path, you've lost a few API calls and nothing else. No packet hit the target. There's no version of this that burns scope, because none of these tools can.

This is also where you learn how a given model behaves in a loop before you trust it with anything sharper. Watch how it handles a tool returning nothing. Watch whether it repeats a failed query or adapts. Watch whether it knows when it's done or keeps going for the sake of going. You want that behavioural read in the harmless sandbox, not the first time it's holding something that can do damage.

---

## The harness is the product, not the model

This is the part the demos skip, and it's the part that actually matters. Whether an agentic setup is useful or dangerous has very little to do with which model you picked and almost everything to do with the harness around it: what tools you expose, how tightly you've scoped them, and where you've forced it to stop and ask.

A few principles that hold up:

**Expose narrow tools, not broad ones.** "Run any shell command" is not a tool, it's an abdication. A tool that takes a domain and returns its DNS records is a tool. The narrower the action, the smaller the space of things that can go wrong, and the easier it is to reason about what the model is actually able to do. Every capability you add is attack surface against your own engagement.

**Allowlist the targets, not just the actions.** The tool that resolves DNS should refuse a domain that isn't in scope, at the tool level, before the model's intent matters at all. Don't rely on the prompt to keep the model inside the lines — the prompt is a suggestion, the allowlist is a wall. Scope enforcement belongs in the harness, where the model can't reason its way around it.

**Make irreversible actions require a human.** Anything that sends a payload, writes to the target, or can't be cleanly undone gets a gate: the model proposes it, you approve it, then it runs. This is the single highest-leverage control you have. It keeps the model autonomous for the ninety percent that's safe and puts you back in the loop for the ten percent that isn't.

**Log every tool call, in full.** Not the model's summary of what it did — the actual calls, with arguments and raw output. When something goes wrong, and it will, the transcript is the only thing that tells you what really happened versus what the model says happened. It's also your audit trail for the client, and on a real engagement that's not optional.

The standard plumbing for this now is a tool protocol like MCP, which gives you a clean way to define those narrow tools and hand them to the model. But the protocol is just the wiring. The judgment is in what you choose to wire up, and far more importantly, what you choose to leave out.

---

## Where the loop earns its keep

Strip away the hype and there's a real, specific set of jobs where letting the model drive is plainly better than doing it by hand:

**Multi-step enumeration where each step depends on the last.** You resolve a domain, that gives you a range, the range gives you live hosts, the hosts give you services, the services tell you where to look next. None of those steps is hard, but stringing forty of them together by hand is an afternoon of mechanical work. The model holds the thread across the whole chain and only surfaces the parts that need you.

**Triage pipelines over large output.** Point it at the output of a tool that produced eight hundred results and have it read, group, and rank — the same narrowing-in-passes move from the recon piece, except it runs the intermediate tool calls itself instead of you copy-pasting between stages.

**Correlation across tools that don't talk to each other.** Your DNS data, your CT results, your port scan, your file corpus — all separate outputs in separate formats. The model can pull a thread that runs through all of them in one pass, which is exactly the cross-source correlation that's most valuable and most tedious by hand.

The pattern across all three: the work is real but it's *connective*, the kind of thing where the bottleneck was never thinking, it was the typing and the tab-switching between steps. That's the sweet spot. The further you get from "tedious glue between steps you already understand" and the closer to "make a judgment call that matters," the less you want the loop running unattended.

---

## Where it runs off a cliff

The failure modes here are different from the rest of the collection, because the model isn't just producing a wrong sentence — it's producing a wrong sentence and then acting on it.

**It loops.** A tool returns an error, the model tries the same thing again, gets the same error, tries again. Without a stop condition it'll happily burn a hundred calls repeating a failure, narrating progress the whole time. You need turn limits and you need to be watching, especially early.

**It fixates.** It latches onto an early hypothesis and spends the next twenty steps confirming it, ignoring the output that should have killed it three steps ago. A human analyst gets a gut feeling that they're on the wrong path. The model doesn't, unless the harness makes it stop and re-evaluate.

**It "finishes" by fabricating.** This is the dangerous one. Asked for a result it can't actually get, a model under pressure to complete the task will sometimes produce a plausible one — a finding that reads right and isn't real, assembled to close the loop. In a chat you'd catch it on review. In an autonomous run it can be three actions downstream before you look, with later steps built on the invented result.

**It's noisy.** Left to optimise for "get the answer," a model will reach for the fast, loud tool over the patient, quiet one. It doesn't know that getting caught is a failure state unless you've told the harness that, and a model that doesn't understand stealth will trample a careful engagement in the name of efficiency.

None of these are reasons not to use the loop. They're reasons the loop runs on a leash — turn limits, stop conditions, a human gate on anything that bites, and you watching the transcript rather than walking away.

---

## The discipline

It comes out the same place it does everywhere else in this collection, just with higher stakes: **the model's plan is a hypothesis, and every action it takes is something you remain accountable for.**

Concretely, that means you read the transcript — not the model's tidy summary at the end, the actual sequence of tool calls and raw results. It means the read-only loop runs freely and the sharp tools stay behind a gate. It means turn limits and scope allowlists are set before the run, not bolted on after it surprises you. And it means that when the model hands you a finding, it's a lead to confirm against your own sources, exactly as it would be if it had come out of a chat window — the autonomy doesn't earn it any extra trust.

The convenience is real, and that's precisely the risk. The whole point of the loop is that you stop watching every step, and the failure mode is that you stop watching the steps that mattered. Keep the gate where it belongs and the loop is a genuine multiplier on the tedious, connective work. Take the gate off because it's been fine for a while, and the first time it isn't fine, it'll be fine right up until it's a packet you can't take back.

Used as a fast operator on a short leash, running the parts of the loop that don't need you, it's the biggest single time-saver in this entire collection. Used as something you point at a target and trust, it's a liability with your name on the engagement. Pick the first one.

---

*Authorized engagements only. Nothing here is permission to touch systems you don't have the right to touch — and an autonomous tool makes that line easier to cross by accident, which is your responsibility to prevent, not the model's.*

*Further reading: [OWASP's Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/), in particular its treatment of Excessive Agency, and the [Model Context Protocol](https://modelcontextprotocol.io) specification for the standard way to define and scope the tools you hand a model.*
