/* ========================================================
   PONTE SOLIDÁRIA — DOAÇÕES E PEDIDOS
   Módulo 3 (Doações) e Módulo 4 (Pedidos de Ajuda) são
   sincronizados em tempo real com o Firestore.

   Doação financeira (PIX/cartão), rastreamento por código e o
   cadastro de doação física avulsa (saveDonorPhysicalDonation) foram
   removidos deste arquivo: nenhuma tela em partials/ os utilizava —
   o formulário "donor-item-form" que essa função esperava nunca
   existiu no HTML atual — e a versão antiga gravava tudo num helper
   "store" (localStorage) que também não existe mais em lugar nenhum
   do projeto (a função quebraria com ReferenceError se algo chegasse
   a chamá-la). Isso também corrige uma divergência real com
   privacidade.html (item 38 da revisão): a política diz que
   localStorage é usado só para preferências/sessão, e agora isso é
   verdade também no código — as únicas chaves gravadas em
   localStorage no projeto inteiro são "altoContraste" e "tamanhoFonte"
   (js/app.js), "ps_current_user" e "ps_theme" (js/auth.js). Se a doação
   física avulsa (sem mediação) voltar a fazer parte do produto, ela
   deve nascer já integrada ao Firestore, na mesma coleção "doacoes"
   já usada pelo resto do módulo — não em armazenamento local.

   A Área RSE/Empresas (cadastro de excedente por empresa parceira,
   papel "company") foi removida do sistema: o papel "company" nunca
   existiu de fato no cadastro/login (js/firebase-auth.js só reconhece
   person, ong e admin), então a seção era HTML estático e inalcançável
   — o link no menu ficava sempre oculto e não havia código que o
   revelasse. Se essa funcionalidade voltar, o caminho recomendado é
   reaproveitar o papel "ong" (já descrito no README como "ONG /
   Instituição mediadora") em vez de criar um papel novo.
   ======================================================== */

function getCurrentUser() {
    return typeof appState !== "undefined" ? appState.user : null;
}

function getValue(id) {
    if (typeof getFormValue === "function") return getFormValue(id);
    return document.getElementById(id)?.value?.trim() || "";
}

// Contraparte de getValue() para pré-preencher formulários em modo edição
// (ex.: editarCampanha()) — getValue() sempre lê do DOM, não existe um
// "setFormValue" genérico no restante do projeto.
function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
}

function notify(message, type = "success") {
    if (typeof showToast === "function") showToast(message, type);
}

// Notificação real, gravada no Firestore para a conta do destinatário
// (aparece no sininho/central de notificações — js/fase6-engine.js).
// É best-effort: se o módulo de notificações ainda não carregou, não
// trava o fluxo principal (a ação já foi salva no banco de qualquer forma).
function notificarUsuario(usuarioId, titulo, mensagem, categoria, tipo, referencia) {
    if (!usuarioId || typeof window.registrarAcaoGlobal !== "function") return;
    window.registrarAcaoGlobal({ usuarioId, titulo, descricao: mensagem, categoria, acaoAuditoria: titulo, tipo, referencia });
}

async function refreshPublicData() {
    if (typeof loadPublicData === "function") await loadPublicData();
}

function activateDonationTab(tabId) {
    const tabButton = document.querySelector(`.donations-tabs .tab-btn[data-tab="${tabId}"]`);
    if (tabButton) {
        tabButton.click();
        return;
    }

    document.querySelectorAll(".donations-tabs .tab-btn").forEach((button) => {
        button.classList.toggle("active", button.dataset.tab === tabId);
        button.setAttribute("aria-selected", String(button.dataset.tab === tabId));
    });
    document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.toggle("active", content.id === tabId);
    });
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
    }[character]));
}

/* ========================================================
   PONTE COM O FIRESTORE
   Três coleções sincronizadas em tempo real (onSnapshot):
     • "doacoes" — Módulo 3
     • "pedidos" — Módulo 4
     • "users" (role == "ong" e status == "approved") — lista de
       instituições disponíveis para mediação
   ======================================================== */
let donationsCache = [];
let pedidosCache = [];
// Espelho sanitizado de "pedidos" (ver firestore.rules) — mesmo id, sem
// solicitanteNome/photos/ongObservacao/history. É o que qualquer usuário
// logado enxerga para um pedido que não é seu e que ele não é a ONG
// responsável; pedidosCache (privado) só chega completo pra quem tem
// motivo (solicitante, ONG responsável, admin).
let pedidosPublicosCache = [];
let ongsCache = [];
let campanhasCache = [];
let firestoreDoacoesReady = false;

function fsRefs() {
    if (!window.fb) return null;
    const { db, firestoreSdk } = window.fb;
    return { db, ...firestoreSdk };
}

function watchFirestoreCollection(name, onData) {
    const refs = fsRefs();
    if (!refs) return;
    const { db, collection, onSnapshot } = refs;
    onSnapshot(
        collection(db, name),
        (snapshot) => {
            const list = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
            list.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
            onData(list);
            renderAllDonationsAndPedidos();
        },
        (error) => console.warn(`[Ponte Solidária] Falha ao sincronizar "${name}" com o Firestore.`, error)
    );
}

function initFirestoreDoacoesModule() {
    if (firestoreDoacoesReady || !window.fb) return;
    firestoreDoacoesReady = true;

    watchFirestoreCollection("doacoes", (list) => { donationsCache = list; });
    watchFirestoreCollection("pedidos", (list) => { pedidosCache = list; });
    watchFirestoreCollection("pedidos_publicos", (list) => { pedidosPublicosCache = list; });
    watchFirestoreCollection("campanhas", (list) => { campanhasCache = list; renderCampanhasPublicas(); renderMinhasCampanhas(); });

    const refs = fsRefs();
    const { db, collection, query, where, onSnapshot } = refs;
    onSnapshot(
        query(collection(db, "users"), where("role", "==", "ong")),
        (snapshot) => {
            ongsCache = snapshot.docs
                .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
                // Fase 1: só ONGs aprovadas (campo "approved", com fallback
                // para "status" em documentos antigos) mediam doações.
                .filter((u) => window.isOngAprovada ? window.isOngAprovada(u) : u.status === "approved");
            populateOngSelect();
            renderHomeOngsPreview();
            renderAllDonationsAndPedidos();
        },
        (error) => console.warn("[Ponte Solidária] Falha ao sincronizar ONGs com o Firestore.", error)
    );
}

function renderAllDonationsAndPedidos() {
    renderMyDonations();
    renderDirectDonationsAvailable();
    renderOngMediationRequests();
    renderCommunityPedidos();
    renderMyPedidos();
    renderOngPedidos();
    // Fase 8 (F5 no chat): reconecta em silêncio toda conversa elegível
    // do usuário logado sempre que doacoes/pedidos chegam do Firestore —
    // não precisa mais esperar o clique em "Conversar...".
    // reconectarTodasAsThreads() (mais abaixo) é no-op sem usuário logado.
    if (typeof reconectarTodasAsThreads === "function") reconectarTodasAsThreads();
}

document.addEventListener("firebaseReady", initFirestoreDoacoesModule);

// Salva uma doação física de pessoa doadora.
/* ========================================================
   MÓDULO 3 — FLUXO COMPLETO DE DOAÇÕES (Firestore: "doacoes")
   No passo 2 do wizard ("Nova Doação") o doador escolhe um dos dois
   caminhos (deliveryMethod):
     • "direct" — Atender um pedido específico: o doador escolhe, na
       hora do cadastro, uma pessoa que já registrou um pedido de ajuda
       compatível (ver populatePedidoMatches()). A doação já nasce
       vinculada a esse pedido, com chat liberado para combinar a
       entrega diretamente entre os dois.
     • "ong" — Mediação por uma ONG parceira: a instituição recebe,
       faz a triagem, separa e organiza a entrega ao beneficiário.
   O histórico nunca é apagado: cada mudança apenas atualiza o status
   e é registrada em donation.history.
   ======================================================== */

const ONG_FLOW_STEPS = ["Cadastro", "ONG selecionada", "Aguardando retirada", "Recebida", "Em separação", "Entregue", "Concluída"];
const DIRECT_FLOW_STEPS = ["Cadastro", "Buscando beneficiário", "Beneficiário aceitou", "Combinando entrega", "Entregue", "Concluída"];

function getFlowSteps(donation) {
    return donation.deliveryMethod === "ong" ? ONG_FLOW_STEPS : DIRECT_FLOW_STEPS;
}

function getApprovedOngs() {
    return ongsCache;
}

function flowStatusPillClass(status) {
    const map = { "Em andamento": "andamento", "Entregue": "entregue", "Cancelada": "cancelada", "Recusada": "recusada", "Expirada": "expirada" };
    return map[status] || "andamento";
}

function renderFlowProgress(donation) {
    const steps = getFlowSteps(donation);
    const current = donation.progressStep;
    const stopped = donation.trackingStatus === "Cancelada" || donation.trackingStatus === "Recusada" || donation.trackingStatus === "Expirada";
    return `
        <div class="flow-progress-track">
            ${steps.map((label, index) => {
                let state = "";
                if (stopped) state = index <= current ? "stopped" : "";
                else if (index < current) state = "completed";
                else if (index === current) state = "active";
                return `<div class="flow-progress-step ${state}">
                    <span class="flow-progress-dot"></span>
                    <span class="flow-progress-label">${escapeHtml(label)}</span>
                </div>`;
            }).join("")}
        </div>`;
}

// Grava uma alteração de status no Firestore SEM jamais apagar o histórico anterior.
async function updateDonationDoc(id, patch, historyNote) {
    const refs = fsRefs();
    if (!refs) { notify("Conexão com o banco de dados indisponível.", "danger"); return; }
    const { db, doc, updateDoc } = refs;
    const donation = donationsCache.find((d) => d.id === id);
    const history = donation?.history ? [...donation.history] : [];
    if (historyNote) {
        const merged = { ...donation, ...patch };
        const steps = getFlowSteps(merged);
        const step = merged.progressStep ?? 0;
        history.push({ step, label: steps[Math.min(step, steps.length - 1)], date: new Date().toISOString(), note: historyNote });
    }
    try {
        await updateDoc(doc(db, "doacoes", id), { ...patch, history, updatedAt: new Date().toISOString() });
    } catch (error) {
        console.error(error);
        notify("Não foi possível atualizar a doação. Tente novamente.", "danger");
    }
}

// -------- Wizard: Nova Doação --------
// Item 7 da revisão: o passo 2 do wizard virou uma decisão explícita entre
// "Atender um pedido específico" (o doador escolhe, na hora, uma pessoa que
// já registrou um pedido de ajuda compatível — deliveryMethod continua
// gravado como "direct" no banco, sem renomear nada em Firestore/regras,
// só o SIGNIFICADO mudou: antes a doação nascia sem beneficiário e ficava
// pública esperando alguém aceitar; agora ela já nasce vinculada a um
// pedido real, pulando direto para a etapa "Combinando entrega" do mesmo
// DIRECT_FLOW_STEPS de sempre) e "Pedir que uma ONG faça a mediação"
// (deliveryMethod "ong", inalterado). renderDirectDonationsAvailable() e
// acceptDirectDonation() continuam no arquivo só como caminho de
// compatibilidade para doações antigas que já estavam públicas sem
// beneficiário antes desta mudança — o wizard não cria mais nenhuma.
let donationWizardStep = 1;
const donationWizardMaxSteps = 2;
let selectedDeliveryMethod = "direct";
let selectedPedidoId = "";
let preselectedPedidoId = "";

function populateOngSelect() {
    const select = document.getElementById("dw-ong-select");
    if (!select) return;
    const ongs = getApprovedOngs();
    select.innerHTML = ongs.length
        ? ongs.map((o) => `<option value="${o.id}">${escapeHtml(o.name)}</option>`).join("")
        : `<option value="">Nenhuma ONG validada disponível no momento</option>`;
}

// Busca o nome público do usuário (coleção "users", legível por qualquer
// conta logada — ver firestore.rules) para exibir de quem é o pedido que o
// doador escolheu atender. Best-effort: se falhar, a doação continua sendo
// criada normalmente, só sem o nome pré-preenchido (fica "" e é resolvido
// depois pelo chat/tela de perfil, como já acontecia com beneficiaryName
// em outros pontos do fluxo).
async function resolveUserName(userId) {
    if (!userId) return "";
    const refs = fsRefs();
    if (!refs) return "";
    const { db, doc, getDoc } = refs;
    try {
        const snap = await getDoc(doc(db, "users", userId));
        return snap.exists() ? (snap.data().name || "") : "";
    } catch (error) {
        console.warn("[Ponte Solidária] Não foi possível carregar o nome do solicitante.", error);
        return "";
    }
}

// Pedidos de ajuda ainda pendentes/aprovados, da MESMA categoria do item
// que está sendo doado (dw-category), que o doador pode escolher atender
// diretamente no passo 2 do wizard. Usa pedidosVisiveis() (mesma fonte da
// aba "Movimentação"), então respeita o mesmo nível de privacidade: o
// doador só enxerga o nome completo do solicitante depois de vincular a
// doação (ver finalizeDonationWizard -> resolveUserName).
function populatePedidoMatches() {
    const list = document.getElementById("dw-pedido-list");
    const empty = document.getElementById("dw-pedido-empty");
    const emptyItem = document.getElementById("dw-pedido-empty-item");
    if (!list || !empty) return;

    const user = getCurrentUser();
    const categoria = getValue("dw-category");
    const itemDigitado = getValue("dw-item-name");

    // Item 10 da revisão: pedido recusado por uma ONG também entra aqui —
    // é exatamente esse o pedido que "Quero atender este pedido" (renderCommunityPedidos)
    // preseleciona nesse caso, então precisa continuar elegível pra vincular
    // diretamente, e não sumir da lista de candidatos do wizard.
    const candidatos = pedidosVisiveis().filter((p) =>
        (p.status === "pendente" || p.status === "aprovado" || p.status === "recusado") &&
        (!user || p.solicitanteId !== user.id) &&
        String(p.category || "").toLowerCase() === String(categoria || "").toLowerCase());

    if (preselectedPedidoId && candidatos.some((p) => p.id === preselectedPedidoId) && !selectedPedidoId) {
        selectedPedidoId = preselectedPedidoId;
    }
    if (selectedPedidoId && !candidatos.some((p) => p.id === selectedPedidoId)) selectedPedidoId = "";

    if (!candidatos.length) {
        list.innerHTML = "";
        if (emptyItem) emptyItem.innerText = itemDigitado || categoria || "este item";
        empty.classList.remove("hidden");
        return;
    }
    empty.classList.add("hidden");

    list.innerHTML = candidatos.map((p) => `
        <button class="specific-pedido-card${p.id === selectedPedidoId ? " selected" : ""}" type="button" data-pedido-id="${p.id}" role="radio" aria-checked="${p.id === selectedPedidoId}">
            <div class="specific-pedido-top">
                <span class="card-badge badge-urgent">${p.urgency === "alta" ? "Urgente" : p.urgency === "baixa" ? "Necessidade" : "Prioridade média"}</span>
                <span class="community-item-date">${escapeHtml(new Date(p.createdAt).toLocaleDateString("pt-BR"))}</span>
            </div>
            <strong>${escapeHtml(p.item)}</strong>
            <p><i data-lucide="map-pin" style="width: 13px; height: 13px; vertical-align: -2px;"></i> ${escapeHtml(p.solicitanteCidade)} · ${escapeHtml(String(p.quantity))} un.</p>
            <p>${escapeHtml(p.description)}</p>
        </button>`).join("");

    if (window.lucide) window.lucide.createIcons();
}

// Prévia de "ONGs parceiras" na Home — reaproveita a mesma lista de ONGs
// aprovadas (ongsCache/getApprovedOngs) já sincronizada em tempo real com o
// Firestore para o seletor de mediação, sem nenhuma consulta nova ao banco.
function ongInitials(name) {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "ONG";
    return words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function renderHomeOngsPreview() {
    const grid = document.getElementById("home-ongs-grid");
    if (!grid) return;
    const ongs = getApprovedOngs().slice(0, 6);

    if (!ongs.length) {
        grid.innerHTML = `<div class="ongs-empty-state"><i data-lucide="building-2"></i><p>Ainda não há ONGs aprovadas para exibir. Assim que o Painel Adm aprovar uma instituição, ela aparece aqui automaticamente.</p></div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    grid.innerHTML = ongs.map((ong) => `
        <article class="ong-card">
            <div class="ong-card-avatar" aria-hidden="true">${escapeHtml(ongInitials(ong.name))}</div>
            <div class="ong-card-body">
                <h4>${escapeHtml(ong.name || "ONG parceira")}</h4>
                <span><i data-lucide="map-pin"></i> ${escapeHtml(ong.service_area || ong.address || "Área de atuação não informada")}</span>
            </div>
        </article>`).join("");
    if (window.lucide) window.lucide.createIcons();
}
window.renderHomeOngsPreview = renderHomeOngsPreview;
document.addEventListener("includesLoaded", renderHomeOngsPreview);

// Formata a data-limite de uma campanha (campo "prazo", string "AAAA-MM-DD")
// no padrão exibido nos cards: "Até 30 de junho". Retorna null se a
// campanha não tiver prazo definido (campanha de meta contínua).
function formatarPrazoCampanha(prazo) {
    if (!prazo) return null;
    const data = new Date(`${prazo}T00:00:00`);
    if (Number.isNaN(data.getTime())) return null;
    return `Até ${data.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}`;
}

// Lista de itens que a campanha aceita. Campanhas criadas depois desta
// mudança já nascem com "itensAceitos" (array — ver saveCampanha()).
// Fallback para "produtoPrincipal" cobre campanhas antigas (criadas antes
// desta função existir, ou cadastradas manualmente pelo Firebase Console,
// ver README-FIREBASE.md), que tinham só um item único nesse campo.
function itensAceitosDaCampanha(campanha) {
    if (Array.isArray(campanha?.itensAceitos) && campanha.itensAceitos.length) return campanha.itensAceitos;
    if (campanha?.produtoPrincipal) return [campanha.produtoPrincipal];
    return [];
}

// Monta o card de uma campanha (mesmo componente visual .donation-card já
// usado para doações). O botão "Quero doar" abre o modal dedicado da
// campanha (abrirCampaignDonationModal(), abaixo) — funciona igual na Home
// e no Portal de Doações, não precisa mais trocar de aba antes.
// 🔴 Correção: a campanha nunca teve nenhum jeito real de receber um
// aporte financeiro (não existe tela/coleção de doação em dinheiro — ver
// "Ainda pendente" no README-FIREBASE.md), então "arrecadado" nascia e
// ficava 0 para sempre; a barra "% da meta arrecadada" prometia um
// progresso que nunca existiu de verdade. A campanha agora é só um aviso
// de mobilização (título, produto principal, categoria, descrição, prazo
// opcional) — quem quiser ajudar clica em "Quero doar" e cadastra a
// doação do produto principal da campanha, já direcionada para a ONG dona
// dela (sem escolher outro item nem outra instituição).
// 🔴 Correção 2: o botão prometia "Quero doar" mas só trocava de aba para
// o formulário genérico de "Doar itens" — sem vínculo nenhum com a
// campanha (item, categoria e ONG ficavam livres para o doador escolher
// qualquer coisa, ou nem escolher mediação nenhuma). Agora abre
// abrirCampaignDonationModal(c.id), que trava a escolha nos itens aceitos
// pela campanha (c.itensAceitos — ver itensAceitosDaCampanha(), acima).
function campanhaCardHtml(c) {
    const prazoTexto = formatarPrazoCampanha(c.prazo);
    const infoHtml = prazoTexto
        ? `<p class="card-location"><i data-lucide="calendar-days"></i> ${escapeHtml(prazoTexto)}</p>`
        : `<p class="card-location"><i data-lucide="megaphone"></i> Campanha em andamento</p>`;
    const itens = itensAceitosDaCampanha(c);
    const produtoHtml = itens.length
        ? `<p class="card-location"><i data-lucide="package"></i> Aceita: ${escapeHtml(itens.join(", "))}${c.quantidadeDesejada ? ` (meta: ${escapeHtml(String(c.quantidadeDesejada))})` : ""}</p>`
        : "";
    const localizacaoHtml = c.localizacao
        ? `<p class="card-location"><i data-lucide="map-pin"></i> ${escapeHtml(c.localizacao)}</p>`
        : "";

    return `
        <article class="donation-card">
            <div class="card-badge badge-campaign">Campanha ativa</div>
            <h3 class="card-title">${escapeHtml(c.titulo || "Campanha")}</h3>
            ${infoHtml}
            ${produtoHtml}
            ${localizacaoHtml}
            <p class="card-description">${escapeHtml(c.descricao || "")}</p>
            <div class="card-footer">
                <span class="category-tag">${escapeHtml(c.categoria || "Geral")}</span>
                <button class="btn-action" type="button" data-doar-campanha="${c.id}">Quero doar</button>
            </div>
        </article>`;
}

// Campanhas em destaque (Home) e aba "Campanhas" (Portal de Doações) — os
// dois containers leem a mesma coleção "campanhas" do Firestore, já
// sincronizada em tempo real por watchFirestoreCollection() em
// initFirestoreDoacoesModule(). Só entram aqui campanhas com
// status === "ativa"; uma campanha com prazo vencido nunca fica presa na
// tela como estava no HTML fixo — quem controla isso é o banco, não o código.
function renderCampanhasPublicas() {
    const ativas = campanhasCache.filter((c) => c.status === "ativa");
    const emptyStateHtml = `<div class="ongs-empty-state"><i data-lucide="megaphone"></i><p>Nenhuma campanha ativa no momento. Volte em breve!</p></div>`;

    const homeGrid = document.getElementById("home-campaigns-grid");
    if (homeGrid) {
        homeGrid.innerHTML = ativas.length
            ? ativas.slice(0, 4).map((c) => campanhaCardHtml(c)).join("")
            : emptyStateHtml;
    }

    const doacoesGrid = document.getElementById("doacoes-campaigns-grid");
    if (doacoesGrid) {
        doacoesGrid.innerHTML = ativas.length
            ? ativas.map((c) => campanhaCardHtml(c)).join("")
            : emptyStateHtml;
    }

    if (window.lucide) window.lucide.createIcons();
}
window.renderCampanhasPublicas = renderCampanhasPublicas;
document.addEventListener("includesLoaded", renderCampanhasPublicas);

// -------- Nova Campanha / Editar Campanha (só ONGs já aprovadas) --------
// Fecha a lacuna que existia entre o código (que já lia "campanhas" do
// Firestore em tempo real) e a interface (que não tinha nenhuma tela para
// criar uma campanha — só era possível cadastrar manualmente pelo Firebase
// Console, ver README-FIREBASE.md). Reaproveita requireOngAprovada(), o
// mesmo guard já usado para mediar doações/pedidos.
// O mesmo modal/form serve para CRIAR e EDITAR: o campo oculto
// "camp-edit-id" é o que diferencia (vazio = criação, addDoc; preenchido =
// edição, updateDoc) — ver saveCampanha() logo abaixo.
function abrirModalNovaCampanha() {
    const ong = requireOngAprovada();
    if (!ong) return;
    document.getElementById("nova-campanha-form")?.reset();
    setValue("camp-edit-id", "");
    const title = document.getElementById("nova-campanha-title");
    if (title) title.textContent = "Nova campanha";
    const subtitle = document.getElementById("nova-campanha-subtitle");
    if (subtitle) subtitle.textContent = "Publique um aviso de mobilização para chamar atenção para uma causa — quem quiser ajudar clica em \"Quero doar\" e cadastra uma doação do produto principal, direcionada direto para sua instituição.";
    const submitBtn = document.getElementById("nova-campanha-submit-btn");
    if (submitBtn) submitBtn.textContent = "Publicar campanha";
    document.getElementById("nova-campanha-modal")?.classList.remove("hidden");
}
function fecharModalNovaCampanha() {
    document.getElementById("nova-campanha-modal")?.classList.add("hidden");
}

// Abre o mesmo modal em modo EDIÇÃO, pré-preenchido com os dados atuais da
// campanha. Só a própria ONG dona pode editar, e só enquanto a campanha
// ainda não foi removida — uma campanha "removida" preserva histórico, mas
// não volta a ser editável/reaberta por aqui (ela já tem doações vinculadas
// vendo aquele estado; reabrir mudaria o que já foi comunicado ao doador).
function editarCampanha(id) {
    const ong = requireOngAprovada();
    if (!ong) return;
    const campanha = campanhasCache.find((c) => c.id === id);
    if (!campanha || campanha.ongId !== ong.id) return;
    if (campanha.status === "removida") {
        notify("Esta campanha foi removida e não pode mais ser editada.", "warning");
        return;
    }

    document.getElementById("nova-campanha-form")?.reset();
    setValue("camp-edit-id", campanha.id);
    setValue("camp-titulo", campanha.titulo || "");
    setValue("camp-itens-aceitos", itensAceitosDaCampanha(campanha).join(", "));
    setValue("camp-categoria", campanha.categoria || "");
    setValue("camp-quantidade-desejada", campanha.quantidadeDesejada || "");
    setValue("camp-localizacao", campanha.localizacao || "");
    setValue("camp-data-inicio", campanha.dataInicio || "");
    setValue("camp-data-fim", campanha.prazo || "");
    setValue("camp-descricao", campanha.descricao || "");

    const title = document.getElementById("nova-campanha-title");
    if (title) title.textContent = "Editar campanha";
    const subtitle = document.getElementById("nova-campanha-subtitle");
    if (subtitle) subtitle.textContent = "As doações já vinculadas a esta campanha continuam com a ONG e o histórico atuais — alterar aqui só muda como a campanha aparece daqui pra frente.";
    const submitBtn = document.getElementById("nova-campanha-submit-btn");
    if (submitBtn) submitBtn.textContent = "Salvar alterações";

    document.getElementById("nova-campanha-modal")?.classList.remove("hidden");
}
window.editarCampanha = editarCampanha;

async function saveCampanha(event) {
    event.preventDefault();
    const ong = requireOngAprovada();
    if (!ong) return;

    const refs = fsRefs();
    if (!refs) { notify("Não foi possível conectar ao banco de dados agora.", "danger"); return; }

    const editId = getValue("camp-edit-id");
    const titulo = getValue("camp-titulo");
    // "Cobertores, Casacos, Calças, Meias" -> ["Cobertores", "Casacos", "Calças", "Meias"]
    // — vírgulas duplicadas/espaços sobrando e itens repetidos são
    // descartados; é essa lista que abrirCampaignDonationModal() usa para
    // montar o <select id="cd-item"> do formulário de doação da campanha.
    const itensAceitos = [...new Set(getValue("camp-itens-aceitos").split(",").map((item) => item.trim()).filter(Boolean))];
    const categoria = getValue("camp-categoria");
    const quantidadeDesejada = getValue("camp-quantidade-desejada");
    const localizacao = getValue("camp-localizacao");
    const dataInicio = getValue("camp-data-inicio");
    // Campo salvo como "prazo" (não "dataFim") para reaproveitar
    // formatarPrazoCampanha()/campanhaCardHtml(), que já leem esse nome —
    // é a mesma data-limite, só com o nome que o resto do código espera.
    const prazo = getValue("camp-data-fim");
    const descricao = getValue("camp-descricao");

    if (!titulo || !itensAceitos.length || !categoria || !localizacao || !dataInicio || !descricao) {
        notify("Preencha os campos obrigatórios da campanha (não esqueça ao menos um item aceito).", "warning");
        return;
    }

    const nowIso = new Date().toISOString();
    const { db, collection, addDoc, doc, updateDoc } = refs;

    // Modo edição: só atualiza os campos editáveis (título, descrição,
    // categoria, item, quantidade desejada, prazo, localização) — nunca
    // ongId, status ou createdAt, que continuam vindos do documento
    // original (a regra do Firestore também bloqueia trocar o ongId).
    if (editId) {
        const campanhaAtual = campanhasCache.find((c) => c.id === editId);
        if (!campanhaAtual || campanhaAtual.ongId !== ong.id) {
            notify("Não foi possível editar esta campanha.", "danger");
            return;
        }
        try {
            await updateDoc(doc(db, "campanhas", editId), {
                titulo, itensAceitos, descricao, categoria,
                quantidadeDesejada: quantidadeDesejada || "",
                localizacao,
                dataInicio,
                prazo: prazo || "",
                updatedAt: nowIso
            });
            fecharModalNovaCampanha();
            notify("Campanha atualizada.");
        } catch (error) {
            console.error(error);
            notify("Não foi possível salvar as alterações da campanha agora. Tente novamente.", "danger");
        }
        return;
    }

    // 🔴 Sem "meta"/"arrecadado" (revisão): a campanha é um aviso de
    // mobilização, não uma barra de progresso financeiro — ver
    // campanhaCardHtml(), acima. "itensAceitos" é a lista de itens que
    // abrirCampaignDonationModal() usa para montar o <select> do
    // formulário de doação da campanha (ver abaixo) — quem doa só escolhe
    // entre esses itens, nunca um item livre nem outra ONG.
    // "quantidadeDesejada" é só informativa (meta exibida no card) — não
    // trava nada no formulário de doação, ver item 4 da revisão.
    const campanha = {
        titulo, itensAceitos, descricao, categoria,
        quantidadeDesejada: quantidadeDesejada || "",
        localizacao,
        dataInicio,
        prazo: prazo || "",
        status: "ativa",
        ongId: ong.id,
        ongName: ong.name,
        createdAt: nowIso,
        updatedAt: nowIso
    };

    try {
        const novaCampanhaRef = await addDoc(collection(db, "campanhas"), campanha);
        fecharModalNovaCampanha();
        notify("Campanha publicada! Ela já aparece na Home e no Portal de Doações.");
        notificarTodosSobreNovaCampanha(campanha, novaCampanhaRef.id);
    } catch (error) {
        console.error(error);
        notify("Não foi possível publicar a campanha agora. Tente novamente.", "danger");
    }
}

// Item 12 da revisão ("Campanhas" — "A ONG X criou uma nova campanha."):
// como o projeto não tem Cloud Functions (nenhuma notificação é
// realmente "empurrada" por um gatilho de servidor — ver limitação já
// documentada em firestore.rules sobre a coleção "notificacoes"), quem
// publica a campanha é quem grava, no cliente, um aviso individual para
// cada pessoa. A coleção "users" é legível por qualquer conta logada
// (mesmo motivo de resolveUserName(), acima), então isso não expõe nada
// que já não fosse público dentro do site. Só contas "person" recebem —
// outras ONGs/administração não são o público de uma campanha de doação.
async function notificarTodosSobreNovaCampanha(campanha, campanhaId) {
    const refs = fsRefs();
    if (!refs) return;
    const { db, collection, getDocs, query, where } = refs;
    try {
        const snap = await getDocs(query(collection(db, "users"), where("role", "==", "person")));
        snap.forEach((docSnap) => {
            notificarUsuario(docSnap.id, "Nova campanha",
                `A ONG ${campanha.ongName} criou uma nova campanha: "${campanha.titulo}".`,
                "Campanha", "campanha", { campanhaId });
        });
    } catch (error) {
        console.warn("Não foi possível avisar os usuários sobre a nova campanha.", error);
    }
}

// Registra em cada doação já vinculada à campanha (campaignId === id) uma
// entrada de histórico explicando o que aconteceu com a campanha de
// origem — a doação em si (status, etapa, mediação) não muda em nada, só
// ganha essa nota para quem olhar o histórico depois não perder o
// contexto de por que a campanha sumiu da área pública.
async function avisarDoacoesDaCampanha(campaignId, historyNote) {
    const vinculadas = donationsCache.filter((d) => d.campaignId === campaignId);
    for (const d of vinculadas) {
        await updateDonationDoc(d.id, {}, historyNote);
    }
}

// Encerra a campanha (só a própria ONG dona). Só fecha — nunca reabre por
// aqui, para uma campanha encerrada não voltar a ficar "ativa" sem revisão.
// "Encerrada" já basta pra sumir de toda área pública (renderCampanhasPublicas
// só lista status === "ativa"), sem apagar nada — é a alternativa mais segura
// à exclusão física, preservando o documento e o histórico das doações já
// vinculadas.
async function encerrarCampanha(id) {
    const ong = requireOngAprovada();
    if (!ong) return;
    const campanha = campanhasCache.find((c) => c.id === id);
    if (!campanha || campanha.ongId !== ong.id) return;
    const refs = fsRefs();
    if (!refs) return;
    const { db, doc, updateDoc } = refs;
    try {
        await updateDoc(doc(db, "campanhas", id), { status: "encerrada", updatedAt: new Date().toISOString() });
        await avisarDoacoesDaCampanha(id, `Campanha "${campanha.titulo}" foi encerrada pela ONG.`);
        notify("Campanha encerrada.", "info");
    } catch (error) {
        console.error(error);
        notify("Não foi possível encerrar a campanha agora.", "danger");
    }
}
window.encerrarCampanha = encerrarCampanha;

// Exclui a campanha (só a própria ONG dona), "enquanto permitido":
//  - Sem nenhuma doação vinculada (campaignId === id): exclusão física do
//    documento em "campanhas" — não há histórico de movimentação para
//    preservar.
//  - Com doações já vinculadas: NUNCA apaga fisicamente. Em vez disso,
//    equivale a um encerramento (status "removida"), some da área pública
//    do mesmo jeito (Home, lista de campanhas, campanhas disponíveis para
//    doação — todas leem renderCampanhasPublicas(), que só mostra
//    status === "ativa"), e cada doação vinculada recebe a nota "Campanha
//    removida pela ONG." no próprio histórico, sem apagar a doação nem o
//    que já foi registrado nela.
async function excluirCampanha(id) {
    const ong = requireOngAprovada();
    if (!ong) return;
    const campanha = campanhasCache.find((c) => c.id === id);
    if (!campanha || campanha.ongId !== ong.id) return;
    if (campanha.status === "removida") return;

    const vinculadas = donationsCache.filter((d) => d.campaignId === id);
    const mensagemConfirmacao = vinculadas.length
        ? `Esta campanha já tem ${vinculadas.length} doação(ões) vinculada(s). Elas não serão apagadas, mas a campanha vai sumir da área pública. Confirmar exclusão?`
        : "Excluir esta campanha? Ela ainda não tem doações vinculadas, então será removida permanentemente.";
    if (!window.confirm(mensagemConfirmacao)) return;

    const refs = fsRefs();
    if (!refs) return;
    const { db, doc, updateDoc, deleteDoc } = refs;

    try {
        if (vinculadas.length) {
            await updateDoc(doc(db, "campanhas", id), { status: "removida", updatedAt: new Date().toISOString() });
            await avisarDoacoesDaCampanha(id, `Campanha "${campanha.titulo}" foi removida pela ONG.`);
            notify("Campanha removida. O histórico das doações já feitas foi preservado.", "info");
        } else {
            await deleteDoc(doc(db, "campanhas", id));
            notify("Campanha excluída.", "info");
        }
    } catch (error) {
        console.error(error);
        notify("Não foi possível excluir a campanha agora. Tente novamente.", "danger");
    }
}
window.excluirCampanha = excluirCampanha;

// Lista as campanhas da própria ONG (qualquer status) em "Meu Perfil".
// O bloco só aparece para contas ONG já aprovadas — a mesma regra usada
// em requireOngAprovada(), mas sem disparar toast (aqui é só exibir/ocultar
// a seção, não bloquear uma ação que o usuário tentou executar).
function renderMinhasCampanhas() {
    const block = document.getElementById("minhas-campanhas-block");
    const grid = document.getElementById("minhas-campanhas-grid");
    if (!block || !grid) return;

    const user = getCurrentUser();
    const aprovada = user && user.role === "ong" && (window.isOngAprovada ? window.isOngAprovada(user) : user.status === "approved");
    if (!aprovada) { block.classList.add("hidden"); grid.innerHTML = ""; return; }
    block.classList.remove("hidden");

    const minhas = campanhasCache.filter((c) => c.ongId === user.id);
    if (!minhas.length) {
        grid.innerHTML = `<p class="text-muted">Você ainda não publicou nenhuma campanha. Clique em "Nova Campanha" para criar a primeira.</p>`;
        return;
    }

    grid.innerHTML = minhas.map((c) => {
        const ativa = c.status === "ativa";
        const removida = c.status === "removida";
        const statusLabel = ativa ? "Ativa" : (removida ? "Removida" : "Encerrada");
        const statusClass = ativa ? "andamento" : "cancelada";
        const temDoacoesVinculadas = donationsCache.some((d) => d.campaignId === c.id);
        return `
            <article class="flow-donation-card">
                <div class="flow-card-top">
                    <span class="flow-role-tag">${escapeHtml(c.categoria || "Geral")}</span>
                    <span class="flow-status-pill ${statusClass}">${statusLabel}</span>
                </div>
                <h4>${escapeHtml(c.titulo)}</h4>
                <p class="flow-card-desc">${escapeHtml(c.descricao || "")}</p>
                <div class="flow-card-actions">
                    ${ativa ? `<button class="btn btn-secondary btn-sm" type="button" data-editar-campanha="${c.id}"><i data-lucide="pencil"></i> Editar</button>` : ""}
                    ${ativa ? `<button class="btn btn-secondary btn-sm" type="button" data-encerrar-campanha="${c.id}">Encerrar campanha</button>` : ""}
                    ${!removida ? `<button class="btn btn-danger btn-sm" type="button" data-excluir-campanha="${c.id}"><i data-lucide="trash-2"></i> Excluir${temDoacoesVinculadas ? " (mantém histórico)" : ""}</button>` : ""}
                </div>
            </article>`;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
}
window.renderMinhasCampanhas = renderMinhasCampanhas;
document.addEventListener("includesLoaded", renderMinhasCampanhas);

function updateDonationWizardUI() {
    for (let i = 1; i <= donationWizardMaxSteps; i++) {
        const step = document.getElementById(`donation-wizard-step-${i}`);
        if (step) step.classList.toggle("active", i === donationWizardStep);
        const node = document.querySelector(`#donation-wizard-modal .wizard-node[data-dstep="${i}"]`);
        if (node) {
            node.classList.toggle("completed", i < donationWizardStep);
            node.classList.toggle("active", i === donationWizardStep);
        }
    }
    const fill = document.getElementById("donation-wizard-progress-fill");
    if (fill) fill.style.width = `${((donationWizardStep - 1) / (donationWizardMaxSteps - 1)) * 100}%`;

    const prevBtn = document.getElementById("donation-wizard-prev-btn");
    const nextBtn = document.getElementById("donation-wizard-next-btn");
    if (prevBtn) prevBtn.disabled = donationWizardStep === 1;
    if (nextBtn) {
        if (donationWizardStep === donationWizardMaxSteps) {
            nextBtn.innerText = "Confirmar doação";
            nextBtn.classList.remove("btn-primary");
            nextBtn.classList.add("btn-success");
        } else {
            nextBtn.innerText = "Avançar";
            nextBtn.classList.remove("btn-success");
            nextBtn.classList.add("btn-primary");
        }
    }
}

function validateDonationWizardStep() {
    const step = document.getElementById(`donation-wizard-step-${donationWizardStep}`);
    const fields = [...(step?.querySelectorAll("input[required], select[required], textarea[required]") || [])]
        .filter((field) => !field.closest(".hidden"));
    const invalidField = fields.find((field) => !field.checkValidity());
    if (!invalidField) return true;
    invalidField.reportValidity();
    return false;
}

function openDonationWizard(prefill = {}) {
    const user = getCurrentUser();
    if (!user) {
        notify("Faça login para cadastrar uma doação.", "warning");
        document.getElementById("open-login-btn")?.click();
        return;
    }
    donationWizardStep = 1;
    selectedDeliveryMethod = "direct";
    selectedPedidoId = "";
    preselectedPedidoId = prefill.pedidoId || "";
    document.getElementById("donation-wizard-form")?.reset();
    document.querySelectorAll("#delivery-method-grid .role-tab").forEach((tab, index) => tab.classList.toggle("active", index === 0));
    document.getElementById("dw-specific-select-group")?.classList.remove("hidden");
    document.getElementById("dw-ong-select-group")?.classList.add("hidden");
    populateOngSelect();
    updateDonationWizardUI();

    if (prefill.itemName) {
        const itemInput = document.getElementById("dw-item-name");
        if (itemInput) itemInput.value = prefill.itemName;
    }
    if (prefill.category) {
        const categorySelect = document.getElementById("dw-category");
        if (categorySelect) categorySelect.value = prefill.category;
    }
    populatePedidoMatches();

    document.getElementById("donation-wizard-modal")?.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
}

function closeDonationWizard() {
    document.getElementById("donation-wizard-modal")?.classList.add("hidden");
}

async function finalizeDonationWizard() {
    const user = getCurrentUser();
    if (!user) return;
    const refs = fsRefs();
    if (!refs) {
        notify("Firebase ainda não configurado. Preencha js/firebase-config.js para salvar doações.", "danger");
        return;
    }

    const category = getValue("dw-category");
    const itemName = getValue("dw-item-name");
    const quantity = Number(getValue("dw-quantity")) || 1;
    const condition = getValue("dw-condition");
    const weight = getValue("dw-weight");
    const city = getValue("dw-city");
    const availability = getValue("dw-availability") || "Imediata";
    const description = getValue("dw-description");

    if (!category || !itemName || !condition || !city) {
        notify("Preencha os dados obrigatórios do item.", "warning");
        return;
    }

    const isOng = selectedDeliveryMethod === "ong";
    let ongId = "";
    let ongName = "";
    let pedidoEscolhido = null;
    if (isOng) {
        const select = document.getElementById("dw-ong-select");
        ongId = select?.value || "";
        ongName = select?.selectedOptions?.[0]?.textContent || "";
        if (!ongId) {
            notify("Escolha uma instituição para mediar a doação.", "warning");
            return;
        }
    } else {
        pedidoEscolhido = pedidosVisiveis().find((p) => p.id === selectedPedidoId);
        if (!pedidoEscolhido) {
            notify("Escolha a pessoa que vai receber esta doação (ou peça a mediação de uma ONG).", "warning");
            return;
        }
        // Regra fundamental (doadorId !== beneficiarioId): o próprio autor
        // do pedido nunca pode "atender" o pedido dele mesmo — mesmo que,
        // por algum motivo, um pedido próprio apareça na lista de
        // candidatos (populatePedidoMatches() já filtra isso, então este
        // caminho só é alcançável forçando o clique/estado por fora da UI
        // normal). Sem esta checagem, o mesmo usuário conseguiria criar o
        // pedido, "atendê-lo" e abrir um chat consigo mesmo.
        if (pedidoEscolhido.solicitanteId === user.id) {
            notify("Você não pode atender ao próprio pedido de ajuda.", "danger");
            return;
        }
        // Doação já reservada não pode ser escolhida novamente: o pedido
        // pode ter sido vinculado por outra pessoa (ou concluído) entre o
        // momento em que a lista foi carregada e o clique em "Confirmar
        // doação" — populatePedidoMatches() já reage ao Firestore em tempo
        // real, mas confirmamos aqui de novo, na hora de gravar, para não
        // depender só do estado da tela.
        if (pedidoEscolhido.doacaoVinculadaId || !["pendente", "aprovado", "recusado"].includes(pedidoEscolhido.status)) {
            notify("Esse pedido já foi atendido por outra pessoa. Escolha outro pedido.", "warning");
            selectedPedidoId = "";
            populatePedidoMatches();
            return;
        }
    }

    // Só resolve o nome de quem vai receber quando um pedido específico foi
    // escolhido (a coleção "users" é legível por qualquer conta logada — ver
    // firestore.rules — então não há problema de privacidade em consultar
    // aqui, já que o doador está de fato vinculando a doação a esta pessoa).
    const beneficiaryName = pedidoEscolhido ? await resolveUserName(pedidoEscolhido.solicitanteId) : "";

    const nowIso = new Date().toISOString();
    const donation = {
        donorId: user.id,
        donorName: user.name,
        category, itemName, quantity, condition, weight, city, availability, description, photos: [],
        deliveryMethod: isOng ? "ong" : "direct",
        ongId, ongName,
        pedidoId: pedidoEscolhido ? pedidoEscolhido.id : "",
        beneficiaryId: pedidoEscolhido ? pedidoEscolhido.solicitanteId : "",
        beneficiaryName,
        // ONG: fluxo de triagem de sempre, começa em "ONG selecionada".
        // Pedido específico: o beneficiário já é conhecido no cadastro, então
        // pula direto para "Combinando entrega" (índice 3 do DIRECT_FLOW_STEPS
        // de sempre) em vez de passar por "Buscando beneficiário"/"aceitou".
        progressStep: isOng ? 1 : 3,
        trackingStatus: "Em andamento",
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [{
            step: isOng ? 1 : 3,
            label: isOng ? "ONG selecionada" : "Combinando entrega",
            date: nowIso,
            note: isOng
                ? `Doação cadastrada e direcionada para ${ongName}.`
                : `Doação cadastrada e destinada diretamente ao pedido de "${pedidoEscolhido.item}" (${pedidoEscolhido.solicitanteCidade}). Chat liberado para combinar local e horário.`
        }]
    };

    const { db, collection, addDoc } = refs;
    try {
        const novaDoacaoRef = await addDoc(collection(db, "doacoes"), donation);
        if (pedidoEscolhido) {
            await updatePedidoDoc(pedidoEscolhido.id,
                { status: "vinculado", doacaoVinculadaId: novaDoacaoRef.id },
                { status: "vinculado", note: `Doação de "${itemName}" vinculada diretamente por ${user.name}.` });
            // Texto pedido pela especificação do fluxo de atendimento direto:
            // o beneficiário é avisado assim que o sistema confirma o
            // vínculo doador ↔ pedido — é só a partir daqui que o chat
            // entre os dois fica liberado (fazParteDaDoacao(), firestore.rules).
            notificarUsuario(pedidoEscolhido.solicitanteId, "Uma pessoa se disponibilizou a atender seu pedido.",
                `${user.name} escolheu atender diretamente seu pedido de "${pedidoEscolhido.item}". Abra o chat para combinar a entrega.`,
                "Pedido", "pedido", { pedidoId: pedidoEscolhido.id });
        } else if (isOng) {
            // 🔴 Achado nesta auditoria (item 12): a ONG só era avisada de
            // uma doação nova quando ela chegava pelo caminho de "escolher
            // outra ONG" depois de uma recusa (confirmarReescolherOng(),
            // acima) — a criação original pelo assistente de doação nunca
            // notificava ninguém. A ONG só descobria a doação entrando por
            // conta própria na aba Movimentação. Fechado aqui.
            notificarUsuario(ongId, "Nova doação aguardando aprovação",
                `${user.name} direcionou uma doação de "${itemName}" para sua instituição.`,
                "Doação", "doacao", { doacaoId: novaDoacaoRef.id });
        }
        closeDonationWizard();
        notify(isOng
            ? `Doação enviada para ${ongName}. Você será avisado quando ela for aceita.`
            : "Doação vinculada! Um chat foi liberado para você combinar a entrega com quem vai receber.");
        // Assim que pedido + doação estão de fato vinculados, o chat já pode
        // ser aberto — mesmo comportamento de acceptDirectDonation() abaixo,
        // para o doador não precisar procurar o botão "Conversar" na lista.
        if (pedidoEscolhido) openDoacaoChat(novaDoacaoRef.id);
    } catch (error) {
        console.error(error);
        notify("Não foi possível salvar a doação no banco de dados. Tente novamente.", "danger");
    }
}

// -------- Doação para uma campanha (aba "Campanhas") --------
// Formulário dedicado e diferente do wizard genérico: o <select id="cd-item">
// só lista os itens que a própria campanha aceita (campanha.itensAceitos,
// com fallback pro produto único de campanhas antigas — ver
// itensAceitosDaCampanha(), acima) e a mediação já é sempre a ONG dona da
// campanha — ninguém escolhe outro item nem outra instituição aqui.
// Guarda a campanha atual em campaignDonationTarget para
// finalizeCampaignDonation() ler na hora de montar o documento, sem
// precisar re-consultar o cache pelo id do form.
let campaignDonationTarget = null;

function abrirCampaignDonationModal(campaignId) {
    const user = getCurrentUser();
    if (!user) {
        notify("Faça login para doar para esta campanha.", "warning");
        document.getElementById("open-login-btn")?.click();
        return;
    }
    const campanha = campanhasCache.find((c) => c.id === campaignId);
    if (!campanha) {
        notify("Não foi possível carregar esta campanha agora.", "danger");
        return;
    }
    campaignDonationTarget = campanha;

    document.getElementById("campaign-donation-form")?.reset();

    // Só os itens que a campanha aceita entram no <select> — é isso que
    // impede o doador de cadastrar, por exemplo, um cobertor numa
    // campanha que só pede alimentos.
    const itemSelect = document.getElementById("cd-item");
    if (itemSelect) {
        const itens = itensAceitosDaCampanha(campanha);
        itemSelect.innerHTML = `<option value="">Selecione</option>${itens.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
    }
    // "Campanha selecionada: X" — mantém visível qual campanha originou o
    // formulário, para o doador nunca perder essa referência a partir do
    // clique em "Quero contribuir" na campanha.
    const campaignNameEl = document.getElementById("cd-campaign-name");
    if (campaignNameEl) campaignNameEl.textContent = campanha.titulo || "Campanha";
    const subtitleEl = document.getElementById("campaign-donation-subtitle");
    if (subtitleEl) subtitleEl.textContent = `Mediado por ${campanha.ongName || "ONG parceira"}.`;

    document.getElementById("campaign-donation-modal")?.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
}

function fecharCampaignDonationModal() {
    document.getElementById("campaign-donation-modal")?.classList.add("hidden");
    campaignDonationTarget = null;
}

async function finalizeCampaignDonation(event) {
    event.preventDefault();
    const user = getCurrentUser();
    const campanha = campaignDonationTarget;
    if (!user || !campanha) return;
    const refs = fsRefs();
    if (!refs) {
        notify("Firebase ainda não configurado. Preencha js/firebase-config.js para salvar doações.", "danger");
        return;
    }

    const itemName = getValue("cd-item");
    const quantity = Number(getValue("cd-quantity")) || 1;
    const condition = getValue("cd-condition");
    // 🔴 Correção: este formulário nunca perguntava a cidade de quem doa —
    // a doação nascia sempre com city: "" e a ONG que fosse mediar (ver
    // renderOngMediationRequests()) não tinha como saber onde buscar o
    // item, diferente do wizard genérico (dw-city, obrigatório). Agora
    // "Cidade para retirada" é exigida aqui também, do mesmo jeito.
    const city = getValue("cd-city");
    const observacoes = getValue("cd-observacoes");
    const informacoesAdicionais = getValue("cd-info-adicional");

    // O item precisa estar entre os aceitos pela campanha — o <select>
    // já só lista essas opções (abrirCampaignDonationModal()), mas essa
    // checagem cobre alguém forçando outro value pelo DOM.
    if (!itemName || !itensAceitosDaCampanha(campanha).includes(itemName)) {
        notify("Escolha um item entre os aceitos por esta campanha.", "warning");
        return;
    }
    if (!condition || quantity < 1 || !city) {
        notify("Preencha os dados obrigatórios da doação.", "warning");
        return;
    }

    const nowIso = new Date().toISOString();
    // Sempre "ong" (a ONG dona da campanha) — é o mesmo formato de
    // doação usado no resto do site (mesma coleção "doacoes", mesmos
    // campos: donorId, itemName, quantity, condition, ongId/ongName,
    // trackingStatus etc.), só que com item, categoria e mediador já
    // restritos pela campanha em vez de escolhidos livremente no
    // formulário. "observacoes" é uma nota curta sobre o item em si (ex.:
    // tamanho, cor); "description" carrega as informações adicionais mais
    // livres que o doador quiser explicar para a ONG — os dois campos são
    // opcionais e independentes.
    const donation = {
        donorId: user.id,
        donorName: user.name,
        category: campanha.categoria || "Outros",
        itemName,
        quantity,
        condition,
        observacoes,
        city,
        availability: "Combinar horário",
        description: informacoesAdicionais,
        photos: [],
        deliveryMethod: "ong",
        ongId: campanha.ongId,
        ongName: campanha.ongName,
        campaignId: campanha.id,
        campaignTitulo: campanha.titulo,
        beneficiaryId: "", beneficiaryName: "",
        progressStep: 1,
        trackingStatus: "Em andamento",
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [{
            step: 1,
            label: "ONG selecionada",
            date: nowIso,
            note: `Doação de "${itemName}" cadastrada para a campanha "${campanha.titulo}" e direcionada para ${campanha.ongName || "a ONG"}.`
        }]
    };

    const { db, collection, addDoc } = refs;
    try {
        await addDoc(collection(db, "doacoes"), donation);
        fecharCampaignDonationModal();
        notify(`Doação enviada para ${campanha.ongName || "a ONG"}. A conversa já está disponível no chat.`);
        // A ONG dona da campanha é avisada na hora — sem isso, a doação só
        // aparecia pra ela quando alguém entrasse manualmente no painel de
        // mediação e reparasse a pendência nova.
        notificarUsuario(campanha.ongId, "Nova doação para sua campanha",
            `Uma nova doação foi destinada à sua campanha "${campanha.titulo}".`,
            "Campanha", "campanha", { campanhaId: campanha.id });
    } catch (error) {
        console.error(error);
        notify("Não foi possível salvar a doação no banco de dados. Tente novamente.", "danger");
    }
}
window.abrirCampaignDonationModal = abrirCampaignDonationModal;

// -------- Renderização dos painéis de acompanhamento --------
function renderMyDonations() {
    const block = document.getElementById("my-donations-block");
    const grid = document.getElementById("my-donations-grid");
    const user = getCurrentUser();
    if (!block || !grid) return;
    if (!user) { block.classList.add("hidden"); grid.innerHTML = ""; return; }

    // Só doações ainda em andamento: assim que concluída, cancelada ou
    // recusada, ela sai desta lista (o histórico continua salvo em
    // donation.history, só não aparece mais aqui).
    const mine = donationsCache.filter((d) => (d.donorId === user.id || d.beneficiaryId === user.id) && d.trackingStatus === "Em andamento");
    if (!mine.length) { block.classList.add("hidden"); grid.innerHTML = ""; return; }
    block.classList.remove("hidden");

    grid.innerHTML = mine.map((d) => {
        const isDonor = d.donorId === user.id;
        // Estado especial: a última ONG recusou a mediação (rejectOngDonation
        // limpa ongId/ongName e devolve trackingStatus para "Em andamento" —
        // ver comentário lá) e o doador ainda não decidiu o próximo passo.
        // Sem isso, a doação reaparecia aqui com a etiqueta genérica
        // "Mediação: undefined" e só o botão padrão de cancelar.
        const recusadaAguardandoDecisao = d.deliveryMethod === "ong" && !d.ongId && d.trackingStatus === "Em andamento";
        const roleTag = isDonor ? `<span class="flow-role-tag donor">Você está doando</span>` : `<span class="flow-role-tag beneficiary">Você vai receber</span>`;
        const methodLabel = recusadaAguardandoDecisao
            ? "Recusada pela ONG — escolha o próximo passo"
            : d.deliveryMethod === "ong"
                ? `Mediação: ${d.ongName}`
                : (d.beneficiaryId ? "Pedido específico atendido" : "Entrega direta (aguardando beneficiário)");
        const steps = getFlowSteps(d);
        const currentLabel = steps[Math.min(d.progressStep, steps.length - 1)];
        const statusPillLabel = recusadaAguardandoDecisao ? "Recusada pela ONG" : d.trackingStatus;
        const statusPillClass = recusadaAguardandoDecisao ? "recusada" : flowStatusPillClass(d.trackingStatus);
        const motivoRecusaHtml = recusadaAguardandoDecisao && d.ultimaRecusa?.motivo
            ? `<p class="flow-card-desc"><i data-lucide="alert-circle"></i> Motivo informado por ${escapeHtml(d.ultimaRecusa.ongName || "a ONG")}: ${escapeHtml(d.ultimaRecusa.motivo)}</p>`
            : "";

        let actions = "";
        if (recusadaAguardandoDecisao && isDonor) {
            actions += `<button class="btn btn-primary btn-sm" type="button" data-reescolher-ong="${d.id}"><i data-lucide="building-2"></i> Escolher outra ONG</button>
                        <button class="btn btn-secondary btn-sm" type="button" data-tornar-direta="${d.id}"><i data-lucide="hand-heart"></i> Disponibilizar diretamente</button>
                        <button class="btn btn-secondary btn-sm" type="button" data-cancel-donation="${d.id}">Cancelar doação</button>`;
        } else if (isDonor && d.trackingStatus === "Em andamento" && d.progressStep <= 1) {
            actions += `<button class="btn btn-secondary btn-sm" type="button" data-cancel-donation="${d.id}">Cancelar doação</button>`;
        }
        if (!recusadaAguardandoDecisao && d.deliveryMethod === "direct" && d.trackingStatus === "Em andamento" && d.progressStep >= 2 && d.progressStep < steps.length - 1) {
            actions += `<button class="btn btn-secondary btn-sm" type="button" data-open-donation-chat="${d.id}"><i data-lucide="message-circle"></i> Abrir chat</button>`;
            // Dois passos separados (item 9 da revisão): primeiro o doador
            // marca que entregou (progressStep 3 → 4); só depois o
            // beneficiário — e só ele, ver checagem de identidade em
            // confirmDirectDelivery() — confirma o recebimento, o que de
            // fato fecha o ciclo (progressStep 4 → 5, trackingStatus
            // "Entregue").
            if (isDonor) {
                if (d.progressStep === 3) {
                    actions += `<button class="btn btn-primary btn-sm" type="button" data-mark-delivered="${d.id}">Marcar como entregue</button>`;
                } else {
                    actions += `<span class="flow-waiting-note">Aguardando confirmação do beneficiário</span>`;
                }
            } else if (d.progressStep >= 4) {
                actions += `<button class="btn btn-primary btn-sm" type="button" data-confirm-delivery="${d.id}">Confirmar recebimento</button>`;
            } else {
                actions += `<span class="flow-waiting-note">Aguardando o doador marcar a entrega como realizada</span>`;
            }
        }
        if (d.deliveryMethod === "ong" && isDonor && d.trackingStatus === "Em andamento" && d.progressStep >= 2) {
            actions += `<button class="btn btn-secondary btn-sm" type="button" data-open-donation-chat="${d.id}"><i data-lucide="message-circle"></i> Conversar com a ONG</button>`;
        }

        return `
        <article class="flow-donation-card">
            <div class="flow-card-top">
                ${roleTag}
                <span class="flow-status-pill ${statusPillClass}">${escapeHtml(statusPillLabel)}</span>
            </div>
            <h4>${escapeHtml(d.itemName)}</h4>
            <p class="flow-card-meta"><i data-lucide="tag"></i> ${escapeHtml(d.category)} · ${d.quantity} un. · ${escapeHtml(methodLabel)}</p>
            ${d.city ? `<p class="flow-card-meta"><i data-lucide="map-pin"></i> ${escapeHtml(d.city)}</p>` : ""}
            ${motivoRecusaHtml}
            ${renderFlowProgress(d)}
            <p class="flow-current-step">Etapa atual: <strong>${escapeHtml(currentLabel)}</strong></p>
            <div class="flow-card-actions">${actions}</div>
        </article>`;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
}

// Caminho de compatibilidade: desde a mudança do passo 2 do wizard (item 7
// da revisão), toda NOVA doação "direct" já nasce com beneficiaryId
// preenchido (o doador escolhe a pessoa na hora — ver finalizeDonationWizard).
// Esta lista só volta a mostrar algo se ainda existir, no banco, alguma
// doação "direct" antiga sem beneficiário, cadastrada antes desta mudança
// — mantida de propósito para não deixar essas doações antigas travadas
// sem ninguém poder aceitá-las.
function renderDirectDonationsAvailable() {
    const block = document.getElementById("direct-donations-block");
    const grid = document.getElementById("direct-donations-grid");
    const user = getCurrentUser();
    if (!block || !grid) return;

    const available = donationsCache.filter((d) => d.deliveryMethod === "direct" && !d.beneficiaryId && d.trackingStatus === "Em andamento" && (!user || d.donorId !== user.id));
    if (!user || !available.length) { block.classList.add("hidden"); grid.innerHTML = ""; return; }
    block.classList.remove("hidden");

    grid.innerHTML = available.map((d) => `
        <article class="flow-donation-card">
            <div class="flow-card-top">
                <span class="flow-role-tag">Doado por ${escapeHtml(d.donorName)}</span>
                <span class="flow-status-pill andamento">Disponível</span>
            </div>
            <h4>${escapeHtml(d.itemName)}</h4>
            <p class="flow-card-meta"><i data-lucide="tag"></i> ${escapeHtml(d.category)} · ${d.quantity} un. · ${escapeHtml(d.condition)}</p>
            <p class="flow-card-meta"><i data-lucide="map-pin"></i> ${escapeHtml(d.city)}</p>
            ${d.description ? `<p class="flow-card-desc">${escapeHtml(d.description)}</p>` : ""}
            <div class="flow-card-actions">
                <button class="btn btn-primary btn-sm" type="button" data-accept-direct="${d.id}"><i data-lucide="hand-heart"></i> Aceitar e combinar retirada</button>
            </div>
        </article>`).join("");

    if (window.lucide) window.lucide.createIcons();
}

function renderOngMediationRequests() {
    const block = document.getElementById("ong-mediation-block");
    const grid = document.getElementById("ong-mediation-grid");
    const user = getCurrentUser();
    if (!block || !grid) return;

    if (!user || user.role !== "ong") { block.classList.add("hidden"); grid.innerHTML = ""; return; }

    // Assim que a mediação é concluída, cancelada ou recusada, ela sai
    // desta lista de pendências (histórico continua em donation.history).
    const mine = donationsCache.filter((d) => d.deliveryMethod === "ong" && d.ongId === user.id && d.trackingStatus === "Em andamento");
    if (!mine.length) { block.classList.add("hidden"); grid.innerHTML = ""; return; }
    block.classList.remove("hidden");

    grid.innerHTML = mine.map((d) => {
        const steps = getFlowSteps(d);
        const currentLabel = steps[Math.min(d.progressStep, steps.length - 1)];
        let actions = "";
        if (d.trackingStatus === "Em andamento") {
            if (d.progressStep === 1) {
                actions = `<button class="btn btn-success btn-sm" type="button" data-ong-advance="${d.id}"><i data-lucide="check"></i> Aceitar mediação</button>
                           <button class="btn btn-secondary btn-sm" type="button" data-ong-reject="${d.id}">Recusar</button>`;
            } else if (d.progressStep === 2) {
                actions = `<button class="btn btn-primary btn-sm" type="button" data-ong-advance="${d.id}">Marcar item como recebido</button>`;
            } else if (d.progressStep === 3) {
                actions = `<button class="btn btn-primary btn-sm" type="button" data-ong-advance="${d.id}">Iniciar separação</button>`;
            } else if (d.progressStep === 4) {
                actions = `<button class="btn btn-primary btn-sm" type="button" data-ong-advance="${d.id}">Marcar como entregue</button>`;
            } else if (d.progressStep === 5) {
                // Ver comentário em advanceOngDonation(): a etapa final só
                // fecha quando o beneficiário também confirmou o
                // recebimento pelo próprio pedido — sem isso, mostramos o
                // aviso de espera em vez de um botão que seria recusado.
                actions = (d.beneficiaryId && !d.beneficiarioConfirmouRecebimento)
                    ? `<span class="flow-waiting-note">Aguardando o beneficiário confirmar o recebimento</span>`
                    : `<button class="btn btn-success btn-sm" type="button" data-ong-advance="${d.id}">Confirmar conclusão</button>`;
            }
            if (d.progressStep >= 2) {
                actions += `<button class="btn btn-secondary btn-sm" type="button" data-open-donation-chat="${d.id}"><i data-lucide="message-circle"></i> Conversar com o doador</button>`;
            }
        }
        // Doação vinda de "Quero contribuir" numa campanha (campaignId
        // presente): mostra a campanha de origem, para a ONG não confundir
        // essa pendência com uma doação avulsa comum.
        const campaignTag = d.campaignId
            ? `<p class="flow-card-meta"><i data-lucide="megaphone"></i> Campanha: ${escapeHtml(d.campaignTitulo || "—")}</p>`
            : "";
        return `
        <article class="flow-donation-card">
            <div class="flow-card-top">
                <span class="flow-role-tag">Doador: ${escapeHtml(d.donorName)}</span>
                <span class="flow-status-pill ${flowStatusPillClass(d.trackingStatus)}">${d.trackingStatus}</span>
            </div>
            <h4>${escapeHtml(d.itemName)}</h4>
            <p class="flow-card-meta"><i data-lucide="tag"></i> ${escapeHtml(d.category)} · ${d.quantity} un. · ${escapeHtml(d.condition)}</p>
            ${d.city ? `<p class="flow-card-meta"><i data-lucide="map-pin"></i> ${escapeHtml(d.city)}</p>` : ""}
            ${d.observacoes ? `<p class="flow-card-meta"><i data-lucide="pencil-line"></i> ${escapeHtml(d.observacoes)}</p>` : ""}
            ${campaignTag}
            ${d.description ? `<p class="flow-card-desc">${escapeHtml(d.description)}</p>` : ""}
            ${renderFlowProgress(d)}
            <p class="flow-current-step">Etapa atual: <strong>${escapeHtml(currentLabel)}</strong></p>
            <div class="flow-card-actions">${actions}</div>
        </article>`;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
}

function renderDonationFlows() {
    renderMyDonations();
    renderDirectDonationsAvailable();
    renderOngMediationRequests();
}

// Fase 1: só ONGs já aprovadas pelo administrador podem mediar doações/pedidos
// (aprovar, recusar, avançar etapa, vincular). Enquanto "approved" for false,
// a ONG ainda consegue logar, ver e editar o próprio perfil normalmente —
// só essas ações exclusivas ficam bloqueadas até a aprovação.
function requireOngAprovada() {
    const user = getCurrentUser();
    if (!user || user.role !== "ong") {
        notify("Apenas ONGs podem realizar esta ação.", "danger");
        return null;
    }
    const aprovada = window.isOngAprovada ? window.isOngAprovada(user) : user.status === "approved";
    if (!aprovada) {
        notify("Sua instituição ainda está aguardando aprovação da administração. Assim que for aprovada, você poderá mediar doações e pedidos.", "warning");
        return null;
    }
    return user;
}

// -------- Ações sobre uma doação (cancelar, aceitar, avançar etapa) --------
async function cancelDonation(id) {
    await updateDonationDoc(id, { trackingStatus: "Cancelada" }, "Doação cancelada pelo doador.");
    notify("Doação cancelada.", "info");
}

async function acceptDirectDonation(id) {
    const user = getCurrentUser();
    if (!user) return;
    const donation = donationsCache.find((d) => d.id === id);
    if (!donation || donation.beneficiaryId) return;
    // Regra fundamental (doadorId !== beneficiarioId): quem cadastrou a
    // doação não pode escolher a própria doação. renderDirectDonationsAvailable()
    // já filtra "d.donorId !== user.id" da lista, mas essa é só a
    // renderização — a ação em si precisa da mesma checagem, senão um
    // clique forçado por fora da UI normal (ou uma lista desatualizada)
    // conseguiria vincular o doador como beneficiário de si mesmo.
    if (donation.donorId === user.id) {
        notify("Você não pode aceitar a própria doação.", "danger");
        return;
    }
    await updateDonationDoc(id,
        { beneficiaryId: user.id, beneficiaryName: user.name, progressStep: 3 },
        `${user.name} aceitou receber a doação. Combinação de entrega iniciada.`);
    notify("Você aceitou a doação! Abra o chat para combinar local e horário.");
    notificarUsuario(donation.donorId, "Doação aceita!",
        `${user.name} aceitou sua doação de "${donation.itemName}". Abra o chat para combinar a entrega.`,
        "Doação", "doacao", { doacaoId: id });
    openDoacaoChat(id);
}

// Item 9 da revisão: a spec descreve dois passos separados depois de
// "Combinando entrega" — o doador marca que entregou, e só depois o
// beneficiário confirma que recebeu. A versão anterior colapsava os dois
// num só (o beneficiário confirmava direto, sem o doador nunca ter
// marcado nada), pulando a etapa "Entregue" que já existia, sem uso, no
// próprio DIRECT_FLOW_STEPS. markDirectDelivered() cobre a primeira
// metade; confirmDirectDelivery() (abaixo) agora exige que ela já tenha
// acontecido.
async function markDirectDelivered(id) {
    const user = getCurrentUser();
    if (!user) return;
    const donation = donationsCache.find((d) => d.id === id);
    if (!donation) return;
    if (donation.donorId !== user.id) {
        notify("Só quem doou o item pode marcar a entrega como realizada.", "warning");
        return;
    }
    if (donation.progressStep !== 3) return;
    await updateDonationDoc(id,
        { progressStep: 4 },
        "Doador marcou a entrega como realizada. Aguardando confirmação do beneficiário.");
    notify("Entrega marcada! Assim que o beneficiário confirmar o recebimento, a doação será concluída.");
    notificarUsuario(donation.beneficiaryId, "O doador marcou a entrega como realizada",
        `${user.name} marcou a doação de "${donation.itemName}" como entregue. Confirme o recebimento assim que estiver com o item em mãos.`,
        "Doação", "doacao", { doacaoId: id });
}

async function confirmDirectDelivery(id) {
    const user = getCurrentUser();
    if (!user) return;
    const donation = donationsCache.find((d) => d.id === id);
    if (!donation) return;
    // É o beneficiário quem recebeu o item de verdade, então é ele quem
    // confirma o recebimento — não o doador. Sem essa checagem, qualquer
    // participante da doação (inclusive o próprio doador) conseguia marcar
    // a entrega como concluída sem que o beneficiário tivesse confirmado
    // nada, mesmo com o botão já escondido do doador na interface.
    if (donation.beneficiaryId !== user.id) {
        notify("Só quem recebeu a doação pode confirmar o recebimento.", "warning");
        return;
    }
    // Só pode confirmar depois que o doador marcou a entrega (progressStep
    // 4, "Entregue") — antes disso o botão nem aparece na interface, mas a
    // checagem aqui fecha o mesmo caminho por fora dela.
    if (donation.progressStep !== 4) {
        notify("Aguarde o doador marcar a entrega como realizada antes de confirmar.", "warning");
        return;
    }
    const steps = getFlowSteps(donation);
    await updateDonationDoc(id,
        { progressStep: steps.length - 1, trackingStatus: "Entregue" },
        "Recebimento confirmado pelo beneficiário.");
    notify("Recebimento confirmado. Obrigado por fazer parte dessa ponte solidária!");
    notificarUsuario(donation.donorId, "Recebimento confirmado",
        `${user.name} confirmou o recebimento da doação de "${donation.itemName}".`, "Doação", "doacao", { doacaoId: id });
}

// 🔴 Correção (item 2 do plano de finalização): a doação mediada por ONG
// e o pedido vinculado a ela são dois documentos separados
// (doacoes/{id} e pedidos/{id}) que nunca se sincronizavam na conclusão.
// A ONG sozinha conseguia passar por todas as etapas até "Concluída"
// (trackingStatus "Entregue") sem que o beneficiário jamais tivesse
// confirmado o recebimento do próprio pedido — e, ao contrário, quando o
// beneficiário confirmava recebimento (confirmarRecebimentoPedido(),
// abaixo) isso fechava só o PEDIDO dele, sem refletir nada na doação: ela
// continuava "Em andamento" pra sempre na grade da ONG e do doador, quer
// a ONG tivesse terminado suas etapas ou não. As duas grades (ONG e
// doador) leem o MESMO campo trackingStatus do MESMO documento, então
// nunca poderiam sumir uma sem a outra ao mesmo tempo — o que faltava
// era esse campo só virar "Entregue" quando as DUAS confirmações (ONG
// terminou suas etapas E beneficiário confirmou recebimento do pedido)
// já tivessem acontecido, não só uma delas.
// donation.beneficiarioConfirmouRecebimento (novo campo, só usado quando
// deliveryMethod "ong" e há beneficiaryId) guarda a confirmação do lado
// do beneficiário; a mesma regra está espelhada em firestore.rules
// (avancoPelaOng() e a nova beneficiarioConfirmaRecebimentoMediado()).
async function advanceOngDonation(id) {
    const ong = requireOngAprovada();
    if (!ong) return;
    const donation = donationsCache.find((d) => d.id === id);
    if (!donation) return;
    const steps = getFlowSteps(donation);
    if (donation.progressStep >= steps.length - 1) return;
    const nextStep = donation.progressStep + 1;
    const finalizando = nextStep === steps.length - 1;
    // Só bloqueia na etapa final ("Concluída") — as etapas anteriores
    // (aceitar, receber, separar, marcar como entregue) continuam só da
    // ONG, sem depender de ninguém.
    if (finalizando && donation.beneficiaryId && !donation.beneficiarioConfirmouRecebimento) {
        notify("Aguardando o beneficiário confirmar o recebimento pelo próprio pedido para concluir.", "warning");
        return;
    }
    const patch = { progressStep: nextStep };
    if (finalizando) patch.trackingStatus = "Entregue";
    await updateDonationDoc(id, patch, `Etapa atualizada para "${steps[nextStep]}".`);
    notify(`Doação atualizada: ${steps[nextStep]}.`);
    if (nextStep === 2) {
        // "Aceitar mediação" — a partir daqui o chat entre doador e ONG
        // já pode ser usado por qualquer um dos dois lados.
        notificarUsuario(donation.donorId, "ONG aceitou mediar sua doação",
            `${ong.name} aceitou mediar a doação de "${donation.itemName}". Você já pode conversar pelo chat.`,
            "Doação", "doacao", { doacaoId: id });
        // Item 12 da revisão ("Nova doação disponível"): a partir daqui a
        // doação entra no estoque da ONG, disponível para ser vinculada a
        // um pedido (findCompatibleDonations(), usado por
        // renderOngPedidos() acima) — avisamos quem já tem um pedido
        // aprovado da mesma categoria esperando uma doação compatível.
        if (!donation.beneficiaryId) {
            notificarSolicitantesDoacaoDisponivel({ ...donation, id });
        }
    } else if (finalizando) {
        notificarUsuario(donation.donorId, "Doação concluída",
            `Sua doação de "${donation.itemName}" foi entregue por ${ong.name}. Obrigado por fazer parte dessa ponte solidária!`,
            "Doação", "doacao", { doacaoId: id });
    }
}

// Item 12 da revisão ("Nova doação disponível"): dado uma doação recém
// aceita por uma ONG (ainda sem beneficiário definido), avisa cada
// solicitante com um pedido aprovado, ainda sem doação vinculada, da
// mesma categoria (e cidade parecida, quando dá pra comparar) — o mesmo
// critério de compatibilidade já usado por findCompatibleDonations(),
// só que na direção oposta (parte da doação, procura pedidos).
function findCompatiblePedidos(donation) {
    const cidadeDoacao = String(donation.city || "").toLowerCase();
    return pedidosCache.filter((p) => {
        if (p.status !== "aprovado" || p.doacaoVinculadaId) return false;
        if (String(p.category).toLowerCase() !== String(donation.category).toLowerCase()) return false;
        const solicitanteCidade = String(p.solicitanteCidade || "").toLowerCase();
        if (!cidadeDoacao || !solicitanteCidade) return true;
        return cidadeDoacao.includes(solicitanteCidade.split(/[-,]/)[0].trim()) || solicitanteCidade.includes(cidadeDoacao.split(/[-,]/)[0].trim());
    });
}
function notificarSolicitantesDoacaoDisponivel(donation) {
    findCompatiblePedidos(donation).forEach((p) => {
        notificarUsuario(p.solicitanteId, "Nova doação disponível",
            `Uma nova doação de "${donation.itemName}" está disponível e pode atender ao seu pedido de "${p.item}".`,
            "Doação", "doacao_disponivel", { pedidoId: p.id });
    });
}

// Recusa da mediação por parte da ONG. Duas exigências do fluxo que a
// versão anterior não cumpria:
//   1) A ONG precisa informar um motivo (igual já acontecia em
//      recusarPedido(), só que aqui simplesmente não existia nenhum
//      prompt — a doação era recusada sem que o doador soubesse por quê).
//   2) A doação recusada NÃO pode desaparecer: a versão anterior só
//      gravava trackingStatus "Recusada", e toda tela do doador
//      (renderMyDonations) filtra estritamente por trackingStatus ===
//      "Em andamento" — ou seja, a doação sumia de vez de qualquer lugar
//      visível, ficando presa só no histórico do Firestore, sem chance de
//      o doador escolher outra ONG, disponibilizar direto ou cancelar.
//      Agora ela volta para "Em andamento" sem ongId/ongName (o que a
//      reencaixa automaticamente em "Minhas doações", só que num estado
//      "aguardando decisão" — ver renderMyDonations()), guardando o
//      motivo em ultimaRecusa e a própria ONG em ongsRecusadas (pra não
//      sugerir de novo a mesma instituição em abrirReescolherOngModal()).
async function rejectOngDonation(id) {
    const ong = requireOngAprovada();
    if (!ong) return;
    const donation = donationsCache.find((d) => d.id === id);
    if (!donation) return;
    const motivo = window.prompt("Motivo da recusa (será enviado ao doador):", "");
    if (motivo === null) return; // ONG fechou o prompt sem confirmar: nada muda.
    const motivoFinal = motivo.trim() || "A instituição não informou um motivo específico.";
    const ongsRecusadas = [...new Set([...(donation.ongsRecusadas || []), donation.ongId].filter(Boolean))];

    await updateDonationDoc(id,
        {
            trackingStatus: "Em andamento",
            progressStep: 0,
            ongId: "", ongName: "",
            ongsRecusadas,
            ultimaRecusa: { ongId: ong.id, ongName: ong.name, motivo: motivoFinal, date: new Date().toISOString() }
        },
        `Mediação recusada por ${ong.name}. Motivo: ${motivoFinal}`);
    notify("Solicitação de mediação recusada.", "warning");
    notificarUsuario(donation.donorId, "Mediação recusada",
        `A ONG ${ong.name} recusou sua doação de "${donation.itemName}". Motivo: ${motivoFinal} A doação continua disponível para você: escolha outra instituição, disponibilize-a diretamente ou cancele-a.`,
        "Doação", "doacao", { doacaoId: id });
}

// -------- Depois de uma recusa: escolher outra ONG ou ir direto --------
let reescolherOngDoacaoId = "";

function abrirReescolherOngModal(id) {
    const donation = donationsCache.find((d) => d.id === id);
    if (!donation) return;
    reescolherOngDoacaoId = id;
    const select = document.getElementById("reescolher-ong-select");
    if (select) {
        const excluidas = new Set(donation.ongsRecusadas || []);
        const disponiveis = getApprovedOngs().filter((o) => !excluidas.has(o.id));
        select.innerHTML = disponiveis.length
            ? disponiveis.map((o) => `<option value="${o.id}">${escapeHtml(o.name)}</option>`).join("")
            : `<option value="">Nenhuma outra ONG validada disponível no momento</option>`;
    }
    document.getElementById("reescolher-ong-modal")?.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
}

function fecharReescolherOngModal() {
    document.getElementById("reescolher-ong-modal")?.classList.add("hidden");
    reescolherOngDoacaoId = "";
}

async function confirmarReescolherOng(event) {
    if (event) event.preventDefault();
    const id = reescolherOngDoacaoId;
    const donation = donationsCache.find((d) => d.id === id);
    if (!id || !donation) return;
    const select = document.getElementById("reescolher-ong-select");
    const ongId = select?.value || "";
    const ongName = select?.selectedOptions?.[0]?.textContent || "";
    if (!ongId) {
        notify("Escolha uma instituição para mediar a doação.", "warning");
        return;
    }
    await updateDonationDoc(id,
        { ongId, ongName, progressStep: 1, trackingStatus: "Em andamento" },
        `Doação redirecionada para ${ongName} depois da recusa anterior.`);
    notify(`Doação enviada para ${ongName}. Você será avisado quando ela for aceita.`);
    notificarUsuario(ongId, "Nova doação aguardando aprovação",
        `${donation.donorName} direcionou uma doação de "${donation.itemName}" para sua instituição.`,
        "Doação", "doacao", { doacaoId: id });
    fecharReescolherOngModal();
}

// Depois de uma recusa, o doador também pode abrir mão da mediação e
// disponibilizar a doação diretamente para quem quiser aceitar (mesmo
// caminho de compatibilidade já lido por renderDirectDonationsAvailable()
// e acceptDirectDonation() — ver comentário acima dessas funções).
async function tornarDoacaoDireta(id) {
    const donation = donationsCache.find((d) => d.id === id);
    if (!donation) return;
    await updateDonationDoc(id,
        { deliveryMethod: "direct", ongId: "", ongName: "", beneficiaryId: "", beneficiaryName: "", progressStep: 1, trackingStatus: "Em andamento" },
        "Doação disponibilizada diretamente após recusa da ONG.");
    notify("Doação disponibilizada para entrega direta. Assim que alguém aceitar, você será avisado.");
}

/* ========================================================
   MÓDULO 4 — PEDIDOS DE AJUDA (Firestore: "pedidos")
   Qualquer pessoa pode solicitar: alimentos, roupas, móveis
   ou remédios, informando quantidade, urgência, descrição e
   fotos (opcional). Uma ONG analisa e pode aprovar, recusar
   ou solicitar mais informações. Depois de aprovado, a ONG
   busca uma doação compatível (mesma categoria/cidade) e
   vincula o pedido a ela.
   ======================================================== */

// Fase 3: 5 estágios oficiais do pedido, conforme especificação. Os valores
// gravados no campo "status" continuam os mesmos de antes (pendente,
// aprovado, recusado, mais_info, vinculado) — não renomeei nada no banco
// para não quebrar pedidos já existentes. Este array só mapeia, para fins
// de EXIBIÇÃO (barra de progresso), cada status técnico ao estágio
// correspondente do fluxo pedido pela Fase 3: Criado → Em análise →
// Aprovado → Atendido → Concluído.
const PEDIDO_STATUS_STEPS = ["Publicado", "Atendido", "Concluído"];

// "mais_info" é um desvio dentro de "Em análise" (a ONG pediu mais dados,
// mas o pedido ainda não foi julgado); "recusado" é um estado terminal
// negativo, mostrado à parte (fora da barra), igual já acontece hoje com
// "Cancelada"/"Recusada" nas doações.
function pedidoProgressStep(status) {
    // pendente/mais_info: pedidos antigos, de quando havia análise da ONG.
    return { pendente: 0, mais_info: 0, aprovado: 0, vinculado: 1, concluido: 2 }[status] ?? 0;
}

function renderPedidoProgress(pedido) {
    if (pedido.status === "recusado") {
        return `<p class="flow-card-desc"><i data-lucide="x-circle"></i> Este pedido foi recusado${pedido.ongName ? ` por ${escapeHtml(pedido.ongName)}` : ""}.</p>`;
    }
    const current = pedidoProgressStep(pedido.status);
    return `
        <div class="flow-progress-track">
            ${PEDIDO_STATUS_STEPS.map((label, index) => {
                let state = "";
                if (index < current) state = "completed";
                else if (index === current) state = "active";
                return `<div class="flow-progress-step ${state}">
                    <span class="flow-progress-dot"></span>
                    <span class="flow-progress-label">${escapeHtml(label)}</span>
                </div>`;
            }).join("")}
        </div>`;
}

function pedidoStatusLabel(status) {
    return {
        pendente: "Publicado — aguardando um doador",
        aprovado: "Publicado — aguardando um doador",
        recusado: "Disponível para atendimento direto",
        mais_info: "Publicado — aguardando um doador",
        vinculado: "Atendido — doação vinculada",
        concluido: "Concluído — recebimento confirmado"
    }[status] || status;
}

// Privacidade (Módulo 4): o nome completo da família só é mostrado para
// quem precisa saber — a própria pessoa solicitante, a ONG responsável pelo
// pedido (depois que ela o assume) e o administrador. Em qualquer outra
// tela (lista pública "Itens Urgentes Coletivos", ou o painel de uma ONG
// que ainda não assumiu o pedido) mostramos só "Família em <cidade>".
// Campos do pedido que também existem em /pedidos_publicos (ver
// firestore.rules) — nunca inclui solicitanteNome, photos, ongObservacao
// ou history, que só existem no documento privado /pedidos.
const PEDIDO_CAMPOS_PUBLICOS = [
    "solicitanteId", "solicitanteCidade", "category", "item", "quantity",
    "urgency", "description", "status", "ongId", "doacaoVinculadaId",
    "atendimento", "createdAt", "updatedAt"
];

function pedidoDadosPublicos(pedido) {
    const publico = {};
    PEDIDO_CAMPOS_PUBLICOS.forEach((campo) => { if (campo in pedido) publico[campo] = pedido[campo]; });
    return publico;
}

// Busca um pedido pelo id preferindo sempre a versão privada e completa
// (pedidosCache — só chega aqui quando o Firestore autoriza a leitura
// completa: solicitante, ONG responsável ou admin). Se a conta logada não
// tem esse acesso, cai para a versão sanitizada (pedidosPublicosCache),
// que é o que sobra pra qualquer outro usuário logado.
function pedidoParaExibicao(id) {
    return pedidosCache.find((p) => p.id === id) || pedidosPublicosCache.find((p) => p.id === id);
}

// Lista combinada usada pelas telas que precisam enxergar TODOS os
// pedidos relevantes (fila pública, fila de triagem de ONG), mas cada um
// só com o nível de detalhe que a conta logada realmente tem permissão
// de ver — o Firestore, não o front-end, é quem decide isso agora.
function pedidosVisiveis() {
    const idsPrivados = new Set(pedidosCache.map((p) => p.id));
    return [...pedidosCache, ...pedidosPublicosCache.filter((p) => !idsPrivados.has(p.id))];
}

function pedidoNomeExibicao(pedido, viewerUser) {
    const souSolicitante = viewerUser && viewerUser.id === pedido.solicitanteId;
    const souOngResponsavel = viewerUser && viewerUser.role === "ong" && viewerUser.id === pedido.ongId;
    const souAdmin = viewerUser && viewerUser.role === "admin";
    if (souSolicitante || souOngResponsavel || souAdmin) return pedido.solicitanteNome;
    return `Família em ${pedido.solicitanteCidade || "local não informado"}`;
}

function pedidoStatusPillClass(status) {
    return {
        pendente: "andamento",
        aprovado: "andamento",
        recusado: "cancelada",
        mais_info: "recusada",
        vinculado: "entregue",
        concluido: "entregue"
    }[status] || "andamento";
}

// Salva um pedido de ajuda (Módulo 4) e o publica em Itens Urgentes Coletivos.
async function saveHelpRequest(event) {
    event?.preventDefault();
    const form = document.getElementById("help-request-form");
    if (form && !form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const user = getCurrentUser();
    if (!user) {
        notify("Faça login para registrar um pedido de ajuda.", "warning");
        document.getElementById("open-login-btn")?.click();
        return;
    }

    const refs = fsRefs();
    if (!refs) {
        notify("Firebase ainda não configurado. Preencha js/firebase-config.js para salvar pedidos.", "danger");
        return;
    }

    const familyName = getValue("req-family-name") || user.name;
    const city = getValue("req-family-city") || user.address?.split(",").slice(-2)[0]?.trim() || "Local não informado";
    const category = getValue("req-family-type") || "Outros";
    const item = getValue("req-family-item");
    const quantity = Number(getValue("req-family-qty")) || 1;
    const urgency = getValue("req-family-urgency") || "media";
    const description = getValue("req-family-desc");
    // Sem escolha de "como receber ajuda": o pedido não grava o campo
    // `atendimento` e, como já acontecia com pedidos antigos, fica valendo
    // para os dois canais (fila de triagem das ONGs e lista de doadores).

    if (!item || !description) {
        notify("Preencha o item e a descrição da necessidade.", "warning");
        return;
    }

    const nowIso = new Date().toISOString();
    const pedido = {
        solicitanteId: user.id,
        solicitanteNome: familyName,
        solicitanteCidade: city,
        category, item, quantity, urgency, description, photos: [],
        // Sem triagem: o pedido nasce publicado ("aprovado", sem ONG) e já
        // aparece na aba Movimentação para os doadores. A ONG só entra
        // quando um doador escolhe a mediação da ONG para a doação.
        status: "aprovado",
        ongId: "", ongName: "", ongObservacao: "",
        doacaoVinculadaId: "",
        createdAt: nowIso, updatedAt: nowIso,
        history: [{ status: "aprovado", date: nowIso, note: "Pedido publicado pelo solicitante." }]
    };

    const { db, collection, doc, setDoc } = refs;
    // Gera o id antes de gravar para poder usar o MESMO id no documento
    // privado ("pedidos") e no espelho sanitizado ("pedidos_publicos") —
    // é o que permite pedidoParaExibicao()/pedidosVisiveis() tratarem os
    // dois como o mesmo pedido, só com nível de detalhe diferente.
    const novoRef = doc(collection(db, "pedidos"));
    try {
        await setDoc(novoRef, pedido);
        await setDoc(doc(db, "pedidos_publicos", novoRef.id), pedidoDadosPublicos(pedido));
        form?.reset();
        activateDonationTab("movement-tab");
        document.getElementById("movement-tab")?.scrollIntoView({ behavior: "smooth", block: "start" });
        notify("Pedido publicado! Ele já aparece na Movimentação para os doadores.");
        // Avisa quem tem doação compatível em estoque (antes isso só
        // acontecia quando uma ONG aprovava o pedido).
        try {
            findCompatibleDonations({ ...pedido, id: novoRef.id }).forEach((d) => {
                if (d.donorId === user.id) return;
                notificarUsuario(d.donorId, "Novo pedido compatível",
                    `Existe um novo pedido que pode ser atendido pela sua doação de "${d.itemName}".`,
                    "Pedido", "pedido_compativel", { pedidoId: novoRef.id });
            });
        } catch (notifyError) { console.warn("Falha ao avisar doadores compatíveis.", notifyError); }
    } catch (error) {
        console.error(error);
        notify("Não foi possível enviar o pedido. Tente novamente.", "danger");
    }
}

// Pedidos de ajuda de OUTRAS pessoas, disponíveis para atendimento direto
// (aba Movimentação): pedidos com esse canal escolhido, ainda pendentes/
// aprovados, mais qualquer pedido recusado por uma ONG (ver comentário
// dentro da função). Some daqui assim que o pedido é vinculado a uma
// doação ou concluído — igual aos demais blocos de "outras pessoas" da aba.
function renderCommunityPedidos() {
    const block = document.getElementById("community-pedidos-block");
    const grid = document.getElementById("community-pedidos-grid");
    if (!grid || !block) return;
    const user = getCurrentUser();

    // Item 10 da revisão: dois motivos pra um pedido aparecer aqui —
    //   1) o solicitante escolheu "atendimento direto" desde o início
    //      (atendimento === "direto"; pedidos sem esse campo, gravados
    //      antes desta mudança, continuam valendo pros dois canais, daí o
    //      fallback !p.atendimento);
    //   2) uma ONG recusou o pedido (status "recusado") — a spec pede que
    //      ele NÃO fique preso, e sim disponível pra atendimento direto,
    //      independente do canal escolhido originalmente.
    const items = pedidosVisiveis().filter((p) => (!user || p.solicitanteId !== user.id) && (
        p.status === "recusado" ||
        ((p.status === "pendente" || p.status === "aprovado") && (!p.atendimento || p.atendimento === "direto"))
    ));
    if (!items.length) { block.classList.add("hidden"); grid.innerHTML = ""; return; }
    block.classList.remove("hidden");

    grid.innerHTML = items.map((item) => `
        <article class="community-item-card">
            <div class="community-item-topline">
                <span class="card-badge badge-urgent">${item.urgency === "alta" ? "Urgente" : item.urgency === "baixa" ? "Necessidade" : "Prioridade média"}</span>
                <span class="community-item-date">${escapeHtml(new Date(item.createdAt).toLocaleDateString("pt-BR"))}</span>
            </div>
            <h4>${escapeHtml(item.item)}</h4>
            <p class="community-item-location"><i data-lucide="map-pin"></i> ${escapeHtml(item.solicitanteCidade)}</p>
            ${item.status === "recusado" ? `<p class="flow-card-desc"><i data-lucide="alert-circle"></i> Uma ONG não conseguiu atender este pedido — disponível para atendimento direto.</p>` : ""}
            <p>${escapeHtml(item.description)}</p>
            <div class="community-item-footer">
                <span class="category-tag">${escapeHtml(item.category)} · ${escapeHtml(String(item.quantity))} un.</span>
                <button class="btn btn-primary btn-sm" type="button" data-donate-for="${escapeHtml(item.item)}" data-donate-category="${escapeHtml(item.category)}" data-donate-pedido="${item.id}">Quero atender este pedido</button>
            </div>
        </article>`).join("");

    if (window.lucide) window.lucide.createIcons();
}

// 🔴 Correção: "Conversar sobre este pedido" sempre abria o chat da
// coleção /pedidos (solicitante ↔ ONG — fazParteDoPedidoLiberado(),
// firestore.rules, só permite solicitanteId ou ongId). Isso está certo
// quando uma ONG mediou o pedido. Mas no fluxo "Atender um pedido
// específico" (item 7 da revisão), o doador vincula a doação diretamente
// ao pedido SEM nenhuma ONG envolvida — o pedido nunca ganha um ongId. O
// botão continuava chamando esse mesmo chat de /pedidos mesmo assim: o
// solicitante conseguia entrar e mandar mensagem à vontade (ele é o
// dono do pedido), mas o doador nunca aparece nem como solicitanteId nem
// como ongId daquele documento — a regra do Firestore barra ele
// (permission-denied) e ele nunca teria como ler ou responder. Resultado
// exato do bug relatado: só quem foi atendido (o beneficiário) conseguia
// acessar aquele chat; o doador ficava de fora. A conversa de verdade
// entre os dois, nesse fluxo, é a da DOAÇÃO (/doacoes/{id}/mensagens —
// fazParteDaDoacao() permite donorId/beneficiaryId/ongId), que já existe
// e já funciona para os dois lados (ver renderMyDonations()); só faltava
// apontar o botão certo pra ela.
function chatBtnPedido(p) {
    // Vinculado sem ONG (doacaoVinculadaId presente, ongId vazio):
    // atendimento direto — a conversa real é a da doação.
    if (p.status === "vinculado" && p.doacaoVinculadaId && !p.ongId) {
        return `<button class="btn btn-secondary btn-sm" type="button" data-open-donation-chat="${p.doacaoVinculadaId}"><i data-lucide="message-circle"></i> Conversar com quem doou</button>`;
    }
    // Aprovado/vinculado COM uma ONG responsável: chat pedido↔ONG de sempre.
    if ((p.status === "aprovado" || p.status === "vinculado") && p.ongId) {
        return `<button class="btn btn-secondary btn-sm" type="button" data-open-pedido-chat="${p.id}"><i data-lucide="message-circle"></i> Conversar sobre este pedido</button>`;
    }
    return "";
}

// Item 10 da revisão: o chat pedido↔ONG só libera DEPOIS que a ONG aprova
// o pedido. Antes, bastava a ONG ter "assumido" o pedido de qualquer
// forma (aprovar, recusar ou pedir mais info) para o chat abrir — o que
// não fazia sentido numa recusa (o pedido nem está mais com aquela ONG) e
// liberava conversa antes de qualquer decisão real. Mesma restrição
// espelhada em firestore.rules (fazParteDoPedidoLiberado()).
function renderMyPedidos() {
    const block = document.getElementById("my-pedidos-block");
    const grid = document.getElementById("my-pedidos-grid");
    const user = getCurrentUser();
    if (!block || !grid) return;
    // Assim que o pedido é concluído (recebimento confirmado) ou recusado,
    // ele sai desta lista (o histórico continua em pedido.history).
    // Item 10 da revisão: "recusado" saiu da exclusão — a spec quer que o
    // pedido continue visível pro próprio solicitante (com o motivo da
    // recusa, já coberto por ongObservacao/renderPedidoProgress() abaixo),
    // não que ele suma como se tivesse sido apagado.
    const mine = user ? pedidosCache.filter((p) => p.solicitanteId === user.id && p.status !== "concluido") : [];
    if (!user || !mine.length) { block.classList.add("hidden"); grid.innerHTML = ""; return; }
    block.classList.remove("hidden");

    grid.innerHTML = mine.map((p) => `
        <article class="flow-donation-card">
            <div class="flow-card-top">
                <span class="flow-role-tag">${escapeHtml(p.category)}</span>
                <span class="flow-status-pill ${pedidoStatusPillClass(p.status)}">${pedidoStatusLabel(p.status)}</span>
            </div>
            <h4>${escapeHtml(p.item)}</h4>
            <p class="flow-card-meta"><i data-lucide="map-pin"></i> ${escapeHtml(p.solicitanteCidade)} · Urgência: ${escapeHtml(p.urgency)}</p>
            <p class="flow-card-desc">${escapeHtml(p.description)}</p>
            ${p.ongObservacao ? `<p class="flow-card-desc"><strong>Observação${p.ongName ? ` de ${escapeHtml(p.ongName)}` : " da ONG"}:</strong> ${escapeHtml(p.ongObservacao)}</p>` : ""}
            ${p.status === "recusado" ? `<p class="flow-card-desc"><i data-lucide="hand-heart"></i> Seu pedido já está disponível para atendimento direto — qualquer doador pode encontrá-lo.</p>` : ""}
            ${renderPedidoProgress(p)}
            <div class="flow-card-actions">
                ${chatBtnPedido(p)}
                ${["pendente", "mais_info", "aprovado"].includes(p.status) && !p.ongId ? `<span class="flow-waiting-note">O chat abre assim que alguém atender seu pedido</span>` : ""}
                ${p.status === "vinculado" ? `<button class="btn btn-success btn-sm" type="button" data-pedido-concluir="${p.id}"><i data-lucide="circle-check"></i> Confirmar recebimento</button>` : ""}
            </div>
        </article>`).join("");

    if (window.lucide) window.lucide.createIcons();
}

// Doações em andamento com a mesma categoria e (quando possível) cidade parecida.
function findCompatibleDonations(pedido, apenasOngId) {
    const solicitanteCidade = String(pedido.solicitanteCidade || "").toLowerCase();
    return donationsCache.filter((d) => {
        if (d.trackingStatus !== "Em andamento" || d.beneficiaryId) return false;
        // Quando chamado por uma ONG, só as doações que ELA está mediando.
        if (apenasOngId && !(d.deliveryMethod === "ong" && d.ongId === apenasOngId)) return false;
        if (String(d.category).toLowerCase() !== String(pedido.category).toLowerCase()) return false;
        if (!solicitanteCidade || !d.city) return true;
        const cidadeDoacao = String(d.city).toLowerCase();
        return cidadeDoacao.includes(solicitanteCidade.split(/[-,]/)[0].trim()) || solicitanteCidade.includes(cidadeDoacao.split(/[-,]/)[0].trim());
    });
}

function renderOngPedidos() {
    const block = document.getElementById("ong-pedidos-block");
    const grid = document.getElementById("ong-pedidos-grid");
    const user = getCurrentUser();
    if (!block || !grid) return;
    if (!user || user.role !== "ong") { block.classList.add("hidden"); grid.innerHTML = ""; return; }

    // Sem triagem: a ONG não aprova/recusa mais pedidos. Este bloco só
    // aparece para a ONG que está mediando doações e serve para vincular
    // uma dessas doações a um pedido aberto compatível (ou acompanhar os
    // pedidos que ela já vinculou). "concluido" sai da lista.
    const abertos = (p) => ["pendente", "aprovado", "mais_info"].includes(p.status) && !p.doacaoVinculadaId;
    const relevantes = pedidosVisiveis().filter((p) =>
        (p.ongId === user.id && ["aprovado", "vinculado"].includes(p.status)) ||
        (abertos(p) && !p.ongId && p.solicitanteId !== user.id && findCompatibleDonations(p, user.id).length > 0));
    if (!relevantes.length) { block.classList.add("hidden"); grid.innerHTML = ""; return; }
    block.classList.remove("hidden");

    grid.innerHTML = relevantes.map((p) => {
        let actions = "";
        if (p.status !== "vinculado") {
            const matches = findCompatibleDonations(p, user.id);
            actions = matches.length
                ? matches.map((d) => `<button class="btn btn-primary btn-sm" type="button" data-pedido-vincular="${p.id}" data-doacao-vincular="${d.id}"><i data-lucide="link"></i> Vincular: ${escapeHtml(d.itemName)} (${escapeHtml(d.donorName)})</button>`).join("")
                : `<p class="form-help-text"><i data-lucide="search"></i> Nenhuma doação sua compatível com este pedido.</p>`;
        }
        // Privacidade: enquanto nenhuma ONG assumiu o pedido (status "pendente",
        // ongId ainda vazio), toda ONG aprovada consegue ver esta lista para
        // decidir se atende — então o nome completo da família fica oculto e
        // mostramos só a cidade. Só a ONG responsável (que já aprovou o
        // pedido, ongId === user.id) vê o nome completo, junto do solicitante
        // e do administrador (ver pedidoNomeExibicao()).
        const nomeExibido = pedidoNomeExibicao(p, user);
        // Item 10 da revisão: o chat só libera depois que ESTA ONG aprovou o
        // pedido (p.status === "aprovado"/"vinculado" já implica ongId ===
        // user.id, por causa do próprio filtro de "relevantes" acima) — não
        // faz sentido conversar com o solicitante enquanto o pedido ainda
        // está "pendente" pra qualquer ONG decidir, nem depois de recusado.
        const chatBtn = p.ongId === user.id && (p.status === "aprovado" || p.status === "vinculado")
            ? `<button class="btn btn-secondary btn-sm" type="button" data-open-pedido-chat="${p.id}"><i data-lucide="message-circle"></i> Conversar com o solicitante</button>`
            : "";
        return `
        <article class="flow-donation-card">
            <div class="flow-card-top">
                <span class="flow-role-tag">Solicitante: ${escapeHtml(nomeExibido)}</span>
                <span class="flow-status-pill ${pedidoStatusPillClass(p.status)}">${pedidoStatusLabel(p.status)}</span>
            </div>
            <h4>${escapeHtml(p.item)}</h4>
            <p class="flow-card-meta"><i data-lucide="tag"></i> ${escapeHtml(p.category)} · ${p.quantity} un. · Urgência: ${escapeHtml(p.urgency)}</p>
            <p class="flow-card-meta"><i data-lucide="map-pin"></i> ${escapeHtml(p.solicitanteCidade)}</p>
            <p class="flow-card-desc">${escapeHtml(p.description)}</p>
            ${renderPedidoProgress(p)}
            <div class="flow-card-actions">
                ${actions}
                ${chatBtn}
            </div>
        </article>`;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
}

async function updatePedidoDoc(id, patch, historyEntry) {
    const refs = fsRefs();
    if (!refs) { notify("Conexão com o banco de dados indisponível.", "danger"); return; }
    const { db, doc, updateDoc, arrayUnion } = refs;
    const updatedAt = new Date().toISOString();
    // arrayUnion() em vez de ler pedidosCache e reenviar o array inteiro:
    // além de ser o padrão certo pra não arriscar apagar histórico anterior
    // (limitação que já existia antes desta correção), agora é necessário
    // — uma ONG aprovada assumindo um pedido ainda "pendente" só enxerga a
    // versão pública dele (sem "history"), então não tem como reconstruir
    // o array local pra reenviar.
    const historyUpdate = historyEntry ? { history: arrayUnion({ ...historyEntry, date: updatedAt }) } : {};
    try {
        await updateDoc(doc(db, "pedidos", id), { ...patch, ...historyUpdate, updatedAt });
        // Espelha em pedidos_publicos só os campos que também existem lá
        // (ver PEDIDO_CAMPOS_PUBLICOS) — mantém a fila pública/de triagem
        // em dia sem nunca escrever nome, fotos ou observações da ONG ali.
        const patchPublico = pedidoDadosPublicos({ ...patch, updatedAt });
        if (Object.keys(patchPublico).length) {
            await updateDoc(doc(db, "pedidos_publicos", id), patchPublico);
        }
    } catch (error) {
        console.error(error);
        notify("Não foi possível atualizar o pedido. Tente novamente.", "danger");
    }
}

async function vincularDoacaoAoPedido(pedidoId, doacaoId) {
    const user = requireOngAprovada();
    const pedido = pedidoParaExibicao(pedidoId);
    const doacao = donationsCache.find((d) => d.id === doacaoId);
    if (!user || !pedido || !doacao) return;
    // Regra fundamental (doadorId !== beneficiarioId), também na mediação
    // por ONG: findCompatibleDonations() não tem como saber que uma doação
    // e um pedido pertencem à mesma pessoa (categoria/cidade são os únicos
    // critérios), então essa checagem fecha o caso de uma ONG vincular, por
    // engano, a doação de alguém ao próprio pedido dessa mesma pessoa.
    if (doacao.donorId === pedido.solicitanteId) {
        notify("Esta doação e este pedido são da mesma pessoa — não é possível vincular.", "danger");
        return;
    }

    // A ONG só passa a ser "responsável" pelo pedido quando media uma
    // doação para ele (antes disso o pedido é público e sem ONG). O nome
    // do solicitante vem de /users porque, sem ser responsável ainda, a
    // ONG só enxerga a versão pública do pedido (sem nome).
    if (!pedido.ongId) {
        await updatePedidoDoc(pedidoId,
            { status: "aprovado", ongId: user.id, ongName: user.name },
            { status: "aprovado", note: `${user.name} assumiu o pedido para mediar uma doação.` });
    }
    const nomeSolicitante = pedido.solicitanteNome || await resolveUserName(pedido.solicitanteId) || "Solicitante";

    await updatePedidoDoc(pedidoId,
        { status: "vinculado", doacaoVinculadaId: doacaoId },
        { status: "vinculado", note: `Vinculado à doação de ${doacao.donorName}.` });

    await updateDonationDoc(doacaoId,
        { beneficiaryId: pedido.solicitanteId, beneficiaryName: nomeSolicitante },
        `Doação vinculada ao pedido de ${nomeSolicitante} por ${user.name}.`);

    notify("Doação vinculada ao pedido com sucesso!");
    notificarUsuario(pedido.solicitanteId, "Doação encontrada para o seu pedido",
        `${user.name} vinculou a doação de "${doacao.itemName}" (${doacao.donorName}) ao seu pedido. Acompanhe pelo chat do pedido.`,
        "Pedido", "pedido", { pedidoId });
    notificarUsuario(doacao.donorId, "Sua doação foi direcionada",
        `${user.name} direcionou sua doação de "${doacao.itemName}" para atender o pedido de ${nomeSolicitante}.`,
        "Doação", "doacao", { doacaoId });
}

// Fase 3: fecha o ciclo do pedido (Atendido → Concluído). Só o próprio
// solicitante confirma, e só quando já existe uma doação vinculada — assim
// como em confirmDirectDelivery() para doações, é quem recebeu o item que
// atesta o recebimento, não a ONG.
async function confirmarRecebimentoPedido(id) {
    const user = getCurrentUser();
    const pedido = pedidoParaExibicao(id);
    if (!user || !pedido) return;
    if (pedido.solicitanteId !== user.id) {
        notify("Só o solicitante pode confirmar o recebimento deste pedido.", "danger");
        return;
    }
    if (pedido.status !== "vinculado") {
        notify("Este pedido ainda não tem uma doação vinculada para confirmar.", "warning");
        return;
    }
    await updatePedidoDoc(id,
        { status: "concluido" },
        { status: "concluido", note: `Recebimento confirmado por ${user.name}.` });
    notify("Recebimento confirmado! Pedido concluído. Obrigado por avisar.");
    const doacao = donationsCache.find((d) => d.id === pedido.doacaoVinculadaId);
    if (doacao) {
        notificarUsuario(doacao.donorId, "Recebimento confirmado",
            `${user.name} confirmou o recebimento da doação de "${doacao.itemName}". Obrigado por fazer parte dessa ponte solidária!`,
            "Pedido", "doacao", { doacaoId: doacao.id });
        // Ver comentário em advanceOngDonation(): sincroniza a confirmação
        // do beneficiário na PRÓPRIA doação, e não só no pedido. Se a ONG
        // já tinha terminado as etapas dela (progressStep na etapa
        // "Entregue", só faltando "Confirmar conclusão"), essa confirmação
        // já fecha o ciclo dos dois lados de uma vez — sem isso a doação
        // ficava presa em "Em andamento" na grade da ONG e do doador pra
        // sempre, mesmo com o pedido já concluído.
        if (doacao.deliveryMethod === "ong" && doacao.trackingStatus === "Em andamento") {
            const steps = getFlowSteps(doacao);
            const patch = { beneficiarioConfirmouRecebimento: true };
            let historyNote = `${user.name} confirmou o recebimento pelo pedido.`;
            if (doacao.progressStep >= steps.length - 2) {
                patch.progressStep = steps.length - 1;
                patch.trackingStatus = "Entregue";
                historyNote = `${user.name} confirmou o recebimento — etapa atualizada para "${steps[steps.length - 1]}".`;
            }
            await updateDonationDoc(doacao.id, patch, historyNote);
        }
    }
    if (pedido.ongId) {
        notificarUsuario(pedido.ongId, "Pedido concluído",
            `${user.name} confirmou o recebimento do pedido de "${pedido.item}".`, "Pedido", "pedido", { pedidoId: id });
    }
}

/* ========================================================
   CHAT REAL ENTRE CONTAS (Firestore) — Item 13 da revisão
   ("Chat — reformular todo o fluxo")

   Duas subcoleções de mensagens, uma por tipo de fluxo:
     • "pedidos/{pedidoId}/mensagens"  — solicitante ↔ ONG
     • "doacoes/{doacaoId}/mensagens"  — doador ↔ beneficiário
                                          ou doador ↔ ONG mediadora
   Regra principal da revisão — "nunca criar uma conversa sem duas
   pessoas diferentes e sem uma relação válida entre elas" — já era
   garantida antes desta revisão (openPedidoChat/openDoacaoChat só
   registram uma thread quando a contraparte já existe de verdade:
   pedido aprovado com ONG responsável, doação com beneficiário
   aceito ou ONG mediadora vinculada) e continua sendo a mesma regra
   aqui; o que muda nesta revisão é a INTERFACE em cima dessas
   threads — cada uma passa a carregar os metadados que a lista de
   conversas (js/chat.js) precisa para nunca mostrar só um nome sem
   contexto: contraparte, contexto ("Pedido: X" / "Doação: Y"),
   última mensagem, horário, não lidas e se já está arquivada.

   Cada thread é identificada por uma CHAVE ESTÁVEL baseada no tipo e
   no id do documento (ex.: "pedido:abc123") — nunca mais por um
   texto legível (nome + item), que podia colidir ou mudar (ONG troca
   de nome, item é editado) e não servia como chave confiável de
   dicionário. Tudo que é exibível (nome da contraparte, contexto,
   avatar) agora é um campo separado dentro da própria entrada de
   `chatConversations`, atualizado a cada snapshot de pedidos/doações
   — é o que permite ao chat.js formatar a lista e o cabeçalho da
   conversa sem precisar decompor uma string.

   Não lidas e leitura: cada participante guarda a própria marca de
   leitura direto no documento do pedido/doação
   (`chatLastRead.<uid>` — mapa uid → timestamp ISO). Excluir
   conversa "para mim" também é um campo por-uid no mesmo documento
   (`chatHiddenFor.<uid>`) — nunca apaga nada de verdade nem afeta a
   visão do outro lado. As duas regras equivalentes estão espelhadas
   em firestore.rules (atualizaEstadoChatDaDoacao()/
   atualizaEstadoChatDoPedido()): cada uma só deixa a própria conta
   alterar a própria chave dentro desses mapas.
   ======================================================== */
const pedidoChatThreads = {}; // threadKey -> { unsubscribe }
const donationChatThreads = {}; // threadKey -> { unsubscribe }

// 🔴 Correção: pedidoNomeExibicao() decide se MOSTRA o nome completo da
// família (é uma checagem de PRIVACIDADE — "esta conta tem o direito de
// ver quem é o solicitante?"), não quem é a CONTRAPARTE da conversa. Como
// o próprio solicitante sempre "tem o direito de ver" seu próprio nome,
// reaproveitar essa função aqui fazia o chat devolver o nome do próprio
// solicitante quando ELE MESMO abria o chat — a pessoa "conversava
// consigo mesma". pedidoContraparteNome() (abaixo) resolve sempre o nome
// do OUTRO lado da conversa: a ONG responsável para o solicitante, o
// solicitante para a ONG.
function pedidoContraparteNome(pedido, viewerUser) {
    const souSolicitante = viewerUser && viewerUser.id === pedido.solicitanteId;
    if (souSolicitante) return pedido.ongName || "ONG responsável";
    return pedido.solicitanteNome || `Família em ${pedido.solicitanteCidade || "local não informado"}`;
}

// Chaves estáveis (id-based) das threads — nunca mudam mesmo se o nome
// da contraparte ou o item forem editados depois, ao contrário da antiga
// chave "Pedido: X — Fulano" (texto legível, usada como chave de
// dicionário até esta revisão).
function pedidoThreadKey(pedidoId) {
    return `pedido:${pedidoId}`;
}
function doacaoThreadKey(donationId) {
    return `doacao:${donationId}`;
}

// Cria (se ainda não existir) a entrada da conversa em chatConversations
// e o listener em tempo real da subcoleção de mensagens indicada. Devolve
// `true` se a conversa está pronta para ser aberta. threadTipo/refId
// identificam a thread para a Central de Notificações (item 12 da
// revisão): é o que window.abrirNotificacao() usa depois para reabrir o
// chat certo a partir de um clique na notificação.
//
// `parentRef`/`parentData` (documento do pedido ou da doação) são o que
// permite ler/gravar chatLastRead e chatHiddenFor sem precisar de uma
// leitura extra — pedidosCache/donationsCache já trazem o documento
// inteiro via onSnapshot da coleção.
function registrarThreadDeChat({
    threadKey, kind, refId, avatar, contactName, contactId, context, archived, archivedLabel,
    userId, parentRef, parentData, threadsRegistry, mensagensRef,
    addDoc, updateDoc, doc, query, orderBy, onSnapshot, threadTipo
}) {
    const refs_arrayUnion = (valor) => fsRefs().arrayUnion(valor);
    if (!chatConversations[threadKey]) {
        chatConversations[threadKey] = {
            kind, refId,
            avatar, contactName, contactId, context, archived, archivedLabel,
            firestore: true,
            messages: [],
            lastMessageAt: "",
            unread: 0,
            hiddenForMe: false,
            lastReadIso: null,
            // "Limpar histórico" / "Apagar para mim": só escondem para a
            // PRÓPRIA conta (campos por-uid no documento da doação/pedido).
            clearedIso: "",
            hiddenMsgIds: [],
            send: async (text, image) => {
                try {
                    const payload = {
                        senderId: userId,
                        senderName: getCurrentUser()?.name || "",
                        text: text || "",
                        deleted: false,
                        createdAt: new Date().toISOString()
                    };
                    // Imagem do chat: data URL (JPEG já reduzido em js/chat.js),
                    // gravada no próprio documento da mensagem — mesmo padrão
                    // da foto de perfil (photoBase64), sem depender de Storage.
                    if (image) payload.image = image;
                    await addDoc(mensagensRef, payload);
                } catch (error) {
                    console.error(error);
                    notify("Não foi possível enviar a mensagem. Tente novamente.", "danger");
                }
            },
            // Excluir mensagem (item 13 — "Excluir mensagens"): SEMPRE um
            // soft-delete da PRÓPRIA mensagem (a mesma restrição já existia
            // em firestore.rules — apenasApagaAPropriaMensagem() — antes
            // disso nem update nem delete eram permitidos). A bolha
            // continua no histórico, só o texto passa a ser tratado como
            // "Mensagem excluída." pelo chat.js.
            deleteMessage: async (messageId) => {
                const own = chatConversations[threadKey].messages.find((m) => m.id === messageId);
                if (!own || own.sender !== "sent" || own.deleted) return;
                try {
                    await updateDoc(doc(mensagensRef, messageId), { deleted: true, deletedAt: new Date().toISOString() });
                } catch (error) {
                    console.error(error);
                    notify("Não foi possível excluir a mensagem. Tente novamente.", "danger");
                }
            },
            // Marca a leitura da PRÓPRIA conta (zera o contador de não
            // lidas só para quem chamou) — nunca afeta a contraparte.
            markRead: async () => {
                const chat = chatConversations[threadKey];
                if (!chat.unread) return;
                chat.unread = 0; // otimista: a lista já reflete "lido" na hora
                window.renderConversationsList?.();
                try {
                    await updateDoc(parentRef, { [`chatLastRead.${userId}`]: new Date().toISOString() });
                } catch (error) {
                    console.warn("[Ponte Solidária] Falha ao marcar conversa como lida.", error);
                }
            },
            // "Limpar histórico": esconde, só para mim, tudo o que existe
            // até agora. A conversa continua na lista; ninguém mais é afetado.
            clearHistory: async () => {
                const chat = chatConversations[threadKey];
                const agora = new Date().toISOString();
                chat.clearedIso = agora; // otimista
                chat.unread = 0;
                window.renderConversationsList?.();
                try {
                    await updateDoc(parentRef, {
                        [`chatClearedAt.${userId}`]: agora,
                        [`chatLastRead.${userId}`]: agora
                    });
                } catch (error) {
                    console.warn("[Ponte Solidária] Falha ao limpar o histórico.", error);
                    notify("Não foi possível limpar o histórico agora. Tente novamente.", "danger");
                }
            },
            // "Apagar para mim": esconde UMA mensagem (própria ou recebida)
            // só para esta conta — a outra pessoa continua vendo.
            deleteForMe: async (messageId) => {
                const chat = chatConversations[threadKey];
                if (!chat.hiddenMsgIds.includes(messageId)) chat.hiddenMsgIds = [...chat.hiddenMsgIds, messageId]; // otimista
                try {
                    await updateDoc(parentRef, { [`chatMsgHidden.${userId}`]: refs_arrayUnion(messageId) });
                } catch (error) {
                    console.warn("[Ponte Solidária] Falha ao apagar a mensagem para mim.", error);
                    chat.hiddenMsgIds = chat.hiddenMsgIds.filter((id) => id !== messageId);
                    notify("Não foi possível apagar a mensagem agora. Tente novamente.", "danger");
                    window.renderActiveMessages?.();
                }
            },
            // "Excluir conversa para mim": limpa o histórico e some da
            // PRÓPRIA lista, sem tirar nada da lista da contraparte. Se
            // chegar mensagem nova depois, a conversa volta sozinha (e já
            // começa sem o histórico antigo).
            hideForMe: async () => {
                const chat = chatConversations[threadKey];
                const agora = new Date().toISOString();
                chat.hiddenForMe = true; // otimista
                chat.clearedIso = agora;
                chat.unread = 0;
                window.renderConversationsList?.();
                try {
                    await updateDoc(parentRef, {
                        [`chatHiddenFor.${userId}`]: true,
                        [`chatClearedAt.${userId}`]: agora,
                        [`chatLastRead.${userId}`]: agora
                    });
                } catch (error) {
                    console.warn("[Ponte Solidária] Falha ao remover conversa da lista.", error);
                    chat.hiddenForMe = false;
                    window.renderConversationsList?.();
                }
            },
            // Reabre uma conversa que estava excluída (ex.: a pessoa clicou
            // em "Conversar" numa doação/pedido com quem já tinha apagado).
            unhide: async () => {
                const chat = chatConversations[threadKey];
                if (!chat.hiddenForMe) return;
                chat.hiddenForMe = false;
                window.renderConversationsList?.();
                updateDoc(parentRef, { [`chatHiddenFor.${userId}`]: false }).catch(() => {});
            }
        };
    }

    // Metadados "estáticos" da conversa são atualizados a cada chamada —
    // pedidosCache/donationsCache mudam a cada snapshot (status virou
    // "concluído", ONG mudou de nome etc.) e reconectarTodasAsThreads()
    // chama esta função de novo sempre que isso acontece.
    const chat = chatConversations[threadKey];
    chat.avatar = avatar;
    chat.contactName = contactName;
    chat.contactId = contactId;
    chat.context = context;
    chat.archived = archived;
    chat.archivedLabel = archivedLabel;
    chat.hiddenForMe = !!parentData?.chatHiddenFor?.[userId];
    chat.lastReadIso = parentData?.chatLastRead?.[userId] || null;
    chat.clearedIso = parentData?.chatClearedAt?.[userId] || chat.clearedIso || "";
    chat.hiddenMsgIds = Array.from(new Set([...(parentData?.chatMsgHidden?.[userId] || []), ...(chat.hiddenMsgIds || [])]));

    if (!threadsRegistry[threadKey]) {
        const q = query(mensagensRef, orderBy("createdAt", "asc"));
        // 🔴 Correção (item 5 do plano de finalização): a flag abaixo
        // ainda evita que a carga inicial do histórico (F5/login/toda
        // reconexão silenciosa via reconectarTodasAsThreads()) acenda o
        // toast/badge do chat de novo do zero — isso continua certo.
        // MAS a notificação da Central (Firestore, "Nova mensagem") não
        // pode depender dela: quem manda mensagem pra alguém OFFLINE
        // nunca gerava notificação nenhuma, porque no próximo login o
        // histórico inteiro chega de uma vez como "carga inicial" e cai
        // fora da checagem `!ehCargaInicial` — a mensagem realmente nova
        // pra essa pessoa nunca virava notificação (era exatamente o caso
        // relatado: "a notificação não chega"). Agora a notificação usa
        // um checkpoint próprio — chatNotifiedUpTo.<uid>, gravado no
        // documento da doação/pedido — comparando contra ele em vez de
        // "é a primeira leitura desta sessão". Cobre tempo real E
        // reconectar depois de ficar offline, sem duplicar num F5 (o
        // checkpoint já avançou na vez anterior).
        let primeiraCarga = true;
        let notificadoAte = parentData?.chatNotifiedUpTo?.[userId] || "";
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const anterior = chatConversations[threadKey].messages.length;
            const lastReadIso = chatConversations[threadKey].lastReadIso;
            chatConversations[threadKey].messages = snapshot.docs.map((docSnap) => {
                const m = docSnap.data();
                return {
                    id: docSnap.id,
                    sender: m.senderId === userId ? "sent" : "received",
                    senderId: m.senderId,
                    text: m.deleted ? "" : (m.text || ""),
                    image: m.deleted ? "" : (typeof m.image === "string" ? m.image : ""),
                    deleted: !!m.deleted,
                    createdAt: m.createdAt || "",
                    time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""
                };
            });
            const atual = chatConversations[threadKey].messages.length;
            const ehCargaInicial = primeiraCarga;
            primeiraCarga = false;

            const ultimaMsg = chatConversations[threadKey].messages[atual - 1];
            chatConversations[threadKey].lastMessageAt = ultimaMsg ? ultimaMsg.createdAt : "";

            // Não lidas: qualquer mensagem recebida (não enviada por mim)
            // depois da minha última marca de leitura conta como não lida.
            // Uma conversa arquivada continua sendo contada normalmente —
            // "arquivada" só tira da lista ativa, não impede notificação.
            chatConversations[threadKey].unread = chatConversations[threadKey].messages.filter((m) =>
                m.sender === "received" && !m.deleted && (!lastReadIso || m.createdAt > lastReadIso) &&
                (!chatConversations[threadKey].clearedIso || m.createdAt > chatConversations[threadKey].clearedIso) &&
                !chatConversations[threadKey].hiddenMsgIds.includes(m.id)
            ).length;

            if (window.isThreadActive?.(threadKey)) {
                window.renderActiveMessages?.();
                // A conversa já está aberta na tela — a leitura conta na
                // hora, sem esperar o usuário reabrir.
                chatConversations[threadKey].markRead?.();
            } else {
                if (!ehCargaInicial && atual > anterior) {
                    // Chegou mensagem nova de verdade em tempo real (não é
                    // o histórico carregando pela primeira vez) numa
                    // conversa que não está aberta agora: sobe pro topo da
                    // lista e acende o badge/toast local do chat — só faz
                    // sentido para quem já está com o site aberto na hora.
                    window.acrescentarNotificacaoChat?.();
                }
                // Central de Notificações: independe de ser carga inicial
                // ou não — o que importa é se existe mensagem recebida
                // mais nova que o checkpoint já notificado (ver comentário
                // acima). Pega só a última pra não empilhar uma
                // notificação por mensagem perdida enquanto offline.
                const naoNotificadas = snapshot.docs
                    .map((docSnap) => docSnap.data())
                    .filter((m) => m.senderId !== userId && !m.deleted && m.createdAt > notificadoAte);
                const ultimaNaoNotificada = naoNotificadas[naoNotificadas.length - 1];
                if (ultimaNaoNotificada) {
                    notificadoAte = ultimaNaoNotificada.createdAt;
                    notificarUsuario(userId, "Nova mensagem",
                        `Você recebeu uma nova mensagem de ${ultimaNaoNotificada.senderName || "alguém"}.`,
                        "Mensagem", "mensagem", { threadTipo, id: refId });
                    updateDoc(parentRef, { [`chatNotifiedUpTo.${userId}`]: ultimaNaoNotificada.createdAt }).catch(() => {});
                    // "Excluir conversa para mim" nunca é permanente: se a
                    // outra pessoa mandou mensagem depois, a conversa volta
                    // a aparecer na lista sozinha (mesmo comportamento do
                    // WhatsApp Web).
                    if (chatConversations[threadKey].hiddenForMe) {
                        chatConversations[threadKey].hiddenForMe = false;
                        updateDoc(parentRef, { [`chatHiddenFor.${userId}`]: false }).catch(() => {});
                    }
                }
            }
            window.renderConversationsList?.();
        }, (error) => console.warn("[Ponte Solidária] Falha ao sincronizar chat.", error));
        threadsRegistry[threadKey] = { unsubscribe };
    }
    return true;
}

// Chat do pedido (solicitante ↔ ONG) — igual desde a Fase 3.
// abrirJanela=false só registra a thread/liga o onSnapshot sem abrir a
// janela de chat — é o que reconectarTodasAsThreads() usa para
// reconstruir as conversas sozinho depois de um F5 (ver mais abaixo).
function openPedidoChat(pedidoId, abrirJanela = true) {
    const user = getCurrentUser();
    const pedido = pedidoParaExibicao(pedidoId);
    const refs = fsRefs();
    if (!user || !pedido || !refs) {
        if (abrirJanela) notify("Não foi possível abrir o chat deste pedido agora.", "danger");
        return;
    }
    if (typeof chatConversations === "undefined" || typeof window.openChat !== "function") {
        if (abrirJanela) notify("O módulo de chat ainda não carregou. Tente novamente em instantes.", "warning");
        return;
    }
    // 🔴 Correção: sem essa checagem, dava pra abrir o chat antes da ONG
    // aprovar o pedido — o solicitante "conversava sozinho" sem contraparte
    // real, e reconectarTodasAsThreads() reconectava silenciosamente até
    // pedidos recusados (ongId continua preenchido depois de uma recusa).
    // Os botões em renderMyPedidos()/renderOngPedidos() já escondem a ação
    // fora desse estado; esta é a segunda camada de proteção, e a mesma
    // condição (status aprovado/vinculado/concluído) está espelhada em
    // firestore.rules (fazParteDoPedidoLiberado()). Regra principal do
    // item 13 ("nunca criar uma conversa sem... uma relação válida"): esse
    // é o ponto exato que garante isso para o par solicitante ↔ ONG.
    const souSolicitante = user.id === pedido.solicitanteId;
    const souOngResponsavel = user.role === "ong" && user.id === pedido.ongId;
    const chatLiberado = ["aprovado", "vinculado", "concluido"].includes(pedido.status);
    if ((souSolicitante || souOngResponsavel) && !chatLiberado) {
        if (abrirJanela) notify("O chat abre assim que o pedido for atendido.", "warning");
        return;
    }
    const { db, doc, collection, query, orderBy, onSnapshot, addDoc, updateDoc } = refs;
    const threadKey = pedidoThreadKey(pedidoId);
    const archived = pedido.status === "concluido";

    registrarThreadDeChat({
        threadKey, kind: "pedido", refId: pedidoId,
        avatar: ongInitials(pedidoContraparteNome(pedido, user)),
        contactName: pedidoContraparteNome(pedido, user),
        contactId: souSolicitante ? (pedido.ongId || "") : pedido.solicitanteId,
        context: `Pedido: ${pedido.item}`,
        archived, archivedLabel: archived ? "✓ Pedido concluído" : "",
        userId: user.id,
        parentRef: doc(db, "pedidos", pedidoId),
        parentData: pedido,
        threadsRegistry: pedidoChatThreads,
        mensagensRef: collection(db, "pedidos", pedidoId, "mensagens"),
        addDoc, updateDoc, doc, query, orderBy, onSnapshot,
        threadTipo: "pedido"
    });

    if (abrirJanela) window.openChat(threadKey);
}
window.openPedidoChat = openPedidoChat;

// Chat da doação: doador ↔ beneficiário (entrega direta) ou
// doador ↔ ONG (mediação). O contraparte é calculada de acordo com
// quem está logado — cada lado só enxerga a conversa depois que a
// doação já tem as duas pontas definidas (beneficiário aceitou, ou
// a ONG aceitou mediar).
// abrirJanela=false: só registra/reconecta, sem abrir a janela — usado
// por reconectarTodasAsThreads() (ver abaixo).
function openDoacaoChat(donationId, abrirJanela = true) {
    const user = getCurrentUser();
    const donation = donationsCache.find((d) => d.id === donationId);
    const refs = fsRefs();
    if (!user || !donation || !refs) {
        if (abrirJanela) notify("Não foi possível abrir o chat desta doação agora.", "danger");
        return;
    }
    if (typeof chatConversations === "undefined" || typeof window.openChat !== "function") {
        if (abrirJanela) notify("O módulo de chat ainda não carregou. Tente novamente em instantes.", "warning");
        return;
    }

    let counterpartName = "";
    let counterpartId = "";
    if (user.id === donation.donorId) {
        counterpartName = donation.deliveryMethod === "ong" ? donation.ongName : donation.beneficiaryName;
        counterpartId = donation.deliveryMethod === "ong" ? donation.ongId : donation.beneficiaryId;
    } else if (user.id === donation.beneficiaryId) {
        counterpartName = donation.donorName;
        counterpartId = donation.donorId;
    } else if (user.id === donation.ongId) {
        counterpartName = donation.donorName;
        counterpartId = donation.donorId;
    }
    if (!counterpartName) {
        if (abrirJanela) notify("O chat fica disponível assim que a doação tiver as duas partes combinadas.", "warning");
        return;
    }

    const { db, doc, collection, query, orderBy, onSnapshot, addDoc, updateDoc } = refs;
    const threadKey = doacaoThreadKey(donationId);
    // "Concluída" (último passo do fluxo, ver getFlowSteps()) arquiva a
    // conversa; uma doação encerrada sem conclusão (cancelada/recusada/
    // expirada) também sai da lista ativa, com um rótulo próprio — nos
    // dois casos a conversa continua acessível como histórico, só não
    // aparece mais entre as conversas em andamento (item 13 — "Encerramento").
    const steps = getFlowSteps(donation);
    const doacaoConcluida = donation.progressStep >= steps.length - 1;
    const doacaoEncerradaSemConclusao = ["Cancelada", "Recusada", "Expirada"].includes(donation.trackingStatus);
    const archived = doacaoConcluida || doacaoEncerradaSemConclusao;
    const archivedLabel = doacaoConcluida
        ? "✓ Doação concluída"
        : doacaoEncerradaSemConclusao ? `Doação ${donation.trackingStatus.toLowerCase()}` : "";

    registrarThreadDeChat({
        threadKey, kind: "doacao", refId: donationId,
        avatar: ongInitials(counterpartName),
        contactName: counterpartName,
        contactId: counterpartId,
        context: `Doação: ${donation.itemName}`,
        archived, archivedLabel,
        userId: user.id,
        parentRef: doc(db, "doacoes", donationId),
        parentData: donation,
        threadsRegistry: donationChatThreads,
        mensagensRef: collection(db, "doacoes", donationId, "mensagens"),
        addDoc, updateDoc, doc, query, orderBy, onSnapshot,
        threadTipo: "doacao"
    });

    if (abrirJanela) window.openChat(threadKey);
}
window.openDoacaoChat = openDoacaoChat;

// 🟠 Correção: antes, chatConversations só existia em memória e cada
// thread só era registrada/ligada ao onSnapshot quando a pessoa clicava
// em "Abrir chat"/"Conversar..." — depois de um F5 o widget voltava
// vazio até o usuário navegar de novo até o card da doação/pedido em
// questão (README-FIREBASE.md já documentava isso como limitação
// conhecida). Agora, sempre que doacoes/pedidos chegam do Firestore
// (renderAllDonationsAndPedidos, chamada a cada onSnapshot), reabrimos
// silenciosamente (abrirJanela=false) toda conversa elegível do usuário
// logado — nenhuma mensagem é perdida (sempre esteve salva no
// Firestore), só a lista de conversas ativas deixa de depender do clique.
// Ação de clique da Central de Notificações (item 12 da revisão — cada
// notificação precisa de uma "ação correspondente", não só marcar como
// lida). "tipo"/"referencia" vêm do próprio documento salvo em
// registrarAcaoGlobal() (js/fase6-engine.js); chamado de lá em
// window.abrirNotificacao(). Best-effort: nenhum caso aqui lança erro
// se a seção/aba não existir — só não navega.
window.executarAcaoNotificacao = function (tipo, referencia) {
    referencia = referencia || {};
    const irParaDoacoes = (aba) => {
        document.getElementById("nav-donations")?.click();
        if (aba) window.activateDonationTab?.(aba);
    };
    switch (tipo) {
        case "mensagem":
            if (referencia.threadTipo === "pedido" && referencia.id) window.openPedidoChat(referencia.id);
            else if (referencia.id) window.openDoacaoChat(referencia.id);
            break;
        case "campanha":
            irParaDoacoes("active-campaigns-tab");
            break;
        case "pedido":
        case "pedido_compativel":
        case "doacao":
        case "doacao_disponivel":
            // Todas essas categorias (status de pedido/doação, novo pedido
            // compatível pro doador, nova doação disponível pro solicitante)
            // aparecem na aba "Movimentação" — "Minhas doações"/"Meus
            // pedidos" ou o bloco "Da comunidade" (ver renderMyDonations/
            // renderMyPedidos/renderCommunityPedidos, acima).
            irParaDoacoes("movement-tab");
            break;
        default:
            irParaDoacoes();
    }
};

function reconectarTodasAsThreads() {
    const user = getCurrentUser();
    if (!user || !fsRefs()) return;

    pedidosCache
        .filter((p) => p.solicitanteId === user.id || p.ongId === user.id)
        .forEach((p) => openPedidoChat(p.id, false));

    donationsCache
        .filter((d) => d.donorId === user.id || d.beneficiaryId === user.id || d.ongId === user.id)
        .forEach((d) => openDoacaoChat(d.id, false));

    window.renderConversationsList?.();
}

// Encerra todos os listeners de chat em tempo real — chamado no
// logout para não vazar conversas de uma conta para a próxima no
// mesmo navegador.
function limparConversasAtivas() {
    Object.values(pedidoChatThreads).forEach((t) => t.unsubscribe?.());
    Object.values(donationChatThreads).forEach((t) => t.unsubscribe?.());
    Object.keys(pedidoChatThreads).forEach((k) => delete pedidoChatThreads[k]);
    Object.keys(donationChatThreads).forEach((k) => delete donationChatThreads[k]);
    window.limparChatDoUsuario?.();
}
window.limparConversasAtivas = limparConversasAtivas;

// Anexo de imagem foi removido dos formulários (doação e pedido de ajuda):
// imagens agora só podem ser enviadas dentro do chat (ver js/chat.js).

let donationInteractionsInitialized = false;

function setupDonationInteractions() {
    if (donationInteractionsInitialized) return;
    donationInteractionsInitialized = true;

    document.addEventListener("click", (event) => {
        if (event.target.closest("#open-donation-wizard-btn")) {
            openDonationWizard();
        }

        const urgentDonationButton = event.target.closest("[data-donate-for]");
        if (urgentDonationButton) {
            openDonationWizard({
                itemName: urgentDonationButton.dataset.donateFor || "",
                category: urgentDonationButton.dataset.donateCategory || "",
                pedidoId: urgentDonationButton.dataset.donatePedido || ""
            });
        }

        if (event.target.closest("#close-donation-wizard-btn")) {
            closeDonationWizard();
        }

        if (event.target.closest("#nova-campanha-btn")) {
            abrirModalNovaCampanha();
        }

        if (event.target.closest("#nova-campanha-close-btn")) {
            fecharModalNovaCampanha();
        }

        const encerrarCampanhaBtn = event.target.closest("[data-encerrar-campanha]");
        if (encerrarCampanhaBtn) encerrarCampanha(encerrarCampanhaBtn.dataset.encerrarCampanha);

        const editarCampanhaBtn = event.target.closest("[data-editar-campanha]");
        if (editarCampanhaBtn) editarCampanha(editarCampanhaBtn.dataset.editarCampanha);

        const excluirCampanhaBtn = event.target.closest("[data-excluir-campanha]");
        if (excluirCampanhaBtn) excluirCampanha(excluirCampanhaBtn.dataset.excluirCampanha);

        if (event.target.closest("#donation-wizard-prev-btn")) {
            if (donationWizardStep > 1) {
                donationWizardStep--;
                updateDonationWizardUI();
            }
        }

        if (event.target.closest("#donation-wizard-next-btn")) {
            if (donationWizardStep < donationWizardMaxSteps) {
                if (validateDonationWizardStep()) {
                    donationWizardStep++;
                    updateDonationWizardUI();
                    if (donationWizardStep === 2 && selectedDeliveryMethod !== "ong") populatePedidoMatches();
                }
            } else {
                finalizeDonationWizard();
            }
        }

        const deliveryTab = event.target.closest("#delivery-method-grid .role-tab");
        if (deliveryTab) {
            document.querySelectorAll("#delivery-method-grid .role-tab").forEach((tab) => tab.classList.remove("active"));
            deliveryTab.classList.add("active");
            selectedDeliveryMethod = deliveryTab.dataset.delivery;
            const ongGroup = document.getElementById("dw-ong-select-group");
            const specificGroup = document.getElementById("dw-specific-select-group");
            const hint = document.getElementById("delivery-wizard-hint");
            if (selectedDeliveryMethod === "ong") {
                ongGroup?.classList.remove("hidden");
                specificGroup?.classList.add("hidden");
                if (hint) hint.innerText = "Mediação de ONG: a instituição recebe, faz a triagem, separa e organiza a entrega ao beneficiário.";
            } else {
                ongGroup?.classList.add("hidden");
                specificGroup?.classList.remove("hidden");
                populatePedidoMatches();
                if (hint) hint.innerText = "Você escolhe quem recebe: assim que a doação for confirmada, um chat é liberado para combinar local e horário com essa pessoa.";
            }
        }

        const pedidoCard = event.target.closest("#dw-pedido-list [data-pedido-id]");
        if (pedidoCard) {
            selectedPedidoId = pedidoCard.dataset.pedidoId;
            document.querySelectorAll("#dw-pedido-list [data-pedido-id]").forEach((card) => {
                const isSel = card.dataset.pedidoId === selectedPedidoId;
                card.classList.toggle("selected", isSel);
                card.setAttribute("aria-checked", String(isSel));
            });
        }

        const cancelBtn = event.target.closest("[data-cancel-donation]");
        if (cancelBtn) cancelDonation(cancelBtn.dataset.cancelDonation);

        const acceptBtn = event.target.closest("[data-accept-direct]");
        if (acceptBtn) acceptDirectDonation(acceptBtn.dataset.acceptDirect);

        const markDeliveredBtn = event.target.closest("[data-mark-delivered]");
        if (markDeliveredBtn) markDirectDelivered(markDeliveredBtn.dataset.markDelivered);

        const confirmBtn = event.target.closest("[data-confirm-delivery]");
        if (confirmBtn) confirmDirectDelivery(confirmBtn.dataset.confirmDelivery);

        const ongAdvanceBtn = event.target.closest("[data-ong-advance]");
        if (ongAdvanceBtn) advanceOngDonation(ongAdvanceBtn.dataset.ongAdvance);

        const ongRejectBtn = event.target.closest("[data-ong-reject]");
        if (ongRejectBtn) rejectOngDonation(ongRejectBtn.dataset.ongReject);

        const reescolherOngBtn = event.target.closest("[data-reescolher-ong]");
        if (reescolherOngBtn) abrirReescolherOngModal(reescolherOngBtn.dataset.reescolherOng);

        if (event.target.closest("#reescolher-ong-close-btn")) {
            fecharReescolherOngModal();
        }

        const tornarDiretaBtn = event.target.closest("[data-tornar-direta]");
        if (tornarDiretaBtn) tornarDoacaoDireta(tornarDiretaBtn.dataset.tornarDireta);

        const chatBtn = event.target.closest("[data-open-donation-chat]");
        if (chatBtn) openDoacaoChat(chatBtn.dataset.openDonationChat);

        const doarCampanhaBtn = event.target.closest("[data-doar-campanha]");
        if (doarCampanhaBtn) abrirCampaignDonationModal(doarCampanhaBtn.dataset.doarCampanha);

        if (event.target.closest("#campaign-donation-close-btn")) {
            fecharCampaignDonationModal();
        }

        const pedidoVincularBtn = event.target.closest("[data-pedido-vincular]");
        if (pedidoVincularBtn) vincularDoacaoAoPedido(pedidoVincularBtn.dataset.pedidoVincular, pedidoVincularBtn.dataset.doacaoVincular);

        const pedidoConcluirBtn = event.target.closest("[data-pedido-concluir]");
        if (pedidoConcluirBtn) confirmarRecebimentoPedido(pedidoConcluirBtn.dataset.pedidoConcluir);

        const pedidoChatBtn = event.target.closest("[data-open-pedido-chat]");
        if (pedidoChatBtn) openPedidoChat(pedidoChatBtn.dataset.openPedidoChat);
    });

    document.addEventListener("submit", (event) => {
        if (event.defaultPrevented) return;
        if (event.target.matches("#help-request-form")) {
            saveHelpRequest(event);
        }
        if (event.target.matches("#donation-wizard-form")) {
            event.preventDefault();
        }
        if (event.target.matches("#nova-campanha-form")) {
            saveCampanha(event);
        }
        if (event.target.matches("#campaign-donation-form")) {
            finalizeCampaignDonation(event);
        }
        if (event.target.matches("#reescolher-ong-form")) {
            confirmarReescolherOng(event);
        }
    });
}

// A delegação permite que os elementos carregados via partials continuem funcionando.
setupDonationInteractions();
document.addEventListener("includesLoaded", renderCommunityPedidos);
document.addEventListener("includesLoaded", renderDonationFlows);

window.saveHelpRequest = saveHelpRequest;
window.activateDonationTab = activateDonationTab;
window.renderCommunityPedidos = renderCommunityPedidos;
window.renderDonationFlows = renderDonationFlows;
window.renderMyPedidos = renderMyPedidos;
window.renderOngPedidos = renderOngPedidos;
window.openDonationWizard = openDonationWizard;
