// Tema: 'auto' (segue o sistema), 'light' ou 'dark'.
import { KEYS } from './constants.js';
const mq = matchMedia('(prefers-color-scheme: light)');

export function getTheme() {
  try { const t = localStorage.getItem(KEYS.theme); return t === 'light' || t === 'dark' ? t : 'auto'; } catch { return 'auto'; }
}
function apply() {
  const t = getTheme();
  const eff = t === 'auto' ? (mq.matches ? 'light' : 'dark') : t;
  document.documentElement.dataset.theme = eff;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = eff === 'light' ? '#F4F5FA' : '#010D25';
}
export function setTheme(t) {
  try { t === 'auto' ? localStorage.removeItem(KEYS.theme) : localStorage.setItem(KEYS.theme, t); } catch { /* ignora */ }
  apply();
}
export function initTheme() { apply(); mq.addEventListener?.('change', () => getTheme() === 'auto' && apply()); }
