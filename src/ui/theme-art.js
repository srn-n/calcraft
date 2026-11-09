// Artwork for the four Exclusive themes: original characters by Simply Made Studio.
// Drawn as tiny inline SVGs (no image files) and applied through CSS custom properties:
//   --art-char   the character, on the = key and in the header
//   --art-op     a small motif in the corner of the operator keys
//   --art-ac     an accessory on the AC key
// The CSP allows data: images, and the properties are set through the CSSOM (no inline styles).

const S = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`;

export const ART = {
  // Nova, a little astronaut
  astro: {
    char: S(`
      <path d="M13 60q19-12 38 0v4H13z" fill="#ff7a3d" stroke="#1b2350" stroke-width="2.5" stroke-linejoin="round"/>
      <line x1="32" y1="14" x2="32" y2="6" stroke="#1b2350" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="32" cy="5.5" r="3" fill="#ffd34d" stroke="#1b2350" stroke-width="1.5"/>
      <circle cx="32" cy="34" r="20" fill="#eef2ff" stroke="#1b2350" stroke-width="2.5"/>
      <rect x="17" y="24" width="30" height="20" rx="10" fill="#1b2350"/>
      <path d="M22 29.5c2.6-2.6 6.4-3.4 9.5-2.8" stroke="#7fd4ff" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".9"/>
      <circle cx="26.5" cy="34.5" r="2.6" fill="#7fd4ff"/><circle cx="37.5" cy="34.5" r="2.6" fill="#7fd4ff"/>
      <path d="M28.5 39q3.5 2.6 7 0" stroke="#7fd4ff" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="14" cy="34" r="3" fill="#ff7a3d" stroke="#1b2350" stroke-width="2"/><circle cx="50" cy="34" r="3" fill="#ff7a3d" stroke="#1b2350" stroke-width="2"/>`),
    op: S(`<path d="M32 6c2 14 6 18 20 20-14 2-18 6-20 20-2-14-6-18-20-20 14-2 18-6 20-20z" fill="#ffd34d"/>`),
    ac: S(`
      <path d="M32 6c9 7 12 18 9 30H23c-3-12 0-23 9-30z" fill="#eef2ff" stroke="#1b2350" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="32" cy="22" r="4.5" fill="#7fd4ff" stroke="#1b2350" stroke-width="2"/>
      <path d="M23 30l-7 10h8M41 30l7 10h-8" fill="#ff7a3d" stroke="#1b2350" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M27 40q5 16 10 0" fill="#ffd34d" stroke="#ff7a3d" stroke-width="2"/>`),
  },

  // Kage, a neon ronin
  ronin: {
    char: S(`
      <path d="M17 17Q32 1 47 17Q32 9 17 17z" fill="#ffcc33" stroke="#ffcc33" stroke-width="2" stroke-linejoin="round"/>
      <path d="M12 36Q12 15 32 15Q52 15 52 36z" fill="#2a1238" stroke="#ff2e63" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M9 35h46l-4 6H13z" fill="#2a1238" stroke="#ff2e63" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M13 41l-3 13 9-6M51 41l3 13-9-6" fill="#2a1238" stroke="#ff2e63" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="20" y="40" width="24" height="19" rx="5" fill="#120818" stroke="#ff2e63" stroke-width="2.5"/>
      <path d="M23.5 46l6.5 2.4M40.5 46L34 48.4" stroke="#3cf2ff" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M26 54h12M28 57h8" stroke="#ff2e63" stroke-width="2" stroke-linecap="round"/>
      <circle cx="32" cy="27" r="3" fill="#ff2e63"/>`),
    op: S(`<path d="M10 54L50 12" stroke="#ff2e63" stroke-width="5" stroke-linecap="round"/><path d="M10 54L50 12" stroke="#ffd1dc" stroke-width="1.6" stroke-linecap="round"/><path d="M14 44l6 6" stroke="#ffcc33" stroke-width="4" stroke-linecap="round"/>`),
    ac: S(`<circle cx="32" cy="32" r="22" fill="#ff2e63"/><circle cx="32" cy="32" r="17" fill="none" stroke="#120818" stroke-width="2.5"/><path d="M25 24h14M32 24v16M25 33h14M26 41l6-4 6 4" stroke="#120818" stroke-width="3" stroke-linecap="round" fill="none"/>`),
  },

  // Starla, a pop star with heart shades
  pinkpop: {
    char: S(`
      <path d="M32.0 9.0 L39.6 25.5 L57.7 27.7 L44.4 40.0 L47.9 57.8 L32.0 49.0 L16.1 57.8 L19.6 40.0 L6.3 27.7 L24.4 25.5Z" fill="#ff8cc0" stroke="#ff8cc0" stroke-width="6" stroke-linejoin="round"/>
      <path d="M32.0 9.0 L39.6 25.5 L57.7 27.7 L44.4 40.0 L47.9 57.8 L32.0 49.0 L16.1 57.8 L19.6 40.0 L6.3 27.7 L24.4 25.5Z" fill="#ff8cc0" stroke="#8a1f55" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M24 31.5c-2.4-2.6-6.4-.8-5.6 2.4.6 2.4 5.6 5.6 5.6 5.6s5-3.2 5.6-5.6c.8-3.2-3.2-5-5.6-2.4zM40 31.5c-2.4-2.6-6.4-.8-5.6 2.4.6 2.4 5.6 5.6 5.6 5.6s5-3.2 5.6-5.6c.8-3.2-3.2-5-5.6-2.4z" fill="#3a1030"/>
      <path d="M29.6 33.4h4.8" stroke="#3a1030" stroke-width="2"/>
      <path d="M27.5 43.5q4.5 3.6 9 0" stroke="#8a1f55" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <circle cx="21" cy="43" r="2.4" fill="#ff4f9a" opacity=".7"/><circle cx="43" cy="43" r="2.4" fill="#ff4f9a" opacity=".7"/>
      <path d="M32 9l-7-4.5v9zM32 9l7-4.5v9z" fill="#b0175e" stroke="#8a1f55" stroke-width="1.4" stroke-linejoin="round"/><circle cx="32" cy="9" r="2.2" fill="#ffd1e6"/>`),
    op: S(`<path d="M32 8c1.6 11 5 14.4 16 16-11 1.6-14.4 5-16 16-1.6-11-5-14.4-16-16 11-1.6 14.4-5 16-16z" fill="#ff4f9a"/><circle cx="50" cy="46" r="4" fill="#ffb3d4"/>`),
    ac: S(`<path d="M32 52S10 38 10 23.5C10 15 20 10 26.5 16.5L32 22l5.5-5.5C44 10 54 15 54 23.5 54 38 32 52 32 52z" fill="#fff0f6" stroke="#b0175e" stroke-width="3" stroke-linejoin="round"/>`),
  },

  // Mochi, a sleepy kitten
  kitten: {
    char: S(`
      <path d="M13 28L15 8l14 11M51 28L49 8 35 19" fill="#fff4e6" stroke="#4a3226" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M17.5 21l1-8 6.5 5M46.5 21l-1-8-6.5 5" fill="#f7b3c2"/>
      <ellipse cx="32" cy="36" rx="22" ry="19" fill="#fff4e6" stroke="#4a3226" stroke-width="2.5"/>
      <path d="M21 34q3.5-3.4 7 0M36 34q3.5-3.4 7 0" stroke="#4a3226" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M30 39.5h4l-2 2.4z" fill="#f29fb0" stroke="#f29fb0" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M32 42v2.2M32 44.2q-2.6 2.4-5 .4M32 44.2q2.6 2.4 5 .4" stroke="#4a3226" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M8 38l10 1M8 43l10-1M56 38l-10 1M56 43l-10-1" stroke="#4a3226" stroke-width="1.6" stroke-linecap="round"/>
      <ellipse cx="20" cy="41.5" rx="3.2" ry="2" fill="#f7b3c2" opacity=".8"/><ellipse cx="44" cy="41.5" rx="3.2" ry="2" fill="#f7b3c2" opacity=".8"/>`),
    op: S(`<ellipse cx="32" cy="40" rx="12" ry="10" fill="#f29fb0"/><circle cx="17" cy="25" r="5.4" fill="#f29fb0"/><circle cx="27" cy="17" r="5.4" fill="#f29fb0"/><circle cx="37" cy="17" r="5.4" fill="#f29fb0"/><circle cx="47" cy="25" r="5.4" fill="#f29fb0"/>`),
    ac: S(`<circle cx="30" cy="34" r="18" fill="#ffb38a" stroke="#4a3226" stroke-width="2.5"/><path d="M14 30q16 6 32-6M16 42q14-2 26-16M24 17q10 10 6 34" stroke="#4a3226" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M46 46q6 4 10 0" stroke="#4a3226" stroke-width="2.5" fill="none" stroke-linecap="round"/>`),
  },
};

const url = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}")`;

/** Apply (or clear) a theme's character art on the document. */
export function applyArt(themeId) {
  const st = document.documentElement.style;
  const a = ART[themeId];
  for (const k of ['char', 'op', 'ac']) {
    if (a) st.setProperty(`--art-${k}`, url(a[k]));
    else st.removeProperty(`--art-${k}`);
  }
  document.documentElement.toggleAttribute('data-exclusive', !!a);
}

/** Data-URL of a theme's character (for the picker preview), or ''. */
export const charUrl = (themeId) => (ART[themeId] ? url(ART[themeId].char) : '');
