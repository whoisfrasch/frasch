---
layout: art-of-ai
title: "AI-Assisted Reconnaissance"
date: 2026-05-24 10:00:00 +0200
permalink: /art-of-ai/
description: "How I actually use Claude for red team reconnaissance — not for generating nmap commands, but for the slow, judgment-heavy intelligence work that eats days of an engagement."
---

Most of the writing about "AI for offensive security" is junk. It's people getting a model to spit out an `nmap` one-liner, wrapping a scanner in an API call, or building a chatbot that talks like a hacker in a movie. That's cargo cult. It looks like sophistication and delivers nothing you couldn't do faster yourself.

The actual value is somewhere else entirely, and it's less flashy. A language model is good at the part of recon nobody enjoys: reading thousands of fragments and telling you which three matter. Correlating sources that don't obviously connect. Reading between the lines of a careers page. Turning a pile of incoherent OSINT into a target picture you can act on. Using a frontier model to generate payloads is like taking a Ferrari to the corner store.

Everything below assumes you have permission. Authorized adversary simulation, a signed scope, rules of engagement. The model doesn't care whether you're allowed to be there, so that part is on you.

---

## Treat it like an analyst, not an oracle

The mental shift that makes all of this work: the model is a fast, well-read junior analyst who occasionally makes things up with a straight face. It's excellent at synthesis across a large pile of data and pattern recognition you'd otherwise do by hand for a day. It is not a source of truth. Anything concrete it hands you, a CVE number, an internal team name, an endpoint, is a hypothesis until you've checked it yourself.

Hold that line and the rest of this falls into place.

---

## OSINT correlation is the whole game

If you take one technique from this page, take this one. The single highest-value thing a model does in recon is cross-reference sources that are individually boring.

You've got a LinkedIn employee export. A list of GitHub repos with contributors. DNS history. Marketing copy. A breach corpus. Some archived blog posts. None of it is interesting on its own. The signal lives at the intersections: the person who shows up in the breach dump *and* has commit access to an infra repo. The AWS account ID that appears in both an S3 bucket policy and a security advisory. Finding those by hand takes days of tab-switching. A model does it in one pass.

Give it the sources as clearly separated tables and ask for three things: who appears across multiple sources, where the sources contradict each other, and where the timing is odd (someone active in one place but silent in another during the same window). Then add the sentence that does most of the work:

```text
Do not invent connections. If a correlation is uncertain, say so and tell
me exactly what data would confirm or rule it out. Flag anything you're
guessing at.
```

That "do not invent" line is load-bearing. Leave it out and you get correlations that read beautifully and are completely fabricated. What you want out the other end is a hypothesis document, not a conclusion. You verify it.

---

## Pretext development that doesn't read like a scam

Phishing works on psychology, not technical tricks. The whole job is sounding like you belong. "Write me a phishing email pretending to be IT" gives you the same generic garbage every spam filter already knows, because the model has no context to ground it.

So you build the context first. Before you ask for a single line of copy, you feed it:

- The company: industry, size, location.
- What's actually happened lately. Five to ten real items from the last 90 days, press releases, a product launch, an exec change, an acquisition, a regulatory filing. Things a real internal email would plausibly reference.
- How they talk internally. Vocabulary pulled from job posts and public docs, ticket number formats, email signature conventions, the specific words they use for things.
- Who you're writing as, and who's receiving it. Role, department, seniority.

Then ask for a few variants, each with the reasoning behind it and an honest note on how each one could fail.

Two things I've learned doing this. First, when the model refuses, it's almost never something you fix by jailbreaking. You fix it by stating the authorization plainly: authorized engagement, defined scope, rules of engagement. Keep the operational stuff (how you're delivering, your infrastructure) out of the conversation entirely. It doesn't need to know and it shouldn't.

Second, model output is too clean. Real email from a busy person has typos, weird capitalization, a line break in the wrong place, the "Sent from my iPhone" residue. After it drafts something, tell it: *make this read like it was banged out on a phone by someone who normally writes three-word replies.* The realism jumps.

---

## Squeeze the passive data before you touch the target

Every active probe is a chance to get caught. So the move is to wring as much as possible out of data that doesn't touch the target's infrastructure at all: certificate transparency logs, DNS history, ASN and IP allocation, BGP data, whatever Shodan and Censys already saw, public cloud assets, TLS fingerprints.

Hand the model the CT logs and DNS state and ask it to look for the patterns that take a human all afternoon to spot. Naming that smells like internal tooling someone exposed by accident. Bursts of subdomain creation that line up with a product launch or an acquisition. Services that show up in old CT entries but don't resolve anymore. Wildcard cert scopes that hint at an internal naming scheme nobody mapped.

This is pattern recognition over a corpus that's too big to eyeball. The model gives you the read in seconds; checking any single claim is still quick.

---

## Personnel intelligence

Profiling people is grinding, miserable manual work. LinkedIn fights you, scrapers break, job titles mean different things at different companies, and three people share the same name. The model takes a real bite out of this in three ways.

**Org structure.** LinkedIn gives you a flat list of titles and zero reporting lines. Feed it the employee list with tenure and past roles and it'll infer a plausible hierarchy from that company's specific title conventions and how long people have been around. Plausible, not confirmed, but it's a map where you had none.

**Who actually matters.** Tell it the objective, say access to payroll, and have it rank people by likely access based on title, history, tenure, tools they've mentioned publicly, talks they've given about internal systems. Make it justify each one, and make it tell you *what would have to be true for this person not to have that access.* That second instruction is what keeps it honest instead of confidently overreaching.

**How a target writes.** Pull a specific person's public writing, blog posts, conference talks, podcast transcripts, the occasional Slack screenshot, and have the model characterize their style: sentence length, vocabulary, how formal they are, their habitual typos, how they sign off. That profile is gold for a pretext aimed at the people who report to them.

---

## Job postings are the cheat code

This one's underrated and I don't fully understand why. Job descriptions are written by hiring managers who need to attract people who actually know the stack, so they tell the truth about it. Exact framework versions. The CI/CD they run. Which cloud and which services. Internal team names. Their monitoring and security tooling. Vendor relationships, spelled out.

Throw 40 to 80 postings at the model and ask for structured extraction: technology, version, category, how often it shows up across postings, how recent the mention is, whether it sounds load-bearing or experimental, and which team or product it's attached to. While it's in there, pull internal team names, project codenames, and any reference to legacy or deprecated systems, those last ones point straight at technical debt.

You come out with a technology inventory and rough confidence levels, built entirely from public job ads, without touching a single piece of their infrastructure.

---

## Document and metadata mining

Internal docs leak constantly. Cached pages, SlideShare uploads, conference decks, PDFs an employee posted without thinking. There's intelligence in there but it's tedious to pull out by hand. Have the model extract the structured stuff: system and product names, named people and their roles, how processes work, vendors and their products, what's current versus deprecated, obvious redactions or missing slides, even template names that hint at the corporate tooling behind the document. Tell it to flag anything that looks stale, a five-year-old deck is a different kind of evidence than last quarter's.

Metadata is a separate pass. Pull it with `exiftool` the normal way, then feed it to the model to correlate against everything else you've gathered. EXIF from photos, Office document properties, usernames baked into files, build server paths. Those connect dots.

---

## The model is part of your attack surface now

Here's the part people skip. The moment you paste client data into someone else's AI product, that data is a liability you no longer fully control.

Some rules I don't break:

- Real client data never goes into a consumer-grade AI product, no matter how nice the privacy policy reads. You have no audit trail and no real control, and you can breach an engagement contract regardless of what the provider promises.
- Know your provider's data tier. An enterprise agreement with retention limits and training opt-out is a different thing from the consumer tier, and the difference matters when it's someone else's network on the line.
- Be paranoid about what counts as sensitive. It's not just credentials and dumps. Subdomain lists, employee names, org details, anything target-specific a third party could correlate.

How I split it in practice: frontier models for general analysis and pretext drafting on non-sensitive context, and a self-hosted model (Llama 3.3 70B, Qwen 2.5, DeepSeek, whatever runs) when the input involves the real target. You give up some capability and you keep control. And the operational details, C2, delivery infrastructure, operator IPs, never go into any model, hosted or not.

---

## Prompt patterns that actually hold up

After enough engagements, a few habits separate useful output from noise.

**Feed it structure.** Convert tool output to CSV or JSON before you paste it. It forces you to be specific about which fields matter and makes the result trivial to pipe into the next stage. This helps more than you'd expect given these things are supposedly built for prose.

**Forbid generic answers out loud.** Ask "what should I look for?" and you get a recycled OWASP list. Instead: *don't give me generic categories. I want hypotheses from this specific combination of technologies in this context. Throw out anything that would apply to any company running a normal stack.* That one instruction changes the output more than any other.

**Score confidence on every concrete claim.** Make it tag factual claims HIGH (worth betting on), MEDIUM (verify), or LOW (informed guess). CVE numbers, versions, defaults, named bugs. It complies more readily than you'd think, and it makes the hallucinations visible instead of hidden in fluent prose.

**Narrow in passes.** Categorize 800 subdomains by function, then dig into the interesting category, then dig into one architecture inside that. Each pass shrinks the search space. It's also just how a real analyst works.

What to avoid: the role-play opener ("you are an elite operator") gives you screenplay dialogue instead of analysis and makes everything worse. And if you find yourself repeatedly trying to jailbreak it, that's usually a sign you're asking for the wrong thing. Rephrase toward the analytical need and the resistance tends to disappear.

---

## What a two-week external recon actually looks like

To make it concrete, here's roughly how an engagement runs.

**Days 1–2, collection, no AI yet.** Everything in parallel: subdomain enumeration, CT logs, DNS history, ASN data, cloud assets, 18 months of job postings, LinkedIn, public GitHub, six months of news and press, SEC and patent filings. It all gets structured and saved locally. The model sees none of it yet.

**Day 3, first pass.** Feed it the subdomain and CT data, get back a categorized attack surface, roughly 30 prioritized subdomains with reasons. Separately, feed the job postings and get a technology inventory. Verify a sample of each and save them as artifacts.

**Days 4–5, people.** Feed the employee dataset with the objective, get a ranked list of high-value individuals. For the top five, collect writing samples and profile each one's style. Cross-check everyone against the breach corpus.

**Day 6, infrastructure.** For the priority subdomains, gather passive HTTP metadata, feed it alongside the tech inventory, and ask for a specific architecture hypothesis per subdomain. Check it against the stack you inferred from the job posts for consistency.

**Day 7, pretexts.** Pull the last 90 days of corporate comms and the top persona profiles, generate a few pretext variants per target, run them through the realism passes.

**Days 8–10, verify and prep.** The model fades out. This is operator work: confirm findings, register domains, stand up tracking and delivery.

**Days 11–14, execution.** Live phase. The model is out of it entirely.

**After, reporting.** It comes back to help with structure and prose, working only from your notes. It never sees the operational details, and every finding traces back to something you verified, not something it claimed.

Notice the shape: AI front-loads the slow analytical work, then gets out of the way the moment things go live.

---

## Where it lies to you

The stakes on a bad fact are higher here than in most contexts. Acting on something the model invented means tripping detection, burning a pretext with "internal vocabulary" that doesn't exist, chasing the wrong infrastructure, or handing a client a finding that isn't real. Any of those costs you.

The things it fabricates most reliably:

- **CVE numbers.** Perfectly formatted, completely invented. Check NVD or the vendor.
- **Default credentials.** Often outdated or made up. Check the vendor docs.
- **Specific exploits.** "This version has unauth RCE via parameter Y" is sometimes real training data and sometimes pure invention, and it won't tell you which.
- **Company-specific facts.** Team names, exec roles, product details, especially anything past the training cutoff.
- **URLs and endpoints.** "Admin panel at `/admin/internal/console`" might be pattern-matched from similar systems or just invented to sound right.

There's no prompt that fixes this. The fix is a discipline: treat every concrete fact as a hypothesis until you've confirmed it from your own sources. The model generates leads. Your sources are the truth. The confidence scoring helps you see the guesses; it doesn't make them go away.

That's the whole philosophy, really. Used as an analyst whose work you check, a model makes you genuinely faster at the slow parts of recon. Used as an oracle, it makes you confidently wrong. Pick the first one.

---

*Authorized engagements only. Nothing here is permission to touch systems you don't have the right to touch.*

*Further reading: the [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/) and [PortSwigger's Web LLM attacks](https://portswigger.net/web-security/llm-attacks) for when the target itself runs an LLM, and the arXiv study [On the Surprising Efficacy of LLMs for Penetration-Testing](https://arxiv.org/html/2507.00829v1) for the data behind the reliability caveats.*
