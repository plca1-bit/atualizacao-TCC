/* ==========================================
   PONTE SOLIDÁRIA - ENGINE JAVASCRIPT (APP)
   ========================================== */

// 1. DICTIONARY FOR TRANSLATION (PT-BR / EN)
const translations = {
    "pt-BR": {
        "nav-home": "Início",
        "nav-donations": "Doações & Campanhas",
        "nav-transparency": "Transparência",
        "nav-about": "Sobre Nós",
        "nav-admin": "Painel Adm",
        "hero-tagline": "Construindo Pontes de Esperança",
        "hero-title": "Sua solidariedade pode alimentar uma vida",
        "hero-desc": "Conectamos corações generosos a famílias e ONGs que precisam de alimentos, itens de higiene, roupas e móveis. Faça parte dessa ponte.",
        "btn-want-donate": "Quero Doar",
        "btn-need-help": "Preciso de Ajuda",
        "title-how-works": "Como funciona a Ponte Solidária?",
        "desc-how-works": "Criamos um ecossistema seguro e transparente para conectar quem quer doar com quem realmente precisa de apoio.",
        "step1-title": "1. Faça o Cadastro",
        "step1-desc": "Cadastre-se como doador (Pessoa Comum/ONG) ou como beneficiário que precisa de auxílio.",
        "step2-title": "2. Publique sua Ação",
        "step2-desc": "Doadores podem ofertar itens ou dinheiro. Beneficiários criam solicitações com base no tamanho da família.",
        "step3-title": "3. Conecte-se e Entregue",
        "step3-desc": "Use o chat interno e o mapa de localização para alinhar os detalhes da entrega com segurança.",
        "title-impact": "Nosso Impacto em Números",
        "desc-impact": "Resultados reais alcançados graças à união e solidariedade de nossa comunidade.",
        "label-families": "Famílias Ajudadas",
        "label-donations": "Doações Realizadas",
        "label-ongs": "ONGs Parceiras",
        "label-campaigns": "Campanhas Ativas",
        "title-testimonials": "Histórias que nos inspiram",
        "desc-testimonials": "Relatos de quem teve sua vida transformada ou encontrou na plataforma uma forma de ajudar.",
        "title-donations-portal": "Portal de Doações e Pedidos",
        "desc-donations-portal": "Aqui você pode doar itens, realizar doações financeiras, criar campanhas ou solicitar cestas de ajuda familiar.",
        "tab-requests": "Famílias Necessitadas",
        "tab-campaigns": "Campanhas Coletivas",
        "tab-money": "Doar Dinheiro (PIX/Cartão)",
        "tab-request-form": "Solicitar Ajuda",
        "txt-view-map": "Ver no Mapa",
        "title-transparency": "Portal de Transparência",
        "desc-transparency": "Acreditamos que a confiança é construída com clareza. Acompanhe a destinação de todos os recursos arrecadados e o progresso das nossas campanhas.",
        "title-about": "Quem Somos",
        "desc-about": "Conheça a equipe de desenvolvedores idealizadores da Ponte Solidária, nossa missão, visão e o propósito de criar este ecossistema social.",
        "txt-notifications": "Notificações"
    },
    "en": {
        "nav-home": "Home",
        "nav-donations": "Donations & Campaigns",
        "nav-transparency": "Transparency",
        "nav-about": "About Us",
        "nav-admin": "Admin Panel",
        "hero-tagline": "Building Bridges of Hope",
        "hero-title": "Your solidarity can feed a life",
        "hero-desc": "We connect generous hearts to families and NGOs in need of food, hygiene items, clothing, and furniture. Be part of this bridge.",
        "btn-want-donate": "I Want to Donate",
        "btn-need-help": "I Need Help",
        "title-how-works": "How does Ponte Solidária work?",
        "desc-how-works": "We create a secure and transparent ecosystem to connect those who want to donate with those who really need support.",
        "step1-title": "1. Create Account",
        "step1-desc": "Register as a donor (Common Person/NGO) or as a beneficiary who needs assistance.",
        "step2-title": "2. Publish Action",
        "step2-desc": "Donors can offer items or money. Beneficiaries create requests based on family size.",
        "step3-title": "3. Connect & Deliver",
        "step3-desc": "Use the internal chat and location map to safely coordinate delivery details.",
        "title-impact": "Our Impact in Numbers",
        "desc-impact": "Real results achieved thanks to the union and solidarity of our community.",
        "label-families": "Families Helped",
        "label-donations": "Donations Made",
        "label-ongs": "Partner NGOs",
        "label-campaigns": "Active Campaigns",
        "title-testimonials": "Stories that inspire us",
        "desc-testimonials": "Reports from those who had their lives transformed or found a way to help on the platform.",
        "title-donations-portal": "Donations & Requests Portal",
        "desc-donations-portal": "Here you can donate items, make financial donations, create campaigns, or request family help baskets.",
        "tab-requests": "Families in Need",
        "tab-campaigns": "Collective Campaigns",
        "tab-money": "Donate Money (PIX/Card)",
        "tab-request-form": "Request Help",
        "txt-view-map": "View on Map",
        "title-transparency": "Transparency Portal",
        "desc-transparency": "We believe trust is built with clarity. Track the allocation of all collected resources and the progress of our campaigns.",
        "title-about": "About Us",
        "desc-about": "Meet the team of developers behind Ponte Solidária, our mission, vision, and purpose in creating this social ecosystem.",
        "txt-notifications": "Notifications"
    }
};

// 2. INITIAL DATABASE SEED
const initialUsers = [
    { id: "u-admin", email: "admin@ponte.org", password: "admin123", name: "Administrador Geral", role: "admin" },
    { id: "u-ong1", email: "ong.amor@email.com", password: "ong123", name: "ONG Amor ao Próximo", role: "ong", cnpj: "12.345.678/0001-90", address: "Av. Solidariedade, 450, Centro", respName: "Ana Silva", respCpf: "111.222.333-44", docName: "estatuto_social.pdf", status: "approved", verified: true },
    { id: "u-ong2", email: "ong.esperanca@email.com", password: "ong123", name: "ONG Esperança e Luz", role: "ong", cnpj: "98.765.432/0001-10", address: "Rua da Paz, 99, Vila Nova", respName: "Carlos Souza", respCpf: "555.666.777-88", docName: "comprovante_cnpj.jpg", status: "pending", verified: false },
    { id: "u-common1", email: "maria@email.com", password: "maria123", name: "Maria do Carmo", role: "common", cpf: "222.333.444-55", phone: "(11) 98765-4321", address: "Rua das Rosas, 12, Bairro Alto, São Paulo - SP" },
    { id: "u-common2", email: "roberto@email.com", password: "roberto123", name: "Roberto Souza", role: "common", cpf: "777.888.999-00", phone: "(21) 99999-8888", address: "Rua General Osório, 145, Ipanema, Rio de Janeiro - RJ" }
];

const initialRequests = [
    { id: "req-1", userId: "u-common1", name: "Família Silva", type: "Alimentos", familySize: 4, kids: 2, elderly: 0, special: "Fraldas tamanho G para bebê de 1 ano", frequency: "Mensal", description: "Perdi meu emprego de diarista recentemente. Tenho 4 pessoas na casa e as crianças precisam de leite e comida básica.", date: "2026-06-01", status: "active", basketType: "Cesta Média" },
    { id: "req-2", userId: "u-common1", name: "Família Medeiros", type: "Móveis", familySize: 2, kids: 1, elderly: 0, special: "Intolerância à lactose", frequency: "Pontual", description: "Meu bebê vai nascer e não tenho berço nem carrinho de bebê. Qualquer ajuda de móveis infantis será muito bem-vinda.", date: "2026-06-02", status: "active", basketType: "Cesta Pequena" }
];

const initialCampaigns = [
    { id: "camp-1", ongId: "u-ong1", ongName: "ONG Amor ao Próximo", title: "Inverno sem Frio 2026", type: "Roupas", target: 200, current: 155, description: "Meta de arrecadar 200 cobertores e agasalhos para moradores de rua do centro da cidade.", status: "active" },
    { id: "camp-2", ongId: "u-ong1", ongName: "ONG Amor ao Próximo", title: "Prato Cheio de Esperança", type: "Alimentos", target: 100, current: 40, description: "Arrecadação de cestas básicas completas para famílias cadastradas na periferia.", status: "active" }
];

const initialHistory = [
    { recipient: "Família Souza", type: "Alimentos", details: "Cesta Básica Grande", donor: "Roberto Souza", date: "2026-05-30", status: "delivered" },
    { recipient: "Família Cruz", type: "Higiene", details: "Kit de Higiene com Creme Dental e Sabonetes", donor: "Anônimo", date: "2026-06-01", status: "delivered" },
    { recipient: "Família Silva", type: "Alimentos", details: "Cesta Básica Média", donor: "ONG Amor ao Próximo", date: "2026-06-02", status: "pending" }
];

const initialComplaints = [
    { id: "comp-1", reportedName: "ONG Fake de Doações", reason: "Uso indevido de CNPJ inexistente", status: "pending", date: "2026-06-01" },
    { id: "comp-2", reportedName: "Usuário Fraudulento", reason: "Tentativa de revenda de cestas recebidas", status: "investigating", date: "2026-06-02" }
];

// 3. APPLICATION STATE CLASS
class AppState {
    constructor() {
        this.initStorage();
        this.currentUser = JSON.parse(localStorage.getItem("ps_current_user")) || null;
        this.lang = localStorage.getItem("ps_lang") || "pt-BR";
        this.theme = localStorage.getItem("ps_theme") || "light-mode";
        this.activeTab = "active-requests-tab";
    }

    initStorage() {
        if (!localStorage.getItem("ps_users")) {
            localStorage.setItem("ps_users", JSON.stringify(initialUsers));
        }
        if (!localStorage.getItem("ps_requests")) {
            localStorage.setItem("ps_requests", JSON.stringify(initialRequests));
        }
        if (!localStorage.getItem("ps_campaigns")) {
            localStorage.setItem("ps_campaigns", JSON.stringify(initialCampaigns));
        }
        if (!localStorage.getItem("ps_history")) {
            localStorage.setItem("ps_history", JSON.stringify(initialHistory));
        }
        if (!localStorage.getItem("ps_complaints")) {
            localStorage.setItem("ps_complaints", JSON.stringify(initialComplaints));
        }
        if (!localStorage.getItem("ps_chats")) {
            localStorage.setItem("ps_chats", JSON.stringify({}));
        }
        if (!localStorage.getItem("ps_notifications")) {
            localStorage.setItem("ps_notifications", JSON.stringify([
                { id: 1, text: "Bem-vindo ao Ponte Solidária! Explore campanhas e ajude quem precisa.", read: false },
                { id: 2, text: "Nova ONG 'ONG Esperança e Luz' cadastrada e aguardando validação de documentos.", read: false }
            ]));
        }
    }

    getUsers() { return JSON.parse(localStorage.getItem("ps_users")); }
    setUsers(users) { localStorage.setItem("ps_users", JSON.stringify(users)); }

    getRequests() { return JSON.parse(localStorage.getItem("ps_requests")); }
    setRequests(reqs) { localStorage.setItem("ps_requests", JSON.stringify(reqs)); }

    getCampaigns() { return JSON.parse(localStorage.getItem("ps_campaigns")); }
    setCampaigns(camps) { localStorage.setItem("ps_campaigns", JSON.stringify(camps)); }

    getHistory() { return JSON.parse(localStorage.getItem("ps_history")); }
    setHistory(hist) { localStorage.setItem("ps_history", JSON.stringify(hist)); }

    getComplaints() { return JSON.parse(localStorage.getItem("ps_complaints")); }
    setComplaints(comps) { localStorage.setItem("ps_complaints", JSON.stringify(comps)); }

    getChats() { return JSON.parse(localStorage.getItem("ps_chats")); }
    setChats(chats) { localStorage.setItem("ps_chats", JSON.stringify(chats)); }

    getNotifications() { return JSON.parse(localStorage.getItem("ps_notifications")); }
    setNotifications(notifs) { localStorage.setItem("ps_notifications", JSON.stringify(notifs)); }

    setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem("ps_current_user", JSON.stringify(user));
        } else {
            localStorage.removeItem("ps_current_user");
        }
    }
}

const state = new AppState();

// 4. UI CONTROLLER AND EVENT LISTENERS
document.addEventListener("DOMContentLoaded", () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // Elements Selectors
    const body = document.body;
    const navLinks = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll(".app-section");
    const themeBtn = document.getElementById("theme-toggle-btn");
    const langBtn = document.getElementById("lang-toggle-btn");
    const langMenu = document.getElementById("lang-menu");
    const currentLangCode = document.getElementById("current-lang-code");
    
    // Auth selectors
    const openLoginBtn = document.getElementById("open-login-btn");
    const openRegisterBtn = document.getElementById("open-register-btn");
    const loginModal = document.getElementById("login-modal");
    const registerModal = document.getElementById("register-modal");
    const closeLoginBtn = document.getElementById("close-login-modal-btn");
    const closeRegisterBtn = document.getElementById("close-register-modal-btn");
    const switchToRegister = document.getElementById("switch-to-register");
    const roleTabs = document.querySelectorAll(".role-tab");
    const registerCommonForm = document.getElementById("register-common-form");
    const registerOngForm = document.getElementById("register-ong-form");
    const loginForm = document.getElementById("login-form");
    const adminQuickLogin = document.getElementById("admin-quick-login");
    const logoutBtn = document.getElementById("logout-btn");
    const userAuthZone = document.getElementById("user-auth-zone");
    const userProfileZone = document.getElementById("user-profile-zone");
    const userDisplayName = document.getElementById("user-display-name");
    const userDisplayRole = document.getElementById("user-display-role");
    const userAvatarChar = document.getElementById("user-avatar-char");

    // Notifications selectors
    const notifBtn = document.getElementById("notif-btn");
    const notifMenu = document.getElementById("notif-menu");
    const notificationList = document.getElementById("notification-list");
    const notifBadge = document.getElementById("notif-badge");
    const clearNotifBtn = document.getElementById("clear-notif-btn");

    // Donations portal selectors
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    const reqSearch = document.getElementById("request-search");
    const filterType = document.getElementById("filter-type");
    const requestsGrid = document.getElementById("requests-grid");
    const campaignsGrid = document.getElementById("campaigns-grid");
    const openMapBtn = document.getElementById("open-map-btn");
    const closeMapBtn = document.getElementById("close-map-btn");
    const mapContainer = document.getElementById("map-simulation-container");
    const mapPins = document.querySelectorAll(".map-pin");
    const mapInfoTitle = document.getElementById("map-info-title");
    const mapInfoDesc = document.getElementById("map-info-desc");
    const mapInfoAction = document.getElementById("map-info-action");

    // Payment selectors
    const payMethodBtns = document.querySelectorAll(".pay-method-btn");
    const pixPaymentFlow = document.getElementById("pix-payment-flow");
    const cardPaymentFlow = document.getElementById("card-payment-flow");
    const customDonationVal = document.getElementById("custom-donation-val");
    const valBtns = document.querySelectorAll(".val-btn");
    const generatePixBtn = document.getElementById("generate-pix-btn");
    const pixQrContainer = document.getElementById("pix-qr-container");
    const confirmPixBtn = document.getElementById("confirm-pix-btn");
    const copyPixBtn = document.getElementById("copy-pix-key");
    const cardDonationForm = document.getElementById("card-donation-form");

    // Help request form selectors
    const helpRequestAuthPrompt = document.getElementById("help-request-auth-prompt");
    const helpRequestForm = document.getElementById("help-request-form");
    const promptLoginBtn = document.getElementById("prompt-login-btn");
    const reqFamilyMembers = document.getElementById("req-family-members");
    const suggestionPreviewBox = document.getElementById("suggestion-preview-box");
    const suggestionTitle = document.getElementById("suggestion-title");
    const suggestionDesc = document.getElementById("suggestion-desc");
    const submitRequestBtn = document.getElementById("submit-request-btn");

    // Admin selectors
    const adminPendingOngsTbody = document.getElementById("admin-pending-ongs-tbody");
    const adminCampaignsTbody = document.getElementById("admin-campaigns-tbody");
    const adminComplaintsList = document.getElementById("admin-complaints-list");

    // Transparency
    const deliveryHistoryTbody = document.getElementById("delivery-history-tbody");

    // Certificate
    const certificateModal = document.getElementById("certificate-modal");
    const closeCertModalBtn = document.getElementById("close-cert-modal-btn");
    const certOngName = document.getElementById("cert-ong-name");
    const certOngCnpj = document.getElementById("cert-ong-cnpj");
    const certDate = document.getElementById("cert-date");
    const certCode = document.getElementById("cert-code");
    const printCertBtn = document.getElementById("print-cert-btn");

    // Chat selectors
    const chatWidget = document.getElementById("chat-widget-container");
    const chatToggle = document.getElementById("chat-toggle-btn");
    const chatWindow = document.getElementById("chat-window");
    const chatClose = document.getElementById("chat-close-btn");
    const chatBody = document.getElementById("chat-body-messages");
    const chatInputForm = document.getElementById("chat-input-form");
    const chatInputText = document.getElementById("chat-input-text");
    const chatActiveName = document.getElementById("chat-active-name");
    const chatActiveAvatar = document.getElementById("chat-active-avatar");
    const chatNotifBadge = document.getElementById("chat-notif-badge");

    // Developer Images
    document.getElementById("dev-photo-1").src = "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80";
    document.getElementById("dev-photo-2").src = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80";
    document.getElementById("dev-photo-3").src = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80";

    let activeChatRecipient = null;

    // --- APPLICATION STARTUP ---
    applyTheme();
    applyLanguage();
    updateUserAuthUI();
    renderRequests();
    renderCampaigns();
    renderDeliveryHistory();
    renderNotifications();

    // --- TOAST NOTIFICATIONS ---
    function showToast(message, type = "success") {
        const container = document.getElementById("toast-container");
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        
        let iconName = "check-circle";
        if (type === "warning") iconName = "alert-triangle";
        if (type === "danger") iconName = "alert-octagon";
        
        toast.innerHTML = `
            <i class="lucide-icon" data-lucide="${iconName}"></i>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        lucide.createIcons();
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(50px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // --- SYSTEM THEME ---
    function applyTheme() {
        body.className = state.theme;
        if (state.theme === "dark-mode") {
            themeBtn.querySelector(".dark-icon").classList.add("hidden");
            themeBtn.querySelector(".light-icon").classList.remove("hidden");
        } else {
            themeBtn.querySelector(".dark-icon").classList.remove("hidden");
            themeBtn.querySelector(".light-icon").classList.add("hidden");
        }
    }

    themeBtn.addEventListener("click", () => {
        state.theme = state.theme === "light-mode" ? "dark-mode" : "light-mode";
        localStorage.setItem("ps_theme", state.theme);
        applyTheme();
    });

    // --- LANGUAGE SYSTEM ---
    function applyLanguage() {
        currentLangCode.innerText = state.lang === "pt-BR" ? "PT" : "EN";
        const dictionary = translations[state.lang];
        
        for (const [key, value] of Object.entries(dictionary)) {
            const el = document.getElementById(key);
            if (el) {
                if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
                    el.placeholder = value;
                } else {
                    el.innerText = value;
                }
            }
        }
    }

    langBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        langMenu.classList.toggle("hidden");
    });

    document.querySelectorAll(".lang-option").forEach(opt => {
        opt.addEventListener("click", () => {
            state.lang = opt.getAttribute("data-lang");
            localStorage.setItem("ps_lang", state.lang);
            applyLanguage();
            langMenu.classList.add("hidden");
            showToast(state.lang === "pt-BR" ? "Idioma alterado para Português!" : "Language switched to English!");
        });
    });

    document.addEventListener("click", () => {
        langMenu.classList.add("hidden");
        notifMenu.classList.add("hidden");
    });

    // --- ROUTING / SWITCH VIEW ---
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const targetId = link.getAttribute("data-target");
            switchSection(targetId);
            
            navLinks.forEach(nl => nl.classList.remove("active"));
            link.classList.add("active");
            
            // Close mobile menu
            document.querySelector(".main-nav").classList.remove("active");
            const mobileToggle = document.querySelector(".mobile-nav-toggle");
            mobileToggle.querySelector(".menu-icon").classList.remove("hidden");
            mobileToggle.querySelector(".close-icon").classList.add("hidden");
        });
    });

    // Header buttons & Hero buttons routing
    document.getElementById("logo-btn").addEventListener("click", (e) => {
        e.preventDefault();
        switchSection("home-section");
        document.getElementById("nav-home").click();
    });

    document.getElementById("hero-donate-btn").addEventListener("click", () => {
        switchSection("donations-section");
        document.getElementById("nav-donations").click();
        document.getElementById("tab-requests").click();
    });

    document.getElementById("hero-help-btn").addEventListener("click", () => {
        switchSection("donations-section");
        document.getElementById("nav-donations").click();
        document.getElementById("tab-request-form").click();
    });

    function switchSection(targetId) {
        sections.forEach(sec => {
            if (sec.id === targetId) {
                sec.classList.add("active-section");
                sec.classList.remove("hidden");
            } else {
                sec.classList.remove("active-section");
                sec.classList.add("hidden");
            }
        });
        window.scrollTo(0, 0);
    }

    // Mobile nav toggle
    const mobileToggle = document.querySelector(".mobile-nav-toggle");
    mobileToggle.addEventListener("click", () => {
        const nav = document.querySelector(".main-nav");
        const isOpen = nav.classList.toggle("active");
        
        mobileToggle.querySelector(".menu-icon").classList.toggle("hidden", isOpen);
        mobileToggle.querySelector(".close-icon").classList.toggle("hidden", !isOpen);
    });

    // --- NOTIFICATION SYSTEM ---
    notifBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        notifMenu.classList.toggle("hidden");
    });

    clearNotifBtn.addEventListener("click", () => {
        state.setNotifications([]);
        renderNotifications();
        showToast("Notificações limpas.");
    });

    function addNotification(text) {
        const notifs = state.getNotifications();
        notifs.unshift({ id: Date.now(), text, read: false });
        state.setNotifications(notifs);
        renderNotifications();
    }

    function renderNotifications() {
        const notifs = state.getNotifications();
        const unreadCount = notifs.filter(n => !n.read).length;
        
        if (unreadCount > 0) {
            notifBadge.innerText = unreadCount;
            notifBadge.classList.remove("hidden");
        } else {
            notifBadge.classList.add("hidden");
        }
        
        notificationList.innerHTML = "";
        if (notifs.length === 0) {
            notificationList.innerHTML = `<li class="no-notif">Nenhuma notificação por enquanto.</li>`;
            return;
        }

        notifs.forEach(n => {
            const li = document.createElement("li");
            li.className = n.read ? "read" : "unread";
            li.innerHTML = `
                <p>${n.text}</p>
                <span class="notif-time">Agora</span>
            `;
            li.addEventListener("click", () => {
                n.read = true;
                state.setNotifications(notifs);
                renderNotifications();
            });
            notificationList.appendChild(li);
        });
    }

    // --- AUTH MODALS & USER CONTROLLER ---
    openLoginBtn.addEventListener("click", () => loginModal.classList.remove("hidden"));
    openRegisterBtn.addEventListener("click", () => registerModal.classList.remove("hidden"));
    closeLoginBtn.addEventListener("click", () => loginModal.classList.add("hidden"));
    closeRegisterBtn.addEventListener("click", () => registerModal.classList.add("hidden"));
    switchToRegister.addEventListener("click", (e) => {
        e.preventDefault();
        loginModal.classList.add("hidden");
        registerModal.classList.remove("hidden");
    });

    promptLoginBtn.addEventListener("click", () => {
        loginModal.classList.remove("hidden");
    });

    // Switch between Common Person and ONG register form tabs
    roleTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            roleTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            
            const role = tab.getAttribute("data-role");
            if (role === "common") {
                registerCommonForm.classList.remove("hidden");
                registerOngForm.classList.add("hidden");
            } else {
                registerCommonForm.classList.add("hidden");
                registerOngForm.classList.remove("hidden");
            }
        });
    });

    // Simulate Document selection name display
    const fileInput = document.getElementById("reg-ong-doc");
    const fileNameSpan = document.getElementById("file-upload-name");
    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            fileNameSpan.innerText = `Arquivo carregado: ${e.target.files[0].name}`;
            fileNameSpan.style.color = 'var(--color-primary)';
        }
    });

    // Common register submission
    registerCommonForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const users = state.getUsers();
        
        const email = document.getElementById("reg-common-email").value;
        if (users.find(u => u.email === email)) {
            showToast("Erro: E-mail já cadastrado.", "danger");
            return;
        }

        const pass = document.getElementById("reg-common-pass").value;
        const passConfirm = document.getElementById("reg-common-pass-confirm").value;
        if (pass !== passConfirm) {
            showToast("Erro: Senhas não conferem.", "danger");
            return;
        }

        const newUser = {
            id: `u-${Date.now()}`,
            name: document.getElementById("reg-common-name").value,
            cpf: document.getElementById("reg-common-cpf").value,
            email: email,
            phone: document.getElementById("reg-common-phone").value,
            address: document.getElementById("reg-common-address").value,
            password: pass,
            role: "common"
        };

        users.push(newUser);
        state.setUsers(users);
        
        showToast("Conta criada com sucesso! Faça login para continuar.");
        registerModal.classList.add("hidden");
        loginModal.classList.remove("hidden");
    });

    // ONG register submission
    registerOngForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const users = state.getUsers();
        
        const email = document.getElementById("reg-ong-email").value;
        if (users.find(u => u.email === email)) {
            showToast("Erro: E-mail institucional já cadastrado.", "danger");
            return;
        }

        const pass = document.getElementById("reg-ong-pass").value;
        const passConfirm = document.getElementById("reg-ong-pass-confirm").value;
        if (pass !== passConfirm) {
            showToast("Erro: Senhas não conferem.", "danger");
            return;
        }

        const docFile = fileInput.files[0];
        const newOng = {
            id: `u-${Date.now()}`,
            name: document.getElementById("reg-ong-name").value,
            cnpj: document.getElementById("reg-ong-cnpj").value,
            email: email,
            phone: document.getElementById("reg-ong-phone").value,
            respName: document.getElementById("reg-ong-resp-name").value,
            respCpf: document.getElementById("reg-ong-resp-cpf").value,
            address: document.getElementById("reg-ong-address").value,
            password: pass,
            role: "ong",
            docName: docFile ? docFile.name : "documento_verificacao.pdf",
            status: "pending", // Always pending admin validation
            verified: false
        };

        users.push(newOng);
        state.setUsers(users);
        
        showToast("Solicitação de cadastro da ONG enviada! A equipe de segurança analisará os documentos.", "warning");
        addNotification(`Novo cadastro de ONG pendente: ${newOng.name}`);
        registerModal.classList.add("hidden");
        
        renderAdminPanel();
    });

    // Login Form Submission
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const pass = document.getElementById("login-password").value;
        
        const users = state.getUsers();
        const user = users.find(u => u.email === email && u.password === pass);

        if (!user) {
            showToast("Erro: Credenciais inválidas.", "danger");
            return;
        }

        performLogin(user);
    });

    // Quick Admin Login
    adminQuickLogin.addEventListener("click", () => {
        const admin = state.getUsers().find(u => u.role === "admin");
        performLogin(admin);
    });

    function performLogin(user) {
        state.setCurrentUser(user);
        updateUserAuthUI();
        loginModal.classList.add("hidden");
        showToast(`Bem-vindo, ${user.name}!`);
        
        if (user.role === "admin") {
            document.querySelectorAll(".admin-only").forEach(el => el.classList.remove("hidden"));
        } else {
            document.querySelectorAll(".admin-only").forEach(el => el.classList.add("hidden"));
        }
        
        // Render panels and forms based on credentials
        renderAdminPanel();
        updateHelpRequestFormState();
        renderRequests();
        chatWidget.classList.remove("hidden");
    }

    logoutBtn.addEventListener("click", () => {
        state.setCurrentUser(null);
        updateUserAuthUI();
        showToast("Você saiu da sua conta.");
        document.querySelectorAll(".admin-only").forEach(el => el.classList.add("hidden"));
        switchSection("home-section");
        document.getElementById("nav-home").click();
        updateHelpRequestFormState();
        renderRequests();
        chatWidget.classList.add("hidden");
        chatWindow.classList.add("hidden");
    });

    function updateUserAuthUI() {
        if (state.currentUser) {
            userAuthZone.classList.add("hidden");
            userProfileZone.classList.remove("hidden");
            userDisplayName.innerText = state.currentUser.name;
            userAvatarChar.innerText = state.currentUser.name.charAt(0);
            
            let roleText = "Doador";
            if (state.currentUser.role === "admin") roleText = "Administrador";
            if (state.currentUser.role === "ong") {
                roleText = state.currentUser.verified ? "ONG Verificada" : "ONG Pendente";
            }
            userDisplayRole.innerText = roleText;
            
            if (state.currentUser.role === "admin") {
                document.querySelectorAll(".admin-only").forEach(el => el.classList.remove("hidden"));
            }
            chatWidget.classList.remove("hidden");
        } else {
            userAuthZone.classList.remove("hidden");
            userProfileZone.classList.add("hidden");
            chatWidget.classList.add("hidden");
        }
    }

    function updateHelpRequestFormState() {
        if (state.currentUser && state.currentUser.role === "common") {
            helpRequestAuthPrompt.classList.add("hidden");
            helpRequestForm.classList.remove("hidden");
        } else {
            helpRequestAuthPrompt.classList.remove("hidden");
            helpRequestForm.classList.add("hidden");
        }
    }

    // --- BASKET AUTOMATIC SUGGESTIONS ---
    reqFamilyMembers.addEventListener("input", calculateBasketSuggestion);
    
    function calculateBasketSuggestion() {
        const size = parseInt(reqFamilyMembers.value) || 1;
        
        let title = "";
        let desc = "";
        
        if (size <= 2) {
            title = "Sugestão Automática: Cesta Pequena";
            desc = "Recomendado para residências de 1 a 2 pessoas. Contém alimentos essenciais secos (arroz, feijão, óleo, sal, açúcar) para abastecer a quinzena.";
        } else if (size >= 3 && size <= 5) {
            title = "Sugestão Automática: Cesta Média";
            desc = "Recomendado para residências de 3 a 5 pessoas. Contém porções extras de grãos, macarrão, extrato de tomate, leite em pó e biscoitos, além de sabonete e pasta dental adicionais.";
        } else {
            title = "Sugestão Automática: Cesta Grande";
            desc = "Recomendado para residências de 6 ou mais pessoas. Contém sacos de grãos de 5kg, óleo adicional, enlatados diversos, aveia, achocolatado e um kit higiene reforçado (xampu, desodorante, papel higiênico).";
        }

        suggestionTitle.innerText = title;
        suggestionDesc.innerText = desc;
    }

    // Submit Help Request
    helpRequestForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const size = parseInt(reqFamilyMembers.value) || 1;
        let basketType = "Cesta Pequena";
        if (size >= 3 && size <= 5) basketType = "Cesta Média";
        if (size >= 6) basketType = "Cesta Grande";

        const reqs = state.getRequests();
        const newReq = {
            id: `req-${Date.now()}`,
            userId: state.currentUser.id,
            name: `Família de ${state.currentUser.name}`,
            type: document.getElementById("req-family-type").value,
            familySize: size,
            kids: parseInt(document.getElementById("req-family-kids").value) || 0,
            elderly: parseInt(document.getElementById("req-family-elderly").value) || 0,
            special: document.getElementById("req-family-special").value || "Nenhuma",
            frequency: document.getElementById("req-family-frequency").value,
            description: document.getElementById("req-family-desc").value,
            date: new Date().toISOString().split('T')[0],
            status: "active",
            basketType: basketType
        };

        reqs.unshift(newReq);
        state.setRequests(reqs);
        
        showToast("Sua solicitação de ajuda foi enviada com sucesso! As ONGs cadastradas foram notificadas.");
        addNotification(`Nova solicitação de ajuda publicada por: ${state.currentUser.name}`);
        
        // Reset form
        helpRequestForm.reset();
        calculateBasketSuggestion();
        
        // Switch to requests list
        document.getElementById("tab-requests").click();
        renderRequests();
    });

    // --- TAB SWITCHER FOR PORTAL ---
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const tabId = btn.getAttribute("data-tab");
            tabContents.forEach(content => {
                content.classList.toggle("active", content.id === tabId);
            });
        });
    });

    // --- MAP SIMULATION CONTROLS ---
    openMapBtn.addEventListener("click", () => mapContainer.classList.toggle("hidden"));
    closeMapBtn.addEventListener("click", () => mapContainer.classList.add("hidden"));

    mapPins.forEach(pin => {
        pin.addEventListener("click", () => {
            const title = pin.getAttribute("data-title");
            const need = pin.getAttribute("data-need");
            
            mapInfoTitle.innerText = title;
            mapInfoDesc.innerText = `Necessidade cadastrada: ${need}. Localização a menos de 3km de você.`;
            mapInfoAction.classList.remove("hidden");
            
            mapInfoAction.onclick = () => {
                showToast(`Iniciando conexão para ajudar: ${title}`);
                mapContainer.classList.add("hidden");
                
                // Switch to chat with target context
                activeChatRecipient = title;
                openChatWindow();
            };
        });
    });

    // --- RENDER PORTAL ITEMS ---
    function renderRequests() {
        const reqs = state.getRequests();
        const users = state.getUsers();
        
        requestsGrid.innerHTML = "";
        
        const filterVal = filterType.value;
        const searchVal = reqSearch.value.toLowerCase();

        const filtered = reqs.filter(r => {
            const matchesType = filterVal === "all" || r.type === filterVal;
            const matchesSearch = r.name.toLowerCase().includes(searchVal) || 
                                  r.description.toLowerCase().includes(searchVal) ||
                                  r.type.toLowerCase().includes(searchVal);
            return matchesType && matchesSearch;
        });

        if (filtered.length === 0) {
            requestsGrid.innerHTML = `<div class="col-12 text-center" style="grid-column: span 3; padding: 40px;"><p>Nenhum pedido de ajuda encontrado correspondente aos filtros.</p></div>`;
            return;
        }

        filtered.forEach(r => {
            const userCard = users.find(u => u.id === r.userId);
            const verifiedLabel = (userCard && userCard.role === "ong" && userCard.verified) 
                ? `<div class="verified-badge"><i data-lucide="shield-check"></i> ONG Verificada</div>` 
                : "";

            const card = document.createElement("div");
            card.className = "request-card";
            
            let iconName = "apple";
            if (r.type === "Higiene") iconName = "soap";
            if (r.type === "Roupas") iconName = "shirt";
            if (r.type === "Móveis") iconName = "sofa";
            
            card.innerHTML = `
                <div class="card-header-img">
                    <div class="card-header-icon"><i data-lucide="${iconName}"></i></div>
                    <span class="card-tag">${r.type}</span>
                </div>
                <div class="card-body">
                    <div class="card-details">
                        <h3>${r.name}</h3>
                        <div class="card-meta">
                            <span><i data-lucide="calendar"></i> ${r.date}</span>
                            <span><i data-lucide="package"></i> ${r.basketType || 'Cesta'}</span>
                        </div>
                        <p class="card-desc-text">"${r.description}"</p>
                        <div class="family-badge-container">
                            <span class="f-badge">Membros: ${r.familySize}</span>
                            ${r.kids > 0 ? `<span class="f-badge">Crianças: ${r.kids}</span>` : ""}
                            ${r.elderly > 0 ? `<span class="f-badge">Idosos: ${r.elderly}</span>` : ""}
                        </div>
                        ${verifiedLabel}
                    </div>
                    <button class="btn btn-primary full-width mt-3 donate-action-btn" data-recipient="${r.name}">
                        <i data-lucide="heart-handshake"></i> Quero Ajudar
                    </button>
                </div>
            `;
            requestsGrid.appendChild(card);
        });

        // Re-run Lucide to render newly added buttons
        lucide.createIcons();

        // Bind donate buttons
        document.querySelectorAll(".donate-action-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const rec = btn.getAttribute("data-recipient");
                activeChatRecipient = rec;
                openChatWindow();
                showToast(`Chat de conversa aberto com ${rec}. Combine os termos da doação.`);
            });
        });
    }

    reqSearch.addEventListener("input", renderRequests);
    filterType.addEventListener("change", renderRequests);

    function renderCampaigns() {
        const camps = state.getCampaigns();
        campaignsGrid.innerHTML = "";
        
        camps.forEach(c => {
            const percent = Math.min(Math.round((c.current / c.target) * 100), 100);
            
            const card = document.createElement("div");
            card.className = "campaign-card";
            
            let iconName = "package";
            if (c.type === "Alimentos") iconName = "apple";
            if (c.type === "Roupas") iconName = "shirt";

            card.innerHTML = `
                <div class="card-header-img">
                    <div class="card-header-icon"><i data-lucide="${iconName}"></i></div>
                    <span class="card-tag">${c.type}</span>
                </div>
                <div class="card-body">
                    <div class="card-details">
                        <h3>${c.title}</h3>
                        <div class="card-meta">
                            <span><i data-lucide="building-2"></i> ${c.ongName}</span>
                            <div class="verified-badge"><i data-lucide="shield-check"></i> Verificada</div>
                        </div>
                        <p class="card-desc-text">${c.description}</p>
                        
                        <div class="campaign-progress-bar">
                            <div class="progress-fill" style="width: ${percent}%;"></div>
                        </div>
                        <div class="progress-text">
                            <span>Arrecadado: ${c.current}</span>
                            <span>Meta: ${c.target} (${percent}%)</span>
                        </div>
                    </div>
                    <button class="btn btn-secondary full-width campaign-donate-btn" data-id="${c.id}" data-title="${c.title}">
                        <i data-lucide="heart"></i> Contribuir
                    </button>
                </div>
            `;
            campaignsGrid.appendChild(card);
        });

        lucide.createIcons();

        document.querySelectorAll(".campaign-donate-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                const title = btn.getAttribute("data-title");
                
                // Simulate increasing campaign contributions
                const camps = state.getCampaigns();
                const camp = camps.find(c => c.id === id);
                if (camp) {
                    camp.current += 5;
                    state.setCampaigns(camps);
                    renderCampaigns();
                    showToast(`Obrigado! Você contribuiu com 5 itens para a campanha: ${title}`);
                    addNotification(`Você contribuiu com a campanha: ${title}`);
                    renderDeliveryHistory();
                }
            });
        });
    }

    // --- PAYMENT GATEWAY SIMULATION ---
    payMethodBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            payMethodBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const method = btn.getAttribute("data-method");
            if (method === "pix") {
                pixPaymentFlow.classList.remove("hidden");
                cardPaymentFlow.classList.add("hidden");
            } else {
                pixPaymentFlow.classList.add("hidden");
                cardPaymentFlow.classList.remove("hidden");
            }
        });
    });

    valBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            valBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            customDonationVal.value = "";
        });
    });

    customDonationVal.addEventListener("input", () => {
        valBtns.forEach(b => b.classList.remove("active"));
    });

    generatePixBtn.addEventListener("click", () => {
        pixQrContainer.classList.remove("hidden");
        showToast("QR Code PIX gerado com segurança.");
    });

    copyPixBtn.addEventListener("click", () => {
        const input = document.getElementById("pix-key");
        input.select();
        document.execCommand("copy");
        showToast("Chave Pix Copiada!");
    });

    confirmPixBtn.addEventListener("click", () => {
        let val = 50;
        const activeValBtn = document.querySelector(".val-btn.active");
        if (activeValBtn) {
            val = activeValBtn.getAttribute("data-val");
        } else if (customDonationVal.value) {
            val = customDonationVal.value;
        }

        showToast(`Doação de R$ ${val} via Pix realizada com sucesso!`);
        pixQrContainer.classList.add("hidden");
        addNotification(`Obrigado por doar R$ ${val} para a manutenção da rede!`);
        
        // Log in transparency delivery history
        const hist = state.getHistory();
        hist.unshift({
            recipient: "Rede de Alimentos Geral",
            type: "Dinheiro",
            details: `Doação Financeira de R$ ${val}`,
            donor: state.currentUser ? state.currentUser.name : "Anônimo",
            date: new Date().toISOString().split('T')[0],
            status: "delivered"
        });
        state.setHistory(hist);
        renderDeliveryHistory();
    });

    cardDonationForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const val = document.getElementById("card-value").value;
        
        showToast(`Doação de R$ ${val} via Cartão de Crédito aprovada!`, "success");
        cardDonationForm.reset();
        
        // Log in transparency delivery history
        const hist = state.getHistory();
        hist.unshift({
            recipient: "Rede de Alimentos Geral",
            type: "Dinheiro",
            details: `Doação Financeira de R$ ${val}`,
            donor: state.currentUser ? state.currentUser.name : "Anônimo",
            date: new Date().toISOString().split('T')[0],
            status: "delivered"
        });
        state.setHistory(hist);
        renderDeliveryHistory();
        addNotification(`Doação de R$ ${val} via Cartão processada com sucesso.`);
    });

    // --- TRANSPARENCY HISTORY RENDERING ---
    function renderDeliveryHistory() {
        const history = state.getHistory();
        deliveryHistoryTbody.innerHTML = "";
        
        history.forEach(item => {
            const tr = document.createElement("tr");
            
            let statusPill = "";
            if (item.status === "delivered") statusPill = `<span class="status-pill delivered">Entregue</span>`;
            if (item.status === "pending") statusPill = `<span class="status-pill pending">Pendente</span>`;
            if (item.status === "canceled") statusPill = `<span class="status-pill canceled">Cancelado</span>`;

            tr.innerHTML = `
                <td><strong>${item.recipient}</strong></td>
                <td>${item.type}</td>
                <td>${item.details}</td>
                <td>${item.donor}</td>
                <td>${item.date}</td>
                <td>${statusPill}</td>
            `;
            deliveryHistoryTbody.appendChild(tr);
        });
    }

    // --- INTERACTIVE CHAT SYSTEM ---
    chatToggle.addEventListener("click", () => {
        chatWindow.classList.toggle("hidden");
        // Clear message count badge
        chatNotifBadge.classList.add("hidden");
        chatNotifBadge.innerText = "0";
        
        if (!chatWindow.classList.contains("hidden")) {
            if (!activeChatRecipient) {
                activeChatRecipient = "Família Silva"; // Default demo chat
            }
            openChatWindow();
        }
    });

    chatClose.addEventListener("click", () => chatWindow.classList.add("hidden"));

    function openChatWindow() {
        chatWindow.classList.remove("hidden");
        chatActiveName.innerText = activeChatRecipient;
        chatActiveAvatar.innerText = activeChatRecipient.charAt(0);
        
        renderChatMessages();
    }

    function renderChatMessages() {
        const chats = state.getChats();
        const userConversation = chats[activeChatRecipient] || [
            { sender: "received", text: `Olá! Vi que você quer ajudar com as doações. Como podemos combinar a entrega?`, time: "18:40" }
        ];
        
        // Save initial message if new conversation
        if (!chats[activeChatRecipient]) {
            chats[activeChatRecipient] = userConversation;
            state.setChats(chats);
        }

        chatBody.innerHTML = "";
        userConversation.forEach(msg => {
            const div = document.createElement("div");
            div.className = `chat-message ${msg.sender}`;
            div.innerHTML = `<p>${msg.text}</p>`;
            chatBody.appendChild(div);
        });
        
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    chatInputForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = chatInputText.value.trim();
        if (!text) return;

        const chats = state.getChats();
        const conv = chats[activeChatRecipient];
        
        const now = new Date();
        const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        conv.push({ sender: "sent", text, time: timeStr });
        chats[activeChatRecipient] = conv;
        state.setChats(chats);
        
        chatInputText.value = "";
        renderChatMessages();

        // Simulate automatic empathetic reply
        setTimeout(() => {
            const replies = [
                "Que ótimo! Podemos combinar de entregar neste sábado à tarde?",
                "Sim! Muito obrigado pelo apoio de coração.",
                "Perfeito. O endereço para entrega é a sede da nossa ONG.",
                "Deus abençoe sua generosidade. Fico no aguardo!"
            ];
            const randomReply = replies[Math.floor(Math.random() * replies.length)];
            
            conv.push({ sender: "received", text: randomReply, time: timeStr });
            chats[activeChatRecipient] = conv;
            state.setChats(chats);
            
            renderChatMessages();
            
            // Show badge if chat is minimized
            if (chatWindow.classList.contains("hidden")) {
                chatNotifBadge.innerText = parseInt(chatNotifBadge.innerText || 0) + 1;
                chatNotifBadge.classList.remove("hidden");
            }
            showToast(`Nova mensagem de ${activeChatRecipient}`);
        }, 2000);
    });

    // --- ADMIN PANEL CONTROLLER ---
    function renderAdminPanel() {
        const users = state.getUsers();
        const camps = state.getCampaigns();
        const comps = state.getComplaints();

        // 1. Pending ONGs
        adminPendingOngsTbody.innerHTML = "";
        const pendingOngs = users.filter(u => u.role === "ong" && u.status === "pending");
        
        if (pendingOngs.length === 0) {
            adminPendingOngsTbody.innerHTML = `<tr><td colspan="5" class="text-center">Nenhuma ONG aguardando validação documental.</td></tr>`;
        } else {
            pendingOngs.forEach(ong => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><strong>${ong.name}</strong></td>
                    <td>${ong.cnpj}</td>
                    <td>${ong.respName}</td>
                    <td><a href="#" class="view-doc-btn" data-ong-id="${ong.id}"><i data-lucide="file-text"></i> ${ong.docName}</a></td>
                    <td>
                        <button class="btn btn-success btn-sm approve-ong-btn" data-ong-id="${ong.id}">Aprovar</button>
                        <button class="btn btn-secondary btn-sm reject-ong-btn" style="background-color: var(--color-danger); color: white;" data-ong-id="${ong.id}">Reprovar</button>
                    </td>
                `;
                adminPendingOngsTbody.appendChild(tr);
            });
        }

        // 2. Campaigns Admin view
        adminCampaignsTbody.innerHTML = "";
        camps.forEach(c => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${c.title}</strong></td>
                <td>${c.ongName}</td>
                <td>${c.current} / ${c.target}</td>
                <td>${Math.round((c.current / c.target) * 100)}%</td>
                <td><span class="status-pill delivered">Ativa</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm block-campaign-btn" data-id="${c.id}">Pausar</button>
                </td>
            `;
            adminCampaignsTbody.appendChild(tr);
        });

        // 3. Fraud / Complaints
        adminComplaintsList.innerHTML = "";
        comps.forEach(c => {
            const li = document.createElement("li");
            li.innerHTML = `
                <div class="complaint-header">
                    <span>${c.reportedName}</span>
                    <span class="complaint-reason">${c.reason}</span>
                </div>
                <div class="complaint-meta" style="font-size: 0.75rem; color: var(--color-text-muted); display: flex; justify-content: space-between; margin-top: 4px;">
                    <span>Data: ${c.date}</span>
                    <span class="status-badge" style="font-weight: 700;">${c.status.toUpperCase()}</span>
                </div>
            `;
            adminComplaintsList.appendChild(li);
        });

        lucide.createIcons();
        bindAdminEvents();
    }

    function bindAdminEvents() {
        // Approve ONG
        document.querySelectorAll(".approve-ong-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-ong-id");
                const users = state.getUsers();
                const ong = users.find(u => u.id === id);
                if (ong) {
                    ong.status = "approved";
                    ong.verified = true;
                    state.setUsers(users);
                    showToast(`ONG ${ong.name} foi validada com sucesso! Emitindo selo Verificado.`);
                    addNotification(`ONG '${ong.name}' foi aprovada pela moderação.`);
                    
                    // Automatically append to history/transparency
                    const hist = state.getHistory();
                    hist.unshift({
                        recipient: ong.name,
                        type: "Certificação",
                        details: "Validada e Certificada no Portal",
                        donor: "Moderação",
                        date: new Date().toISOString().split('T')[0],
                        status: "delivered"
                    });
                    state.setHistory(hist);
                    
                    renderAdminPanel();
                    updateUserAuthUI();
                    
                    // Show digital certificate modal for approved ONG
                    openCertificateModal(ong);
                }
            });
        });

        // Reject ONG
        document.querySelectorAll(".reject-ong-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-ong-id");
                const users = state.getUsers();
                const ong = users.find(u => u.id === id);
                if (ong) {
                    ong.status = "rejected";
                    state.setUsers(users);
                    showToast(`Cadastro da ONG ${ong.name} foi rejeitado.`, "danger");
                    addNotification(`Cadastro da ONG '${ong.name}' foi reprovado por inconsistência de dados.`);
                    renderAdminPanel();
                }
            });
        });

        // View simulated docs
        document.querySelectorAll(".view-doc-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const id = btn.getAttribute("data-ong-id");
                const users = state.getUsers();
                const ong = users.find(u => u.id === id);
                if (ong) {
                    alert(`[Simulação Visual de Documentos]\n\nONG: ${ong.name}\nCNPJ: ${ong.cnpj}\nResponsável Legal: ${ong.respName}\nCPF Responsável: ${ong.respCpf}\n\nDocumento Enviado: "${ong.docName}" (Verificado por assinatura digital criptografada contra fraudes).`);
                }
            });
        });

        // Pause campaign
        document.querySelectorAll(".block-campaign-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                showToast("Campanha pausada administrativamente para auditoria de segurança.", "warning");
            });
        });
    }

    // --- CERTIFICATE MODAL CONTROLS ---
    function openCertificateModal(ong) {
        certificateModal.classList.remove("hidden");
        certOngName.innerText = ong.name.toUpperCase();
        certOngCnpj.innerText = ong.cnpj;
        
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth()+1).padStart(2, '0')}/${now.getFullYear()}`;
        certDate.innerText = `Emitido em: ${dateStr}`;
        certCode.innerText = `Código: PS-${Math.floor(10000 + Math.random() * 90000)}-${ong.cnpj.substring(0, 2)}`;
    }

    closeCertModalBtn.addEventListener("click", () => certificateModal.classList.add("hidden"));
    
    printCertBtn.addEventListener("click", () => {
        window.print();
        showToast("Comprovante de Certificado impresso com sucesso.");
    });
});
