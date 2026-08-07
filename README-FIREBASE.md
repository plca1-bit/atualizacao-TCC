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

Cole em **Firestore Database > Regras** e publique:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function estaLogado() {
      return request.auth != null;
    }
    function ehDono(campo) {
      return estaLogado() && request.auth.uid == resource.data[campo];
    }
    function dadosDoUsuarioLogado() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    function ehOng() {
      return estaLogado() && dadosDoUsuarioLogado().role == "ong";
    }
    function ehAdmin() {
      return estaLogado() && dadosDoUsuarioLogado().role == "admin";
    }

    // Fase 1: impede que o próprio usuário altere papel, aprovação ou
    // bloqueio da própria conta — só um administrador pode mudar esses
    // campos (aprovar ONG, bloquear usuário etc.). "status" também é
    // protegido aqui porque ainda é lido por telas antigas em paralelo
    // com "approved"/"blocked".
    function alterouCampoSensivel() {
      return request.resource.data.role != resource.data.role
        || request.resource.data.get('approved', null) != resource.data.get('approved', null)
        || request.resource.data.get('blocked', null) != resource.data.get('blocked', null)
        || request.resource.data.get('status', null) != resource.data.get('status', null);
    }

    // Perfis públicos (nome, cidade, papel etc.)
    match /users/{userId} {
      allow read: if estaLogado();
      allow create: if estaLogado() && request.auth.uid == userId;
      allow update: if estaLogado() && (
        ehAdmin() || (request.auth.uid == userId && !alterouCampoSensivel())
      );
    }

    // Módulo 3 — Doações
    match /doacoes/{doacaoId} {
      allow read: if estaLogado();
      allow create: if estaLogado() && request.resource.data.donorId == request.auth.uid;
      allow update: if estaLogado() && (
        ehDono("donorId") || ehDono("ongId") || ehDono("beneficiaryId") ||
        request.resource.data.beneficiaryId == request.auth.uid || ehOng()
      );
    }

    // Módulo 4 — Pedidos de ajuda
    match /pedidos/{pedidoId} {
      allow read: if estaLogado();
      allow create: if estaLogado() && request.resource.data.solicitanteId == request.auth.uid;
      allow update: if estaLogado() && (ehDono("solicitanteId") || ehOng());

      // Fase 3 — Chat vinculado ao pedido. Só o solicitante do pedido e
      // ONGs (que fazem a mediação) leem/enviam mensagens; ninguém edita
      // ou apaga uma mensagem já enviada (rastro de conversa preservado).
      match /mensagens/{mensagemId} {
        allow read: if estaLogado() && (
          get(/databases/$(database)/documents/pedidos/$(pedidoId)).data.solicitanteId == request.auth.uid || ehOng()
        );
        allow create: if estaLogado() && request.resource.data.senderId == request.auth.uid && (
          get(/databases/$(database)/documents/pedidos/$(pedidoId)).data.solicitanteId == request.auth.uid || ehOng()
        );
        allow update, delete: if false;
      }
    }
  }
}
```

> **Nota (Fase 1):** por enquanto, `ehOng()` continua liberando `doacoes`/`pedidos`
> para qualquer conta com `role == "ong"`, aprovada ou não — a regra que
> bloqueia ONGs ainda não aprovadas de mediar (`approved == false`) está
> implementada no **front-end** (`requireOngAprovada()` em `js/doacoes.js`).
> Reforçar essa mesma checagem diretamente nas regras do Firestore (defesa em
> profundidade) fica para uma fase futura dedicada ao Módulo de Doações, para
> não alterar as regras desse módulo fora do escopo combinado nesta fase.

## Como o cadastro de ONG e o Admin funcionam

- O sistema tem **exatamente três perfis**: `person` (Pessoa), `ong`
  (ONG/Instituição — inclui empresas parceiras de excedente/RSE) e `admin`.
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
  administrador), edite o documento em `users` no Firebase Console e defina
  `blocked: true`. O login passa a ser recusado automaticamente
  (`isUsuarioBloqueado()` em `js/firebase-auth.js`). Ainda não existe botão
  de bloqueio no Painel Adm para usuários em geral (só a moderação de
  ONGs pendentes) — fica para uma fase futura que trate a interface do
  Painel Adm.
- As três ONGs de exemplo do enunciado (Esperança, São Vicente, Casa do
  Bem) não vêm mais pré-cadastradas: como o sistema agora é 100% Firebase,
  crie cada uma delas cadastrando uma conta real como "ONG / Instituição"
  com esse nome e aprovando pelo Painel Adm — assim o fluxo fica igual ao
  de produção.

## O que já está 100% integrado ao Firestore

- **Login, cadastro e sessão** (`js/firebase-auth.js`).
- **Perfil do usuário** — Módulo 2 (`js/perfil.js`).
- **Módulo 3 — Doações** (`js/doacoes.js`): cadastro do item, escolha entre
  entrega direta ou mediação por ONG, aceite do beneficiário, chat,
  confirmação de entrega, e todo o fluxo da ONG (aceitar mediação, marcar
  recebido, iniciar separação, marcar entregue, concluir). Barra de
  progresso com exatamente as etapas do enunciado:
  `Cadastro → ONG selecionada → Aguardando retirada → Recebida → Em
  separação → Entregue → Concluída` (mediação) e `Cadastro → Buscando
  beneficiário → Beneficiário aceitou → Combinando entrega → Entregue →
  Concluída` (direta). O histórico nunca é apagado — cada card guarda
  `history: [...]` com todas as mudanças de status.
- **Módulo 4 — Pedidos de ajuda** (`js/doacoes.js`): qualquer pessoa
  cadastra um pedido (categoria, quantidade, urgência, descrição, fotos
  opcionais). A ONG pode **Aprovar**, **Recusar** (com motivo) ou **Pedir
  mais informações** (com pergunta) — o solicitante vê a resposta em "Meus
  pedidos". Depois de aprovado, a ONG usa **"Buscar doação compatível"**
  (automático, por categoria + cidade) e vincula o pedido a uma doação
  existente.
- **Moderação de ONGs** (`js/admin.js`): aprovar/rejeitar ONGs agora lê e
  grava direto na coleção `users` do Firestore.

## O que ainda está no armazenamento local (próxima etapa)

Ficaram de fora desta rodada por não estarem no escopo pedido (login,
cadastro e doações) e para não arriscar quebrar tudo de uma vez:

- Doação financeira (PIX/cartão) e excedente de empresas parceiras —
  `saveFinancialDonation` / `saveCompanySurplusDonation` em
  `js/doacoes.js`.
- Rastreio de doação por código (`handleTrackDonation`).
- Campanhas coletivas, denúncias e estatísticas gerais do Painel Adm.
- Chat (`js/chat.js`) ainda guarda mensagens no navegador, não no
  Firestore — funciona, mas as mensagens não aparecem em outro
  dispositivo/navegador.

Cada um desses segue o mesmo padrão usado em `doacoes.js` (uma coleção no
Firestore + `onSnapshot` para tempo real), então dá para migrar aos poucos
sem tocar no resto.

## Fotos das doações e pedidos

Por enquanto, o campo de fotos apenas guarda o **nome dos arquivos**
selecionados (não o conteúdo da imagem), para não estourar o limite de
1 MB por documento do Firestore. Para fotos de verdade, o próximo passo é
configurar o **Firebase Storage** e salvar só a URL de download no
documento — posso implementar isso na próxima etapa se você quiser.
