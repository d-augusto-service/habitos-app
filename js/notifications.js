// Lembretes. Duas vias:
//  1) Push (FCM): só chega com a app fechada se existir o servidor opcional (functions/).
//  2) Locais: um relógio interno avisa enquanto a app está aberta ou em segundo plano.
// Não existe forma fiável de agendar notificações locais com a app totalmente fechada.
import { KEYS } from './constants.js';
import { get } from './store.js';
import { todayKey, toast, sleep } from './utils.js';
import * as cloud from './cloud.js';

const ua = navigator.userAgent;
const IOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let timer = null;
document.addEventListener('visibilitychange', () => !document.hidden && check());

export function info() {
  const supported = 'Notification' in window && 'serviceWorker' in navigator;
  const permission = supported ? Notification.permission : 'unsupported';
  return {
    supported, permission, ios: IOS, standalone: standalone(),
    iosNeedsInstall: IOS && !standalone(),
    enabled: supported && permission === 'granted' && localStorage.getItem(KEYS.notif) === '1',
    push: !!localStorage.getItem(KEYS.push)
  };
}

async function swReg() {
  if (!('serviceWorker' in navigator)) return null;
  return Promise.race([navigator.serviceWorker.ready, sleep(2500).then(() => null)]);
}

export async function enable() {
  const i = info();
  if (i.iosNeedsInstall) return { ok: false, msg: 'No iPhone, primeiro instala a app: Safari → Partilhar → "Adicionar ao ecrã principal". Depois abre-a pelo ícone e ativa aqui.' };
  if (!i.supported) return { ok: false, msg: 'Este navegador não suporta notificações.' };
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, msg: 'Permissão recusada. Podes alterá-la nas definições do navegador ou do telemóvel.' };
  localStorage.setItem(KEYS.notif, '1');
  startLocal();
  let push = false;
  if (cloud.isPushConfigured() && get().cloud) {
    try {
      const reg = await swReg();
      if (reg) { localStorage.setItem(KEYS.push, await cloud.registerPush(reg)); push = true; }
    } catch (e) { console.warn('Push não registado:', e); }
  }
  return { ok: true, push, msg: 'Lembretes ativados.' };
}
export async function disable() {
  localStorage.setItem(KEYS.notif, '0');
  const t = localStorage.getItem(KEYS.push);
  if (t) { await cloud.unregisterPush(t); localStorage.removeItem(KEYS.push); }
  stopLocal();
}

export async function show(title, body, tag) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const reg = await swReg();
      const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag, data: { url: './' } };
      if (reg) await reg.showNotification(title, opts); else new Notification(title, opts);
      return true;
    } catch { /* cai para o aviso dentro da app */ }
  }
  toast(`⏰ ${title}`);
  return false;
}
export const test = () => show('30 Dias · D.AUGUSTO', 'Está tudo a funcionar! 🎉', 'teste');

/* ---------- Relógio local ---------- */
const loadSent = (tk) => {
  try { const o = JSON.parse(localStorage.getItem(KEYS.notified) || '{}'); return o.d === tk ? new Set(o.ids) : new Set(); } catch { return new Set(); }
};
const saveSent = (tk, set) => { try { localStorage.setItem(KEYS.notified, JSON.stringify({ d: tk, ids: [...set] })); } catch { /* ignora */ } };

// Chamado ao criar/editar um lembrete com hora que já passou hoje: não avisar logo.
export function markSentIfPast(h) {
  if (!h.reminder) return;
  const now = new Date();
  const [hh, mm] = h.reminder.split(':').map(Number);
  if (hh * 60 + mm <= now.getHours() * 60 + now.getMinutes()) {
    const tk = todayKey(); const s = loadSent(tk); s.add(h.id); saveSent(tk, s);
  }
}
function check() {
  if (localStorage.getItem(KEYS.notif) !== '1') return;
  const S = get();
  if (S.loading) return;
  const now = new Date(), tk = todayKey(), mins = now.getHours() * 60 + now.getMinutes();
  const sent = loadSent(tk);
  for (const h of S.habits) {
    if (h.archived || !h.reminder || h.done[tk] || sent.has(h.id)) continue;
    const [hh, mm] = h.reminder.split(':').map(Number);
    const diff = mins - (hh * 60 + mm);
    if (diff >= 0 && diff <= 90) { sent.add(h.id); show(`${h.emoji} ${h.name}`, 'Hora de cumprir o teu hábito de hoje!', 'hab-' + h.id); }
  }
  saveSent(tk, sent);
}
export function startLocal() {
  if (timer || !info().enabled) return;
  timer = setInterval(check, 30000);
  check();
}
export function stopLocal() { clearInterval(timer); timer = null; }
