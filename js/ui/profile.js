// Separador "Perfil": conta, notificações, aparência, dados e instalação.
import { $, esc, todayKey, toast } from '../utils.js';
import { KEYS, APP_VERSION } from '../constants.js';
import { get, exportData, parseImport, applyImport, wipeAll } from '../store.js';
import * as notif from '../notifications.js';
import * as cloud from '../cloud.js';
import { getTheme, setTheme } from '../theme.js';
import { ask, confirmBox, openArchived } from './sheets.js';
import { openAuth } from './auth-ui.js';

let deferredInstall = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; renderProfile(); });
addEventListener('appinstalled', () => { deferredInstall = null; renderProfile(); });

const SYNC_TXT = { synced: '☁️ Sincronizado', syncing: '🔄 A sincronizar…', offline: '📴 Offline: sincroniza quando houver internet', local: '' };

export function initProfile() {
  const v = $('#view-profile');
  v.addEventListener('click', onClick);
  v.addEventListener('change', onChange);
  renderProfile();
}

export function renderProfile() {
  const v = $('#view-profile');
  if (!v) return;
  const focusId = document.activeElement?.id;
  const S = get(), n = notif.info(), theme = getTheme();
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  let account;
  if (S.cloud && S.user) {
    const name = S.user.displayName || S.user.email || 'Conta';
    account = `<div class="acc"><div class="avatar" aria-hidden="true">${esc([...name][0].toUpperCase())}</div>
      <div class="grow"><b>${esc(name)}</b><p class="muted small">${esc(S.user.email || '')}</p><p class="small">${SYNC_TXT[S.sync] || ''}</p></div></div>
      <div class="actions"><button class="btn ghost" data-act="logout" type="button">Sair da conta</button></div>`;
  } else {
    account = `<div class="acc"><div class="avatar" aria-hidden="true">👤</div>
      <div class="grow"><b>Modo local</b><p class="muted small">Os teus hábitos ficam só neste aparelho. Cria uma conta para os guardares na nuvem e usares em vários aparelhos.</p></div></div>
      <div class="actions"><button class="btn primary" data-act="login" type="button">Entrar ou criar conta</button></div>`;
  }

  let nStatus;
  if (n.iosNeedsInstall) nStatus = 'No iPhone só funciona com a app instalada no ecrã principal (iOS 16.4 ou superior). Safari → Partilhar → “Adicionar ao ecrã principal” e abre a app pelo ícone.';
  else if (!n.supported) nStatus = 'Este navegador não suporta notificações.';
  else if (n.permission === 'denied') nStatus = 'Estão bloqueadas. Ativa-as nas definições do navegador ou do telemóvel.';
  else if (n.enabled) nStatus = 'Ativas. Os lembretes locais avisam com a app aberta ou em segundo plano.' + (n.push ? ' Este aparelho também está registado para push.' : '');
  else nStatus = 'Desativadas.';

  v.innerHTML = `
    <div class="view-head"><h2 class="view-title" tabindex="-1">Perfil</h2></div>
    <section class="card" aria-label="Conta">${account}</section>

    <section class="card" aria-label="Notificações">
      <label class="switch-row"><span><b>Lembretes diários</b><br><span class="muted small">Hora definida em cada hábito</span></span>
        <input type="checkbox" role="switch" id="p-notif" ${n.enabled ? 'checked' : ''} ${n.supported ? '' : 'disabled'}></label>
      <p class="muted small" id="p-nstatus">${esc(nStatus)}</p>
      ${n.enabled ? '<div class="actions"><button class="btn ghost" data-act="test" type="button">Enviar notificação de teste</button></div>' : ''}
      <details class="more"><summary>Como funcionam os lembretes</summary>
        <ul class="small muted">
          <li><b>Locais:</b> o relógio da app avisa à hora escolhida enquanto a app está aberta ou em segundo plano. Se o sistema fechar a app, o aviso não chega.</li>
          <li><b>Push (app fechada):</b> precisa de conta, da chave VAPID e do servidor opcional descrito no LEIAME. Sem ele, não há avisos com a app fechada.</li>
          <li><b>iPhone:</b> só com a app instalada no ecrã principal e iOS 16.4 ou superior.</li>
        </ul></details>
    </section>

    <section class="card" aria-label="Aparência">
      <h3 class="mb">Aparência</h3>
      <div class="segmented" role="radiogroup" aria-label="Tema">
        ${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(([v2, l]) =>
          `<label><input type="radio" name="theme" value="${v2}" ${theme === v2 ? 'checked' : ''}><span>${l}</span></label>`).join('')}
      </div>
    </section>

    <section class="card" aria-label="Dados">
      <h3 class="mb">Os teus dados</h3>
      <div class="menu">
        <button type="button" data-act="export"><span>⬇️ Exportar (ficheiro JSON)</span><i aria-hidden="true">›</i></button>
        <label class="menu-item"><span>⬆️ Importar (ficheiro JSON)</span><i aria-hidden="true">›</i>
          <input type="file" id="p-import" accept=".json,application/json" class="sr-only"></label>
        <button type="button" data-act="archived"><span>📦 Hábitos arquivados (${S.habits.filter((h) => h.archived).length})</span><i aria-hidden="true">›</i></button>
        <button type="button" data-act="wipe" class="danger-text"><span>🗑 Apagar todos os dados</span><i aria-hidden="true">›</i></button>
      </div>
    </section>

    <section class="card about" aria-label="Sobre">
      <img src="icons/logo-mark.png" alt="D.AUGUSTO" class="about-logo">
      <p><b>30 Dias</b> · versão ${esc(APP_VERSION)}</p>
      <p class="muted small">By D.AUGUSTO</p>
      ${standalone ? '' : deferredInstall
        ? '<div class="actions"><button class="btn ghost" data-act="install" type="button">Instalar a app</button></div>'
        : '<p class="muted small">Para instalar: no Android (Chrome) menu ⋮ → “Instalar aplicação”; no iPhone (Safari) Partilhar → “Adicionar ao ecrã principal”.</p>'}
    </section>`;
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
}

async function onClick(e) {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'login') openAuth('login');
  else if (act === 'logout') {
    const ok = await confirmBox('Sair da conta?', 'Os dados continuam guardados na tua conta. Neste aparelho voltas ao modo local (vazio).', 'Sair');
    if (!ok) return;
    const t = localStorage.getItem(KEYS.push);
    if (t) { await cloud.unregisterPush(t); localStorage.removeItem(KEYS.push); }
    localStorage.removeItem(KEYS.account);
    try { await cloud.signOutUser(); toast('Sessão terminada'); } catch (err) { toast(cloud.describeError(err), { type: 'error' }); }
  } else if (act === 'test') { notif.test(); }
  else if (act === 'export') {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `30dias-${todayKey()}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Ficheiro exportado ✅');
  } else if (act === 'archived') openArchived();
  else if (act === 'wipe') {
    const ok = await confirmBox('Apagar todos os dados?', get().cloud ? 'Vai apagar os hábitos e medalhas da tua conta, em todos os aparelhos. Exporta primeiro se quiseres uma cópia.' : 'Vai apagar todos os hábitos e medalhas deste aparelho. Exporta primeiro se quiseres uma cópia.', 'Apagar tudo', true);
    if (ok) { wipeAll(); toast('Dados apagados'); }
  } else if (act === 'install' && deferredInstall) {
    deferredInstall.prompt(); await deferredInstall.userChoice.catch(() => {}); deferredInstall = null; renderProfile();
  }
}

async function onChange(e) {
  const t = e.target;
  if (t.id === 'p-notif') {
    if (t.checked) {
      const r = await notif.enable();
      toast(r.msg, { type: r.ok ? 'info' : 'error', duration: 4500 });
    } else { await notif.disable(); toast('Lembretes desativados'); }
    renderProfile();
  } else if (t.name === 'theme') setTheme(t.value);
  else if (t.id === 'p-import' && t.files[0]) {
    const file = t.files[0]; t.value = '';
    if (file.size > 2_000_000) return toast('Ficheiro demasiado grande.', { type: 'error' });
    try {
      const data = parseImport(await file.text());
      const mode = await ask({
        title: `Importar ${data.habits.length} hábito(s)?`,
        text: 'Juntar mantém os teus hábitos atuais. Substituir apaga os atuais e fica só o que está no ficheiro.',
        buttons: [{ text: 'Juntar aos atuais', value: 'merge', kind: 'primary' }, { text: 'Substituir tudo', value: 'replace', kind: 'danger' }, { text: 'Cancelar', value: null, kind: 'ghost' }]
      });
      if (!mode) return;
      applyImport(data, mode);
      toast('Importação concluída ✅');
    } catch (err) { toast(err.message, { type: 'error' }); }
  }
}
