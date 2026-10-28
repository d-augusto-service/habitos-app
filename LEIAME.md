# 30 Dias · Rastreador de Hábitos (D.AUGUSTO)

PWA feita só com HTML, CSS e JavaScript (módulos ES). Sem frameworks, sem build.
Funciona **já** em modo local (sem Firebase). O Firebase acrescenta conta, sincronização e push.

## Ficheiros
| Ficheiro | Para quê |
|---|---|
| `index.html` | Estrutura dos ecrãs e diálogos |
| `css/style.css` | Visual, paleta da logo, animações, tema claro/escuro |
| `js/main.js` | Arranque, separadores, login, migração, service worker |
| `js/store.js` | Estado e gravação (localStorage ou Firestore), importar/exportar |
| `js/cloud.js` | Firebase: Authentication, Firestore, Cloud Messaging |
| `js/notifications.js` | Lembretes (push + locais) |
| `js/achievements.js`, `js/stats.js` | Medalhas e cálculos |
| `js/ui/*.js` | Ecrãs: Hoje, Progresso, Conquistas, Perfil, login, onboarding, folhas, confetes |
| `firebase-config.js` | **As tuas chaves do Firebase (único ficheiro a editar)** |
| `firestore.rules` | Regras de segurança do Firestore |
| `sw.js` | Offline, atualizações, push |
| `functions/` | Servidor **opcional** de lembretes push (Fase 2) |
| `icons/` | Ícones gerados a partir da logo (192, 512, maskable, apple-touch, favicon) |

Os dados antigos (chave `habitos30:v1`) são lidos e mantidos tal como estão.

---

## Passo 1 · Ver no VS Code
1. Abre a pasta no VS Code → instala a extensão **Live Server** → botão direito em `index.html` → **Open with Live Server**.
2. Tem de ser por servidor (não duplo clique), porque usa módulos ES.
3. Em `localhost` o service worker fica desligado de propósito (para veres sempre as alterações). Para testar offline localmente abre `.../index.html?sw=1`.

## Passo 2 · Criar o projeto no Firebase
1. Vai a https://console.firebase.google.com e entra com a conta Google.
2. **Criar um projeto** → dá um nome (ex.: `habitos-30-dias`) → podes desligar o Google Analytics → **Criar projeto**.

## Passo 3 · Colar as tuas chaves (firebase-config.js)
1. No projeto: ícone ⚙ (Definições do projeto) → separador **Geral** → secção **As tuas apps** → botão **</>** (Web).
2. Nome da app: `30 Dias` → **Registar app** (não precisas de Firebase Hosting).
3. Aparece um bloco `firebaseConfig = {...}`. Copia cada valor para o ficheiro **`firebase-config.js`**, nos campos com o mesmo nome:
   `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
4. Estes valores **não são segredos**; a segurança está nas regras do Firestore (Passo 5).

## Passo 4 · Ativar o login
1. Menu **Criação → Authentication** → **Começar**.
2. Separador **Método de início de sessão**:
   - **Email/palavra-passe** → ativar → Guardar.
   - **Google** → ativar → escolhe o email de suporte → Guardar.
3. Separador **Definições → Domínios autorizados** → **Adicionar domínio**:
   - `localhost` (normalmente já existe)
   - `TEU-UTILIZADOR.github.io` (só o domínio, sem `/habitos-app`)
   Sem isto o login falha com “domínio não autorizado”.
4. (Opcional) **Modelos de email** → **Redefinir palavra-passe**: muda o idioma para Português e personaliza.

## Passo 5 · Firestore (base de dados) e regras de segurança
1. **Criação → Firestore Database** → **Criar base de dados** → modo **produção** → escolhe uma região perto de ti (ex.: `eur3` ou `europe-west`) → Ativar.
2. Separador **Regras** → apaga tudo → cola o conteúdo de **`firestore.rules`** → **Publicar**.
   Resultado: cada utilizador só lê e escreve `users/{o-seu-uid}/...`. O resto está bloqueado.

## Passo 6 · Notificações (chave VAPID)
1. ⚙ Definições do projeto → separador **Cloud Messaging**.
2. Em **Configuração da Web → Certificados push da Web** → **Gerar par de chaves**.
3. Copia a **chave pública** para `vapidKey` em `firebase-config.js`.
4. Ler a secção “Limitações dos lembretes” abaixo: só isto **não** envia avisos com a app fechada.

## Passo 7 · Publicar no GitHub Pages
1. https://github.com → **New repository** → nome `habitos-app` → Public → Create.
2. **Add file → Upload files** → arrasta **o conteúdo** da pasta (index.html, css, js, icons, sw.js, manifest.json, firebase-config.js…) → Commit. (Ou com Git: `git init`, `git add .`, `git commit`, `git push`.)
3. **Settings → Pages** → Source: **Deploy from a branch** → Branch `main`, pasta `/ (root)` → Save.
4. Espera 1–2 minutos. O link será `https://TEU-UTILIZADOR.github.io/habitos-app/`.
5. Volta ao **Passo 4.3** e confirma que `TEU-UTILIZADOR.github.io` está nos domínios autorizados.

### Para publicar uma atualização
1. Altera os ficheiros.
2. Aumenta a versão em **`sw.js`** (`VERSION = '2.0.1'`) e em **`js/constants.js`** (`APP_VERSION`).
3. Faz upload/commit. Quem já tem a app vê “Nova versão disponível → Atualizar”.

---

## Limitações dos lembretes (a verdade)
- **Lembretes locais** (já incluídos): a app avisa à hora escolhida **enquanto está aberta ou em segundo plano**. Não existe forma fiável de agendar um aviso local com a app totalmente fechada.
- **Push com a app fechada** precisa de um servidor que envie a mensagem à hora certa. O Firebase Cloud Messaging, sozinho, só entrega mensagens; não as agenda. Por isso existe a **Fase 2** (opcional).
- **iPhone**: notificações só funcionam com a app **instalada no ecrã principal** (Safari → Partilhar → Adicionar ao ecrã principal) e iOS **16.4 ou superior**. No Safari normal não há notificações. Também não há vibração no iPhone.
- O push só é registado se estiveres com **conta** e a `vapidKey` preenchida.

### Fase 2 (opcional) · Servidor de lembretes
Requer o plano **Blaze** (cartão; o uso desta app cabe na quota gratuita) e o Node.js.
1. `npm install -g firebase-tools` → `firebase login`.
2. Na pasta do projeto: `firebase use --add` (escolhe o teu projeto).
3. `cd functions && npm install && cd ..`
4. `firebase deploy --only functions`
5. Firestore → **Índices → Exceções de campo único → Adicionar exceção**: coleção `habits`, campo `reminderUTC`, âmbito **Grupo de coleções**, Ascendente → Guardar.
6. Na app (com conta): Perfil → ligar lembretes. O aparelho fica registado e passa a receber push.
Nota: a hora é guardada em UTC com o fuso do momento em que gravas o hábito. Em países com mudança de hora, volta a guardar o hábito após a mudança.

## O que NÃO foi possível confirmar
- Testei a app inteira em modo local num Chromium simulado (criar, marcar, medalhas, editar, arquivar, apagar, exportar/importar, offline, notificações locais). **O login, o Firestore e o push reais não foram testados**, porque dependem das tuas chaves e de internet. Segue `TESTES.md` depois de configurar.
- Login com Google em app instalada no iPhone pode falhar (restrição do iOS). Alternativa: email/palavra-passe.
- Ao sair da conta, o aparelho volta ao modo local (vazio); os dados ficam na conta. Ao migrar, fica uma cópia de segurança no próprio aparelho (`habitos30:v1:backup-DATA`).

## Problemas comuns
| Sintoma | Solução |
|---|---|
| “Domínio não autorizado” | Passo 4.3 |
| “Sem permissão no Firestore” | Publicar `firestore.rules` (Passo 5) |
| Ecrã em branco no Live Server | Abrir por servidor, não duplo clique |
| Alterações não aparecem no telemóvel | Aumentar `VERSION` em `sw.js` |
| “O login ainda não está configurado” | Preencher `firebase-config.js` |
