// Separador "Hoje": resumo, semana e lista de hábitos (atualiza só o que mudou).
import { $, addDays, keyOf, todayKey, toast, vibrate } from '../utils.js';
import { QUOTES, WEEKDAYS, WEEKDAYS_LONG } from '../constants.js';
import { get, toggleDay } from '../store.js';
import { active, byOrder, currentStreak, challengeDone, dayStat } from '../stats.js';
import { confetti } from './confetti.js';
import { openHabitForm, openDetail } from './sheets.js';

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

export function initToday() {
  $('#view-today').innerHTML = `
    <div class="view-head">
      <div><p class="date" id="t-date"></p><h2 class="view-title" id="t-greeting" tabindex="-1"></h2></div>
      <span class="chip" id="t-streak"></span>
    </div>
    <section class="card hero" aria-label="Resumo de hoje">
      <div class="ring" id="t-ring" role="img" aria-label="Progresso de hoje">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-bg" cx="60" cy="60" r="52"/><circle class="ring-fg" id="t-ringfg" cx="60" cy="60" r="52"/></svg>
        <span class="ring-text" id="t-pct">0%</span>
      </div>
      <div class="hero-info"><h3 id="t-title"></h3><p id="t-sub"></p><p class="quote" id="t-quote"></p></div>
    </section>
    <section class="card">
      <div class="card-head"><h3>Esta semana</h3></div>
      <div class="week" id="t-week"></div>
    </section>
    <section>
      <div class="card-head plain"><h3>Os teus hábitos</h3><span class="muted" id="t-count"></span></div>
      <div id="t-skel" class="list" hidden>${'<div class="skel-row"><i></i><div><b></b><b></b></div></div>'.repeat(3)}</div>
      <div id="t-list" class="list"></div>
      <div id="t-empty" class="empty" hidden>
        <div class="empty-emoji" aria-hidden="true">🌱</div>
        <h3>Ainda sem hábitos</h3>
        <p>Escolhe um hábito pequeno e cumpre-o durante 30 dias.</p>
        <button class="btn primary" id="t-add2" type="button">Criar o primeiro hábito</button>
      </div>
    </section>`;
  const week = $('#t-week');
  for (let i = 0; i < 7; i++) week.insertAdjacentHTML('beforeend', '<div class="day" role="img"><div class="bar-wrap"><div class="bar"></div></div><span></span></div>');

  $('#t-add2').onclick = () => openHabitForm();
  $('#t-list').addEventListener('click', (e) => {
    const t = e.target.closest('[data-toggle]');
    if (t) return onToggle(t.dataset.toggle, t);
    const o = e.target.closest('[data-open]');
    if (o) openDetail(o.dataset.open);
  });
}

function onToggle(id, btn) {
  const tk = todayKey();
  const nowDone = toggleDay(id, tk);
  if (nowDone) {
    vibrate(25);
    btn.classList.remove('burst'); void btn.offsetWidth; btn.classList.add('burst');
    const r = btn.getBoundingClientRect();
    confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, count: 26, power: 0.55 });
    const hs = active(get().habits);
    if (hs.length && hs.every((h) => h.done[tk])) { confetti({ count: 120 }); toast('🎉 Dia perfeito! Todos os hábitos cumpridos.'); }
  } else vibrate(10);
}

/* ---------- Linhas da lista ---------- */
function createRow(h, i) {
  const row = document.createElement('div');
  row.className = 'habit enter';
  row.id = 'h-' + h.id;
  row.style.animationDelay = Math.min(i, 8) * 45 + 'ms';
  row.innerHTML = `
    <div class="habit-emoji" data-f="emoji"></div>
    <button class="habit-main" type="button" data-open="${h.id}">
      <div class="habit-name" data-f="name"></div>
      <div class="habit-meta"><span data-f="streak"></span><span data-f="prog"></span><span data-f="rem"></span></div>
      <div class="mini-bar"><i></i></div>
    </button>
    <button class="check" type="button" data-toggle="${h.id}">${CHECK}</button>`;
  row.addEventListener('animationend', () => row.classList.remove('enter'), { once: true });
  return row;
}
function updateRow(row, h, tk) {
  const done = !!h.done[tk], s = currentStreak(h), dc = challengeDone(h);
  const q = (f) => row.querySelector(`[data-f="${f}"]`);
  row.classList.toggle('done', done);
  row.style.setProperty('--c', h.color);
  q('emoji').textContent = h.emoji;           // textContent: seguro contra XSS
  q('name').textContent = h.name;
  q('streak').textContent = `🔥 ${s} ${s === 1 ? 'dia' : 'dias'}`;
  q('prog').textContent = `${dc}/30`;
  q('rem').textContent = h.reminder ? `⏰ ${h.reminder}` : '';
  row.querySelector('.mini-bar i').style.width = Math.round((dc / 30) * 100) + '%';
  const c = row.querySelector('.check');
  c.setAttribute('aria-pressed', done);
  c.setAttribute('aria-label', `${h.name}: ${done ? 'cumprido hoje. Toca para desmarcar' : 'marcar como cumprido hoje'}`);
}

export function renderToday() {
  const S = get(), now = new Date(), tk = todayKey();
  const hs = active(S.habits).sort(byOrder);
  const total = hs.length, done = hs.filter((h) => h.done[tk]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const hr = now.getHours();

  $('#t-date').textContent = now.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#t-greeting').textContent = hr < 12 ? 'Bom dia 👋' : hr < 19 ? 'Boa tarde 👋' : 'Boa noite 🌙';
  $('#t-pct').textContent = pct + '%';
  $('#t-ringfg').style.strokeDashoffset = 326.7 * (1 - pct / 100);
  $('#t-ring').setAttribute('aria-label', `Progresso de hoje: ${pct}%`);
  $('#t-title').textContent = !total ? 'Vamos começar' : pct === 100 ? 'Dia completo! 🎉' : 'Hoje';
  $('#t-sub').textContent = !total ? 'Cria o teu primeiro hábito' : `${done} de ${total} hábitos cumpridos`;
  $('#t-quote').textContent = '“' + QUOTES[now.getDate() % QUOTES.length] + '”';
  $('#t-count').textContent = total ? `${total} ${total === 1 ? 'hábito' : 'hábitos'}` : '';
  const best = hs.reduce((m, h) => Math.max(m, currentStreak(h)), 0);
  $('#t-streak').textContent = '🔥 ' + best;
  $('#t-streak').setAttribute('aria-label', `Melhor sequência atual: ${best} dias`);

  // semana
  [...$('#t-week').children].forEach((el, idx) => {
    const d = addDays(now, idx - 6), k = keyOf(d), st = dayStat(S.habits, k), p = Math.round(st.ratio * 100);
    el.classList.toggle('today', k === tk);
    el.setAttribute('aria-label', `${WEEKDAYS_LONG[d.getDay()]}: ${st.done} de ${st.total} hábitos`);
    el.querySelector('span').textContent = WEEKDAYS[d.getDay()];
    el.querySelector('.bar').style.height = p + '%';
  });

  // estados: a carregar / vazio / lista
  $('#t-skel').hidden = !S.loading;
  $('#t-empty').hidden = S.loading || total > 0;
  const list = $('#t-list');
  list.hidden = S.loading;
  if (S.loading) return;

  const existing = new Map([...list.children].map((el) => [el.id, el]));
  const keep = new Set();
  hs.forEach((h, i) => {
    const id = 'h-' + h.id;
    let row = existing.get(id);
    if (!row) row = createRow(h, i);
    updateRow(row, h, tk);
    keep.add(id);
    if (list.children[i] !== row) list.insertBefore(row, list.children[i] || null);
  });
  existing.forEach((el, id) => !keep.has(id) && el.remove());
}
