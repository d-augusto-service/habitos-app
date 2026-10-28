// Ecrã de login / registo / recuperar palavra-passe.
import { $, esc, toast } from '../utils.js';
import * as cloud from '../cloud.js';

export function closeAuth() { $('#auth').hidden = true; document.body.classList.remove('lock'); }
export function openAuth(mode = 'login') {
  $('#auth').hidden = false;
  document.body.classList.add('lock');
  render(mode);
}

const TITLES = { login: 'Entrar', register: 'Criar conta', reset: 'Recuperar palavra-passe' };
const SUBS = {
  login: 'Entra para sincronizar os teus hábitos em todos os aparelhos.',
  register: 'Guarda os teus hábitos na nuvem. Os que já tens neste aparelho não se perdem.',
  reset: 'Escreve o teu email e enviamos um link para criares uma nova palavra-passe.'
};

function render(mode) {
  const ok = cloud.isFirebaseConfigured();
  const el = $('#auth');
  el.innerHTML = `
    <div class="auth-wrap">
      <button class="icon-btn auth-x" id="au-x" type="button" aria-label="Fechar">✕</button>
      <img class="auth-logo" src="icons/logo-mark.png" alt="D.AUGUSTO">
      <h2 id="au-title" tabindex="-1">${TITLES[mode]}</h2>
      <p class="muted">${SUBS[mode]}</p>
      ${ok ? '' : '<p class="notice" role="note">O login ainda não está configurado. Cola as tuas chaves em <b>firebase-config.js</b> (ver LEIAME). Até lá, a app funciona em modo local.</p>'}
      <form id="au-form" novalidate>
        ${mode === 'register' ? '<label class="field"><span>Nome</span><input id="au-name" type="text" maxlength="40" autocomplete="name" placeholder="Como te chamas?"></label>' : ''}
        <label class="field"><span>Email</span><input id="au-email" type="email" inputmode="email" autocomplete="email" required placeholder="o.teu@email.com"></label>
        ${mode === 'reset' ? '' : `<label class="field"><span>Palavra-passe</span>
          <span class="pw"><input id="au-pass" type="password" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}" required minlength="${mode === 'register' ? 8 : 1}" placeholder="${mode === 'register' ? 'Mínimo 8 caracteres' : 'A tua palavra-passe'}">
          <button type="button" id="au-eye" aria-label="Mostrar palavra-passe" aria-pressed="false">👁</button></span></label>`}
        <p class="form-error" id="au-err" role="alert"></p>
        <p class="form-ok" id="au-ok" role="status"></p>
        <button class="btn primary block" id="au-submit" type="submit" ${ok ? '' : 'disabled'}>${mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Enviar link'}</button>
      </form>
      ${mode === 'reset' ? '' : `<div class="divider"><span>ou</span></div>
        <button class="btn google block" id="au-google" type="button" ${ok ? '' : 'disabled'}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.4z"/><path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0 0 12 23.5z"/><path fill="#FBBC05" d="M5.6 14.2a6.9 6.9 0 0 1 0-4.4v-3H1.8a11.5 11.5 0 0 0 0 10.4l3.8-3z"/><path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 0 0 1.8 6.8l3.8 3C6.5 7.4 9 5.4 12 5.4z"/></svg>
          Continuar com Google</button>`}
      <div class="auth-links">
        ${mode === 'login' ? '<button type="button" data-m="reset">Esqueci a palavra-passe</button><button type="button" data-m="register">Criar conta</button>' : ''}
        ${mode === 'register' ? '<button type="button" data-m="login">Já tenho conta</button>' : ''}
        ${mode === 'reset' ? '<button type="button" data-m="login">Voltar a entrar</button>' : ''}
        <button type="button" id="au-skip">Continuar sem conta</button>
      </div>
    </div>`;

  const err = (m) => { $('#au-err').textContent = m || ''; $('#au-ok').textContent = ''; };
  const busy = (v) => el.querySelectorAll('button, input').forEach((x) => { if (x.id !== 'au-x') x.disabled = v || (!ok && (x.id === 'au-submit' || x.id === 'au-google')); });
  $('#au-title').focus({ preventScroll: true });
  $('#au-x').onclick = $('#au-skip').onclick = closeAuth;
  el.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => render(b.dataset.m)));
  const eye = $('#au-eye');
  if (eye) eye.onclick = () => {
    const p = $('#au-pass'), show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    eye.setAttribute('aria-pressed', show); eye.setAttribute('aria-label', show ? 'Esconder palavra-passe' : 'Mostrar palavra-passe');
  };
  const g = $('#au-google');
  if (g) g.onclick = async () => {
    err(''); busy(true);
    try { if ((await cloud.signInGoogle()) === 'popup') { closeAuth(); toast('Sessão iniciada ✅'); } }
    catch (e) { err(cloud.describeError(e)); }
    busy(false);
  };

  $('#au-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#au-email').value.trim(), pass = $('#au-pass')?.value || '';
    if (!/^\S+@\S+\.\S+$/.test(email)) return err('Escreve um email válido.');
    if (mode === 'register' && pass.length < 8) return err('A palavra-passe deve ter pelo menos 8 caracteres.');
    if (mode === 'login' && !pass) return err('Escreve a palavra-passe.');
    err(''); busy(true);
    try {
      if (mode === 'login') { await cloud.signIn(email, pass); closeAuth(); toast('Bem-vindo de volta! 👋'); }
      else if (mode === 'register') { await cloud.signUp($('#au-name').value.trim(), email, pass); closeAuth(); toast('Conta criada! 🎉'); }
      else {
        try { await cloud.resetPassword(email); } catch (x) { if (x.code !== 'auth/user-not-found') throw x; }
        $('#au-ok').textContent = 'Se existir uma conta com esse email, enviámos um link. Vê também o spam.';
      }
    } catch (x) { err(cloud.describeError(x)); }
    busy(false);
  });
}
