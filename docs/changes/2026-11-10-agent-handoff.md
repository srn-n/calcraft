# 2026-11-10: Agent hand-off files

**Type:** docs only. No version bump; the app is unchanged at 1.0.5 (code 10).

## Why
Samiur wants any AI agent (Codex or Claude) to be able to pick the project up cold, and every
future update to leave a Markdown record behind.

## What was added
- **`AGENTS.md`** (repo root): the full project context. Codex reads this file automatically. It
  covers:
  - house rules, product and surfaces, stack and commands
  - repo map, architecture and the security model
  - the release, signing and Play Console steps
  - gotchas, current state and release history
- **`CLAUDE.md`**: a pointer to `AGENTS.md` with the key rules, so Claude sessions follow the same
  source.
- **`docs/releases/_TEMPLATE.md`**: the required shape of every release record (previous-release
  summary, changes, checks, files, Play notes, tester email).
- **`docs/changes/`**: the home for records of changes that don't bump the version (like this one).
- **`docs/PROJECT-NOTES.md`**: now points to `AGENTS.md` and states the Markdown-record rule.

## Rule going forward
Every update leaves a record and refreshes `AGENTS.md` §9 (Current state) and §10 (Release history).
App changes write `docs/releases/<version>.md`; other changes write
`docs/changes/YYYY-MM-DD-<topic>.md`.
