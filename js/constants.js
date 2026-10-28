// Constantes partilhadas por toda a app.
export const APP_VERSION = '2.0.0'; // mantém igual a VERSION em sw.js

// Chaves do localStorage. A chave "habitos30:v1" é a original: não mudar!
export const KEYS = {
  habits: 'habitos30:v1',
  ach: 'habitos30:ach',
  theme: 'habitos30:theme',
  onboarded: 'habitos30:onboarded',
  notif: 'habitos30:notif',
  notified: 'habitos30:notified',
  account: 'habitos30:hasAccount',
  push: 'habitos30:pushToken'
};

export const EMOJIS = ['💧', '📖', '🏃', '🧘', '🥗', '😴', '✍️', '💪', '🎯', '🧠', '🙏', '💻', '🚶', '🎸', '🧹', '🦷', '🌅', '🍎', '📵', '💰'];
export const COLORS = ['#F6C026', '#FF8A3D', '#FF5D73', '#C77DFF', '#4D9DFF', '#27D3C3', '#4ADE80', '#A3E635'];
export const QUOTES = [
  'Pequenos passos todos os dias levam longe.',
  'A disciplina vence a motivação.',
  'Não quebres a corrente.',
  'Hoje é um bom dia para continuar.',
  'Consistência vale mais que intensidade.',
  'Cada dia cumprido é um voto no que queres ser.',
  'Começa pequeno. Continua sempre.'
];
export const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const WEEKDAYS_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
