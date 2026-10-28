// Separador "Conquistas": medalhas bloqueadas e desbloqueadas.
import { $, esc, fmtDate } from '../utils.js';
import { ACH, evaluate } from '../achievements.js';
import { get } from '../store.js';

export function initAchievements() {
  $('#view-achievements').innerHTML = `<div class="view-head"><h2 class="view-title" tabindex="-1">Conquistas</h2></div><div id="a-body"></div>`;
}
export function renderAchievements() {
  const S = get(), prog = evaluate(S.habits);
  const got = ACH.filter((a) => S.ach[a.id]).length;
  $('#a-body').innerHTML = `
    <section class="card hero-ach">
      <div class="between"><h3>${got} de ${ACH.length} medalhas</h3><span class="chip">🏅</span></div>
      <div class="mini-bar big"><i style="width:${Math.round((got / ACH.length) * 100)}%"></i></div>
      <p class="muted small">Cumpre os teus hábitos para desbloquear todas.</p>
    </section>
    <ul class="medals">${ACH.map((a) => {
      const on = !!S.ach[a.id], [cur, tgt] = prog[a.id];
      return `<li class="medal ${on ? 'on' : 'off'}" style="--m1:${a.c1};--m2:${a.c2}">
        <div class="medal-disc" aria-hidden="true"><span>${a.icon}</span>${on ? '' : '<i class="lock">🔒</i>'}</div>
        <h4>${esc(a.name)}<span class="sr-only"> — ${on ? 'desbloqueada' : 'bloqueada'}</span></h4>
        <p>${esc(a.desc)}</p>
        ${on ? `<small>Desbloqueada em ${esc(fmtDate(S.ach[a.id]))}</small>`
             : `<div class="mini-bar"><i style="width:${Math.round((cur / tgt) * 100)}%"></i></div><small>${cur}/${tgt}</small>`}
      </li>`;
    }).join('')}</ul>`;
}
