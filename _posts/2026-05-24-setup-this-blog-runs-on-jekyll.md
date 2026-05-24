---
title: "Setup: this blog runs on Jekyll"
date: 2026-05-24 12:00:00 +0200
tags: [meta, setup]
description: "How this blog is structured — posting workflow, file layout, and the live security feed."
---

This blog is a static site built with Jekyll and hosted on GitHub Pages.
No CMS, no database, no build server — just Markdown files in a repo.

## Posting workflow

1. New file in `_posts/`, named `YYYY-MM-DD-slug.md`
2. Front matter at the top (title, date, tags, description)
3. Markdown body underneath
4. Commit & push — live in ~30 seconds

## Front matter

```yaml
---
title: "Post title"
date: 2026-05-24 12:00:00 +0200
tags: [recon, ssrf]
description: "Optional short summary."
---
```

## Live security feed

The homepage shows a live stream of recently-published advisories from the
GitHub Advisory Database. The fetch happens client-side, so every visitor
sees up-to-date data — no rebuild needed when new CVEs drop.

## Why Jekyll

GitHub Pages builds Jekyll natively. No GitHub Actions, no Node, no npm.
You push Markdown, GitHub serves HTML.
