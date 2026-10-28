// Funções utilitárias: DOM, datas, validação, avisos (toast).
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Escapa texto do utilizador antes de o pôr em HTML (proteção XSS).
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Datas (sempre no fuso local) ---------- */
export const pad = (n) => String(n).padStart(2, '0');
export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const todayKey = () => keyOf(new Date());
export const daysBetween = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 86400000);
export const fmtDate = (k, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  fromKey(k).toLocaleDateString('pt-PT', opts);

/* ---------- Validação ---------- */
export const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) && keyOf(fromKey(k)) === k;
export const isColor = (c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
export const isTime = (t) => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
export const uid = () =>
  (globalThis.crypto?.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 20)
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8));

/* ---------- Movimento / vibração ---------- */
export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function vibrate(p) { try { navigator.vibrate && !reduceMotion() && navigator.vibrate(p); } catch { /* ignora */ } }
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Toast (aviso temporário) ---------- */
let toastTimer;
export function toast(msg, opts = {}) {
  const t = $('#toast');
  if (!t) return;
  t.replaceChildren();
  const s = document.createElement('span');
  s.textContent = msg; // textContent: seguro contra XSS
  t.append(s);
  if (opts.action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = opts.action.text;
    b.onclick = () => { t.classList.remove('show'); opts.action.run(); };
    t.append(b);
  }
  t.classList.toggle('error', opts.type === 'error');
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), opts.duration ?? (opts.action ? 5000 : 2800));
}
