---
layout: art-of-ai
title: "JavaScript & Bundle Analysis"
date: 2026-05-26 10:00:00 +0200
permalink: /art-of-ai/js-bundle-analysis/
description: "The front end is the most honest documentation a target has, and it ships straight to you. How to pull endpoints, secrets, and feature flags out of a minified single-page app — and where an LLM speeds it up versus where it'll lie to you."
---

A modern web app hands you its own blueprint. The whole client is JavaScript, and the whole client downloads to your browser the moment you load the page. Every API route the app can call, every third-party key it was built with, every half-finished feature behind a flag — it's all sitting in the bundle, waiting for someone to read it. Defenders think of that bundle as the front end. Treat it as the documentation instead.

This is the most reliable recon I know, because nobody can lie to you in code that has to actually run. The marketing page can be vague; the JavaScript can't.

## Why it's worth the hour

Two reasons. First, the API surface. Most single-page apps build their requests from a central place — a generated client, a constants file, a pile of `fetch` calls. Pull that out and you've turned a black box into a labelled map: every route, the naming conventions, where the admin functions live, which endpoints take which shapes. You haven't bypassed any auth, but you now know exactly what to aim at, which is half the work.

Second, the things that fell in by accident. Keys, internal URLs, comments the minifier didn't strip, code for features that aren't live yet. The build process scoops up whatever's in scope at compile time, and a surprising amount of that was never meant to leave the building.

## Getting the source back

Minified code looks unreadable, but you're rarely actually stuck.

The lazy win is **source maps**. A lot of production builds still ship the `.map` files, or leave them one predictable path away. A source map reconstructs the original files — real names, real folder structure, sometimes comments. If they're there, you're reading the actual codebase, not the soup.

When they're not, you fall back on the **bundle itself**. Webpack and friends leave a runtime manifest that lists every chunk, so you can pull all of them, not just the one the homepage happened to load. Run the lot through a beautifier so it's at least shaped like code, and now you can grep.

That's the real workflow: collect every chunk, prettify, then search. The interesting stuff doesn't hide, it just sits in a 40,000-line file nobody scrolls through.

## What to actually hunt for

**The endpoint map.** Grep for the obvious shapes: `/api/`, `fetch(`, the HTTP client the app uses, template strings that build URLs. You're looking for the route table. Once you find how the app names things, the pattern usually gives up the rest — if you see `/api/user/profile` you can guess there's a `/api/user/settings`, and the bundle will confirm it.

**Secrets, with judgment.** You'll find keys. The trick is knowing which ones matter. A lot of client-side keys are *meant* to be public — a publishable analytics token, a maps key locked to a domain. Finding those isn't a finding. What matters is the stuff that should never have been on the client: a private token, a backend credential a developer inlined "temporarily," an internal service URL. Don't report every string that looks like a key. Work out what it actually unlocks first, and assume anything genuinely sensitive may already be rotated or a decoy until you've reasoned about it.

**Feature flags and dead code.** Client-side flags are a roadmap. The code for the unreleased feature is already shipped, gated behind a boolean. Flipping that boolean in your own browser doesn't get you past the server — the real checks live server-side, or they'd better — but it tells you what's coming, and sometimes it reveals endpoints that are already live and reachable before the UI admits they exist.

**The authorization model in plain sight.** SPAs constantly leak their own permission structure: role names, capability strings, the `isAdmin` checks the front end does before it even calls the backend. That's the shape of the authz model, handed to you. It tells you which roles exist and what they're supposed to be able to do, which is exactly what you want to know before you go testing whether the server agrees.

## Where the model earns its keep

A beautified bundle is enormous and tedious, and that's precisely the kind of reading an LLM is good at. The moves that pay off:

- Paste a chunk and ask it to **enumerate every endpoint and group them by feature**. It's fast and it's good at spotting the pattern across thousands of lines you'd skim past.
- Ask it to **trace the auth flow** — where the token comes from, where it's attached, what the login and refresh paths look like.
- Hand it a wall of minified names and ask it to **guess what a function does** from how it's used. As a hypothesis generator this is genuinely useful.

And where it'll burn you: minified code is exactly the situation where a model invents things. The variable names are gone, so it fills the gaps with plausible fiction. It will confidently describe an endpoint that doesn't exist, or misread `a.b.c()` as something it isn't. So the rule is the same as everywhere else in this work — **the model points, you confirm.** Every endpoint it "finds" gets checked against the actual file with a grep. The bundle is the truth; the model is just a fast reader with an imagination.

## The discipline

Reading a bundle produces a long list of leads, and a chunk of them are noise: dead routes from an old version, endpoints behind flags that 404, keys that turn out to be public by design. The version of your notes that's worth anything is the one where you've pruned all of that — confirmed the route resolves, worked out what the key actually does, checked the flag against reality. A map full of roads that don't exist is worse than no map.

None of this touches the target's infrastructure, which is the nice part: you're reading something they already sent you. But the same line applies as always — what you learn here is only worth acting on inside a scope you're allowed to be in.
