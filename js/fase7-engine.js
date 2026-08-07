/* ========================================================
   PONTE SOLIDÁRIA - FASE 7: TRANSPARÊNCIA, ADMIN E LOGS
   ======================================================== */

document.addEventListener("firebaseReady", () => {
    initFase7EngineWithRetry();
});

// Listener para recalcular quando o usuário navegar para Transparência
document.addEventListener("click", (e) => {
    if (e.target.closest("#nav-transparency") || e.target.closest("[href*='transparencia']")) {
        setTimeout(renderPortalTransparencia, 300);
    }
});

function initFase7EngineWithRetry(tentativas = 0) {
    const sectionTransp = document.getElementById("transparencia-section");
    
    // Se o HTML dinâmico ainda não carregou, aguarda 200ms e tenta novamente (até 10x)
    if (!sectionTransp && tentativas < 10) {
        setTimeout(() => initFase7EngineWithRetry(tentativas + 1), 200);
        return;
    }

    renderPortalTransparencia();
    renderPainelAdmin();
}

/* --------------------------------------------------------
   1. REGISTRO AUTOMÁTICO DE LOGS DE AUDITORIA
   -------------------------------------------------------- */
window.registrarLogAuditoria = async function (acao, detalhes, resultado = "Sucesso") {
    if (!window.fb) return;
    const { db, firestoreSdk } = window.fb;
    const usuarioAtual = window.appState?.user || JSON.parse(localStorage.getItem("ps_current_user")) || { nome: "Anônimo", id: "system" };

    try {
        await firestoreSdk.addDoc(firestoreSdk.collection(db, "auditoria_logs"), {
            usuarioId: usuarioAtual.id || usuarioAtual.uid || "system",
            usuarioNome: usuarioAtual.nome || "Usuário",
            acao,
            detalhes: detalhes || "",
            resultado,
            dataHora: new Date().toISOString()
        });
    } catch (error) {
        console.error("Erro ao gravar log de auditoria:", error);
    }
};

/* --------------------------------------------------------
   2. PORTAL DE TRANSPARÊNCIA (CARREGAMENTO RESILIENTE)
   -------------------------------------------------------- */
async function renderPortalTransparencia() {
    const containerTransp = document.getElementById("transparencia-section");
    if (!containerTransp || !window.fb) return;

    const { db, firestoreSdk } = window.fb;

    try {
        const [doacoesSnap, vendasSnap, pedidosSnap, campanhasSnap] = await Promise.all([
            firestoreSdk.getDocs(firestoreSdk.collection(db, "doacoes")),
            firestoreSdk.getDocs(firestoreSdk.collection(db, "vendas")),
            firestoreSdk.getDocs(firestoreSdk.collection(db, "pedidos")),
            firestoreSdk.getDocs(firestoreSdk.collection(db, "campanhas"))
        ]);

        let familiasAtendidas = 0;
        let totalDoacoes = doacoesSnap.size;
        let totalProdutosVendidos = 0;
        let totalArrecadado = 0;
        let totalCampanhas = campanhasSnap.size;

        const categoriasMap = {};

        pedidosSnap.forEach(d => {
            const data = d.data();
            if (["Aprovado", "Atendido", "Concluído", "Entregue"].includes(data.status)) {
                familiasAtendidas++;
            }
        });

        doacoesSnap.forEach(d => {
            const data = d.data();
            const cat = data.categoria || "Geral";
            categoriasMap[cat] = (categoriasMap[cat] || 0) + 1;
            if (data.valorFinanceiro) totalArrecadado += Number(data.valorFinanceiro);
        });

        vendasSnap.forEach(v => {
            const data = v.data();
            totalProdutosVendidos += Number(data.quantidade || 1);
            if (data.valorTotal) totalArrecadado += Number(data.valorTotal);
        });

        // Atualização imediata dos valores na tela
        updateTxt("transp-familias", familiasAtendidas);
        updateTxt("transp-doacoes", totalDoacoes);
        updateTxt("transp-campanhas", totalCampanhas);
        updateTxt("transp-vendas", totalProdutosVendidos);
        updateTxt("transp-arrecadacao", `R$ ${totalArrecadado.toFixed(2).replace(".", ",")}`);

        renderGraficoCategorias(categoriasMap);

    } catch (error) {
        console.error("Erro ao carregar Portal de Transparência:", error);
    }
}

function renderGraficoCategorias(categorias) {
    const chartContainer = document.getElementById("transparencia-chart-container");
    if (!chartContainer) return;

    const total = Object.values(categorias).reduce((a, b) => a + b, 0);
    const chaves = Object.keys(categorias);

    if (chaves.length === 0 || total === 0) {
        chartContainer.innerHTML = `<p class="text-center text-muted p-3">Ainda não há doações registradas para exibir o gráfico por categoria.</p>`;
        return;
    }

    chartContainer.innerHTML = chaves.map(cat => {
        const qtd = categorias[cat];
        const pct = Math.round((qtd / total) * 100);

        return `
            <div class="chart-bar-item mb-3">
                <div class="d-flex justify-content-between font-weight-bold mb-1" style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span>${escapeHtml(cat)}</span>
                    <span>${qtd} item(ns) (${pct}%)</span>
                </div>
                <div class="progress" style="height: 16px; background: rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden;">
                    <div class="progress-bar" style="width: ${pct}%; background: var(--color-primary, #1fa65e); height: 100%;"></div>
                </div>
            </div>
        `;
    }).join("");
}

/* --------------------------------------------------------
   3. PAINEL DO ADMINISTRADOR
   -------------------------------------------------------- */
async function renderPainelAdmin() {
    const adminPanel = document.getElementById("admin-section");
    if (!adminPanel || !window.fb) return;

    await Promise.all([
        carregarOngsPendentes(),
        carregarUsuariosAdmin(),
        carregarLogsAuditoria()
    ]);
}

async function carregarOngsPendentes() {
    const tbody = document.getElementById("admin-ongs-tbody");
    if (!tbody || !window.fb) return;
    const { db, firestoreSdk } = window.fb;

    try {
        const snap = await firestoreSdk.getDocs(firestoreSdk.collection(db, "usuarios"));
        const ongs = [];

        snap.forEach(docSnap => {
            const u = docSnap.data();
            if (u.papel === "ONG") ongs.push({ id: docSnap.id, ...u });
        });

        if (ongs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted">Nenhuma ONG cadastrada.</td></tr>`;
            return;
        }

        tbody.innerHTML = ongs.map(ong => `
            <tr>
                <td><strong>${escapeHtml(ong.nome || 'ONG')}</strong><br><small class="text-muted">${escapeHtml(ong.email)}</small></td>
                <td>${escapeHtml(ong.cnpj || 'Não informado')}</td>
                <td><span class="badge-status">${ong.statusAprovacao || 'Pendente'}</span></td>
                <td>
                    ${ong.statusAprovacao !== 'aprovado' ? `
                        <button class="btn btn-sm btn-primary" onclick="aprovarOngAdmin('${ong.id}', '${escapeHtml(ong.nome)}')">Aprovar ONG</button>
                    ` : `<span class="text-muted small">Aprovada</span>`}
                </td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Erro ao carregar ONGs:", error);
    }
}

window.aprovarOngAdmin = async function (id, nome) {
    if (!window.fb) return;
    const { db, firestoreSdk } = window.fb;

    try {
        const docRef = firestoreSdk.doc(db, "usuarios", id);
        await firestoreSdk.updateDoc(docRef, { statusAprovacao: "aprovado" });

        await window.registrarLogAuditoria("Aprovação", `Aprovou a ONG: ${nome}`);
        window.showToast?.(`ONG ${nome} aprovada!`);
        carregarOngsPendentes();
    } catch (error) {
        console.error("Erro ao aprovar ONG:", error);
    }
};

async function carregarUsuariosAdmin() {
    const tbody = document.getElementById("admin-usuarios-tbody");
    if (!tbody || !window.fb) return;
    const { db, firestoreSdk } = window.fb;

    try {
        const snap = await firestoreSdk.getDocs(firestoreSdk.collection(db, "usuarios"));

        tbody.innerHTML = snap.docs.map(docSnap => {
            const u = docSnap.data();
            const id = docSnap.id;
            const bloqueado = u.statusConta === "bloqueado";

            return `
                <tr>
                    <td><strong>${escapeHtml(u.nome || 'Usuário')}</strong></td>
                    <td>${escapeHtml(u.email)}</td>
                    <td><span class="badge-role">${escapeHtml(u.papel || 'Pessoa')}</span></td>
                    <td>
                        <button class="btn btn-sm ${bloqueado ? 'btn-secondary' : 'btn-danger'}" 
                                onclick="alternarBloqueioUsuario('${id}', '${escapeHtml(u.nome)}', ${bloqueado})">
                            ${bloqueado ? 'Desbloquear' : 'Bloquear'}
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

    } catch (error) {
        console.error("Erro ao carregar usuários admin:", error);
    }
}

window.alternarBloqueioUsuario = async function (id, nome, estaBloqueado) {
    if (!window.fb) return;
    const { db, firestoreSdk } = window.fb;
    const novoStatus = estaBloqueado ? "ativo" : "bloqueado";

    try {
        const docRef = firestoreSdk.doc(db, "usuarios", id);
        await firestoreSdk.updateDoc(docRef, { statusConta: novoStatus });

        await window.registrarLogAuditoria("Bloqueio/Acesso", `${estaBloqueado ? 'Desbloqueou' : 'Bloqueou'} o usuário: ${nome}`);
        window.showToast?.(`Usuário ${nome} foi ${estaBloqueado ? 'desbloqueado' : 'bloqueado'}.`);
        carregarUsuariosAdmin();
    } catch (error) {
        console.error("Erro ao alterar bloqueio de usuário:", error);
    }
};

async function carregarLogsAuditoria() {
    const tbody = document.getElementById("admin-auditoria-tbody");
    if (!tbody || !window.fb) return;
    const { db, firestoreSdk } = window.fb;

    try {
        const snap = await firestoreSdk.getDocs(firestoreSdk.collection(db, "auditoria_logs"));
        const logs = [];

        snap.forEach(d => logs.push(d.data()));
        logs.sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted">Nenhum log registrado ainda.</td></tr>`;
            return;
        }

        tbody.innerHTML = logs.slice(0, 30).map(log => `
            <tr>
                <td><small>${new Date(log.dataHora).toLocaleString('pt-BR')}</small></td>
                <td><strong>${escapeHtml(log.usuarioNome)}</strong></td>
                <td><span class="badge-action">${escapeHtml(log.acao)}</span></td>
                <td><small>${escapeHtml(log.detalhes)}</small></td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Erro ao carregar logs de auditoria:", error);
    }
}

function updateTxt(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, match => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[match]));
}