// "Share the app" (☰ menu → Help & about). Opens the phone's own share sheet with the Play Store link.
//  - Android app: the native share sheet via the bridge. The text is fixed on the Java side, so the
//    web page can't make the app share anything else.
//  - Browsers with the Web Share API (most phones): navigator.share.
//  - Anything else (most desktops): the link is copied (the copy helper shows "Copied <link>").

export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.simplymadestudio.bouncycalculator';
export const SHARE_TITLE = 'Bouncy Calculator';
export const SHARE_TEXT = 'Bouncy Calculator: a calculator that’s actually fun. Bouncy keys, 28 themes, handy tools and maths games. Free on Google Play:';

/** Returns how it was shared: 'native' | 'web' | 'cancelled' | 'copied'. */
export async function shareApp(copy) {
  try {
    if (window.BouncyNative?.shareApp) { window.BouncyNative.shareApp(); return 'native'; }
  } catch { /* fall through */ }
  if (navigator.share) {
    try {
      await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: PLAY_URL });
      return 'web';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled'; // the user closed the sheet
    }
  }
  await copy(PLAY_URL);
  return 'copied';
}
