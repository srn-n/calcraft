import { h } from './dom.js';

let host;
export function toast(msg, ms = 1800) {
  host ||= document.getElementById('toasts');
  while (host.children.length > 2) host.firstChild.remove();
  const el = h('div.toast', {}, msg);
  host.append(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 400);
  }, ms);
}
