// Signature sound sets for the five Exclusive themes. Pure Web Audio synthesis, no audio files.
//
// Each character has its own instrument and scale, so the number keys play a little tune as you
// type (digit 0-9 picks a note), plus its own sounds for operators, AC, =, errors and a short
// jingle when you switch to the theme.
//   Nova    space radio boops with an echo, a launch arpeggio on =
//   Kage    koto plucks in the Japanese "in" scale, a sword ring on =
//   Weaver  web "thwip" sweeps and a minor scale, a full thwip-and-land on =
//   Starla  glockenspiel bells, a sparkle "ta-da" on =
//   Mochi   soft marimba, paw pats, a little "mew" on = and a purr

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];   // major pentatonic, two octaves
const IN    = [0, 1, 5, 7, 8, 12, 13, 17, 19, 20];   // Japanese in scale
const MINOR = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];  // minor pentatonic
const hz = (root, semi) => root * 2 ** (semi / 12);
const digit = (d) => (/^[0-9]$/.test(String(d)) ? Number(d) : 5);

let noiseBuf = null;
function noiseBuffer(a) {
  if (!noiseBuf || noiseBuf.sampleRate !== a.sampleRate) {
    const len = Math.floor(a.sampleRate * 0.6);
    noiseBuf = a.createBuffer(1, len, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

const echoes = new WeakMap();
/** A shared, gentle echo (one per output) for the space and pop sounds. */
function echo(a, out) {
  let e = echoes.get(out);
  if (!e) {
    const input = a.createGain(), delay = a.createDelay(1), fb = a.createGain(), wet = a.createGain(), lp = a.createBiquadFilter();
    delay.delayTime.value = 0.17; fb.gain.value = 0.32; wet.gain.value = 0.35; lp.type = 'lowpass'; lp.frequency.value = 3200;
    input.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(wet); wet.connect(out);
    e = input; echoes.set(out, e);
  }
  return e;
}

/** One tone with an attack/decay envelope, optional pitch glide, vibrato and low-pass. */
function tone(a, out, { type = 'sine', f, f1, t, dur, g, atk = 0.004, vib = 0, vibHz = 6, lp = 0, glide = dur }) {
  const o = a.createOscillator(), env = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + glide);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(g, t + atk);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (vib) {
    const l = a.createOscillator(), lg = a.createGain();
    l.frequency.value = vibHz; lg.gain.value = vib;
    l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + 0.05);
  }
  if (lp) { const f2 = a.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp; node.connect(f2); node = f2; }
  node.connect(env).connect(out);
  o.start(t); o.stop(t + dur + 0.05);
}

/** Filtered noise with a frequency sweep: whooshes, thwips, clicks, purrs. */
function hiss(a, out, { t, dur, g, f = 2000, f1, q = 1, type = 'bandpass', atk = 0.003, am = 0 }) {
  const n = a.createBufferSource(), flt = a.createBiquadFilter(), env = a.createGain();
  n.buffer = noiseBuffer(a);
  flt.type = type; flt.Q.value = q;
  flt.frequency.setValueAtTime(f, t);
  if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(g, t + atk);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = env;
  if (am) { // amplitude wobble (a purr)
    const trem = a.createGain(), l = a.createOscillator(), lg = a.createGain();
    trem.gain.value = 0.5; l.frequency.value = am; lg.gain.value = 0.5;
    l.connect(lg).connect(trem.gain); l.start(t); l.stop(t + dur + 0.05);
    env.connect(trem); node = trem;
  }
  n.connect(flt).connect(env);
  node.connect(out);
  n.start(t, Math.random() * 0.3); n.stop(t + dur + 0.05);
}

/** Glockenspiel-ish bell: a pure tone plus two quick, slightly inharmonic overtones. */
function bell(a, out, f, t, g, dur = 0.5) {
  tone(a, out, { f, t, dur, g });
  tone(a, out, { f: f * 2.76, t, dur: dur * 0.35, g: g * 0.35 });
  tone(a, out, { f: f * 5.4, t, dur: dur * 0.15, g: g * 0.15 });
}

/** Soft marimba: warm fundamental, a short 4x overtone for the wooden attack. */
function marimba(a, out, f, t, g, dur = 0.26) {
  tone(a, out, { f, t, dur, g, lp: 3000 });
  tone(a, out, { f: f * 4, t, dur: 0.05, g: g * 0.3 });
}

/** Koto pluck: bright, quickly darkening string. */
function koto(a, out, f, t, g, dur = 0.42) {
  tone(a, out, { type: 'triangle', f, t, dur, g, atk: 0.002 });
  const o = a.createOscillator(), flt = a.createBiquadFilter(), env = a.createGain();
  o.type = 'sawtooth'; o.frequency.value = f;
  flt.type = 'lowpass'; flt.frequency.setValueAtTime(4200, t); flt.frequency.exponentialRampToValueAtTime(500, t + dur * 0.6);
  env.gain.setValueAtTime(g * 0.35, t); env.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.7);
  o.connect(flt).connect(env).connect(out); o.start(t); o.stop(t + dur);
  hiss(a, out, { t, dur: 0.012, g: g * 0.5, f: 5000, q: 0.8 });
}

/** Mochi's "mew": a pitch that rises then falls, with a little vibrato. */
function mew(a, out, t, g, base = 700) {
  const o = a.createOscillator(), flt = a.createBiquadFilter(), env = a.createGain(), l = a.createOscillator(), lg = a.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(base, t);
  o.frequency.exponentialRampToValueAtTime(base * 1.6, t + 0.12);
  o.frequency.exponentialRampToValueAtTime(base * 1.1, t + 0.32);
  l.frequency.value = 7; lg.gain.value = 18; l.connect(lg).connect(o.frequency);
  flt.type = 'bandpass'; flt.frequency.value = 1500; flt.Q.value = 0.9;
  env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(g, t + 0.03); env.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
  o.connect(flt).connect(env).connect(out);
  o.start(t); l.start(t); o.stop(t + 0.4); l.stop(t + 0.4);
}

// kind: num (detail = the digit), op, ac, eq, win, error, theme
export const SIGNATURE = {
  astro: {
    num: (a, o, t, d) => { const f = hz(880, PENTA[digit(d)]); tone(a, o, { f: f * 0.8, f1: f, glide: 0.03, t, dur: 0.11, g: 0.07 }); tone(a, echo(a, o), { f, t, dur: 0.1, g: 0.03 }); },
    op: (a, o, t) => { tone(a, o, { f: 520, f1: 820, t, dur: 0.08, g: 0.06 }); hiss(a, o, { t, dur: 0.05, g: 0.015, f: 6000, type: 'highpass' }); },
    ac: (a, o, t) => { hiss(a, o, { t, dur: 0.28, g: 0.05, f: 3200, f1: 300, q: 1.4 }); tone(a, o, { f: 170, f1: 90, t, dur: 0.25, g: 0.06 }); },
    eq: (a, o, t) => { [523, 659, 784, 1047].forEach((f, i) => { tone(a, o, { f, t: t + i * 0.06, dur: 0.22, g: 0.055 }); tone(a, echo(a, o), { f, t: t + i * 0.06, dur: 0.18, g: 0.025 }); }); bell(a, o, 2093, t + 0.26, 0.03); },
    error: (a, o, t) => { tone(a, o, { f: 440, t, dur: 0.14, g: 0.06, vib: 12 }); tone(a, o, { f: 330, f1: 300, t: t + 0.15, dur: 0.22, g: 0.06, vib: 12 }); },
    theme: (a, o, t) => {
      hiss(a, o, { t, dur: 0.18, g: 0.03, f: 2500, q: 0.6, am: 40 });               // radio crackle
      tone(a, o, { f: 1320, t: t + 0.16, dur: 0.07, g: 0.05 }); tone(a, o, { f: 990, t: t + 0.25, dur: 0.07, g: 0.05 }); // beep-boop
      hiss(a, o, { t: t + 0.3, dur: 0.5, g: 0.04, f: 200, f1: 5000, q: 1.2 });       // lift-off
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(a, echo(a, o), { f, t: t + 0.42 + i * 0.07, dur: 0.25, g: 0.045 }));
    },
  },

  ronin: {
    num: (a, o, t, d) => koto(a, o, hz(293.66, IN[digit(d)]), t, 0.08),
    op: (a, o, t) => { tone(a, o, { type: 'triangle', f: 900, f1: 600, t, dur: 0.04, g: 0.08 }); hiss(a, o, { t, dur: 0.03, g: 0.04, f: 2200, q: 2 }); },
    ac: (a, o, t) => { hiss(a, o, { t, dur: 0.2, g: 0.05, f: 1500, f1: 6000, q: 3 }); tone(a, o, { type: 'triangle', f: 1200, f1: 900, t: t + 0.2, dur: 0.04, g: 0.07 }); },
    eq: (a, o, t) => {
      tone(a, o, { f: 110, f1: 55, t, dur: 0.3, g: 0.14 });                                // taiko
      hiss(a, o, { t: t + 0.03, dur: 0.14, g: 0.07, f: 3000, f1: 9000, type: 'highpass' });  // draw
      [2400, 3610, 5280].forEach((f, i) => tone(a, o, { f, t: t + 0.08, dur: 0.7 - i * 0.15, g: 0.03 / (i + 1) })); // blade ring
    },
    error: (a, o, t) => { koto(a, o, 220, t, 0.08); tone(a, o, { type: 'triangle', f: 220, f1: 196, glide: 0.3, t: t + 0.05, dur: 0.35, g: 0.04 }); },
    theme: (a, o, t) => {
      tone(a, o, { f: 100, f1: 50, t, dur: 0.35, g: 0.16 });
      hiss(a, o, { t: t + 0.12, dur: 0.16, g: 0.07, f: 3000, f1: 9000, type: 'highpass' });
      [2400, 3610].forEach((f) => tone(a, o, { f, t: t + 0.18, dur: 0.6, g: 0.025 }));
      [0, 5, 7, 12].forEach((s, i) => koto(a, o, hz(293.66, s), t + 0.42 + i * 0.11, 0.07));
    },
  },

  weaver: {
    num: (a, o, t, d) => { tone(a, o, { type: 'triangle', f: hz(392, MINOR[digit(d)]), t, dur: 0.09, g: 0.07 }); hiss(a, o, { t, dur: 0.03, g: 0.03, f: 6000, f1: 2500, q: 2 }); },
    op: (a, o, t) => hiss(a, o, { t, dur: 0.08, g: 0.22, f: 4500, f1: 900, q: 2.5 }),
    ac: (a, o, t) => { hiss(a, o, { t, dur: 0.17, g: 0.3, f: 600, f1: 5000, q: 2.5 }); tone(a, o, { f: 90, f1: 160, t, dur: 0.15, g: 0.06 }); },
    eq: (a, o, t) => {
      hiss(a, o, { t, dur: 0.15, g: 0.16, f: 5200, f1: 700, q: 2.2 });            // THWIP
      tone(a, o, { f: 1400, f1: 300, t, dur: 0.13, g: 0.05 });
      tone(a, o, { f: 130, f1: 70, t: t + 0.16, dur: 0.18, g: 0.12 });            // land
      tone(a, o, { type: 'triangle', f: hz(392, 12), t: t + 0.2, dur: 0.22, g: 0.04 });
    },
    error: (a, o, t) => { tone(a, o, { type: 'triangle', f: hz(196, 3), t, dur: 0.12, g: 0.07 }); tone(a, o, { type: 'triangle', f: 196, f1: 185, t: t + 0.13, dur: 0.28, g: 0.07, vib: 6, vibHz: 9 }); },
    theme: (a, o, t) => {
      hiss(a, o, { t, dur: 0.12, g: 0.14, f: 5200, f1: 800, q: 2.2 });
      hiss(a, o, { t: t + 0.16, dur: 0.12, g: 0.14, f: 5200, f1: 800, q: 2.2 });
      tone(a, o, { f: 220, f1: 55, t: t + 0.3, dur: 0.4, g: 0.12 });              // swoop
      [0, 3, 7, 10, 12].forEach((s, i) => tone(a, o, { type: 'triangle', f: hz(392, s), t: t + 0.42 + i * 0.07, dur: 0.18, g: 0.05 }));
    },
  },

  pinkpop: {
    num: (a, o, t, d) => bell(a, o, hz(1046.5, PENTA[digit(d)]), t, 0.05, 0.35),
    op: (a, o, t) => tone(a, o, { f: 600, f1: 1500, glide: 0.04, t, dur: 0.06, g: 0.08 }),
    ac: (a, o, t) => { [21, 16, 12, 7, 4].forEach((s, i) => bell(a, o, hz(1046.5, s), t + i * 0.035, 0.03, 0.2)); },
    eq: (a, o, t) => {
      [0, 4, 7, 12, 16, 19].forEach((s, i) => bell(a, o, hz(1046.5, s), t + i * 0.03, 0.025, 0.25)); // sparkle up
      [0, 4, 7].forEach((s) => bell(a, echo(a, o), hz(1046.5, s), t + 0.22, 0.035, 0.7));               // ta-da chord
    },
    error: (a, o, t) => { bell(a, o, hz(784, 3), t, 0.05, 0.3); bell(a, o, 784 * 0.94, t + 0.14, 0.05, 0.4); },
    theme: (a, o, t) => {
      tone(a, o, { f: 500, f1: 1400, glide: 0.05, t, dur: 0.08, g: 0.09 });                         // pop
      [0, 2, 4, 7, 9, 12, 14, 16, 19, 21].forEach((s, i) => bell(a, o, hz(1046.5, s), t + 0.08 + i * 0.03, 0.02, 0.2));
      [0, 4, 7, 12].forEach((s) => bell(a, echo(a, o), hz(1046.5, s), t + 0.42, 0.03, 0.8));
    },
  },

  kitten: {
    num: (a, o, t, d) => marimba(a, o, hz(523.25, PENTA[digit(d)]), t, 0.08),
    op: (a, o, t) => { hiss(a, o, { t, dur: 0.04, g: 0.06, f: 700, type: 'lowpass' }); tone(a, o, { f: 320, f1: 200, t, dur: 0.06, g: 0.06 }); },
    ac: (a, o, t) => tone(a, o, { type: 'triangle', f: 760, f1: 380, t, dur: 0.34, g: 0.05, vib: 10, lp: 2200 }),
    eq: (a, o, t) => { mew(a, o, t, 0.1); marimba(a, o, 1046.5, t + 0.3, 0.06); },
    error: (a, o, t) => { hiss(a, o, { t, dur: 0.26, g: 0.14, f: 260, type: 'lowpass', am: 24 }); mew(a, o, t + 0.18, 0.11, 520); },
    theme: (a, o, t) => {
      hiss(a, o, { t, dur: 0.45, g: 0.06, f: 280, type: 'lowpass', am: 24 }); // purr
      mew(a, o, t + 0.3, 0.1);
      [0, 4, 7].forEach((s, i) => marimba(a, o, hz(523.25, s + 12), t + 0.62 + i * 0.09, 0.06));
    },
  },
};
