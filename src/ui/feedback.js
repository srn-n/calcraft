// Feedback: opens the user's own mail app with a pre-filled draft to Simply Made Studio.
// Nothing is sent by the app itself,
// the user sees and can edit everything before pressing Send in their mail app.
import { toast } from './toast.js';

export const FEEDBACK_EMAIL = 'samiiiur@yahoo.com';

/**
 * Build the mailto: link. `info` is optional context that helps reproduce bugs
 * (theme, screen size, browser); it's shown in the draft so the user can delete it.
 */
export function feedbackHref(info = {}) {
  const lines = [
    'Hi,',
    '',
    '(Your feedback here: a bug, an idea, a theme you would like…)',
    '',
    '',
    '— Details to help fix bugs (delete if you prefer) —',
    info.version && `App: Bouncy Calculator ${info.version}`,
    info.theme && `Theme: ${info.theme}`,
    info.screen && `Screen: ${info.screen}`,
    info.browser && `Browser: ${info.browser}`,
  ].filter((l) => l !== undefined && l !== false && l !== null && l !== '' || l === '');
  const subject = `Bouncy Calculator feedback${info.version ? ` (v${info.version})` : ''}`;
  // RFC 6068: encode everything, line breaks as %0D%0A
  const body = lines.join('\r\n');
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Open the mail app. Browsers give no success signal for mailto:, so if the page never loses focus
 * within ~1.5 s (no mail app registered, common on desktops) we copy the address and say so.
 */
export function sendFeedback(info) {
  let left = false;
  const mark = () => { left = true; };
  window.addEventListener('blur', mark, { once: true });
  document.addEventListener('visibilitychange', mark, { once: true });

  const a = document.createElement('a');
  a.href = feedbackHref(info);
  a.rel = 'noopener';
  a.click();

  setTimeout(async () => {
    window.removeEventListener('blur', mark);
    document.removeEventListener('visibilitychange', mark);
    if (left || document.hidden) return;
    try {
      await navigator.clipboard.writeText(FEEDBACK_EMAIL);
      toast(`No mail app opened. Address copied: ${FEEDBACK_EMAIL}`, 6000);
    } catch {
      toast(`Send feedback to ${FEEDBACK_EMAIL}`, 7000);
    }
  }, 1500);
}
