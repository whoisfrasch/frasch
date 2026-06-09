---
title: "Competence Isn't Coverage"
date: 2026-05-25 15:00:00 +0200
description: "A look at a company that was genuinely good at security — and leaked anyway, through the edges its competence never reached. Names, numbers, and specifics are stripped on purpose; the pattern is the point."
tags: [recon, osint, attack-surface]
---

# The interesting kind of target

Most write-ups are about someone who did everything wrong. This one's the opposite, which is why it's worth telling.

The company here was *good*. Properly good. The main website had a real content-security-policy, sensible headers, a WAF in front of it. The customer-facing app enforced multi-factor auth with TOTP, phones, and backup codes. The obvious holes were closed: directory listing off, user enumeration blocked, the legacy WordPress XML-RPC endpoint returning 403, secrets management that mostly worked. If you graded the front door, they'd pass.

And they leaked anyway. Not because they were careless, but because security competence is not the same as security *coverage*. A team can be excellent and still leave a dozen side gates open, because nobody owns the side gates. That gap is the whole story, and it's a gap that exists at almost every sophisticated org I've looked at.

Everything below is deliberately abstract. No company, no names, no addresses, no IPs, no secrets. The point isn't who this was. The point is that the same handful of blind spots show up everywhere, and a strong team is no protection against them.

---

# The open-source trapdoor

The company published a lot of open source. Dozens of repositories, real projects, genuinely useful code with stars and followers. Engineering-led places do this, and it's good for them. It's also a trapdoor.

When you open-source a project, you don't just publish the code. You publish everything that ever rode along with it, forever, in the git history.

Three things fell out of those repos, none of which anyone meant to ship:

**Secrets in config.** A hardcoded password sitting in a container build file. Configuration that turned off TLS verification "for local dev" and got committed. The kind of line that's invisible during a code review because everyone's looking at the logic, not the constants. It's in a public repo now, and it's in the history even if you delete it.

**Internal geography in test files.** Test code is where people are most relaxed, and it's full of real internal hostnames, service URLs, the address of an internal source-control server that was never meant to be public knowledge. Nobody sanitizes their tests. The tests narrate the internal network.

**A staff directory nobody published.** This is the one people forget. Every git commit is signed with a name and an email. Pull the commit history across a company's public repos and you reconstruct an org chart: who works there, what team they're on (inferred from which projects they touch), what their email format is. Two dozen employees, mapped, from metadata alone. No scraping, no LinkedIn, just `git log`.

The lesson isn't "don't open-source." It's that the moment a repo goes public, its entire history is intelligence, and almost nobody audits the history before flipping the switch.

---

# The app hands you the map

The customer-facing product was a modern single-page app. Slick, well-built, locked down at runtime.

Here's the thing about single-page apps: the entire client is JavaScript, and the entire client ships to the browser. Which means the *complete list of API endpoints the app can call* is sitting in the bundle, readable by anyone willing to pretty-print it. Authentication routes, MFA setup, organization and permission management, the data and reporting endpoints, an AI chat endpoint — well over a hundred of them, fully enumerated, before you've sent a single unusual request.

None of those endpoints were "open." They wanted auth. But knowing the entire shape of an API — every route, every naming pattern, where the admin functions live, where the permission checks are — is an enormous head start. You've turned a black box into a labelled diagram. Defenders think of the bundle as the front end. Attackers read it as the documentation.

---

# The forgotten edges

This is where a competent org bleeds, because these are the things that aren't anyone's job.

**Non-production left in production.** Staging environments, preview deployments, a build for every pull request — all live, all reachable, several of them carrying the same configuration as the real thing. The security team hardens production. Nobody decided who hardens the environment that exists for six hours to test a branch and then never gets torn down.

**Old protocols still answering.** Down in the network ranges, services that predate everyone's current threat model were still listening. Plaintext file transfer. Network-management protocol on infrastructure gear, the kind that hands over a topology map if it's running default settings. These aren't exploited so much as inherited — they've been on since before the current team arrived, and turning things off is scarier than leaving them.

**The sibling domain with no seatbelt.** The primary domain had its email authentication mostly in order. A secondary, related domain — same company, used by a real business unit — had *none*. No sender policy, no spoofing protection at all. An attacker doesn't target the hardened domain; they spoof the forgotten sibling and email the same employees. The main gate is reinforced steel. The gate next to it is a curtain.

---

# The CMS that over-shares

Even the buttoned-up main site had a soft underbelly: a content management system that exposed more through its API than anyone intended. Draft and unpublished content readable before it was ever meant to go live. Internal page structure, document libraries, and a pile of PDFs sitting at guessable paths. Individually trivial. Collectively, a tour of what the organization is working on and how it's structured internally.

---

# Why this matters more than a single bug

If you'd handed this company a checklist, they'd have aced it. CSP: yes. MFA: yes. WAF: yes. Patching on the main assets: mostly yes. The failures weren't on the checklist, because the failures live in the spaces *between* the things people own:

- The repo was the dev team's, but its git history was nobody's.
- Production was the security team's, but the preview environment was nobody's.
- The main domain was watched, but the sibling domain was nobody's.
- The app's runtime was hardened, but its shipped bundle was nobody's.

None of these are exotic. Every one of them is a known class of problem with a known fix. They persist because they fall into ownership gaps, and ownership gaps don't show up in a pen-test scope or a compliance audit. They show up when someone sits down and reads everything you've quietly made public, then asks who's responsible for each piece — and the honest answer, too often, is no one.

---

# A note on method

The work was reading and correlating, not breaking. The most valuable findings came from places defenders don't think of as "exposed": commit metadata, a JavaScript bundle, a test file, a forgotten subdomain. The skill is noticing, and then — this part matters — checking. A first pass produces plenty of confident nonsense; the version worth acting on is the one where every concrete claim survived a second look. Anything that didn't, got cut.

This account got cut harder than most. I've stripped every name, number, address, and secret, because the company isn't the lesson. The lesson is that being good at security buys you a strong front door and absolutely nothing on the sides. If you run a sophisticated shop, the uncomfortable exercise is to go find the things that are nobody's job — the public repo's history, the preview deploy, the sibling domain, the bundle you ship to every visitor — and ask who's watching them. Probably no one. That's where you'll be read from.
