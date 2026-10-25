// Synthesised key sounds — no audio files, ~0 bytes of assets.
let ctx = null;
let enabled = false;
let profile = 'click';

export const setSound = (on) => { enabled = on; };
export const setSoundProfile = (p) => { profile = p; };

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// [wave, startHz, endHz, durationMs, gain, noise?]
const PROFILES = {
  click: { num: ['square', 2400, 1200, 18, 0.05, true], op: ['square', 1800, 900, 22, 0.05, true], eq: ['triangle', 880, 1320, 70, 0.08] },
  blip: { num: ['sine', 1400, 1800, 35, 0.06], op: ['sine', 900, 1300, 45, 0.06], eq: ['sawtooth', 600, 1200, 90, 0.04] },
  tick: { num: ['sine', 3200, 2600, 14, 0.04], op: ['sine', 2400, 2000, 18, 0.04], eq: ['sine', 1200, 1800, 80, 0.06] },
  wood: { num: ['triangle', 520, 380, 40, 0.09], op: ['triangle', 420, 300, 50, 0.09], eq: ['triangle', 330, 520, 110, 0.1] },
  chip: { num: ['square', 988, 988, 40, 0.035], op: ['square', 659, 659, 45, 0.035], eq: ['square', 523, 1046, 120, 0.035] },
  beep: { num: ['square', 4000, 4000, 30, 0.02], op: ['square', 3500, 3500, 30, 0.02], eq: ['square', 4000, 4000, 90, 0.025] },
  thock: { num: ['triangle', 220, 120, 45, 0.16, true], op: ['triangle', 180, 100, 55, 0.16, true], eq: ['triangle', 140, 260, 110, 0.15] },
};

export function play(kind = 'num') {
  if (!enabled) return;
  const a = ac();
  if (!a) return;
  const k = kind === 'eq' || kind === 'win' ? 'eq' : kind === 'num' ? 'num' : 'op';
  const [wave, f0, f1, ms, gain, noise] = (PROFILES[profile] || PROFILES.click)[k];
  const t = a.currentTime;
  const dur = ms / 1000;
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(a.destination);
  const o = a.createOscillator();
  o.type = wave;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  o.connect(g);
  o.start(t);
  o.stop(t + dur + 0.01);
  if (noise) {
    const len = Math.floor(a.sampleRate * 0.012);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const n = a.createBufferSource();
    const ng = a.createGain();
    ng.gain.value = gain * 0.8;
    n.buffer = buf;
    n.connect(ng).connect(a.destination);
    n.start(t);
  }
  if (kind === 'win') setTimeout(() => play('eq'), 110);
  if (kind === 'error') {
    const o2 = a.createOscillator();
    const g2 = a.createGain();
    o2.type = 'sawtooth';
    o2.frequency.setValueAtTime(160, t);
    g2.gain.setValueAtTime(0.05, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o2.connect(g2).connect(a.destination);
    o2.start(t);
    o2.stop(t + 0.2);
  }
}
