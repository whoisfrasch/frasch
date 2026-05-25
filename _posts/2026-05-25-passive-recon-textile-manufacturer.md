---
title: "Three Criticals Without Sending a Single Payload"
date: 2026-05-25 12:00:00 +0200
description: "What the public internet already says about a publicly traded textile manufacturer with around half a billion dollars in revenue, if you read it carefully. Three critical issues, no exploitation required."
---

# The setup

The target was a publicly traded textile manufacturer. Big company: roughly half a billion dollars in annual revenue, the kind of firm with shareholders, an investor-relations page, and a supply chain that spans continents. Exactly the sort of organization you'd expect to have its external security squared away.

I never touched their infrastructure. Everything here came from data they already broadcast to the world: DNS, certificate transparency logs, the headers a server hands back to anyone who asks, a bit of OSINT. The whole thing was an exercise in reading, not poking.

That sounds limiting. It isn't. By the time I was done I had three critical issues, a fistful of high-severity ones, and a clear enough picture of their internal mail setup to feel uncomfortable on their behalf, and none of it took an exploit.

---

# Mapping the surface

The first hour is just collection. Subdomains from CT logs, historical DNS, mail records, the autodiscover endpoints, whatever the public internet already knows. A picture came together fast, and the interesting thing was how *split* it was.

Three worlds, really:

- The **corporate website**, a WordPress install sitting behind an OpenResty reverse proxy in front of Apache. Self-hosted, on their own IP, no CDN in front of it.
- The **e-commerce shop**, on a completely different setup: Shopify, behind Cloudflare.
- The **mail system**, an on-premises Microsoft Exchange 2019 server, publicly reachable, fronted by a cloud email gateway.

Hold onto the contrast between the first two. It turns out to be the whole story in miniature.

---

# Critical #1: the REST API trusted everyone

WordPress ships a REST API at `/wp-json/`. On a healthy install, cross-origin requests to it are either blocked or tightly scoped. On this one, the API reflected *any* origin you presented back in the `Access-Control-Allow-Origin` header, and paired it with `Access-Control-Allow-Credentials: true`.

If you've not run into this combination before, here's why it's a big deal in the abstract. CORS is the browser's rule that a script on site A can't read responses from site B unless site B says it's okay. "Reflect any origin" means site B says yes to everyone. Add "allow credentials" and the victim's browser will attach their logged-in cookies to those cross-origin requests *and* let the attacker's script read the response. Generically, the bad shape looks like this:

```
Origin: https://anything-you-want.example
→ Access-Control-Allow-Origin: https://anything-you-want.example
→ Access-Control-Allow-Credentials: true
```

Even the literal string `null` was honored as an origin, which is its own classic foot-gun.

So the realistic scenario: an administrator is logged into the WordPress backend in one tab. They visit a malicious page in another, maybe from a phishing link, maybe a poisoned ad. Script on that page makes credentialed requests to the REST API, reads back the admin's account details and the nonces the API hands out, and from there can drive authenticated write actions. The exposed API surface here was not small, hundreds of routes across the core plus a stack of plugins, including endpoints that touch things like site configuration, backups, and plugin installation. The path from "admin opened the wrong tab" to "attacker is writing to the server" was short.

The fix is boring and well understood: don't reflect arbitrary origins, keep an allowlist, and don't send `Allow-Credentials: true` to anyone who isn't explicitly trusted.

---

# Critical #2: a mail server frozen in time

The Exchange server was the part that genuinely worried me.

You can fingerprint an Exchange build precisely without authenticating, because it volunteers its version in response headers on the autodiscover and web endpoints. This one was running a build from the previous summer, several cumulative security updates behind. More to the point, Exchange 2019 had already reached **end of mainstream support** months earlier. Unless the organization is paying for the extended-security-update program, a server in that state simply stops getting fixes, while remaining a permanent, internet-facing target.

It got worse the longer I looked. The headers also leaked the **internal front-end server's hostname**, the kind of detail that's gold for anyone trying to map the internal network after a foothold. And the full spread of Exchange services was reachable from the public internet, the admin control panel, web services, MAPI, autodiscover, ActiveSync, the RPC proxy, and more. One of those endpoints still accepted Basic authentication, meaning credentials in effectively cleartext inside the TLS tunnel, which is exactly what you want if you're spraying passwords.

Stack it up: a public, end-of-support mail server, months of missing patches, the exact version advertised so an attacker can cherry-pick known issues that already have public fixes, the internal hostname handed over for free, and a wide menu of services to knock on. For a company this size, with this much riding on email, that's a critical waiting for someone with more intent than me.

---

# Critical #3 / High: email anyone could forge

The third problem was the easiest to confirm, because it lives entirely in DNS.

Three things were off in the email-authentication setup:

- **DMARC was set to `p=none`.** That means the domain monitors spoofing but does nothing about it. Forged mail gets logged, then delivered anyway. (Worth a small aside: my first-pass notes wrongly said DMARC was missing entirely. Re-checking before reporting showed a record *was* there, just toothless. Verify before you write it down, every time, more on that habit below.)
- **SPF ended in `~all`** (softfail) rather than `-all` (hardfail), so unauthorized senders get a shrug instead of a rejection.
- The **SPF record listed private, internal IP addresses.** Those do nothing for public mail authentication, but they happily leak a chunk of the internal network's addressing scheme to anyone who runs a DNS query.

Put the first two together and you get a domain that's straightforward to spoof. For a listed company, the obvious abuse is business email compromise: a message that really looks like it's from the CFO, sent to someone in finance, asking for a wire. At half-a-billion-dollar scale, one convincing forged email is a serious financial-fraud vector, and none of the usual technical guardrails were switched on to stop it.

There was also no MTA-STS, so there's no enforcement that mail to the domain travels over TLS, opening the door to transport downgrade.

---

# The supporting cast

A few more things that didn't crack "critical" on their own but round out the picture:

- **Dangling DNS.** Two subdomains still pointed at a long-dead Skype-for-Business cloud service that was retired years ago. Stale records like that are a recurring source of subdomain-takeover risk, and at minimum they're untended.
- **No security headers on the corporate site.** None of the usual suspects, no `Content-Security-Policy`, no `X-Frame-Options`, no HSTS. Clickjacking and XSS amplification both get easier when nothing's set.
- **An old WordPress core and bundled jQuery from the early 2010s.** Outdated, missing years of hardening, with a couple of plugins whose versions I couldn't confidently pin.
- **Public corporate documents** discoverable through the REST API, plus an unauthenticated plugin endpoint cheerfully answering `OK` to anyone who asked.

---

# Where it gets scary is when you stack it

Individually, each of these is a finding. The reason a report like this lands as "critical" rather than "a list of mediums" is that they chain.

- The CORS flaw plus the sprawling authenticated API surface is a route from a phished admin to server-side changes.
- The unpatched, end-of-support Exchange plus the leaked internal hostname plus the wide-open service set is a textbook path from external foothold toward the internal network and, in a hybrid setup, potentially the cloud tenant beyond it.
- The spoofable email is the social-engineering delivery mechanism that makes the first two *start*. No DMARC enforcement is how the admin gets the phishing mail that kicks off chain one.

You don't need all of them to fire. You need the attacker to be patient and the defender to be unlucky once.

---

# The detail that says it all

Here's the part I keep coming back to. The same company ran two web properties side by side. The Shopify storefront, behind Cloudflare, had its security headers set correctly, a real WAF in front of it, the works. The corporate WordPress site, on its own infrastructure, had none of that.

Same org, same budget, wildly different security posture, decided entirely by which platform happened to host which thing. The managed, outsourced property was buttoned up by default. The self-hosted one quietly rotted. That gap is where most real-world risk actually lives, not in exotic zero-days, but in the forgotten corner that nobody owns anymore.

---

# A note on method

Two habits did most of the work here, and neither is technical wizardry.

The first is **just reading carefully.** Every finding above came from data the company publishes to the world: DNS, certificate logs, response headers, OSINT. The skill isn't access, it's noticing. A version number in a header. A private IP where it doesn't belong. A CNAME pointing at a service that shut down in 2021.

The second is **verifying before you write it down.** My raw notes had at least one confidently-wrong claim in them, the DMARC mix-up. This kind of reading produces a lot of plausible-looking conclusions, and a chunk of them fall apart on a second look. The version that leaves your desk is the one where every concrete claim has been checked twice. A report full of false positives wastes the defender's time and burns your credibility, and credibility is the only currency you've got in this work.

---

# What it adds up to

The lesson isn't really about any one company. It's that a large, well-resourced organization can be mapped to its soft underbelly using nothing but the data it already broadcasts, and that the weak point is almost never the flashy thing. It's the WordPress box nobody migrated, the mail server nobody patched, and the DNS record nobody cleaned up.

For the record, the findings went to the right people through a proper channel and the details stay out of public view until they're fixed, which is why this account is anonymized. Beyond that: read carefully, verify twice, and aim it somewhere you're allowed to.
