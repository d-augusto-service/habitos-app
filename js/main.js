// Arranque da app: liga o estado, os ecrãs, o login e o service worker.
import { $, $$, todayKey, toast, sleep } from './utils.js';
import { KEYS } from './constants.js';
import * as store from './store.js';
import * as cloud from './cloud.js';
import * as notif from './notifications.js';
import { initTheme } from './theme.js';
import { initToday, renderToday } from './ui/today.js';
import { initProgress, renderProgress } from './ui/progress.js';
import { initAchievements, renderAchievements } from './ui/achievements-view.js';
import { initProfile, renderProfile } from './ui/profile.js';
import { wireDialogs, wireHabitForm, openHabitForm, celebrate, ask } from './ui/sheets.js';
import { openAuth } from './ui/auth-ui.js';
import { runOnboarding } from './ui/onboarding.js';

let tab = 'today';
let lastDay = todayKey();
let migrationAsked = null;

/* ---------- Desenho ---------- */
const SYNC_CHIP = { synced: '☁️ Sincronizado', syncing: '🔄 A sincronizar', offline: '📴 Offline' };
function paint() {
  renderToday();
  if (tab === 'progress') renderProgress();
  else if (tab === 'achievements') renderAchievements();
  else if (tab === 'profile') renderProfile();
  const S = store.get(), chip = $('#syncChip');
  chip.hidden = !S.cloud;
  chip.textContent = SYNC_CHIP[S.sync] || '';
}

/* ---------- Separadores ---------- */
function go(t, focus = true) {
  if (!['today', 'progress', 'achievements', 'profile'].includes(t)) t = 'today';
  tab = t;
  $$('.view').forEach((v) => (v.hidden = v.dataset.view !== t));
  $$('[data-tab]').forEach((b) => (b.dataset.tab === t ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  $('#addBtn').hidden = t !== 'today';
  paint();
  scrollTo(0, 0);
  if (focus) $(`#view-${t} .view-title`)?.focus({ preventScroll: true });
}

/* ---------- Conta / nuvem ---------- */
async function onUser(user) {
  const S = store.get();
  if (user) {
    if (S.cloud && S.user?.uid === user.uid) return;
    localStorage.setItem(KEYS.account, '1');
    store.enterCloud(user, cloud);
    try {
      await cloud.start(user.uid, {
        onHabits: store.cloudHabits, onMeta: store.cloudMeta, onSync: store.setSync,
        onError: (e) => toast(cloud.describeError(e), { type: 'error' })
      });
    } catch (e) { toast(cloud.describeError(e), { type: 'error' }); }
    offerMigration(user);
    if (notif.info().enabled) notif.startLocal();
  } else {
    cloud.stop();
    if (S.cloud) store.leaveCloud(); else store.setLoading(false);
  }
}

// Se houver hábitos no localStorage, oferece juntá-los à conta (sem perder nada).
async function offerMigration(user) {
  const { habits, ach } = store.readLocal();
  if (!habits.length || migrationAsked === user.uid) return;
  migrationAsked = user.uid;
  const r = await ask({
    title: `Juntar os teus ${habits.length} hábito(s) à conta?`,
    text: 'Encontrámos hábitos guardados só neste aparelho. Vamos juntá-los à tua conta sem perder nada, e guardamos uma cópia de segurança.',
    buttons: [{ text: 'Juntar à conta', value: 'merge', kind: 'primary' }, { text: 'Agora não', value: null, kind: 'ghost' }]
  });
  if (r !== 'merge') return;
  try {
    // Offline a gravação fica em fila e envia depois: não esperamos mais de 4s.
    await Promise.race([cloud.bulkSave(habits, [], false).then(() => cloud.saveMeta(ach)), sleep(4000)]);
    store.stashLocal();
    toast('Hábitos juntados à tua conta ✅');
  } catch (e) { toast(cloud.describeError(e), { type: 'error' }); }
}

async function startAuth() {
  if (!cloud.isFirebaseConfigured()) return;
  const hadAccount = localStorage.getItem(KEYS.account) === '1';
  if (hadAccount) {
    store.setLoading(true);
    setTimeout(() => { if (store.get().loading && !store.get().cloud) { store.setLoading(false); toast('Sem ligação à conta. A mostrar dados deste aparelho.', { type: 'error' }); } }, 9000);
  }
  try { await cloud.watchAuth(onUser, (e) => { const m = cloud.describeError(e); if (m) toast(m, { type: 'error' }); }); }
  catch (e) { store.setLoading(false); if (hadAccount) toast('Não foi possível ligar à conta agora.', { type: 'error' }); }
}

/* ---------- Service worker + "nova versão" ---------- */
function setupSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const dev = ['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('sw');
  if (dev) { // em desenvolvimento (Live Server) não usamos cache para veres sempre as alterações
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    return;
  }
  const showUpdate = (worker) => {
    $('#update').hidden = false;
    $('#updateBtn').onclick = () => worker.postMessage({ type: 'SKIP_WAITING' });
  };
  navigator.serviceWorker.register('sw.js').then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdate(w); });
    });
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => !document.hidden && reg.update().catch(() => {}));
  }).catch((e) => console.warn('Service worker não registado:', e));
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'PUSH') toast(`⏰ ${e.data.title || ''} ${e.data.body || ''}`.trim(), { duration: 5000 });
  });
}

/* ---------- Arranque ---------- */
async function boot() {
  initTheme();
  store.setErrorHandler((e) => toast((e?.code ? cloud.describeError(e) : e?.message) || 'Algo correu mal.', { type: 'error' }));
  store.loadLocal();
  store.syncAchievements();           // medalhas já merecidas (dados antigos), em silêncio
  store.onUnlock(celebrate);

  initToday(); initProgress(); initAchievements(); initProfile();
  wireDialogs(); wireHabitForm();
  $('#addBtn').onclick = () => openHabitForm();
  $$('[data-tab]').forEach((b) => (b.onclick = () => { location.hash = b.dataset.tab; }));
  addEventListener('hashchange', () => go(location.hash.slice(1)));
  store.subscribe(paint);
  setInterval(() => { if (todayKey() !== lastDay) { lastDay = todayKey(); paint(); } }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastDay = todayKey(); paint(); } });

  startAuth();
  setupSW();
  notif.startLocal();

  go(location.hash.slice(1), false);
  await sleep(1200);                  // splash com a logo
  $('#splash').classList.add('hide');
  setTimeout(() => $('#splash').remove(), 500);
  $('#app').hidden = false;

  if (!localStorage.getItem(KEYS.onboarded)) {
    $('#app').hidden = true;
    const r = await runOnboarding();
    $('#app').hidden = false;
    if (r === 'account') openAuth('register');
  }
}
boot();
