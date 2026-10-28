// Medalhas e conquistas.
import { bestStreak, challengeDone, perfectDays } from './stats.js';

export const ACH = [
  { id: 'first',   icon: '🌱', name: 'Primeiro passo',     desc: 'Cria o teu primeiro hábito.',                       target: 1,  c1: '#7ee08a', c2: '#2e9e4f' },
  { id: 's3',      icon: '🔥', name: 'Aquecimento',        desc: '3 dias seguidos no mesmo hábito.',                  target: 3,  c1: '#ffb36b', c2: '#d9692b' },
  { id: 's7',      icon: '⚡', name: 'Uma semana!',        desc: '7 dias seguidos no mesmo hábito.',                  target: 7,  c1: '#e3e8f2', c2: '#8d97ad' },
  { id: 's14',     icon: '💪', name: 'Duas semanas',       desc: '14 dias seguidos no mesmo hábito.',                 target: 14, c1: '#9fd0ff', c2: '#3d7fd1' },
  { id: 's21',     icon: '🧠', name: 'Hábito a nascer',    desc: '21 dias seguidos no mesmo hábito.',                 target: 21, c1: '#d9b3ff', c2: '#8a4fd6' },
  { id: 's30',     icon: '👑', name: 'Mestre dos 30',      desc: '30 dias seguidos no mesmo hábito.',                 target: 30, c1: '#ffe27a', c2: '#e0a800' },
  { id: 'perfect', icon: '🌟', name: 'Dia perfeito',       desc: 'Cumpre todos os hábitos num só dia.',               target: 1,  c1: '#fff0a6', c2: '#f0b400' },
  { id: 'full30',  icon: '🏆', name: 'Desafio completo',   desc: 'Cumpre os 30 dias do desafio de um hábito.',        target: 30, c1: '#ffe27a', c2: '#d98c00' }
];
export const ACH_IDS = ACH.map((a) => a.id);

// Devolve { id: [atual, objetivo] } para todas as medalhas.
export function evaluate(habits, now = new Date()) {
  const maxBest = Math.max(0, ...habits.map(bestStreak));
  const maxDone = Math.max(0, ...habits.map(challengeDone));
  const out = {};
  for (const a of ACH) {
    let cur = 0;
    if (a.id === 'first') cur = habits.length ? 1 : 0;
    else if (a.id === 'perfect') cur = perfectDays(habits, now) > 0 ? 1 : 0;
    else if (a.id === 'full30') cur = maxDone;
    else cur = maxBest;
    out[a.id] = [Math.min(cur, a.target), a.target];
  }
  return out;
}
