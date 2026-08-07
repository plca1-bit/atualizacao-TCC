/* ========================================================
   PONTE SOLIDÁRIA - FASE 6: NOTIFICAÇÕES, HISTÓRICO & CERTIFICADOS
   ======================================================== */

document.addEventListener("firebaseReady", () => {
    initFase6Engine();
});

function initFase6Engine() {
    renderCentralNotificacoes();
    renderTimelineAtividades();
    renderSistemaCertificados();
}

/* --------------------------------------------------------
   1. SISC-REGISTRO TRIPLO AUTOMÁTICO (NOTIFICAÇÃO, HISTÓRICO, AUDITORIA)
   -------------------------------------------------------- */
window.registrarAcaoGlobal = async function ({ usuarioId, titulo, descricao, categoria, acaoAuditoria }) {
    if (!window.fb || !usuarioId) return;
    const { db, firestoreSdk } = window.fb;
    const timestampIso = new Date().toISOString();

    try {
        // A. Notificação ao Usuário
        await firestoreSdk.addDoc(firestoreSdk.collection(db, "notificacoes"), {
            usuarioId,
            titulo,
            mensagem: descricao,
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

        // Atualiza a interface e verifica conquistas
        renderCentralNotificacoes();
        renderTimelineAtividades();
        await verificarEConcederCertificados(usuarioId);

    } catch (error) {
        console.error("Erro no registro triplo automático (Fase 6):", error);
    }
};

/* --------------------------------------------------------
   2. CENTRAL DE NOTIFICAÇÕES (FIRESTORE REAL-TIME)
   -------------------------------------------------------- */
async function renderCentralNotificacoes() {
    const notifBadge = document.getElementById("notif-badge");
    const notifList = document.getElementById("notification-list");
    const usuarioAtual = window.appState?.user || JSON.parse(localStorage.getItem("ps_current_user"));

    if (!notifList || !usuarioAtual || !window.fb) return;
    const { db, firestoreSdk } = window.fb;

    try {
        const q = firestoreSdk.query(
            firestoreSdk.collection(db, "notificacoes"),
            firestoreSdk.where("usuarioId", "==", usuarioAtual.id || usuarioAtual.uid)
        );

        const snap = await firestoreSdk.getDocs(q);
        const notificacoes = [];

        snap.forEach(docSnap => {
            notificacoes.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Ordena por data decrescente
        notificacoes.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));

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
            <li class="notif-item ${n.lida ? 'read' : 'unread'}" onclick="marcarNotificacaoComoLida('${n.id}')">
                <div class="notif-content">
                    <strong>${escapeHtml(n.titulo)}</strong>
                    <p>${escapeHtml(n.mensagem)}</p>
                    <span class="notif-time">${formatarDataRelativa(n.dataCriacao)}</span>
                </div>
            </li>
        `).join("");

    } catch (error) {
        console.error("Erro ao carregar notificações:", error);
    }
}

window.marcarNotificacaoComoLida = async function (notifId) {
    if (!window.fb) return;
    const { db, firestoreSdk } = window.fb;

    try {
        const docRef = firestoreSdk.doc(db, "notificacoes", notifId);
        await firestoreSdk.updateDoc(docRef, { lida: true });
        renderCentralNotificacoes();
    } catch (error) {
        console.error("Erro ao atualizar notificação:", error);
    }
};

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

/* --------------------------------------------------------
   4. SISTEMA DE CERTIFICADOS E CONQUISTAS
   -------------------------------------------------------- */
async function verificarEConcederCertificados(usuarioId) {
    if (!window.fb || !usuarioId) return;
    const { db, firestoreSdk } = window.fb;

    try {
        // Conta total de doações concluídas
        const qDoacoes = firestoreSdk.query(
            firestoreSdk.collection(db, "doacoes"),
            firestoreSdk.where("donorId", "==", usuarioId)
        );
        const snap = await firestoreSdk.getDocs(qDoacoes);
        const totalDoacoes = snap.size;

        const marcos = [
            { id: "cert_1", min: 1, titulo: "Primeira Doação", desc: "Realizou a primeira contribuição na plataforma." },
            { id: "cert_10", min: 10, titulo: "Doador Frequente (10 Doações)", desc: "Contribuiu em 10 ações solidárias." },
            { id: "cert_50", min: 50, titulo: "Membro Iluminado (50 Doações)", desc: "Alcançou a marca de 50 doações efetuadas." }
        ];

        for (const marco of marcos) {
            if (totalDoacoes >= marco.min) {
                const certRef = firestoreSdk.doc(db, "certificados_conquistas", `${usuarioId}_${marco.id}`);
                const certSnap = await firestoreSdk.getDoc(certRef);

                if (!certSnap.exists()) {
                    await firestoreSdk.setDoc(certRef, {
                        usuarioId,
                        codigoCertificado: `CERT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
                        titulo: marco.titulo,
                        descricao: marco.desc,
                        dataConquista: new Date().toISOString()
                    });
                }
            }
        }

        renderSistemaCertificados();

    } catch (error) {
        console.error("Erro ao processar conquistas do usuário:", error);
    }
}

async function renderSistemaCertificados() {
    const container = document.getElementById("user-certificates-container");
    const usuarioAtual = window.appState?.user || JSON.parse(localStorage.getItem("ps_current_user"));

    if (!container || !usuarioAtual || !window.fb) return;
    const { db, firestoreSdk } = window.fb;

    try {
        const q = firestoreSdk.query(
            firestoreSdk.collection(db, "certificados_conquistas"),
            firestoreSdk.where("usuarioId", "==", usuarioAtual.id || usuarioAtual.uid)
        );

        const snap = await firestoreSdk.getDocs(q);

        if (snap.empty) {
            container.innerHTML = `
                <div class="col-12 text-center p-4 border rounded bg-light">
                    <p class="text-muted mb-0">Nenhuma conquista desbloqueada. Realize sua primeira doação para desbloquear seu primeiro certificado!</p>
                </div>`;
            return;
        }

        container.innerHTML = snap.docs.map(docSnap => {
            const cert = docSnap.data();
            return `
                <div class="col-md-4 mb-3">
                    <div class="certificate-badge-card p-3 border rounded shadow-sm bg-white text-center">
                        <div class="badge-icon mb-2">🏆</div>
                        <h5>${escapeHtml(cert.titulo)}</h5>
                        <p class="small text-muted mb-2">${escapeHtml(cert.descricao)}</p>
                        <small class="d-block text-primary fw-bold mb-2">Cód: ${cert.codigoCertificado}</small>
                        <button class="btn btn-sm btn-outline-primary w-100" onclick="abrirModalCertificado('${cert.titulo}', '${cert.codigoCertificado}', '${cert.dataConquista}')">
                            Visualizar Certificado
                        </button>
                    </div>
                </div>
            `;
        }).join("");

    } catch (error) {
        console.error("Erro ao carregar certificados:", error);
    }
}

window.abrirModalCertificado = function (titulo, codigo, data) {
    const certModal = document.getElementById("certificate-modal");
    if (!certModal) return;

    document.getElementById("cert-code").textContent = codigo;
    document.getElementById("cert-date").textContent = new Date(data).toLocaleDateString('pt-BR');

    certModal.classList.remove("hidden");
};

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