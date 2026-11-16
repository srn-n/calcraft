# 2026-11-14: Web-to-Google-Play playbook

**Type:** docs only. No version bump; the app stays at 1.0.8 (code 13).

## Why
Samiur asked for one document explaining how Bouncy Calculator gets from the web app to Google Play
(who does what, where the keys live, how signing works), so he can repeat it in his other projects,
where he keeps getting stuck on key folders.

## What was added
- **`docs/WEB-TO-PLAY-PLAYBOOK.md`:**
  - the pipeline diagram and a who-does-what table
  - the folder layout, with why `.signing/` sits at the repo root
  - the `keystore.properties` format, the one-time setup, and every release step with commands
  - the release history so far
  - a troubleshooting table and a reusable checklist for new apps
- **`AGENTS.md`:** the repo map now points to the playbook.
