// Theme catalogue. Visual tokens live in styles/themes.css under [data-theme="id"].
// `swatch` drives the picker preview; `sound` picks a synth profile; `scheme` sets browser chrome.

export const THEMES = [
  { id: 'braun', name: 'Braun ET66', ref: 'Dieter Rams & Dietrich Lubs, 1987', label: 'ET66 · 1987', scheme: 'light', sound: 'click',
    swatch: { bg: '#e9e4dc', key: '#2b2b2b', op: '#6f6a63', accent: '#f2b705', text: '#f5f0eb' } },
  { id: 'cyber', name: 'Cyber HUD', ref: 'Blade Runner 2049 interfaces', label: '[SYS:CALC-05] 計算機', scheme: 'dark', sound: 'blip',
    swatch: { bg: '#07080a', key: '#121418', op: '#16222a', accent: '#ffcc00', text: '#00f3ff' } },
  { id: 'glass', name: 'Liquid Glass', ref: 'Apple Liquid Glass, 2025', label: 'LIQUID · SAT 180%', scheme: 'light', sound: 'tick',
    swatch: { bg: '#f3b38a', key: 'rgba(255,255,255,.55)', op: 'rgba(255,255,255,.75)', accent: '#0a7cff', text: '#14161a' } },
  { id: 'clay', name: 'Clay & Moss', ref: 'Biophilic design · cork, clay, lichen', label: 'FIELD NOTES · M-02', scheme: 'light', sound: 'wood',
    swatch: { bg: '#efe7dc', key: '#e3d6c6', op: '#c9b49c', accent: '#4a5a3c', text: '#2e2a24' } },
  { id: 'te', name: 'TE Field', ref: 'Teenage Engineering OP-1 / EP-133', label: 'TE · CALC-133', scheme: 'light', sound: 'chip',
    swatch: { bg: '#d9d9d6', key: '#f2f2f0', op: '#2a2a2a', accent: '#ff4f00', text: '#1b1b1b' } },
  { id: 'voyager', name: 'Voyager', ref: 'HP-12C, 1981', label: 'VOYAGER · 12C', scheme: 'dark', sound: 'click',
    swatch: { bg: '#2b241d', key: '#1a1714', op: '#1a1714', accent: '#c8a35a', text: '#e9e3d6' } },
  { id: 'lcd', name: 'Solar LCD', ref: 'Casio desk calculators', label: 'SOLAR CELL · SL-300', scheme: 'light', sound: 'beep',
    swatch: { bg: '#b9bcc0', key: '#3a3d42', op: '#55595f', accent: '#d9472b', text: '#c7cdb6' } },
  { id: 'phosphor', name: 'Phosphor', ref: 'VT100 green-screen terminals', label: 'TTY0 · 9600 BAUD', scheme: 'dark', sound: 'blip',
    swatch: { bg: '#030a05', key: '#06140a', op: '#06140a', accent: '#39ff7a', text: '#39ff7a' } },
  { id: 'brutal', name: 'Brutal', ref: 'Neo-brutalist web design', label: 'CALC™ NO.5', scheme: 'light', sound: 'thock',
    swatch: { bg: '#fffdf5', key: '#ffffff', op: '#ffde21', accent: '#ff5c39', text: '#111111' } },
  { id: 'bauhaus', name: 'Bauhaus', ref: 'Bauhaus, Dessau 1925', label: 'DESSAU · 1925', scheme: 'light', sound: 'wood',
    swatch: { bg: '#f1ece1', key: '#1d1d1b', op: '#1f4e9c', accent: '#d8342b', text: '#f1ece1' } },
  { id: 'soft', name: 'Soft', ref: 'Neumorphism (contrast-fixed)', label: 'SOFT · TOUCH', scheme: 'light', sound: 'tick',
    swatch: { bg: '#e6e9ef', key: '#e6e9ef', op: '#dfe3ea', accent: '#2d6cdf', text: '#2a3140' } },
  { id: 'dot', name: 'Dot Matrix', ref: 'Nothing Phone glyph type', label: '( CALC ) · OLED', scheme: 'dark', sound: 'tick',
    swatch: { bg: '#000000', key: '#121212', op: '#1b1b1b', accent: '#d71921', text: '#ffffff' } },
  { id: 'blueprint', name: 'Blueprint', ref: 'Technical drawing sheets', label: 'DWG NO. 0005 · REV B', scheme: 'dark', sound: 'click',
    swatch: { bg: '#123a6b', key: '#16477f', op: '#1b5694', accent: '#ffffff', text: '#dbe8ff' } },
  { id: 'arcade', name: 'Arcade', ref: '8-bit arcade cabinets', label: 'INSERT COIN · 1UP', scheme: 'dark', sound: 'chip',
    swatch: { bg: '#14102b', key: '#2a2350', op: '#e8336f', accent: '#ffd23f', text: '#ffffff' } },
];

export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
