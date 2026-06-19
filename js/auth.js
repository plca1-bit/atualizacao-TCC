/* ==========================================
   PONTE SOLIDÁRIA - ENGINE JAVASCRIPT (AUTH & APP)
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
document.addEventListener("includesLoaded", () => {
    if (window.lucide) lucide.createIcons();

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

    // Developer Images (Protegido contra elementos ausentes)
    const devPhoto1 = document.getElementById("dev-photo-1");
    if (devPhoto1) {
        devPhoto1.src = "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80";
        const devPhoto2 = document.getElementById("dev-photo-2");
        if (devPhoto2) devPhoto2.src = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80";
        const devPhoto3 = document.getElementById("dev-photo-3");
        if (devPhoto3) devPhoto3.src = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80";
    }

    let activeChatRecipient = null;

    // --- APPLICATION STARTUP ---
    applyTheme();
    applyLanguage();
    if (typeof updateUserAuthUI === "function") updateUserAuthUI();
    if (typeof renderRequests === "function") renderRequests();
    if (typeof renderCampaigns === "function") renderCampaigns();
    if (typeof renderDeliveryHistory === "function") renderDeliveryHistory();
    if (typeof renderNotifications === "function") renderNotifications();

    // --- TOAST NOTIFICATIONS ---
    function showToast(message, type = "success") {
        const container = document.getElementById("toast-container");
        if (!container) return;
        
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
        if (window.lucide) lucide.createIcons();
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(50px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // --- SYSTEM THEME ---
    function applyTheme() {
        if (!body) return;
        body.className = state.theme;
        
        if (themeBtn) {
            const darkIcon = themeBtn.querySelector(".dark-icon");
            const lightIcon = themeBtn.querySelector(".light-icon");
            
            if (state.theme === "dark-mode") {
                if (darkIcon) darkIcon.classList.add("hidden");
                if (lightIcon) lightIcon.classList.remove("hidden");
            } else {
                if (darkIcon) darkIcon.classList.remove("hidden");
                if (lightIcon) lightIcon.classList.add("hidden");
            }
        }
    }

    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            state.theme = state.theme === "light-mode" ? "dark-mode" : "light-mode";
            localStorage.setItem("ps_theme", state.theme);
            applyTheme();
        });
    }

    // --- LANGUAGE SYSTEM ---
    function applyLanguage() {
        if (currentLangCode) {
            currentLangCode.innerText = state.lang === "pt-BR" ? "PT" : "EN";
        }
        const dictionary = translations[state.lang];
        if (!dictionary) return;
        
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

    if (langBtn) {
        langBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (langMenu) langMenu.classList.toggle("hidden");
        });
    }

    document.querySelectorAll(".lang-option").forEach(opt => {
        opt.addEventListener("click", () => {
            state.lang = opt.getAttribute("data-lang");
            localStorage.setItem("ps_lang", state.lang);
            applyLanguage();
            if (langMenu) langMenu.classList.add("hidden");
            showToast(state.lang === "pt-BR" ? "Idioma alterado para Português!" : "Language switched to English!");
        });
    });

    document.addEventListener("click", () => {
        if (langMenu) langMenu.classList.add("hidden");
        if (notifMenu) notifMenu.classList.add("hidden");
    });

    // --- ROUTING / SWITCH VIEW ---
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const targetId = link.getAttribute("data-target");
            switchSection(targetId);
            
            navLinks.forEach(nl => nl.classList.remove("active"));
            link.classList.add("active");
            
            const mainNav = document.querySelector(".main-nav");
            if (mainNav) mainNav.classList.remove("active");
            
            const mobileToggle = document.querySelector(".mobile-nav-toggle");
            if (mobileToggle) {
                const menuIcon = mobileToggle.querySelector(".menu-icon");
                const closeIcon = mobileToggle.querySelector(".close-icon");
                if (menuIcon) menuIcon.classList.remove("hidden");
                if (closeIcon) closeIcon.classList.add("hidden");
            }
        });
    });

    const logoBtn = document.getElementById("logo-btn");
    if (logoBtn) {
        logoBtn.addEventListener("click", (e) => {
            e.preventDefault();
            switchSection("home-section");
            const navHome = document.getElementById("nav-home");
            if (navHome) navHome.click();
        });
    }

    const heroDonateBtn = document.getElementById("hero-donate-btn");
    if (heroDonateBtn) {
        heroDonateBtn.addEventListener("click", () => {
            switchSection("donations-section");
            const navDonations = document.getElementById("nav-donations");
            const tabRequests = document.getElementById("tab-requests");
            if (navDonations) navDonations.click();
            if (tabRequests) tabRequests.click();
        });
    }

    const heroHelpBtn = document.getElementById("hero-help-btn");
    if (heroHelpBtn) {
        heroHelpBtn.addEventListener("click", () => {
            switchSection("donations-section");
            const navDonations = document.getElementById("nav-donations");
            const tabRequestForm = document.getElementById("tab-request-form");
            if (navDonations) navDonations.click();
            if (tabRequestForm) tabRequestForm.click();
        });
    }

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

    const mobileToggle = document.querySelector(".mobile-nav-toggle");
    if (mobileToggle) {
        mobileToggle.addEventListener("click", () => {
            const nav = document.querySelector(".main-nav");
            if (!nav) return;
            const isOpen = nav.classList.toggle("active");
            
            const menuIcon = mobileToggle.querySelector(".menu-icon");
            const closeIcon = mobileToggle.querySelector(".close-icon");
            if (menuIcon) menuIcon.classList.toggle("hidden", isOpen);
            if (closeIcon) closeIcon.classList.toggle("hidden", !isOpen);
        });
    }

    // --- NOTIFICATION SYSTEM ---
    if (notifBtn) {
        notifBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (notifMenu) notifMenu.classList.toggle("hidden");
        });
    }

    if (clearNotifBtn) {
        clearNotifBtn.addEventListener("click", () => {
            state.setNotifications([]);
            renderNotifications();
            showToast("Notificações limpas.");
        });
    }

    function addNotification(text) {
        const notifs = state.getNotifications();
        notifs.unshift({ id: Date.now(), text, read: false });
        state.setNotifications(notifs);
        renderNotifications();
    }

    function renderNotifications() {
        if (!notificationList) return;
        const notifs = state.getNotifications();
        const unreadCount = notifs.filter(n => !n.read).length;
        
        if (notifBadge) {
            if (unreadCount > 0) {
                notifBadge.innerText = unreadCount;
                notifBadge.classList.remove("hidden");
            } else {
                notifBadge.classList.add("hidden");
            }
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
    if (openLoginBtn) openLoginBtn.addEventListener("click", () => loginModal && loginModal.classList.remove("hidden"));
    if (openRegisterBtn) openRegisterBtn.addEventListener("click", () => registerModal && registerModal.classList.remove("hidden"));
    if (closeLoginBtn) closeLoginBtn.addEventListener("click", () => loginModal && loginModal.classList.add("hidden"));
    if (closeRegisterBtn) closeRegisterBtn.addEventListener("click", () => registerModal && registerModal.classList.add("hidden"));
    
    if (switchToRegister) {
        switchToRegister.addEventListener("click", (e) => {
            e.preventDefault();
            if (loginModal) loginModal.classList.add("hidden");
            if (registerModal) registerModal.classList.remove("hidden");
        });
    }

    if (promptLoginBtn) {
        promptLoginBtn.addEventListener("click", () => {
            if (loginModal) loginModal.classList.remove("hidden");
        });
    }

    roleTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            roleTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            
            const role = tab.getAttribute("data-role");
            if (role === "common") {
                if (registerCommonForm) registerCommonForm.classList.remove("hidden");
                if (registerOngForm) registerOngForm.classList.add("hidden");
            } else {
                if (registerCommonForm) registerCommonForm.classList.add("hidden");
                if (registerOngForm) registerOngForm.classList.remove("hidden");
            }
        });
    });

    const fileInput = document.getElementById("reg-ong-doc");
    const fileNameSpan = document.getElementById("file-upload-name");
    if (fileInput && fileNameSpan) {
        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                fileNameSpan.innerText = `Arquivo carregado: ${e.target.files[0].name}`;
                fileNameSpan.style.color = 'var(--color-primary)';
            }
        });
    }

    if (registerCommonForm) {
        registerCommonForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const users = state.getUsers();
            
            const emailEl = document.getElementById("reg-common-email");
            const email = emailEl ? emailEl.value : "";
            if (users.find(u => u.email === email)) {
                showToast("Erro: E-mail já cadastrado.", "danger");
                return;
            }

            const passEl = document.getElementById("reg-common-pass");
            const passConfirmEl = document.getElementById("reg-common-pass-confirm");
            const pass = passEl ? passEl.value : "";
            const passConfirm = passConfirmEl ? passConfirmEl.value : "";
            if (pass !== passConfirm) {
                showToast("Erro: Senhas não conferem.", "danger");
                return;
            }

            const nameEl = document.getElementById("reg-common-name");
            const cpfEl = document.getElementById("reg-common-cpf");
            const phoneEl = document.getElementById("reg-common-phone");
            const addressEl = document.getElementById("reg-common-address");

            const newUser = {
                id: `u-${Date.now()}`,
                name: nameEl ? nameEl.value : "",
                cpf: cpfEl ? cpfEl.value : "",
                email: email,
                phone: phoneEl ? phoneEl.value : "",
                address: addressEl ? addressEl.value : "",
                password: pass,
                role: "common"
            };

            users.push(newUser);
            state.setUsers(users);
            
            showToast("Conta criada com sucesso! Faça login para continuar.");
            if (registerModal) registerModal.classList.add("hidden");
            if (loginModal) loginModal.classList.remove("hidden");
        });
    }

    if (registerOngForm) {
        registerOngForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const users = state.getUsers();
            
            const emailEl = document.getElementById("reg-ong-email");
            const email = emailEl ? emailEl.value : "";
            if (users.find(u => u.email === email)) {
                showToast("Erro: E-mail institucional já cadastrado.", "danger");
                return;
            }

            const passEl = document.getElementById("reg-ong-pass");
            const passConfirmEl = document.getElementById("reg-ong-pass-confirm");
            const pass = passEl ? passEl.value : "";
            const passConfirm = passConfirmEl ? passConfirmEl.value : "";
            if (pass !== passConfirm) {
                showToast("Erro: Senhas não conferem.", "danger");
                return;
            }

            const nameEl = document.getElementById("reg-ong-name");
            const cnpjEl = document.getElementById("reg-ong-cnpj");
            const phoneEl = document.getElementById("reg-ong-phone");
            const respNameEl = document.getElementById("reg-ong-resp-name");
            const respCpfEl = document.getElementById("reg-ong-resp-cpf");
            const addressEl = document.getElementById("reg-ong-address");

            const docFile = fileInput && fileInput.files ? fileInput.files[0] : null;
            const newOng = {
                id: `u-${Date.now()}`,
                name: nameEl ? nameEl.value : "",
                cnpj: cnpjEl ? cnpjEl.value : "",
                email: email,
                phone: phoneEl ? phoneEl.value : "",
                respName: respNameEl ? respNameEl.value : "",
                respCpf: respCpfEl ? respCpfEl.value : "",
                address: addressEl ? addressEl.value : "",
                password: pass,
                role: "ong",
                docName: docFile ? docFile.name : "documento_verificacao.pdf",
                status: "pending",
                verified: false
            };

            users.push(newOng);
            state.setUsers(users);
            
            showToast("Solicitação de cadastro da ONG enviada! A equipe de segurança analisará os documentos.", "warning");
            addNotification(`Novo cadastro de ONG pendente: ${newOng.name}`);
            if (registerModal) registerModal.classList.add("hidden");
            
            renderAdminPanel();
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const emailEl = document.getElementById("login-email");
            const passEl = document.getElementById("login-password");
            const email = emailEl ? emailEl.value : "";
            const pass = passEl ? passEl.value : "";
            
            const users = state.getUsers();
            const user = users.find(u => u.email === email && u.password === pass);

            if (!user) {
                showToast("Erro: Credenciais inválidas.", "danger");
                return;
            }

            performLogin(user);
        });
    }

    if (adminQuickLogin) {
        adminQuickLogin.addEventListener("click", () => {
            const admin = state.getUsers().find(u => u.role === "admin");
            performLogin(admin);
        });
    }

    function performLogin(user) {
        state.setCurrentUser(user);
        if (typeof updateUserAuthUI === "function") updateUserAuthUI();
        if (loginModal) loginModal.classList.add("hidden");
        showToast(`Bem-vindo, ${user.name}!`);
        
        if (user.role === "admin") {
            document.querySelectorAll(".admin-only").forEach(el => el.classList.remove("hidden"));
        } else {
            document.querySelectorAll(".admin-only").forEach(el => el.classList.add("hidden"));
        }
        
        renderAdminPanel();
        if (typeof updateHelpRequestFormState === "function") updateHelpRequestFormState();
        if (typeof renderRequests === "function") renderRequests();
        if (chatWidget) chatWidget.classList.remove("hidden");
    }

    if (window.lucide) lucide.createIcons();

    document.querySelectorAll(".donate-action-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const rec = btn.getAttribute("data-recipient");
            activeChatRecipient = rec;
            openChatWindow();
            showToast(`Chat de conversa aberto com ${rec}. Combine os termos da doação.`);
        });
    });

    if (reqSearch) reqSearch.addEventListener("input", renderRequests);
    if (filterType) filterType.addEventListener("change", renderRequests);

    function renderCampaigns() {
        if (!campaignsGrid) return;
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

        if (window.lucide) lucide.createIcons();

        document.querySelectorAll(".campaign-donate-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                const title = btn.getAttribute("data-title");
                
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
                if (pixPaymentFlow) pixPaymentFlow.classList.remove("hidden");
                if (cardPaymentFlow) cardPaymentFlow.classList.add("hidden");
            } else {
                if (pixPaymentFlow) pixPaymentFlow.classList.add("hidden");
                if (cardPaymentFlow) cardPaymentFlow.classList.remove("hidden");
            }
        });
    });

    valBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            valBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            if (customDonationVal) customDonationVal.value = "";
        });
    });

    if (customDonationVal) {
        customDonationVal.addEventListener("input", () => {
            valBtns.forEach(b => b.classList.remove("active"));
        });
    }

    if (generatePixBtn) {
        generatePixBtn.addEventListener("click", () => {
            if (pixQrContainer) pixQrContainer.classList.remove("hidden");
            showToast("QR Code PIX gerado com segurança.");
        });
    }

    if (copyPixBtn) {
        copyPixBtn.addEventListener("click", () => {
            const input = document.getElementById("pix-key");
            if (input) {
                input.select();
                document.execCommand("copy");
                showToast("Chave Pix Copiada!");
            }
        });
    }

    if (confirmPixBtn) {
        confirmPixBtn.addEventListener("click", () => {
            let val = 50;
            const activeValBtn = document.querySelector(".val-btn.active");
            if (activeValBtn) {
                val = activeValBtn.getAttribute("data-val");
            } else if (customDonationVal && customDonationVal.value) {
                val = customDonationVal.value;
            }

            showToast(`Doação de R$ ${val} via Pix realizada com sucesso!`);
            if (pixQrContainer) pixQrContainer.classList.add("hidden");
            addNotification(`Obrigado por doar R$ ${val} para a manutenção da rede!`);
            
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
    }

    if (cardDonationForm) {
        cardDonationForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const cardValueEl = document.getElementById("card-value");
            const val = cardValueEl ? cardValueEl.value : "0";
            
            showToast(`Doação de R$ ${val} via Cartão de Crédito aprovada!`, "success");
            cardDonationForm.reset();
            
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
    }

    // --- TRANSPARENCY HISTORY RENDERING ---
    function renderDeliveryHistory() {
        if (!deliveryHistoryTbody) return;
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
    if (chatToggle) {
        chatToggle.addEventListener("click", () => {
            if (chatWindow) chatWindow.classList.toggle("hidden");
            if (chatNotifBadge) {
                chatNotifBadge.classList.add("hidden");
                chatNotifBadge.innerText = "0";
            }
            if (chatWindow && !chatWindow.classList.contains("hidden")) {
                if (!activeChatRecipient) {
                    activeChatRecipient = "Família Silva";
                }
                openChatWindow();
            }
        });
    }

    if (chatClose) {
        chatClose.addEventListener("click", () => {
            if (chatWindow) chatWindow.classList.add("hidden");
        });
    }

    function openChatWindow() {
        if (chatWindow) chatWindow.classList.remove("hidden");
        if (chatActiveName) chatActiveName.innerText = activeChatRecipient;
        if (chatActiveAvatar) chatActiveAvatar.innerText = activeChatRecipient ? activeChatRecipient.charAt(0) : "?";
        renderChatMessages();
    }

    function renderChatMessages() {
        if (!chatBody || !activeChatRecipient) return;
        const chats = state.getChats();
        const userConversation = chats[activeChatRecipient] || [
            { sender: "received", text: `Olá! Vi que você quer ajudar com as doações. Como podemos combinar a entrega?`, time: "18:40" }
        ];
        
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

    if (chatInputForm) {
        chatInputForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!chatInputText || !activeChatRecipient) return;
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
                
                if (chatWindow && chatWindow.classList.contains("hidden") && chatNotifBadge) {
                    chatNotifBadge.innerText = parseInt(chatNotifBadge.innerText || 0) + 1;
                    chatNotifBadge.classList.remove("hidden");
                }
                showToast(`Nova mensagem de ${activeChatRecipient}`);
            }, 2000);
        });
    }

    // --- ADMIN PANEL CONTROLLER ---
    function renderAdminPanel() {
        const users = state.getUsers();
        const camps = state.getCampaigns();
        const comps = state.getComplaints();

        if (adminPendingOngsTbody) {
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
        }

        if (adminCampaignsTbody) {
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
        }

        if (adminComplaintsList) {
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
        }

        if (window.lucide) lucide.createIcons();
        bindAdminEvents();
    }

    function bindAdminEvents() {
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
                    if (typeof updateUserAuthUI === "function") updateUserAuthUI();
                    openCertificateModal(ong);
                }
            });
        });

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

        document.querySelectorAll(".block-campaign-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                showToast("Campanha pausada administrativamente para auditoria de segurança.", "warning");
            });
        });
    }

    // --- CERTIFICATE MODAL CONTROLS ---
    function openCertificateModal(ong) {
        if (!certificateModal) return;
        certificateModal.classList.remove("hidden");
        if (certOngName) certOngName.innerText = ong.name.toUpperCase();
        if (certOngCnpj) certOngCnpj.innerText = ong.cnpj;
        
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth()+1).padStart(2, '0')}/${now.getFullYear()}`;
        if (certDate) certDate.innerText = `Emitido em: ${dateStr}`;
        if (certCode) certCode.innerText = `Código: PS-${Math.floor(10000 + Math.random() * 90000)}-${ong.cnpj.substring(0, 2)}`;
    }

    if (closeCertModalBtn) {
        closeCertModalBtn.addEventListener("click", () => {
            if (certificateModal) certificateModal.classList.add("hidden");
        });
    }
    
    if (printCertBtn) {
        printCertBtn.addEventListener("click", () => {
            window.print();
            showToast("Comprovante de Certificado impresso com sucesso.");
        });
    }
});