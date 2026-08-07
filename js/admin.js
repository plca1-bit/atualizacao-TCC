/* ========================================================
   PONTE SOLIDÁRIA - FASE 5: PAINEL DA ONG, ESTOQUE E CAMPANHAS
   ======================================================== */

// Aguarda o Firebase estar pronto
document.addEventListener("firebaseReady", () => {
    initOngPanel();
});

function initOngPanel() {
    renderOngDashboardStats();
    renderOngCampanhas();
    renderOngMediacao();
    renderOngEstoque();
}

// 1. DASHBOARD DA ONG - INDICADORES DINÂMICOS DO FIRESTORE
async function renderOngDashboardStats() {
    if (!window.fb) return;
    const { db, firestoreSdk } = window.fb;

    try {
        // Consultas em paralelo para melhor performance
        const [doacoesSnap, pedidosSnap, campanhasSnap, vendasSnap] = await Promise.all([
            firestoreSdk.getDocs(firestoreSdk.collection(db, "doacoes")),
            firestoreSdk.getDocs(firestoreSdk.collection(db, "pedidos")),
            firestoreSdk.getDocs(firestoreSdk.collection(db, "campanhas")),
            firestoreSdk.getDocs(firestoreSdk.collection(db, "vendas"))
        ]);

        let totalDoacoes = doacoesSnap.size;
        let totalEntregas = 0;
        let totalArrecadado = 0;
        let totalVendas = vendasSnap.size;

        // Soma entregas concluídas e arrecadações financeiras
        doacoesSnap.forEach(doc => {
            const data = doc.data();
            if (data.status === "Concluída" || data.status === "Entregue") totalEntregas++;
            if (data.valorFinanceiro) totalArrecadado += Number(data.valorFinanceiro);
        });

        vendasSnap.forEach(doc => {
            const data = doc.data();
            if (data.valorTotal) totalArrecadado += Number(data.valorTotal);
        });

        const campanhasAtivas = campanhasSnap.docs.filter(d => d.data().status === "ativa").length;

        // Atualização dos elementos na interface
        updateElementText("stat-total-doacoes", totalDoacoes);
        updateElementText("stat-total-entregas", totalEntregas);
        updateElementText("stat-campanhas-ativas", campanhasAtivas);
        updateElementText("stat-total-vendas", totalVendas);
        updateElementText("stat-total-arrecadado", `R$ ${totalArrecadado.toFixed(2).replace(".", ",")}`);

    } catch (error) {
        console.error("Erro ao carregar estatísticas do Firestore:", error);
    }
}

// 2. MÓDULO DE CAMPANHAS
async function renderOngCampanhas() {
    const container = document.getElementById("ong-campanhas-list");
    if (!container || !window.fb) return;

    const { db, firestoreSdk } = window.fb;

    try {
        const snap = await firestoreSdk.getDocs(firestoreSdk.collection(db, "campanhas"));
        if (snap.empty) {
            container.innerHTML = `<p class="text-muted">Nenhuma campanha cadastrada no momento.</p>`;
            return;
        }

        container.innerHTML = snap.docs.map(docSnap => {
            const c = docSnap.data();
            const progresso = Math.min(Math.round((c.arrecadado / c.meta) * 100), 100) || 0;

            return `
                <div class="campanha-card-admin" style="border:1px solid var(--color-border); padding:16px; border-radius:8px; margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4>${escapeHtml(c.titulo)}</h4>
                        <span class="badge-status ${c.status === 'ativa' ? 'active' : 'closed'}">${c.status === 'ativa' ? 'Ativa' : 'Encerrada'}</span>
                    </div>
                    <p style="font-size:0.9rem; margin:8px 0;">${escapeHtml(c.descricao || '')}</p>
                    <div class="progress-bar-container" style="background:#e0e0e0; height:10px; border-radius:5px; overflow:hidden;">
                        <div style="width:${progresso}%; background:var(--color-primary, #1fa65e); height:100%;"></div>
                    </div>
                    <small>Arrecadado: R$ ${Number(c.arrecadado || 0).toFixed(2)} / Meta: R$ ${Number(c.meta || 0).toFixed(2)} (${progresso}%)</small>
                </div>
            `;
        }).join("");

    } catch (error) {
        console.error("Erro ao carregar campanhas:", error);
    }
}

// 3. MÓDULO DE MEDIAÇÃO DE DOAÇÕES
async function renderOngMediacao() {
    const tbody = document.getElementById("ong-mediacao-tbody");
    if (!tbody || !window.fb) return;

    const { db, firestoreSdk } = window.fb;

    try {
        const q = firestoreSdk.query(
            firestoreSdk.collection(db, "doacoes"),
            firestoreSdk.where("tipoEntrega", "==", "ONG")
        );
        const snap = await firestoreSdk.getDocs(q);

        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4">Nenhuma mediação pendente no momento.</td></tr>`;
            return;
        }

        tbody.innerHTML = snap.docs.map(docSnap => {
            const d = docSnap.data();
            const id = docSnap.id;

            return `
                <tr>
                    <td><strong>${escapeHtml(d.item || "Item Sem Nome")}</strong></td>
                    <td>${escapeHtml(d.doadorNome || "Anônimo")}</td>
                    <td>${escapeHtml(d.categoria || "Geral")}</td>
                    <td><span class="badge-status">${escapeHtml(d.status || "Aguardando")}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="avancarStatusMediacao('${id}', '${d.status}')">
                            Avançar Fluxo →
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

    } catch (error) {
        console.error("Erro ao carregar mediações:", error);
    }
}

// Avançar Status do Fluxo da ONG
window.avancarStatusMediacao = async function(id, statusAtual) {
    const { db, firestoreSdk } = window.fb;
    const proximosStatus = {
        "Aguardando Aceite": "Aguardando Retirada",
        "Aguardando Retirada": "Em Estoque",
        "Em Estoque": "Em Transporte",
        "Em Transporte": "Entregue",
        "Entregue": "Concluída"
    };

    const novoStatus = proximosStatus[statusAtual] || "Concluída";

    try {
        const docRef = firestoreSdk.doc(db, "doacoes", id);
        await firestoreSdk.updateDoc(docRef, { status: novoStatus });
        window.showToast?.(`Status atualizado para: ${novoStatus}`);
        initOngPanel();
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
    }
};

// 4. MÓDULO DE ESTOQUE (CÁLCULO AUTOMÁTICO: ENTRADAS - SAÍDAS)
async function renderOngEstoque() {
    const tbody = document.getElementById("ong-estoque-tbody");
    if (!tbody || !window.fb) return;

    const { db, firestoreSdk } = window.fb;

    try {
        const [doacoesSnap, vendasSnap] = await Promise.all([
            firestoreSdk.getDocs(firestoreSdk.collection(db, "doacoes")),
            firestoreSdk.getDocs(firestoreSdk.collection(db, "vendas"))
        ]);

        const estoque = {};

        // ENTRADAS: Doações recebidas e armazenadas
        doacoesSnap.forEach(docSnap => {
            const d = docSnap.data();
            if (["Em Estoque", "Em Transporte", "Entregue", "Concluída"].includes(d.status)) {
                const cat = d.categoria || "Outros";
                const qtd = Number(d.quantidade || 1);
                estoque[cat] = (estoque[cat] || 0) + qtd;
            }
        });

        // SAÍDAS: Vendas do Brechó e Entregas Concluídas
        vendasSnap.forEach(docSnap => {
            const v = docSnap.data();
            const cat = v.categoria || "Outros";
            const qtd = Number(v.quantidade || 1);
            estoque[cat] = Math.max(0, (estoque[cat] || 0) - qtd);
        });

        const categorias = Object.keys(estoque);

        if (categorias.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4">Sem itens em estoque no momento.</td></tr>`;
            return;
        }

        tbody.innerHTML = categorias.map(cat => {
            const qtd = estoque[cat];
            const nivel = qtd > 30 ? "Bom" : qtd > 10 ? "Médio" : "Crítico";
            const badgeClass = qtd > 30 ? "status-success" : qtd > 10 ? "status-warning" : "status-danger";

            return `
                <tr>
                    <td><strong>${escapeHtml(cat)}</strong></td>
                    <td>${qtd} unidades</td>
                    <td><span class="badge-status ${badgeClass}">${nivel}</span></td>
                    <td>${new Date().toLocaleDateString('pt-BR')}</td>
                </tr>
            `;
        }).join("");

    } catch (error) {
        console.error("Erro ao calcular estoque:", error);
    }
}

// 5. FUNÇÃO PARA RELATÓRIO DE IMPRESSÃO
window.imprimirRelatorioOng = function() {
    window.print();
};

// Funções Utilitárias
function updateElementText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, match => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[match]));
}