// Folhas (dialogs): criar/editar hábito, detalhe, arquivados, perguntas e medalhas.
import { $, esc, addDays, keyOf, fromKey, todayKey, toast, vibrate, fmtDate } from '../utils.js';
import { EMOJIS, COLORS } from '../constants.js';
import { ACH } from '../achievements.js';
import { get, addHabit, updateHabit, removeHabit, restoreHabit } from '../store.js';
import { currentStreak, bestStreak, challengeDone } from '../stats.js';
import { info as notifInfo, markSentIfPast } from '../notifications.js';
import { confetti } from './confetti.js';

// Fechar ao tocar fora da folha
export function wireDialogs() {
  ['habitDlg', 'detailDlg', 'listDlg', 'askDlg'].forEach((id) => {
    const d = $('#' + id);
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  });
}

/* ---------- Pergunta com botões ---------- */
// buttons: [{ text, value, kind: 'primary'|'danger'|'ghost' }] → devolve value (ou null)
export function ask({ title, text = '', buttons }) {
  return new Promise((resolve) => {
    const dlg = $('#askDlg');
    $('#ask-t').textContent = title;
    $('#ask-p').textContent = text;
    const box = $('#ask-b');
    box.replaceChildren();
    let result = null;
    buttons.forEach((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'btn ' + (b.kind || 'ghost');
      el.textContent = b.text;
      el.onclick = () => { result = b.value; dlg.close(); };
      box.append(el);
    });
    dlg.addEventListener('close', () => resolve(result), { once: true });
    dlg.showModal();
  });
}
export const confirmBox = (title, text, okText = 'Confirmar', danger = false) =>
  ask({ title, text, buttons: [{ text: okText, value: true, kind: danger ? 'danger' : 'primary' }, { text: 'Cancelar', value: null, kind: 'ghost' }] });

/* ---------- Criar / editar hábito ---------- */
let editing = null, sel = { emoji: EMOJIS[0], color: COLORS[0] };

function buildPickers() {
  const ep = $('#hf-emoji'), cp = $('#hf-color');
  ep.replaceChildren(); cp.replaceChildren();
  const mk = (parent, value, kind) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio');
    if (kind === 'emoji') { b.textContent = value; b.setAttribute('aria-label', 'Ícone ' + value); }
    else { b.style.setProperty('--c', value); b.setAttribute('aria-label', 'Cor ' + (COLORS.indexOf(value) + 1)); }
    const on = sel[kind] === value;
    b.setAttribute('aria-checked', on); b.classList.toggle('sel', on);
    b.onclick = () => {
      sel[kind] = value;
      [...parent.children].forEach((c) => { c.classList.toggle('sel', c === b); c.setAttribute('aria-checked', c === b); });
    };
    parent.append(b);
  };
  EMOJIS.forEach((e) => mk(ep, e, 'emoji'));
  COLORS.forEach((c) => mk(cp, c, 'color'));
}

export function openHabitForm(habit = null) {
  editing = habit;
  const dlg = $('#habitDlg');
  sel = habit ? { emoji: habit.emoji, color: habit.color } : { emoji: EMOJIS[0], color: COLORS[0] };
  // ícone/cor personalizados de dados antigos continuam a poder ser guardados
  if (habit && !EMOJIS.includes(habit.emoji)) EMOJIS.push(habit.emoji);
  if (habit && !COLORS.includes(habit.color)) COLORS.push(habit.color);
  $('#hf-title').textContent = habit ? 'Editar hábito' : 'Novo hábito';
  $('#hf-save').textContent = habit ? 'Guardar' : 'Criar hábito';
  $('#hf-name').value = habit ? habit.name : '';
  $('#hf-err').textContent = '';
  $('#hf-rem-on').checked = !!(habit && habit.reminder);
  $('#hf-rem').value = habit?.reminder || '20:00';
  syncReminderUI();
  buildPickers();
  dlg.showModal();
  if (!habit) setTimeout(() => $('#hf-name').focus(), 250);
}
function syncReminderUI() {
  const on = $('#hf-rem-on').checked;
  $('#hf-rem').hidden = !on;
  const i = notifInfo();
  $('#hf-rem-note').textContent = on && !i.enabled
    ? 'Para receberes o aviso, ativa as notificações em Perfil.' : '';
}
export function wireHabitForm() {
  $('#hf-rem-on').addEventListener('change', syncReminderUI);
  $('#hf-cancel').onclick = () => $('#habitDlg').close();
  $('#hf').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#hf-name').value.trim();
    if (!name) { $('#hf-err').textContent = 'Escreve um nome para o hábito.'; $('#hf-name').focus(); return; }
    const reminder = $('#hf-rem-on').checked ? $('#hf-rem').value || null : null;
    const data = { name, emoji: sel.emoji, color: sel.color, reminder };
    if (editing) {
      const h = updateHabit(editing.id, data);
      if (h) markSentIfPast(h);
      toast('Hábito atualizado ✅');
    } else {
      const h = addHabit(data);
      if (h) markSentIfPast(h);
      toast('Hábito criado! Dia 1 de 30 🚀');
    }
    $('#habitDlg').close();
  });
}

/* ---------- Detalhe (grelha de 30 dias) ---------- */
export function openDetail(id) {
  const h = get().habits.find((x) => x.id === id);
  if (!h) return;
  const tk = todayKey(), start = fromKey(h.created), el = $('#detail');
  let cells = '';
  for (let i = 0; i < 30; i++) {
    const k = keyOf(addDays(start, i));
    let cls = 'cell';
    if (h.done[k]) cls += ' done'; else if (k < tk) cls += ' miss'; else if (k > tk) cls += ' future';
    if (k === tk) cls += ' today';
    const state = h.done[k] ? 'cumprido' : k < tk ? 'falhado' : k === tk ? 'hoje' : 'futuro';
    cells += `<div class="${cls}" role="img" aria-label="Dia ${i + 1}: ${state}">${i + 1}</div>`;
  }
  const dc = challengeDone(h);
  el.style.setProperty('--c', h.color);
  el.innerHTML = `
    <div class="grabber"></div>
    <div class="d-head">
      <div class="habit-emoji" style="--c:${esc(h.color)}">${esc(h.emoji)}</div>
      <div><h3>${esc(h.name)}</h3><p class="muted">Desafio de 30 dias · começou ${esc(fmtDate(h.created))}${h.reminder ? ' · ⏰ ' + esc(h.reminder) : ''}</p></div>
    </div>
    <div class="d-stats">
      <div class="stat"><b>${currentStreak(h)}</b><span>Sequência 🔥</span></div>
      <div class="stat"><b>${bestStreak(h)}</b><span>Melhor</span></div>
      <div class="stat"><b>${Math.round((dc / 30) * 100)}%</b><span>${dc}/30</span></div>
    </div>
    <div class="grid30">${cells}</div>
    <div class="actions wrap">
      <button class="btn ghost" id="d-edit" type="button">✏️ Editar</button>
      <button class="btn ghost" id="d-arch" type="button">📦 ${h.archived ? 'Restaurar' : 'Arquivar'}</button>
      <button class="btn danger" id="d-del" type="button">🗑 Apagar</button>
      <button class="btn primary" id="d-close" type="button">Fechar</button>
    </div>`;
  const dlg = $('#detailDlg');
  $('#d-close').onclick = () => dlg.close();
  $('#d-edit').onclick = () => { dlg.close(); openHabitForm(h); };
  $('#d-arch').onclick = () => {
    updateHabit(h.id, { archived: !h.archived });
    dlg.close();
    toast(h.archived ? 'Hábito arquivado 📦' : 'Hábito restaurado ✅');
  };
  $('#d-del').onclick = () => { dlg.close(); deleteWithUndo(h); };
  dlg.showModal();
}

export async function deleteWithUndo(h) {
  const ok = await confirmBox(`Apagar "${h.name}"?`, 'Perdes o histórico deste hábito. Se só queres pausar, arquiva-o.', 'Apagar', true);
  if (!ok) return;
  const removed = removeHabit(h.id);
  if (removed) toast('Hábito apagado', { action: { text: 'Desfazer', run: () => restoreHabit(removed) }, duration: 6000 });
}

/* ---------- Arquivados ---------- */
export function openArchived() {
  const list = get().habits.filter((h) => h.archived);
  const body = $('#listBody');
  body.innerHTML = `<div class="grabber"></div><h3>Hábitos arquivados</h3>` + (list.length
    ? `<div class="rows">${list.map((h) => `
        <div class="row-item">
          <div class="habit-emoji" style="--c:${esc(h.color)}">${esc(h.emoji)}</div>
          <div class="grow"><b>${esc(h.name)}</b><p class="muted small">${bestStreak(h)} dias seguidos (melhor)</p></div>
          <button class="btn ghost sm" data-restore="${esc(h.id)}" type="button">Restaurar</button>
          <button class="btn danger sm" data-del="${esc(h.id)}" type="button" aria-label="Apagar ${esc(h.name)}">🗑</button>
        </div>`).join('')}</div>`
    : `<p class="muted">Não tens hábitos arquivados.</p>`) +
    `<div class="actions"><button class="btn primary" id="l-close" type="button">Fechar</button></div>`;
  const dlg = $('#listDlg');
  $('#l-close').onclick = () => dlg.close();
  body.onclick = async (e) => {
    const r = e.target.closest('[data-restore]'), d = e.target.closest('[data-del]');
    if (r) { updateHabit(r.dataset.restore, { archived: false }); toast('Hábito restaurado ✅'); openArchived(); }
    if (d) { const h = get().habits.find((x) => x.id === d.dataset.del); if (h) { await deleteWithUndo(h); openArchived(); } }
  };
  if (!dlg.open) dlg.showModal();
}

/* ---------- Medalha desbloqueada (fila) ---------- */
const queue = [];
let showing = false;
export function celebrate(ids) { queue.push(...ids); if (!showing) next(); }
function next() {
  const id = queue.shift();
  const a = ACH.find((x) => x.id === id);
  if (!a) { showing = false; return; }
  showing = true;
  const dlg = $('#unlockDlg');
  $('#ul-disc').style.setProperty('--m1', a.c1);
  $('#ul-disc').style.setProperty('--m2', a.c2);
  $('#ul-icon').textContent = a.icon;
  $('#ul-t').textContent = a.name;
  $('#ul-d').textContent = a.desc;
  dlg.showModal();
  vibrate([40, 60, 40, 60, 90]);
  confetti({ count: 140, power: 1.2, y: innerHeight * 0.4 });
  $('#ul-ok').onclick = () => dlg.close();
  dlg.addEventListener('close', () => { queue.length ? next() : (showing = false); }, { once: true });
}
