# Ponte Solidária — configuração do Firebase

## Configuração inicial (5 minutos)

1. Abra **`js/firebase-config.js`**.
2. Acesse https://console.firebase.google.com e crie um projeto (ou use um
   que já tenha).
3. Em **Compilação > Authentication > Método de login**, ative
   **E-mail/senha**.
4. Em **Compilação > Firestore Database**, crie o banco (modo de produção
   ou teste — para o TCC, produção com as regras abaixo é o ideal).
5. Em **Configurações do projeto** (ícone de engrenagem) > role até
   **Seus apps** > clique no ícone **"</>"** (Web) > copie o objeto
   `firebaseConfig` gerado.
6. Cole os valores copiados nas chaves do objeto `firebaseConfig` dentro de
   `js/firebase-config.js`, substituindo os textos `"COLE_AQUI..."`.
7. Em **Firestore Database > Regras**, cole as regras da seção abaixo.

O site precisa ser aberto por um servidor web (Live Server, Firebase
Hosting, etc.) e não pelo `index.html` direto no navegador, pois usa
`fetch()` para montar as páginas e módulos ES (`type="module"`).

## Regras do Firestore recomendadas

**Estão no arquivo [`firestore.rules`](./firestore.rules) na raiz do projeto** —
esse arquivo é a única fonte de verdade; não há mais uma cópia colada aqui
no README (havia, em versões anteriores deste documento, e ela ficou
desatualizada mais de uma vez porque ninguém lembrava de editar os dois
lugares ao mesmo tempo). Publique de uma destas duas formas:

- **Console (mais simples):** abra `firestore.rules`, copie o conteúdo inteiro,
  cole em **Firestore Database > Regras** no Firebase Console e clique em
  **Publicar**.
- **Firebase CLI:** com o projeto configurado (`firebase init firestore`,
  usando o `firebase.json` já incluído aqui), rode `firebase deploy --only firestore:rules`.

⚠️ Enquanto essas regras não estiverem **publicadas** (não basta o arquivo
existir no projeto), o banco pode estar em modo teste/aberto — ou seja,
qualquer pessoa com a URL do projeto consegue ler ou escrever os dados
(inclusive CPF, CNPJ e endereço) sem estar logada. Confira em **Firestore
Database > Regras** no Console se o texto publicado bate com o do arquivo
`firestore.rules`, antes da apresentação.

Pontos que valem a pena destacar na apresentação:

- **`ehOngAprovada()`** é a checagem central de "ONG aprovada" (`role ==
  "ong"` e `approved == true`, com fallback para `status == "approved"` em
  documentos antigos) — usada tanto para `doacoes`/`pedidos` quanto para
  `campanhas`. Até uma rodada anterior desta revisão, `doacoes`/`pedidos`
  usavam `ehOng()` (sem checar aprovação): uma ONG com `approved == false`
  conseguia mediar direto pela API do Firestore, contornando a checagem que
  só existia no front-end (`requireOngAprovada()`, `js/doacoes.js`). Hoje as
  regras e o front-end exigem a mesma condição.
- **`/pedidos` deixou de ser legível por qualquer conta logada.** A regra
  antiga (`allow read: if estaLogado()`) permitia que qualquer usuário
  autenticado lesse o documento inteiro do pedido — nome completo da
  família, fotos, cidade, descrição — mesmo com a tela (`partials/sections/
  doacoes.html`) prometendo que o nome só fica visível para o solicitante,
  a ONG responsável e o administrador; essa promessa nunca foi garantida
  pelo banco, só pela renderização (`pedidoNomeExibicao()`). Agora `/pedidos`
  só é legível por quem tem motivo (`ehDono("solicitanteId")`,
  `ehDono("ongId")` ou `ehAdmin()`), e existe um espelho sanitizado,
  `/pedidos_publicos/{mesmoId}`, com só os campos sempre pensados para
  serem públicos (cidade, categoria, item, descrição, status) — nunca nome,
  fotos ou observação da ONG. `js/doacoes.js` grava os dois documentos na
  criação do pedido e mantém o espelho em dia a cada ação (aprovar, recusar,
  vincular, concluir); `pedidoParaExibicao()`/`pedidosVisiveis()` decidem
  qual versão mostrar conforme o que o Firestore realmente devolve para a
  conta logada. Limitação que ainda fica de fora, por exigir repensar a
  estrutura de mensagens (fora do escopo desta rodada): `/pedidos/{id}/
  mensagens` continua legível por qualquer ONG aprovada, não só pela
  responsável pelo pedido — o chat de um pedido ainda "pendente" (antes de
  alguma ONG assumir) não é isolado por ONG.
- **`auditoria_logs`** distingue dois tipos de registro pelo campo
  `origem`: entradas com `origem: "admin"` (aprovar ONG, bloquear/
  desbloquear usuário) só podem ser criadas por quem já é `role == "admin"`
  no Firestore — ninguém mais consegue gravar uma entrada dizendo "sou
  administrador e fiz X". O registro automático de ações comuns (doação
  aceita, pedido aprovado etc., disparado por qualquer usuário logado que
  participou da ação) continua sem essa exigência, porque sem um backend
  (Cloud Functions) não há como a regra confirmar que o autor da escrita é
  realmente quem ele diz ser — só o formato do documento é validado. Uma
  implementação de produção real moveria esse registro para uma Cloud
  Function acionada pelas próprias mudanças em `doacoes`/`pedidos`, o que
  fica fora do escopo deste TCC (sem servidor próprio).
- A mesma limitação de "só valida o formato, não a autenticidade de quem
  chama" vale para `notificacoes` e `historico_atividades`: a escrita
  precisa continuar aberta para qualquer conta logada, porque o site cria
  notificação/histórico em nome da *outra* pessoa envolvida na ação (ex.:
  o doador recebe uma notificação quando a ONG aceita mediar).

⚠️ Enquanto essas regras não estiverem **publicadas** (não basta o arquivo
existir no projeto), o banco pode estar em modo teste/aberto — ou seja,
qualquer pessoa com a URL do projeto consegue ler ou escrever os dados
(inclusive CPF, CNPJ e endereço) sem estar logada. Confira em **Firestore
Database > Regras** no Console se o texto publicado bate com o do arquivo
`firestore.rules`, antes da apresentação.

## Como o cadastro de ONG e o Admin funcionam

- O sistema tem **exatamente três perfis**: `person` (Pessoa), `ong`
  (ONG/Instituição mediadora) e `admin`. Não existe (nem nunca existiu de
  fato) um perfil `company`: a antiga "Área RSE/Empresas" era uma tela
  estática, sem link de menu funcional e sem integração com login/cadastro,
  e foi removida do sistema.
- Quem se cadastra escolhendo **"ONG / Instituição"** entra no Firestore
  (coleção `users`) com `role: "ong"`, `approved: false` e `blocked: false`
  (o campo antigo `status: "pending"` continua sendo gravado também, só por
  compatibilidade com telas que ainda o leem). Nesse estado, a ONG:
  - ✅ consegue fazer login e editar o próprio perfil normalmente;
  - ✅ consegue ver o próprio painel;
  - ❌ **não** aparece como opção de mediação para doadores;
  - ❌ **não** consegue aprovar/recusar pedidos, vincular doações ou avançar
    etapas de mediação (bloqueado em `js/doacoes.js`, função
    `requireOngAprovada()`).
  - Quando um administrador aprova em **Painel Adm > Moderação**
    (`js/admin.js`), o documento passa a `approved: true`, `blocked: false`,
    `status: "approved"` — e as ações acima são liberadas automaticamente,
    sem precisar de logout/login.
- Não existe opção de cadastro para o papel **"admin"** na tela pública
  (por segurança) — isso continua assim de propósito. Para se tornar
  administrador: crie sua conta normalmente, depois no **Firebase Console >
  Firestore > coleção `users` > seu documento**, edite o campo `role` de
  `"person"` para `"admin"`. Não existe (e não deve existir) fluxo ou tela
  no site para criar administradores.
- Para **bloquear** qualquer conta (pessoa, ONG ou, no futuro, outro
  administrador), o Painel Adm (aba "Painel Adm", tabela "Gestão e
  Moderação de Usuários") já tem um botão **Bloquear/Desbloquear** por
  usuário (`alternarBloqueioUsuario()`, `js/fase7-engine.js`), que grava
  `blocked: true`/`false` direto no Firestore e registra log de auditoria.
  O login passa a ser recusado automaticamente para contas bloqueadas
  (`isUsuarioBloqueado()` em `js/firebase-auth.js`). As regras do Firestore
  (`firestore.rules`) só permitem que `role == "admin"` altere o campo
  `blocked` de outra conta — não é mais preciso editar o Firebase Console
  para isso. (Esta observação estava desatualizada em relação ao código.)
- As três ONGs de exemplo do enunciado (Esperança, São Vicente, Casa do
  Bem) não vêm mais pré-cadastradas: como o sistema agora é 100% Firebase,
  crie cada uma delas cadastrando uma conta real como "ONG / Instituição"
  com esse nome e aprovando pelo Painel Adm — assim o fluxo fica igual ao
  de produção.

## O que já está 100% integrado ao Firestore

- **Login, cadastro e sessão** (`js/firebase-auth.js`).
- **Perfil do usuário** — Módulo 2 (`js/perfil.js`).
- **Módulo 3 — Doações** (`js/doacoes.js`): cadastro do item, escolha entre
  entrega direta ou mediação por ONG, aceite do beneficiário, chat real,
  confirmação de entrega, e todo o fluxo da ONG (aceitar mediação, marcar
  recebido, iniciar separação, marcar entregue, concluir). Barra de
  progresso com exatamente as etapas do enunciado:
  `Cadastro → ONG selecionada → Aguardando retirada → Recebida → Em
  separação → Entregue → Concluída` (mediação) e `Cadastro → Buscando
  beneficiário → Beneficiário aceitou → Combinando entrega → Entregue →
  Concluída` (direta). O histórico nunca é apagado — cada card guarda
  `history: [...]` com todas as mudanças de status.
  🔴 **Correção (item 8 da revisão — recusa de mediação):**
  `rejectOngDonation()` recusava a mediação sem pedir motivo e gravava só
  `trackingStatus: "Recusada"` — como toda tela do doador
  (`renderMyDonations()`) filtra estritamente por `trackingStatus === "Em
  andamento"`, a doação simplesmente sumia de qualquer lugar visível,
  presa no histórico do Firestore, sem o doador conseguir agir (o
  enunciado pede que ela "não desapareça" e volte para que ele escolha
  outra ONG, disponibilize direto ou cancele). Agora a ONG informa o
  motivo (`window.prompt`, mesmo padrão de `recusarPedido()`), e a doação
  volta para `trackingStatus: "Em andamento"` sem `ongId`/`ongName` — o
  que a reencaixa automaticamente em "Minhas doações", só que num estado
  "aguardando decisão" com três botões: **Escolher outra ONG** (abre
  `reescolher-ong-modal`, já excluindo instituições que recusaram antes —
  `donation.ongsRecusadas`), **Disponibilizar diretamente**
  (`tornarDoacaoDireta()`, muda `deliveryMethod` para `"direct"`) e
  **Cancelar doação** (fluxo já existente). O motivo fica em
  `donation.ultimaRecusa` e é mostrado no card e na notificação enviada ao
  doador. `firestore.rules` precisou mudar junto: `ongId`/`ongName`/
  `deliveryMethod` eram travados como imutáveis para qualquer update em
  `/doacoes` (`doacaoFixouImutaveis()`), o que bloquearia esse retorno ao
  banco mesmo já validado no front-end; agora só ficam travados pelo
  `hasOnly()` de cada função de ação que não deveria alterá-los, e três
  novas funções (`recusaPelaOng()`, `reescolheOngPeloDoador()`,
  `tornaDoacaoDiretaPeloDoador()`) autorizam exatamente essas três
  transições.
- **Módulo 4 — Pedidos de ajuda** (`js/doacoes.js`): qualquer pessoa
  cadastra um pedido (categoria, quantidade, urgência, descrição, fotos
  opcionais). A ONG pode **Aprovar**, **Recusar** (com motivo) ou **Pedir
  mais informações** (com pergunta) — o solicitante vê a resposta em "Meus
  pedidos". Depois de aprovado, a ONG usa **"Buscar doação compatível"**
  (automático, por categoria + cidade) e vincula o pedido a uma doação
  existente.
- **Chat real entre contas** (`js/chat.js` + `js/doacoes.js`): não existe
  mais nenhum contato fictício nem resposta automática simulada. Sempre
  que uma doação/pedido passa a ter as duas partes definidas — beneficiário
  aceitou uma doação direta, ONG aceitou mediar, ou ONG vinculou uma doação
  a um pedido — uma conversa de verdade é criada (ou reaberta) entre as
  duas contas, gravada no Firestore (`doacoes/{id}/mensagens` e
  `pedidos/{id}/mensagens`) e sincronizada em tempo real com `onSnapshot`.
  O botão "Abrir chat" aparece nos cards de Minhas Doações, no painel da
  ONG e nos pedidos assim que a conversa está liberada.
- **Central de notificações** (`js/fase6-engine.js`): o sino no cabeçalho
  passou a ser alimentado pela coleção `notificacoes` do Firestore, em
  tempo real (`onSnapshot`) — cada conta só vê as próprias notificações.
  Está integrada aos eventos do fluxo: doação aceita, ONG aceitou/recusou
  mediar, doação concluída, pedido aprovado/recusado/com pedido de mais
  informações, doação vinculada a um pedido e recebimento confirmado.
- **Campanhas em destaque** (Home e Portal de Doações,
  `renderCampanhasPublicas()` em `js/doacoes.js`): lidas da coleção
  `campanhas` em tempo real (`onSnapshot`), mostrando só campanhas com
  `status: "ativa"`. O cadastro de campanhas ainda é manual (ver "Ainda
  pendente" abaixo) — só a leitura/exibição foi migrada.

## Ainda pendente / limitações conhecidas

- **Acessibilidade — o que foi corrigido nesta rodada (item 40 da
  revisão) e o que ainda vale melhorar.** Corrigido: foco ao abrir/fechar
  todo modal do site + focus trap + Esc pra fechar (`js/a11y.js`,
  genérico pra todos os `.modal-backdrop`, sem precisar mexer nos
  handlers de abrir/fechar já existentes); `aria-labelledby` que faltava
  no modal de editar perfil; navegação por setas (padrão WAI-ARIA de
  tabs) + `role="tabpanel"`/`aria-controls` nas abas do Portal de Doações;
  mensagens de erro de formulário agora ligadas ao campo via
  `aria-describedby`/`aria-invalid` (`js/validacao.js`); contraste de
  `--color-success`, `--color-warning`, `--color-danger` e de
  `--color-text-on-primary` no modo escuro, que estavam abaixo de 4.5:1
  (WCAG AA) — o pior caso era o texto de botão primário no modo escuro,
  só 2.2:1. Ainda vale melhorar, fora do escopo desta rodada: uma
  auditoria completa de tamanho de texto/zoom em telas pequenas, e um
  teste real com leitor de tela (NVDA/VoiceOver) em todos os fluxos, não
  só nos modais e formulários revisados aqui.
- **Chat: conversas agora são recarregadas sozinhas depois de um F5.**
  `chatConversations` (`js/chat.js`) continua vivendo só na memória da aba,
  mas `reconectarTodasAsThreads()` (`js/doacoes.js`) roda em silêncio (sem
  abrir a janela) toda vez que `doacoes`/`pedidos` chegam do Firestore, e
  registra de novo — via os mesmos `openDoacaoChat`/`openPedidoChat`, agora
  com um segundo parâmetro `abrirJanela=false` — toda conversa elegível do
  usuário logado (onde ele é doador, beneficiário, ONG, solicitante ou ONG
  responsável). Antes, cada thread só nascia quando a pessoa clicava em
  "Abrir chat"/"Conversar..."; depois de um F5 o widget voltava vazio até
  navegar de novo até o card correspondente — nenhuma mensagem chegava a
  ser perdida (sempre esteve salva no Firestore), só a lista de conversas
  ativas não era reconstruída sozinha. Resolvido.
- **Integridade da auditoria sem backend.** As regras do Firestore (ver
  seção acima) já impedem que qualquer conta forje uma entrada de
  auditoria *administrativa* (`origem: "admin"`) em `auditoria_logs`. O
  registro automático de ações comuns — feito pelo próprio navegador de
  quem participou da ação, sem servidor no meio — continua tecnicamente
  falsificável por alguém disposto a chamar a API do Firestore direto
  (fora da interface do site), porque a regra só valida o formato do
  documento, não quem realmente agiu. Isso é uma limitação estrutural de
  qualquer app "só front-end + Firestore": a forma correta de fechar esse
  gap por completo é mover essas escritas para **Cloud Functions**
  (acionadas por gatilhos do Firestore ou por um endpoint HTTPS que roda
  no servidor da Google, não no navegador do usuário), o que está fora do
  escopo deste projeto. Vale a pena explicar essa distinção para a banca
  como uma limitação conhecida e justificada, não como um descuido.
- Doação financeira (PIX/cartão), rastreio de doação por código, a Área
  RSE/Empresas e o cadastro de doação física avulsa
  (`saveDonorPhysicalDonation`) foram removidos do sistema por não terem
  integração real (rodavam só em `localStorage`, num helper `store` que
  nem sequer existia mais no projeto, e/ou não tinham papel de usuário
  correspondente, e/ou não tinham nenhum formulário em `partials/` que os
  chamasse). Isso também corrige uma divergência real apontada na revisão
  (item 38): `privacidade.html` já dizia que `localStorage` é usado só
  para preferências/sessão, e agora isso é verdade também no código —
  não sobrou nenhuma escrita de dado de doação em armazenamento local.
- "Canal de denúncias" foi removido do Portal de Transparência: a página
  prometia esse fluxo, mas não havia nenhum formulário ou coleção no
  Firestore por trás. O card de segurança foi trocado por "Moderação
  administrativa", que descreve uma capacidade real já existente (o
  admin aprova ONGs e bloqueia contas — `js/fase7-engine.js`). Um canal
  de denúncias de verdade (formulário + coleção `denuncias` + fila de
  revisão no Painel Adm) fica para uma fase futura.
- **Aprovação de ONGs pela tela do Painel Adm.** Esta observação estava
  desatualizada: `js/fase7-engine.js` já usa a coleção/campos corretos
  (`users`/`role`/`approved`) e está incluído no `index.html`. O Painel
  Adm (aba "Painel Adm", visível só para `role: "admin"`) já lista ONGs
  pendentes e aprova de verdade pelo botão da tela — não precisa mais
  editar o Firebase Console para isso.
- 🔴 **Administrador não bloqueia mais a própria conta.** A lista
  "Usuários" do Painel Adm (`carregarUsuariosAdmin()`, `js/fase7-engine.js`)
  mostrava o botão "Bloquear" também na própria linha do admin logado —
  nada impedia ele de clicar e travar o próprio acesso. Agora essa linha
  mostra "(você)" no lugar do botão. Reforçado também em
  `firestore.rules` (`match /users/{userId}`): a conta que está sendo
  editada nunca pode alterar campo sensível (`role`/`approved`/
  `blocked`/`status`) nela mesma, mesmo sendo admin — só em uma conta de
  outra pessoa — fechando o mesmo caminho pela API do Firestore direto,
  fora da interface.
- **Estatísticas do topo do Painel Adm** (`admin-stat-usuarios`,
  `admin-stat-doacoes`, `admin-stat-campanhas` — `carregarEstatisticasAdmin()`
  em `js/fase7-engine.js`) mostram só números que alguma tela do site
  realmente produz: total de contas em `users`, total de documentos em
  `doacoes` e campanhas com `status: "ativa"`. O card antigo "Vendas
  Realizadas" foi removido de propósito: nenhuma parte do sistema grava
  um documento na coleção `vendas` (era lido em dois lugares —
  `js/admin.js` e aqui — mas nunca escrito em lugar nenhum), então o
  número ficaria travado em "0" para sempre e prometeria uma
  funcionalidade de venda que não existe. Se um módulo de vendas for
  implementado de verdade no futuro, é só trazer o card de volta.
- **`js/admin.js` ("Fase 5: Painel da ONG, Estoque e Campanhas") está
  órfão.** Nenhum dos elementos que ele procura no DOM
  (`stat-total-doacoes`, `ong-campanhas-list`, `ong-mediacao-tbody` etc.)
  existe nos `partials/` atuais — a tela para a qual ele foi escrito não
  faz mais parte do site, então essas funções rodam e retornam sem fazer
  nada (nenhum erro visível). Ele continua incluído no `index.html`
  porque `renderOngDashboardStats()` conserta o contador de entregas do
  Painel Adm-admin (usa `trackingStatus`, não `status`), mas o restante do
  arquivo (campanhas, mediação, estoque) é código morto — considere
  remover ou reescrever na próxima rodada.
- **Campanhas** já são lidas da coleção `campanhas` do Firestore em tempo
  real (`renderCampanhasPublicas()`, `js/doacoes.js`) e aparecem na Home e
  no Portal de Doações — sem mais data fixa no HTML. Agora também existe
  uma tela real de **cadastro**: qualquer ONG já aprovada vê o bloco
  "Minhas Campanhas" em Meu Perfil, com o botão "Nova Campanha"
  (`abrirModalNovaCampanha()`/`saveCampanha()`, `js/doacoes.js`), que grava
  o documento com `titulo`, `descricao`, `categoria`, `dataInicio`, `prazo`
  (data-limite — mesmo campo que `formatarPrazoCampanha()` já lia),
  `status` (`"ativa"` ao criar, `"encerrada"` pelo botão "Encerrar
  campanha") e `ongId`/`ongName`. As regras do Firestore
  (`firestore.rules`) só permitem que a própria ONG aprovada crie/edite a
  própria campanha (ou um admin). Ainda dá para cadastrar manualmente pelo
  Firebase Console se precisar, mas não é mais o único caminho.
  🔴 **Correção desta rodada:** a campanha tinha campos `meta`/`arrecadado`
  e uma barra "X% da meta arrecadada" — mas não existe, em nenhum lugar do
  sistema, uma forma real de fazer um aporte financeiro em uma campanha
  (não há doação em dinheiro, ver item abaixo), então `arrecadado` nascia
  e ficava travado em 0 para sempre, prometendo um progresso que nunca
  existia de verdade. A campanha agora é só um aviso de mobilização
  (título, categoria, descrição, prazo opcional); o botão do card virou
  "Quero doar" e leva para o fluxo normal de doação de item — mesmo
  cadastro (`openDonationWizard`/`finalizeDonationWizard`,
  `js/doacoes.js`) usado em qualquer doação do site, sem nenhum caminho
  "só de campanha". A opção "Financeiro" também saiu da lista de
  categorias da campanha, pelo mesmo motivo: nenhuma categoria de doação
  real do site é financeira.


- **Portal de Transparência — duas correções desta rodada.**
  1. *XSS na tabela "Histórico de entregas"*: `renderDeliveryHistory()`
     (`js/auth.js`) montava as linhas com `donorName`, `category`,
     `itemName`, `city`, `ongName` e `trackingStatus` direto em
     `innerHTML`, sem passar por `escapeHtml()` — um valor com HTML/script
     cadastrado num desses campos (ex.: nome do doador) seria interpretado
     como marcação real por qualquer visitante que abrisse a página, em
     vez de aparecer como texto. Todos os campos que vêm de dado
     cadastrado por usuário agora passam por `escapeHtml()`.
  2. *Transparência é pública, mas as leituras exigiam login*: o item de
     menu "Transparência" (`partials/layout/header.html`) nunca fica
     escondido atrás de login (diferente de "admin-only"), mas a página —
     e também os contadores de "Impacto em Tempo Real" da Home — liam
     direto de `doacoes`/`pedidos`/`users`/`campanhas`, todas com
     `allow read: if estaLogado()`. Um visitante sem login abria a tela e
     o Firestore recusava a leitura, deixando tudo vazio/"Carregando...".
     Resolvido pela opção B da revisão: criada a coleção pública
     `estatisticas_publicas` (documento `resumo`, só contagens agregadas
     — doações recebidas, entregas concluídas, ONGs aprovadas, famílias
     atendidas, **sem nome/cidade/endereço de ninguém**), de leitura livre
     para qualquer visitante (`allow read: if true` em `firestore.rules`).
     Toda conta logada que abre a Home ou a Transparência recalcula os
     números certos a partir das coleções de origem e regrava esse resumo
     (`renderImpactoHome()`, `js/fase7-engine.js`) — sem precisar de Cloud
     Functions, mesma limitação já aceita em outros pontos do projeto
     (uma conta logada mal-intencionada poderia gravar um número errado;
     nunca um vazamento de dado pessoal, que continua protegido nas
     coleções de origem). A tabela "Histórico de entregas" e a
     distribuição por categoria em "Resumo financeiro" continuam exigindo
     login — são as únicas partes com dado por doação — e agora mostram
     "Faça login para ver..." em vez de ficar presas em "Carregando..."
     indefinidamente.

Cada módulo ainda local segue o mesmo padrão usado em `doacoes.js` (uma
coleção no Firestore + `onSnapshot` para tempo real), então dá para migrar
aos poucos sem tocar no resto.

## Imagens (somente no chat)

Nenhum formulário do site aceita mais anexo de imagem (doação, pedido de
ajuda e foto de perfil foram removidos; o campo `photos` continua nos
documentos, sempre como lista vazia, para não alterar o formato dos dados).

Imagens só podem ser enviadas **dentro do chat**, como em apps de conversa:
botão de imagem ao lado do campo de texto, prévia com X antes de enviar,
legenda opcional, miniatura na bolha e, ao clicar, visualizador ampliado
(fecha no X, no Esc ou clicando fora). A imagem é reduzida no navegador
(JPEG, até 1280 px) e gravada como data URL no campo `image` do documento
da mensagem (`pedidos/{id}/mensagens` e `doacoes/{id}/mensagens`), sempre
abaixo do limite de 1 MiB do Firestore. Não precisa de Firebase Storage e
as `firestore.rules` continuam válidas sem alteração. Código em `js/chat.js`
(envio/visualizador), `js/doacoes.js` (gravação/leitura) e
`css/components/chat.css`.


## Validação de CNPJ (cadastro de ONG)

Além dos dígitos verificadores (que qualquer gerador de CNPJ acerta), o
cadastro agora consulta a Receita Federal via **BrasilAPI** (com
**CNPJ.ws** como reserva): o CNPJ precisa existir e estar com situação
**ATIVA**. Também é rejeitado o nº de ordem "0000". O resultado
(`cnpjVerificado`, `cnpjRazaoSocial`, `cnpjSituacao`) é salvo no perfil e
aparece no Painel Adm > ONGs para comparar com o nome informado. Se as duas
bases estiverem fora do ar, o cadastro segue como "não verificado" e o admin
confere à mão (a ONG continua pendente até ser aprovada). Código:
`js/validacao.js` (`consultarCNPJ`), `js/auth.js` e `js/firebase-auth.js`.
Atenção: a checagem roda no navegador; a aprovação manual do admin continua
sendo a barreira definitiva.

---

## Alterações desta versão

1. **Confirmação de e-mail removida** — o cadastro não envia mais link (`sendEmailVerification`), o login não mostra mais o aviso e o perfil não tem mais o selo "E-mail não confirmado". A checagem de *formato* do e-mail no cadastro continua.
2. **Chat por pessoa** — todas as doações/pedidos com a mesma pessoa aparecem na mesma conversa (com um separador de assunto); a aba "Histórico" foi removida. Novidades: *Apagar para todos* (só mensagem própria), *Apagar para mim* (qualquer mensagem), *Limpar histórico* e *Excluir conversa* (menu ⋯ na lista e no cabeçalho). Tudo isso vale só para quem apagou; a outra pessoa não é afetada.
   - **Publique o novo `firestore.rules`**: foram liberados os campos por-usuário `chatClearedAt` e `chatMsgHidden` em `/doacoes` e `/pedidos`.
3. **Pedidos sem aprovação da ONG** — o pedido nasce `aprovado` (sem ONG) e já aparece na aba Movimentação. A ONG só entra quando o doador escolhe *mediação da ONG*: aí a ONG aceita a mediação da doação e, se quiser, vincula a doação a um pedido aberto (é nesse momento que ela passa a ser a "ONG responsável" e o chat pedido↔ONG abre). Aprovar/recusar/pedir mais informações foi removido.
4. **Alterar senha removido** do perfil (modal, botão em Configurações e código).
