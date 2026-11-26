# 2026-11-26: Submitted to Production

No code change and no version bump. This records the move from closed testing to Production.

## What happened
- **Production access:** Google granted it after the closed test (12+ testers, 14 days). Play Console
  shows "Your app has been granted Google Play production access".
- **No open testing:** it's optional and wasn't needed.
- **Production release:**
  - The release **16 (1.1.1)** was promoted from Closed testing - Alpha. It's the same signed AAB
    (`BouncyCalculator-1.1.1.aab`, SHA-256 `a633d4e7…c6c45e36`), so nothing was re-uploaded.
  - Full rollout (100%).
  - Countries and regions: all 178, the same as closed testing (177 named plus "rest of world").
- **Release notes (en-US and en-AU, launch notes for new users):**
  ```
  Welcome to Bouncy Calculator!
  • A playful calculator with bouncy keys and a live answer preview
  • 28 themes, including 5 Exclusive ones with their own sounds and characters
  • Handy tools: Tip & Split, unit converter, percentages and a bills tracker
  • Quick maths games to keep your brain sharp   (en-US: "math")
  • No ads, no accounts, and it works offline
  ```
  The listing's default language is **en-US**. Future release notes need an `<en-US>` block, as well
  as `<en-AU>` if you want it.
- **Submitted for review** on 2026-11-26. Managed publishing is off, so the app goes live
  automatically once Google approves it.

## How it was done
- Claude prepared the release in Play Console: promoted it, wrote the notes, set the countries, and
  checked there were no errors ("Ready to release").
- Samiur clicked the final **Save** and **Submit changes for review**. Play Console didn't respond to
  automated clicks on those two buttons, so expect that again next time.

## From now on
- **Every update goes to Production.** Either create the release there directly, or test it in closed
  testing first and then use **Promote release → Production**.
- **Production tester feedback:** there's no tester group in Production. Feedback comes through
  ratings and reviews. The closed-testing track can stay as an early channel.
