// SERVIDOR OPCIONAL de lembretes push (Fase 2 do LEIAME).
// Corre todos os minutos, encontra hábitos com lembrete a essa hora (em UTC)
// que ainda não foram cumpridos hoje e envia uma notificação push (FCM)
// para os aparelhos registados do utilizador.
// Requer o plano Blaze do Firebase (tem quota gratuita generosa).
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const DEAD = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];

exports.enviarLembretes = onSchedule(
  { schedule: 'every 1 minutes', timeZone: 'UTC', region: 'europe-west1' },
  async () => {
    const now = new Date();
    const hhmm = now.toISOString().slice(11, 16); // "HH:MM" em UTC
    const snap = await db.collectionGroup('habits').where('reminderUTC', '==', hhmm).get();

    for (const doc of snap.docs) {
      const h = doc.data();
      if (h.archived) continue;
      const uid = doc.ref.parent.parent.id;

      // data local do utilizador (para saber se já cumpriu hoje)
      const local = new Date(now.getTime() + (h.tzOffsetMin || 0) * 60000);
      const key = local.toISOString().slice(0, 10);
      if (h.done && h.done[key]) continue;

      const devs = await db.collection(`users/${uid}/devices`).get();
      const tokens = devs.docs.map((d) => d.data().token).filter(Boolean);
      if (!tokens.length) continue;

      const res = await admin.messaging().sendEachForMulticast({
        tokens,
        data: { title: `${h.emoji || '🎯'} ${h.name}`, body: 'Hora de cumprir o teu hábito de hoje!', tag: 'hab-' + doc.id, url: './' }
      });
      // limpa aparelhos que já não existem
      await Promise.all(res.responses.map((r, i) =>
        !r.success && r.error && DEAD.includes(r.error.code)
          ? db.doc(`users/${uid}/devices/${devs.docs[i].id}`).delete() : null));
    }
  }
);
