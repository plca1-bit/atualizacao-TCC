 /* ========================================================
   PONTE SOLIDÁRIA - ADMINISTRATION, MODERATION & SVG CHARTS
   ======================================================== */
// Painel principal de administração
function renderAdminPanel() {
    const isAdmin = appState.user && (appState.user.role === "admin" || appState.user.role === "ong");
    if (!isAdmin) return;
    renderAdminDashboardStats();
    renderAdminCharts();
    renderAdminPendingUsers();
    renderAdminCampaignsModeration();
    renderAdminComplaints();
    renderAdminDonationsTriagem();
    renderAdminRequestsDistribution();
    renderAdminStock();
    renderAdminBrechoProducts();
    populateLogisticsSelect();
}
// Renderiza cartões de estatísticas no Dashboard Admin
function renderAdminDashboardStats() {
    const totalDonsEl = document.getElementById("admin-stat-total-donations");
    const totalFamEl = document.getElementById("admin-stat-total-families");
    const totalOngsEl = document.getElementById("admin-stat-total-ongs");
    const activeCampEl = document.getElementById("admin-stat-active-campaigns");
    const donations = store.get("ps_demo_donations", []);
    const physical = store.get("ps_demo_physical_donations", []);
    const company = store.get("ps_demo_company_donations", []);
    const requests = store.get("ps_demo_requests", []);
    const campaigns = store.get("ps_demo_campaigns", []);
    const totalDonations = donations.length + physical.length + company.length + 3850;
    const totalFamilies = requests.length + 1240;
    const totalOngs = 45; // Valor demo estático + dinâmicos cadastrados
    const activeCampaigns = campaigns.filter(c => c.status === "active").length + 18;
    if (totalDonsEl) totalDonsEl.textContent = totalDonations;
    if (totalFamEl) totalFamEl.textContent = totalFamilies;
    if (totalOngsEl) totalOngsEl.textContent = totalOngs;
    if (activeCampEl) activeCampEl.textContent = activeCampaigns;
}
// Injeta os Gráficos SVG no Dashboard
function renderAdminCharts() {
    // 1. Gráfico de Crescimento (SVG Linha/Área)
    const growthChartContainer = document.getElementById("admin-growth-chart");
    if (growthChartContainer) {
        growthChartContainer.innerHTML = `
            <svg viewBox="0 0 500 200" width="100%" height="100%" class="admin-chart-svg">
                <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.3"/>
                        <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                <!-- Grid Lines -->
                <line x1="40" y1="20" x2="480" y2="20" stroke="var(--color-border)" stroke-dasharray="3,3"/>
                <line x1="40" y1="75" x2="480" y2="75" stroke="var(--color-border)" stroke-dasharray="3,3"/>
                <line x1="40" y1="130" x2="480" y2="130" stroke="var(--color-border)" stroke-dasharray="3,3"/>
                <line x1="40" y1="170" x2="480" y2="170" stroke="var(--color-border)"/>
                <!-- Area Path -->
                <path d="M 40 170 L 40 140 Q 120 120 200 90 T 360 50 L 480 30 L 480 170 Z" fill="url(#growthGrad)"/>
                
                <!-- Line Path -->
                <path d="M 40 140 Q 120 120 200 90 T 360 50 L 480 30" fill="none" stroke="var(--color-primary)" stroke-width="3" stroke-linecap="round"/>
                
                <!-- Interactive Dots -->
                <circle cx="40" cy="140" r="5" fill="var(--color-primary)" class="chart-dot" title="Jan: 800"/>
                <circle cx="120" cy="125" r="5" fill="var(--color-primary)" class="chart-dot" title="Fev: 1200"/>
                <circle cx="200" cy="90" r="5" fill="var(--color-primary)" class="chart-dot" title="Mar: 1800"/>
                <circle cx="280" cy="80" r="5" fill="var(--color-primary)" class="chart-dot" title="Abr: 2100"/>
                <circle cx="360" cy="50" r="5" fill="var(--color-primary)" class="chart-dot" title="Mai: 3200"/>
                <circle cx="480" cy="30" r="5" fill="var(--color-primary)" class="chart-dot" title="Jun: 4100"/>
                <!-- Labels -->
                <text x="40" y="190" fill="var(--color-text-muted)" font-size="10" text-anchor="middle">Jan</text>
                <text x="120" y="190" fill="var(--color-text-muted)" font-size="10" text-anchor="middle">Fev</text>
                <text x="200" y="190" fill="var(--color-text-muted)" font-size="10" text-anchor="middle">Mar</text>
                <text x="280" y="190" fill="var(--color-text-muted)" font-size="10" text-anchor="middle">Abr</text>
                <text x="360" y="190" fill="var(--color-text-muted)" font-size="10" text-anchor="middle">Mai</text>
                <text x="480" y="190" fill="var(--color-text-muted)" font-size="10" text-anchor="middle">Jun</text>
            </svg>
        `;
    }
    // 2. Gráfico de Barras Mensais (SVG Columns)
    const barChartContainer = document.getElementById("admin-bars-chart");
    if (barChartContainer) {
        barChartContainer.innerHTML = `
            <svg viewBox="0 0 500 200" width="100%" height="100%" class="admin-chart-svg">
                <!-- Grid lines -->
                <line x1="40" y1="20" x2="480" y2="20" stroke="var(--color-border)" stroke-dasharray="3,3"/>
                <line x1="40" y1="95" x2="480" y2="95" stroke="var(--color-border)" stroke-dasharray="3,3"/>
                <line x1="40" y1="170" x2="480" y2="170" stroke="var(--color-border)"/>
                <!-- Bars (Jan - Jun) -->
                <rect x="55" y="100" width="30" height="70" rx="4" fill="var(--color-primary-light)" stroke="var(--color-primary)" stroke-width="1.5" class="chart-bar-rect"/>
                <rect x="125" y="80" width="30" height="90" rx="4" fill="var(--color-primary-light)" stroke="var(--color-primary)" stroke-width="1.5" class="chart-bar-rect"/>
                <rect x="195" y="60" width="30" height="110" rx="4" fill="var(--color-primary-light)" stroke="var(--color-primary)" stroke-width="1.5" class="chart-bar-rect"/>
                <rect x="265" y="40" width="30" height="130" rx="4" fill="var(--color-primary-light)" stroke="var(--color-primary)" stroke-width="1.5" class="chart-bar-rect"/>
                <rect x="335" y="30" width="30" height="140" rx="4" fill="var(--color-primary-light)" stroke="var(--color-primary)" stroke-width="1.5" class="chart-bar-rect"/>
                <rect x="415" y="15" width="30" height="155" rx="4" fill="var(--color-primary)" class="chart-bar-rect"/>
                <!-- Labels -->
                <text x="70" y="190" fill="var(--color-text-muted)" font-size="10" text-anchor="middle">Jan</text>
                <text x="140" y="190" fill="var(--color-text-muted)" font-size="10" text-anchor="middle">Fev</text>
                <text x="210" y="190" fill="var(--color-text-muted)" font-size="10" text-anchor="middle">Mar</text>
                <text x="280" y="190" fill="var(--color-text-muted)" font-size="10" text-anchor="middle">Abr</text>
                <text x="350" y="190" fill="var(--color-text-muted)" font-size="10" text-anchor="middle">Mai</text>
                <text x="430" y="190" fill="var(--color-text-muted)" font-size="10" text-anchor="middle">Jun</text>
            </svg>
        `;
    }
}
// Moderação de ONGs e Empresas
function renderAdminPendingUsers() {
    const tbody = document.getElementById("admin-pending-users-tbody");
    if (!tbody) return;
    const users = store.get("ps_demo_users", []);
    const pending = users.filter(u => u.status === "pending" && (u.role === "ong" || u.role === "company"));
    if (!pending.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Nenhum cadastro pendente de moderação no momento.</td></tr>';
        return;
    }
    tbody.innerHTML = pending.map(u => `
        <tr>
            <td><strong>${u.name}</strong></td>
            <td><span class="user-role-badge" style="font-size:0.75rem;">${roleLabel(u.role)}</span></td>
            <td>${u.cnpj || u.document || "-"}</td>
            <td>${u.responsible_name || "-"}</td>
            <td>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-success btn-sm" onclick="approveUser(${u.id})"><i data-lucide="check" style="width:14px; height:14px;"></i> Aprovar</button>
                    <button class="btn btn-danger btn-sm" onclick="rejectUser(${u.id})"><i data-lucide="x" style="width:14px; height:14px;"></i> Rejeitar</button>
                </div>
            </td>
        </tr>
    `).join("");
    if (window.lucide) lucide.createIcons();
}
function approveUser(id) {
    const users = store.get("ps_demo_users", []);
    const user = users.find(u => u.id === id);
    if (user) {
        user.status = "approved";
        store.set("ps_demo_users", users);
        renderAdminPendingUsers();
        renderAdminDashboardStats();
        showToast(`Cadastro de "${user.name}" aprovado com sucesso!`);
    }
}
function rejectUser(id) {
    let users = store.get("ps_demo_users", []);
    const user = users.find(u => u.id === id);
    if (user) {
        users = users.filter(u => u.id !== id);
        store.set("ps_demo_users", users);
        renderAdminPendingUsers();
        renderAdminDashboardStats();
        showToast(`Cadastro de "${user.name}" rejeitado.`, "info");
    }
}
// Moderação de Campanhas
function renderAdminCampaignsModeration() {
    const tbody = document.getElementById("admin-campaigns-moderation-tbody");
    if (!tbody) return;
    const campaigns = store.get("ps_demo_campaigns", []);
    tbody.innerHTML = campaigns.map(c => `
        <tr>
            <td><strong>${c.title}</strong></td>
            <td>${c.ong_name}</td>
            <td>${c.type}</td>
            <td>Meta: ${c.target} | Arrecadado: ${c.current}</td>
            <td>
                <span class="badge-status status-active" style="background:${c.status === 'active' ? 'rgba(31,166,94,0.1)' : 'var(--color-border)'}; color:${c.status === 'active' ? 'var(--color-success)' : 'var(--color-text-muted)'}">
                    ${c.status === "active" ? "Ativa" : "Encerrada"}
                </span>
            </td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="toggleCampaignStatus(${c.id})">
                    ${c.status === "active" ? "Finalizar" : "Reativar"}
                </button>
            </td>
        </tr>
    `).join("");
}
function toggleCampaignStatus(id) {
    const campaigns = store.get("ps_demo_campaigns", []);
    const c = campaigns.find(item => item.id === id);
    if (c) {
        c.status = (c.status === "active") ? "closed" : "active";
        store.set("ps_demo_campaigns", campaigns);
        renderAdminCampaignsModeration();
        loadPublicData();
        showToast(`Status da campanha "${c.title}" alterado.`);
    }
}
// Gerenciamento de Denúncias
function renderAdminComplaints() {
    const list = document.getElementById("admin-complaints-list");
    if (!list) return;
    // Banco de dados em localStorage de denúncias demo
    if (!localStorage.getItem("ps_demo_complaints")) {
        const complaintsDemo = [
            { id: 1, type: "Perfil Suspicioso", target: "Família Silva", text: "Endereço repetido no cadastro de outro usuário.", date: "18/06/2026" },
            { id: 2, type: "Doação Danificada", target: "Roberto Souza", text: "Reportado que casaco de lã infantil estava rasgado.", date: "17/06/2026" }
        ];
        store.set("ps_demo_complaints", complaintsDemo);
    }
    const complaints = store.get("ps_demo_complaints", []);
    if (!complaints.length) {
        list.innerHTML = '<li class="text-muted text-center py-3">Nenhuma denúncia ou alerta registrado hoje.</li>';
        return;
    }
    list.innerHTML = complaints.map(c => `
        <li style="border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 16px; margin-bottom: 12px; list-style: none;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="badge-status" style="background:rgba(239,68,68,0.1); color:var(--color-danger); font-size: 0.75rem;">${c.type}</span>
                <span class="text-muted" style="font-size:0.75rem;">${c.date}</span>
            </div>
            <p style="margin: 8px 0; font-size:0.88rem;"><strong>Alvo:</strong> ${c.target} - ${c.text}</p>
            <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button class="btn btn-secondary btn-sm" onclick="dismissComplaint(${c.id})">Descartar</button>
                <button class="btn btn-danger btn-sm" onclick="resolveComplaint(${c.id}, '${c.target}')">Suspender Alvo</button>
            </div>
        </li>
    `).join("");
}
function dismissComplaint(id) {
    let complaints = store.get("ps_demo_complaints", []);
    complaints = complaints.filter(c => c.id !== id);
    store.set("ps_demo_complaints", complaints);
    renderAdminComplaints();
    showToast("Denúncia descartada sem penalidades.");
}
function resolveComplaint(id, name) {
    let complaints = store.get("ps_demo_complaints", []);
    complaints = complaints.filter(c => c.id !== id);
    store.set("ps_demo_complaints", complaints);
    
    // Simula advertência
    renderAdminComplaints();
    showToast(`O usuário "${name}" foi sinalizado e notificado para esclarecimento.`, "warning");
}
// Renderiza a triagem de insumos doadores/empresas
function renderAdminDonationsTriagem() {
    const tbody = document.getElementById("admin-donations-triagem-tbody");
    if (!tbody) return;
    const physical = store.get("ps_demo_physical_donations", []);
    const company = store.get("ps_demo_company_donations", []);
    const allItems = [
        ...physical.map(d => ({ ...d, origin: "Doador", donor: d.donor_name, item: d.item_name, qty: d.qty, category: d.category, schedule: d.address, id: d.id, type: 'physical' })),
        ...company.map(d => ({ ...d, origin: "Empresa", donor: d.company_name, item: d.item_name, qty: d.qty, category: d.category, schedule: `${d.pickup_date} ${d.pickup_time}`, id: d.id, type: 'company' }))
    ].filter(d => d.status === "Aguardando Coleta");
    if (!allItems.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Nenhum item aguardando triagem neste momento.</td></tr>';
        return;
    }
    tbody.innerHTML = allItems.map(d => `
        <tr>
            <td><strong>${d.origin}</strong></td>
            <td>${d.donor}</td>
            <td>${d.item}</td>
            <td>${d.qty}</td>
            <td>${d.category}</td>
            <td>${d.schedule}</td>
            <td>
                <button class="btn btn-success btn-sm" onclick="triageApprove('${d.type}', ${d.id})">Validar</button>
            </td>
        </tr>
    `).join("");
}
function triageApprove(type, id) {
    let matchingItem;
    if (type === 'physical') {
        const items = store.get("ps_demo_physical_donations", []);
        matchingItem = items.find(i => i.id === id);
        if (matchingItem) { 
            matchingItem.status = "Em Estoque"; 
            store.set("ps_demo_physical_donations", items); 
        }
    } else {
        const items = store.get("ps_demo_company_donations", []);
        matchingItem = items.find(i => i.id === id);
        if (matchingItem) { 
            matchingItem.status = "Coletado"; 
            store.set("ps_demo_company_donations", items); 
        }
    }
    const cat = matchingItem?.category || "Alimentos";
    const stock = store.get("ps_demo_stock", {});
    stock[cat] = (stock[cat] || 0) + 10;
    store.set("ps_demo_stock", stock);
    renderAdminDonationsTriagem();
    renderAdminStock();
    loadPublicData();
    showToast("Item validado e adicionado ao estoque geral da ONG!");
}
// Renders requests matches/distribution
function renderAdminRequestsDistribution() {
    const tbody = document.getElementById("admin-requests-distribution-tbody");
    if (!tbody) return;
    const requests = store.get("ps_demo_requests", []);
    const active = requests.filter(r => r.status === "active");
    if (!active.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Nenhuma solicitação de ajuda familiar ativa.</td></tr>';
        return;
    }
    tbody.innerHTML = active.map(r => `
        <tr>
            <td><strong>${r.family_name}</strong></td>
            <td>${r.city}</td>
            <td>${r.type}</td>
            <td>${r.family_size} membros</td>
            <td>${r.created_at}</td>
            <td><span class="badge-status" style="background:rgba(31,166,94,0.1);color:var(--color-success)">Ativo</span></td>
            <td><button class="btn btn-success btn-sm" onclick="distributeToRequest(${r.id})">Atender Pedido</button></td>
        </tr>
    `).join("");
}
function distributeToRequest(id) {
    const requests = store.get("ps_demo_requests", []);
    const req = requests.find(r => r.id === id);
    if (req) {
        // Reduz o estoque se possível
        const stock = store.get("ps_demo_stock", {});
        const cat = req.type;
        if (stock[cat] && stock[cat] >= 5) {
            stock[cat] -= 5;
            store.set("ps_demo_stock", stock);
        }
        req.status = "completed";
        store.set("ps_demo_requests", requests);
        
        renderAdminRequestsDistribution();
        renderAdminStock();
        loadPublicData();
        showToast(`Pedido da ${req.family_name} foi atendido! Estoque atualizado.`);
    }
}
// Renders stock lists
function renderAdminStock() {
    const tbody = document.getElementById("admin-stock-tbody");
    if (!tbody) return;
    const stock = store.get("ps_demo_stock", {});
    const categories = ["Alimentos", "Roupas", "Higiene", "Móveis"];
    tbody.innerHTML = categories.map(cat => {
        const qty = stock[cat] || 0;
        const status = qty > 50 ? "Bom" : qty > 10 ? "Médio" : "Crítico";
        const color = qty > 50 ? "var(--color-success)" : qty > 10 ? "var(--color-warning)" : "var(--color-danger)";
        return `
            <tr>
                <td><strong>${cat}</strong></td>
                <td>${qty} unidades</td>
                <td>${new Date().toLocaleDateString('pt-BR')}</td>
                <td><span class="badge-status" style="background:rgba(31,166,94,0.1);color:${color}">${status}</span></td>
            </tr>
        `;
    }).join("");
    // Update progress bars
    updateStockPercentageUI("stock-pct-alimentos", "stock-bar-alimentos", stock.Alimentos || 0);
    updateStockPercentageUI("stock-pct-roupas", "stock-bar-roupas", stock.Roupas || 0);
    updateStockPercentageUI("stock-pct-higiene", "stock-bar-higiene", stock.Higiene || 0);
}
function updateStockPercentageUI(pctId, barId, qty) {
    const pct = Math.min(Math.round(qty / 200 * 100), 100);
    const pctEl = document.getElementById(pctId);
    const barEl = document.getElementById(barId);
    if (pctEl) pctEl.textContent = `${pct}% da capacidade`;
    if (barEl) barEl.style.width = `${pct}%`;
}
// Renderiza produtos à venda no Brechó do admin
function renderAdminBrechoProducts() {
    const tbody = document.getElementById("admin-brecho-products-tbody");
    if (!tbody) return;
    const products = store.get("ps_demo_brecho_products", []);
    if (!products.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Nenhum produto cadastrado no Brechó Solidário.</td></tr>';
        return;
    }
    tbody.innerHTML = products.map(p => `
        <tr>
            <td><strong>${p.title}</strong></td>
            <td>R$ ${p.price.toFixed(2)}</td>
            <td>${p.category}</td>
            <td>${p.desc}</td>
            <td><button class="btn btn-danger btn-sm" onclick="adminDeleteBrechoProduct(${p.id})"><i data-lucide="trash" style="width:14px; height:14px;"></i> Remover</button></td>
        </tr>
    `).join("");
    if (window.lucide) lucide.createIcons();
}
function adminDeleteBrechoProduct(id) {
    let products = store.get("ps_demo_brecho_products", []);
    const product = products.find(p => p.id === id);
    if (product) {
        products = products.filter(p => p.id !== id);
        store.set("ps_demo_brecho_products", products);
        renderAdminBrechoProducts();
        renderBrechoProducts();
        showToast(`Produto "${product.title}" removido com sucesso.`, "info");
    }
}
// SIMULADOR LOGÍSTICO (TCC)
function populateLogisticsSelect() {
    const select = document.getElementById("logistics-select-item");
    if (!select) return;
    const physical = store.get("ps_demo_physical_donations", []);
    const company = store.get("ps_demo_company_donations", []);
    const all = [
        ...physical.map(d => ({ id: d.id, name: d.item_name, donor: d.donor_name, type: 'physical' })),
        ...company.map(d => ({ id: d.id, name: d.item_name, donor: d.company_name, type: 'company' }))
    ];
    select.innerHTML = '<option value="">-- Selecione um Insumo --</option>' + 
        all.map(d => `<option value="${d.type}-${d.id}">${d.name} (${d.donor})</option>`).join("");
}
const logisticsStepMap = new Map();
function updateLogisticsSimulator() {
    const select = document.getElementById("logistics-select-item");
    const val = select?.value;
    const actions = document.getElementById("logistics-simulator-actions");
    if (!val) {
        if (actions) actions.style.display = "none";
        return;
    }
    if (!logisticsStepMap.has(val)) {
        logisticsStepMap.set(val, 1);
    }
    const step = logisticsStepMap.get(val);
    updateLogisticsUI(step, val);
    if (actions) actions.style.display = "block";
}
function advanceLogisticsFlow() {
    const select = document.getElementById("logistics-select-item");
    const val = select?.value;
    if (!val) return;
    let step = logisticsStepMap.get(val) || 1;
    if (step < 6) {
        step++;
        logisticsStepMap.set(val, step);
    }
    // Sincroniza o status da doação correspondente no localStorage para simular atualização em tempo real
    const [type, idStr] = val.split("-");
    const id = Number(idStr);
    const steps = ["Aguardando Coleta", "Validado pela ONG", "Em Estoque", "Match com Família", "Em Rota de Entrega", "Entregue"];
    const statusText = steps[step - 1];
    if (type === "physical") {
        const list = store.get("ps_demo_physical_donations", []);
        const item = list.find(d => d.id === id);
        if (item) {
            item.status = statusText;
            store.set("ps_demo_physical_donations", list);
        }
    } else {
        const list = store.get("ps_demo_company_donations", []);
        const item = list.find(d => d.id === id);
        if (item) {
            item.status = statusText;
            store.set("ps_demo_company_donations", list);
        }
    }
    updateLogisticsUI(step, val);
    loadPublicData(); // Recarrega visões do doador / transparência
}
function updateLogisticsUI(step, val) {
    const stepEls = document.querySelectorAll(".timeline-step");
    const lines = document.querySelectorAll(".timeline-line");
    const statusTitle = document.getElementById("logistics-current-status-title");
    const statusDesc = document.getElementById("logistics-current-status-desc");
    const advanceBtn = document.getElementById("logistics-advance-btn");
    stepEls.forEach((el, i) => {
        const idx = i + 1;
        el.classList.toggle("active", idx === step);
        el.classList.toggle("completed", idx < step);
    });
    lines.forEach((el, i) => {
        const idx = i + 1;
        el.classList.toggle("completed", idx < step);
    });
    const steps = ["Registrado", "Validado pela ONG", "Em Estoque", "Match com Família", "Em Rota de Entrega", "Entregue"];
    const descs = [
        "Aguardando validação da ONG.",
        "ONG aprovou os detalhes e agendou a coleta do insumo.",
        "Item coletado pelo transporte voluntário e adicionado ao estoque central.",
        "Insumo associado a uma necessidade específica de uma família cadastrada.",
        "Item saiu do estoque e está em rota de entrega.",
        "A família beneficiária recebeu os itens e confirmou a entrega no sistema."
    ];
    if (statusTitle) statusTitle.textContent = `Status: ${steps[step - 1]}`;
    if (statusDesc) statusDesc.textContent = descs[step - 1] || "";
    
    if (advanceBtn) {
        advanceBtn.textContent = step >= 6 ? "Entrega Concluída" : "Avançar Fluxo Logístico (Próximo Passo) →";
        advanceBtn.disabled = step >= 6;
    }
}
// Exporta funções para o escopo global
window.updateLogisticsSimulator = updateLogisticsSimulator;
window.advanceLogisticsFlow = advanceLogisticsFlow;
