/* ========================================================
   PONTE SOLIDÁRIA - DONATIONS, REQUESTS & SHOPPING CART
   ======================================================== */
// Salva solicitação de ajuda familiar (Beneficiário)
async function saveHelpRequest(e) {
    e.preventDefault();
    if (!appState.user) { 
        showToast("Faça login antes de solicitar auxílio.", "danger"); 
        return; 
    }
    
    const payload = {
        id: Date.now(),
        user_id: appState.user.id,
        family_name: appState.user.name,
        type: getFormValue("req-family-type"),
        family_size: Number(getFormValue("req-family-members")) || 1,
        kids: Number(getFormValue("req-family-kids")) || 0,
        elderly: Number(getFormValue("req-family-elderly")) || 0,
        special: getFormValue("req-family-special") || "Nenhuma",
        frequency: getFormValue("req-family-frequency"),
        description: getFormValue("req-family-desc"),
        city: appState.user.address ? appState.user.address.split(",").slice(-2)[0]?.trim() || "São Paulo - SP" : "São Paulo - SP",
        status: "active",
        created_at: new Date().toISOString().slice(0, 10)
    };
    const requests = store.get("ps_demo_requests", []);
    requests.unshift(payload);
    store.set("ps_demo_requests", requests);
    document.getElementById("help-request-form")?.reset();
    updateBasketSuggestion();
    await loadPublicData();
    openTab("active-requests-tab");
    showToast("Solicitação enviada com sucesso! Uma ONG fará a análise.");
}
// Salva doação financeira (PIX ou Cartão)
async function saveFinancialDonation(method) {
    const activeButton = document.querySelector(".val-btn.active");
    const customValue = Number(getFormValue("custom-donation-val"));
    const cardValue = Number(getFormValue("card-value"));
    const amount = customValue || cardValue || Number(activeButton?.dataset.val) || 50;
    const payload = {
        id: Date.now(),
        donor_name: appState.user?.name || "Doador Anônimo",
        type: method,
        amount,
        description: `Doação financeira via ${method}`,
        status: "Entregue",
        created_at: new Date().toISOString().slice(0, 10)
    };
    const donations = store.get("ps_demo_donations", []);
    donations.unshift(payload);
    store.set("ps_demo_donations", donations);
    // Limpa campos
    const customInput = document.getElementById("custom-donation-val");
    if (customInput) customInput.value = "";
    const cardInput = document.getElementById("card-value");
    if (cardInput) cardInput.value = "50";
    
    document.getElementById("card-donation-form")?.reset();
    document.getElementById("pix-qr-container")?.classList.add("hidden");
    await loadPublicData();
    showToast(`Obrigado! Doação de R$ ${amount.toFixed(2)} processada com sucesso. 💙`);
}
// Salva doação física de doador comum
async function saveDonorPhysicalDonation(e) {
    e.preventDefault();
    if (!appState.user) { 
        showToast("Faça login como doador para registrar.", "danger"); 
        return; 
    }
    const payload = {
        id: Date.now(),
        donor_name: appState.user.name,
        item_name: getFormValue("donor-item-name"),
        qty: getFormValue("donor-item-qty"),
        category: getFormValue("donor-item-category"),
        address: getFormValue("donor-item-address") || appState.user.address,
        description: getFormValue("donor-item-desc"),
        status: "Aguardando Coleta",
        created_at: new Date().toISOString().slice(0, 10)
    };
    const physical = store.get("ps_demo_physical_donations", []);
    physical.unshift(payload);
    store.set("ps_demo_physical_donations", physical);
    document.getElementById("donor-item-form")?.reset();
    renderDonorDonations();
    renderAdminPanel();
    
    showToast("Doação de insumos cadastrada! Aguarde o agendamento da ONG.");
}
// Salva excedente de empresa parceira
async function saveCompanySurplusDonation(e) {
    e.preventDefault();
    if (!appState.user) { 
        showToast("Faça login corporativo para cadastrar excedentes.", "danger"); 
        return; 
    }
    const itemName = getFormValue("company-item-name");
    const payload = {
        id: Date.now(),
        company_name: appState.user.name,
        item_name: itemName,
        qty: itemName.match(/\d+\s*(kg|g|l|unidades|cestas|paes|pães|litros)/gi)?.[0] || "1 lote",
        category: getFormValue("company-item-type"),
        status: "Aguardando Coleta",
        created_at: new Date().toISOString().slice(0, 10),
        expiry: getFormValue("company-item-expiry"),
        pickup_date: getFormValue("company-pickup-date"),
        pickup_time: getFormValue("company-pickup-time"),
        description: getFormValue("company-pickup-instructions")
    };
    const company = store.get("ps_demo_company_donations", []);
    company.unshift(payload);
    store.set("ps_demo_company_donations", company);
    document.getElementById("company-surplus-form")?.reset();
    renderCompanyDonations();
    renderAdminPanel();
    showToast("Excedente de estoque cadastrado! Coleta agendada com sucesso.");
}
// RASTREAMENTO E TIMELINE VISUAL
function handleTrackDonation(e) {
    e?.preventDefault();
    const query = document.getElementById("donation-track-search")?.value.trim();
    const resultBox = document.getElementById("tracking-result-box");
    if (!query) {
        showToast("Digite um código de doação válido.", "warning");
        return;
    }
    const physical = store.get("ps_demo_physical_donations", []);
    const company = store.get("ps_demo_company_donations", []);
    
    // Busca pelo ID numérico ou pelo código
    let don = physical.find(d => String(d.id) === query || `DOA-${d.id}` === query);
    if (!don) {
        don = company.find(d => String(d.id) === query || `CORP-${d.id}` === query || `RSE-${d.id}-OK` === query);
    }
    if (!don || !resultBox) {
        showToast("Doação não encontrada. Verifique o código e tente novamente.", "danger");
        if (resultBox) resultBox.classList.add("hidden");
        return;
    }
    // Mapeamento de etapas com base no status da doação
    let currentStep = 1; // 1: Registrado, 2: Validado, 3: Estoque, 4: Match, 5: Em trânsito, 6: Entregue
    const status = don.status;
    if (status === "Aguardando Coleta") {
        currentStep = 1;
    } else if (status === "Validado pela ONG") {
        currentStep = 2;
    } else if (status === "Em Estoque" || status === "Coletado") {
        currentStep = 3;
    } else if (status === "Match com Família") {
        currentStep = 4;
    } else if (status === "Em Rota de Entrega" || status === "Em Transporte") {
        currentStep = 5;
    } else if (status === "Entregue" || status === "Distribuído") {
        currentStep = 6;
    }
    const steps = [
        { title: "Registrado", desc: "A doação foi cadastrada no portal." },
        { title: "Validado pela ONG", desc: "A ONG aprovou e agendou a coleta." },
        { title: "Em Estoque", desc: "Item coletado e disponível em nosso centro." },
        { title: "Match com Família", desc: "Destinado a uma família cadastrada." },
        { title: "Em Rota", desc: "Insumo saiu para transporte." },
        { title: "Entregue", desc: "A família recebeu e confirmou a entrega." }
    ];
    resultBox.classList.remove("hidden");
    resultBox.innerHTML = `
        <div class="tracking-summary">
            <h4>Resultado do Rastreamento para: <strong>${don.item_name}</strong></h4>
            <p><strong>Doador:</strong> ${don.donor_name || don.company_name} | <strong>Categoria:</strong> ${don.category} | <strong>Status Atual:</strong> ${don.status}</p>
        </div>
        <div class="logistics-timeline-visual vertical-timeline">
            ${steps.map((s, idx) => {
                const stepNum = idx + 1;
                const isCompleted = stepNum < currentStep;
                const isActive = stepNum === currentStep;
                const statusClass = isCompleted ? "completed" : (isActive ? "active" : "");
                let icon = "circle";
                if (stepNum === 1) icon = "edit-3";
                if (stepNum === 2) icon = "check-square";
                if (stepNum === 3) icon = "archive";
                if (stepNum === 4) icon = "git-merge";
                if (stepNum === 5) icon = "truck";
                if (stepNum === 6) icon = "smile";
                return `
                    <div class="timeline-step ${statusClass}" data-step="${stepNum}">
                        <div class="step-num"><i data-lucide="${icon}"></i></div>
                        <div class="step-content">
                            <div class="step-label">${s.title}</div>
                            <span class="step-desc">${s.desc}</span>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
    if (window.lucide) lucide.createIcons();
    resultBox.scrollIntoView({ behavior: 'smooth' });
}
// CARRINHO DO BRECHÓ SOLIDÁRIO
function addToCart(productId) {
    const products = store.get("ps_demo_brecho_products", []);
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const existing = cartState.find(i => i.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        cartState.push({ ...product, qty: 1 });
    }
    renderCart();
    showToast(`"${product.title}" adicionado à sacola!`);
}
function removeFromCart(productId) {
    cartState = cartState.filter(i => i.id !== productId);
    renderCart();
}
function renderCart() {
    const container = document.getElementById("cart-items-container");
    const countEl = document.getElementById("cart-count");
    const totalEl = document.getElementById("cart-total-value");
    const checkoutBtn = document.getElementById("checkout-cart-btn");
    if (!container) return;
    if (!cartState.length) {
        container.innerHTML = '<p class="text-muted text-sm text-center py-3">Sua sacola está vazia.</p>';
        if (countEl) countEl.textContent = "0 itens";
        if (totalEl) totalEl.textContent = "R$ 0,00";
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }
    container.innerHTML = cartState.map(i => `
        <div class="cart-item">
            <div class="cart-item-details">
                <div class="cart-item-title">${i.title}</div>
                <div class="cart-item-price-qty" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>R$ ${i.price.toFixed(2)} x ${i.qty}</span>
                    <button class="remove-item-btn" onclick="removeFromCart(${i.id})"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
                </div>
            </div>
        </div>
    `).join("");
    const total = cartState.reduce((sum, i) => sum + i.price * i.qty, 0);
    const count = cartState.reduce((sum, i) => sum + i.qty, 0);
    if (countEl) countEl.textContent = `${count} ${count === 1 ? "item" : "itens"}`;
    if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2)}`;
    if (checkoutBtn) checkoutBtn.disabled = false;
    if (window.lucide) lucide.createIcons();
}
function openBrechoCheckout() {
    if (!cartState.length) { 
        showToast("Sua sacola está vazia!", "warning"); 
        return; 
    }
    const total = cartState.reduce((sum, i) => sum + i.price * i.qty, 0);
    const totalEl = document.getElementById("checkout-total-price");
    if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2)}`;
    
    const checkoutModal = document.getElementById("brecho-checkout-modal");
    if (checkoutModal) {
        checkoutModal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }
}
function confirmBrechoPayment() {
    cartState = [];
    renderCart();
    const checkoutModal = document.getElementById("brecho-checkout-modal");
    if (checkoutModal) {
        checkoutModal.classList.add("hidden");
        document.body.style.overflow = "";
    }
    showToast("Compra confirmada! Muito obrigado por apoiar o Brechó da Ponte Solidária.");
}
// Exporta funções para o escopo global
window.saveHelpRequest = saveHelpRequest;
window.saveFinancialDonation = saveFinancialDonation;
window.saveDonorPhysicalDonation = saveDonorPhysicalDonation;
window.saveCompanySurplusDonation = saveCompanySurplusDonation;
window.handleTrackDonation = handleTrackDonation;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.renderCart = renderCart;
window.openBrechoCheckout = openBrechoCheckout;
window.confirmBrechoPayment = confirmBrechoPayment;
