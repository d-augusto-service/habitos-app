// Firebase: login (Authentication), dados (Firestore) e push (Cloud Messaging).
// O SDK é carregado só quando é preciso (import dinâmico), por isso a app
// continua a funcionar em modo local mesmo sem internet ou sem configuração.
import { firebaseConfig, vapidKey, isFirebaseConfigured, isPushConfigured } from '../firebase-config.js';

const V = '10.14.1';
const CDN = `https://www.gstatic.com/firebasejs/${V}/`;
let M = null, app, auth, db, uid = null, unsubs = [];

export { isFirebaseConfigured, isPushConfigured };

async function init() {
  if (M) return M;
  if (!isFirebaseConfigured()) throw Object.assign(new Error('not-configured'), { code: 'app/not-configured' });
  const [a, au, fs] = await Promise.all([
    import(CDN + 'firebase-app.js'), import(CDN + 'firebase-auth.js'), import(CDN + 'firebase-firestore.js')
  ]);
  M = { a, au, fs };
  app = a.initializeApp(firebaseConfig);
  auth = au.getAuth(app);
  auth.languageCode = 'pt';
  try { // cache offline persistente (funciona em vários separadores)
    db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  } catch { db = fs.getFirestore(app); }
  return M;
}

/* ---------- Autenticação ---------- */
export async function watchAuth(onUser, onError) {
  await init();
  try { await M.au.getRedirectResult(auth); } catch (e) { onError && onError(e); }
  return M.au.onAuthStateChanged(auth, onUser, (e) => onError && onError(e));
}
export async function signUp(name, email, password) {
  await init();
  const cred = await M.au.createUserWithEmailAndPassword(auth, email, password);
  if (name) await M.au.updateProfile(cred.user, { displayName: name.slice(0, 40) });
  return cred.user;
}
export async function signIn(email, password) {
  await init();
  return (await M.au.signInWithEmailAndPassword(auth, email, password)).user;
}
export async function signInGoogle() {
  await init();
  const p = new M.au.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  try {
    await M.au.signInWithPopup(auth, p);
    return 'popup';
  } catch (e) {
    // Alguns ambientes (iPhone/PWA instalada) bloqueiam popups: tenta redirecionamento.
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(e.code)) {
      await M.au.signInWithRedirect(auth, p);
      return 'redirect';
    }
    throw e;
  }
}
export async function resetPassword(email) { await init(); await M.au.sendPasswordResetEmail(auth, email); }
export async function signOutUser() { await init(); await M.au.signOut(auth); }

/* ---------- Firestore ---------- */
// users/{uid}/habits/{habitId}   → um documento por hábito
// users/{uid}/meta/profile       → conquistas
// users/{uid}/devices/{token}    → aparelhos registados para push
const col = (...p) => M.fs.collection(db, 'users', uid, ...p);
const ref = (...p) => M.fs.doc(db, 'users', uid, ...p);

export async function start(userId, h) {
  await init();
  stop();
  uid = userId;
  let first = true;
  unsubs.push(M.fs.onSnapshot(col('habits'), { includeMetadataChanges: true }, (snap) => {
    if (first || snap.docChanges().length) {
      h.onHabits(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      first = false;
    }
    const m = snap.metadata;
    h.onSync(m.hasPendingWrites ? 'syncing' : m.fromCache ? (navigator.onLine ? 'syncing' : 'offline') : 'synced');
  }, (e) => h.onError(e)));
  unsubs.push(M.fs.onSnapshot(ref('meta', 'profile'), (snap) => h.onMeta(snap.exists() ? snap.data() : {}), (e) => h.onError(e)));
}
export function stop() { unsubs.forEach((u) => u()); unsubs = []; uid = null; }

// "HH:MM" local → "HH:MM" em UTC (usado pelo servidor de lembretes, opcional)
function utcOf(hhmm, offsetMin) {
  const [h, m] = hhmm.split(':').map(Number);
  const t = (((h * 60 + m - offsetMin) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
function fields(hb) {
  const off = -new Date().getTimezoneOffset();
  return {
    name: hb.name, emoji: hb.emoji, color: hb.color, created: hb.created,
    reminder: hb.reminder || null, reminderUTC: hb.reminder ? utcOf(hb.reminder, off) : null,
    tzOffsetMin: off, archived: !!hb.archived, order: hb.order,
    updatedAt: M.fs.serverTimestamp()
  };
}
// Nota: não usamos "await" nas gravações na UI; offline ficam em fila e enviam depois.
export function saveHabit(hb, withDone = false) {
  const d = fields(hb);
  if (withDone) d.done = { ...hb.done };
  return M.fs.setDoc(ref('habits', hb.id), d, { merge: true });
}
export function toggle(id, key, value) {
  if (value) return M.fs.setDoc(ref('habits', id), { done: { [key]: true } }, { merge: true });
  return M.fs.updateDoc(ref('habits', id), new M.fs.FieldPath('done', key), M.fs.deleteField());
}
export const remove = (id) => M.fs.deleteDoc(ref('habits', id));
export const saveMeta = (ach) => M.fs.setDoc(ref('meta', 'profile'), { achievements: ach }, { merge: true });

// Grava vários hábitos de uma vez (migração / importação). replace=true substitui o documento.
export async function bulkSave(habits, removeIds = [], replace = false) {
  const ops = [
    ...habits.map((hb) => ({ r: ref('habits', hb.id), d: { ...fields(hb), done: { ...hb.done } }, merge: !replace })),
    ...removeIds.map((id) => ({ r: ref('habits', id), del: true }))
  ];
  for (let i = 0; i < ops.length; i += 400) {
    const b = M.fs.writeBatch(db);
    ops.slice(i, i + 400).forEach((o) => (o.del ? b.delete(o.r) : b.set(o.r, o.d, { merge: o.merge })));
    await b.commit();
  }
}

/* ---------- Push (FCM) ---------- */
export async function registerPush(swReg) {
  if (!isPushConfigured()) throw new Error('push-not-configured');
  await init();
  const msg = await import(CDN + 'firebase-messaging.js');
  if (!(await msg.isSupported())) throw new Error('push-unsupported');
  const token = await msg.getToken(msg.getMessaging(app), { vapidKey, serviceWorkerRegistration: swReg });
  if (!token) throw new Error('no-token');
  if (uid) {
    await M.fs.setDoc(ref('devices', token), { token, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, ua: navigator.userAgent.slice(0, 120), updatedAt: M.fs.serverTimestamp() }, { merge: true });
  }
  return token;
}
export async function unregisterPush(token) {
  if (!M || !uid || !token) return;
  try { await M.fs.deleteDoc(ref('devices', token)); } catch { /* ignora */ }
}

/* ---------- Mensagens de erro em português ---------- */
export function describeError(e) {
  const c = e?.code || '';
  const map = {
    'auth/invalid-email': 'Esse email não é válido.',
    'auth/missing-password': 'Escreve a palavra-passe.',
    'auth/user-disabled': 'Esta conta foi desativada.',
    'auth/user-not-found': 'Não existe nenhuma conta com esse email.',
    'auth/wrong-password': 'Email ou palavra-passe incorretos.',
    'auth/invalid-credential': 'Email ou palavra-passe incorretos.',
    'auth/email-already-in-use': 'Já existe uma conta com esse email. Tenta entrar.',
    'auth/weak-password': 'Palavra-passe fraca: usa pelo menos 8 caracteres.',
    'auth/too-many-requests': 'Demasiadas tentativas. Espera um pouco e tenta de novo.',
    'auth/network-request-failed': 'Sem ligação à internet. Tenta de novo quando estiveres online.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permite pop-ups e tenta de novo.',
    'auth/unauthorized-domain': 'Este endereço não está autorizado no Firebase (Authentication → Definições → Domínios autorizados).',
    'auth/operation-not-allowed': 'Este método de login não está ativado no Firebase.',
    'auth/account-exists-with-different-credential': 'Já existe uma conta com este email por outro método de login.',
    'permission-denied': 'Sem permissão no Firestore. Confirma que publicaste as regras (firestore.rules).',
    'unavailable': 'Servidor indisponível. Os dados ficam guardados e sincronizam quando houver ligação.',
    'app/not-configured': 'O Firebase ainda não está configurado (firebase-config.js).'
  };
  if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return '';
  return map[c] || map[c.replace('firestore/', '')] || 'Algo correu mal. Tenta de novo.';
}
