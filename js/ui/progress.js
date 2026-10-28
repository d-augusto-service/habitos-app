// Separador "Progresso": estatísticas, calendário mensal e gráficos.
import { $, esc, keyOf, todayKey, toast } from '../utils.js';
import { WEEKDAYS } from '../constants.js';
import { get } from '../store.js';
import { active, byOrder, bestStreak, completionRate, dailySeries, dayStat, perfectDays, totalChecks } from '../stats.js';
import { openHabitForm } from './sheets.js';

let cal = new Date(); cal.setDate(1);

export function initProgress() {
  const v = $('#view-progress');
  v.innerHTML = `<div class="view-head"><h2 class="view-title" tabindex="-1">Progresso</h2></div><div id="p-body"></div>`;
  v.addEventListener('click', (e) => {
    const n = e.target.closest('[data-cal]');
    if (n && !n.disabled) { cal.setMonth(cal.getMonth() + Number(n.dataset.cal)); renderProgress(); }
    const c = e.target.closest('[data-day]');
    if (c) {
      const k = c.dataset.day, s = dayStat(get().habits, k);
      const d = new Date(k + 'T00:00:00');
      toast(`${d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}: ${s.done} de ${s.total} hábitos`);
    }
    if (e.target.closest('[data-new]')) openHabitForm();
  });
}

function chart(series) {
  const W = 300, H = 90, bw = W / series.length;
  const bars = series.map((d, i) => {
    const h = Math.max(d.ratio * 78, d.total ? 2 : 0);
    return `<rect class="cbar${d.key === todayKey() ? ' today' : ''}" x="${(i * bw + 1.5).toFixed(1)}" y="${(84 - h).toFixed(1)}" width="${(bw - 3).toFixed(1)}" height="${h.toFixed(1)}" rx="2"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Gráfico de cumprimento dos últimos 30 dias"><line x1="0" y1="84.5" x2="${W}" y2="84.5" class="axis"/>${bars}</svg>
    <div class="chart-labels"><span>há 30 dias</span><span>hoje</span></div>`;
}

export function renderProgress() {
  const S = get(), hs = active(S.habits).sort(byOrder), body = $('#p-body');
  if (S.loading) { body.innerHTML = '<div class="skel-block"></div><div class="skel-block tall"></div>'; return; }
  if (!hs.length) {
    body.innerHTML = `<div class="empty"><div class="empty-emoji" aria-hidden="true">📊</div><h3>Sem dados ainda</h3>
      <p>Cria um hábito e marca os dias: as estatísticas aparecem aqui.</p>
      <button class="btn primary" data-new type="button">Criar hábito</button></div>`;
    return;
  }
  const best = Math.max(0, ...hs.map(bestStreak));
  const now = new Date(), tk = todayKey();

  // calendário
  const y = cal.getFullYear(), m = cal.getMonth();
  const lead = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate();
  const isCurrent = y === now.getFullYear() && m === now.getMonth();
  let cells = '<span></span>'.repeat(lead);
  for (let d = 1; d <= dim; d++) {
    const k = keyOf(new Date(y, m, d)), s = dayStat(S.habits, k), future = k > tk;
    const lvl = future || !s.total ? 'l0' : s.ratio === 0 ? 'l0' : s.ratio < 0.5 ? 'l1' : s.ratio < 1 ? 'l2' : 'l3';
    cells += `<button type="button" class="cal-cell ${lvl}${k === tk ? ' today' : ''}" data-day="${k}" ${future ? 'disabled' : ''}
      aria-label="${d} de ${esc(cal.toLocaleDateString('pt-PT', { month: 'long' }))}: ${s.done} de ${s.total} hábitos">${d}</button>`;
  }

  // por hábito (últimos 30 dias)
  const rows = hs.map((h) => {
    let done = 0, days = 0;
    for (const d of dailySeries([h], 30)) if (d.total) { days++; done += d.done; }
    const p = days ? Math.round((done / days) * 100) : 0;
    return `<div class="row-item"><div class="habit-emoji sm" style="--c:${esc(h.color)}">${esc(h.emoji)}</div>
      <div class="grow"><div class="between"><b class="ellip">${esc(h.name)}</b><span class="muted small">${p}%</span></div>
      <div class="mini-bar" style="--c:${esc(h.color)}"><i style="width:${p}%"></i></div></div></div>`;
  }).join('');

  body.innerHTML = `
    <div class="stats-grid">
      <div class="card stat-card"><b>${completionRate(S.habits, 30)}%</b><span>Taxa de cumprimento (30 dias)</span></div>
      <div class="card stat-card"><b>${best}</b><span>Melhor sequência 🔥</span></div>
      <div class="card stat-card"><b>${perfectDays(S.habits)}</b><span>Dias perfeitos 🌟</span></div>
      <div class="card stat-card"><b>${totalChecks(S.habits)}</b><span>Dias cumpridos ✅</span></div>
    </div>
    <section class="card">
      <div class="card-head"><h3>Calendário</h3>
        <div class="cal-nav">
          <button type="button" class="icon-btn sm" data-cal="-1" aria-label="Mês anterior">‹</button>
          <span class="cal-title">${esc(cal.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }))}</span>
          <button type="button" class="icon-btn sm" data-cal="1" aria-label="Mês seguinte" ${isCurrent ? 'disabled' : ''}>›</button>
        </div></div>
      <div class="cal-week" aria-hidden="true">${WEEKDAYS.map((w) => `<span>${w}</span>`).join('')}</div>
      <div class="cal">${cells}</div>
      <div class="legend"><span><i class="l0"></i>0%</span><span><i class="l1"></i>&lt;50%</span><span><i class="l2"></i>&lt;100%</span><span><i class="l3"></i>100%</span></div>
    </section>
    <section class="card"><div class="card-head"><h3>Últimos 30 dias</h3></div>${chart(dailySeries(S.habits, 30))}</section>
    <section class="card"><div class="card-head"><h3>Por hábito</h3></div><div class="rows">${rows}</div></section>`;
}
