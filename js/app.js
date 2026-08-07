


/* ========================================================
   PONTE SOLIDÁRIA - ADMINISTRATION, MODERATION & SVG CHARTS
   ======================================================== */

// Painel principal de administração
function renderAdminPanel() {
    const currentUser = typeof appState !== "undefined" ? appState.user : null;
    const isAdmin = currentUser && (currentUser.role === "admin" || currentUser.role === "ong");
    if (!isAdmin) return;

    // Validação de segurança: previne erros se os componentes estruturais do Admin não existirem na página atual
    if (!document.getElementById("admin-growth-chart") && !document.getElementById("admin-bars-chart")) {
        console.warn("Elementos visuais do painel administrativo não encontrados no DOM. Ignorando renderização.");
        return;
    }

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
    if (window.lucide) window.lucide.createIcons();
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
                <line x1="40" y1="20" x2="480" y2="20" stroke="var(--color-border)" stroke-dasharray="3,3"/>
                <line x1="40" y1="75" x2="480" y2="75" stroke="var(--color-border)" stroke-dasharray="3,3"/>
                <line x1="40" y1="130" x2="480" y2="130" stroke="var(--color-border)" stroke-dasharray="3,3"/>
                <line x1="40" y1="170" x2="480" y2="170" stroke="var(--color-border)"/>
                <path d="M 40 170 L 40 140 Q 120 120 200 90 T 360 50 L 480 30 L 480 170 Z" fill="url(#growthGrad)"/>
                
                <path d="M 40 140 Q 120 120 200 90 T 360 50 L 480 30" fill="none" stroke="var(--color-primary)" stroke-width="3" stroke-linecap="round"/>
                
                <circle cx="40" cy="140" r="5" fill="var(--color-primary)" class="chart-dot" title="Jan: 800"/>
                <circle cx="120" cy="125" r="5" fill="var(--color-primary)" class="chart-dot" title="Fev: 1200"/>
                <circle cx="200" cy="90" r="5" fill="var(--color-primary)" class="chart-dot" title="Mar: 1800"/>
                <circle cx="280" cy="80" r="5" fill="var(--color-primary)" class="chart-dot" title="Abr: 2100"/>
                <circle cx="360" cy="50" r="5" fill="var(--color-primary)" class="chart-dot" title="Mai: 3200"/>
                <circle cx="480" cy="30" r="5" fill="var(--color-primary)" class="chart-dot" title="Jun: 4100"/>
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
                <line x1="40" y1="20" x2="480" y2="20" stroke="var(--color-border)" stroke-dasharray="3,3"/>
                <line x1="40" y1="95" x2="480" y2="95" stroke="var(--color-border)" stroke-dasharray="3,3"/>
                <line x1="40" y1="170" x2="480" y2="170" stroke="var(--color-border)"/>
                <rect x="55" y="100" width="30" height="70" rx="4" fill="var(--color-primary-light)" stroke="var(--color-primary)" stroke-width="1.5" class="chart-bar-rect"/>
                <rect x="125" y="80" width="30" height="90" rx="4" fill="var(--color-primary-light)" stroke="var(--color-primary)" stroke-width="1.5" class="chart-bar-rect"/>
                <rect x="195" y="60" width="30" height="110" rx="4" fill="var(--color-primary-light)" stroke="var(--color-primary)" stroke-width="1.5" class="chart-bar-rect"/>
                <rect x="265" y="40" width="30" height="130" rx="4" fill="var(--color-primary-light)" stroke="var(--color-primary)" stroke-width="1.5" class="chart-bar-rect"/>
                <rect x="335" y="30" width="30" height="140" rx="4" fill="var(--color-primary-light)" stroke="var(--color-primary)" stroke-width="1.5" class="chart-bar-rect"/>
                <rect x="415" y="15" width="30" height="155" rx="4" fill="var(--color-primary)" class="chart-bar-rect"/>
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

// Rótulo legível para cada tipo de conta (Pessoa / ONG / Administrador),
// com aliases para nomes de perfil antigos que possam existir em dados salvos.
function roleLabel(role) {
    const labels = {
        person: "Pessoa",
        ong: "ONG / Instituição",
        admin: "Administrador",
        company: "Empresa parceira",
        common: "Pessoa",
        donor: "Pessoa",
        recipient: "Pessoa",
        beneficiary: "Pessoa",
        institution: "ONG / Instituição"
    };
    return labels[role] || "Usuário";
}

// Moderação de ONGs (Fase 1 — 07/ago/2026): a moderação real de ONGs
// (aprovar/rejeitar via Firestore, com os campos "approved"/"blocked")
// mora exclusivamente em js/admin.js agora. Havia aqui uma segunda cópia
// dessas três funções (renderAdminPendingUsers/approveUser/rejectUser)
// que só mexia em localStorage — como este arquivo é carregado depois de
// admin.js, essa cópia sobrescrevia a versão real e a aprovação de ONG
// nunca chegava ao banco. Removida para não haver mais duas fontes de
// verdade; nenhuma tela ficou sem funcionamento porque os IDs dos botões
// (admin-pending-users-tbody) e as chamadas (approveUser/rejectUser) são
// as mesmas — agora resolvidas pela única implementação restante.

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

// Declaração segura do mapa logístico para evitar erro de re-declaração global
if (typeof logisticsStepMap === 'undefined') {
    window.logisticsStepMap = new Map();
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
    if (typeof loadPublicData === "function") loadPublicData();
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
        if (typeof loadPublicData === "function") loadPublicData();
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
    
    // Update progress bars (Protegido contra elementos ausentes no DOM atual)
    if (document.getElementById("stock-bar-alimentos") || document.getElementById("stock-pct-alimentos")) {
        updateStockPercentageUI("stock-pct-alimentos", "stock-bar-alimentos", stock.Alimentos || 0);
        updateStockPercentageUI("stock-pct-roupas", "stock-bar-roupas", stock.Roupas || 0);
        updateStockPercentageUI("stock-pct-higiene", "stock-bar-higiene", stock.Higiene || 0);
    }
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
            <td><strong>${p.name || p.title}</strong></td>
            <td>R$ ${p.price.toFixed(2)}</td>
            <td>${p.category}</td>
            <td>${p.description || p.desc}</td>
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
        if (typeof renderBrechoProducts === "function") renderBrechoProducts();
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
        ...company.map(d => ({ id: d.id, name: d.company_name, donor: d.company_name, type: 'company' }))
    ];
    select.innerHTML = '<option value="">-- Selecione um Insumo --</option>' + 
        all.map(d => `<option value="${d.type}-${d.id}">${d.name} (${d.donor})</option>`).join("");
}

// Inicialização e vinculação segura do mapa logístico ao escopo global
if (typeof logisticsStepMap === 'undefined') {
    window.logisticsStepMap = new Map();
}

function updateLogisticsSimulator() {
    const select = document.getElementById("logistics-select-item");
    const val = select?.value;
    const actions = document.getElementById("logistics-simulator-actions");
    if (!val) {
        if (actions) actions.style.display = "none";
        return;
    }
    if (!window.logisticsStepMap.has(val)) {
        window.logisticsStepMap.set(val, 1);
    }
    const step = window.logisticsStepMap.get(val);
    updateLogisticsUI(step, val);
    if (actions) actions.style.display = "block";
}

function advanceLogisticsFlow() {
    const select = document.getElementById("logistics-select-item");
    const val = select?.value;
    if (!val) return;
    let step = window.logisticsStepMap.get(val) || 1;
    if (step < 6) {
        step++;
        window.logisticsStepMap.set(val, step);
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
    if (typeof loadPublicData === "function") loadPublicData(); // Recarrega visões do doador / transparência
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

// Exporta funções para o escopo global com segurança
window.updateLogisticsSimulator = updateLogisticsSimulator;
window.advanceLogisticsFlow = advanceLogisticsFlow;

// Controle de navegação das abas em Doações
document.addEventListener("click", (e) => {
  const button = e.target.closest(".donations-tabs .tab-btn");
  if (!button) return;

  const targetId = button.getAttribute("data-tab");
  const activeContent = document.getElementById(targetId);
  if (!targetId || !activeContent) return;
  const tabButtons = document.querySelectorAll(".donations-tabs .tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  // Remove a classe ativa de todos os botões e abas
  tabButtons.forEach(btn => {
    btn.classList.remove("active");
    btn.setAttribute("aria-selected", "false");
  });
  tabContents.forEach(content => content.classList.remove("active"));

  // Ativa o botão clicado e o conteúdo correspondente
  button.classList.add("active");
  button.setAttribute("aria-selected", "true");
  activeContent.classList.add("active");
});
// Lógica do Brechó e Sacola Atualizada
let sacola = [];

function adicionarAoCarrinho(nome, preco) {
    const price = Number(preco);
    if (!nome || !Number.isFinite(price) || price <= 0) return;
    sacola.push({ nome, preco: price });
    atualizarSacola();
    if (typeof showToast === "function") showToast(`${nome} foi adicionado à sacola.`);
}

function atualizarSacola() {
    const listaUl = document.getElementById('itens-sacola');
    const totalSpan = document.getElementById('total-sacola');
    const countSpan = document.getElementById('cart-count');
    const msgVazia = document.getElementById('sacola-vazia');

    if (!listaUl || !totalSpan) return;

    if (countSpan) countSpan.innerText = `${sacola.length} ${sacola.length === 1 ? 'item' : 'itens'}`;

    if (sacola.length === 0) {
        if (msgVazia) msgVazia.style.display = 'block';
        listaUl.innerHTML = '';
        totalSpan.innerText = 'R$ 0,00';
        return;
    }

    if (msgVazia) msgVazia.style.display = 'none';

    let total = 0;
    listaUl.innerHTML = sacola.map((item, index) => {
        total += item.preco;
        return `
            <li class="cart-item">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.nome}</div>
                    <div class="cart-item-price-qty">
                        <span>R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
                        <button class="remove-item-btn" onclick="removerDoCarrinho(${index})">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                </div>
            </li>
        `;
    }).join('');

    totalSpan.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
    if (window.lucide) {
        lucide.createIcons();
    }
}

function removerDoCarrinho(index) {
    sacola.splice(index, 1);
    atualizarSacola();
}

function finalizarPagamento() {
    if (sacola.length === 0) {
        alert("Sua sacola está vazia!");
        return;
    }
    const total = sacola.reduce((acc, item) => acc + item.preco, 0);
    alert(`Obrigado pela compra solidária!\nTotal: R$ ${total.toFixed(2).replace('.', ',')}`);
    sacola = [];
    atualizarSacola();
}
// Função para o Botão do Olho (Alto Contraste para Acessibilidade)
const BRECHO_MAX_PRICE = 100;
const BRECHO_SEED_PRODUCTS = [
    { id: "seed-jaqueta", name: "Jaqueta Jeans Vintage", description: "Tamanho M, excelente estado de conservação.", price: 45, contact: "contato@pontesolidaria.org", category: "Roupas", seller_name: "Ponte Solidária", seller_id: "seed" },
    { id: "seed-tenis", name: "Tênis Esportivo", description: "Tamanho 40, pouco usado e confortável.", price: 60, contact: "contato@pontesolidaria.org", category: "Calçados", seller_name: "Ponte Solidária", seller_id: "seed" },
    { id: "seed-livros", name: "Kit Leitura Solidária", description: "Três livros em ótimo estado para renovar sua estante.", price: 30, contact: "contato@pontesolidaria.org", category: "Livros", seller_name: "Ponte Solidária", seller_id: "seed" }
];

function getBrechoProducts() {
    const products = store.get("ps_demo_brecho_products", []);
    if (products.length) return products;
    store.set("ps_demo_brecho_products", BRECHO_SEED_PRODUCTS);
    return BRECHO_SEED_PRODUCTS;
}

function escapeBrechoHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function renderBrechoProducts(searchTerm = "") {
    const grid = document.getElementById("brecho-products-grid");
    if (!grid) return;
    const query = String(searchTerm).trim().toLocaleLowerCase("pt-BR");
    const products = getBrechoProducts().filter((product) => product.name.toLocaleLowerCase("pt-BR").includes(query));

    if (!products.length) {
        grid.innerHTML = `<div class="brecho-empty-state"><i data-lucide="search-x"></i><p>Nenhum produto encontrado. Tente outro nome ou anuncie um item.</p></div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    grid.innerHTML = products.map((product) => `
        <article class="product-card">
            <div class="product-img-wrapper">${product.image ? `<img src="${escapeBrechoHtml(product.image)}" alt="${escapeBrechoHtml(product.name)}">` : ""}<span class="product-badge-category">${escapeBrechoHtml(product.category)}</span><i data-lucide="shopping-bag" style="position:absolute; right:18px; bottom:18px; z-index:2; color:#fff; width:32px; height:32px;"></i></div>
            <div class="product-info">
                <p class="product-seller">Vendido por ${escapeBrechoHtml(product.seller_name || "Comunidade")}</p>
                <h4 class="product-title">${escapeBrechoHtml(product.name)}</h4>
                <p class="product-desc">${escapeBrechoHtml(product.description)}</p>
                <p class="product-contact"><i data-lucide="contact"></i> ${escapeBrechoHtml(product.contact)}</p>
                <div class="product-price-row"><span class="product-price">R$ ${Number(product.price).toFixed(2).replace(".", ",")}</span><button class="btn btn-primary btn-sm" type="button" onclick="adicionarAoCarrinho('${product.id}')"><i data-lucide="plus"></i> Adicionar</button></div>
            </div>
        </article>`).join("");
    if (window.lucide) window.lucide.createIcons();
}

// Prévia do Brechó Solidário na Home — reaproveita getBrechoProducts() (mesma
// fonte de dados da grade completa do Brechó) e a marcação .product-card já
// estilizada em css/sections/brecho.css, mostrando só os itens mais recentes.
function renderHomeBrechoPreview() {
    const grid = document.getElementById("home-brecho-grid");
    if (!grid) return;
    const products = getBrechoProducts().slice(0, 3);

    if (!products.length) {
        grid.innerHTML = `<div class="brecho-empty-state"><i data-lucide="shopping-bag"></i><p>Nenhum item publicado no Brechó ainda.</p></div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    grid.innerHTML = products.map((product) => `
        <article class="product-card">
            <div class="product-img-wrapper">${product.image ? `<img src="${escapeBrechoHtml(product.image)}" alt="${escapeBrechoHtml(product.name)}">` : ""}<span class="product-badge-category">${escapeBrechoHtml(product.category)}</span></div>
            <div class="product-info">
                <p class="product-seller">Vendido por ${escapeBrechoHtml(product.seller_name || "Comunidade")}</p>
                <h4 class="product-title">${escapeBrechoHtml(product.name)}</h4>
                <p class="product-desc">${escapeBrechoHtml(product.description)}</p>
                <div class="product-price-row"><span class="product-price">R$ ${Number(product.price).toFixed(2).replace(".", ",")}</span><button class="btn btn-primary btn-sm" type="button" onclick="document.getElementById('nav-brecho').click();"><i data-lucide="shopping-bag"></i> Ver no Brechó</button></div>
            </div>
        </article>`).join("");
    if (window.lucide) window.lucide.createIcons();
}
window.renderHomeBrechoPreview = renderHomeBrechoPreview;
document.addEventListener("includesLoaded", renderHomeBrechoPreview);

function renderBrechoSellerNotifications() {
    const container = document.getElementById("brecho-seller-notifications");
    const user = typeof appState !== "undefined" ? appState.user : null;
    if (!container || !user) return;
    const notifications = store.get("ps_demo_brecho_notifications", []).filter((notification) => notification.seller_id === user.id).slice(0, 3);
    container.innerHTML = notifications.map((notification) => `<div class="seller-notification-item"><strong>Venda realizada!</strong><br>${escapeBrechoHtml(notification.text)}</div>`).join("");
}

function setupBrechoSystem() {
    const form = document.getElementById("brecho-product-form");
    const search = document.getElementById("brecho-search");
    const sellerPanel = document.getElementById("brecho-seller-panel");
    const openSellerForm = document.getElementById("open-brecho-seller-form");
    const closeSellerForm = document.getElementById("close-brecho-seller-form");
    if (!form || form.dataset.ready === "true") return;
    form.dataset.ready = "true";
    renderBrechoProducts();
    renderBrechoSellerNotifications();

    search?.addEventListener("input", () => renderBrechoProducts(search.value));
    openSellerForm?.addEventListener("click", () => {
        sellerPanel?.classList.remove("hidden");
        sellerPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
        document.getElementById("brecho-product-name")?.focus();
    });
    closeSellerForm?.addEventListener("click", () => sellerPanel?.classList.add("hidden"));
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const user = typeof appState !== "undefined" ? appState.user : null;
        if (!user) {
            if (typeof showToast === "function") showToast("Entre na sua conta para publicar um item.", "warning");
            return;
        }

        const name = document.getElementById("brecho-product-name")?.value.trim();
        const description = document.getElementById("brecho-product-description")?.value.trim();
        const contact = document.getElementById("brecho-product-contact")?.value.trim();
        const category = document.getElementById("brecho-product-category")?.value || "Outros";
        const price = Number(document.getElementById("brecho-product-price")?.value);
        const imageFile = document.getElementById("brecho-product-image")?.files?.[0];
        if (!name || !description || !contact || !Number.isFinite(price) || price < 1 || price > BRECHO_MAX_PRICE) {
            if (typeof showToast === "function") showToast("Preencha os campos e informe um preço entre R$ 1,00 e R$ 100,00.", "warning");
            return;
        }
        if (!imageFile || !/^image\/(png|jpeg|webp)$/.test(imageFile.type) || imageFile.size > 2 * 1024 * 1024) {
            if (typeof showToast === "function") showToast("Envie uma foto PNG, JPG ou WEBP de até 2 MB.", "warning");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const products = getBrechoProducts();
            products.unshift({ id: `brecho-${Date.now()}`, name, description, contact, category, price, image: reader.result, seller_id: user.id, seller_name: user.name, created_at: new Date().toISOString() });
            store.set("ps_demo_brecho_products", products);
            form.reset();
            sellerPanel?.classList.add("hidden");
            if (search) search.value = "";
            renderBrechoProducts();
            if (typeof showToast === "function") showToast("Item publicado no Brechó Solidário.");
            document.getElementById("brecho-products-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
        };
        reader.readAsDataURL(imageFile);
    });
}

function adicionarAoCarrinho(productId, legacyPrice) {
    const product = typeof legacyPrice === "number"
        ? { id: `legacy-${Date.now()}`, name: productId, price: legacyPrice, seller_id: "seed", seller_name: "Ponte Solidária" }
        : getBrechoProducts().find((item) => item.id === productId);
    if (!product) return;
    sacola.push({ id: product.id, nome: product.name, preco: Number(product.price), seller_id: product.seller_id, seller_name: product.seller_name });
    atualizarSacola();
    if (typeof showToast === "function") showToast(`${product.name} foi adicionado à sacola.`);
}

function atualizarSacola() {
    const listaUl = document.getElementById("itens-sacola");
    const totalSpan = document.getElementById("total-sacola");
    const countSpan = document.getElementById("cart-count");
    const msgVazia = document.getElementById("sacola-vazia");
    if (!listaUl || !totalSpan) return;
    if (countSpan) countSpan.innerText = `${sacola.length} ${sacola.length === 1 ? "item" : "itens"}`;
    if (!sacola.length) { if (msgVazia) msgVazia.style.display = "block"; listaUl.innerHTML = ""; totalSpan.innerText = "R$ 0,00"; return; }
    if (msgVazia) msgVazia.style.display = "none";
    const total = sacola.reduce((sum, item) => sum + item.preco, 0);
    listaUl.innerHTML = sacola.map((item, index) => `<li class="cart-item"><div class="cart-item-details"><div class="cart-item-title">${escapeBrechoHtml(item.nome)}</div><div class="cart-item-price-qty"><span>R$ ${item.preco.toFixed(2).replace(".", ",")}</span><button class="remove-item-btn" type="button" onclick="removerDoCarrinho(${index})" aria-label="Remover ${escapeBrechoHtml(item.nome)}"><i data-lucide="trash-2"></i></button></div></div></li>`).join("");
    totalSpan.innerText = `R$ ${total.toFixed(2).replace(".", ",")}`;
    if (window.lucide) window.lucide.createIcons();
}

function removerDoCarrinho(index) { sacola.splice(index, 1); atualizarSacola(); }

function finalizarPagamento() {
    if (!sacola.length) { if (typeof showToast === "function") showToast("Sua sacola está vazia.", "warning"); return; }
    const total = sacola.reduce((sum, item) => sum + item.preco, 0);
    const buyer = typeof appState !== "undefined" ? appState.user : null;
    const notifications = store.get("ps_demo_brecho_notifications", []);
    const headerNotifications = store.get("ps_notifications", []);
    sacola.forEach((item) => {
        if (item.seller_id && item.seller_id !== "seed") {
            const text = `${buyer?.name || "Um comprador"} comprou ${item.nome} por R$ ${item.preco.toFixed(2).replace(".", ",")}.`;
            notifications.unshift({ id: `sale-${Date.now()}-${item.id}`, seller_id: item.seller_id, text, created_at: new Date().toISOString() });
            headerNotifications.unshift({ id: `sale-header-${Date.now()}-${item.id}`, recipient_id: item.seller_id, text, read: false });
        }
    });
    store.set("ps_demo_brecho_notifications", notifications);
    store.set("ps_notifications", headerNotifications);
    store.set("ps_demo_brecho_orders", [...store.get("ps_demo_brecho_orders", []), { id: Date.now(), buyer_id: buyer?.id || null, items: [...sacola], total, created_at: new Date().toISOString() }]);
    sacola = [];
    atualizarSacola();
    renderBrechoSellerNotifications();
    if (typeof showToast === "function") showToast(`Compra concluída! Total: R$ ${total.toFixed(2).replace(".", ",")}. O vendedor foi notificado.`);
}

document.addEventListener("includesLoaded", setupBrechoSystem);
window.renderBrechoProducts = renderBrechoProducts;
window.renderBrechoSellerNotifications = renderBrechoSellerNotifications;

function alternarAltoContraste() {
    document.body.classList.toggle('high-contrast');
    
    // Salva a preferência do usuário no navegador
    const ativo = document.body.classList.contains('high-contrast');
    localStorage.setItem('altoContraste', ativo ? 'true' : 'false');
}

// Restaura a preferência ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('altoContraste') === 'true') {
        document.body.classList.add('high-contrast');
    }
});
// Lógica da Busca e Filtros de Doações
function filtrarPedidos() {
    const textoBusca = document.getElementById('campo-busca')?.value.toLowerCase() || '';
    const categoriaSelecionada = document.getElementById('filtro-categoria')?.value || 'todos';
    const cards = document.querySelectorAll('.card-pedido');
    let visiveis = 0;

    cards.forEach(card => {
        const textoCard = (card.getAttribute('data-busca') || '') + ' ' + card.innerText.toLowerCase();
        const categoriaCard = card.getAttribute('data-categoria') || '';

        const combinaTexto = textoCard.includes(textoBusca);
        const combinaCategoria = (categoriaSelecionada === 'todos') || (categoriaCard === categoriaSelecionada);

        if (combinaTexto && combinaCategoria) {
            card.style.display = 'block';
            visiveis++;
        } else {
            card.style.display = 'none';
        }
    });

    const msgSemResultado = document.getElementById('sem-resultados');
    if (msgSemResultado) {
        msgSemResultado.style.display = (visiveis === 0 && cards.length > 0) ? 'block' : 'none';
    }
}

function abrirMapa() {
    window.open('https://www.google.com/maps/search/pontos+de+doacao+solidaria', '_blank');
}



