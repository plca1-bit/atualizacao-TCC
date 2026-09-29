/* ========================================================
   PONTE SOLIDÁRIA - FASE 6: NOTIFICAÇÕES & HISTÓRICO
   ======================================================== */

document.addEventListener("firebaseReady", () => {
    initFase6Engine();
});

function initFase6Engine() {
    iniciarNotificacoesUsuario();
    renderTimelineAtividades();
}

/* --------------------------------------------------------
   1. SISC-REGISTRO TRIPLO AUTOMÁTICO (NOTIFICAÇÃO, HISTÓRICO, AUDITORIA)
   "tipo" identifica a categoria da notificação (mensagem, pedido,
   doacao, pedido_compativel, doacao_disponivel, campanha) — usado só
   pela Central de Notificações para escolher o ícone e a ação de
   clique (ver ICONES_NOTIFICACAO/window.executarAcaoNotificacao,
   abaixo e em js/doacoes.js). "referencia" carrega o dado mínimo pra
   essa ação (ex.: { threadTipo: "pedido", id } pra abrir o chat certo,
   ou { pedidoId }/{ campanhaId } pra navegar até o card). Nenhum dos
   dois é usado pelo histórico/auditoria — só a notificação em si.
   -------------------------------------------------------- */
window.registrarAcaoGlobal = async function ({ usuarioId, titulo, descricao, categoria, acaoAuditoria, tipo, referencia }) {
    if (!window.fb || !usuarioId) return;
    const { db, firestoreSdk } = window.fb;
    const timestampIso = new Date().toISOString();

    try {
        // A. Notificação ao Usuário
        await firestoreSdk.addDoc(firestoreSdk.collection(db, "notificacoes"), {
            usuarioId,
            titulo,
            mensagem: descricao,
            tipo: tipo || "geral",
            referencia: referencia || null,
            lida: false,
            dataCriacao: timestampIso
        });

        // B. Histórico de Atividades (Timeline)
        await firestoreSdk.addDoc(firestoreSdk.collection(db, "historico_atividades"), {
            usuarioId,
            titulo,
            descricao,
            categoria: categoria || "Geral", // 'Doação', 'Pedido', 'Compra', 'Campanha'
            dataHora: timestampIso
        });

        // C. Audit Trail (Auditoria do Sistema)
        await firestoreSdk.addDoc(firestoreSdk.collection(db, "auditoria_logs"), {
            usuarioId,
            acao: acaoAuditoria || titulo,
            detalhes: descricao,
            dataHora: timestampIso,
            ipOrigem: "client-web"
        });

        // 🔴 Achado nesta auditoria: esta função é chamada toda vez que
        // QUALQUER ação notável acontece no site — e o destinatário quase
        // sempre é OUTRA conta (ex.: a ONG aprova um pedido e notifica o
        // solicitante), não quem está logado agora. "Atualizar a
        // interface" chamando renderCentralNotificacoes() sem argumento
        // (o parâmetro esperado é a lista de notificações) fazia
        // `notificacoes.filter(...)`, dentro dela, estourar
        // TypeError em TODA chamada — o que, por sua vez, pulava
        // renderTimelineAtividades() logo abaixo (mesmo bloco try) e
        // gerava um "Erro no registro triplo automático" no console a
        // cada doação aceita, pedido aprovado etc., mesmo com os três
        // registros já gravados com sucesso no Firestore. A própria
        // central de notificações do destinatário já se atualiza sozinha
        // pelo onSnapshot de iniciarNotificacoesUsuario() (Fase 6, item 2)
        // — não precisa (e não pode) ser repintada daqui. Repintamos aqui
        // só a lista da conta atualmente logada, com o que ela já tem em
        // memória (ultimasNotificacoes), para o caso raro de alguém
        // notificar a própria conta.
        renderCentralNotificacoes(ultimasNotificacoes);
        renderTimelineAtividades();

    } catch (error) {
        console.error("Erro no registro triplo automático (Fase 6):", error);
    }
};

/* --------------------------------------------------------
   2. CENTRAL DE NOTIFICAÇÕES (FIRESTORE, TEMPO REAL)
   Assina a coleção "notificacoes" da conta logada com onSnapshot,
   assim o sino/badge do header atualiza sozinho assim que alguém
   (ex.: um doador aceito, uma ONG que mediou) gera uma notificação —
   sem precisar recarregar a página. A assinatura é reiniciada a cada
   login (iniciarNotificacoesUsuario) e encerrada no logout
   (pararNotificacoesUsuario), para não vazar notificações de uma
   conta para outra no mesmo navegador.
   -------------------------------------------------------- */
let notificacoesUnsubscribe = null;
let ultimasNotificacoes = [];

function iniciarNotificacoesUsuario() {
    const notifList = document.getElementById("notification-list");
    const usuarioAtual = window.appState?.user || JSON.parse(localStorage.getItem("ps_current_user") || "null");

    if (!notifList || !usuarioAtual || !window.fb) return;
    const { db, firestoreSdk } = window.fb;

    if (notificacoesUnsubscribe) { notificacoesUnsubscribe(); notificacoesUnsubscribe = null; }

    const q = firestoreSdk.query(
        firestoreSdk.collection(db, "notificacoes"),
        firestoreSdk.where("usuarioId", "==", usuarioAtual.id || usuarioAtual.uid)
    );

    notificacoesUnsubscribe = firestoreSdk.onSnapshot(q, (snap) => {
        const notificacoes = [];
        snap.forEach(docSnap => notificacoes.push({ id: docSnap.id, ...docSnap.data() }));
        notificacoes.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
        ultimasNotificacoes = notificacoes;
        renderCentralNotificacoes(notificacoes);
    }, (error) => console.warn("Erro ao sincronizar notificações:", error));
}

function pararNotificacoesUsuario() {
    if (notificacoesUnsubscribe) { notificacoesUnsubscribe(); notificacoesUnsubscribe = null; }
    ultimasNotificacoes = [];
    renderCentralNotificacoes([]);
}

// Ícone por tipo (item 12 da revisão — "as notificações precisam
// funcionar como um verdadeiro centro de acontecimentos"). Um tipo sem
// mapeamento (ou notificações antigas, gravadas antes deste campo
// existir) cai no sino genérico — nunca quebra a renderização.
// Usa os mesmos ícones Lucide do resto do site (em vez de emoji, que
// destoa visualmente do restante da interface).
const ICONES_NOTIFICACAO = {
    mensagem: "message-circle",
    pedido_compativel: "life-buoy",
    doacao_disponivel: "gift",
    doacao: "gift",
    pedido: "clipboard-list",
    campanha: "megaphone"
};
function iconeNotificacao(tipo) {
    return ICONES_NOTIFICACAO[tipo] || "bell";
}

function renderCentralNotificacoes(notificacoes) {
    const notifBadge = document.getElementById("notif-badge");
    const notifList = document.getElementById("notification-list");
    if (!notifList) return;

    const naoLidas = notificacoes.filter(n => !n.lida).length;
    if (notifBadge) {
        if (naoLidas > 0) {
            notifBadge.textContent = naoLidas;
            notifBadge.classList.remove("hidden");
        } else {
            notifBadge.classList.add("hidden");
        }
    }

    if (notificacoes.length === 0) {
        notifList.innerHTML = `<li class="no-notif p-3 text-center text-muted">Nenhuma notificação encontrada.</li>`;
        return;
    }

    notifList.innerHTML = notificacoes.map(n => `
        <li class="notif-item ${n.lida ? 'read' : 'unread'}" onclick="window.abrirNotificacao('${n.id}')">
            <span class="notif-icon" aria-hidden="true"><i data-lucide="${iconeNotificacao(n.tipo)}"></i></span>
            <div class="notif-content">
                <strong>${escapeHtml(n.titulo)}</strong>
                <p>${escapeHtml(n.mensagem)}</p>
                <span class="notif-time" title="${new Date(n.dataCriacao).toLocaleString('pt-BR')}">${formatarDataRelativa(n.dataCriacao)}</span>
            </div>
        </li>
    `).join("");
    if (window.lucide) window.lucide.createIcons();
}

window.marcarNotificacaoComoLida = async function (notifId) {
    if (!window.fb) return;
    const { db, firestoreSdk } = window.fb;

    try {
        const docRef = firestoreSdk.doc(db, "notificacoes", notifId);
        await firestoreSdk.updateDoc(docRef, { lida: true });
        // onSnapshot já repinta a lista sozinho — não precisa recarregar.
    } catch (error) {
        console.error("Erro ao atualizar notificação:", error);
    }
};

// Clique numa notificação (item 12 da revisão — "ação correspondente"):
// marca como lida (se ainda não estava) e, quando a notificação carrega
// uma referência de navegação, delega a ação real para
// window.executarAcaoNotificacao() (js/doacoes.js — é lá que moram as
// funções de trocar de aba/seção e abrir o chat certo). Sem essa função
// carregada ainda (módulo não pronto), a notificação pelo menos é
// marcada como lida — nunca quebra o clique.
window.abrirNotificacao = function (notifId) {
    const notif = ultimasNotificacoes.find((n) => n.id === notifId);
    if (notif && !notif.lida) window.marcarNotificacaoComoLida(notifId);

    document.getElementById("notif-menu")?.classList.add("hidden");
    document.getElementById("notif-btn")?.setAttribute("aria-expanded", "false");

    if (notif && typeof window.executarAcaoNotificacao === "function") {
        window.executarAcaoNotificacao(notif.tipo, notif.referencia);
    }
};

window.marcarTodasNotificacoesComoLidas = async function () {
    if (!window.fb) return;
    const { db, firestoreSdk } = window.fb;
    const pendentes = ultimasNotificacoes.filter(n => !n.lida);
    try {
        await Promise.all(pendentes.map(n => firestoreSdk.updateDoc(firestoreSdk.doc(db, "notificacoes", n.id), { lida: true })));
    } catch (error) {
        console.error("Erro ao marcar notificações como lidas:", error);
    }
};

window.iniciarNotificacoesUsuario = iniciarNotificacoesUsuario;
window.pararNotificacoesUsuario = pararNotificacoesUsuario;

/* --------------------------------------------------------
   3. TIMELINE DE ATIVIDADES (HOJE, ONTEM, ÚLTIMOS DIAS)
   -------------------------------------------------------- */
async function renderTimelineAtividades() {
    const container = document.getElementById("user-timeline-container");
    const usuarioAtual = window.appState?.user || JSON.parse(localStorage.getItem("ps_current_user"));

    if (!container || !usuarioAtual || !window.fb) return;
    const { db, firestoreSdk } = window.fb;

    try {
        const q = firestoreSdk.query(
            firestoreSdk.collection(db, "historico_atividades"),
            firestoreSdk.where("usuarioId", "==", usuarioAtual.id || usuarioAtual.uid)
        );

        const snap = await firestoreSdk.getDocs(q);
        const atividades = [];

        snap.forEach(docSnap => atividades.push(docSnap.data()));
        atividades.sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

        if (atividades.length === 0) {
            container.innerHTML = `<div class="p-3 text-center text-muted">Nenhuma atividade registrada ainda.</div>`;
            return;
        }

        const agrupado = agruparAtividadesPorData(atividades);

        let html = "";

        if (agrupado.hoje.length > 0) {
            html += `<h4 class="timeline-group-title">Hoje</h4>` + renderGrupoTimeline(agrupado.hoje);
        }
        if (agrupado.ontem.length > 0) {
            html += `<h4 class="timeline-group-title">Ontem</h4>` + renderGrupoTimeline(agrupado.ontem);
        }
        if (agrupado.ultimosDias.length > 0) {
            html += `<h4 class="timeline-group-title">Últimos Dias</h4>` + renderGrupoTimeline(agrupado.ultimosDias);
        }

        container.innerHTML = html;

    } catch (error) {
        console.error("Erro ao montar timeline de atividades:", error);
    }
}

function agruparAtividadesPorData(lista) {
    const hojeStr = new Date().toISOString().split('T')[0];
    const ontemObj = new Date();
    ontemObj.setDate(ontemObj.getDate() - 1);
    const ontemStr = ontemObj.toISOString().split('T')[0];

    const grupos = { hoje: [], ontem: [], ultimosDias: [] };

    lista.forEach(item => {
        const dataItem = item.dataHora ? item.dataHora.split('T')[0] : '';
        if (dataItem === hojeStr) {
            grupos.hoje.push(item);
        } else if (dataItem === ontemStr) {
            grupos.ontem.push(item);
        } else {
            grupos.ultimosDias.push(item);
        }
    });

    return grupos;
}

function renderGrupoTimeline(itens) {
    return `
        <div class="timeline-list mb-4">
            ${itens.map(item => `
                <div class="timeline-item">
                    <div class="timeline-badge icon-${(item.categoria || 'geral').toLowerCase()}"></div>
                    <div class="timeline-card">
                        <span class="timeline-category">${escapeHtml(item.categoria || 'Geral')}</span>
                        <h5>${escapeHtml(item.titulo)}</h5>
                        <p>${escapeHtml(item.descricao)}</p>
                        <small class="text-muted">${new Date(item.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

// Funções de formatação auxiliar
function formatarDataRelativa(dataIso) {
    const diffMs = new Date() - new Date(dataIso);
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Agora mesmo";
    if (diffMin < 60) return `Há ${diffMin} min`;
    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) return `Há ${diffHoras} h`;
    return new Date(dataIso).toLocaleDateString('pt-BR');
}

function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, match => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[match]));
}