/* ==========================================
   PONTE SOLIDÁRIA - ENGINE JAVASCRIPT (AUTH & APP)
   ========================================== */

// 1. APPLICATION STATE CLASS
// Guarda só o que é real e usado de verdade em todo o site: usuário atual
// (espelho local do usuário autenticado no Firebase, para os outros módulos
// não precisarem esperar um roundtrip assíncrono toda hora) e preferências
// de tema/idioma. Dados de negócio (doações, pedidos, campanhas, histórico,
// notificações etc.) vivem só no Firestore — ver js/doacoes.js, js/fase6-engine.js
// e js/fase7-engine.js.
class AppState {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem("ps_current_user")) || null;
        this.theme = localStorage.getItem("ps_theme") || "light-mode";
        this.activeTab = "active-requests-tab";
    }

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

// Compatibilidade com os módulos de Doações e Administração.
window.appState = {
    get user() { return state.currentUser; },
    set user(user) { state.setCurrentUser(user); }
};

// 4. UI CONTROLLER AND EVENT LISTENERS
document.addEventListener("includesLoaded", () => {
    if (window.lucide) lucide.createIcons();

    // Elements Selectors
    const body = document.body;
    const navLinks = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll(".app-section");
    const themeBtn = document.getElementById("theme-toggle-btn");
    
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

    // Help request form selectors
    const promptLoginBtn = document.getElementById("prompt-login-btn");

    const deliveryHistoryTbody = document.getElementById("delivery-history-tbody");

    // Certificate

    // Chat: só controla a visibilidade do widget no login/logout — toda a
    // lógica de conversas (abrir, listar, enviar mensagem) é do js/chat.js
    // (chat real, ligado ao Firestore), para não ter dois sistemas de chat
    // disputando os mesmos botões.
    const chatWidget = document.getElementById("chat-widget-container");

    // Developer Images (Protegido contra elementos ausentes)
    const devPhoto1 = document.getElementById("dev-photo-1");
    if (devPhoto1) {
        devPhoto1.src = "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80";
        const devPhoto2 = document.getElementById("dev-photo-2");
        if (devPhoto2) devPhoto2.src = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80";
        const devPhoto3 = document.getElementById("dev-photo-3");
        if (devPhoto3) devPhoto3.src = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80";
    }

    // --- APPLICATION STARTUP ---
    applyTheme();
    if (typeof updateUserAuthUI === "function") updateUserAuthUI();
    if (typeof renderDeliveryHistory === "function") renderDeliveryHistory();

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
    // Também disponibiliza os avisos para as demais áreas da plataforma.
    window.showToast = showToast;

    // --- SYSTEM THEME ---
    function applyTheme() {
        if (!body) return;
        body.classList.remove("light-mode", "dark-mode");
        body.classList.add(state.theme);
        
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
            themeBtn.setAttribute("aria-pressed", String(state.theme === "dark-mode"));
            themeBtn.setAttribute("aria-label", state.theme === "dark-mode" ? "Ativar modo claro" : "Ativar modo escuro");
        }
    }

    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            state.theme = state.theme === "light-mode" ? "dark-mode" : "light-mode";
            localStorage.setItem("ps_theme", state.theme);
            applyTheme();
            showToast(state.theme === "dark-mode" ? "Modo escuro ativado." : "Modo claro ativado.", "info");
        });
    }

    document.addEventListener("click", () => {
        if (notifMenu) notifMenu.classList.add("hidden");
        if (notifBtn) notifBtn.setAttribute("aria-expanded", "false");
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
                mobileToggle.setAttribute("aria-expanded", "false");
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

    // 🔴 Correção: estes dois botões da Home apontavam para ids de aba
    // ("tab-requests"/"tab-request-form") que nunca existiram em
    // partials/sections/doacoes.html (as abas reais sempre foram
    // "tab-items"/"tab-help") — getElementById devolvia null e os botões só
    // trocavam de seção, sem abrir a aba certa dentro do Portal de Doações.
    const heroDonateBtn = document.getElementById("hero-donate-btn");
    if (heroDonateBtn) {
        heroDonateBtn.addEventListener("click", () => {
            switchSection("donations-section");
            const navDonations = document.getElementById("nav-donations");
            const tabItems = document.getElementById("tab-items");
            if (navDonations) navDonations.click();
            if (tabItems) tabItems.click();
        });
    }

    const heroHelpBtn = document.getElementById("hero-help-btn");
    if (heroHelpBtn) {
        heroHelpBtn.addEventListener("click", () => {
            switchSection("donations-section");
            const navDonations = document.getElementById("nav-donations");
            const tabHelp = document.getElementById("tab-help");
            if (navDonations) navDonations.click();
            if (tabHelp) tabHelp.click();
        });
    }

    function switchSection(targetId) {
        // 🔴 Correção (item 1): esconder o link "Painel Adm" no menu não
        // bastava — nada impedia switchSection("admin-section") de ser
        // chamada de outro jeito (ex.: pelo console do navegador) por uma
        // ONG ou usuário comum. A navegação em si agora também exige
        // role === "admin"; quem tentar sem ser admin volta para o Início.
        // (A barreira real de dados continua no Firestore — ver ehAdmin()
        // em firestore.rules — isto aqui só evita expor a TELA do painel.)
        if (targetId === "admin-section" && (!state.currentUser || state.currentUser.role !== "admin")) {
            showToast?.("Acesso restrito ao administrador.", "danger");
            targetId = "home-section";
        }
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
    window.switchSection = switchSection;

    // Abre o painel "Meu Perfil" ao clicar no avatar/nome do usuário no header.
    const openProfileBtn = document.getElementById("open-profile-btn");
    if (openProfileBtn) {
        openProfileBtn.addEventListener("click", () => {
            switchSection("perfil-section");
            navLinks.forEach((nl) => nl.classList.remove("active"));
            window.renderPerfil?.();
        });
    }

    const mobileToggle = document.querySelector(".mobile-nav-toggle");
    if (mobileToggle) {
        mobileToggle.addEventListener("click", () => {
            const nav = document.querySelector(".main-nav");
            if (!nav) return;
            const isOpen = nav.classList.toggle("active");
            mobileToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");

            const menuIcon = mobileToggle.querySelector(".menu-icon");
            const closeIcon = mobileToggle.querySelector(".close-icon");
            if (menuIcon) menuIcon.classList.toggle("hidden", isOpen);
            if (closeIcon) closeIcon.classList.toggle("hidden", !isOpen);
        });
    }

    // --- NOTIFICATION SYSTEM ---
    // A central de notificações real (gravada no Firestore, por conta de
    // usuário) é implementada em js/fase6-engine.js (renderiza os mesmos
    // #notification-list/#notif-badge). Aqui só cuidamos de abrir/fechar o
    // dropdown e do botão "Limpar" — o resto é 100% delegado para lá, para
    // não ter duas fontes de dados diferentes escrevendo na mesma lista.
    if (notifBtn) {
        notifBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (notifMenu) {
                const isOpen = notifMenu.classList.toggle("hidden") === false;
                notifBtn.setAttribute("aria-expanded", String(isOpen));
            }
        });
    }

    if (clearNotifBtn) {
        clearNotifBtn.addEventListener("click", () => {
            if (typeof window.marcarTodasNotificacoesComoLidas === "function") {
                window.marcarTodasNotificacoesComoLidas();
            }
            showToast("Notificações marcadas como lidas.");
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

    // Cadastro unificado: apenas dois perfis selecionáveis no wizard —
    // "person" (pessoa física, pode doar e pedir ajuda com a mesma conta) e
    // "ong" (instituição mediadora). O perfil "admin" não é auto-cadastrável.
    function applySelectedRole(role) {
        const institutionFields = [
            document.getElementById("field-ong-resp-name"),
            document.getElementById("field-ong-resp-doc"),
            document.getElementById("field-institution-area"),
            document.getElementById("field-institution-logistics"),
            document.getElementById("wizard-ong-warning"),
            document.getElementById("section-label-institution-2"),
            document.getElementById("section-label-institution-3"),
            document.getElementById("section-label-responsible")
        ];
        const isOng = role === "ong";
        institutionFields.forEach((field) => field?.classList.toggle("hidden", !isOng));

        const labelName = document.getElementById("label-wizard-name");
        const labelDoc = document.getElementById("label-wizard-doc");
        const hint = document.getElementById("role-wizard-hint");
        if (isOng) {
            if (labelName) labelName.innerText = "Razão Social / Nome da Entidade";
            if (labelDoc) labelDoc.innerText = "CNPJ";
            if (hint) hint.innerText = "ONG: receba doações, organize coletas, faça a triagem e confirme entregas.";
        } else {
            if (labelName) labelName.innerText = "Nome completo";
            if (labelDoc) labelDoc.innerText = "CPF";
            if (hint) hint.innerText = "Pessoa: doe itens, solicite ajuda e acompanhe seu histórico, tudo com o mesmo cadastro.";
        }
    }

    roleTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            roleTabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            applySelectedRole(tab.dataset.role);
        });
    });
    applySelectedRole(document.querySelector(".role-tab.active")?.dataset.role || "person");

    // --- VALIDAÇÃO REAL DE CPF, CNPJ, TELEFONE, E-MAIL E ENDEREÇO ---
    // (antes só existia o atributo "required", que não impede dados falsos)
    (function configurarValidacaoCadastro() {
        const V = window.PSValidacao;
        if (!V) return;

        const campoDoc = document.getElementById("reg-wizard-doc");
        const campoRespDoc = document.getElementById("reg-wizard-ong-resp-cpf");
        const campoTelefone = document.getElementById("reg-wizard-phone");
        const campoEmail = document.getElementById("reg-wizard-email");
        const campoEndereco = document.getElementById("reg-wizard-address");

        function papelAtual() {
            return document.querySelector(".role-tab.active")?.getAttribute("data-role") || "person";
        }

        // Linha de informação (verde/cinza) abaixo do campo de CNPJ, ao lado
        // da mensagem de erro padrão.
        function mostrarInfoCNPJ(texto, ok) {
            if (!campoDoc) return;
            let el = document.getElementById("reg-wizard-doc-info");
            if (!el) {
                el = document.createElement("small");
                el.id = "reg-wizard-doc-info";
                el.className = "campo-info-msg";
                el.setAttribute("role", "status");
                campoDoc.closest(".form-group")?.appendChild(el);
            }
            el.textContent = texto || "";
            el.classList.toggle("is-ok", !!ok);
            el.style.display = texto ? "block" : "none";
        }

        function aplicarResultadoCNPJ(r) {
            if (r.status === "ok") {
                V.mostrarErroCampo(campoDoc, "");
                mostrarInfoCNPJ(`✔ CNPJ ativo na Receita: ${r.razaoSocial}`, true);
            } else if (r.status === "indisponivel") {
                V.mostrarErroCampo(campoDoc, "");
                mostrarInfoCNPJ("Não foi possível consultar a Receita agora. O CNPJ será conferido pela equipe antes da aprovação.");
            } else {
                mostrarInfoCNPJ("");
                V.mostrarErroCampo(campoDoc, V.mensagemConsultaCNPJ(r));
            }
        }
        window.PSAplicarResultadoCNPJ = aplicarResultadoCNPJ;

        // Máscara do documento principal: CPF para Pessoa, CNPJ para ONG.
        if (campoDoc) {
            campoDoc.addEventListener("input", () => {
                campoDoc.value = papelAtual() === "ong" ? V.mascaraCNPJ(campoDoc.value) : V.mascaraCPF(campoDoc.value);
                V.limparErroCampo(campoDoc);
                mostrarInfoCNPJ("");
            });
            campoDoc.addEventListener("blur", async () => {
                if (!campoDoc.value) return;
                if (papelAtual() !== "ong") {
                    V.mostrarErroCampo(campoDoc, V.validarCPF(campoDoc.value) ? "" : "CPF inválido. Confira os números digitados.");
                    return;
                }
                if (!V.validarCNPJ(campoDoc.value)) {
                    V.mostrarErroCampo(campoDoc, "CNPJ inválido. Confira os números digitados.");
                    return;
                }
                // Dígitos corretos não bastam (geradores de CNPJ passam nessa
                // conta): confere na Receita se o CNPJ existe e está ATIVO.
                const consultado = campoDoc.value;
                mostrarInfoCNPJ("Consultando CNPJ na Receita Federal…");
                const r = await V.consultarCNPJ(consultado);
                if (campoDoc.value !== consultado) return; // o usuário mudou o campo
                aplicarResultadoCNPJ(r);
            });
        }

        if (campoRespDoc) {
            campoRespDoc.addEventListener("input", () => {
                campoRespDoc.value = V.mascaraCPF(campoRespDoc.value);
                V.limparErroCampo(campoRespDoc);
            });
            campoRespDoc.addEventListener("blur", () => {
                if (!campoRespDoc.value) return;
                V.mostrarErroCampo(campoRespDoc, V.validarCPF(campoRespDoc.value) ? "" : "CPF do responsável inválido.");
            });
        }

        if (campoTelefone) {
            campoTelefone.addEventListener("input", () => {
                campoTelefone.value = V.mascaraTelefone(campoTelefone.value);
                V.limparErroCampo(campoTelefone);
            });
            campoTelefone.addEventListener("blur", () => {
                if (!campoTelefone.value) return;
                V.mostrarErroCampo(campoTelefone, V.validarTelefone(campoTelefone.value) ? "" : "Informe um celular válido com DDD, ex.: (00) 00000-0000.");
            });
        }

        if (campoEmail) {
            campoEmail.addEventListener("blur", () => {
                if (!campoEmail.value) return;
                V.mostrarErroCampo(campoEmail, V.validarEmail(campoEmail.value) ? "" : "Informe um e-mail válido.");
            });
            campoEmail.addEventListener("input", () => V.limparErroCampo(campoEmail));
        }

        if (campoEndereco) {
            campoEndereco.addEventListener("blur", () => {
                if (!campoEndereco.value) return;
                V.mostrarErroCampo(campoEndereco, V.validarEndereco(campoEndereco.value) ? "" : "Informe o endereço completo: rua, número, bairro e cidade.");
            });
            campoEndereco.addEventListener("input", () => V.limparErroCampo(campoEndereco));
        }

        // Reexecuta a máscara do documento ao trocar de perfil (Pessoa/ONG).
        document.querySelectorAll(".role-tab").forEach((tab) => {
            tab.addEventListener("click", () => {
                if (campoDoc) { campoDoc.value = ""; V.limparErroCampo(campoDoc); }
            });
        });
    })();

    let currentStep = 1;
    const maxSteps = 4;
    const prevBtn = document.getElementById("wizard-prev-btn");
    const nextBtn = document.getElementById("wizard-next-btn");
    const progressFill = document.getElementById("wizard-progress-fill");
    
    function updateWizardUI() {
        for(let i = 1; i <= maxSteps; i++) {
            const step = document.getElementById(`wizard-step-${i}`);
            if(step) {
                if(i === currentStep) step.classList.add("active");
                else step.classList.remove("active");
            }
            
            const node = document.querySelector(`.wizard-node[data-step="${i}"]`);
            if(node) {
                if(i < currentStep) {
                    node.classList.add("completed");
                    node.classList.remove("active");
                } else if(i === currentStep) {
                    node.classList.add("active");
                    node.classList.remove("completed");
                } else {
                    node.classList.remove("active");
                    node.classList.remove("completed");
                }
            }
        }
        
        if(progressFill) {
            progressFill.style.width = `${((currentStep - 1) / (maxSteps - 1)) * 100}%`;
        }
        
        if(prevBtn) {
            prevBtn.disabled = currentStep === 1;
        }
        if(nextBtn) {
            if(currentStep === maxSteps) {
                nextBtn.innerText = "Finalizar Cadastro";
                nextBtn.classList.remove("btn-primary");
                nextBtn.classList.add("btn-success");
            } else {
                nextBtn.innerText = "Avançar";
                nextBtn.classList.remove("btn-success");
                nextBtn.classList.add("btn-primary");
            }
        }
    }
    
    function validateCurrentWizardStep() {
        const step = document.getElementById(`wizard-step-${currentStep}`);
        const fields = [...(step?.querySelectorAll("input[required], select[required], textarea[required]") || [])]
            .filter((field) => !field.closest(".hidden"));
        const invalidField = fields.find((field) => !field.checkValidity());
        if (invalidField) {
            invalidField.reportValidity();
            return false;
        }

        // Validação real de CPF/CNPJ, telefone, e-mail e endereço (não só "preenchido").
        const V = window.PSValidacao;
        if (!V) return true;
        const papel = document.querySelector(".role-tab.active")?.getAttribute("data-role") || "person";
        const checagens = [
            { id: "reg-wizard-doc", valido: (v) => (papel === "ong" ? V.validarCNPJ(v) : V.validarCPF(v)), msg: papel === "ong" ? "CNPJ inválido. Confira os números digitados." : "CPF inválido. Confira os números digitados." },
            { id: "reg-wizard-ong-resp-cpf", valido: V.validarCPF, msg: "CPF do responsável inválido." },
            { id: "reg-wizard-email", valido: V.validarEmail, msg: "Informe um e-mail válido." },
            { id: "reg-wizard-phone", valido: V.validarTelefone, msg: "Informe um celular válido com DDD, ex.: (00) 00000-0000." },
            { id: "reg-wizard-address", valido: V.validarEndereco, msg: "Informe o endereço completo: rua, número, bairro e cidade." }
        ];
        for (const checagem of checagens) {
            const campo = document.getElementById(checagem.id);
            if (!campo || campo.closest(".hidden") || !campo.value) continue;
            if (!checagem.valido(campo.value)) {
                V.mostrarErroCampo(campo, checagem.msg);
                campo.focus();
                showToast?.(checagem.msg, "danger");
                return false;
            }
        }
        return true;
    }

    if(nextBtn) {
        nextBtn.addEventListener("click", async () => {
            // No último passo, quem finaliza o cadastro é o firebase-auth.js
            // (listener separado no mesmo botão, que cria a conta de verdade).
            if(currentStep !== maxSteps && validateCurrentWizardStep()) {
                // ONG: além dos dígitos, o CNPJ precisa existir e estar ATIVO
                // na Receita antes de sair do passo que pede o documento.
                const V = window.PSValidacao;
                const campoDoc = document.getElementById("reg-wizard-doc");
                const papel = document.querySelector(".role-tab.active")?.getAttribute("data-role") || "person";
                const passo = document.getElementById(`wizard-step-${currentStep}`);
                if (V && papel === "ong" && campoDoc && passo?.contains(campoDoc) && campoDoc.value) {
                    const textoOriginal = nextBtn.innerText;
                    nextBtn.disabled = true;
                    nextBtn.innerText = "Conferindo CNPJ...";
                    let r;
                    try { r = await V.consultarCNPJ(campoDoc.value); }
                    finally { nextBtn.disabled = false; nextBtn.innerText = textoOriginal; }
                    window.PSAplicarResultadoCNPJ?.(r);
                    if (r.status === "nao_encontrado" || r.status === "inativa" || r.status === "invalido") {
                        campoDoc.focus();
                        showToast?.(V.mensagemConsultaCNPJ(r), "danger");
                        return;
                    }
                }
                currentStep++;
                updateWizardUI();
            }
        });
    }
    
    if(prevBtn) {
        prevBtn.addEventListener("click", () => {
            if(currentStep > 1) {
                currentStep--;
                updateWizardUI();
            }
        });
    }

    // O login é tratado exclusivamente pelo firebase-auth.js (autenticação real).
    // O handler local antigo foi removido porque disparava ANTES do Firebase e
    // mostrava "Credenciais inválidas" mesmo quando o e-mail/senha estavam certos.

    const togglePassword = document.getElementById("toggle-password");
    if(togglePassword) {
        togglePassword.addEventListener("click", () => {
            const passInput = document.getElementById("login-password");
            if(passInput.type === "password") {
                passInput.type = "text";
                togglePassword.setAttribute("data-lucide", "eye-off");
            } else {
                passInput.type = "password";
                togglePassword.setAttribute("data-lucide", "eye");
            }
            if (window.lucide) lucide.createIcons();
        });
    }

    function performLogin(user) {
        state.setCurrentUser(user);
        if (typeof updateUserAuthUI === "function") updateUserAuthUI();
        // Central de notificações real (Firestore) — js/fase6-engine.js
        if (typeof window.iniciarNotificacoesUsuario === "function") window.iniciarNotificacoesUsuario();
        if (loginModal) loginModal.classList.add("hidden");
        if (registerModal) registerModal.classList.add("hidden");
        currentStep = 1;
        if (typeof updateWizardUI === "function") updateWizardUI();
        showToast(`Bem-vindo, ${user.name}!`);
        
        // 🔴 Correção (item 1 do plano de finalização): o Painel Admin é
        // exclusivo do papel "admin" — uma ONG tem suas próprias telas de
        // mediação (campanhas, pedidos, "Meu Perfil") e nunca deveria ver
        // o link "Painel Adm" no menu. Antes essa condição incluía
        // "ong", então toda ONG aprovada enxergava (e conseguia abrir) o
        // painel administrativo por engano.
        if (user.role === "admin") {
            document.querySelectorAll(".admin-only").forEach(el => el.classList.remove("hidden"));
        } else {
            document.querySelectorAll(".admin-only").forEach(el => el.classList.add("hidden"));
        }
        
        if (typeof updateHelpRequestFormState === "function") updateHelpRequestFormState();
        if (typeof renderDonationFlows === "function") renderDonationFlows();
        if (chatWidget) chatWidget.classList.remove("hidden");

        // Login libera leitura de /doacoes (dado pessoal) — recarrega o
        // histórico detalhado e os números exatos de Transparência/Home,
        // que até aqui só mostravam o resumo público. Ver js/fase7-engine.js.
        if (typeof renderDeliveryHistory === "function") renderDeliveryHistory();
        if (typeof renderPortalTransparencia === "function") renderPortalTransparencia();
        if (typeof renderImpactoHome === "function") renderImpactoHome();

        // O disparo em "firebaseReady" (js/fase7-engine.js) acontece antes do
        // onAuthStateChanged resolver quem é o usuário — para uma sessão de
        // admin já persistida, o Painel Admin ficava sem carregar dados até
        // a próxima ação manual. Repete a carga aqui, agora que o papel do
        // usuário já está confirmado (a função já se protege sozinha para
        // quem não é admin).
        if (user.role === "admin" && typeof renderPainelAdmin === "function") renderPainelAdmin();
    }

    function updateUserAuthUI() {
        const user = state.currentUser;
        const roleNames = {
            person: "Pessoa",
            ong: "ONG / Instituição mediadora",
            admin: "Administrador",
            // aliases de compatibilidade com contas/dados antigos
            common: "Pessoa",
            donor: "Pessoa",
            recipient: "Pessoa",
            beneficiary: "Pessoa",
            institution: "ONG / Instituição mediadora"
        };
        userAuthZone?.classList.toggle("hidden", Boolean(user));
        userProfileZone?.classList.toggle("hidden", !user);
        if (user) {
            if (userDisplayName) userDisplayName.textContent = user.name;
            if (userDisplayRole) userDisplayRole.textContent = roleNames[user.role] || "Usuário";
            if (userAvatarChar) userAvatarChar.textContent = (user.name || "U").trim().charAt(0).toUpperCase();
        }
        // Mesma correção do item 1 aplicada aqui: "admin-only" (o link
        // "Painel Adm") só existe para quem é de fato administrador. ONG
        // (e o alias antigo "institution") tem sua própria mediação de
        // doações dentro de "Doações & Pedidos"/"Meu Perfil" — nunca
        // precisou, e nunca deveria ter tido acesso, ao Painel Admin.
        const ehAdministrador = user && user.role === "admin";
        document.querySelectorAll(".admin-only").forEach((element) => element.classList.toggle("hidden", !ehAdministrador));
    }

    // Permite que a autenticação Firebase atualize a mesma interface do site.
    window.performLogin = performLogin;
    window.updateUserAuthUI = updateUserAuthUI;

    if (logoutBtn) {
        // 🔴 Correção: existiam DOIS handlers de clique independentes neste
        // mesmo botão — este aqui (só limpava o estado local) e outro em
        // js/firebase-auth.js (só chamava signOut() do Firebase). Cada um
        // fazia metade do trabalho, sem coordenação: o local não desconectava
        // a sessão persistida do Firebase (então um F5 trazia a conta antiga
        // de volta sozinho, via onAuthStateChanged) e nenhum dos dois
        // devolvia os links do menu ("Início", "Doações"...) para o estado
        // "nada selecionado" — só a SEÇÃO trocava para Início, o item
        // destacado no menu continuava sendo o de onde a pessoa saiu. Os
        // dois agora viraram um único fluxo, nesta ordem: primeiro encerra a
        // sessão de verdade no Firebase (para não voltar sozinha depois),
        // só então limpa o estado local e a interface — assim trocar de
        // conta em seguida sempre parte de uma página limpa.
        logoutBtn.addEventListener("click", async () => {
            if (window.fb?.auth && window.fb?.authSdk?.signOut) {
                try {
                    await window.fb.authSdk.signOut(window.fb.auth);
                } catch (error) {
                    console.error("Erro ao encerrar sessão no Firebase:", error);
                }
            }
            state.setCurrentUser(null);
            updateUserAuthUI();
            if (typeof switchSection === "function") switchSection("home-section");
            navLinks.forEach((nl) => nl.classList.remove("active"));
            document.getElementById("nav-home")?.classList.add("active");
            if (typeof renderDonationFlows === "function") renderDonationFlows();
            // Volta o histórico detalhado para a mensagem "faça login" e a
            // distribuição por categoria some (ambos exigem /doacoes, que
            // deixa de estar acessível); o resumo público continua visível.
            if (typeof renderDeliveryHistory === "function") renderDeliveryHistory();
            if (typeof renderPortalTransparencia === "function") renderPortalTransparencia();
            // Encerra chat e notificações em tempo real da conta que saiu —
            // sem isso, a lista de conversas/notificações da conta anterior
            // ainda podia aparecer por um instante ao logar com outra conta
            // no mesmo navegador, até a próxima ação forçar um repaint.
            window.limparConversasAtivas?.();
            window.pararNotificacoesUsuario?.();
            showToast("Você saiu da sua conta.", "info");
        });
    }

    if (window.lucide) lucide.createIcons();

    // --- TRANSPARENCY HISTORY RENDERING ---
    // IMPORTANTE: "historico_atividades" é uma coleção PRIVADA por usuário
    // (ver Firestore Security Rules: resource.data.usuarioId == request.auth.uid,
    // é a mesma coleção da timeline pessoal "Minhas Atividades" em
    // js/fase6-engine.js). Não dá pra usar aqui: com as regras publicadas o
    // Firestore recusa a leitura sem filtro; sem as regras publicadas seria
    // vazar a atividade privada de todo mundo numa tela pública. Por isso
    // essa tabela usa "doacoes", que é de leitura aberta a qualquer usuário
    // logado (mesma coleção que já alimenta o gráfico "Destinação dos
    // recursos" no topo desta página — ver renderPortalTransparencia() em
    // js/fase7-engine.js). Mostra só dado que o próprio doador já tornou
    // público ao cadastrar a doação (nome, item, cidade) — nunca o nome
    // do beneficiário nem endereço completo.
    async function renderDeliveryHistory() {
        if (!deliveryHistoryTbody || !window.fb) return;

        // 🔴 Correção: /doacoes exige login (firestore.rules) porque cada
        // documento carrega dado pessoal (donorName, city etc.). Antes essa
        // checagem não existia aqui, então um visitante sem login ficava
        // preso em "Carregando histórico..." para sempre — a leitura era
        // negada pelo Firestore e o catch só escrevia no console. O resumo
        // agregado (sem nome de ninguém) continua público, ver
        // renderResumoPublicoTransparencia(), js/fase7-engine.js.
        if (!window.appState?.user) {
            deliveryHistoryTbody.innerHTML = `<tr><td colspan="8" class="text-center py-4">Faça login para ver o histórico detalhado por doação.</td></tr>`;
            return;
        }

        const { db, firestoreSdk } = window.fb;

        try {
            const snap = await firestoreSdk.getDocs(firestoreSdk.collection(db, "doacoes"));
            const doacoes = [];
            snap.forEach(docSnap => doacoes.push({ id: docSnap.id, ...docSnap.data() }));
            doacoes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            deliveryHistoryTbody.innerHTML = "";

            if (doacoes.length === 0) {
                deliveryHistoryTbody.innerHTML = `<tr><td colspan="8" class="text-center py-4">Nenhuma doação registrada ainda.</td></tr>`;
                return;
            }

            doacoes.slice(0, 30).forEach(item => {
                const tr = document.createElement("tr");
                const dataFormatada = item.createdAt ? new Date(item.createdAt).toLocaleString("pt-BR") : "-";
                // Código curto derivado do id do documento no Firestore, só para
                // dar uma referência visual — não é um campo próprio gravado.
                const codigo = `DOA-${String(item.id || "").slice(0, 6).toUpperCase()}`;
                const tipoEntrega = item.deliveryMethod === "ong" ? "Mediada por ONG" : "Entrega direta";
                // Todo campo abaixo vem de dados cadastrados pelo próprio usuário no
                // Firestore (donorName, category, itemName, city, ongName,
                // trackingStatus) e passa por escapeHtml() antes de entrar no HTML —
                // sem isso, um valor malicioso cadastrado num desses campos (ex.: nome
                // do doador) seria interpretado como HTML/script nesta tabela pública.
                tr.innerHTML = `
                    <td><span class="badge-role">${escapeHtml(codigo)}</span></td>
                    <td>${escapeHtml(dataFormatada)}</td>
                    <td><strong>${escapeHtml(item.donorName || "Anônimo")}</strong></td>
                    <td>${escapeHtml(item.category || "Geral")}${item.itemName ? " — " + escapeHtml(item.itemName) : ""}</td>
                    <td>${escapeHtml(item.city || "Não informada")}</td>
                    <td>${escapeHtml(tipoEntrega)}</td>
                    <td>${item.deliveryMethod === "ong" ? escapeHtml(item.ongName || "—") : "—"}</td>
                    <td>${escapeHtml(item.trackingStatus || "Em andamento")}</td>
                `;
                deliveryHistoryTbody.appendChild(tr);
            });
        } catch (error) {
            console.error("Erro ao carregar histórico de movimentações:", error);
        }
    }
    document.addEventListener("firebaseReady", renderDeliveryHistory);

    // O chat de verdade (real, por conta, ligado ao Firestore) é
    // inicializado por js/chat.js — ver initChat(), chamado a partir do
    // evento "includesLoaded" no próprio arquivo.
});
