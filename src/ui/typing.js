// Comfortable typing in the Tools and Bills forms:
//  - text boxes (notes) grow taller with their content instead of hiding lines behind a scrollbar
//  - single-line fields shrink their text to fit, so a long number stays fully visible
//  - the field you're typing in is kept in view above the on-screen keyboard
const FIELDS = '#tools input[type="text"], #tools textarea, .bill-editor input, .bill-editor textarea';

function grow(ta) {
  const cap = Math.round(innerHeight * 0.45);
  ta.style.height = 'auto';
  const need = ta.scrollHeight + 2;
  ta.style.height = `${Math.min(need, cap)}px`;
  ta.style.overflowY = need > cap ? 'auto' : 'hidden'; // very long notes scroll inside the box
}

function fit(input) {
  input.style.fontSize = '';
  const base = parseFloat(getComputedStyle(input).fontSize) || 16;
  if (input.scrollWidth <= input.clientWidth) return;
  // shrink in steps until the whole value fits (but never below a readable size)
  let size = base;
  while (input.scrollWidth > input.clientWidth && size > 13) {
    size -= 1;
    input.style.fontSize = `${size}px`;
  }
}

function adjust(el) {
  if (el instanceof HTMLTextAreaElement) grow(el);
  else if (el instanceof HTMLInputElement) fit(el);
}

let lastFocus = null;
function keepInView(el) {
  if (!el || !el.isConnected) return;
  // wait for the keyboard to finish opening (the viewport resizes), then centre the field
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

export function setupTyping() {
  document.addEventListener('input', (e) => { if (e.target.matches?.(FIELDS)) adjust(e.target); });
  document.addEventListener('focusin', (e) => {
    if (!e.target.matches?.(FIELDS)) return;
    lastFocus = e.target;
    adjust(e.target);
    setTimeout(() => keepInView(e.target), 320);
  });
  // The Android app and mobile browsers resize the page when the keyboard opens.
  const onResize = () => {
    const a = document.activeElement;
    if (a && a === lastFocus && a.matches?.(FIELDS)) keepInView(a);
  };
  addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  // Fields created later (switching tools, opening a bill) start at the right size too.
  new MutationObserver((list) => {
    for (const m of list) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.matches?.(FIELDS)) adjust(n);
      n.querySelectorAll?.(FIELDS).forEach(adjust);
    }
  }).observe(document.getElementById('tools') || document.body, { childList: true, subtree: true });
}
