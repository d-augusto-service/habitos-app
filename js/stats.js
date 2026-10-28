// Cálculos puros sobre os hábitos (sem DOM).
import { keyOf, fromKey, addDays, daysBetween } from './utils.js';

export const active = (habits) => habits.filter((h) => !h.archived);
export const byOrder = (a, b) => a.order - b.order || a.created.localeCompare(b.created);

// Sequência atual: se hoje ainda não foi marcado, conta a partir de ontem.
export function currentStreak(h, now = new Date()) {
  let d = now;
  if (!h.done[keyOf(d)]) d = addDays(d, -1);
  let n = 0;
  while (h.done[keyOf(d)]) { n++; d = addDays(d, -1); }
  return n;
}

export function bestStreak(h) {
  const keys = Object.keys(h.done).filter((k) => h.done[k]).sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) {
    run = prev && daysBetween(prev, k) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

// Dias cumpridos dentro da janela dos 30 dias do desafio (a partir da criação).
export function challengeDone(h) {
  let n = 0;
  const start = fromKey(h.created);
  for (let i = 0; i < 30; i++) if (h.done[keyOf(addDays(start, i))]) n++;
  return n;
}

// Quantos hábitos (ativos e já criados nesse dia) foram cumpridos.
export function dayStat(habits, key) {
  const list = habits.filter((h) => !h.archived && h.created <= key);
  const done = list.filter((h) => h.done[key]).length;
  return { done, total: list.length, ratio: list.length ? done / list.length : 0 };
}

export function dailySeries(habits, days, now = new Date()) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = keyOf(addDays(now, -i));
    out.push({ key, ...dayStat(habits, key) });
  }
  return out;
}

// Taxa de cumprimento nos últimos N dias (0-100).
export function completionRate(habits, days = 30, now = new Date()) {
  let done = 0, total = 0;
  for (const d of dailySeries(habits, days, now)) { done += d.done; total += d.total; }
  return total ? Math.round((done / total) * 100) : 0;
}

export function perfectDays(habits, now = new Date()) {
  const today = keyOf(now);
  const keys = new Set();
  habits.forEach((h) => Object.keys(h.done).forEach((k) => k <= today && keys.add(k)));
  let n = 0;
  for (const k of keys) { const s = dayStat(habits, k); if (s.total > 0 && s.done === s.total) n++; }
  return n;
}

export const totalChecks = (habits) =>
  habits.reduce((n, h) => n + Object.keys(h.done).filter((k) => h.done[k]).length, 0);
