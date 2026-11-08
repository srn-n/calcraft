// Synthesised key sounds, one voice per theme. No audio files (zero bytes of assets).
//
// Every voice is a short "body" tone with a pitch sweep, an optional noise transient (the click
// of a key), and an optional low-pass filter (warmth). Three variants per theme: number keys,
// operator keys, and = (which also plays when you switch to that theme).
let ctx = null;
let enabled = false;
let profile = 'braun';
let noiseBuf = null;

let volume = 1;
const VOLUME = { 1: 0.45, 2: 1, 3: 1.8 };
export const setSound = (on) => { enabled = on; if (on) warm(); };
export const setSoundLevel = (lvl) => { volume = VOLUME[lvl] ?? 1; };
export const setSoundProfile = (p) => { profile = p; };

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch { ctx = new AC(); }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Create/resume the audio engine on the first touch, so the very first key already sounds
// (Android WebView and mobile browsers only allow audio to start inside a user gesture).
function warm() {
  const once = () => { ac(); removeEventListener('pointerdown', once, true); removeEventListener('keydown', once, true); };
  addEventListener('pointerdown', once, true);
  addEventListener('keydown', once, true);
}

function noise(a) {
  if (!noiseBuf || noiseBuf.sampleRate !== a.sampleRate) {
    const len = Math.floor(a.sampleRate * 0.03);
    noiseBuf = a.createBuffer(1, len, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// voice: [wave, startHz, endHz, ms, gain, noise (0-1), lowpassHz (0 = none), second tone Hz (0 = none)]
const V = (wave, f0, f1, ms, gain, nz = 0, lp = 0, f2 = 0) => ({ wave, f0, f1, ms, gain, nz, lp, f2 });
const VOICES = {
  braun:     { num: V('square', 2400, 1300, 16, 0.045, 0.6, 6000), op: V('square', 1800, 1000, 20, 0.045, 0.6, 5000), eq: V('triangle', 880, 1320, 80, 0.08) },          // crisp plastic click
  cyber:     { num: V('sine', 1500, 1900, 32, 0.06), op: V('sine', 950, 1350, 40, 0.06), eq: V('sawtooth', 600, 1200, 110, 0.035, 0, 3000, 1800) },                         // HUD blip
  glass:     { num: V('sine', 3300, 2800, 20, 0.04), op: V('sine', 2500, 2100, 24, 0.04), eq: V('sine', 1568, 1568, 260, 0.05, 0, 0, 2349) },                                 // glassy tick, chime
  clay:      { num: V('triangle', 520, 360, 42, 0.1, 0.25, 2500), op: V('triangle', 420, 290, 52, 0.1, 0.25, 2200), eq: V('triangle', 330, 520, 120, 0.1) },                // wood knock
  te:        { num: V('square', 988, 988, 34, 0.03, 0, 4000), op: V('square', 740, 740, 38, 0.03, 0, 4000), eq: V('square', 659, 1319, 120, 0.03, 0, 5000) },                 // synth chip
  voyager:   { num: V('triangle', 1800, 900, 22, 0.07, 0.7, 7000), op: V('triangle', 1400, 700, 26, 0.07, 0.7, 6000), eq: V('square', 1200, 1200, 70, 0.025, 0, 3000) },     // firm HP click
  lcd:       { num: V('square', 4000, 4000, 26, 0.018), op: V('square', 3600, 3600, 28, 0.018), eq: V('square', 4000, 4000, 90, 0.022) },                                     // pocket-calc beep
  phosphor:  { num: V('sine', 1050, 1050, 28, 0.05, 0, 0, 2100), op: V('sine', 800, 800, 34, 0.05, 0, 0, 1600), eq: V('square', 523, 784, 140, 0.025, 0, 2500) },             // terminal blip
  brutal:    { num: V('triangle', 210, 110, 48, 0.17, 0.5, 1800), op: V('triangle', 170, 95, 58, 0.17, 0.5, 1600), eq: V('triangle', 130, 260, 120, 0.15, 0.2, 1500) },      // heavy thock
  bauhaus:   { num: V('triangle', 720, 520, 36, 0.09, 0.2, 3500), op: V('triangle', 560, 400, 44, 0.09, 0.2, 3000), eq: V('sine', 523, 784, 160, 0.08, 0, 0, 659) },          // wooden block
  soft:      { num: V('sine', 620, 420, 40, 0.07, 0.1, 1500), op: V('sine', 500, 340, 46, 0.07, 0.1, 1400), eq: V('sine', 440, 660, 160, 0.07) },                            // pillowy
  dot:       { num: V('square', 3000, 2400, 10, 0.03, 0.8, 8000), op: V('square', 2600, 2000, 12, 0.03, 0.8, 8000), eq: V('square', 1000, 1500, 90, 0.025, 0.3, 6000) },     // dot-matrix tick
  blueprint: { num: V('triangle', 1200, 800, 24, 0.05, 0.9, 5000), op: V('triangle', 1000, 650, 28, 0.05, 0.9, 4500), eq: V('sine', 880, 1175, 120, 0.06) },                   // pencil tap
  arcade:    { num: V('square', 660, 660, 40, 0.03), op: V('square', 494, 494, 44, 0.03), eq: V('square', 988, 1319, 150, 0.03, 0, 0, 1976) },                                // 8-bit coin
  valentine: { num: V('triangle', 320, 150, 40, 0.12, 0.9, 3000), op: V('triangle', 280, 130, 46, 0.12, 0.9, 2600), eq: V('sine', 2093, 2093, 380, 0.05, 0.3, 0, 4186) },     // typewriter, bell
  station:   { num: V('sine', 2700, 2500, 12, 0.05, 0.3, 9000), op: V('sine', 2000, 1850, 14, 0.05, 0.3, 9000), eq: V('triangle', 800, 600, 90, 0.08, 0.2) },                // clock tick-tock
  darkroom:  { num: V('sine', 320, 260, 46, 0.09, 0.15, 900), op: V('sine', 260, 210, 52, 0.09, 0.15, 800), eq: V('sine', 220, 330, 200, 0.08, 0, 700) },                     // muffled
  riso:      { num: V('triangle', 420, 260, 38, 0.1, 0.6, 2200), op: V('triangle', 360, 220, 44, 0.1, 0.6, 2000), eq: V('triangle', 300, 450, 120, 0.09, 0.3, 2000) },       // paper thud
  ledger:    { num: V('square', 1500, 700, 30, 0.05, 0.8, 4000), op: V('square', 1200, 560, 36, 0.05, 0.8, 3500), eq: V('square', 900, 400, 160, 0.05, 0.9, 3000) },         // adding-machine ratchet
  tolex:     { num: V('sawtooth', 180, 110, 60, 0.07, 0.1, 900), op: V('sawtooth', 150, 95, 70, 0.07, 0.1, 800), eq: V('sawtooth', 110, 165, 220, 0.06, 0, 700, 220) },       // warm tube hum
  concrete:  { num: V('triangle', 160, 90, 50, 0.18, 0.6, 1400), op: V('triangle', 130, 80, 60, 0.18, 0.6, 1200), eq: V('triangle', 110, 70, 160, 0.17, 0.5, 1000) },         // stone thud
  washi:     { num: V('triangle', 900, 680, 34, 0.09, 0.15, 4000), op: V('triangle', 760, 560, 40, 0.09, 0.15, 3500), eq: V('sine', 587, 880, 280, 0.06, 0, 0, 1175) },       // bamboo knock, chime
  dsky:      { num: V('square', 2000, 2000, 14, 0.035, 0.7, 6000), op: V('square', 1700, 1700, 16, 0.035, 0.7, 6000), eq: V('square', 1000, 1000, 120, 0.025, 0, 3000) },    // relay click, beep
  paperback: { num: V('sine', 520, 360, 34, 0.08, 0.4, 2400), op: V('sine', 440, 300, 40, 0.08, 0.4, 2200), eq: V('sine', 392, 523, 160, 0.07) },                             // soft page tap
};
// Older profile names (still accepted, e.g. from tests or saved data).
const ALIASES = { click: 'braun', blip: 'cyber', tick: 'glass', wood: 'clay', chip: 'te', beep: 'lcd', thock: 'brutal' };

function voice(a, v, t) {
  const dur = v.ms / 1000;
  const out = a.createGain();
  const gain = Math.min(v.gain * volume, 0.4);
  out.gain.setValueAtTime(gain, t);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let dest = a.destination;
  if (v.lp) {
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = v.lp;
    f.connect(dest);
    dest = f;
  }
  out.connect(dest);
  for (const [hz, rel] of v.f2 ? [[v.f0, 1], [v.f2, 0.45]] : [[v.f0, 1]]) {
    const o = a.createOscillator();
    o.type = v.wave;
    o.frequency.setValueAtTime(hz, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, hz * (v.f1 / v.f0)), t + dur);
    if (rel === 1) { o.connect(out); } else { const g = a.createGain(); g.gain.value = rel; o.connect(g).connect(out); }
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  if (v.nz) {
    const n = a.createBufferSource();
    const ng = a.createGain();
    const nl = Math.min(0.012 + dur * 0.15, 0.028);
    n.buffer = noise(a);
    ng.gain.setValueAtTime(gain * v.nz, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + nl);
    n.connect(ng).connect(dest);
    n.start(t);
    n.stop(t + nl + 0.01);
  }
}

// Android app: the phone's sound mode wins. On silent or vibrate, no key sounds (vibration is separate).
function systemAllows() {
  try { return window.BouncyNative?.soundAllowed ? window.BouncyNative.soundAllowed() !== false : true; } catch { return true; }
}

export function play(kind = 'num') {
  if (!enabled || !systemAllows()) return;
  const a = ac();
  if (!a) return;
  try {
    const set = VOICES[profile] || VOICES[ALIASES[profile]] || VOICES.braun;
    const k = kind === 'eq' || kind === 'win' ? 'eq' : kind === 'num' ? 'num' : 'op';
    const t = a.currentTime + 0.002;
    voice(a, set[k], t);
    if (kind === 'win') setTimeout(() => play('eq'), 110);
    if (kind === 'error') voice(a, V('sawtooth', 170, 120, 180, 0.05, 0, 1200), t);
  } catch { /* never let audio break a key press */ }
}
