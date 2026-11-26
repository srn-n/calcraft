# 2026-11-26: New Play Store screenshots

No code change and no version bump. The store listing screenshots were replaced with a new set, in
the order Samiur set in Notion (Tasks, "Up next", created first to last).

## Order (phone, 7" tablet and 10" tablet)
| # | File | Theme | Screen |
|---|---|---|---|
| 1 | `01-braun.png` | Braun ET66 | Calculator (1,248.5×12 = 14,982) |
| 2 | `02-clay-moss.png` | Clay & Moss | Calculator (19.99×4 = 79.96) |
| 3 | `03-soft.png` | Soft | Calculator (365×24 = 8,760) |
| 4 | `04-pink-pop.png` | Pink Pop (Exclusive) | Calculator (250+18% = 295) |
| 5 | `05-night-weaver.png` | Night Weaver (Exclusive) | Calculator (1,234×5 = 6,170) |
| 6 | `06-mochi-kitten.png` | Mochi Kitten (Exclusive) | Calculator (12×7 = 84) |
| 7 | `07-settings.png` | Mochi Kitten | ☰ menu: settings (10" also shows Share app) |
| 8 | `08-tools.png` | Clay & Moss | Tools → Tip & Split |

The Settings and Tools themes were Samiur's choice: each one matches a neighbouring screenshot.

## How they were made
- **Source:** captured from the real web build (`npm run build`, `vite preview`) with Playwright.
- **No mock-ups:** no captions or frames, the same style as the earlier set.
- **Phone:** a 360×720 viewport at 3×, so 1080×2160.
- **Tablets:** a desktop-style layout, with the calculator and the history tape (seeded with three
  sums):
  - 7": a 960×600 viewport at 2×, so 1920×1200
  - 10": a 1280×800 viewport at 2×, so 2560×1600
- **No errors:** none of the 24 captures logged a page error.

## Where they are
- **Phone:** `release/store/screenshots/` (in the repo) and `C:\Working Projects\CalculatorApp\store\screenshots\`.
- **Tablets:** `C:\Working Projects\CalculatorApp\store\screenshots-tablet\7in\` and `…\10in\`.
- **The old set is gone:** Braun, Cyber scientific, Liquid Glass, Nova or Mission Control, Themes, Tools,
  Make 24, Broken Keys.
- **Upload:** in Play Console, Grow users → Store presence → Main store listing → Graphics. Replace
  each set, keeping this order.
