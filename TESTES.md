# O que testar no telemóvel

Faz estes testes na app **publicada** (GitHub Pages, HTTPS), não no computador. Marca cada linha.

## Android (Chrome)
**Instalação e aspeto**
- [ ] Abrir o link → menu ⋮ → “Instalar aplicação”. O ícone no ecrã inicial mostra a logo **DA** dourada em fundo azul-marinho.
- [ ] O ícone não fica cortado de forma feia (versão maskable) em ícones redondos e quadrados.
- [ ] Ao abrir pelo ícone: splash com a logo, depois onboarding (3 ecrãs) na primeira vez.
- [ ] Barra de estado azul-marinho; sem barra do navegador (modo app).

**Hábitos**
- [ ] Criar hábito (nome, ícone, cor). Aparece na lista com animação.
- [ ] Marcar o dia: vibra, confete, anel sobe. Desmarcar funciona.
- [ ] Editar (nome, ícone, cor, hora do lembrete), arquivar, restaurar, apagar e “Desfazer”.
- [ ] Medalhas: “Primeiro passo” ao criar o 1.º hábito; “Dia perfeito” ao cumprir todos. Aparece o ecrã com animação.
- [ ] Separadores Hoje / Progresso / Conquistas / Perfil, e o botão “voltar” do Android mantém-se coerente.
- [ ] Tema Automático / Claro / Escuro.

**Offline**
- [ ] Abrir a app uma vez com internet. Ativar modo avião e fechar/abrir a app: continua a abrir e a marcar hábitos.

**Conta e sincronização** (depois de configurares o Firebase)
- [ ] Criar conta com email/palavra-passe. Sair e entrar de novo.
- [ ] “Esqueci a palavra-passe”: chega o email (vê o spam).
- [ ] Entrar com Google.
- [ ] Se tinhas hábitos no modo local: aparece “Juntar à conta?”. Depois de aceitar, os hábitos continuam lá.
- [ ] Segundo aparelho (ou outro navegador) com a mesma conta: os hábitos aparecem; marcar num lado atualiza no outro em segundos.
- [ ] Modo avião: marcar um hábito → o chip diz “Offline”. Desligar o modo avião → passa a “Sincronizado” e o outro aparelho recebe.

**Notificações**
- [ ] Perfil → ligar “Lembretes diários” → aceitar a permissão → “Enviar notificação de teste” aparece.
- [ ] Hábito com lembrete daqui a 2 minutos, app aberta ou em segundo plano: chega o aviso.
- [ ] Com a app **fechada**: só chega se tiveres ativado a Fase 2 (servidor). Sem ela, **não chega** (é uma limitação, não um erro).

**Exportar / importar**
- [ ] Exportar cria um ficheiro `.json`. Importar o mesmo ficheiro (Juntar) não duplica hábitos.
- [ ] Importar um ficheiro que não é JSON mostra uma mensagem clara.

**Atualização**
- [ ] Depois de publicares uma nova versão (VERSION nova no `sw.js`), ao reabrir a app aparece “Nova versão disponível” → Atualizar.

## iPhone (Safari, iOS 16.4 ou superior)
- [ ] Abrir o link no **Safari** → Partilhar → “Adicionar ao ecrã principal”. O ícone mostra a logo.
- [ ] Abrir pelo ícone (não pelo Safari): splash, onboarding, app em ecrã inteiro.
- [ ] Hábitos, medalhas, temas e offline como no Android.
- [ ] Vibração: o Safari do iPhone **não suporta** vibração (a app simplesmente não vibra). Normal.
- [ ] Notificações: só aparecem opções depois de a app estar instalada no ecrã principal. Perfil → ligar lembretes → aceitar a permissão → teste.
- [ ] Login com Google: se a janela falhar ou voltar sem entrar, usa email/palavra-passe (limitação do iOS em apps instaladas).
- [ ] Se limpares dados do Safari / apagares a app, os dados **locais** perdem-se; os da conta ficam na nuvem.
