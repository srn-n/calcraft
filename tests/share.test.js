import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

const { shareApp, PLAY_URL } = await import('../src/ui/share.js');

describe('Share the app (1.1.0)', () => {
  beforeEach(() => { vi.stubGlobal('window', {}); vi.stubGlobal('navigator', {}); });

  it('links to the Play Store listing', () => {
    expect(PLAY_URL).toBe('https://play.google.com/store/apps/details?id=com.simplymadestudio.bouncycalculator');
  });
  it('uses the Android share sheet when the app bridge is there', async () => {
    const native = vi.fn(); window.BouncyNative = { shareApp: native };
    const copy = vi.fn();
    expect(await shareApp(copy)).toBe('native');
    expect(native).toHaveBeenCalledOnce(); expect(copy).not.toHaveBeenCalled();
  });
  it('uses the Web Share API in browsers that have it', async () => {
    navigator.share = vi.fn().mockResolvedValue();
    expect(await shareApp(vi.fn())).toBe('web');
    expect(navigator.share).toHaveBeenCalledWith(expect.objectContaining({ url: PLAY_URL }));
  });
  it('does nothing more when the user cancels the share sheet', async () => {
    navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    const copy = vi.fn();
    expect(await shareApp(copy)).toBe('cancelled'); expect(copy).not.toHaveBeenCalled();
  });
  it('copies the link everywhere else', async () => {
    const copy = vi.fn();
    expect(await shareApp(copy)).toBe('copied'); expect(copy).toHaveBeenCalledWith(PLAY_URL);
  });
  it('the Android side shares fixed text only (no page-supplied text)', () => {
    const java = readFileSync(new URL('../android/app/src/main/java/net/simplymadestudio/bouncycalculator/MainActivity.java', import.meta.url), 'utf8');
    expect(java).toMatch(/public void shareApp\(\)/);
    expect(java).toMatch(/getString\(R\.string\.share_text\)/);
    const strings = readFileSync(new URL('../android/app/src/main/res/values/strings.xml', import.meta.url), 'utf8');
    expect(strings).toContain(PLAY_URL);
  });
});
