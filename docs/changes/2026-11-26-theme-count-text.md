# 2026-11-26: "24 themes" → "28 themes" in the copy

No code change and no version bump. The app has had 28 themes since 1.0.3 (23 Classic, 5 Exclusive),
but a few texts still said 24.

## Changed
- **`index.html`:** the page's meta description, which search results and link previews show.
- **`README.md`:** the intro line and the test count were already fixed in `e707542`. This change
  fixes the last one, the key-sizing note ("in all 28 themes").
- **`release/store/LISTING.md`:** the short description now matches the one used on Play:
  "Maths, but make it bouncy. 28 themes, live answers and games on the keypad." (76/80).
- **Play Console short description:** it said "24 themes". The new text was typed in, and Samiur saves
  and sends it, because Play Console's final buttons are his.

## Left as is
`docs/AUDIT-2026-10.md` says "24 themes". That was true when the audit was written.

## Checks
161 tests pass. `npm run build` passes, including the CSP check: the meta description isn't part of
the hashed inline script.
