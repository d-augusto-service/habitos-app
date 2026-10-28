// ============================================================
//  CONFIGURAÇÃO DO FIREBASE  (único ficheiro que precisas de editar)
//  Onde obter estes valores: LEIAME.md → Passo 3.
//  Resumo: Firebase Console → ⚙ Definições do projeto → "As tuas apps"
//  → app Web (</>) → "Configuração do SDK" → copia cada valor para aqui.
//
//  NOTA: estes valores NÃO são segredos (qualquer site Firebase os mostra
//  no navegador). A segurança vem das regras do Firestore (firestore.rules).
// ============================================================

export const firebaseConfig = {
  apiKey: 'AIzaSyAecfGpdJ2K9T0ytaKWWUluVdV6aFObg2k',
  authDomain: 'habitos-30-dias-c587d.firebaseapp.com',
  projectId: 'habitos-30-dias-c587d',
  storageBucket: 'habitos-30-dias-c587d.firebasestorage.app',
  messagingSenderId: '872234133692',
  appId: '1:872234133692:web:203ccd970d17d07fd3c8b9'
};

// Chave VAPID (só para notificações push / FCM).
// Firebase Console → ⚙ Definições do projeto → Cloud Messaging →
// "Certificados push da Web" → "Gerar par de chaves" → copia a chave pública.
// Se deixares assim, a app usa apenas lembretes locais.
export const vapidKey = 'BKOD6hyshV7mcMFkzo7ToqV0SsuY4QTv87zDYDhYhY_mbI7uEWh7Oc_4mXhupTbz2-Vx-k-CpiDaYW0Tv2kxuzA';

// Ainda com os valores de exemplo? Então a app funciona só em modo local.
export const isFirebaseConfigured = () =>
  !firebaseConfig.apiKey.startsWith('COLE_AQUI') && !firebaseConfig.projectId.startsWith('O-TEU');
export const isPushConfigured = () => isFirebaseConfigured() && !vapidKey.startsWith('COLE_AQUI');
