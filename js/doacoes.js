/* ========================================================
   PONTE SOLIDÁRIA — DOAÇÕES, PEDIDOS E RASTREAMENTO
   Módulo 3 (Doações) e Módulo 4 (Pedidos de Ajuda) são
   sincronizados em tempo real com o Firestore. As demais
   funções deste arquivo (doação financeira, excedente de
   empresas e rastreio por código) ainda usam o armazenamento
   local do navegador — ver README-FIREBASE.md para o que
   falta migrar.
   ======================================================== */

const DONATION_STATUS_STEPS = [
    { title: "Registrado", description: "A doação foi cadastrada no portal.", icon: "clipboard-check" },
    { title: "Validado pela ONG", description: "A ONG aprovou e organizou a coleta.", icon: "badge-check" },
    { title: "Em estoque", description: "O item foi coletado e está disponível para distribuição.", icon: "warehouse" },
    { title: "Match com família", description: "A doação foi direcionada a uma família cadastrada.", icon: "git-merge" },
    { title: "Em rota", description: "O item saiu para entrega.", icon: "truck" },
    { title: "Entregue", description: "A entrega foi concluída e confirmada.", icon: "circle-check" }
];

function getCurrentUser() {
    return typeof appState !== "undefined" ? appState.user : null;
}

function getValue(id) {
    if (typeof getFormValue === "function") return getFormValue(id);
    return document.getElementById(id)?.value?.trim() || "";
}

function notify(message, type = "success") {
    if (typeof showToast === "function") showToast(message, type);
}

async function refreshPublicData() {
    if (typeof loadPublicData === "function") await loadPublicData();
    if (typeof renderAdminPanel === "function") renderAdminPanel();
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

function getStatusStep(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized.includes("entregue") || normalized.includes("distribu")) return 6;
    if (normalized.includes("rota") || normalized.includes("transporte")) return 5;
    if (normalized.includes("match")) return 4;
    if (normalized.includes("estoque") || normalized.includes("coletado")) return 3;
    if (normalized.includes("validado")) return 2;
    return 1;
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
let ongsCache = [];
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
    renderUrgentItems();
    renderMyPedidos();
    renderOngPedidos();
}

document.addEventListener("firebaseReady", initFirestoreDoacoesModule);

// Salva uma doação financeira feita por PIX ou cartão.
async function saveFinancialDonation(method = "PIX") {
    const selectedValue = Number(document.querySelector(".val-btn.active")?.dataset.val);
    const customValue = Number(getValue("custom-donation-val"));
    const cardValue = Number(getValue("card-value"));
    const amount = customValue || cardValue || selectedValue || 50;

    if (!Number.isFinite(amount) || amount <= 0) {
        notify("Informe um valor válido para a doação.", "warning");
        return;
    }

    const donations = store.get("ps_demo_donations", []);
    donations.unshift({
        id: Date.now(),
        donor_name: getCurrentUser()?.name || "Doador anônimo",
        type: method,
        amount,
        description: `Doação financeira via ${method}`,
        status: "Entregue",
        created_at: new Date().toISOString().slice(0, 10)
    });
    store.set("ps_demo_donations", donations);

    const customInput = document.getElementById("custom-donation-val");
    if (customInput) customInput.value = "";
    document.getElementById("card-donation-form")?.reset();
    document.getElementById("pix-qr-container")?.classList.add("hidden");
    await refreshPublicData();
    notify(`Obrigado! Doação de R$ ${amount.toFixed(2).replace(".", ",")} registrada com sucesso.`);
}

// Salva uma doação física de pessoa doadora.
async function saveDonorPhysicalDonation(event) {
    event?.preventDefault();
    const user = getCurrentUser();
    if (!user) {
        notify("Faça login como doador para registrar uma doação.", "danger");
        return;
    }

    const itemName = getValue("donor-item-name");
    if (!itemName) {
        notify("Informe o item que deseja doar.", "warning");
        return;
    }

    const physicalDonations = store.get("ps_demo_physical_donations", []);
    physicalDonations.unshift({
        id: Date.now(),
        donor_name: user.name,
        item_name: itemName,
        qty: getValue("donor-item-qty") || 1,
        category: getValue("donor-item-category") || "Outros",
        address: getValue("donor-item-address") || user.address || "A combinar",
        description: getValue("donor-item-desc"),
        status: "Aguardando Coleta",
        created_at: new Date().toISOString().slice(0, 10)
    });
    store.set("ps_demo_physical_donations", physicalDonations);

    document.getElementById("donor-item-form")?.reset();
    if (typeof renderDonorDonations === "function") renderDonorDonations();
    await refreshPublicData();
    notify("Doação cadastrada. Aguarde o contato para agendar a coleta.");
}

// Salva um excedente cadastrado por empresa parceira.
async function saveCompanySurplusDonation(event) {
    event?.preventDefault();
    const user = getCurrentUser();
    if (!user) {
        notify("Faça login corporativo para cadastrar excedentes.", "danger");
        return;
    }

    const itemName = getValue("company-item-name");
    if (!itemName) {
        notify("Descreva o excedente disponível.", "warning");
        return;
    }

    const companyDonations = store.get("ps_demo_company_donations", []);
    companyDonations.unshift({
        id: Date.now(),
        company_name: user.name,
        item_name: itemName,
        qty: itemName.match(/\d+\s*(kg|g|l|unidades|cestas|pães|litros)/i)?.[0] || "1 lote",
        category: getValue("company-item-type") || "Alimentos",
        status: "Aguardando Coleta",
        created_at: new Date().toISOString().slice(0, 10),
        expiry: getValue("company-item-expiry"),
        pickup_date: getValue("company-pickup-date"),
        pickup_time: getValue("company-pickup-time"),
        description: getValue("company-pickup-instructions")
    });
    store.set("ps_demo_company_donations", companyDonations);

    document.getElementById("company-surplus-form")?.reset();
    if (typeof renderCompanyDonations === "function") renderCompanyDonations();
    await refreshPublicData();
    notify("Excedente cadastrado. A coleta será organizada com a equipe parceira.");
}

function handleTrackDonation(event) {
    event?.preventDefault();
    const query = document.getElementById("donation-track-search")?.value.trim();
    const resultBox = document.getElementById("tracking-result-box");
    if (!query) {
        notify("Digite o código da doação para acompanhar a entrega.", "warning");
        return;
    }

    const physical = store.get("ps_demo_physical_donations", []);
    const company = store.get("ps_demo_company_donations", []);
    const normalize = (value) => String(value).toLowerCase();
    const normalizedQuery = normalize(query);
    const donation = [...physical, ...company].find((item) => {
        const id = String(item.id);
        return [id, `doa-${id}`, `corp-${id}`, `rse-${id}-ok`].includes(normalizedQuery);
    });

    if (!donation || !resultBox) {
        resultBox?.classList.add("hidden");
        notify("Doação não encontrada. Verifique o código e tente novamente.", "danger");
        return;
    }

    const currentStep = getStatusStep(donation.status);
    resultBox.classList.remove("hidden");
    resultBox.innerHTML = `
        <div class="tracking-summary">
            <h4>Rastreamento: <strong>${donation.item_name}</strong></h4>
            <p><strong>Categoria:</strong> ${donation.category || "Não informada"} · <strong>Status:</strong> ${donation.status}</p>
        </div>
        <div class="logistics-timeline-visual vertical-timeline">
            ${DONATION_STATUS_STEPS.map((step, index) => {
                const number = index + 1;
                const state = number < currentStep ? "completed" : number === currentStep ? "active" : "";
                return `<div class="timeline-step ${state}" data-step="${number}">
                    <div class="step-num"><i data-lucide="${step.icon}"></i></div>
                    <div class="step-content"><div class="step-label">${step.title}</div><span class="step-desc">${step.description}</span></div>
                </div>`;
            }).join("")}
        </div>`;

    if (window.lucide) window.lucide.createIcons();
    resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ========================================================
   MÓDULO 3 — FLUXO COMPLETO DE DOAÇÕES (Firestore: "doacoes")
   Cada doação segue um dos dois caminhos escolhidos pelo doador:
     • Entrega direta a um beneficiário (com chat para combinar retirada)
     • Mediação por uma ONG parceira (triagem, separação e entrega)
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
let donationWizardStep = 1;
const donationWizardMaxSteps = 2;
let selectedDeliveryMethod = "direct";

function populateOngSelect() {
    const select = document.getElementById("dw-ong-select");
    if (!select) return;
    const ongs = getApprovedOngs();
    select.innerHTML = ongs.length
        ? ongs.map((o) => `<option value="${o.id}">${escapeHtml(o.name)}</option>`).join("")
        : `<option value="">Nenhuma ONG validada disponível no momento</option>`;
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
    document.getElementById("donation-wizard-form")?.reset();
    document.querySelectorAll("#delivery-method-grid .role-tab").forEach((tab, index) => tab.classList.toggle("active", index === 0));
    document.getElementById("dw-ong-select-group")?.classList.add("hidden");
    const photosLabel = document.getElementById("dw-photos-name");
    if (photosLabel) photosLabel.innerText = "Anexe uma ou mais fotos do item";
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
    const photosInput = document.getElementById("dw-photos");
    const photos = photosInput?.files ? Array.from(photosInput.files).map((file) => file.name) : [];

    if (!category || !itemName || !condition || !city) {
        notify("Preencha os dados obrigatórios do item.", "warning");
        return;
    }

    const isOng = selectedDeliveryMethod === "ong";
    let ongId = "";
    let ongName = "";
    if (isOng) {
        const select = document.getElementById("dw-ong-select");
        ongId = select?.value || "";
        ongName = select?.selectedOptions?.[0]?.textContent || "";
        if (!ongId) {
            notify("Escolha uma instituição para mediar a doação.", "warning");
            return;
        }
    }

    const nowIso = new Date().toISOString();
    const donation = {
        donorId: user.id,
        donorName: user.name,
        category, itemName, quantity, condition, weight, city, availability, description, photos,
        deliveryMethod: isOng ? "ong" : "direct",
        ongId, ongName,
        beneficiaryId: "", beneficiaryName: "",
        progressStep: 1, // "ONG selecionada" ou "Buscando beneficiário" — já iniciado ao cadastrar
        trackingStatus: "Em andamento",
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [{
            step: 1,
            label: isOng ? "ONG selecionada" : "Buscando beneficiário",
            date: nowIso,
            note: isOng ? `Doação cadastrada e direcionada para ${ongName}.` : "Doação cadastrada. Buscando um beneficiário compatível."
        }]
    };

    const { db, collection, addDoc } = refs;
    try {
        await addDoc(collection(db, "doacoes"), donation);
        closeDonationWizard();
        notify(isOng ? `Doação enviada para ${ongName}. Você será avisado quando ela for aceita.` : "Doação publicada! Assim que um beneficiário aceitar, o chat será liberado.");
    } catch (error) {
        console.error(error);
        notify("Não foi possível salvar a doação no banco de dados. Tente novamente.", "danger");
    }
}

// -------- Renderização dos painéis de acompanhamento --------
function renderMyDonations() {
    const block = document.getElementById("my-donations-block");
    const grid = document.getElementById("my-donations-grid");
    const user = getCurrentUser();
    if (!block || !grid) return;
    if (!user) { block.classList.add("hidden"); grid.innerHTML = ""; return; }

    const mine = donationsCache.filter((d) => d.donorId === user.id || d.beneficiaryId === user.id);
    if (!mine.length) { block.classList.add("hidden"); grid.innerHTML = ""; return; }
    block.classList.remove("hidden");

    grid.innerHTML = mine.map((d) => {
        const isDonor = d.donorId === user.id;
        const roleTag = isDonor ? `<span class="flow-role-tag donor">Você está doando</span>` : `<span class="flow-role-tag beneficiary">Você vai receber</span>`;
        const methodLabel = d.deliveryMethod === "ong" ? `Mediação: ${d.ongName}` : "Entrega direta";
        const steps = getFlowSteps(d);
        const currentLabel = steps[Math.min(d.progressStep, steps.length - 1)];

        let actions = "";
        if (isDonor && d.trackingStatus === "Em andamento" && d.progressStep <= 1) {
            actions += `<button class="btn btn-secondary btn-sm" type="button" data-cancel-donation="${d.id}">Cancelar doação</button>`;
        }
        if (d.deliveryMethod === "direct" && d.trackingStatus === "Em andamento" && d.progressStep >= 2 && d.progressStep < steps.length - 1) {
            const chatWith = isDonor ? d.beneficiaryName : d.donorName;
            actions += `<button class="btn btn-secondary btn-sm" type="button" data-open-donation-chat="${escapeHtml(chatWith)}"><i data-lucide="message-circle"></i> Abrir chat</button>`;
            actions += `<button class="btn btn-primary btn-sm" type="button" data-confirm-delivery="${d.id}">Confirmar entrega</button>`;
        }

        return `
        <article class="flow-donation-card">
            <div class="flow-card-top">
                ${roleTag}
                <span class="flow-status-pill ${flowStatusPillClass(d.trackingStatus)}">${d.trackingStatus}</span>
            </div>
            <h4>${escapeHtml(d.itemName)}</h4>
            <p class="flow-card-meta"><i data-lucide="tag"></i> ${escapeHtml(d.category)} · ${d.quantity} un. · ${escapeHtml(methodLabel)}</p>
            <p class="flow-card-meta"><i data-lucide="map-pin"></i> ${escapeHtml(d.city)}</p>
            ${renderFlowProgress(d)}
            <p class="flow-current-step">Etapa atual: <strong>${escapeHtml(currentLabel)}</strong></p>
            <div class="flow-card-actions">${actions}</div>
        </article>`;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
}

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

    const mine = donationsCache.filter((d) => d.deliveryMethod === "ong" && d.ongId === user.id);
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
                actions = `<button class="btn btn-success btn-sm" type="button" data-ong-advance="${d.id}">Confirmar conclusão</button>`;
            }
        }
        return `
        <article class="flow-donation-card">
            <div class="flow-card-top">
                <span class="flow-role-tag">Doador: ${escapeHtml(d.donorName)}</span>
                <span class="flow-status-pill ${flowStatusPillClass(d.trackingStatus)}">${d.trackingStatus}</span>
            </div>
            <h4>${escapeHtml(d.itemName)}</h4>
            <p class="flow-card-meta"><i data-lucide="tag"></i> ${escapeHtml(d.category)} · ${d.quantity} un. · ${escapeHtml(d.condition)}</p>
            <p class="flow-card-meta"><i data-lucide="map-pin"></i> ${escapeHtml(d.city)}</p>
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
    await updateDonationDoc(id,
        { beneficiaryId: user.id, beneficiaryName: user.name, progressStep: 3 },
        `${user.name} aceitou receber a doação. Combinação de entrega iniciada.`);
    notify("Você aceitou a doação! Abra o chat para combinar local e horário.");
    if (typeof window.openChat === "function") window.openChat(donation.donorName);
}

async function confirmDirectDelivery(id) {
    const donation = donationsCache.find((d) => d.id === id);
    if (!donation) return;
    const steps = getFlowSteps(donation);
    await updateDonationDoc(id,
        { progressStep: steps.length - 1, trackingStatus: "Entregue" },
        "Entrega confirmada.");
    notify("Entrega confirmada. Obrigado por fazer parte dessa ponte solidária!");
}

async function advanceOngDonation(id) {
    if (!requireOngAprovada()) return;
    const donation = donationsCache.find((d) => d.id === id);
    if (!donation) return;
    const steps = getFlowSteps(donation);
    if (donation.progressStep >= steps.length - 1) return;
    const nextStep = donation.progressStep + 1;
    const patch = { progressStep: nextStep };
    if (nextStep === steps.length - 1) patch.trackingStatus = "Entregue";
    await updateDonationDoc(id, patch, `Etapa atualizada para "${steps[nextStep]}".`);
    notify(`Doação atualizada: ${steps[nextStep]}.`);
}

async function rejectOngDonation(id) {
    if (!requireOngAprovada()) return;
    await updateDonationDoc(id, { trackingStatus: "Recusada" }, "Mediação recusada pela instituição.");
    notify("Solicitação de mediação recusada.", "warning");
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
const PEDIDO_STATUS_STEPS = ["Criado", "Em análise", "Aprovado", "Atendido", "Concluído"];

// "mais_info" é um desvio dentro de "Em análise" (a ONG pediu mais dados,
// mas o pedido ainda não foi julgado); "recusado" é um estado terminal
// negativo, mostrado à parte (fora da barra), igual já acontece hoje com
// "Cancelada"/"Recusada" nas doações.
function pedidoProgressStep(status) {
    return { pendente: 0, mais_info: 1, aprovado: 2, vinculado: 3, concluido: 4 }[status] ?? 0;
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
        pendente: "Criado — aguardando análise da ONG",
        aprovado: "Aprovado — buscando doação compatível",
        recusado: "Recusado",
        mais_info: "Em análise — ONG pediu mais informações",
        vinculado: "Atendido — doação vinculada",
        concluido: "Concluído — recebimento confirmado"
    }[status] || status;
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
    const photosInput = document.getElementById("req-family-photos");
    const photos = photosInput?.files ? Array.from(photosInput.files).map((file) => file.name) : [];

    if (!item || !description) {
        notify("Preencha o item e a descrição da necessidade.", "warning");
        return;
    }

    const nowIso = new Date().toISOString();
    const pedido = {
        solicitanteId: user.id,
        solicitanteNome: familyName,
        solicitanteCidade: city,
        category, item, quantity, urgency, description, photos,
        status: "pendente",
        ongId: "", ongName: "", ongObservacao: "",
        doacaoVinculadaId: "",
        createdAt: nowIso, updatedAt: nowIso,
        history: [{ status: "pendente", date: nowIso, note: "Pedido registrado pelo solicitante." }]
    };

    const { db, collection, addDoc } = refs;
    try {
        await addDoc(collection(db, "pedidos"), pedido);
        form?.reset();
        document.querySelector(".urgent-needs-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
        notify("Pedido enviado para análise das ONGs parceiras.");
    } catch (error) {
        console.error(error);
        notify("Não foi possível enviar o pedido. Tente novamente.", "danger");
    }
}

function renderUrgentItems() {
    const grid = document.getElementById("urgent-items-grid");
    if (!grid) return;

    const items = pedidosCache.filter((p) => p.status === "pendente" || p.status === "aprovado");
    if (!items.length) {
        grid.innerHTML = `
            <div class="urgent-empty-state">
                <i data-lucide="heart"></i>
                <p>Ainda não há pedidos urgentes publicados. Você pode cadastrar a primeira necessidade.</p>
            </div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    grid.innerHTML = items.map((item) => `
        <article class="urgent-item-card">
            <div class="urgent-item-topline">
                <span class="card-badge badge-urgent">${item.urgency === "alta" ? "Urgente" : item.urgency === "baixa" ? "Necessidade" : "Prioridade média"}</span>
                <span class="urgent-item-date">${escapeHtml(new Date(item.createdAt).toLocaleDateString("pt-BR"))}</span>
            </div>
            <h4>${escapeHtml(item.item)}</h4>
            <p class="urgent-item-location"><i data-lucide="map-pin"></i> ${escapeHtml(item.solicitanteCidade)}</p>
            <p>${escapeHtml(item.description)}</p>
            <div class="urgent-item-footer">
                <span class="category-tag">${escapeHtml(item.category)} · ${escapeHtml(String(item.quantity))} un.</span>
                <button class="btn btn-primary btn-sm" type="button" data-donate-for="${escapeHtml(item.item)}" data-donate-category="${escapeHtml(item.category)}">Quero ajudar</button>
            </div>
        </article>`).join("");

    if (window.lucide) window.lucide.createIcons();
}

function renderMyPedidos() {
    const block = document.getElementById("my-pedidos-block");
    const grid = document.getElementById("my-pedidos-grid");
    const user = getCurrentUser();
    if (!block || !grid) return;
    const mine = user ? pedidosCache.filter((p) => p.solicitanteId === user.id) : [];
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
            ${renderPedidoProgress(p)}
            <div class="flow-card-actions">
                ${p.status !== "recusado" ? `<button class="btn btn-secondary btn-sm" type="button" data-open-pedido-chat="${p.id}"><i data-lucide="message-circle"></i> Conversar sobre este pedido</button>` : ""}
                ${p.status === "vinculado" ? `<button class="btn btn-success btn-sm" type="button" data-pedido-concluir="${p.id}"><i data-lucide="circle-check"></i> Confirmar recebimento</button>` : ""}
            </div>
        </article>`).join("");

    if (window.lucide) window.lucide.createIcons();
}

// Doações em andamento com a mesma categoria e (quando possível) cidade parecida.
function findCompatibleDonations(pedido) {
    const solicitanteCidade = String(pedido.solicitanteCidade || "").toLowerCase();
    return donationsCache.filter((d) => {
        if (d.trackingStatus !== "Em andamento" || d.beneficiaryId) return false;
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

    const relevantes = pedidosCache.filter((p) => p.status === "pendente" || (p.ongId === user.id && ["aprovado", "vinculado", "concluido"].includes(p.status)));
    if (!relevantes.length) { block.classList.add("hidden"); grid.innerHTML = ""; return; }
    block.classList.remove("hidden");

    grid.innerHTML = relevantes.map((p) => {
        let actions = "";
        if (p.status === "pendente" || p.status === "mais_info") {
            actions = `
                <button class="btn btn-success btn-sm" type="button" data-pedido-aprovar="${p.id}"><i data-lucide="check"></i> Aprovar</button>
                <button class="btn btn-secondary btn-sm" type="button" data-pedido-mais-info="${p.id}"><i data-lucide="message-circle-question"></i> Pedir mais informações</button>
                <button class="btn btn-danger btn-sm" type="button" data-pedido-recusar="${p.id}"><i data-lucide="x"></i> Recusar</button>`;
        } else if (p.status === "aprovado") {
            const matches = findCompatibleDonations(p);
            actions = matches.length
                ? matches.map((d) => `<button class="btn btn-primary btn-sm" type="button" data-pedido-vincular="${p.id}" data-doacao-vincular="${d.id}"><i data-lucide="link"></i> Vincular: ${escapeHtml(d.itemName)} (${escapeHtml(d.donorName)})</button>`).join("")
                : `<p class="form-help-text"><i data-lucide="search"></i> Nenhuma doação compatível disponível ainda. Assim que surgir uma, ela aparecerá aqui.</p>`;
        }
        return `
        <article class="flow-donation-card">
            <div class="flow-card-top">
                <span class="flow-role-tag">Solicitante: ${escapeHtml(p.solicitanteNome)}</span>
                <span class="flow-status-pill ${pedidoStatusPillClass(p.status)}">${pedidoStatusLabel(p.status)}</span>
            </div>
            <h4>${escapeHtml(p.item)}</h4>
            <p class="flow-card-meta"><i data-lucide="tag"></i> ${escapeHtml(p.category)} · ${p.quantity} un. · Urgência: ${escapeHtml(p.urgency)}</p>
            <p class="flow-card-meta"><i data-lucide="map-pin"></i> ${escapeHtml(p.solicitanteCidade)}</p>
            <p class="flow-card-desc">${escapeHtml(p.description)}</p>
            ${renderPedidoProgress(p)}
            <div class="flow-card-actions">
                ${actions}
                <button class="btn btn-secondary btn-sm" type="button" data-open-pedido-chat="${p.id}"><i data-lucide="message-circle"></i> Conversar com o solicitante</button>
            </div>
        </article>`;
    }).join("");

    if (window.lucide) window.lucide.createIcons();
}

async function updatePedidoDoc(id, patch, historyEntry) {
    const refs = fsRefs();
    if (!refs) { notify("Conexão com o banco de dados indisponível.", "danger"); return; }
    const { db, doc, updateDoc } = refs;
    const pedido = pedidosCache.find((p) => p.id === id);
    const history = pedido?.history ? [...pedido.history] : [];
    if (historyEntry) history.push({ ...historyEntry, date: new Date().toISOString() });
    try {
        await updateDoc(doc(db, "pedidos", id), { ...patch, history, updatedAt: new Date().toISOString() });
    } catch (error) {
        console.error(error);
        notify("Não foi possível atualizar o pedido. Tente novamente.", "danger");
    }
}

async function aprovarPedido(id) {
    const user = requireOngAprovada();
    if (!user) return;
    await updatePedidoDoc(id,
        { status: "aprovado", ongId: user.id, ongName: user.name },
        { status: "aprovado", note: `Pedido aprovado por ${user.name}.` });
    notify("Pedido aprovado. Agora busque uma doação compatível para vincular.");
}

async function recusarPedido(id) {
    const user = requireOngAprovada();
    if (!user) return;
    const motivo = window.prompt("Motivo da recusa (será enviado ao solicitante):", "");
    if (motivo === null) return;
    await updatePedidoDoc(id,
        { status: "recusado", ongId: user.id, ongName: user.name, ongObservacao: motivo || "Pedido recusado pela ONG." },
        { status: "recusado", note: motivo || "Pedido recusado." });
    notify("Pedido recusado.", "warning");
}

async function pedirMaisInfoPedido(id) {
    const user = requireOngAprovada();
    if (!user) return;
    const pergunta = window.prompt("O que você precisa saber a mais do solicitante?", "");
    if (pergunta === null) return;
    await updatePedidoDoc(id,
        { status: "mais_info", ongId: user.id, ongName: user.name, ongObservacao: pergunta || "A ONG solicitou mais informações." },
        { status: "mais_info", note: pergunta || "Mais informações solicitadas." });
    notify("Solicitação de mais informações enviada ao solicitante.", "info");
}

async function vincularDoacaoAoPedido(pedidoId, doacaoId) {
    const user = requireOngAprovada();
    const pedido = pedidosCache.find((p) => p.id === pedidoId);
    const doacao = donationsCache.find((d) => d.id === doacaoId);
    if (!user || !pedido || !doacao) return;

    await updatePedidoDoc(pedidoId,
        { status: "vinculado", doacaoVinculadaId: doacaoId },
        { status: "vinculado", note: `Vinculado à doação de ${doacao.donorName}.` });

    await updateDonationDoc(doacaoId,
        { beneficiaryId: pedido.solicitanteId, beneficiaryName: pedido.solicitanteNome },
        `Doação vinculada ao pedido de ${pedido.solicitanteNome} por ${user.name}.`);

    notify("Doação vinculada ao pedido com sucesso!");
}

// Fase 3: fecha o ciclo do pedido (Atendido → Concluído). Só o próprio
// solicitante confirma, e só quando já existe uma doação vinculada — assim
// como em confirmDirectDelivery() para doações, é quem recebeu o item que
// atesta o recebimento, não a ONG.
async function confirmarRecebimentoPedido(id) {
    const user = getCurrentUser();
    const pedido = pedidosCache.find((p) => p.id === id);
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
}

/* ========================================================
   FASE 3 — Chat vinculado ao pedido (Firestore real)
   Nova subcoleção "pedidos/{pedidoId}/mensagens": não existia
   nenhuma estrutura de mensagens no banco, e cada pedido precisa da
   própria conversa isolada entre solicitante e ONG (diferente do chat
   estático de exemplo que já existia em js/chat.js). Reaproveita
   integralmente a interface visual do chat (sidebar, bolhas de
   mensagem, notificações) — só passa a gravar/ouvir o Firestore em
   vez de ficar só em memória.
   ======================================================== */
const pedidoChatThreads = {}; // threadKey -> { unsubscribe }

function pedidoChatThreadKey(pedido) {
    return `Pedido: ${pedido.item} — ${pedido.solicitanteNome}`;
}

function openPedidoChat(pedidoId) {
    const user = getCurrentUser();
    const pedido = pedidosCache.find((p) => p.id === pedidoId);
    const refs = fsRefs();
    if (!user || !pedido || !refs) {
        notify("Não foi possível abrir o chat deste pedido agora.", "danger");
        return;
    }
    if (typeof chatConversations === "undefined" || typeof window.openChat !== "function") {
        notify("O módulo de chat ainda não carregou. Tente novamente em instantes.", "warning");
        return;
    }
    const { db, collection, query, orderBy, onSnapshot, addDoc } = refs;
    const threadKey = pedidoChatThreadKey(pedido);

    if (!chatConversations[threadKey]) {
        chatConversations[threadKey] = {
            avatar: "PD",
            role: pedido.item,
            online: true,
            typing: false,
            firestore: true,
            messages: [],
            send: async (text) => {
                try {
                    await addDoc(collection(db, "pedidos", pedidoId, "mensagens"), {
                        senderId: user.id,
                        senderName: user.name,
                        text,
                        createdAt: new Date().toISOString()
                    });
                } catch (error) {
                    console.error(error);
                    notify("Não foi possível enviar a mensagem. Tente novamente.", "danger");
                }
            }
        };
    }

    if (!pedidoChatThreads[threadKey]) {
        const q = query(collection(db, "pedidos", pedidoId, "mensagens"), orderBy("createdAt", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            chatConversations[threadKey].messages = snapshot.docs.map((docSnap) => {
                const m = docSnap.data();
                return {
                    sender: m.senderId === user.id ? "sent" : "received",
                    text: m.text,
                    time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""
                };
            });
            if (window.getActiveContact?.() === threadKey) window.renderActiveMessages?.();
            window.renderConversationsList?.();
        }, (error) => console.warn("[Ponte Solidária] Falha ao sincronizar chat do pedido.", error));
        pedidoChatThreads[threadKey] = { unsubscribe };
    }

    window.openChat(threadKey);
}
window.openPedidoChat = openPedidoChat;

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
                category: urgentDonationButton.dataset.donateCategory || ""
            });
        }

        if (event.target.closest("#close-donation-wizard-btn")) {
            closeDonationWizard();
        }

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
            const hint = document.getElementById("delivery-wizard-hint");
            if (selectedDeliveryMethod === "ong") {
                ongGroup?.classList.remove("hidden");
                if (hint) hint.innerText = "Mediação de ONG: a instituição recebe, faz a triagem, separa e organiza a entrega ao beneficiário.";
            } else {
                ongGroup?.classList.add("hidden");
                if (hint) hint.innerText = "Entrega direta: assim que um beneficiário aceitar, um chat é aberto para combinar local e horário.";
            }
        }

        const cancelBtn = event.target.closest("[data-cancel-donation]");
        if (cancelBtn) cancelDonation(cancelBtn.dataset.cancelDonation);

        const acceptBtn = event.target.closest("[data-accept-direct]");
        if (acceptBtn) acceptDirectDonation(acceptBtn.dataset.acceptDirect);

        const confirmBtn = event.target.closest("[data-confirm-delivery]");
        if (confirmBtn) confirmDirectDelivery(confirmBtn.dataset.confirmDelivery);

        const ongAdvanceBtn = event.target.closest("[data-ong-advance]");
        if (ongAdvanceBtn) advanceOngDonation(ongAdvanceBtn.dataset.ongAdvance);

        const ongRejectBtn = event.target.closest("[data-ong-reject]");
        if (ongRejectBtn) rejectOngDonation(ongRejectBtn.dataset.ongReject);

        const chatBtn = event.target.closest("[data-open-donation-chat]");
        if (chatBtn && typeof window.openChat === "function") window.openChat(chatBtn.dataset.openDonationChat);

        const pedidoAprovarBtn = event.target.closest("[data-pedido-aprovar]");
        if (pedidoAprovarBtn) aprovarPedido(pedidoAprovarBtn.dataset.pedidoAprovar);

        const pedidoRecusarBtn = event.target.closest("[data-pedido-recusar]");
        if (pedidoRecusarBtn) recusarPedido(pedidoRecusarBtn.dataset.pedidoRecusar);

        const pedidoMaisInfoBtn = event.target.closest("[data-pedido-mais-info]");
        if (pedidoMaisInfoBtn) pedirMaisInfoPedido(pedidoMaisInfoBtn.dataset.pedidoMaisInfo);

        const pedidoVincularBtn = event.target.closest("[data-pedido-vincular]");
        if (pedidoVincularBtn) vincularDoacaoAoPedido(pedidoVincularBtn.dataset.pedidoVincular, pedidoVincularBtn.dataset.doacaoVincular);

        const pedidoConcluirBtn = event.target.closest("[data-pedido-concluir]");
        if (pedidoConcluirBtn) confirmarRecebimentoPedido(pedidoConcluirBtn.dataset.pedidoConcluir);

        const pedidoChatBtn = event.target.closest("[data-open-pedido-chat]");
        if (pedidoChatBtn) openPedidoChat(pedidoChatBtn.dataset.openPedidoChat);
    });

    document.addEventListener("change", (event) => {
        if (event.target.id === "dw-photos") {
            const label = document.getElementById("dw-photos-name");
            const count = event.target.files?.length || 0;
            if (label) label.innerText = count ? `${count} arquivo(s) selecionado(s)` : "Anexe uma ou mais fotos do item";
        }
        if (event.target.id === "req-family-photos") {
            const label = document.getElementById("req-family-photos-name");
            const count = event.target.files?.length || 0;
            if (label) label.innerText = count ? `${count} arquivo(s) selecionado(s)` : "Anexe fotos que ajudem a ONG a entender o pedido";
        }
    });

    document.addEventListener("submit", (event) => {
        if (event.defaultPrevented) return;
        if (event.target.matches("#help-request-form")) {
            saveHelpRequest(event);
        }
        if (event.target.matches("#donation-wizard-form")) {
            event.preventDefault();
        }
    });
}

// A delegação permite que os elementos carregados via partials continuem funcionando.
setupDonationInteractions();
document.addEventListener("includesLoaded", renderUrgentItems);
document.addEventListener("includesLoaded", renderDonationFlows);

window.saveHelpRequest = saveHelpRequest;
window.saveFinancialDonation = saveFinancialDonation;
window.saveDonorPhysicalDonation = saveDonorPhysicalDonation;
window.saveCompanySurplusDonation = saveCompanySurplusDonation;
window.handleTrackDonation = handleTrackDonation;
window.activateDonationTab = activateDonationTab;
window.renderUrgentItems = renderUrgentItems;
window.renderDonationFlows = renderDonationFlows;
window.renderMyPedidos = renderMyPedidos;
window.renderOngPedidos = renderOngPedidos;
window.openDonationWizard = openDonationWizard;
