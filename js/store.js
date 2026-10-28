// Estado da app + gravação (localStorage no modo local, Firestore no modo conta).
// A interface só fala com este ficheiro: não sabe onde os dados ficam guardados.
import { KEYS, COLORS } from './constants.js';
import { isKey, isColor, isTime, todayKey, uid } from './utils.js';
import { ACH_IDS, evaluate } from './achievements.js';

const S = {
  habits: [],
  ach: {},          // { idMedalha: 'AAAA-MM-DD' }
  user: null,       // utilizador Firebase (ou null no modo local)
  cloud: false,
  loading: false,
  sync: 'local'     // local | syncing | synced | offline
};
let backend = null;   // módulo cloud.js quando há conta
let ready = { h: false, m: false };
let unlockFn = null;
let errFn = (e) => console.error(e);
const subs = new Set();

export const get = () => S;
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
const emit = () => subs.forEach((fn) => { try { fn(S); } catch (e) { console.error(e); } });
export const onUnlock = (fn) => { unlockFn = fn; };
export const setErrorHandler = (fn) => { errFn = fn; };

/* ---------- Normalização (também usada em importação e nuvem) ---------- */
export function normalizeHabit(r, i = 0) {
  if (!r || typeof r !== 'object') return null;
  const name = String(r.name ?? '').trim().slice(0, 40);
  if (!name) return null;
  const done = {};
  if (r.done && typeof r.done === 'object') {
    for (const k of Object.keys(r.done)) if (r.done[k] && isKey(k)) done[k] = true;
  }
  return {
    id: /^[\w-]{1,40}$/.test(String(r.id)) ? String(r.id) : uid(),
    name,
    emoji: [...String(r.emoji || '🎯')].slice(0, 4).join(''),
    color: isColor(r.color) ? r.color : COLORS[0],
    created: isKey(r.created) ? r.created : todayKey(),
    done,
    reminder: isTime(r.reminder) ? r.reminder : null,
    archived: r.archived === true,
    order: Number.isFinite(r.order) ? r.order : i
  };
}
export function sanitizeAch(a) {
  const out = {};
  if (a && typeof a === 'object') for (const id of ACH_IDS) if (isKey(a[id])) out[id] = a[id];
  return out;
}
const unionAch = (a, b) => {
  const out = { ...a };
  for (const id of Object.keys(b)) if (!out[id] || b[id] < out[id]) out[id] = b[id];
  return out;
};

/* ---------- localStorage ---------- */
export function readLocal() {
  let habits = [], ach = {};
  try {
    const raw = localStorage.getItem(KEYS.habits);
    if (raw) {
      try {
        const arr = JSON.parse(raw);
        habits = Array.isArray(arr) ? arr.map(normalizeHabit).filter(Boolean) : [];
      } catch {
        // dados corrompidos: guarda uma cópia antes de qualquer gravação
        localStorage.setItem(KEYS.habits + ':corrupt', raw);
      }
    }
    ach = sanitizeAch(JSON.parse(localStorage.getItem(KEYS.ach) || '{}'));
  } catch { /* ignora */ }
  return { habits, ach };
}
function saveLocal() {
  try {
    localStorage.setItem(KEYS.habits, JSON.stringify(S.habits));
    localStorage.setItem(KEYS.ach, JSON.stringify(S.ach));
    return true;
  } catch (e) {
    errFn(new Error('Não foi possível guardar neste aparelho (sem espaço ou modo privado).'));
    return false;
  }
}
// Depois de migrar para a conta, guarda uma cópia de segurança e limpa o modo local.
export function stashLocal() {
  try {
    const { habits, ach } = readLocal();
    localStorage.setItem(`${KEYS.habits}:backup-${todayKey()}`, JSON.stringify({ habits, ach }));
    localStorage.removeItem(KEYS.habits);
    localStorage.removeItem(KEYS.ach);
  } catch { /* ignora */ }
}
export function loadLocal() {
  const { habits, ach } = readLocal();
  S.habits = habits; S.ach = ach;
}

/* ---------- Persistência (local ou nuvem) ---------- */
const guard = (p) => p && p.catch && p.catch(errFn);
function persistHabit(h, withDone = false) {
  if (S.cloud) guard(backend.saveHabit(h, withDone)); else saveLocal();
}
function persistAch() {
  if (S.cloud) guard(backend.saveMeta(S.ach)); else saveLocal();
}

/* ---------- Conquistas ---------- */
function checkAch(silent = false) {
  const prog = evaluate(S.habits);
  const fresh = [];
  for (const id of ACH_IDS) {
    if (prog[id][0] >= prog[id][1] && !S.ach[id]) { S.ach[id] = todayKey(); fresh.push(id); }
  }
  if (fresh.length) {
    persistAch();
    emit();
    if (!silent && unlockFn) unlockFn(fresh);
  }
}

/* ---------- Ações sobre hábitos ---------- */
export function addHabit({ name, emoji, color, reminder }) {
  const h = normalizeHabit({ id: uid(), name, emoji, color, reminder, created: todayKey(), done: {}, archived: false, order: Date.now() });
  if (!h) return null;
  S.habits.push(h);
  persistHabit(h, true);
  emit();
  checkAch();
  return h;
}
export function updateHabit(id, patch) {
  const h = S.habits.find((x) => x.id === id);
  if (!h) return null;
  const next = normalizeHabit({ ...h, ...patch, id: h.id, done: h.done, created: h.created });
  if (!next) return null;
  Object.assign(h, next);
  persistHabit(h);
  emit();
  return h;
}
// Marca/desmarca um dia (por defeito, hoje). Devolve true se ficou cumprido.
export function toggleDay(id, key = todayKey()) {
  const h = S.habits.find((x) => x.id === id);
  if (!h) return false;
  const was = !!h.done[key];
  if (was) delete h.done[key]; else h.done[key] = true;
  if (S.cloud) guard(backend.toggle(id, key, !was)); else saveLocal();
  emit();
  if (!was) checkAch();
  return !was;
}
export function removeHabit(id) {
  const h = S.habits.find((x) => x.id === id);
  if (!h) return null;
  S.habits = S.habits.filter((x) => x.id !== id);
  if (S.cloud) guard(backend.remove(id)); else saveLocal();
  emit();
  return h;
}
export function restoreHabit(h) {
  if (S.habits.some((x) => x.id === h.id)) return;
  S.habits.push(h);
  persistHabit(h, true);
  emit();
}

/* ---------- Exportar / Importar ---------- */
export function exportData() {
  return JSON.stringify({
    app: '30dias-daugusto', version: 2, exportedAt: new Date().toISOString(),
    habits: S.habits, achievements: S.ach
  }, null, 2);
}
export function parseImport(text) {
  let j;
  try { j = JSON.parse(text); } catch { throw new Error('O ficheiro não é um JSON válido.'); }
  const arr = Array.isArray(j) ? j : Array.isArray(j?.habits) ? j.habits : null;
  if (!arr) throw new Error('Não encontrei hábitos neste ficheiro.');
  if (arr.length > 200) throw new Error('Ficheiro com demasiados hábitos (máximo 200).');
  const habits = arr.map(normalizeHabit).filter(Boolean);
  if (!habits.length) throw new Error('Nenhum hábito válido encontrado no ficheiro.');
  return { habits, ach: Array.isArray(j) ? {} : sanitizeAch(j.achievements) };
}
// mode: 'merge' junta aos atuais; 'replace' substitui tudo.
export function applyImport({ habits, ach }, mode) {
  let changed = habits, removed = [];
  if (mode === 'replace') {
    removed = S.habits.filter((h) => !habits.some((x) => x.id === h.id)).map((h) => h.id);
    S.habits = habits; S.ach = { ...ach };
  } else {
    changed = habits.map((inc) => {
      const cur = S.habits.find((x) => x.id === inc.id);
      if (!cur) { S.habits.push(inc); return inc; }
      Object.assign(cur.done, inc.done);
      return cur;
    });
    S.ach = unionAch(S.ach, ach);
  }
  if (S.cloud) {
    guard(backend.bulkSave(changed, removed, mode === 'replace'));
    guard(backend.saveMeta(S.ach));
  } else saveLocal();
  checkAch(true);
  emit();
  return { count: habits.length };
}
export const wipeAll = () => applyImport({ habits: [], ach: {} }, 'replace');

/* ---------- Modo conta (Firebase) ---------- */
export function enterCloud(user, be) {
  S.user = user; S.cloud = true; backend = be;
  S.loading = true; S.sync = 'syncing'; S.habits = []; S.ach = {};
  ready = { h: false, m: false };
  emit();
}
function afterCloud() {
  if (S.loading && ready.h && ready.m) { S.loading = false; checkAch(true); }
  emit();
}
export function cloudHabits(list) {
  S.habits = list.map((r, i) => normalizeHabit(r, i)).filter(Boolean);
  ready.h = true; afterCloud();
}
export function cloudMeta(meta) {
  S.ach = unionAch(S.ach, sanitizeAch(meta?.achievements));
  ready.m = true; afterCloud();
}
export function setSync(s) { if (S.sync !== s) { S.sync = s; emit(); } }
export function setLoading(v) { S.loading = v; emit(); }
export function leaveCloud() {
  S.cloud = false; S.user = null; backend = null; S.loading = false; S.sync = 'local';
  loadLocal();
  emit();
}

// Desbloqueia em silêncio medalhas já merecidas (ex.: dados antigos), sem animação.
export const syncAchievements = () => checkAch(true);
