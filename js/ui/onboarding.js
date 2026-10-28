// Onboarding de 3 ecrãs (primeira abertura). Devolve 'account' ou 'local'.
import { $ } from '../utils.js';
import { KEYS } from '../constants.js';

const SLIDES = [
  { art: '<img src="icons/logo-mark.png" alt="D.AUGUSTO" class="ob-logo">', t: 'Bem-vindo ao 30 Dias', p: 'O desafio de 30 dias para transformares pequenas ações em hábitos que ficam.' },
  { art: '<div class="ob-demo" aria-hidden="true"><span class="ob-emoji">💧</span><b>Beber água</b><i class="ob-check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></i></div>', t: 'Marca todos os dias', p: 'Um toque por hábito. Vê a tua sequência crescer e não quebres a corrente.' },
  { art: '<div class="ob-medals" aria-hidden="true"><span>🔥</span><span>🏆</span><span>🌟</span></div>', t: 'Medalhas e sincronização', p: 'Ganha medalhas, recebe lembretes e guarda tudo na tua conta para usares em qualquer aparelho.' }
];

export function runOnboarding() {
  return new Promise((resolve) => {
    const el = $('#onboarding');
    let i = 0;
    el.hidden = false;
    el.innerHTML = `
      <div class="ob">
        <button class="ob-skip" id="ob-skip" type="button">Saltar</button>
        <div class="ob-track" id="ob-track">${SLIDES.map((s, n) => `
          <section class="ob-slide" aria-label="Passo ${n + 1} de 3">
            <div class="ob-art">${s.art}</div><h2 tabindex="-1">${s.t}</h2><p class="muted">${s.p}</p></section>`).join('')}</div>
        <div class="ob-dots" aria-hidden="true">${SLIDES.map(() => '<i></i>').join('')}</div>
        <div class="ob-actions" id="ob-actions"></div>
      </div>`;
    const finish = (r) => { try { localStorage.setItem(KEYS.onboarded, '1'); } catch { /* ignora */ } el.hidden = true; resolve(r); };
    const draw = () => {
      $('#ob-track').style.transform = `translateX(${-i * 100}%)`;
      el.querySelectorAll('.ob-slide').forEach((s, n) => { s.inert = n !== i; s.setAttribute('aria-hidden', n !== i); });
      el.querySelectorAll('.ob-dots i').forEach((d, n) => d.classList.toggle('on', n === i));
      $('#ob-skip').hidden = i === SLIDES.length - 1;
      const box = $('#ob-actions');
      box.replaceChildren();
      const mk = (txt, cls, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn block ' + cls; b.textContent = txt; b.onclick = fn; box.append(b); };
      if (i < SLIDES.length - 1) mk('Seguinte', 'primary', () => { i++; draw(); });
      else { mk('Criar conta', 'primary', () => finish('account')); mk('Usar sem conta', 'ghost', () => finish('local')); }
      el.querySelectorAll('.ob-slide h2')[i].focus({ preventScroll: true });
    };
    $('#ob-skip').onclick = () => finish('local');
    draw();
  });
}
